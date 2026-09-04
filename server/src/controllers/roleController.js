const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { roleRepository } = require('../repositories');
const { ALL_PERMISSIONS } = require('../config/constants');
const { disconnectRoleSockets } = require('../socket');

exports.list = catchAsync(async (req, res) => {
  const roles = await roleRepository.find({}, { sort: { name: 1 } });
  return new ApiResponse(200, roles).send(res);
});

exports.permissionsCatalog = catchAsync(async (req, res) => {
  return new ApiResponse(200, ALL_PERMISSIONS).send(res);
});

exports.create = catchAsync(async (req, res, next) => {
  const existing = await roleRepository.findOne({ name: req.body.name.toLowerCase() });
  if (existing) return next(ApiError.conflict('A role with this name already exists.'));
  const role = await roleRepository.create(req.body);
  return new ApiResponse(201, role, 'Role created.').send(res);
});

exports.update = catchAsync(async (req, res, next) => {
  const role = await roleRepository.findById(req.params.id);
  if (!role) return next(ApiError.notFound('Role not found.'));
  if (role.isSystem && req.body.name && req.body.name.toLowerCase() !== role.name) {
    return next(ApiError.badRequest('System roles cannot be renamed.'));
  }
  Object.assign(role, req.body);
  await role.save();
  disconnectRoleSockets(role._id);
  return new ApiResponse(200, role, 'Role updated. Active users with this role must reconnect.').send(res);
});

exports.remove = catchAsync(async (req, res, next) => {
  const role = await roleRepository.findById(req.params.id);
  if (!role) return next(ApiError.notFound('Role not found.'));
  if (role.isSystem) return next(ApiError.badRequest('System roles cannot be deleted.'));

  const User = require('../models/User');
  const inUse = await User.countDocuments({ role: role._id });
  if (inUse > 0) return next(ApiError.badRequest('Cannot delete a role that is assigned to users.'));

  await roleRepository.deleteById(req.params.id);
  return new ApiResponse(200, null, 'Role deleted.').send(res);
});
