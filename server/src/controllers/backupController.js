const fs = require('fs');
const path = require('path');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const BACKUP_MODELS = {
  users: require('../models/User'),
  appointments: require('../models/Appointment'),
  services: require('../models/Service'),
  barbers: require('../models/Barber'),
  products: require('../models/Inventory').Product,
  settings: require('../models/System').Settings,
};

exports.trigger = catchAsync(async (req, res) => {
  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  const dump = {};
  for (const [key, model] of Object.entries(BACKUP_MODELS)) {
    dump[key] = await model.find({}).lean();
  }

  fs.writeFileSync(filepath, JSON.stringify(dump, null, 2));
  logger.info(`[backup] created ${filename}`);

  return new ApiResponse(201, { filename, createdAt: new Date() }, 'Backup created.').send(res);
});

exports.list = catchAsync(async (req, res) => {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, sizeBytes: stat.size, createdAt: stat.birthtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  return new ApiResponse(200, files).send(res);
});

exports.download = catchAsync(async (req, res, next) => {
  const safeName = path.basename(req.params.filename);
  const filepath = path.join(BACKUP_DIR, safeName);
  if (!fs.existsSync(filepath)) {
    return next(ApiError.notFound('Backup file not found.'));
  }
  res.download(filepath);
});
