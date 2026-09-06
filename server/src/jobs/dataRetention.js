const Appointment = require('../models/Appointment');
const AppointmentArchive = require('../models/AppointmentArchive');
const { Notification, AuditLog } = require('../models/System');
const logger = require('../utils/logger');

const DEFAULTS = Object.freeze({
  appointmentActiveMonths: 12,
  appointmentArchiveMonths: 36,
  notificationMonths: 12,
  auditLogMonths: 36,
  maxDeletePerCollectionPerRun: 5000,
  appointmentBatchSize: 250,
});

function envBool(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function envPositiveInt(name, fallback, { min = 1, max = 100000 } = {}) {
  const value = Number.parseInt(process.env[name], 10);
  if (!Number.isFinite(value) || value < min || value > max) return fallback;
  return value;
}

function daysInUtcMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Calendar-month cutoff with UTC day clamping. This avoids month-rollover
// surprises such as subtracting months from the 29th/30th/31st.
function monthsAgoUtc(months, from = new Date(), { startOfDay = false } = {}) {
  const sourceYear = from.getUTCFullYear();
  const sourceMonth = from.getUTCMonth();
  const sourceDay = from.getUTCDate();

  const totalMonths = sourceYear * 12 + sourceMonth - months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const targetDay = Math.min(sourceDay, daysInUtcMonth(targetYear, targetMonth));

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      startOfDay ? 0 : from.getUTCHours(),
      startOfDay ? 0 : from.getUTCMinutes(),
      startOfDay ? 0 : from.getUTCSeconds(),
      startOfDay ? 0 : from.getUTCMilliseconds()
    )
  );
}

function getRetentionConfig() {
  return {
    enabled: envBool('DATA_RETENTION_ENABLED', false),
    dryRun: envBool('DATA_RETENTION_DRY_RUN', true),
    backupConfirmed: envBool('DATA_RETENTION_BACKUP_CONFIRMED', false),
    appointmentActiveMonths: envPositiveInt(
      'DATA_RETENTION_APPOINTMENT_ACTIVE_MONTHS',
      DEFAULTS.appointmentActiveMonths,
      { min: 6, max: 120 }
    ),
    appointmentArchiveMonths: envPositiveInt(
      'DATA_RETENTION_APPOINTMENT_ARCHIVE_MONTHS',
      DEFAULTS.appointmentArchiveMonths,
      { min: 12, max: 240 }
    ),
    notificationMonths: envPositiveInt(
      'DATA_RETENTION_NOTIFICATION_MONTHS',
      DEFAULTS.notificationMonths,
      { min: 1, max: 120 }
    ),
    auditLogMonths: envPositiveInt(
      'DATA_RETENTION_AUDIT_LOG_MONTHS',
      DEFAULTS.auditLogMonths,
      { min: 12, max: 240 }
    ),
    maxDeletePerCollectionPerRun: envPositiveInt(
      'DATA_RETENTION_MAX_DELETE_PER_RUN',
      DEFAULTS.maxDeletePerCollectionPerRun,
      { min: 1, max: 50000 }
    ),
    appointmentBatchSize: envPositiveInt(
      'DATA_RETENTION_APPOINTMENT_BATCH_SIZE',
      DEFAULTS.appointmentBatchSize,
      { min: 10, max: 1000 }
    ),
  };
}

function buildArchiveDocument(appointment, archivedAt) {
  return {
    originalAppointment: appointment._id,
    customer: appointment.customer || null,
    barber: appointment.barber,
    location: appointment.location || null,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    services: (appointment.services || []).slice(0, 20).map((service) => ({
      service: service.service || null,
      name: service.name,
      price: service.price,
      durationMinutes: service.durationMinutes,
    })),
    subtotal: appointment.subtotal || 0,
    discount: appointment.discount || 0,
    tax: appointment.tax || 0,
    total: appointment.total || 0,
    coupon: appointment.coupon || null,
    status: appointment.status,
    source: appointment.source,
    paymentMethod: appointment.paymentMethod,
    isPaid: Boolean(appointment.isPaid),
    originalCreatedAt: appointment.createdAt || null,
    originalUpdatedAt: appointment.updatedAt || null,
    archivedAt,
  };
}

async function countPlan(cutoffs) {
  const [appointmentsToArchive, archivesToDelete, notificationsToDelete, auditLogsToDelete] =
    await Promise.all([
      Appointment.countDocuments({ date: { $lt: cutoffs.appointmentActive } }),
      AppointmentArchive.countDocuments({ date: { $lt: cutoffs.appointmentArchive } }),
      Notification.countDocuments({ createdAt: { $lt: cutoffs.notifications } }),
      AuditLog.countDocuments({ createdAt: { $lt: cutoffs.auditLogs } }),
    ]);

  return { appointmentsToArchive, archivesToDelete, notificationsToDelete, auditLogsToDelete };
}

