const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const createCrudController = require('./crudControllerFactory');
const { categoryRepository, serviceRepository } = require('../repositories');

const categoryAdmin = createCrudController(categoryRepository, { entityName: 'Category', searchableFields: ['name'] });
const serviceAdmin = createCrudController(serviceRepository, {
  entityName: 'Service',
  searchableFields: ['name', 'description'],
  populate: 'category',
});

exports.categoryAdmin = categoryAdmin;
exports.serviceAdmin = serviceAdmin;

exports.listPublicCategories = catchAsync(async (req, res) => {
  const categories = await categoryRepository.find({ isActive: true }, { sort: { order: 1 } });
  return new ApiResponse(200, categories).send(res);
});

exports.listPublicServices = catchAsync(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category) filter.category = req.query.category;
  const services = await serviceRepository.find(filter, { populate: 'category' });
  return new ApiResponse(200, services).send(res);
});
