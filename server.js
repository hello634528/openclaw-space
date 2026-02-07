const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aura-secret-key-v3';

// Persistence Setup
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');

// Simple Atomic Write Queue
const writeQueue = [];
let isWriting = false;

const processQueue = async () => {
  if (isWriting || writeQueue.length === 0) return;
  isWriting = true;
  const { file, data, resolve, reject } = writeQueue.shift();
  try {
    const tempFile = `${file}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, file);
    resolve();
  } catch (e) {
    reject(e);
  } finally {
    isWriting = false;
    processQueue();
  }
};

const saveData = (file, data) => {
  return new Promise((resolve, reject) => {
    writeQueue.push({ file, data, resolve, reject });
    processQueue();
  });
};

const loadData = (file, defaultValue = []) => {
  if (!fs.existsSync(file)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return defaultValue;
  }
};

let users = loadData(USERS_FILE, {});
let messages = loadData(MESSAGES_FILE, []);
let friends = loadData(FRIENDS_FILE, {});

// Express Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));

// Auth API
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (users[username]) return res.status(400).json({ error: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    username,
    password: hashedPassword,
    id: uuidv4(),
    createdAt: new Date().toISOString()
  };
  users[username] = user;
  await saveData(USERS_FILE, users);
  
  const token = jwt.sign({ username: user.username, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { username: user.username, id: user.id } });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username: user.username, id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { username: user.username, id: user.id } });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e8
});

// Socket auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = decoded;
    next();
  });
});

// Socket logic
const onlineUsers = new Map(); // username -> socketId

io.on('connection', (socket) => {
  const username = socket.user.username;
  console.log('User connected:', username, socket.id);
  
  socket.username = username;
  onlineUsers.set(username, socket.id);
  
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

  socket.on('join_room', (room) => {
    socket.join(room);
    // Send room history
    const history = messages.filter(m => m.room === room && !m.recalled).slice(-50);
    socket.emit('room_history', history);
  });

  socket.on('send_message', async (data) => {
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
    if (messages.length > 2000) messages.shift(); // Keep last 2000
    await saveData(MESSAGES_FILE, messages);

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

  socket.on('recall_message', async (msgId) => {
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex !== -1) {
      const msg = messages[msgIndex];
      if (msg.sender === socket.username) {
        msg.recalled = true;
        msg.message = '[Message Recalled]';
        msg.image = null;
        await saveData(MESSAGES_FILE, messages);
        
        if (msg.type === 'dm') {
          const targetSocketId = onlineUsers.get(msg.target);
          if (targetSocketId) io.to(targetSocketId).emit('message_recalled', msgId);
          socket.emit('message_recalled', msgId);
        } else {
          io.to(msg.room).emit('message_recalled', msgId);
        }
      }
    }
  });

  socket.on('add_friend', async (data) => {
    const { from, to, tempKey } = data;
    if (from !== socket.username) return;

    if (!friends[from]) friends[from] = [];
    if (!friends[to]) friends[to] = [];
    
    if (!friends[from].includes(to)) friends[from].push(to);
    if (!friends[to].includes(from)) friends[to].push(from);
    
    await saveData(FRIENDS_FILE, friends);
    
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
