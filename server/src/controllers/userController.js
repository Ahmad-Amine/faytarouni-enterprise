const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { userRepository, appointmentRepository, roleRepository } = require('../repositories');
const authService = require('../services/AuthService');
const { disconnectUserSockets } = require('../socket');

/**
 * SECURITY: every handler below that touches an arbitrary :id must confirm
 * the target account is actually a customer before acting on it. Without
 * this, a role that only holds customers:manage (e.g. the default
 * "manager" role) could reset the password or deactivate an admin/staff
 * account by simply passing that account's id to a "customer" endpoint —
 * a privilege-escalation path, not a customer-management feature.
 */
async function getCustomerRoleId() {
  const role = await roleRepository.findOne({ name: 'customer' });
  if (!role) throw ApiError.internal('Customer role is not seeded.');
  return role._id;
}

async function assertIsCustomer(userId) {
  const customerRoleId = await getCustomerRoleId();
  const user = await userRepository.findById(userId, { populate: 'role' });
  if (!user || String(user.role?._id) !== String(customerRoleId)) return null;
  return user;
}

exports.list = catchAsync(async (req, res) => {
  const customerRoleId = await getCustomerRoleId();
  const { items, meta } = await userRepository.paginate({ role: customerRoleId }, req.query, {
    searchableFields: ['name', 'email', 'phone'],
    populate: 'role',
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.getOne = catchAsync(async (req, res, next) => {
  const user = await assertIsCustomer(req.params.id);
  if (!user) return next(ApiError.notFound('Customer not found.'));
  const appointments = await appointmentRepository.findForCustomer(user._id);
  return new ApiResponse(200, { user: user.toSafeObject(), appointments }).send(res);
});

exports.setActive = catchAsync(async (req, res, next) => {
  const target = await assertIsCustomer(req.params.id);
  if (!target) return next(ApiError.notFound('Customer not found.'));

  const user = await userRepository.updateById(req.params.id, { isActive: !!req.body.isActive });
  if (!user.isActive) {
    await authService.logoutAllSessions(user._id);
    disconnectUserSockets(user._id);
  }
  return new ApiResponse(200, user.toSafeObject()).send(res);
});

exports.setPassword = catchAsync(async (req, res, next) => {
  const target = await assertIsCustomer(req.params.id);
  if (!target) return next(ApiError.notFound('Customer not found.'));

  if (!req.body.newPassword || req.body.newPassword.length < 8) {
    return next(ApiError.badRequest('New password must be at least 8 characters.'));
  }

  const User = require('../models/User');
  const user = await User.findById(req.params.id);
  user.password = req.body.newPassword;
  await user.save();
  await authService.logoutAllSessions(user._id);
  return new ApiResponse(200, null, 'Password updated.').send(res);
});

exports.searchAny = catchAsync(async (req, res) => {
  const { items, meta } = await userRepository.paginate({}, { ...req.query, limit: req.query.limit || 10 }, {
    searchableFields: ['name', 'email', 'phone'],
    populate: 'role',
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.listStaff = catchAsync(async (req, res) => {
  const customerRoleId = await getCustomerRoleId();
  const { items, meta } = await userRepository.paginate({ role: { $ne: customerRoleId } }, req.query, {
    searchableFields: ['name', 'email'],
    populate: 'role',
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.assignRole = catchAsync(async (req, res, next) => {
  const role = await roleRepository.findById(req.body.roleId);
  if (!role) return next(ApiError.notFound('Role not found.'));

  // SECURITY: granting the admin role is the single most sensitive action
  // in the system. staff:manage alone (e.g. a "manager" role) must not be
  // enough to create a new admin — only an existing admin can do that.
  if (role.name === 'admin' && req.user.role?.name !== 'admin') {
    return next(ApiError.forbidden('Only an admin can assign the admin role.'));
  }

  // SECURITY: prevent a staff member from changing their own role — either
  // to escalate themselves, or to accidentally/maliciously lock themselves
  // (or the only admin) out.
  if (String(req.params.id) === String(req.user._id)) {
    return next(ApiError.badRequest('You cannot change your own role.'));
  }

  if (role.name !== 'admin') {
    const adminRole = await roleRepository.findOne({ name: 'admin' });
    const target = await userRepository.findById(req.params.id, { populate: 'role' });
    if (target?.role?.name === 'admin' && adminRole) {
      const adminCount = await userRepository.count({ role: adminRole._id });
      if (adminCount <= 1) {
        return next(ApiError.badRequest('Cannot remove the last remaining admin.'));
      }
    }
  }

  const user = await userRepository.updateById(req.params.id, { role: role._id });
  if (!user) return next(ApiError.notFound('User not found.'));
  await authService.logoutAllSessions(user._id);
  disconnectUserSockets(user._id);
  return new ApiResponse(200, user.toSafeObject(), 'Role assigned.').send(res);
});
