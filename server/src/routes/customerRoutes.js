const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const appointmentController = require('../controllers/appointmentController');
const notificationController = require('../controllers/notificationController');
const { rescheduleSchema, cancelSchema } = require('../validators/appointmentValidators');

const router = express.Router();
router.use(authenticate);

router.get('/my-appointments', appointmentController.myAppointments);
router.patch('/appointments/:id/cancel', validate(cancelSchema), appointmentController.cancel);
router.patch('/appointments/:id/reschedule', validate(rescheduleSchema), appointmentController.reschedule);

router.get('/notifications', notificationController.listForCustomer);
router.patch('/notifications/:id/read', notificationController.markRead);
router.patch('/notifications/read-all', notificationController.markAllRead);

module.exports = router;
