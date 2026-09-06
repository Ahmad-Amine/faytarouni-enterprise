const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    barber: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 1000 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
