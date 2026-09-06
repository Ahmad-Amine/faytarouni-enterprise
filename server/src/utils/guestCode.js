const crypto = require('crypto');
const User = require('../models/User');

async function generateUniqueGuestCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = String(crypto.randomInt(10000, 100000));
    const exists = await User.findOne({ guestBookingCode: code }).select('_id');
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique guest booking code. Please try again.');
}

module.exports = { generateUniqueGuestCode };
