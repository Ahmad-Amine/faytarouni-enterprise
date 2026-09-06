const inventoryService = require('../services/InventoryService');
const notificationService = require('../services/NotificationService');
const { appointmentRepository } = require('../repositories');
const emailService = require('./../services/EmailService');
const defaultTemplates = require('../emails/defaultTemplates');
const logger = require('../utils/logger');

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
  for (const appt of appointments) {
    if (!appt.customer?.email) continue;
    await emailService
      .sendTemplateEmail(
        appt.customer.email,
        'appointment_reminder',
        {
          name: appt.customerName,
          date: appt.date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
          startTime: appt.startTime,
          barberName: appt.barber?.name || '',
        },
        defaultTemplates.appointmentStatusChanged
      )
      .catch(() => {});
  }
  if (appointments.length) logger.info(`[reminder-job] sent ${appointments.length} reminder(s)`);
}

module.exports = { runLowStockSweep, runAppointmentReminders };
