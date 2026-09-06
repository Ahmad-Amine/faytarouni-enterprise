const cron = require('node-cron');
const logger = require('../utils/logger');
const runBirthdayCheck = require('./birthdayAlerts');
const { runLowStockSweep, runAppointmentReminders } = require('./dailySweeps');
const { runDataRetention } = require('./dataRetention');

function safeRun(name, fn) {
  return () => {
    fn().catch((err) => logger.error(`[job:${name}] failed`, { error: err.message }));
  };
}

function scheduleJobs() {
  cron.schedule('0 8 * * *', safeRun('birthday-check', runBirthdayCheck));
  cron.schedule('0 7 * * *', safeRun('low-stock-sweep', runLowStockSweep));
  cron.schedule('0 18 * * *', safeRun('appointment-reminders', runAppointmentReminders));

  // Retention never runs destructively at service startup. It is evaluated at
  // 03:15 UTC and remains a no-op unless DATA_RETENTION_ENABLED=true.
  cron.schedule('15 3 * * *', safeRun('data-retention', runDataRetention), { timezone: 'UTC' });

  logger.info(
    '[jobs] scheduled: birthday-check, low-stock-sweep, appointment-reminders, data-retention (03:15 UTC)'
  );
}

module.exports = scheduleJobs;
