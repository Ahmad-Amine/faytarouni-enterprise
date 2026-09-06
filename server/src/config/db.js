const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

async function connectDB() {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(env.mongoUri, {
    autoIndex: !env.isProd,
  });
  logger.info(`[db] connected -> ${conn.connection.host}/${conn.connection.name}`);

  mongoose.connection.on('error', (err) => {
    logger.error(`[db] connection error: ${err.message}`);
  });

  return conn;
}

module.exports = connectDB;
