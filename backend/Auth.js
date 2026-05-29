const db = require('./Db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── 1. SECURITY GUARDS (MIDDLEWARE) ──

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Session expired.' });
    }
};

exports.teacherOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'teacher') {
        return res.status(403).json({ success: false, message: 'Access denied. Teachers only.' });
    }
    next();
};

exports.studentOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'student') {
        return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
    }
    next();
};

// ── 2. AUTHENTICATION LOGIC ──

exports.register = async (req, res) => {
    const { name, email, password, role, mobile, expertSubject, studentClass } = req.body;

    // Senior Validation Logic
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
            success: false, 
            message: "Password too weak! Needs 8+ chars, Uppercase, Number, and Special Char." 
        });
    }



    try {
        const [exists] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (exists.length > 0) return res.status(400).json({ success: false, message: 'Email already in use.' });

        const hashedPassword = await bcrypt.hash(password, 12);

        await db.execute(
            'INSERT INTO users (name, email, password, role, mobile, expertSubject, studentClass) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'student', mobile || null, expertSubject || null, studentClass || null]
        );

        res.status(201).json({ success: true, message: 'Registration Successful!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};

exports.login = async (req, res) => {
    const email = req.body.email ? req.body.email.trim() : "";
    const password = req.body.password;

    try {
        const [users] = await db.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email]);
        if (users.length === 0) return res.status(401).json({ success: false, message: "Invalid Email or Password" });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid Email or Password" });
        }

        // ── SENIOR FIX: SET EXPIRY TO 30 DAYS ──
        const token = jwt.sign(
            { id: user.id, role: user.role, studentClass: user.studentClass, name: user.name, email: user.email },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '30d' } // Users won't get logged out for a month!
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentClass: user.studentClass,
                mobile: user.mobile,
                expertSubject: user.expertSubject
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ── 3. PROFILE MANAGEMENT ──

exports.getProfile = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, email, role, mobile, expertSubject, studentClass FROM users WHERE id = ?', 
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching profile.' });
    }
};

exports.updateProfile = async (req, res) => {
    const { name, email, mobile, expertSubject } = req.body;
    try {
        const sql = "UPDATE users SET name = ?, email = ?, mobile = ?, expertSubject = ? WHERE id = ?";
        await db.execute(sql, [name, email, mobile, expertSubject, req.user.id]);
        res.json({ success: true, message: "Profile Updated Successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database Error: " + err.message });
    }
};

exports.getEngagementStats = async (req, res) => {
    try {
        // Query logic assumes 'video_progress' tracks student watches
        const sql = `
            SELECT COUNT(DISTINCT student_id) as totalViewers 
            FROM video_progress 
            WHERE video_id IN (SELECT id FROM videos WHERE teacherId = ?)
        `;
        const [rows] = await db.execute(sql, [req.user.id]);
        res.json({ success: true, count: rows[0].totalViewers || 0 });
    } catch (err) {
        res.json({ success: false, count: 0 });
    }
};

exports.getAllStudents = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, name, email, studentClass FROM users WHERE role = "student"');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error' });
    }
};