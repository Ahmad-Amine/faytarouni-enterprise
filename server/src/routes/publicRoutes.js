const express = require('express');
const validate = require('../middlewares/validate');
const { optionalAuthenticate, authenticate } = require('../middlewares/auth');
const { guestCodeLimiter } = require('../middlewares/security');

const settingsController = require('../controllers/settingsController');
const barberController = require('../controllers/barberController');
const catalogController = require('../controllers/catalogController');
const productController = require('../controllers/productController');
const appointmentController = require('../controllers/appointmentController');
const reviewController = require('../controllers/reviewController');

const { createAppointmentSchema, reviewSchema } = require('../validators/appointmentValidators');

const router = express.Router();

// The frontend can't read this cookie with document.cookie once frontend
// and backend are on different domains (cookie read access is same-origin
// only, regardless of SameSite/Secure, which only govern whether a cookie
// is *sent*). So the token is also handed over here in the JSON body,
// once, at app startup — the frontend caches it in memory and echoes it
// back as a header; the cookie still arrives automatically with every
// request to this domain, so the double-submit comparison still works.
router.get('/csrf-token', (req, res) => {
  res.status(200).json({ success: true, data: { csrfToken: req.csrfToken } });
});

router.get('/settings', settingsController.getPublic);

router.get('/categories', catalogController.listPublicCategories);
router.get('/services', catalogController.listPublicServices);
router.get('/barbers', barberController.listPublic);
router.get('/barbers/:id', barberController.getPublicProfile);
router.get('/barbers/:barberId/reviews', reviewController.listForBarber);
router.get('/products', productController.listPublic);

router.get('/availability', appointmentController.monthAvailabilityOverview);
router.get('/availability/:date', appointmentController.daySlots);
router.get('/availability/:date/:time/barbers', appointmentController.availableBarbers);

router.post(
  '/appointments',
  guestCodeLimiter,
  optionalAuthenticate,
  validate(createAppointmentSchema),
  appointmentController.create
);

router.post('/reviews', authenticate, validate(reviewSchema), reviewController.create);

module.exports = router;
