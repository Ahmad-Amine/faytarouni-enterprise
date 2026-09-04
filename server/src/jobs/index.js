const cron = require('node-cron');
const logger = require('../utils/logger');
const runBirthdayCheck = require('./birthdayAlerts');
const { runLowStockSweep, runAppointmentReminders } = require('./dailySweeps');

function safeRun(name, fn) {
  return () => {
    fn().catch((err) => logger.error(`[job:${name}] failed`, { error: err.message }));
  };
}

function scheduleJobs() {
  cron.schedule('0 8 * * *', safeRun('birthday-check', runBirthdayCheck));
  cron.schedule('0 7 * * *', safeRun('low-stock-sweep', runLowStockSweep));
  cron.schedule('0 18 * * *', safeRun('appointment-reminders', runAppointmentReminders));
  logger.info('[jobs] scheduled: birthday-check, low-stock-sweep, appointment-reminders');
}

module.exports = scheduleJobs;
