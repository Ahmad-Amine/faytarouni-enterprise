const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const { auditLogRepository } = require('../repositories');

exports.list = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.action) filter.action = req.query.action;
  const { items, meta } = await auditLogRepository.paginate(filter, req.query, {
    populate: { path: 'actor', select: 'name email' },
    defaultSort: '-createdAt',
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});
