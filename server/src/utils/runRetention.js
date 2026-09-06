const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { runDataRetention } = require('../jobs/dataRetention');
const logger = require('./logger');

(async () => {
  try {
    await connectDB();
    const result = await runDataRetention();
    logger.info('[data-retention] manual run finished', result);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('[data-retention] manual run failed', { error: error.message, stack: error.stack });
    try {
      await mongoose.connection.close();
    } catch (_) {
      // Ignore close errors while already failing.
    }
    process.exit(1);
  }
})();
