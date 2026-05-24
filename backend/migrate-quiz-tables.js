const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function migrateQuizTables() {
    console.log('📡 Migrating quiz tables to existing database...');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: 'root',
            password: '' // Empty password
        });

        console.log('✅ Connected! Adding quiz tables...');
        
        await connection.query(`USE rural_learning_db`);

        // Alter assignments table to fix column name if needed
        console.log('🔄 Checking assignments table...');
        try {
            const [columns] = await connection.query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME='assignments' AND TABLE_SCHEMA='rural_learning_db'
            `);
            const columnNames = columns.map(col => col.COLUMN_NAME);
            
            if (columnNames.includes('deadline') && !columnNames.includes('dueDate')) {
                console.log('➕ Renaming deadline to dueDate in assignments...');
                await connection.query(`ALTER TABLE assignments CHANGE deadline dueDate DATETIME`);
            }
        } catch (e) {
            console.log('⚠️  Could not check/rename deadline column:', e.message);
        }

        // Create Quizzes Table if it doesn't exist
        console.log('🔄 Checking quizzes table...');
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
        console.log('✅ Quizzes table ready');

        // Create Quiz Questions Table if it doesn't exist
        console.log('🔄 Checking quiz_questions table...');
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
        console.log('✅ Quiz questions table ready');

        // Create Quiz Attempts Table if it doesn't exist
        console.log('🔄 Checking quiz_attempts table...');
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
        console.log('✅ Quiz attempts table ready');

        console.log('\n✨ MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('📝 All quiz tables have been created/updated.');
        process.exit(0);
    } catch (err) {
        console.error('❌ MIGRATION FAILED.');
        console.error('Error:', err.message);
        console.log('\nTip: Make sure MySQL is running and your .env file has correct DB credentials.');
        process.exit(1);
    }
}

migrateQuizTables();
