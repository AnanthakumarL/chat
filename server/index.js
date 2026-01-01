console.log("Starting server script...");
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initDb, query } = require('./db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Static /uploads
const path = require('path');
const fs = require('fs');
// Ensure uploads dir
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Setup
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await query('SELECT * FROM admins WHERE username = $1', [username]);

        if (result.rows.length > 0) {
            const admin = result.rows[0];
            const match = await bcrypt.compare(password, admin.password_hash);

            if (match) {
                // In a real app, you would sign a JWT here. 
                // For now we keep the simple static token or you can generte one.
                return res.json({ success: true, token: 'admin-secret-token-123' });
            }
        }
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'Bearer admin-secret-token-123') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await query('SELECT COUNT(*) FROM messages');
        const viewRes = await query('SELECT total_views FROM site_stats WHERE id = 1');

        // Count online users
        const onlineCount = io.engine.clientsCount;

        // Tags
        const tagCounts = {};
        for (const user of userManager.allUsers.values()) {
            if (user.interests) {
                user.interests.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        }
        const sortedTags = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json({
            onlineUsers: onlineCount,
            totalMessages: result.rows[0].count,
            totalViews: viewRes.rows[0]?.total_views || 0,
            activeTags: sortedTags,
            uptime: process.uptime()
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- ADS API ---

// Public Ads Fetch
app.get('/api/public/ads', async (req, res) => {
    try {
        const result = await query('SELECT * FROM ads WHERE active = TRUE ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ads' });
    }
});

// Admin: Get All Ads
app.get('/api/admin/ads', async (req, res) => {
    if (req.headers.authorization !== 'Bearer admin-secret-token-123') return res.status(401).send();
    try {
        const result = await query('SELECT * FROM ads ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ads' });
    }
});

// Admin: Create Ad
app.post('/api/admin/ads', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Image required' });

    const { link_url, duration, active, position } = req.body;
    // Assuming server runs on 3001, we return relative path or full path
    // Let's return relative path, client will prepend domain
    const imageUrl = `/uploads/${req.file.filename}`;

    try {
        const result = await query(
            'INSERT INTO ads (image_url, link_url, duration, active, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [imageUrl, link_url, duration || 10, active === 'true', position || 'banner1']
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create ad' });
    }
});

// Admin: Delete Ad
app.delete('/api/admin/ads/:id', async (req, res) => {
    if (req.headers.authorization !== 'Bearer admin-secret-token-123') return res.status(401).send();
    try {
        await query('DELETE FROM ads WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Admin: Update Ad Status/Duration
app.put('/api/admin/ads/:id', async (req, res) => {
    if (req.headers.authorization !== 'Bearer admin-secret-token-123') return res.status(401).send();
    const { active, duration } = req.body;
    try {
        if (duration) {
            await query('UPDATE ads SET duration = $1 WHERE id = $2', [duration, req.params.id]);
        }
        if (active !== undefined) {
            await query('UPDATE ads SET active = $1 WHERE id = $2', [active, req.params.id]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// Initialize DB
initDb();

let waitingUsers = [];
let userRooms = {}; // socketId -> roomId

class UserManager {
    constructor() {
        this.waitingQueue = [];
        this.allUsers = new Map(); // socketId -> userData
    }

    addUser(socket, data = {}) {
        const userInfo = {
            id: socket.id,
            socket: socket,
            gender: data.gender || 'any',
            preference: data.preference || 'any',
            interests: (data.interests || [])
                .map(i => i.toLowerCase().trim())
                .filter(i => i),
            connected: true
        };

        // Update global user map for stats
        this.allUsers.set(socket.id, userInfo);

        const matchIndex = this.findMatch(userInfo);

        if (matchIndex > -1) {
            const partner = this.waitingQueue.splice(matchIndex, 1)[0];
            if (partner.socket.connected) {
                this.pairUsers(userInfo, partner);
            } else {
                this.addUser(socket, data);
            }
        } else {
            this.waitingQueue.push(userInfo);
            socket.emit('status', { status: 'waiting' });
        }

        broadcastAdminStats(); // Update tags
    }

    // ... (findMatch remains same, but pairUsers doesn't need changes)

    findMatch(user) {
        return this.waitingQueue.findIndex(partner => {
            const matchMyPref = user.preference === 'any' || user.preference === partner.gender;
            const matchPartnerPref = partner.preference === 'any' || partner.preference === user.gender;

            if (!matchMyPref || !matchPartnerPref) return false;

            const userHasInterests = user.interests.length > 0;
            const partnerHasInterests = partner.interests.length > 0;

            if (userHasInterests) {
                if (!partnerHasInterests) return false;
                const common = user.interests.filter(i => partner.interests.includes(i));
                return common.length > 0;
            }

            return true;
        });
    }

    pairUsers(user1, user2) {
        const roomId = uuidv4();
        const socket1 = user1.socket;
        const socket2 = user2.socket;

        socket1.join(roomId);
        socket2.join(roomId);

        userRooms[socket1.id] = roomId;
        userRooms[socket2.id] = roomId;

        const commonInterests = user1.interests.filter(i => user2.interests.includes(i));

        io.to(roomId).emit('status', { status: 'in_chat', roomId });

        let msgContent = 'You are now connected with a stranger!';
        if (commonInterests.length > 0) {
            msgContent += ` You both like: ${commonInterests.join(', ')}`;
        }

        io.to(roomId).emit('system', { content: msgContent });
    }

    removeUser(socket) {
        this.waitingQueue = this.waitingQueue.filter(u => u.id !== socket.id);
        this.allUsers.delete(socket.id); // Remove from stats

        const roomId = userRooms[socket.id];
        if (roomId) {
            socket.to(roomId).emit('status', { status: 'partner_disconnected' });
            socket.to(roomId).emit('system', { content: 'Stranger has disconnected.' });
            delete userRooms[socket.id];
        }
    }
}

const userManager = new UserManager();

io.on('connection', async (socket) => {
    console.log('User connected:', socket.id);

    // Increment Total Views
    try {
        await query('UPDATE site_stats SET total_views = total_views + 1 WHERE id = 1');
    } catch (e) { console.error('View count error', e); }

    io.emit('user_count', io.engine.clientsCount);
    broadcastAdminStats();

    // Admin Join Room
    socket.on('admin_join', (token) => {
        if (token === 'admin-secret-token-123') {
            socket.join('admin_room');
            broadcastAdminStats();
        }
    });

    socket.on('find_partner', (data) => {
        const currentRoom = userRooms[socket.id];
        if (currentRoom) {
            socket.leave(currentRoom);
            delete userRooms[socket.id];
        }
        userManager.addUser(socket, data);
    });

    socket.on('send_message', async (data) => {
        const { content, roomId } = data;
        const currentRoom = userRooms[socket.id];

        console.log(`[Message] From ${socket.id} to room ${roomId || 'null'}. Expected room: ${currentRoom || 'none'}`);

        if (currentRoom && currentRoom === roomId) {
            try {
                await query(
                    'INSERT INTO messages (room_id, sender_id, content) VALUES ($1, $2, $3)',
                    [roomId, socket.id, content]
                );

                socket.to(roomId).emit('message', {
                    sender: 'stranger',
                    content,
                    timestamp: new Date()
                });

                socket.emit('message_sent', {
                    content,
                    timestamp: new Date()
                });

                broadcastAdminStats();

            } catch (err) {
                console.error('Error saving message:', err);
            }
        } else {
            console.log(`[Error] Message rejected. User ${socket.id} not in room ${roomId}`);
            socket.emit('system', { content: 'Error: You are not connected to a partner. Please find a new partner.' });
            socket.emit('status', { status: 'partner_disconnected' });
        }
    });

    socket.on('leave_chat', () => {
        userManager.removeUser(socket);
        delete userRooms[socket.id];
    });

    socket.on('disconnect', () => {
        userManager.removeUser(socket);
        io.emit('user_count', io.engine.clientsCount);
        broadcastAdminStats();
        console.log('User disconnected:', socket.id);
    });
});

async function broadcastAdminStats() {
    try {
        // Get Message Count
        const msgRes = await query('SELECT COUNT(*) FROM messages');
        const messageCount = msgRes.rows[0].count;

        // Get View Count
        const viewRes = await query('SELECT total_views FROM site_stats WHERE id = 1');
        const viewCount = viewRes.rows[0]?.total_views || 0;

        const onlineCount = io.engine.clientsCount;

        // Calculate Tags
        const tagCounts = {};
        for (const user of userManager.allUsers.values()) {
            if (user.interests) {
                user.interests.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        }
        // Convert to array sorted by count
        const sortedTags = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10

        io.to('admin_room').emit('admin_stats', {
            onlineUsers: onlineCount,
            totalMessages: messageCount,
            totalViews: viewCount,
            activeTags: sortedTags
        });
    } catch (err) {
        console.error('Error broadcasting admin stats:', err);
    }
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
