const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function setup() {
    console.log('📡 Attempting to connect to MySQL...');
    
    try {
        // Read DB password from environment if configured, otherwise default to empty
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : ''
        });

        console.log('✅ Connected! Creating professional database...');
        
        await connection.query(`CREATE DATABASE IF NOT EXISTS rural_learning_db`);
        await connection.query(`USE rural_learning_db`);

        // Create the Users Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('student', 'teacher') DEFAULT 'student',
                studentClass VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create the Videos Table (Handles 1GB files)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS videos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                subject VARCHAR(100),
                targetClass VARCHAR(100),
                description TEXT,
                videoUrl VARCHAR(500) NOT NULL,
                teacherId INT,
                fileSize BIGINT,
                isVisible BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacherId) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create the Materials Table (PDF/PPT)
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

        // Create the Assignments Table
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

        // Create the Submissions Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                assignmentId INT NOT NULL,
                studentId INT NOT NULL,
                fileUrl VARCHAR(500),
                submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                grade INT,
                feedback TEXT,
                FOREIGN KEY (assignmentId) REFERENCES assignments(id) ON DELETE CASCADE,
                FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create the Quizzes Table
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

        // Create the Quiz Questions Table
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

        // Create the Quiz Attempts Table
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

        // Create the Video Progress Table
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

        // Create the Chat Messages Table
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

        console.log('✨ DATABASE & TABLES CREATED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ CONNECTION FAILED.');
        console.error('Error Code:', err.code);
        console.error('Message:', err.sqlMessage);
        console.log('\n--- SENIOR TIP ---');
        console.log('If it still says Access Denied, your MySQL root user DOES have a password.');
        console.log('Try setting DB_PASSWORD=root or DB_PASSWORD=admin in your .env');
        process.exit(1);
    }
}

setup();