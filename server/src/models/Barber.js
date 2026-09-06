const mongoose = require('mongoose');

const barberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    specialties: { type: [{ type: String, trim: true, maxlength: 80 }], default: [], validate: [(v) => v.length <= 30, 'A barber can have at most 30 specialties.'] },
    services: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }], default: [], validate: [(v) => v.length <= 100, 'A barber can have at most 100 services.'] },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    // Bounded array: prevents unbounded document growth and keeps this document far below MongoDB's 16 MiB BSON limit.
    holidays: { type: [Date], default: [], validate: [(v) => v.length <= 400, 'Store long-term leave in the schedule system; barber holiday overrides are limited to 400 dates.'] },

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
