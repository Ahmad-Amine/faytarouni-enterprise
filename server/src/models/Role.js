const mongoose = require('mongoose');
const { ALL_PERMISSIONS } = require('../config/constants');

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.every((p) => ALL_PERMISSIONS.includes(p)),
        message: 'Unknown permission string.',
      },
    },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roleSchema.pre('save', function ensureAdminHasAllPermissions(next) {
  if (this.name === 'admin') this.permissions = ALL_PERMISSIONS;
  next();
});

module.exports = mongoose.model('Role', roleSchema);
