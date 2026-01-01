const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'chat_app', // Connect to chat_app directly
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const resetDb = async () => {
    try {
        await pool.query('DROP TABLE IF EXISTS messages');
        console.log('Dropped messages table');

        await pool.query(`
      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(100) NOT NULL,
        sender_id VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Recreated messages table with new schema');
    } catch (err) {
        console.error('Error resetting database:', err);
    } finally {
        pool.end();
    }
};

resetDb();
