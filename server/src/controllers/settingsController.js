const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { settingsRepository } = require('../repositories');

async function getOrCreate() {
  let settings = await settingsRepository.findOne({ singleton: 'main' });
  if (!settings) settings = await settingsRepository.create({ singleton: 'main' });
  return settings;
}

exports.getPublic = catchAsync(async (req, res) => {
  const settings = await getOrCreate();
  return new ApiResponse(200, {
    businessName: settings.businessName,
    logoUrl: settings.logoUrl,
    currency: settings.currency,
    timeFormat: settings.timeFormat || '24h',
    contacts: settings.contacts,
    texts: settings.texts,
    theme: settings.theme,
  }).send(res);
});

exports.getAdmin = catchAsync(async (req, res) => {
  const settings = await getOrCreate();
  return new ApiResponse(200, settings).send(res);
});

exports.updateText = catchAsync(async (req, res) => {
  const settings = await getOrCreate();
  const { key, en, ar } = req.body;
  const isNewKey = !settings.texts.has(key);
  if (isNewKey && settings.texts.size >= 100) {
    throw ApiError.badRequest('Settings text entries cannot exceed 100 keys.');
  }
  settings.texts.set(key, { en: en || '', ar: ar || '' });
  await settings.save();
  return new ApiResponse(200, settings.texts, 'Text updated.').send(res);
});

exports.updateRules = catchAsync(async (req, res) => {
  const settings = await getOrCreate();
  const {
    businessName,
    logoUrl,
    currency,
    timezone,
    timeFormat,
    loyaltyAppointmentThreshold,
    whatsappAdminNumber,
    primaryColor,
  } = req.body;
  if (businessName !== undefined) settings.businessName = businessName;
  if (logoUrl !== undefined) settings.logoUrl = logoUrl;
  if (currency !== undefined) settings.currency = currency;
  if (timezone !== undefined) settings.timezone = timezone;
  if (timeFormat !== undefined) settings.timeFormat = timeFormat;
  if (loyaltyAppointmentThreshold !== undefined) settings.loyaltyAppointmentThreshold = loyaltyAppointmentThreshold;
  if (whatsappAdminNumber !== undefined) settings.whatsappAdminNumber = whatsappAdminNumber;
  if (primaryColor !== undefined) settings.theme.primaryColor = primaryColor;
  await settings.save();
  return new ApiResponse(200, settings, 'Settings updated.').send(res);
});

exports.updateContacts = catchAsync(async (req, res) => {
  const settings = await getOrCreate();
  settings.contacts = req.body.contacts || [];
  await settings.save();
  return new ApiResponse(200, settings.contacts, 'Contacts updated.').send(res);
});
