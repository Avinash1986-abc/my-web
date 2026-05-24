const express     = require('express');
const http        = require('http');
const cors        = require('cors');
const dotenv      = require('dotenv');
const path        = require('path');
const fs          = require('fs');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');

dotenv.config();

const app    = express();
const server = http.createServer(app);

// ── 1. FOLDER INITIALIZATION ──
const uploadDirs = [
    './uploads',
    './uploads/videos',
    './uploads/materials',
    './uploads/assignments'
];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── 2. SECURITY & CORS ──
app.use(cors());
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
}));
app.use(morgan('dev'));
app.use(compression());

// ── 3. PAYLOAD LIMITS (FOR 1GB VIDEOS) ──
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ── 4. STATIC FILE SERVING ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── 5. HEALTH CHECK (BEFORE ROUTES) ──
app.get('/health', (req, res) => {
    res.json({ status: 'UP', message: 'Rural Learning API is active' });
});

// ── 6. API ROUTES ──
try {
    console.log("📡 Loading API Routes...");
    
    app.use('/api/auth',        require('./Auth.routes'));
    console.log("✅ Auth routes loaded");
    
    app.use('/api/videos',      require('./Video.routes'));
    console.log("✅ Video routes loaded");
    
    app.use('/api/materials',   require('./Material.routes'));
    console.log("✅ Material routes loaded");
    
    app.use('/api/assignments', require('./Assignment.routes'));
    console.log("✅ Assignment routes loaded");
    
    app.use('/api/quizzes',     require('./Quiz.routes'));
    console.log("✅ Quiz routes loaded");
    
    app.use('/api/analytics',   require('./Analytics.routes'));
    console.log("✅ Analytics routes loaded");

    console.log("✅ All routes loaded successfully");
} catch (error) {
    console.error("❌ ROUTE LOADING ERROR:", error.message);
    console.error("Stack Trace:", error.stack);
}

// ── 7. ERROR HANDLING (AFTER ALL ROUTES) ──
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'API Route not found' });
});

app.use((err, req, res, next) => {
    console.error("🔥 SERVER ERROR:", err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// ── 8. START THE ENGINE ──
const PORT = process.env.PORT || 5000;

const serverInstance = server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 RURAL LEARNING BACKEND STARTED
    ==========================================
    📡 ACCESS URL: http://localhost:${PORT}
    🛠️  ENVIRONMENT: ${process.env.NODE_ENV || 'development'}
    📂 UPLOADS: /uploads/ (Ready for 1GB Files)
    ==========================================
    `);
});

serverInstance.timeout     = 3600000; // 1 Hour for large uploads
serverInstance.keepAliveTimeout = 3600000;
