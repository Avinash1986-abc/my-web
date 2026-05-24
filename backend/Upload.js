const multer = require('multer');
const path = require('path');
const fs = require('fs');

console.log("📦 Multer Upload Engine: Initializing...");

/**
 * ── 1. STORAGE STRATEGY ──
 */
const storage = (folder) => multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = `./uploads/${folder}`;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${folder}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
    }
});

/**
 * ── 2. SECURITY FILTERS ──
 */
const videoFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid format: Only video files allowed.'), false);
    }
};

const materialFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
    if (allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Format rejected: PDF, PPT, or Word only.'), false);
    }
};

/**
 * ── 3. MULTER INSTANCES ──
 */
const uploadVideo = multer({ 
    storage: storage('videos'), 
    fileFilter: videoFilter, 
    limits: { fileSize: 1024 * 1024 * 1024 } // 1GB
});

const uploadMaterial = multer({ 
    storage: storage('materials'), 
    fileFilter: materialFilter, 
    limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

const uploadAssignment = multer({ 
    storage: storage('assignments'), 
    limits: { fileSize: 50 * 1024 * 1024 } 
});

// ── 4. EXPORTS ──
module.exports = {
    uploadVideo,
    uploadMaterial,
    uploadAssignment
};