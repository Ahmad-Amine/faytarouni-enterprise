const { Server } = require('socket.io');
const cookie = require('cookie');
const { verifyAccessToken } = require('../utils/tokens');
const env = require('../config/env');
const logger = require('../utils/logger');
const { userRepository } = require('../repositories');

let io = null;

function initSocket(httpServer) {
  const allowedOrigins = env.clientUrl.split(',').map((o) => o.trim().replace(/\/+$/, ''));

  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const rawCookies = socket.handshake.headers.cookie;
      if (!rawCookies) return next();
      const parsed = cookie.parse(rawCookies);
      const token = parsed.access_token;
      if (!token) return next();

      const decoded = verifyAccessToken(token);
      const user = await userRepository.findById(decoded.sub, { populate: 'role' });
      if (!user || !user.isActive) return next();

      if (user.passwordChangedAt) {
        const changedAtSeconds = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
        if (decoded.iat < changedAtSeconds) return next();
      }

      socket.userId = String(user._id);
      socket.role = user.role?.name || null;
      socket.roleId = user.role?._id ? String(user.role._id) : null;
      socket.permissions = user.role?.permissions || [];
      return next();
    } catch {
      return next();
    }
  });

  io.on('connection', (socket) => {
    if (socket.role === 'admin' || socket.role === 'manager') {
      socket.join('admins');
    }
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }
    if (socket.roleId) {
      socket.join(`role:${socket.roleId}`);
    }
    logger.info(`[socket] client connected`, { id: socket.id, userId: socket.userId || 'anon' });

    socket.on('disconnect', () => {
      logger.info(`[socket] client disconnected`, { id: socket.id });
    });
  });

  return io;
}

function getIO() {
  return io;
}

function disconnectUserSockets(userId) {
  if (!io || !userId) return;
  io.in(`user:${userId}`).disconnectSockets(true);
}

function disconnectRoleSockets(roleId) {
  if (!io || !roleId) return;
  io.in(`role:${roleId}`).disconnectSockets(true);
}

module.exports = { initSocket, getIO, disconnectUserSockets, disconnectRoleSockets };
