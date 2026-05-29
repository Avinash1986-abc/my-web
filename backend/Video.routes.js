// Video.routes.js
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const db      = require('./Db');

const { verifyToken, teacherOnly } = require('./Auth.routes');
const { uploadVideo } = require('./Upload');

console.log("🎬 Video Router: Loading Routes...");

// ── 1. GET ALL VIDEOS (Role Based) ───────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
    try {
        const { id, role } = req.user;
        let sql    = `SELECT v.*, u.name as teacherName FROM videos v LEFT JOIN users u ON v.teacherId = u.id`;
        let params = [];

        if (role === 'teacher') {
            sql += ` WHERE v.teacherId = ?`;
            params.push(id);
        } else {
            sql += ` WHERE v.isVisible = 1`;
        }

        sql += ` ORDER BY v.created_at DESC`;
        const [rows] = await db.execute(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: "Fetch failed: " + err.message });
    }
});

// ── 2. UPLOAD VIDEO (Teacher only) ───────────────────────────────────────────
router.post('/upload', verifyToken, teacherOnly, (req, res, next) => {
    uploadVideo.single('video')(req, res, (err) => {
        if (err) {
            console.error("❌ Video Upload Multer Error:", err.message);
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, async (req, res) => {
    console.log("--- Upload Debug ---");
    console.log("File:", req.file);
    console.log("Body:", req.body);
    console.log("User:", req.user);

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { title, subject, targetClass, description } = req.body;
    const videoUrl = `/uploads/videos/${req.file.filename}`;

    try {
        const sql = `
            INSERT INTO videos (title, subject, targetClass, description, videoUrl, teacherId, fileSize, isVisible)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `;
        const [result] = await db.execute(sql, [
            title       || 'Untitled',
            subject     || 'General',
            targetClass || 'All',
            description || '',
            videoUrl,
            req.user.id,
            req.file.size
        ]);

        console.log("✅ Video inserted, ID:", result.insertId);
        res.status(201).json({ success: true, message: 'Video lecture published!', id: result.insertId });

    } catch (err) {
        console.error("❌ DB Error:", err.code, err.message);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: "Database Error: " + err.message });
    }
});

// ── 3. STREAM VIDEO ───────────────────────────────────────────────────────────
router.get('/stream/:filename', verifyToken, (req, res) => {
    const filepath = path.join(__dirname, 'uploads', 'videos', req.params.filename);
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: "Video not found" });
    }

    const stat     = fs.statSync(filepath);
    const fileSize = stat.size;
    const range    = req.headers.range;

    if (range) {
        const parts     = range.replace(/bytes=/, "").split("-");
        const start     = parseInt(parts[0], 10);
        const end       = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        res.writeHead(206, {
            "Content-Range":  `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges":  "bytes",
            "Content-Length": chunkSize,
            "Content-Type":   "video/mp4",
        });
        fs.createReadStream(filepath, { start, end }).pipe(res);
    } else {
        res.writeHead(200, { "Content-Length": fileSize, "Content-Type": "video/mp4" });
        fs.createReadStream(filepath).pipe(res);
    }
});

// ── 4. DELETE VIDEO ───────────────────────────────────────────────────────────
// ── 4. DELETE VIDEO ───────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, teacherOnly, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT videoUrl FROM videos WHERE id = ? AND teacherId = ?',
            [req.params.id, req.user.id]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Video not found or unauthorized' });
        }
        const filepath = path.join(__dirname, rows[0].videoUrl);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        await db.execute('DELETE FROM videos WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Video deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;  // ✅ NOTHING after this line

module.exports = router;