const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { PERMISSIONS } = require('../config/constants');

const appointmentController = require('../controllers/appointmentController');
const scheduleController = require('../controllers/scheduleController');
const userController = require('../controllers/userController');
const barberController = require('../controllers/barberController');
const catalogController = require('../controllers/catalogController');
const productController = require('../controllers/productController');
const productSaleController = require('../controllers/productSaleController');
const supplierController = require('../controllers/supplierController');
const purchaseOrderController = require('../controllers/purchaseOrderController');
const commerceController = require('../controllers/commerceController');
const roleController = require('../controllers/roleController');
const settingsController = require('../controllers/settingsController');
const emailTemplateController = require('../controllers/emailTemplateController');
const whatsappTemplateController = require('../controllers/whatsappTemplateController');
const notificationController = require('../controllers/notificationController');
const auditLogController = require('../controllers/auditLogController');
const backupController = require('../controllers/backupController');
const reportController = require('../controllers/reportController');
const reviewController = require('../controllers/reviewController');

const { walkInSchema, statusChangeSchema, paymentStatusSchema } = require('../validators/appointmentValidators');
const { categorySchema, serviceSchema, barberSchema } = require('../validators/catalogValidators');
const { productSchema, supplierSchema, purchaseOrderSchema, productSaleSchema } = require('../validators/inventoryValidators');
const { couponSchema, taxSchema, locationSchema } = require('../validators/commerceValidators');
const {
  roleSchema,
  settingsTextSchema,
  settingsRulesSchema,
  settingsContactsSchema,
  emailTemplateSchema,
  whatsappTemplateSchema,
  businessHoursSchema,
  holidaySchema,
} = require('../validators/systemValidators');

const router = express.Router();

router.use(authenticate);
const P = PERMISSIONS;

router.get('/dashboard', authorize(P.REPORTS_VIEW), reportController.dashboard);
router.get('/reports/revenue', authorize(P.REPORTS_VIEW), reportController.revenue);
router.get('/reports/product-revenue', authorize(P.REPORTS_VIEW), reportController.productRevenue);
router.get('/reports/total-revenue', authorize(P.REPORTS_VIEW), reportController.totalRevenue);
router.get('/reports/inventory', authorize(P.REPORTS_VIEW), reportController.inventoryOverview);

router.get('/appointments', authorize(P.APPOINTMENTS_VIEW_ALL), appointmentController.adminList);
router.get('/appointments/calendar', authorize(P.APPOINTMENTS_VIEW_ALL), appointmentController.calendarOverview);
router.get('/appointments/stats', authorize(P.APPOINTMENTS_VIEW_ALL), appointmentController.stats);
router.patch(
  '/appointments/:id/status',
  authorize(P.APPOINTMENTS_MANAGE),
  validate(statusChangeSchema),
  appointmentController.changeStatus
);
router.patch(
  '/appointments/:id/payment-status',
  authorize(P.APPOINTMENTS_MANAGE),
  validate(paymentStatusSchema),
  appointmentController.setPaymentStatus
);
router.post(
  '/appointments/walk-in',
  authorize(P.WALKINS_CREATE),
  validate(walkInSchema),
  appointmentController.createWalkIn
);

router.get('/schedule/hours', authorize(P.SCHEDULE_MANAGE), scheduleController.listBusinessHours);
router.put(
  '/schedule/hours',
  authorize(P.SCHEDULE_MANAGE),
  validate(businessHoursSchema),
  scheduleController.upsertBusinessHours
);
router.get('/schedule/holidays', authorize(P.SCHEDULE_MANAGE), scheduleController.listHolidays);
router.post(
  '/schedule/holidays',
  authorize(P.SCHEDULE_MANAGE),
  validate(holidaySchema),
  scheduleController.createHoliday
);
router.delete('/schedule/holidays/:id', authorize(P.SCHEDULE_MANAGE), scheduleController.removeHoliday);

router.get('/customers', authorize(P.CUSTOMERS_VIEW), userController.list);
router.get('/customers/:id', authorize(P.CUSTOMERS_VIEW), userController.getOne);
router.patch('/customers/:id/active', authorize(P.CUSTOMERS_MANAGE), userController.setActive);
router.patch('/customers/:id/password', authorize(P.CUSTOMERS_MANAGE), userController.setPassword);

