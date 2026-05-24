const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const db      = require('./Db'); // Points to your Db.js in the same folder

// Imports from your other files
const { verifyToken, teacherOnly } = require('./Auth'); 
const { uploadMaterial } = require('./Upload');

// ── 1. THE LOGIC (The Engine) ──

/**
 * @desc Upload PDF Study Material
 */
const uploadMaterialLogic = async (req, res) => {
    const { title, subject, targetClass } = req.body;
    const teacherId = req.user.id;
    const fileUrl = `/uploads/materials/${req.file.filename}`;

    try {
        const sql = `INSERT INTO materials (title, subject, targetClass, fileUrl, teacherId, fileSize) VALUES (?, ?, ?, ?, ?, ?)`;
        await db.execute(sql, [title, subject, targetClass, fileUrl, teacherId, req.file.size]);

        res.status(201).json({ success: true, message: 'Study material published!' });
    } catch (err) {
        // Cleanup: If database fails, delete the PDF file immediately
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Database error. File deleted.' });
    }
};

/**
 * @desc Get All Materials for Students
 */
const getAllMaterials = async (req, res) => {
    try {
        const sql = `
            SELECT m.*, u.name as teacherName 
            FROM materials m 
            JOIN users u ON m.teacherId = u.id 
            ORDER BY m.created_at DESC
        `;
        const [rows] = await db.execute(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching library.' });
    }
};

/**
 * @desc Teacher deletes their material
 */
const deleteMaterial = async (req, res) => {
    try {
        const [material] = await db.execute('SELECT fileUrl FROM materials WHERE id = ? AND teacherId = ?', [req.params.id, req.user.id]);
        if (material.length === 0) return res.status(404).json({ message: 'Material not found.' });

        await db.execute('DELETE FROM materials WHERE id = ?', [req.params.id]);

        // Delete physical file
        const absolutePath = path.join(__dirname, material[0].fileUrl);
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);

        res.json({ success: true, message: 'Material removed.' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed.' });
    }
};

// ── 2. THE ROUTES (The Doors) ──

// Students and Teachers can see the library
router.get('/', verifyToken, getAllMaterials);

// Only Teachers can upload (Max 200MB as set in Upload.js)
router.post('/upload', verifyToken, teacherOnly, uploadMaterial.single('pdf'), uploadMaterialLogic);

// Only the teacher who uploaded it can delete it
router.delete('/:id', verifyToken, teacherOnly, deleteMaterial);

module.exports = router;