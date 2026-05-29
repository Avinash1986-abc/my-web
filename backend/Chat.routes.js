const express = require('express');
const router  = express.Router();
const db      = require('./Db');
const { verifyToken } = require('./Auth');

console.log("💬 Chat Router: Loading Routes...");

// In-memory status trackers
const activeUsers = new Map();   // userId -> timestamp (Date.now())
const typingStates = new Map();  // senderId -> { targetId, timestamp }

// Middleware to track active state for any chat request
router.use((req, res, next) => {
    if (req.user && req.user.id) {
        activeUsers.set(req.user.id, Date.now());
    }
    next();
});

/**
 * ── PING ENDPOINT ──
 * POST /api/chat/ping
 */
router.post('/ping', verifyToken, (req, res) => {
    activeUsers.set(req.user.id, Date.now());
    res.json({ success: true });
});

/**
 * ── TYPING STATUS ENDPOINT ──
 * POST /api/chat/typing
 */
router.post('/typing', verifyToken, (req, res) => {
    const { targetId, isTyping } = req.body;
    if (isTyping && targetId) {
        typingStates.set(req.user.id, { 
            targetId: parseInt(targetId, 10), 
            timestamp: Date.now() 
        });
    } else {
        typingStates.delete(req.user.id);
    }
    res.json({ success: true });
});

/**
 * ── GET ACTIVE STATUS ──
 * GET /api/chat/status?target=TARGET_ID
 */
router.get('/status', verifyToken, (req, res) => {
    const targetId = parseInt(req.query.target, 10);
    if (!targetId) {
        return res.status(400).json({ success: false, message: "Missing target ID" });
    }

    const lastSeen = activeUsers.get(targetId);
    const isOnline = lastSeen ? (Date.now() - lastSeen < 10000) : false; // 10s active window

    const typingState = typingStates.get(targetId);
    const isTyping = typingState && 
                     typingState.targetId === req.user.id && 
                     (Date.now() - typingState.timestamp < 5000); // 5s typing window

    res.json({
        success: true,
        online: isOnline,
        typing: isTyping ? true : false
    });
});

/**
 * ── 1. GET CHAT CONTACTS ──
 * GET /api/chat/contacts?type=peers|teachers
 */
router.get('/contacts', verifyToken, async (req, res) => {
    const { id, role, studentClass } = req.user;
    const { type } = req.query;

    try {
        let sql = "";
        let params = [];

        if (type === 'peers') {
            if (role === 'student') {
                // Peers: other students in the same class
                sql = "SELECT id, name, role FROM users WHERE role = 'student' AND id != ? AND studentClass = ?";
                params = [id, studentClass];
            } else {
                // For teachers, peers are other teachers
                sql = "SELECT id, name, role FROM users WHERE role = 'teacher' AND id != ?";
                params = [id];
            }
        } else {
            // Mentors/Teachers if caller is student, or Students if caller is teacher
            if (role === 'student') {
                sql = "SELECT id, name, role FROM users WHERE role = 'teacher'";
            } else {
                sql = "SELECT id, name, role FROM users WHERE role = 'student'";
            }
        }

        const [rows] = await db.execute(sql, params);
        
        // Map contacts with online status
        const contacts = rows.map(r => {
            const lastSeen = activeUsers.get(r.id);
            const isOnline = lastSeen ? (Date.now() - lastSeen < 10000) : false;
            return {
                id: r.id,
                name: r.name,
                role: r.role.toLowerCase(),
                icon: r.name.charAt(0).toUpperCase(),
                online: isOnline
            };
        });

        res.json({ success: true, contacts });

    } catch (err) {
        console.error("🔥 Contacts Fetch Failed:", err.message);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

/**
 * ── 2. GET CHAT HISTORY ──
 * GET /api/chat/history?target=USER_ID
 */
router.get('/history', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const targetId = req.query.target;

    if (!targetId) {
        return res.status(400).json({ success: false, message: "Missing target ID" });
    }

    try {
        const targetNum = parseInt(targetId, 10);
        const sql = `
            SELECT id, sender_id, receiver_id, message, sent_at as sentAt
            FROM messages
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            ORDER BY sent_at ASC
        `;
        const [rows] = await db.execute(sql, [userId, targetNum, targetNum, userId]);
        res.json({ success: true, messages: rows });
    } catch (err) {
        console.error("🔥 Chat History Fetch Failed:", err.message);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

/**
 * ── 3. SEND DIRECT MESSAGE ──
 * POST /api/chat/send
 */
router.post('/send', verifyToken, async (req, res) => {
    const senderId = req.user.id;
    const { text, to } = req.body;

    if (!text || !to) {
        return res.status(400).json({ success: false, message: "Message text and receiver ID are required" });
    }

    try {
        const receiverId = parseInt(to, 10);
        const sql = "INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)";
        await db.execute(sql, [senderId, receiverId, text]);
        
        // Remove typing state once sent
        typingStates.delete(senderId);
        
        res.json({ success: true, message: "Message sent" });
    } catch (err) {
        console.error("🔥 Message Send Failed:", err.message);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

module.exports = router;
