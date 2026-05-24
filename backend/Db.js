const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT || 3306,
    connectionLimit: 10,
    waitForConnections: true,
    ssl: { rejectUnauthorized: false }
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