router.get('/users/search', authorize(P.STAFF_MANAGE), userController.searchAny);
router.get('/staff', authorize(P.STAFF_MANAGE), userController.listStaff);
router.patch('/staff/:id/role', authorize(P.STAFF_MANAGE), userController.assignRole);

router.get('/barbers/by-user/:userId', authorize(P.STAFF_MANAGE), barberController.getByUser);
router.get('/barbers', authorize(P.STAFF_MANAGE), barberController.list);
router.post('/barbers', authorize(P.STAFF_MANAGE), validate(barberSchema), barberController.create);
router.patch('/barbers/:id', authorize(P.STAFF_MANAGE), validate(barberSchema), barberController.update);
router.delete('/barbers/:id', authorize(P.STAFF_MANAGE), barberController.remove);

router.get('/categories', authorize(P.CATEGORIES_MANAGE), catalogController.categoryAdmin.list);
router.post(
  '/categories',
  authorize(P.CATEGORIES_MANAGE),
  validate(categorySchema),
  catalogController.categoryAdmin.create
);
router.patch('/categories/:id', authorize(P.CATEGORIES_MANAGE), validate(categorySchema), catalogController.categoryAdmin.update);
router.delete('/categories/:id', authorize(P.CATEGORIES_MANAGE), catalogController.categoryAdmin.remove);

router.get('/services', authorize(P.SERVICES_MANAGE), catalogController.serviceAdmin.list);
router.post('/services', authorize(P.SERVICES_MANAGE), validate(serviceSchema), catalogController.serviceAdmin.create);
router.patch('/services/:id', authorize(P.SERVICES_MANAGE), validate(serviceSchema), catalogController.serviceAdmin.update);
router.delete('/services/:id', authorize(P.SERVICES_MANAGE), catalogController.serviceAdmin.remove);

router.get('/reviews', authorize(P.REPORTS_VIEW), reviewController.adminList);
router.patch('/reviews/:id/publish', authorize(P.REPORTS_VIEW), reviewController.setPublished);

router.get('/products', authorize(P.PRODUCTS_MANAGE), productController.list);
router.get('/products/low-stock', authorize(P.PRODUCTS_MANAGE), productController.lowStock);
router.get('/products/:id', authorize(P.PRODUCTS_MANAGE), productController.getOne);
router.post('/products', authorize(P.PRODUCTS_MANAGE), validate(productSchema), productController.create);
router.patch('/products/:id', authorize(P.PRODUCTS_MANAGE), validate(productSchema), productController.update);
router.patch('/products/:id/stock', authorize(P.PRODUCTS_MANAGE), productController.adjustStock);
router.delete('/products/:id', authorize(P.PRODUCTS_MANAGE), productController.remove);

router.get('/product-sales', authorize(P.PRODUCTS_MANAGE), productSaleController.list);
router.post(
  '/product-sales',
  authorize(P.PRODUCTS_MANAGE),
  validate(productSaleSchema),
  productSaleController.create
);

router.get('/suppliers', authorize(P.SUPPLIERS_MANAGE), supplierController.list);
router.post('/suppliers', authorize(P.SUPPLIERS_MANAGE), validate(supplierSchema), supplierController.create);
router.patch('/suppliers/:id', authorize(P.SUPPLIERS_MANAGE), validate(supplierSchema), supplierController.update);
router.delete('/suppliers/:id', authorize(P.SUPPLIERS_MANAGE), supplierController.remove);

router.get('/purchase-orders', authorize(P.PURCHASE_ORDERS_MANAGE), purchaseOrderController.list);
router.get('/purchase-orders/:id', authorize(P.PURCHASE_ORDERS_MANAGE), purchaseOrderController.getOne);
router.post(
  '/purchase-orders',
  authorize(P.PURCHASE_ORDERS_MANAGE),
  validate(purchaseOrderSchema),
  purchaseOrderController.create
);
router.patch('/purchase-orders/:id/order', authorize(P.PURCHASE_ORDERS_MANAGE), purchaseOrderController.markOrdered);
router.patch('/purchase-orders/:id/receive', authorize(P.PURCHASE_ORDERS_MANAGE), purchaseOrderController.receive);
router.patch('/purchase-orders/:id/cancel', authorize(P.PURCHASE_ORDERS_MANAGE), purchaseOrderController.cancel);

