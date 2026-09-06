const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: { type: String, required: true, trim: true, maxlength: 25 },
    password: { type: String, required: true, minlength: 8, select: false },
    avatarUrl: { type: String, default: '' },
    birthday: { type: Date, default: null },

    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },

    guestBookingCode: { type: String, unique: true, sparse: true, index: true },

    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false, default: null },
    emailVerificationExpires: { type: Date, select: false, default: null },

    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpires: { type: Date, select: false, default: null },

    passwordChangedAt: { type: Date, default: Date.now },

    appointmentsCount: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    lastBirthdayAlertYear: { type: Number, default: null },
    lastLoyaltyAlertCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationTokenHash;
  delete obj.passwordResetTokenHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
