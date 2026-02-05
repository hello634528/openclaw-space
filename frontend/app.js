// Aura Chat Client
document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' 
        : `https://${window.location.hostname.replace('-8080', '-3000')}`; // Heuristic for codespaces

    // DOM Elements
    const loginOverlay = document.getElementById('login-overlay');
    const nicknameInput = document.getElementById('nickname-input');
    const joinBtn = document.getElementById('join-btn');
    const appContainer = document.querySelector('.app-container');
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const roomItems = document.querySelectorAll('.room-item');
    const currentRoomName = document.getElementById('current-room-name');
    const displayName = document.getElementById('display-name');
    const userAvatar = document.getElementById('user-avatar');
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const cancelImageBtn = document.getElementById('cancel-image');
    const toastContainer = document.getElementById('toast-container');

    // State
    let socket = null;
    let currentUser = {
        nickname: '',
        room: 'General',
        id: ''
    };
    let pendingImage = null;

    // Initialization
    nicknameInput.focus();

    // Event Listeners
    joinBtn.addEventListener('click', joinChat);
    nicknameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinChat();
    });

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    roomItems.forEach(item => {
        item.addEventListener('click', () => {
            const room = item.getAttribute('data-room');
            switchRoom(room);
            
            // UI Update
            roomItems.forEach(ri => ri.classList.remove('active'));
            item.classList.add('active');
        });
    });

    imageUpload.addEventListener('change', handleImageSelect);
    cancelImageBtn.addEventListener('click', clearImagePreview);

    // Functions
    function joinChat() {
        const nickname = nicknameInput.value.trim();
        if (!nickname) {
            showToast('Please enter a nickname');
            return;
        }

        currentUser.nickname = nickname;
        displayName.textContent = nickname;
        userAvatar.textContent = nickname.charAt(0).toUpperCase();

        // Connect to Socket.io
        // In local environment or codespaces, we might need to adjust the port
        const socketOptions = {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5
        };

        // Try to connect to port 3000 (backend)
        const backendUrl = window.location.origin.replace(':8080', ':3000').replace(':5173', ':3000');
        socket = io(backendUrl, socketOptions);

        socket.on('connect', () => {
            currentUser.id = socket.id;
            console.log('Connected to chat server');
            
            socket.emit('set_user_info', { 
                nickname: currentUser.nickname 
            });
            
            socket.emit('join_room', currentUser.room);
            
            loginOverlay.classList.add('hidden');
            showToast(`Welcome, ${nickname}!`);
        });

        socket.on('receive_message', (data) => {
            appendMessage(data);
        });

        socket.on('message_recalled', (data) => {
            handleRecallUI(data.msgId);
        });

        socket.on('error', (data) => {
            showToast(data.message);
        });

        socket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            showToast('Failed to connect to server. Ensure backend is running.');
        });
    }

    function switchRoom(newRoom) {
        if (newRoom === currentUser.room) return;
        
        socket.emit('join_room', newRoom);
        currentUser.room = newRoom;
        currentRoomName.textContent = `# ${newRoom.toLowerCase()}`;
        
        // Clear messages for the new room view (or fetch history if backend supported it)
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h3>Beginning of #${newRoom.toLowerCase()}</h3>
                <p>Messages in this room are real-time.</p>
            </div>
        `;
    }

    function handleImageSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            pendingImage = event.target.result;
            previewImg.src = pendingImage;
            imagePreview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    function clearImagePreview() {
        pendingImage = null;
        previewImg.src = '';
        imagePreview.style.display = 'none';
        imageUpload.value = '';
    }

    function sendMessage() {
        const text = messageInput.value.trim();
        
        if (!text && !pendingImage) return;

        const messageData = {
            room: currentUser.room,
            user: currentUser.nickname,
            message: text,
            image: pendingImage
        };

        socket.emit('send_message', messageData);
        
        // Clear inputs
        messageInput.value = '';
        clearImagePreview();
        messageInput.focus();
    }

    function appendMessage(data) {
        const isSelf = data.senderId === socket.id;
        const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const messageGroup = document.createElement('div');
        messageGroup.className = `message-group ${isSelf ? 'self' : 'other'}`;
        messageGroup.id = `msg-${data.id}`;

        let contentHtml = '';
        if (data.image) {
            contentHtml += `<img src="${data.image}" class="message-image" onclick="window.open('${data.image}')">`;
        }
        if (data.message) {
            contentHtml += `<div class="text-content">${escapeHTML(data.message)}</div>`;
        }

        messageGroup.innerHTML = `
            <div class="message-meta">
                ${isSelf ? '' : `<span class="sender-name">${data.user}</span> • `}
                <span class="timestamp">${time}</span>
            </div>
            <div class="message-bubble">
                ${isSelf ? `<button class="recall-btn" onclick="recallMessage('${data.id}')" title="Recall message">×</button>` : ''}
                <div class="bubble-content">
                    ${contentHtml}
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageGroup);
        scrollToBottom();
    }

    function handleRecallUI(msgId) {
        const msgEl = document.getElementById(`msg-${msgId}`);
        if (msgEl) {
            const bubbleContent = msgEl.querySelector('.bubble-content');
            bubbleContent.innerHTML = '<span class="recalled-text">Message recalled</span>';
            const recallBtn = msgEl.querySelector('.recall-btn');
            if (recallBtn) recallBtn.remove();
        }
    }

    // Global function for the recall button
    window.recallMessage = (msgId) => {
        socket.emit('message_recall', { msgId });
    };

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function escapeHTML(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
});
