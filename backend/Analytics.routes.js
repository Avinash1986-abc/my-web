const express = require('express');
const router  = express.Router();
const db      = require('./Db'); 
const { verifyToken } = require('./Auth');

router.get('/student-stats', verifyToken, async (req, res) => {
    // IMPORTANT: Get the class from the student's token
    const studentClass = req.user.studentClass; 

    try {
        // 1. Total Videos available for this class
        const [vids] = await db.execute(
            "SELECT COUNT(*) as total FROM videos WHERE targetClass = ?", 
            [studentClass]
        );

        // 2. Total Assignments available for this class
        const [assign] = await db.execute(
            "SELECT COUNT(*) as total FROM assignments WHERE targetClass = ?", 
            [studentClass]
        );

        // 3. Total Study Materials available for this class
        const [mats] = await db.execute(
            "SELECT COUNT(*) as total FROM materials WHERE targetClass = ?", 
            [studentClass]
        );

        res.json({
            success: true,
            className: studentClass || "N/A",
            totalVideos: vids[0].total || 0,
            totalAssignments: assign[0].total || 0,
            totalMaterials: mats[0].total || 0
        });

    } catch (err) {
        console.error("🔥 Analytics Error:", err.message);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

module.exports = router;