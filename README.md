# Aura Chat V2 - Secure & Private Messaging

A minimal, secure messaging system built with Node.js, Express, and Socket.io. Optimized for Windows and local environments.

## V2 New Features

1.  **Auth & Security**:
    *   **Secure Login**: Password hashing with `bcryptjs`.
    *   **End-to-End Encryption (E2EE)**: Direct Messages (DM) are encrypted using AES-GCM (256-bit). Only the intended recipient can decrypt the message.
2.  **Persistence**:
    *   All chat history, users, and social data are stored in local JSON files (`data/*.json`), ensuring persistence without a complex database setup.
3.  **Communication Modes**:
    *   **Group Rooms**: Public channels for community chat.
    *   **Direct Messaging (DM)**: Private, encrypted 1-on-1 conversations.
4.  **Social Features**:
    *   **Friend System**: Add friends using "Temporary Keys" and "QR Codes".
    *   **QR Code Support**: Generate and scan QR codes for secure friend adding.
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
Open `http://localhost:3000` (or your configured port).

## Deployment (Windows)

This project is designed to be easily run on Windows. Simply ensure Node.js is installed, clone the repo, and follow the Quick Start steps.

## Security Note

E2EE keys are derived during the "Add Friend" process and stored in your browser's `localStorage`. The server never sees your private messages in plaintext.

---

## License
ISC
