const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'chat_app',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

const query = (text, params) => pool.query(text, params);

const initDb = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(100) NOT NULL,
        sender_id VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Stats Table
    await query(`
        CREATE TABLE IF NOT EXISTS site_stats (
            id SERIAL PRIMARY KEY,
            total_views INTEGER DEFAULT 0
        )
    `);

    // Create Ads Table
    await query(`
        CREATE TABLE IF NOT EXISTS ads(
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        link_url TEXT,
        duration INTEGER DEFAULT 10,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `);

    // Init stats row
    const statsCheck = await query('SELECT * FROM site_stats WHERE id = 1');
    if (statsCheck.rows.length === 0) {
      await query('INSERT INTO site_stats (total_views) VALUES (0)');
    }
    console.log('Database initialized (v2 random chat)');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

module.exports = {
  query,
  initDb,
  pool
};
