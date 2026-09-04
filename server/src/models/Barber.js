const mongoose = require('mongoose');

const barberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    specialties: [{ type: String, trim: true }],
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    holidays: { type: [Date], default: [] },

    stats: {
      completedAppointments: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

barberSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });

module.exports = mongoose.model('Barber', barberSchema);
