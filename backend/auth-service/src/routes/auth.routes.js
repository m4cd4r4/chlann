const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post(
  '/register',
  [
    body('username')
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  authController.register
);

// Login user
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  authController.login
);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Logout user
router.post('/logout', authController.logout);

// Get user profile - protected route
router.get('/profile', verifyToken, authController.getProfile);

// Update user profile - protected route
router.put(
  '/profile',
  verifyToken,
  [
    body('username')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio must not exceed 500 characters')
  ],
  authController.updateProfile
);

// Change password - protected route
router.put(
  '/change-password',
  verifyToken,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
  ],
  authController.changePassword
);

module.exports = router;
