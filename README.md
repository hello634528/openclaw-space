# Chat Backend

A robust Node.js backend for real-time messaging using Express and Socket.io. Designed to be Windows-compatible and easy to set up.

## Features

- **Real-time Messaging**: Powered by Socket.io.
- **Image Support**: Send and receive images via base64 strings.
- **Message Recall**: Users can recall their messages within a 2-minute window.
- **Enhanced User Profiles**: Support for nicknames and custom avatars.
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

### Client to Server
- **set_user_info**: Emit with `{ nickname, avatar }` to set user details.
- **join_room**: Emit with the room name (string).
- **send_message**: Emit with `{ room, message, image }`.
- **message_recall**: Emit with `{ msgId }` to recall a previously sent message.

### Server to Client
- **receive_message**: Listen for `{ id, room, user, avatar, message, image, timestamp }`.
- **message_recalled**: Listen for `{ msgId }` to remove a message from the UI.
- **error**: Listen for error messages.

## Frontend (Aura Chat)

A stunning minimalist frontend is located in the `/frontend` directory.

### Setup Instructions

1. **Navigate to Frontend**:
   ```bash
   cd frontend
   ```
2. **Serve the app**:
   You can use any static server. For example, using `npx`:
   ```bash
   npx serve .
   ```
   Or simply open `index.html` in your browser.

### Features
- Glassmorphism UI
- Real-time room switching
- Image uploads
- Message recall integration

---

## Project Structure

- `server.js`: Main entry point for the Express and Socket.io server.
- `package.json`: Project configuration and dependencies.
- `.github/workflows/`: CI/CD configuration.
- `README.md`: English documentation.
- `README_CN.md`: Chinese documentation.
