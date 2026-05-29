const express = require('express');
const router  = express.Router();
const db      = require('./Db'); 
const { verifyToken } = require('./Auth');

/**
 * ── 1. STUDENT UNIFIED ANALYTICS ──
 * This route provides personal progress AND class totals in one call.
 */
router.get('/student-stats', verifyToken, async (req, res) => {
    const studentId = req.user.id;
    const studentClass = req.user.studentClass || 'N/A'; 

    try {
        // 1. VIDEOS: Watched (personal) vs Total (class)
        const [watched] = await db.execute(
            "SELECT COUNT(DISTINCT video_id) as count FROM video_progress WHERE student_id = ?", 
            [studentId]
        );
        const [totalVids] = await db.execute(
            "SELECT COUNT(*) as count FROM videos WHERE targetClass = ? OR targetClass = 'All'", 
            [studentClass]
        );

        // 2. ASSIGNMENTS: Submitted (personal) vs Total (class)
        const [submitted] = await db.execute(
            "SELECT COUNT(DISTINCT assignmentId) as count FROM submissions WHERE studentId = ?", 
            [studentId]
        );
        const [totalAssign] = await db.execute(
            "SELECT COUNT(*) as count FROM assignments WHERE targetClass = ? OR targetClass = 'All'", 
            [studentClass]
        );

        // 3. QUIZ ACCURACY: Average from 'quiz_attempts'
        const [quiz] = await db.execute(`
            SELECT AVG((score / NULLIF(total, 0)) * 100) as average 
            FROM quiz_attempts 
            WHERE studentId = ?`, 
            [studentId]
        );

        // 4. STUDY MATERIALS: Total for class
        const [totalMats] = await db.execute(
            "SELECT COUNT(*) as count FROM materials WHERE targetClass = ? OR targetClass = 'All'", 
            [studentClass]
        );

        // Unified Object
        res.json({
            success: true,
            className: studentClass,
            stats: {
                videosWatched: watched[0].count || 0,
                videosTotal: totalVids[0].count || 0,
                assignmentsDone: submitted[0].count || 0,
                assignmentsTotal: totalAssign[0].count || 0,
                quizAccuracy: quiz[0].average ? Math.round(quiz[0].average) + "%" : "0%",
                totalMaterials: totalMats[0].count || 0
            }
        });

    } catch (err) {
        console.error("🔥 Analytics Sync Failed:", err.message);
        res.status(500).json({ success: false, message: "Database Sync Error" });
    }
});

/**
 * ── 2. SCOREBOARD LEADERBOARD ──
 */
