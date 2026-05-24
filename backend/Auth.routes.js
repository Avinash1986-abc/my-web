const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('./Db');

console.log("🔐 Auth Router: Loading Routes...");

// ── AUTHENTICATION MIDDLEWARE ──
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ success: false, message: 'Invalid token' });
    }
};

const teacherOnly = (req, res, next) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Only teachers can access this' });
    }
    next();
};

// ── REGISTER ──
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
        await db.execute(sql, [name, email, password, role || 'student']);
        res.json({ success: true, message: 'Registration successful' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── LOGIN ──
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.execute(
            "SELECT * FROM users WHERE email = ? AND password = ?",
            [email, password]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid Email or Password' });
        }
        
        const user = users[0];
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({ success: true, token, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET PROFILE ──
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const [users] = await db.execute("SELECT * FROM users WHERE id = ?", [req.user.id]);
        res.json(users[0] || {});
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── UPDATE PROFILE ──
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { name, email } = req.body;
        await db.execute("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, req.user.id]);
        res.json({ success: true, message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── EXPORT ROUTER & MIDDLEWARE ──
module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.teacherOnly = teacherOnly;