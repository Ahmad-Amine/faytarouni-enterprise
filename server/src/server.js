const http = require('http');
const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const { initSocket } = require('./socket');
const scheduleJobs = require('./jobs');
const logger = require('./utils/logger');

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION - shutting down...', { error: err.message, stack: err.stack });
  process.exit(1);
});

(async () => {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);
  scheduleJobs();

  server.listen(env.port, () => {
    logger.info(`[server] listening on port ${env.port} (${env.nodeEnv})`);
  });

  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION - shutting down...', { error: err.message });
    server.close(() => process.exit(1));
  });
})();