router.get('/scoreboard', verifyToken, async (req, res) => {
    try {
        const sql = `
            SELECT u.id, u.name, COALESCE(SUM(qa.score), 0) as points
            FROM users u
            LEFT JOIN quiz_attempts qa ON u.id = qa.studentId
            WHERE u.role = 'student'
            GROUP BY u.id, u.name
            ORDER BY points DESC
            LIMIT 20
        `;
        const [rows] = await db.execute(sql);
        res.json({ success: true, students: rows });
    } catch (err) {
        console.error("🔥 Scoreboard query failed:", err.message);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

/**
 * ── 3. PERFORMANCE PROGRESS REPORTS ──
 */
router.get('/progress', verifyToken, async (req, res) => {
    const studentId = req.user.id;
    const studentClass = req.user.studentClass || 'N/A';

    try {
        // 1. VIDEOS: Watched (personal) vs Total (class)
        const [watched] = await db.execute(
            "SELECT COUNT(DISTINCT video_id) as count FROM video_progress WHERE student_id = ?",
            [studentId]
        );
        const [totalVids] = await db.execute(
            "SELECT COUNT(*) as count FROM videos WHERE targetClass = ? OR targetClass = 'All'",
            [studentClass]
        );

        const watchedCount = watched[0].count || 0;
        const totalVidsCount = totalVids[0].count || 0;
        const syllabusPct = totalVidsCount > 0 ? Math.round((watchedCount / totalVidsCount) * 100) : 0;

        // 2. QUIZ ACCURACY: Average from quiz_attempts
        const [quiz] = await db.execute(
            "SELECT AVG((score / NULLIF(total, 0)) * 100) as average, AVG(score) as avgRaw, COUNT(*) as attemptsCount FROM quiz_attempts WHERE studentId = ?",
            [studentId]
        );

        const quizAccuracyPct = quiz[0].average ? Math.round(quiz[0].average) : 0;
        const avgRawScore = quiz[0].avgRaw ? parseFloat(quiz[0].avgRaw).toFixed(1) : "0.0";
        
        // Target Grade
        let targetGrade = 'N/A';
        if (quiz[0].attemptsCount > 0) {
            if (quizAccuracyPct >= 90) targetGrade = 'A+';
            else if (quizAccuracyPct >= 80) targetGrade = 'A';
            else if (quizAccuracyPct >= 70) targetGrade = 'B';
            else if (quizAccuracyPct >= 60) targetGrade = 'C';
            else targetGrade = 'D';
        }

        // 3. PORTAL RANK
        const [rankings] = await db.execute(`
            SELECT u.id, COALESCE(SUM(qa.score), 0) as points
            FROM users u
            LEFT JOIN quiz_attempts qa ON u.id = qa.studentId
            WHERE u.role = 'student'
            GROUP BY u.id
            ORDER BY points DESC
        `);

        let portalRank = '#--';
        const myRankIndex = rankings.findIndex(r => r.id === studentId);
        if (myRankIndex !== -1) {
            portalRank = `#${myRankIndex + 1}`;
        }

        // 4. SUBJECT METRICS BREAKDOWN
        const [subjectRows] = await db.execute(`
            SELECT DISTINCT subject FROM videos WHERE targetClass = ? OR targetClass = 'All'
            UNION
            SELECT DISTINCT subject FROM quizzes WHERE targetClass = ? OR targetClass = 'All'
            UNION
            SELECT DISTINCT subject FROM materials WHERE targetClass = ? OR targetClass = 'All'
        `, [studentClass, studentClass, studentClass]);

        const subjects = [];
        const subjectIcons = {
            'science': '🔬',
            'chemistry': '🔬',
            'physics': '⚡',
            'mathematics': '📐',
            'maths': '📐',
            'english': '📖',
            'history': '📜',
            'geography': '🌍',
            'social': '🌍',
            'general': '📚'
        };

        for (let row of subjectRows) {
            const subjName = row.subject;
            if (!subjName) continue;

            const subjLower = subjName.toLowerCase();
            const icon = subjectIcons[subjLower] || '📚';

            // Videos watched
            const [subjWatched] = await db.execute(`
                SELECT COUNT(DISTINCT vp.video_id) as count 
                FROM video_progress vp
                JOIN videos v ON vp.video_id = v.id
                WHERE vp.student_id = ? AND v.subject = ?
            `, [studentId, subjName]);

            const [subjTotalVids] = await db.execute(`
                SELECT COUNT(*) as count FROM videos 
                WHERE (targetClass = ? OR targetClass = 'All') AND subject = ?
            `, [studentClass, subjName]);

            const sw = subjWatched[0].count || 0;
            const st = subjTotalVids[0].count || 0;
            const videoPercent = st > 0 ? Math.round((sw / st) * 100) : 0;

            // Quiz Average
            const [subjQuiz] = await db.execute(`
                SELECT AVG(qa.score) as avgScore
                FROM quiz_attempts qa
                JOIN quizzes q ON qa.quizId = q.id
                WHERE qa.studentId = ? AND q.subject = ?
            `, [studentId, subjName]);

            // Recent attempts
            const [recentAttempts] = await db.execute(`
                SELECT q.title as topic, DATE_FORMAT(qa.attemptedAt, '%Y-%m-%d') as date, qa.score, qa.total
                FROM quiz_attempts qa
                JOIN quizzes q ON qa.quizId = q.id
                WHERE qa.studentId = ? AND q.subject = ?
                ORDER BY qa.attemptedAt DESC
                LIMIT 5
            `, [studentId, subjName]);

            const quizAvg = subjQuiz[0].avgScore ? parseFloat(subjQuiz[0].avgScore).toFixed(1) : "0.0";

            subjects.push({
                title: subjName.charAt(0).toUpperCase() + subjName.slice(1),
                icon,
                videoPercent,
                quizAvg,
                recentQuizzes: recentAttempts.map(attempt => ({
                    topic: attempt.topic,
                    date: attempt.date,
                    score: `${attempt.score} / ${attempt.total}`
                }))
            });
        }

        res.json({
            success: true,
            data: {
                overview: {
                    syllabus: `${syllabusPct}%`,
                    avgScore: avgRawScore,
                    grade: targetGrade,
                    rank: portalRank
                },
                subjects
            }
        });

    } catch (err) {
        console.error("🔥 Progress Fetch Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;