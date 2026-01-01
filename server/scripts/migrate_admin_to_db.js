const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'chat_app',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function migrateAdmin() {
    try {
        await client.connect();

        // 1. Create admins table
        await client.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Admins table created or already exists.');

        // 2. Get admin creds from env
        const username = process.env.ADMIN_USERNAME || 'admin';
        const rawPassword = process.env.ADMIN_PASSWORD || 'secret_admin_pass';

        // 3. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        // 4. Insert or Update
        // using upsert to handle re-runs
        await client.query(`
            INSERT INTO admins (username, password_hash)
            VALUES ($1, $2)
            ON CONFLICT (username) 
            DO UPDATE SET password_hash = $2;
        `, [username, hashedPassword]);

        console.log(`Admin user '${username}' secured in database with encryption.`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrateAdmin();
