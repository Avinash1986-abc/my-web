const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const db      = require('./Db');

// ── IMPORT SECURITY & UPLOAD ENGINES ──
const { verifyToken, teacherOnly } = require('./Auth');
const { uploadVideo } = require('./Upload');

console.log("📡 Video Router: Loading Routes...");

// ══════════════════════════════════════════════════
// 1. UPLOAD VIDEO (Teacher Only)
// POST /api/videos/upload
// ══════════════════════════════════════════════════
const uploadVideoLogic = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No video file uploaded." });
    }

    const { title, subject, targetClass, description } = req.body;
    const videoUrl = `/uploads/videos/${req.file.filename}`;

    try {
        const sql = `
            INSERT INTO videos 
                (title, subject, targetClass, description, videoUrl, teacherId, fileSize, isVisible) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `;
        await db.execute(sql, [
            title,
            subject,
            targetClass,
            description || '',
            videoUrl,
            req.user.id,
            req.file.size
        ]);

        res.status(201).json({ success: true, message: 'Video lecture published!' });
    } catch (err) {
        console.error("❌ MySQL Upload Error:", err.message);
        // Cleanup: Delete uploaded file if DB insert fails
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Database Error. File removed.' });
    }
};

// ══════════════════════════════════════════════════
// 2. GET ALL VIDEOS
// GET /api/videos
//
// ✅ FIXED LOGIC:
//    - Teacher → sees ONLY their own uploaded videos
//    - Student → sees ALL visible videos from ALL teachers
// ══════════════════════════════════════════════════
const getAllVideos = async (req, res) => {
    try {
        const userId = req.user.id;
        const role   = req.user.role;

        let sql    = `SELECT v.*, u.name as teacherName FROM videos v LEFT JOIN users u ON v.teacherId = u.id`;
        let params = [];

        if (role === 'teacher') {
            // Teacher Isolation: Only see YOUR OWN videos
            sql += ` WHERE v.teacherId = ?`;
            params.push(userId);
        } else {
            // Student View: See ALL visible videos from ALL teachers
            sql += ` WHERE v.isVisible = 1`;
            // No params needed — no class filter
        }

        sql += ` ORDER BY v.created_at DESC`;

        const [rows] = await db.execute(sql, params);
        res.json(rows);
    } catch (err) {
        console.error("❌ Fetch Videos Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error while fetching videos." });
    }
};

// ══════════════════════════════════════════════════
// 3. DELETE VIDEO (Teacher Only — Own Videos)
// DELETE /api/videos/:id
// ══════════════════════════════════════════════════
const deleteVideo = async (req, res) => {
    try {
        // Security: Only the teacher who uploaded it can delete it
        const [video] = await db.execute(
            'SELECT videoUrl FROM videos WHERE id = ? AND teacherId = ?',
            [req.params.id, req.user.id]
        );

        if (!video || video.length === 0) {
            return res.status(404).json({ success: false, message: 'Video not found or access denied.' });
        }

        // Delete from database first
        await db.execute('DELETE FROM videos WHERE id = ?', [req.params.id]);

        // Then delete the physical file
        const filePath = path.join(process.cwd(), video[0].videoUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ success: true, message: 'Video deleted successfully.' });
    } catch (err) {
        console.error("❌ Delete Video Error:", err.message);
        res.status(500).json({ success: false, message: 'Delete failed.' });
    }
};

// ══════════════════════════════════════════════════
// 4. TOGGLE VIDEO VISIBILITY (Teacher Only)
// PUT /api/videos/:id/visibility
// ══════════════════════════════════════════════════
const toggleVideoVisibility = async (req, res) => {
    try {
        // Security: Only the teacher who uploaded it can toggle it
        const [video] = await db.execute(
            'SELECT isVisible FROM videos WHERE id = ? AND teacherId = ?',
            [req.params.id, req.user.id]
        );

        if (!video || video.length === 0) {
            return res.status(404).json({ success: false, message: 'Video not found or access denied.' });
        }

        const newStatus = video[0].isVisible ? 0 : 1;

        await db.execute('UPDATE videos SET isVisible = ? WHERE id = ?', [newStatus, req.params.id]);

        res.json({
            success: true,
            isVisible: newStatus,
            message: newStatus ? 'Video is now visible to students.' : 'Video is now hidden from students.'
        });
    } catch (err) {
        console.error("❌ Toggle Visibility Error:", err.message);
        res.status(500).json({ success: false, message: 'Could not update visibility.' });
    }
};

// ══════════════════════════════════════════════════
// ROUTE MAPPING
// ══════════════════════════════════════════════════

// GET  /api/videos              → All videos (filtered by role)
router.get('/',                   verifyToken,              getAllVideos);

// POST /api/videos/upload        → Upload new video (teacher only)
router.post('/upload',            verifyToken, teacherOnly, uploadVideo.single('video'), uploadVideoLogic);

// PUT  /api/videos/:id/visibility → Toggle hide/show (teacher only)
router.put('/:id/visibility',     verifyToken, teacherOnly, toggleVideoVisibility);

// DELETE /api/videos/:id         → Delete video (teacher only)
router.delete('/:id',             verifyToken, teacherOnly, deleteVideo);

module.exports = router;