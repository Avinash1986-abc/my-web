const express = require('express');
const router  = express.Router();
const db      = require('./Db');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { verifyToken, teacherOnly } = require('./Auth');

// ══════════════════════════════════════════════════
// MULTER SETUP FOR FILE UPLOADS
// ══════════════════════════════════════════════════
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/assignments');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 52428800 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed'));
        }
    }
});

// ══════════════════════════════════════════════════
// 1. GET ASSIGNMENTS
// GET /api/assignments
// ══════════════════════════════════════════════════
const getAssignments = async (req, res) => {
    try {
        const { role, id } = req.user;
        
        // We add a subquery to check if THIS student has submitted THIS assignment
        let sql = `
            SELECT a.*, u.name as teacherName, 
            (SELECT id FROM submissions s WHERE s.assignmentId = a.id AND s.studentId = ?) as isSubmitted
            FROM assignments a 
            LEFT JOIN users u ON a.teacherId = u.id
        `;
        
        let params = [id]; // This is for the subquery

        if (role === 'teacher') {
            sql += " WHERE a.teacherId = ?";
            params.push(id);
        }

        sql += " ORDER BY a.dueDate ASC";

        const [rows] = await db.execute(sql, params);
        res.json(rows);
    } catch (err) {
        console.error("❌ Assignment Fetch Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};
// ══════════════════════════════════════════════════
// 2. CREATE ASSIGNMENT (Teacher Only)
// POST /api/assignments
// ══════════════════════════════════════════════════
const createAssignment = async (req, res) => {
    const { title, subject, targetClass, dueDate, description } = req.body;
    try {
        const sql = "INSERT INTO assignments (title, subject, targetClass, dueDate, description, teacherId) VALUES (?,?,?,?,?,?)";
        await db.execute(sql, [title, subject, targetClass, dueDate, description, req.user.id]);
        res.json({ success: true, message: "Assignment Posted" });
    } catch (err) {
        console.error("❌ Assignment Create Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};


// ══════════════════════════════════════════════════
// TEACHER: VIEW ALL SUBMISSIONS
// ══════════════════════════════════════════════════
router.get('/teacher/all-submissions', verifyToken, teacherOnly, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                s.id, 
                u.name as studentName, 
                a.title as assignmentTitle,
                s.fileUrl,
                s.submittedAt as createdAt
            FROM submissions s
            INNER JOIN users u ON s.studentId = u.id
            INNER JOIN assignments a ON s.assignmentId = a.id
            ORDER BY s.submittedAt DESC LIMIT 20
        `);
        res.json(rows);
    } catch (err) {
        console.error("🔥 DATABASE ERROR:", err.message); 
        res.status(500).json({ success: false, message: "Database Error: " + err.message });
    }
});

// ══════════════════════════════════════════════════
// 3. SUBMIT ASSIGNMENT (Students Only) ✅ NEW
// POST /api/assignments/:id/submit
// ══════════════════════════════════════════════════
const submitAssignment = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { id } = req.params;
        const studentId = req.user.id;

        // Verify assignment exists
        const [assignment] = await db.execute(
            "SELECT id FROM assignments WHERE id = ?",
            [id]
        );

        if (assignment.length === 0) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        // Check if student already submitted
        const [existing] = await db.execute(
            "SELECT id FROM submissions WHERE assignmentId = ? AND studentId = ?",
            [id, studentId]
        );

        if (existing.length > 0) {
            // Update existing submission
            await db.execute(
                "UPDATE submissions SET fileUrl = ? WHERE assignmentId = ? AND studentId = ?",
                [req.file.path, id, studentId]
            );
        } else {
            // Create new submission
            await db.execute(
                "INSERT INTO submissions (assignmentId, studentId, fileUrl) VALUES (?, ?, ?)",
                [id, studentId, req.file.path]
            );
        }

        res.json({ 
            success: true, 
            message: 'Assignment submitted successfully'
        });
    } catch (err) {
        console.error("❌ Assignment Submit Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ══════════════════════════════════════════════════
// 4. DELETE ASSIGNMENT (Teacher Only)
// DELETE /api/assignments/:id
// ══════════════════════════════════════════════════
const deleteAssignment = async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const teacherId = req.user.id;

        // 1. Get all submissions to delete their files from disk
        const [subs] = await db.execute(
            'SELECT fileUrl FROM submissions WHERE assignmentId = ?',
            [assignmentId]
        );

        for (let sub of subs) {
            if (sub.fileUrl) {
                const absolutePath = path.join(process.cwd(), sub.fileUrl);
                if (fs.existsSync(absolutePath)) {
                    fs.unlinkSync(absolutePath);
                }
            }
        }

        // 2. Delete the assignment from DB (Foreign Key constraints with ON DELETE CASCADE will handle DB submissions deletions)
        await db.execute(
            "DELETE FROM assignments WHERE id = ? AND teacherId = ?",
            [assignmentId, teacherId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("❌ Assignment Delete Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ══════════════════════════════════════════════════
// ROUTE MAPPING
// ══════════════════════════════════════════════════

router.get('/',              verifyToken,              getAssignments);
router.post('/',             verifyToken, teacherOnly, createAssignment);
router.post('/:id/submit', verifyToken, upload.single('workFile'), submitAssignment);  // ✅ NEW
router.delete('/:id',        verifyToken, teacherOnly, deleteAssignment);

module.exports = router;