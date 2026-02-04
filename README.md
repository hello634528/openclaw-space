# Chat Backend

A robust Node.js backend for real-time messaging using Express and Socket.io. Designed to be Windows-compatible and easy to set up.

## Features

- **Real-time Messaging**: Powered by Socket.io.
- **CORS Support**: Configured for cross-origin requests.
- **Room Support**: Users can join specific rooms and message within them.
- **CI/CD Ready**: Includes a GitHub Action workflow.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Setup Instructions (Windows)

1. **Clone or Download**: Ensure you have the project files in a folder (e.g., `C:\projects\chat-backend`).
2. **Open Terminal**: Open Command Prompt (cmd) or PowerShell.
3. **Navigate to Project**:
   ```cmd
   cd path\to\projects\chat-backend
   ```
4. **Install Dependencies**:
   ```cmd
   npm install
   ```

## Running the Server

To start the server in production mode:
```cmd
npm start
```

The server will start on port `3000` by default. You can change this by setting the `PORT` environment variable:
```cmd
set PORT=4000 && npm start
```

## Socket.io Events

- **Connection**: Listen for `connection`.
- **Join Room**: Emit `join_room` with the room name.
- **Send Message**: Emit `send_message` with an object containing `room`, `user`, and `message`.
- **Receive Message**: Listen for `receive_message` to get message updates.

## Project Structure

- `server.js`: Main entry point for the Express and Socket.io server.
- `package.json`: Project configuration and dependencies.
- `.github/workflows/`: CI/CD configuration.
- `README.md`: Setup and usage instructions.
