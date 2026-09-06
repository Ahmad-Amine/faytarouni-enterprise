const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/security');
const authController = require('../controllers/authController');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
  updatePasswordSchema,
} = require('../validators/authValidators');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

router.get('/me', authenticate, authController.getMe);
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.patch('/password', authenticate, validate(updatePasswordSchema), authController.updatePassword);

router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', authenticate, authController.resendVerification);

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
