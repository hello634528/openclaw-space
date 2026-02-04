const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for Express
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: "*", // In production, replace with specific origins
    methods: ["GET", "POST"]
  }
});

app.get('/', (req, res) => {
  res.send('Chat Backend is running!');
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle joining a room
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  // Handle sending messages
  socket.on('send_message', (data) => {
    // Broadcast to the specific room
    io.to(data.room).emit('receive_message', {
      user: data.user,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
