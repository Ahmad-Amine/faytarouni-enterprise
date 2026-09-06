const createCrudController = require('./crudControllerFactory');
const { whatsAppTemplateRepository } = require('../repositories');

module.exports = createCrudController(whatsAppTemplateRepository, {
  entityName: 'WhatsAppTemplate',
  searchableFields: ['name', 'body'],
});
