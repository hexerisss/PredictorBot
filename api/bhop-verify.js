const Redis = require('ioredis');

let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { action, key, hwid } = req.body;

    if (!key || !hwid) {
      return res.status(400).json({ success: false, message: 'Missing key or HWID' });
    }

    const db = getRedis();

    if (action === 'activate') {
      // Get license data
      const licenseData = await db.get('bhop:license:' + key);
      
      if (!licenseData) {
        return res.json({ success: false, message: 'Invalid license key' });
      }

      const license = JSON.parse(licenseData);

      // Check if already redeemed
      if (license.redeemed) {
        // Check if HWID matches
        if (license.hwid !== hwid) {
          return res.json({ 
            success: false, 
            message: 'This key is locked to another PC. Contact admin for HWID reset.' 
          });
        }

        // Already activated on this PC, check expiry
        if (license.expiresAt && license.expiresAt <= Date.now()) {
          return res.json({ success: false, message: 'License expired' });
        }

        return res.json({ 
          success: true, 
          message: 'Welcome back! License already activated',
          expiresAt: license.expiresAt
        });
      }

      // First time activation
      const expiresAt = Date.now() + (license.days * 24 * 60 * 60 * 1000);

      await db.set('bhop:license:' + key, JSON.stringify({
        ...license,
        redeemed: true,
        hwid: hwid,
        expiresAt: expiresAt,
        redeemedAt: Date.now()
      }));

      return res.json({ 
        success: true, 
        message: 'License activated successfully! Enjoy KyoBhop',
        expiresAt: expiresAt
      });
    }

    if (action === 'verify') {
      const licenseData = await db.get('bhop:license:' + key);
      
      if (!licenseData) {
        return res.json({ success: false, message: 'Invalid license key' });
      }

      const license = JSON.parse(licenseData);

      if (!license.redeemed) {
        return res.json({ success: false, message: 'License not activated. Use option 1 to activate.' });
      }

      if (license.hwid !== hwid) {
        return res.json({ 
          success: false, 
          message: 'HWID mismatch! Contact admin for reset.' 
        });
      }

      if (license.expiresAt && license.expiresAt <= Date.now()) {
        return res.json({ success: false, message: 'License expired' });
      }

      return res.json({ 
        success: true, 
        message: 'Access granted - KyoBhop loaded!',
        expiresAt: license.expiresAt
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });

  } catch (error) {
    console.error('Bhop Verify Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
};
