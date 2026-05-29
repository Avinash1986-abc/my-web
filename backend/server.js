// server.js
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const dotenv  = require('dotenv');
dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS — allow both localhost and 127.0.0.1 ────────────────────────────────
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
    ],
    credentials: true
}));

// ✅ NEW — 1GB limit for video uploads
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./Auth.routes'));
app.use('/api/videos',      require('./Video.routes'));
app.use('/api/materials',   require('./Material.routes'));
app.use('/api/assignments', require('./Assignment.routes'));
app.use('/api/quizzes',     require('./Quiz.routes'));
app.use('/api/analytics',   require('./Analytics.routes'));
app.use('/api/chat',        require('./Chat.routes'));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}\n`);
});

// Configure generous timeouts for large video/file uploads (up to 1GB)
server.timeout = 30 * 60 * 1000;         // 30 minutes
server.requestTimeout = 30 * 60 * 1000;  // 30 minutes
server.headersTimeout = 65 * 1000;       // 65 seconds