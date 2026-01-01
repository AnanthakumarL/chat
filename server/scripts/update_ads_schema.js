const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'chat_app',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        await client.connect();
        await client.query("ALTER TABLE ads ADD COLUMN IF NOT EXISTS position VARCHAR(50) DEFAULT 'banner1'");
        console.log("Added position column to ads table");
    } catch (e) {
        console.error("Error updating schema:", e);
    } finally {
        await client.end();
    }
}

run();
