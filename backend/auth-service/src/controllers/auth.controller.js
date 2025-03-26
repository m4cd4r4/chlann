const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    
    if (user) {
      return res.status(400).json({
        error: 'User already exists',
        message: user.email === email ? 'Email already in use' : 'Username already taken'
      });
    }

    // Create new user
    user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in Redis
    const redisClient = req.app.get('redisClient');
    await redisClient.set(`refresh_token:${user._id}`, refreshToken, {
      EX: 30 * 24 * 60 * 60 // 30 days
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: user.getProfile(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication failed', message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Authentication failed', message: 'Invalid email or password' });
    }

    // Update last active timestamp
    user.lastActive = Date.now();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in Redis
    const redisClient = req.app.get('redisClient');
    await redisClient.set(`refresh_token:${user._id}`, refreshToken, {
      EX: 30 * 24 * 60 * 60 // 30 days
    });

    res.status(200).json({
      message: 'Login successful',
      user: user.getProfile(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Refresh token
 */
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Check if token exists in Redis
    const redisClient = req.app.get('redisClient');
    const storedToken = await redisClient.get(`refresh_token:${decoded.id}`);
    
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const accessToken = generateAccessToken(decoded.id);

    res.status(200).json({
      accessToken
    });
  } catch (error) {
    logger.error(`Refresh token error: ${error.message}`);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  try {
    // Remove refresh token from Redis
    const redisClient = req.app.get('redisClient');
    await redisClient.del(`refresh_token:${userId}`);

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Get user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      user: user.getProfile()
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  const { username, email, bio, profilePicture } = req.body;

  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email;
    }

    // Update other fields if provided
    if (bio !== undefined) user.bio = bio;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: user.getProfile()
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
};

// Helper functions to generate tokens
function generateAccessToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function generateRefreshToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
  );
}
