require('dotenv').config();
const connectDB = require('../config/db');
const env = require('../config/env');
const { DEFAULT_ROLES } = require('../config/constants');

const Role = require('../models/Role');
const User = require('../models/User');
const Category = require('../models/Category');
const Service = require('../models/Service');
const Barber = require('../models/Barber');
const { BusinessHours } = require('../models/Schedule');
const { Product, Supplier } = require('../models/Inventory');
const { Tax } = require('../models/Commerce');
const { Settings, EmailTemplate, WhatsAppTemplate } = require('../models/System');
const defaultTemplates = require('../emails/defaultTemplates');
const logger = require('../utils/logger');

async function seed() {
  await connectDB();

  if (env.isProd && (!process.env.ADMIN_PASSWORD || env.admin.password.length < 8)) {
    logger.error(
      '[seed] Refusing to seed a production database without a real ADMIN_PASSWORD set (min 8 characters). ' +
        'Set it in your environment variables and re-run the seed.'
    );
    process.exit(1);
  }

  const roleDocs = {};
  for (const r of DEFAULT_ROLES) {
    let role = await Role.findOne({ name: r.name });
    if (!role) {
      role = await Role.create({ ...r, isSystem: r.name === 'customer' || r.name === 'admin' });
    }
    roleDocs[r.name] = role;
  }
  logger.info('[seed] roles ensured');

  let admin = await User.findOne({ email: env.admin.email });
  if (!admin) {
    admin = await User.create({
      name: env.admin.name,
      email: env.admin.email,
      phone: env.admin.phone,
      password: env.admin.password,
      role: roleDocs.admin._id,
      isEmailVerified: true,
    });
    logger.info(`[seed] created admin account: ${env.admin.email}`);
  }

  const categoryNames = ['Hair', 'Beard', 'Kids', 'VIP'];
  const categories = {};
  for (const name of categoryNames) {
    let cat = await Category.findOne({ name });
    if (!cat)
      cat = await Category.create({ name });
    categories[name] = cat;
  }

  const serviceDefs = [
    { name: 'Haircut', category: 'Hair', price: 20, durationMinutes: 30 },
    { name: 'Beard Trim', category: 'Beard', price: 12, durationMinutes: 15 },
    { name: 'Hair Wash', category: 'Hair', price: 8, durationMinutes: 15 },
    { name: 'Hair Coloring', category: 'Hair', price: 35, durationMinutes: 60 },
    { name: 'Kids Haircut', category: 'Kids', price: 15, durationMinutes: 25 },
    { name: 'VIP Service', category: 'VIP', price: 60, durationMinutes: 75, isVip: true },
    { name: 'Custom Package', category: 'VIP', price: 45, durationMinutes: 60 },
  ];
  const services = [];
  for (const s of serviceDefs) {
    let svc = await Service.findOne({ name: s.name });
    if (!svc) {
      svc = await Service.create({ ...s, category: categories[s.category]._id });
    }
    services.push(svc);
  }
  logger.info('[seed] categories & services ensured');

  const barberDefs = [
    { name: 'Marcus Reid', photoUrl: 'https://i.pravatar.cc/500?img=13', bio: 'Skin fades and classic cuts.' },
    { name: 'Elias Novak', photoUrl: 'https://i.pravatar.cc/500?img=14', bio: 'Beard sculpting specialist.' },
    { name: 'Idris Amara', photoUrl: 'https://i.pravatar.cc/500?img=15', bio: 'Textured crops and modern styling.' },
    { name: 'Tomás Rivera', photoUrl: 'https://i.pravatar.cc/500?img=33', bio: "Great with kids' cuts and line-ups." },
  ];
  for (const b of barberDefs) {
    const exists = await Barber.findOne({ name: b.name });
    if (!exists) {
      await Barber.create({ ...b, services: services.map((s) => s._id) });
    }
  }
  logger.info('[seed] barbers ensured');

  for (let day = 0; day <= 6; day += 1) {
    const exists = await BusinessHours.findOne({ dayOfWeek: day, location: null });
    if (!exists) {
      await BusinessHours.create({
        dayOfWeek: day,
        isOpen: day !== 0,
        openTime: '09:00',
        closeTime: '19:00',
        breaks: [],
      });
    }
  }
  logger.info('[seed] business hours ensured');

  let supplier = await Supplier.findOne({ name: 'Faytarouni Supply Co.' });
  if (!supplier) supplier = await Supplier.create({ name: 'Faytarouni Supply Co.', email: 'supply@faytarouni.test' });

  const productDefs = [
    { name: 'Matte Clay Pomade', sku: 'POM-001', price: 18, cost: 9, stock: 25, lowStockThreshold: 5 },
    { name: 'Beard Oil — Sandalwood', sku: 'OIL-001', price: 16, cost: 7, stock: 30, lowStockThreshold: 5 },
    { name: 'Sandalwood Aftershave', sku: 'AFT-001', price: 14, cost: 6, stock: 20, lowStockThreshold: 5 },
    { name: 'Precision Clippers', sku: 'CLP-001', price: 65, cost: 40, stock: 8, lowStockThreshold: 3 },
  ];
  for (const p of productDefs) {
    const exists = await Product.findOne({ sku: p.sku });
    if (!exists)
      await Product.create({ ...p, supplier: supplier._id });
  }
  logger.info('[seed] inventory ensured');

  const taxExists = await Tax.findOne({ name: 'Sales Tax' });
  if (!taxExists) await Tax.create({ name: 'Sales Tax', rate: 5 });

  const settingsExists = await Settings.findOne({ singleton: 'main' });
  if (!settingsExists) {
    await Settings.create({
      singleton: 'main',
      businessName: 'Faytarouni Barbershop',
      logoUrl: '',
      whatsappAdminNumber: env.admin.phone,
      contacts: [
        { type: 'whatsapp', label: 'WhatsApp', value: env.admin.phone },
        { type: 'instagram', label: 'Instagram', value: 'https://instagram.com/faytarouni' },
      ],
      texts: new Map([
        ['brand_name', { en: 'Faytarouni', ar: 'فيتاروني' }],
        ['hero_title', { en: 'Faytarouni\nBarbershop', ar: 'فيتاروني\nباربر شوب' }],
        ['hero_subtitle', { en: 'Retro chairs, warm colors, and cuts that never go out of style. Book your chair in under a minute.', ar: 'كراسي كلاسيكية، ألوان دافئة، وقصات لا تخرج عن الموضة أبدًا. احجز كرسيك في أقل من دقيقة.' }],
        ['hero_cta_primary', { en: 'Book your groove', ar: 'احجز كرسيك' }],
        ['hero_cta_secondary', { en: 'Meet the crew', ar: 'تعرف على الفريق' }],
        ['barbers_section_title', { en: 'Meet the Barbers', ar: 'تعرف على الحلاقين' }],
        ['services_section_title', { en: 'Services & Prices', ar: 'الخدمات والأسعار' }],
        ['booking_page_title', { en: 'Book your chair', ar: 'احجز كرسيك' }],
        ['shop_page_title', { en: 'Shop', ar: 'المتجر' }],
        ['footer_tagline', { en: 'Retro chairs, warm colors, cuts that never go out of style.', ar: 'كراسي كلاسيكية، ألوان دافئة، قصات لا تخرج عن الموضة أبدًا.' }],
      ]),
    });
  }

  const templateSeeds = [
    { key: 'email_verification', ...defaultTemplates.emailVerification, description: 'Sent on signup.' },
    { key: 'password_reset', ...defaultTemplates.passwordReset, description: 'Sent on forgot-password.' },
    { key: 'appointment_confirmation', ...defaultTemplates.appointmentConfirmation, description: 'Sent after booking.' },
    { key: 'appointment_reminder', ...defaultTemplates.appointmentStatusChanged, description: 'Sent the day before.' },
  ];
  for (const t of templateSeeds) {
    const exists = await EmailTemplate.findOne({ key: t.key });
    if (!exists)
      await EmailTemplate.create(t);
  }
  logger.info('[seed] email templates ensured');

  const whatsappTemplateSeeds = [
    {
      name: 'Booking Code Reminder',
      body: 'Hi {{name}}, this is {{businessName}}. Your booking code is {{code}}.',
      description: 'Share a customer\'s guest booking code.',
    },
    {
      name: 'Appointment Reminder',
      body: 'Hi {{name}}, this is a reminder about your appointment on {{date}} at {{time}} with {{barberName}}. See you soon!',
      description: 'Remind a customer about an upcoming appointment.',
    },
    {
      name: 'Appointment Follow-up',
      body: 'Hi {{name}}, about your appointment on {{date}} at {{time}}...',
      description: 'General follow-up about a specific appointment.',
    },
    {
      name: 'Loyalty Gift',
      body: 'Hi {{name}}, thank you for being such a loyal customer! As a small thank-you from us, you have a gift waiting for you on your next visit.',
      description: 'Sent when a customer crosses the loyalty appointment threshold.',
    },
  ];
  for (const t of whatsappTemplateSeeds) {
    const exists = await WhatsAppTemplate.findOne({ name: t.name });
    if (!exists)
      await WhatsAppTemplate.create(t);
  }
  logger.info('[seed] whatsapp templates ensured');

  logger.info('[seed] done');
  process.exit(0);
}

seed().catch((err) => {
  logger.error('[seed] failed', { error: err.message, stack: err.stack });
  process.exit(1);
});
