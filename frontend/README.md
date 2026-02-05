# Aura Chat Frontend

A stunning, minimalist chat interface built with modern HTML5, CSS3, and Vanilla JavaScript.

## Features

- **Minimalist Design**: Clean aesthetics with a soft color palette and Glassmorphism effects.
- **Real-time Messaging**: Powered by Socket.io for instant communication.
- **Image Support**: Send and view images directly in the chat.
- **Message Recall**: Recall messages within 2 minutes of sending.
- **Responsive**: Works beautifully on both desktop and mobile devices.

## Setup & Running

1. **Prerequisites**: Ensure the backend server is running.
2. **Backend**:
   ```bash
   node server.js
   ```
3. **Frontend**:
   Since this is a static frontend, you can serve it using any web server.
   
   If you have Node.js installed, you can use `serve`:
   ```bash
   npx serve frontend
   ```
   Or just open `index.html` in your browser (though some features might require a local server due to CORS/Socket.io).

## Technology Stack

- **HTML5**: Semantic structure.
- **CSS3**: Custom properties (variables), Flexbox, Grid, and Backdrop filters for glassmorphism.
- **JavaScript**: Vanilla JS for logic and Socket.io-client for real-time networking.
