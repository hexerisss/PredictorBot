const Redis = require('ioredis');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 12);

let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}

// License Key Functions
async function generateKey(days) {
  const db = getRedis();
  const key = `KEY-${nanoid()}`;
  
  await db.set(`license:${key}`, JSON.stringify({
    days,
    redeemed: false,
    createdAt: Date.now()
  }));
  
  return key;
}

async function redeemKey(userId, key) {
  const db = getRedis();
  const licenseData = await db.get(`license:${key}`);
  
  if (!licenseData) {
    return { success: false, error: 'Invalid key' };
  }
  
  const license = JSON.parse(licenseData);
  
  if (license.redeemed) {
    return { success: false, error: 'Key already redeemed' };
  }
  
  const expiresAt = Date.now() + (license.days * 24 * 60 * 60 * 1000);
  
  await db.set(`user:${userId}`, JSON.stringify({
    active: true,
    expiresAt,
    redeemedAt: Date.now(),
    key
  }));
  
  await db.set(`license:${key}`, JSON.stringify({
    ...license,
    redeemed: true,
    redeemedBy: userId,
    redeemedAt: Date.now()
  }));
  
  return { success: true, expiresAt };
}

async function checkLicense(userId) {
  const db = getRedis();
  const userData = await db.get(`user:${userId}`);
  
  if (!userData) {
    return { active: false };
  }
  
  const user = JSON.parse(userData);
  
  if (Date.now() > user.expiresAt) {
    await db.set(`user:${userId}`, JSON.stringify({ ...user, active: false }));
    return { active: false, expired: true };
  }
  
  return { active: true, expiresAt: user.expiresAt };
}

// Prediction History
async function savePrediction(userId, game, data) {
  const db = getRedis();
  const predictionId = nanoid();
  
  await db.set(`prediction:${predictionId}`, JSON.stringify({
    userId,
    game,
    ...data,
    timestamp: Date.now()
  }));
  
  await db.lpush(`user:${userId}:predictions`, predictionId);
  await db.ltrim(`user:${userId}:predictions`, 0, 99); // Keep last 100
  
  return predictionId;
}

async function getAllKeys() {
  const db = getRedis();
  const keys = await db.keys('license:*');
  const data = [];
  
  for (const key of keys) {
    const licenseData = await db.get(key);
    data.push({
      key: key.replace('license:', ''),
      ...JSON.parse(licenseData)
    });
  }
  
  return data;
}

async function getAllUsers() {
  const db = getRedis();
  const keys = await db.keys('user:*:predictions');
  const users = [];
  
  for (const key of keys) {
    const userId = key.split(':')[1];
    const userData = await db.get(`user:${userId}`);
    if (userData) {
      users.push({
        userId,
        ...JSON.parse(userData)
      });
    }
  }
  
  return users;
}

module.exports = {
  generateKey,
  redeemKey,
  checkLicense,
  savePrediction,
  getAllKeys,
  getAllUsers
};
