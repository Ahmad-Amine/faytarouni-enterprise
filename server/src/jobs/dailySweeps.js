const inventoryService = require('../services/InventoryService');
const notificationService = require('../services/NotificationService');
const { appointmentRepository } = require('../repositories');
const emailService = require('./../services/EmailService');
const whatsappService = require('../services/WhatsAppService');
const defaultTemplates = require('../emails/defaultTemplates');
const logger = require('../utils/logger');
const { formatTime, getTimeFormat } = require('../utils/timeFormat');

async function runLowStockSweep() {
  const lowStock = await inventoryService.getLowStockProducts();
  if (lowStock.length === 0) return;

  await notificationService.notifyAdmins(
    'low_stock',
    `${lowStock.length} product(s) are at or below their low-stock threshold.`,
    '/admin/inventory'
  );
  logger.info(`[low-stock-job] ${lowStock.length} product(s) flagged`);
}

async function runAppointmentReminders() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const appointments = await appointmentRepository.findForDay(tomorrow, { status: 'confirmed' });
  const timeFormat = appointments.length ? await getTimeFormat() : '24h';
  for (const appt of appointments) {
    const date = appt.date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const time = formatTime(appt.startTime, timeFormat);
    const barberName = appt.barber?.name || '';

    await whatsappService.notifyEvent('appointment_reminder', {
      phone: appt.customer?.phone || appt.customerPhone,
      name: appt.customerName,
      vars: { name: appt.customerName, date, time, barberName },
    });

    if (!appt.customer?.email) continue;
    await emailService
      .sendTemplateEmail(
        appt.customer.email,
        'appointment_reminder',
        { name: appt.customerName, date, startTime: time, barberName },
        defaultTemplates.appointmentStatusChanged
      )
      .catch(() => {});
  }
  if (appointments.length) logger.info(`[reminder-job] sent ${appointments.length} reminder(s)`);
}

module.exports = { runLowStockSweep, runAppointmentReminders };
