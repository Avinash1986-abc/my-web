// Db.js
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST || '127.0.0.1',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Avinash@986',
  database: process.env.DB_NAME || 'rural_learning_db',
  port:     parseInt(process.env.DB_PORT) || 3306,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT) || 50,
});

// Test connection on startup
pool.promise().getConnection()
    .then(conn => {
        console.log('✅ MySQL Database Connected & Online');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    });

module.exports = pool.promise();