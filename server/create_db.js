const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres', // Connect to default 'postgres' db to create new db
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function createDatabase() {
    try {
        await client.connect();
        // Check if database exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'chat_app'");
        if (res.rowCount === 0) {
            await client.query('CREATE DATABASE chat_app');
            console.log('Database chat_app created successfully');
        } else {
            console.log('Database chat_app already exists');
        }
    } catch (err) {
        console.error('Error creating database:', err);
    } finally {
        await client.end();
    }
}

createDatabase();
