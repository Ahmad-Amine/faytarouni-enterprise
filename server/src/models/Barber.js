const mongoose = require('mongoose');

const barberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, default: '', trim: true },
    photoUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    bioAr: { type: String, default: '' },
    specialties: { type: [{ type: String, trim: true, maxlength: 80 }], default: [], validate: [(v) => v.length <= 30, 'A barber can have at most 30 specialties.'] },
    specialtiesAr: { type: [{ type: String, trim: true, maxlength: 80 }], default: [], validate: [(v) => v.length <= 30, 'A barber can have at most 30 specialties.'] },
    services: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }], default: [], validate: [(v) => v.length <= 100, 'A barber can have at most 100 services.'] },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    // Bounded array: prevents unbounded document growth and keeps this document far below MongoDB's 16 MiB BSON limit.
    holidays: { type: [Date], default: [], validate: [(v) => v.length <= 400, 'Store long-term leave in the schedule system; barber holiday overrides are limited to 400 dates.'] },

    // Personal breaks, independent of the shop-wide business-hour breaks.
    // dayOfWeek null means the break repeats every day the barber works.
    breaks: {
      type: [
        new mongoose.Schema(
          {
            dayOfWeek: { type: Number, min: 0, max: 6, default: null },
            start: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
            end: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
          },
          { _id: false }
        ),
      ],
      default: [],
      validate: [(v) => v.length <= 30, 'A barber can have at most 30 breaks.'],
    },

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
