const BaseRepository = require('./BaseRepository');

const Role = require('../models/Role');
const Category = require('../models/Category');
const Service = require('../models/Service');
const Barber = require('../models/Barber');
const Location = require('../models/Location');
const { BusinessHours, Holiday } = require('../models/Schedule');
const Review = require('../models/Review');
const { Supplier, Product } = require('../models/Inventory');
const PurchaseOrder = require('../models/PurchaseOrder');
const { Coupon, Tax } = require('../models/Commerce');
const { Settings, EmailTemplate, WhatsAppTemplate, Notification, AuditLog } = require('../models/System');

module.exports = {
  userRepository: require('./UserRepository'),
  appointmentRepository: require('./AppointmentRepository'),
  roleRepository: new BaseRepository(Role),
  categoryRepository: new BaseRepository(Category),
  serviceRepository: new BaseRepository(Service),
  barberRepository: new BaseRepository(Barber),
  locationRepository: new BaseRepository(Location),
  businessHoursRepository: new BaseRepository(BusinessHours),
  holidayRepository: new BaseRepository(Holiday),
  reviewRepository: new BaseRepository(Review),
  supplierRepository: new BaseRepository(Supplier),
  productRepository: new BaseRepository(Product),
  productSaleRepository: require('./ProductSaleRepository'),
  purchaseOrderRepository: new BaseRepository(PurchaseOrder),
  couponRepository: new BaseRepository(Coupon),
  taxRepository: new BaseRepository(Tax),
  settingsRepository: new BaseRepository(Settings),
  emailTemplateRepository: new BaseRepository(EmailTemplate),
  whatsAppTemplateRepository: new BaseRepository(WhatsAppTemplate),
  notificationRepository: new BaseRepository(Notification),
  auditLogRepository: new BaseRepository(AuditLog),
};
