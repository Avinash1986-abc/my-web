const db = require('./Db');
const fs = require('fs');
const path = require('path');

// ── 1. CREATE ASSIGNMENT (Teacher) ──
exports.createAssignment = async (req, res) => {
    const { title, description, dueDate, targetClass, subject } = req.body;
    try {
        const sql = `INSERT INTO assignments (title, description, dueDate, targetClass, subject, teacherId) VALUES (?, ?, ?, ?, ?, ?)`;
        await db.execute(sql, [title, description, dueDate, targetClass, subject, req.user.id]);
        res.status(201).json({ success: true, message: 'Assignment published successfully!' });
    } catch (err) {
        res.status(500).json({ message: 'Error publishing assignment.' });
    }
};

// ── 2. SUBMIT ASSIGNMENT (Student) ──
exports.submitAssignment = async (req, res) => {
    const assignmentId = req.params.id;
    const studentId = req.user.id;
    const fileUrl = `/uploads/assignments/${req.file.filename}`;

    try {
        // Prevent duplicate submissions
        const [existing] = await db.execute('SELECT id FROM submissions WHERE assignmentId = ? AND studentId = ?', [assignmentId, studentId]);
        if (existing.length > 0) {
            // Delete the newly uploaded file if submission already exists
            fs.unlinkSync(path.join(__dirname, req.file.path));
            return res.status(400).json({ message: 'You have already submitted this assignment.' });
        }

        const sql = `INSERT INTO submissions (assignmentId, studentId, fileUrl) VALUES (?, ?, ?)`;
        await db.execute(sql, [assignmentId, studentId, fileUrl]);
        
        res.json({ success: true, message: 'Work submitted successfully!' });
    } catch (err) {
        // Cleanup file if DB fails
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Submission failed due to server error.' });
    }
};

// ── 3. GET ASSIGNMENTS (Student View) ──
exports.getAllAssignments = async (req, res) => {
    try {
        // In a professional app, we only show assignments meant for the student's class
        const [rows] = await db.execute('SELECT a.*, u.name as teacherName FROM assignments a JOIN users u ON a.teacherId = u.id ORDER BY a.dueDate ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Could not fetch assignments.' });
    }
};

// ── 4. GRADE SUBMISSION (Teacher) ──
exports.gradeSubmission = async (req, res) => {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    try {
        const sql = `UPDATE submissions SET grade = ?, feedback = ?, graded_at = NOW() WHERE id = ?`;
        await db.execute(sql, [grade, feedback, submissionId]);
        res.json({ success: true, message: 'Grade updated!' });
    } catch (err) {
        res.status(500).json({ message: 'Grading failed.' });
    }
};

// ── 5. DELETE ASSIGNMENT ──
exports.deleteAssignment = async (req, res) => {
    try {
        // Professional apps handle "Cascading Deletes"
        // 1. Get all submissions to delete physical files
        const [subs] = await db.execute('SELECT fileUrl FROM submissions WHERE assignmentId = ?', [req.params.id]);
        subs.forEach(sub => {
            const fullPath = path.join(__dirname, sub.fileUrl);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        });

        // 2. Delete from DB
        await db.execute('DELETE FROM assignments WHERE id = ? AND teacherId = ?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Assignment and all submissions removed.' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed.' });
    }
};

// Boilerplate for remaining missing functions
exports.getMyAssignments = async (req, res) => { /* logic for teacher's own tasks */ };
exports.getMySubmissions = async (req, res) => { /* logic for student's history */ };
exports.getSubmissions = async (req, res) => { /* logic for teacher to see student list */ };