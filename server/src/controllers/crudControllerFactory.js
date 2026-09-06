const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const auditService = require('../services/AuditService');

function createCrudController(
  repository,
  { entityName, searchableFields = [], populate, publicFilter } = {}
) {
  return {
    list: catchAsync(async (req, res) => {
      const baseFilter = req.query.all === 'true' || !publicFilter ? {} : publicFilter;
      const { items, meta } = await repository.paginate(baseFilter, req.query, { searchableFields, populate });
      return new ApiResponse(200, items, 'OK', meta).send(res);
    }),

    getOne: catchAsync(async (req, res, next) => {
      const item = await repository.findById(req.params.id, { populate });
      if (!item) return next(ApiError.notFound(`${entityName} not found.`));
      return new ApiResponse(200, item).send(res);
    }),

    create: catchAsync(async (req, res) => {
      const item = await repository.create(req.body);
      await auditService.log(req, {
        actor: req.user,
        action: `${entityName.toLowerCase()}.created`,
        entityType: entityName,
        entityId: item._id,
      });
      return new ApiResponse(201, item, `${entityName} created.`).send(res);
    }),

    update: catchAsync(async (req, res, next) => {
      const item = await repository.updateById(req.params.id, req.body);
      if (!item) return next(ApiError.notFound(`${entityName} not found.`));
      await auditService.log(req, {
        actor: req.user,
        action: `${entityName.toLowerCase()}.updated`,
        entityType: entityName,
        entityId: item._id,
        changes: req.body,
      });
      return new ApiResponse(200, item, `${entityName} updated.`).send(res);
    }),

    remove: catchAsync(async (req, res, next) => {
      const item = await repository.deleteById(req.params.id);
      if (!item) return next(ApiError.notFound(`${entityName} not found.`));
      await auditService.log(req, {
        actor: req.user,
        action: `${entityName.toLowerCase()}.deleted`,
        entityType: entityName,
        entityId: req.params.id,
      });
      return new ApiResponse(200, null, `${entityName} deleted.`).send(res);
    }),
  };
}

module.exports = createCrudController;
