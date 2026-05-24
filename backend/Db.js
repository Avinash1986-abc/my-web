const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 50, // Allows 50 users to talk to DB at once
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Professional Async Check
const checkConnection = async () => {
    try {
        const conn = await pool.promise().getConnection();
        console.log('✅ MySQL Database Connected & Online');
        conn.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
};
checkConnection();

module.exports = pool.promise();