const mongoose = require('mongoose');

const bookingMutexSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BookingMutex', bookingMutexSchema);
