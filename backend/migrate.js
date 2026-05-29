const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function migrate() {
    console.log('📡 Attempting to migrate existing database...');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : ''
        });

        console.log('✅ Connected! Running migrations...');
        
        await connection.query(`USE rural_learning_db`);

        // Add missing columns to videos table if they don't exist
        console.log('🔄 Checking videos table...');
        const [videosColumns] = await connection.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME='videos' AND TABLE_SCHEMA='rural_learning_db'
        `);
        
        const columnNames = videosColumns.map(col => col.COLUMN_NAME);
        
        if (!columnNames.includes('targetClass')) {
            console.log('➕ Adding targetClass to videos table...');
            await connection.query(`ALTER TABLE videos ADD COLUMN targetClass VARCHAR(100)`);
        }
        
        if (!columnNames.includes('description')) {
            console.log('➕ Adding description to videos table...');
            await connection.query(`ALTER TABLE videos ADD COLUMN description TEXT`);
        }

        if (!columnNames.includes('isVisible')) {
            console.log('➕ Adding isVisible to videos table...');
            await connection.query(`ALTER TABLE videos ADD COLUMN isVisible BOOLEAN DEFAULT 1`);
        }

        // Create materials table if it doesn't exist
        console.log('🔄 Checking materials table...');
        const [tables] = await connection.query(`
            SHOW TABLES LIKE 'materials'
        `);
        
        if (tables.length === 0) {
            console.log('➕ Creating materials table...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS materials (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    subject VARCHAR(100),
                    targetClass VARCHAR(100),
                    fileUrl VARCHAR(500) NOT NULL,
                    teacherId INT,
                    fileSize BIGINT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
        }

        // Create assignments table if it doesn't exist
        console.log('🔄 Checking assignments table...');
        const [assignTables] = await connection.query(`
            SHOW TABLES LIKE 'assignments'
        `);
        
        if (assignTables.length === 0) {
            console.log('➕ Creating assignments table...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS assignments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    subject VARCHAR(100),
                    targetClass VARCHAR(100),
                    description TEXT,
                    dueDate DATETIME,
                    fileUrl VARCHAR(500),
                    teacherId INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
        } else {
            // Check and fix deadline -> dueDate column if needed
            console.log('🔄 Checking assignments table columns...');
            const [assignColumns] = await connection.query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME='assignments' AND TABLE_SCHEMA='rural_learning_db'
            `);
            const assignColumnNames = assignColumns.map(col => col.COLUMN_NAME);
            
            if (assignColumnNames.includes('deadline') && !assignColumnNames.includes('dueDate')) {
                console.log('➕ Renaming deadline to dueDate in assignments...');
                await connection.query(`ALTER TABLE assignments CHANGE deadline dueDate DATETIME`);
            }
        }

        // Create Quizzes table if it doesn't exist
        console.log('🔄 Checking quizzes table...');
        const [quizTables] = await connection.query(`
            SHOW TABLES LIKE 'quizzes'
        `);
        
        if (quizTables.length === 0) {
            console.log('➕ Creating quizzes table...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS quizzes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    subject VARCHAR(100),
                    targetClass VARCHAR(100),
                    duration INT,
                    teacherId INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
        }

        // Create quiz_questions table if it doesn't exist
        console.log('🔄 Checking quiz_questions table...');
        const [qnTables] = await connection.query(`
            SHOW TABLES LIKE 'quiz_questions'
        `);
        
        if (qnTables.length === 0) {
            console.log('➕ Creating quiz_questions table...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS quiz_questions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    quiz_id INT NOT NULL,
                    question TEXT NOT NULL,
                    opt_a VARCHAR(255),
                    opt_b VARCHAR(255),
                    opt_c VARCHAR(255),
                    opt_d VARCHAR(255),
                    correct VARCHAR(1),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
                )
            `);
        }

        // Create quiz_attempts table if it doesn't exist
        console.log('🔄 Checking quiz_attempts table...');
        const [qaTables] = await connection.query(`
            SHOW TABLES LIKE 'quiz_attempts'
        `);
        
        if (qaTables.length === 0) {
            console.log('➕ Creating quiz_attempts table...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS quiz_attempts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    quizId INT NOT NULL,
                    studentId INT NOT NULL,
                    score INT,
                    total INT,
                    attemptedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE,
                    FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
        }

        // Create video_progress table if it doesn't exist
        console.log('🔄 Checking video_progress table...');
        const [vpTables] = await connection.query(`
            SHOW TABLES LIKE 'video_progress'
        `);
        
        if (vpTables.length === 0) {
            console.log('➕ Creating video_progress table...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS video_progress (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT NOT NULL,
                    video_id INT NOT NULL,
                    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
                )
            `);
        }

        // Create messages table if it doesn't exist
        console.log('🔄 Checking messages table...');
        const [msgTables] = await connection.query(`
            SHOW TABLES LIKE 'messages'
        `);
        
        if (msgTables.length === 0) {
            console.log('➕ Creating messages table...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sender_id INT NOT NULL,
                    receiver_id INT NOT NULL,
                    message TEXT NOT NULL,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
        }

        console.log('✨ DATABASE MIGRATION COMPLETED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ MIGRATION FAILED.');
        console.error('Error:', err.message);
        process.exit(1);
    }
}

migrate();