async function archiveAppointments({ cutoff, maxItems, batchSize, now }) {
  let archived = 0;
  let deletedFromActive = 0;

  while (archived < maxItems) {
    const remaining = maxItems - archived;
    const limit = Math.min(batchSize, remaining);
    const rows = await Appointment.find({ date: { $lt: cutoff } })
      .sort({ date: 1, _id: 1 })
      .limit(limit)
      .lean();

    if (rows.length === 0) break;

    // Archive first. Only after the whole batch is safely upserted do we
    // remove those same source IDs. This makes retries idempotent and avoids
    // deleting an appointment when its archive write failed.
    const operations = rows.map((appointment) => ({
      updateOne: {
        filter: { originalAppointment: appointment._id },
        update: { $setOnInsert: buildArchiveDocument(appointment, now) },
        upsert: true,
      },
    }));

    await AppointmentArchive.bulkWrite(operations, { ordered: true });

    const ids = rows.map((row) => row._id);
    const result = await Appointment.deleteMany({ _id: { $in: ids } });

    archived += rows.length;
    deletedFromActive += result.deletedCount || 0;

    if (rows.length < limit) break;
  }

  return { archived, deletedFromActive };
}

async function deleteOldestByCutoff(Model, field, cutoff, maxItems) {
  const rows = await Model.find({ [field]: { $lt: cutoff } })
    .select({ _id: 1 })
    .sort({ [field]: 1, _id: 1 })
    .limit(maxItems)
    .lean();

  if (rows.length === 0) return 0;
  const result = await Model.deleteMany({ _id: { $in: rows.map((row) => row._id) } });
  return result.deletedCount || 0;
}

async function runDataRetention({ now = new Date() } = {}) {
  const config = getRetentionConfig();

  if (!config.enabled) {
    logger.info('[data-retention] disabled; no database changes made');
    return { skipped: true, reason: 'disabled' };
  }

  if (config.appointmentArchiveMonths <= config.appointmentActiveMonths) {
    throw new Error(
      'DATA_RETENTION_APPOINTMENT_ARCHIVE_MONTHS must be greater than DATA_RETENTION_APPOINTMENT_ACTIVE_MONTHS.'
    );
  }

  const cutoffs = {
    appointmentActive: monthsAgoUtc(config.appointmentActiveMonths, now, { startOfDay: true }),
    appointmentArchive: monthsAgoUtc(config.appointmentArchiveMonths, now, { startOfDay: true }),
    notifications: monthsAgoUtc(config.notificationMonths, now),
    auditLogs: monthsAgoUtc(config.auditLogMonths, now),
  };

  const plan = await countPlan(cutoffs);

  logger.info('[data-retention] plan', {
    dryRun: config.dryRun,
    backupConfirmed: config.backupConfirmed,
    cutoffs: Object.fromEntries(Object.entries(cutoffs).map(([key, value]) => [key, value.toISOString()])),
    eligible: plan,
    maxPerCollectionThisRun: config.maxDeletePerCollectionPerRun,
  });

  if (config.dryRun) {
    return { dryRun: true, cutoffs, eligible: plan };
  }

  if (!config.backupConfirmed) {
    logger.warn(
      '[data-retention] live cleanup blocked: DATA_RETENTION_BACKUP_CONFIRMED is not true. No records changed.'
    );
    return { skipped: true, reason: 'backup-not-confirmed', cutoffs, eligible: plan };
  }

  const appointmentResult = await archiveAppointments({
    cutoff: cutoffs.appointmentActive,
    maxItems: config.maxDeletePerCollectionPerRun,
    batchSize: config.appointmentBatchSize,
    now,
  });

  const [archivesDeleted, notificationsDeleted, auditLogsDeleted] = await Promise.all([
    deleteOldestByCutoff(
      AppointmentArchive,
      'date',
      cutoffs.appointmentArchive,
      config.maxDeletePerCollectionPerRun
    ),
    deleteOldestByCutoff(
      Notification,
      'createdAt',
      cutoffs.notifications,
      config.maxDeletePerCollectionPerRun
    ),
    deleteOldestByCutoff(
      AuditLog,
      'createdAt',
      cutoffs.auditLogs,
      config.maxDeletePerCollectionPerRun
    ),
  ]);

  const result = {
    dryRun: false,
    cutoffs,
    appointmentsArchived: appointmentResult.archived,
    appointmentsDeletedFromActive: appointmentResult.deletedFromActive,
    appointmentArchivesDeleted: archivesDeleted,
    notificationsDeleted,
    auditLogsDeleted,
  };

  logger.info('[data-retention] live cleanup completed', {
    ...result,
    cutoffs: Object.fromEntries(Object.entries(cutoffs).map(([key, value]) => [key, value.toISOString()])),
  });

  return result;
}

module.exports = {
  DEFAULTS,
  getRetentionConfig,
  monthsAgoUtc,
  runDataRetention,
};
