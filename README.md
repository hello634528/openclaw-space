# Aura Chat V3 - Secure & Private Messaging

A minimal, secure messaging system built with Node.js, Express, and Socket.io. Optimized for Windows and local environments.

## V3 Enhancements

1.  **Security Enhancement (JWT)**:
    *   **JWT Auth**: Secure authentication using JSON Web Tokens. Token-based access for both REST API and Socket.io connections.
2.  **Encryption & Transparency**:
    *   **End-to-End Encryption (E2EE)**: Direct Messages (DM) are encrypted using AES-GCM (256-bit). Only the intended recipient can decrypt the message.
    *   **Transparency Note**: While DM content is E2EE, **metadata (who chatted with whom and when) is visible to the server** for routing and history management.
3.  **Advanced Logic**:
    *   **Message Recall**: Users can recall their messages from both DM and public rooms.
    *   **E2EE Indicator**: Clear visual feedback when a conversation is secured.
    *   **Improved Image Handling**: High-quality image sharing with instant preview.
4.  **Engineering & DX**:
    *   **Atomic Write Persistence**: Uses a safe write-and-rename pattern to prevent JSON data corruption during concurrent writes.
    *   **Direct Serving**: The server serves the frontend directly at the root for a unified experience.
5.  **Modern UI**:
    *   **Glassmorphism Style**: A sleek, premium design with blur effects and vibrant gradients.
    *   **Responsive**: Works on desktop and mobile browsers.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server
```bash
npm start
```

### 3. Access Application
Open `http://localhost:3000`.

## Deployment (Windows)

This project is designed to be easily run on Windows. Simply ensure Node.js is installed, clone the repo, and follow the Quick Start steps.

## Security Note

E2EE keys are derived during the "Add Friend" process and stored in your browser's `localStorage`. The server never sees your private messages in plaintext.

---

## License
ISC
