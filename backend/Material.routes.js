const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const db      = require('./Db');

const { verifyToken, teacherOnly } = require('./Auth.routes');
const { uploadMaterial } = require('./Upload');

console.log("📄 Material Router: Loading Routes...");

const uploadMaterialLogic = async (req, res) => {
    console.log("📥 Body fields:", req.body);
    console.log("📁 req.file:", req.file);

    const file = req.file;
    if (!file) {
        return res.status(400).json({ success: false, message: "No file uploaded or invalid format." });
    }

    const { title, subject, targetClass } = req.body;
    const fileUrl = `/uploads/materials/${file.filename}`;

    try {
        const sql = `
            INSERT INTO materials (title, subject, targetClass, fileUrl, teacherId, fileSize) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.execute(sql, [title, subject, targetClass, fileUrl, req.user.id, file.size]);
        res.status(201).json({ success: true, message: 'Material published!' });
    } catch (err) {
        console.error("❌ DB Insert Error:", err.message);
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
    }
};

const getAllMaterials = async (req, res) => {
    try {
        const { id, role } = req.user;
        let sql = `SELECT m.*, u.name as teacherName FROM materials m LEFT JOIN users u ON m.teacherId = u.id`;
        let params = [];
        if (role === 'teacher') {
            sql += ` WHERE m.teacherId = ?`;
            params.push(id);
        }
        sql += ` ORDER BY m.created_at DESC`;
        const [rows] = await db.execute(sql, params);
        res.json(rows);
    } catch (err) {
        console.error("❌ Material Fetch Error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const deleteMaterial = async (req, res) => {
    try {
        const [material] = await db.execute(
            'SELECT fileUrl FROM materials WHERE id = ? AND teacherId = ?',
            [req.params.id, req.user.id]
        );
        if (!material || material.length === 0) {
            return res.status(404).json({ success: false, message: 'Material not found or unauthorized' });
        }
        await db.execute('DELETE FROM materials WHERE id = ?', [req.params.id]);
        const absolutePath = path.join(process.cwd(), material[0].fileUrl);
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
        res.json({ success: true, message: 'Material removed.' });
    } catch (err) {
        console.error('❌ Delete error:', err.message);
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
};

// ── FIX: use .single('file') instead of .any() ───────────────────────────────
router.get('/',        verifyToken,              getAllMaterials);
router.post('/upload', verifyToken, teacherOnly, (req, res, next) => {
    uploadMaterial.single('material')(req, res, (err) => {
        if (err) {
            console.error("❌ Material Upload Multer Error:", err.message);
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, uploadMaterialLogic);
router.delete('/:id',  verifyToken, teacherOnly, deleteMaterial);

module.exports = router;