const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for Express
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // 100 MB limit for base64 images via sockets
});

// Simple in-memory storage for message recall functionality
// In production, use Redis or a database
const messages = new Map();
const RECALL_TIMEOUT = 2 * 60 * 1000; // 2 minutes

app.get('/', (req, res) => {
  res.send('Chat Backend is running with enhanced features!');
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Store user info in the socket session
  socket.on('set_user_info', (data) => {
    socket.user = {
      nickname: data.nickname || `User_${socket.id.substring(0, 4)}`,
      avatar: data.avatar || null
    };
    console.log(`User ${socket.id} set nickname to: ${socket.user.nickname}`);
  });

  // Handle joining a room
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User ${socket.user?.nickname || socket.id} joined room: ${room}`);
  });

  // Handle sending messages (text or image)
  socket.on('send_message', (data) => {
    const msgId = uuidv4();
    const messageData = {
      id: msgId,
      room: data.room,
      user: socket.user?.nickname || data.user || 'Anonymous',
      avatar: socket.user?.avatar || data.avatar || null,
      message: data.message || '',
      image: data.image || null, // Base64 image data
      timestamp: new Date().toISOString(),
      senderId: socket.id
    };

    // Store message for potential recall
    messages.set(msgId, {
      ...messageData,
      createdAt: Date.now()
    });

    // Automatically clean up old messages from memory after timeout
    setTimeout(() => {
      messages.delete(msgId);
    }, RECALL_TIMEOUT + 1000);

    // Broadcast to the specific room
    io.to(data.room).emit('receive_message', messageData);
  });

  // Handle message recall
  socket.on('message_recall', (data) => {
    const { msgId } = data;
    const msg = messages.get(msgId);

    if (msg) {
      const now = Date.now();
      if (now - msg.createdAt <= RECALL_TIMEOUT) {
        if (msg.senderId === socket.id) {
          io.to(msg.room).emit('message_recalled', { msgId });
          messages.delete(msgId);
          console.log(`Message ${msgId} recalled by ${socket.id}`);
        } else {
          socket.emit('error', { message: 'You can only recall your own messages.' });
        }
      } else {
        socket.emit('error', { message: 'Message recall timeout exceeded.' });
      }
    } else {
      socket.emit('error', { message: 'Message not found or already recalled.' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
