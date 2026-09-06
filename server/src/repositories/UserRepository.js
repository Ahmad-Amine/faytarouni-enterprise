const BaseRepository = require('./BaseRepository');
const User = require('../models/User');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  findByEmail(email, { withPassword = false } = {}) {
    const query = this.model.findOne({ email: String(email).toLowerCase() }).populate('role');
    if (withPassword) query.select('+password');
    return query.exec();
  }

  findByEmailVerificationHash(hash) {
    return this.model
      .findOne({ emailVerificationTokenHash: hash, emailVerificationExpires: { $gt: new Date() } })
      .select('+emailVerificationTokenHash +emailVerificationExpires')
      .exec();
  }

  findByPasswordResetHash(hash) {
    return this.model
      .findOne({ passwordResetTokenHash: hash, passwordResetExpires: { $gt: new Date() } })
      .select('+passwordResetTokenHash +passwordResetExpires')
      .exec();
  }

  findByGuestCode(code) {
    return this.model.findOne({ guestBookingCode: String(code).trim() }).populate('role').exec();
  }
}

module.exports = new UserRepository();
