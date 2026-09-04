const { userRepository } = require('../repositories');
const notificationService = require('../services/NotificationService');
const logger = require('../utils/logger');

async function runBirthdayCheck() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const month = tomorrow.getMonth();
  const day = tomorrow.getDate();
  const year = tomorrow.getFullYear();

  const users = await userRepository.find({ isActive: true, birthday: { $ne: null } });
  const matches = users.filter((u) => {
    const b = new Date(u.birthday);
    return b.getMonth() === month && b.getDate() === day && u.lastBirthdayAlertYear !== year;
  });

  for (const user of matches) {
    await notificationService.notifyAdmins(
      'birthday',
      `${user.name}'s birthday is tomorrow. Consider sending a gift or a message.`,
      `/admin/customers/${user._id}`
    );
    await userRepository.updateById(user._id, { lastBirthdayAlertYear: year });
  }

  if (matches.length) logger.info(`[birthday-job] created ${matches.length} birthday alert(s)`);
}

module.exports = runBirthdayCheck;
