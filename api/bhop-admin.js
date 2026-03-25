const Redis = require('ioredis');
const crypto = require('crypto');
const { customAlphabet } = require('nanoid');
const fs = require('fs');
const path = require('path');

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 16);

let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}

const bhopDB = {
  async generateKey(days) {
    const db = getRedis();
    const key = 'BHOP-' + nanoid();
    
    await db.set('bhop:license:' + key, JSON.stringify({
      days: days,
      redeemed: false,
      hwid: null,
      expiresAt: null,
      redeemedAt: null,
      createdAt: Date.now()
    }));
    
    return key;
  },

  async getAllKeys() {
    const db = getRedis();
    const keys = await db.keys('bhop:license:*');
    const data = [];
    
    for (const key of keys) {
      const licenseData = await db.get(key);
      if (licenseData) {
        data.push({
          key: key.replace('bhop:license:', ''),
          ...JSON.parse(licenseData)
        });
      }
    }
    
    return data.sort((a, b) => b.createdAt - a.createdAt);
  },

  async resetHWID(key) {
    const db = getRedis();
    const licenseData = await db.get('bhop:license:' + key);
    
    if (!licenseData) {
      return { success: false, message: 'Key not found' };
    }
    
    const license = JSON.parse(licenseData);
    
    if (!license.redeemed) {
      return { success: false, message: 'Key has not been activated yet' };
    }

    const resetId = nanoid();
    await db.set('bhop:reset:' + resetId, JSON.stringify({
      licenseKey: key,
      oldHwid: license.hwid,
      newHwid: null,
      resetBy: 'admin',
      resetAt: Date.now()
    }));
    
    await db.lpush('bhop:resets', resetId);
    await db.ltrim('bhop:resets', 0, 99);

    await db.set('bhop:license:' + key, JSON.stringify({
      ...license,
      hwid: null,
      redeemed: false,
      redeemedAt: null
    }));

    return { success: true, message: 'HWID reset successful for ' + key };
  },

  async setExpiry(key, date) {
    const db = getRedis();
    const licenseData = await db.get('bhop:license:' + key);
    
    if (!licenseData) {
      return { success: false, message: 'Key not found' };
    }
    
    const license = JSON.parse(licenseData);
    const expiryTimestamp = new Date(date).getTime();
    
    await db.set('bhop:license:' + key, JSON.stringify({
      ...license,
      expiresAt: expiryTimestamp
    }));
    
    return { success: true, message: 'Expiry date updated to ' + date };
  },

  async deleteKey(key) {
    const db = getRedis();
    const deleted = await db.del('bhop:license:' + key);
    
    if (deleted === 0) {
      return { success: false, message: 'Key not found' };
    }
    
    return { success: true, message: 'License key deleted' };
  },

  async getResets() {
    const db = getRedis();
    const resetIds = await db.lrange('bhop:resets', 0, 49);
    const resets = [];
    
    for (const resetId of resetIds) {
      const resetData = await db.get('bhop:reset:' + resetId);
      if (resetData) {
        resets.push(JSON.parse(resetData));
      }
    }
    
    return resets;
  }
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Serve the HTML file
    const htmlPath = path.join(process.cwd(), 'public', 'bhop-admin.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  if (req.method === 'POST') {
    try {
      const { action, password, token, days, key, date } = req.body;

      if (action === 'login') {
        if (password === process.env.ADMIN_PASSWORD) {
          return res.status(200).json({ 
            success: true, 
            token: crypto.randomBytes(32).toString('hex') 
          });
        }
        return res.status(200).json({ success: false });
      }

      if (!token || token.length < 32) {
        return res.status(200).json({ success: false, message: 'Unauthorized' });
      }

      if (action === 'generate') {
        const bhopKey = await bhopDB.generateKey(parseInt(days));
        return res.status(200).json({ success: true, key: bhopKey });
      }

      if (action === 'resetHWID') {
        const result = await bhopDB.resetHWID(key);
        return res.status(200).json(result);
      }

      if (action === 'setExpiry') {
        const result = await bhopDB.setExpiry(key, date);
        return res.status(200).json(result);
      }

      if (action === 'deleteKey') {
        const result = await bhopDB.deleteKey(key);
        return res.status(200).json(result);
      }

      if (action === 'getData') {
        const keys = await bhopDB.getAllKeys();
        const resets = await bhopDB.getResets();
        return res.status(200).json({ success: true, keys: keys, resets: resets });
      }

      return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (error) {
      console.error('Bhop Admin Error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error: ' + error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
