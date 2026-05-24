const express = require('express');
const router  = express.Router();
const db      = require('./Db');
const { verifyToken, teacherOnly } = require('./Auth');

// ══════════════════════════════════════════════════
// 1. CREATE QUIZ (Teacher Only)
// POST /api/quizzes/create
// ══════════════════════════════════════════════════
router.post('/create', verifyToken, teacherOnly, async (req, res) => {
    const { title, subject, duration, targetClass, questions } = req.body;
    try {
        const [quizResult] = await db.execute(
            "INSERT INTO quizzes (title, subject, duration, targetClass, teacherId) VALUES (?, ?, ?, ?, ?)",
            [title, subject, duration, targetClass, req.user.id]
        );
        const quizId = quizResult.insertId;

        const qSql = "INSERT INTO quiz_questions (quiz_id, question, opt_a, opt_b, opt_c, opt_d, correct) VALUES (?, ?, ?, ?, ?, ?, ?)";
        for (let q of questions) {
            await db.execute(qSql, [quizId, q.question, q.options[0], q.options[1], q.options[2], q.options[3], q.correct]);
        }
        res.json({ success: true, message: "Quiz Published!" });
    } catch (err) {
        console.error("❌ Quiz Create Error:", err.message);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

// ══════════════════════════════════════════════════
// 2. GET ALL QUIZZES
// GET /api/quizzes
// Teacher → own quizzes only
// Student → all quizzes + attempted status from DB
// ══════════════════════════════════════════════════
router.get('/', verifyToken, async (req, res) => {
    try {
        const { id, role } = req.user;

        let sql = `
            SELECT q.*, 
                   (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as q_count
            FROM quizzes q
        `;
        let params = [];

        if (role === 'teacher') {
            sql += ` WHERE q.teacherId = ?`;
            params.push(id);
        }

        sql += ` ORDER BY q.id DESC`;
        const [rows] = await db.execute(sql, params);

        for (let quiz of rows) {
            // Attach questions
            const [qns] = await db.execute(
                "SELECT * FROM quiz_questions WHERE quiz_id = ?",
                [quiz.id]
            );
            quiz.questions = qns;

            // For students: check attempt status from DB on every load
            if (role === 'student') {
                const [attempt] = await db.execute(
                    "SELECT id, score, total FROM quiz_attempts WHERE quizId = ? AND studentId = ?",
                    [quiz.id, id]
                );
                quiz.attempted = attempt.length > 0;
                quiz.lastScore = attempt.length > 0 ? attempt[0].score : null;
                quiz.lastTotal = attempt.length > 0 ? attempt[0].total : null;
            }
        }

        res.json(rows);
    } catch (err) {
        console.error("❌ Quiz Fetch Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});



// ══════════════════════════════════════════════════
// TEACHER: VIEW ALL QUIZ ATTEMPTS
// ══════════════════════════════════════════════════
router.get('/teacher/quiz-results', verifyToken, teacherOnly, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                qa.score, 
                qa.total as total_questions,
                u.name as studentName, 
                q.title as quizTitle,
                qa.attemptedAt as createdAt
            FROM quiz_attempts qa
            JOIN users u ON qa.studentId = u.id
            JOIN quizzes q ON qa.quizId = q.id
            ORDER BY qa.id DESC LIMIT 20
        `);
        res.json(rows);
    } catch (err) {
        console.error("🔥 QUIZ DB ERROR:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ══════════════════════════════════════════════════
// 3. SUBMIT QUIZ RESULT (Student Only)
// POST /api/quizzes/:id/submit
// ══════════════════════════════════════════════════
router.post('/:id/submit', verifyToken, async (req, res) => {
    const { score, total } = req.body;
    const studentId = req.user.id;
    const quizId    = req.params.id;

    try {
        // Block re-attempt
        const [existing] = await db.execute(
            "SELECT id FROM quiz_attempts WHERE quizId = ? AND studentId = ?",
            [quizId, studentId]
        );
        if (existing.length > 0) {
            return res.json({ success: false, message: "Already attempted." });
        }

        await db.execute(
            "INSERT INTO quiz_attempts (quizId, studentId, score, total) VALUES (?, ?, ?, ?)",
            [quizId, studentId, score, total]
        );
        res.json({ success: true, message: "Score saved!" });
    } catch (err) {
        console.error("❌ Quiz Submit Error:", err.message);
        res.status(500).json({ success: false, message: "Error saving score" });
    }
});

// ══════════════════════════════════════════════════
// 4. GET STUDENT STATS (for Dashboard)
// GET /api/quizzes/stats
// ══════════════════════════════════════════════════
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const studentId = req.user.id;
        const [attempts] = await db.execute(
            "SELECT COUNT(*) as total, AVG(score/total*100) as avgScore FROM quiz_attempts WHERE studentId = ?",
            [studentId]
        );
        res.json({
            success: true,
            quizzesAttempted: attempts[0].total || 0,
            avgScore: Math.round(attempts[0].avgScore || 0)
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ══════════════════════════════════════════════════
// 5. DELETE QUIZ (Teacher Only)
// DELETE /api/quizzes/:id
// ══════════════════════════════════════════════════
router.delete('/:id', verifyToken, teacherOnly, async (req, res) => {
    try {
        await db.execute("DELETE FROM quiz_questions WHERE quiz_id = ?", [req.params.id]);
        await db.execute("DELETE FROM quiz_attempts WHERE quizId = ?",   [req.params.id]);
        await db.execute("DELETE FROM quizzes WHERE id = ?",             [req.params.id]);
        res.json({ success: true, message: "Quiz Deleted" });
    } catch (err) {
        console.error("❌ Quiz Delete Error:", err.message);
        res.status(500).json({ success: false, message: "Delete Failed" });
    }
});

module.exports = router;