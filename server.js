const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;

// Persistence Setup
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');

const loadData = (file, defaultValue = []) => {
  if (!fs.existsSync(file)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return defaultValue;
  }
};

const saveData = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
};

let users = loadData(USERS_FILE, {});
let messages = loadData(MESSAGES_FILE, []);
let friends = loadData(FRIENDS_FILE, {});

// Express Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Auth API
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (users[username]) return res.status(400).json({ error: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  users[username] = {
    username,
    password: hashedPassword,
    id: uuidv4(),
    createdAt: new Date().toISOString()
  };
  saveData(USERS_FILE, users);
  res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ success: true, user: { username: user.username, id: user.id } });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e8
});

// Socket logic
const onlineUsers = new Map(); // username -> socketId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('authenticate', (data) => {
    const { username } = data;
    if (username) {
      socket.username = username;
      onlineUsers.set(username, socket.id);
      console.log(`${username} authenticated`);
      
      // Send friend list
      const userFriends = friends[username] || [];
      socket.emit('friends_list', userFriends);
      
      // Notify friends they are online
      userFriends.forEach(friend => {
        const friendSocketId = onlineUsers.get(friend);
        if (friendSocketId) {
          io.to(friendSocketId).emit('friend_status', { username, status: 'online' });
        }
      });
    }
  });


  socket.on('join_room', (room) => {
    socket.join(room);
    // Send room history
    const history = messages.filter(m => m.room === room).slice(-50);
    socket.emit('room_history', history);
  });

  socket.on('send_message', (data) => {
    const { room, message, image, type, target } = data;
    const msgId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const messageData = {
      id: msgId,
      room,
      sender: socket.username,
      message,
      image,
      timestamp,
      type: type || 'group', // 'group' or 'dm'
      target: target // username if dm
    };

    messages.push(messageData);
    if (messages.length > 1000) messages.shift(); // Keep last 1000
    saveData(MESSAGES_FILE, messages);

    if (type === 'dm' && target) {
      const targetSocketId = onlineUsers.get(target);
      if (targetSocketId) {
        io.to(targetSocketId).emit('receive_message', messageData);
      }
      socket.emit('receive_message', messageData); // Echo to sender
    } else {
      io.to(room).emit('receive_message', messageData);
    }
  });

  socket.on('add_friend', (data) => {
    const { from, to, tempKey } = data;
    // Simple auto-accept for this implementation or just store request
    if (!friends[from]) friends[from] = [];
    if (!friends[to]) friends[to] = [];
    
    if (!friends[from].includes(to)) friends[from].push(to);
    if (!friends[to].includes(from)) friends[to].push(from);
    
    saveData(FRIENDS_FILE, friends);
    
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('friend_added', { username: from });
    }
    socket.emit('friend_added', { username: to });
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      onlineUsers.delete(socket.username);
      // Notify friends
      const userFriends = friends[socket.username] || [];
      userFriends.forEach(friend => {
        const friendSocketId = onlineUsers.get(friend);
        if (friendSocketId) {
          io.to(friendSocketId).emit('friend_status', { username: socket.username, status: 'offline' });
        }
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
