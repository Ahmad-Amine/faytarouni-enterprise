const { notificationRepository } = require('../repositories');
const { getIO } = require('../socket');

async function notifyAdmins(type, message, link = '', userId = null) {
  const notif = await notificationRepository.create({ audience: 'admin', type, message, link, user: userId });
  const io = getIO();
  if (io) io.to('admins').emit('notification', notif);
  return notif;
}

async function notifyCustomer(userId, type, message, link = '') {
  const notif = await notificationRepository.create({ audience: 'customer', user: userId, type, message, link });
  const io = getIO();
  if (io) io.to(`user:${userId}`).emit('notification', notif);
  return notif;
}

module.exports = { notifyAdmins, notifyCustomer };
