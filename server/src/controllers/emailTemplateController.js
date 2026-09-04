const createCrudController = require('./crudControllerFactory');
const { emailTemplateRepository } = require('../repositories');

module.exports = createCrudController(emailTemplateRepository, {
  entityName: 'EmailTemplate',
  searchableFields: ['key', 'subject'],
});
