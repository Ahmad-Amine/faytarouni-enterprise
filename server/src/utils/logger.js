const env = require('../config/env');

function timestamp() {
  return new Date().toISOString();
}

function info(message, meta) {
  console.log(`[${timestamp()}] INFO  ${message}`, meta || '');
}

function warn(message, meta) {
  console.warn(`[${timestamp()}] WARN  ${message}`, meta || '');
}

function error(message, meta) {
  console.error(`[${timestamp()}] ERROR ${message}`, meta || '');
}

function audit(message, meta) {
  if (!env.isProd) {
    console.log(`[${timestamp()}] AUDIT ${message}`, meta || '');
  }
}

module.exports = { info, warn, error, audit };
