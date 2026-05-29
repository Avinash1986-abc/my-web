const express = require('express');
const router  = express.Router();
const { register, login, getProfile, updateProfile, getEngagementStats, verifyToken, teacherOnly } = require('./Auth');

console.log("🔐 Auth Router: Loading secure routes from controller...");

// Auth Endpoints
router.post('/register', register);
router.post('/login',    login);

// Profile Endpoints
router.get('/profile',    verifyToken, getProfile);
router.put('/profile',    verifyToken, updateProfile);
router.get('/engagement', verifyToken, getEngagementStats);

// Export router and middleware for compatibility
module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.teacherOnly = teacherOnly;