router.get('/coupons', authorize(P.COUPONS_MANAGE), commerceController.couponAdmin.list);
router.post('/coupons', authorize(P.COUPONS_MANAGE), validate(couponSchema), commerceController.couponAdmin.create);
router.patch('/coupons/:id', authorize(P.COUPONS_MANAGE), validate(couponSchema), commerceController.couponAdmin.update);
router.delete('/coupons/:id', authorize(P.COUPONS_MANAGE), commerceController.couponAdmin.remove);

router.get('/taxes', authorize(P.TAXES_MANAGE), commerceController.taxAdmin.list);
router.post('/taxes', authorize(P.TAXES_MANAGE), validate(taxSchema), commerceController.taxAdmin.create);
router.patch('/taxes/:id', authorize(P.TAXES_MANAGE), validate(taxSchema), commerceController.taxAdmin.update);
router.delete('/taxes/:id', authorize(P.TAXES_MANAGE), commerceController.taxAdmin.remove);

router.get('/locations', authorize(P.LOCATIONS_MANAGE), commerceController.locationAdmin.list);
router.post('/locations', authorize(P.LOCATIONS_MANAGE), validate(locationSchema), commerceController.locationAdmin.create);
router.patch('/locations/:id', authorize(P.LOCATIONS_MANAGE), validate(locationSchema), commerceController.locationAdmin.update);
router.delete('/locations/:id', authorize(P.LOCATIONS_MANAGE), commerceController.locationAdmin.remove);

router.get('/roles', authorize(P.ROLES_MANAGE), roleController.list);
router.get('/permissions', authorize(P.ROLES_MANAGE), roleController.permissionsCatalog);
router.post('/roles', authorize(P.ROLES_MANAGE), validate(roleSchema), roleController.create);
router.patch('/roles/:id', authorize(P.ROLES_MANAGE), validate(roleSchema), roleController.update);
router.delete('/roles/:id', authorize(P.ROLES_MANAGE), roleController.remove);

router.get('/settings', authorize(P.SETTINGS_MANAGE), settingsController.getAdmin);
router.put('/settings/texts', authorize(P.SETTINGS_MANAGE), validate(settingsTextSchema), settingsController.updateText);
router.put('/settings/rules', authorize(P.SETTINGS_MANAGE), validate(settingsRulesSchema), settingsController.updateRules);
router.put('/settings/contacts', authorize(P.SETTINGS_MANAGE), validate(settingsContactsSchema), settingsController.updateContacts);

router.get('/email-templates', authorize(P.EMAIL_TEMPLATES_MANAGE), emailTemplateController.list);
router.post(
  '/email-templates',
  authorize(P.EMAIL_TEMPLATES_MANAGE),
  validate(emailTemplateSchema),
  emailTemplateController.create
);
router.patch('/email-templates/:id', authorize(P.EMAIL_TEMPLATES_MANAGE), validate(emailTemplateSchema), emailTemplateController.update);
router.delete('/email-templates/:id', authorize(P.EMAIL_TEMPLATES_MANAGE), emailTemplateController.remove);

router.get('/whatsapp-templates', authorize(P.WHATSAPP_TEMPLATES_MANAGE), whatsappTemplateController.list);
router.post(
  '/whatsapp-templates',
  authorize(P.WHATSAPP_TEMPLATES_MANAGE),
  validate(whatsappTemplateSchema),
  whatsappTemplateController.create
);
router.patch('/whatsapp-templates/:id', authorize(P.WHATSAPP_TEMPLATES_MANAGE), validate(whatsappTemplateSchema), whatsappTemplateController.update);
router.delete('/whatsapp-templates/:id', authorize(P.WHATSAPP_TEMPLATES_MANAGE), whatsappTemplateController.remove);

router.get('/notifications', authorize(P.NOTIFICATIONS_MANAGE), notificationController.listForAdmin);
router.patch('/notifications/:id/read', authorize(P.NOTIFICATIONS_MANAGE), notificationController.markRead);
router.patch('/notifications/read-all', authorize(P.NOTIFICATIONS_MANAGE), notificationController.markAllRead);

router.get('/audit-logs', authorize(P.AUDIT_LOGS_VIEW), auditLogController.list);

router.post('/backups', authorize(P.BACKUPS_MANAGE), backupController.trigger);
router.get('/backups', authorize(P.BACKUPS_MANAGE), backupController.list);
router.get('/backups/:filename/download', authorize(P.BACKUPS_MANAGE), backupController.download);

module.exports = router;
