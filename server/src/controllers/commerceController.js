const createCrudController = require('./crudControllerFactory');
const { couponRepository, taxRepository, locationRepository } = require('../repositories');

exports.couponAdmin = createCrudController(couponRepository, { entityName: 'Coupon', searchableFields: ['code'] });
exports.taxAdmin = createCrudController(taxRepository, { entityName: 'Tax', searchableFields: ['name'] });
exports.locationAdmin = createCrudController(locationRepository, {
  entityName: 'Location',
  searchableFields: ['name', 'address'],
});
