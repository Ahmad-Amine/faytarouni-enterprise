const crypto = require('crypto');
const BookingMutex = require('../models/BookingMutex');
const ApiError = require('./ApiError');

const DEFAULT_TTL_MS = 10_000;
const DEFAULT_WAIT_MS = 5_000;
const RETRY_MS = 40;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireBookingMutex(key, { ttlMs = DEFAULT_TTL_MS, waitMs = DEFAULT_WAIT_MS } = {}) {
  const owner = crypto.randomUUID();
  const deadline = Date.now() + waitMs;

  while (Date.now() < deadline) {
    const now = new Date();
    const expiresAt = new Date(Date.now() + ttlMs);
    try {
      const lock = await BookingMutex.findOneAndUpdate(
        { key, $or: [{ expiresAt: { $lte: now } }, { owner }] },
        { $set: { owner, expiresAt } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).exec();
      if (lock?.owner === owner) return owner;
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
    await sleep(RETRY_MS);
  }

  throw ApiError.conflict('This booking slot is being updated. Please try again.');
}

async function releaseBookingMutex(key, owner) {
  await BookingMutex.deleteOne({ key, owner }).exec();
}

async function withBookingMutex(key, fn, options) {
  const owner = await acquireBookingMutex(key, options);
  try {
    return await fn();
  } finally {
    await releaseBookingMutex(key, owner).catch(() => {});
  }
}

module.exports = { acquireBookingMutex, releaseBookingMutex, withBookingMutex };
