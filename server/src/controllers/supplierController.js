const createCrudController = require('./crudControllerFactory');
const { supplierRepository } = require('../repositories');

module.exports = createCrudController(supplierRepository, {
  entityName: 'Supplier',
  searchableFields: ['name', 'contactName', 'email'],
});
