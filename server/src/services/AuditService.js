const { auditLogRepository } = require('../repositories');
const logger = require('../utils/logger');

async function log(req, { actor, action, entityType, entityId, changes = null }) {
  try {
    await auditLogRepository.create({
      actor: actor?._id || null,
      actorName: actor?.name || 'system',
      action,
      entityType,
      entityId: entityId || null,
      changes,
      ip: req?.ip || '',
    });
  } catch (err) {
    logger.error('[audit] failed to write audit log', { error: err.message });
  }
}

module.exports = { log };
