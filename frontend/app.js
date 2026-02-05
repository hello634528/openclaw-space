// Aura Chat V2 - Client Logic
document.addEventListener('DOMContentLoaded', () => {
    // Internationalization (i18n)
    let currentLang = localStorage.getItem('aura-lang') || 'en';

    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('aura-lang', lang);
        
        // Update all elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        });

        // Update all placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[lang][key]) {
                el.placeholder = translations[lang][key];
            }
        });

        // Update all titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (translations[lang][key]) {
                el.title = translations[lang][key];
            }
        });
    }

    function t(key, ...args) {
        let str = (translations[currentLang] && translations[currentLang][key]) || key;
        args.forEach(arg => {
            str = str.replace('%s', arg);
        });
        return str;
    }

    // Toggle language
    function toggleLanguage() {
        setLanguage(currentLang === 'en' ? 'zh' : 'en');
        // Update room names in UI if they are translated
        if (currentUser) {
            updateRoomDisplay();
        }
    }

    document.getElementById('lang-toggle-login').onclick = toggleLanguage;
    document.getElementById('lang-toggle-app').onclick = toggleLanguage;

    // Initial language setup
    setLanguage(currentLang);

    // Configuration
    const API_URL = window.location.origin.replace(':8080', ':3000').replace(':5173', ':3000');
    
    // DOM Elements
    const loginOverlay = document.getElementById('login-overlay');
    const authForms = document.getElementById('auth-forms');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const appContainer = document.querySelector('.app-container');
    
    // Auth Inputs
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const regUsernameInput = document.getElementById('reg-username-input');
    const regPasswordInput = document.getElementById('reg-password-input');
    
    // Chat Elements
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const roomItems = document.querySelectorAll('.room-item');
    const currentChatName = document.getElementById('current-chat-name');
    const displayName = document.getElementById('display-name');
    const userAvatar = document.getElementById('user-avatar');
    const friendsList = document.getElementById('friends-list');
    
    // Modals
    const qrModal = document.getElementById('qr-modal');
    const addFriendModal = document.getElementById('add-friend-modal');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const tempKeyDisplay = document.getElementById('temp-key-display');
    
    // State
    let socket = null;
    let currentUser = null;
    let currentRoom = 'General';
    let currentDM = null;
    let friends = [];
    let encryptionKeys = {}; // username -> CryptoKey
    
    // --- ENCRYPTION HELPERS ---

    async function deriveKey(sharedSecret) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(sharedSecret),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode('aura-v2-salt'),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async function encryptMessage(text, key) {
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encoder.encode(text)
        );
        return {
            cipher: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            iv: btoa(String.fromCharCode(...iv))
        };
    }

    async function decryptMessage(encryptedData, key) {
        try {
            const { cipher, iv } = encryptedData;
            const decoder = new TextDecoder();
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0))) },
                key,
                new Uint8Array(atob(cipher).split('').map(c => c.charCodeAt(0)))
            );
            return decoder.decode(decrypted);
        } catch (e) {
            return '[Decryption Failed]';
        }
    }


    document.getElementById('show-register').onclick = () => {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    };

    document.getElementById('show-login').onclick = () => {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    };

    document.getElementById('login-btn').onclick = async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) return showToast(t('fill_fields'));

        try {
            const res = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                currentUser = data.user;
                initChat();
            } else {
                showToast(data.error);
            }
        } catch (e) {
            showToast(t('server_fail'));
        }
    };

    document.getElementById('register-btn').onclick = async () => {
        const username = regUsernameInput.value.trim();
        const password = regPasswordInput.value;
        if (!username || !password) return showToast(t('fill_fields'));

        try {
            const res = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                showToast(t('reg_success'));
                document.getElementById('show-login').click();
            } else {
                showToast(data.error);
            }
        } catch (e) {
            showToast(t('reg_fail'));
        }
    };

    // --- CHAT INITIALIZATION ---

    function initChat() {
        loginOverlay.classList.add('hidden');
        appContainer.classList.remove('hidden');
        displayName.textContent = currentUser.username;
        userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();

        socket = io(API_URL);
        
        socket.on('connect', () => {
            socket.emit('authenticate', { username: currentUser.username });
            socket.emit('join_room', currentRoom);
        });

        socket.on('receive_message', async (data) => {
            await appendMessage(data);
        });

        socket.on('room_history', async (history) => {
            messagesContainer.innerHTML = '';
            for (const msg of history) {
                await appendMessage(msg);
            }
        });

        socket.on('friends_list', (list) => {
            friends = list;
            renderFriends();
        });

        socket.on('friend_added', (data) => {
            if (!friends.includes(data.username)) {
                friends.push(data.username);
                renderFriends();
                showToast(`${t('added_friend')} ${data.username}`);
            }
        });

        socket.on('friend_status', (data) => {
            const el = document.querySelector(`[data-friend="${data.username}"]`);
            if (el) {
                el.style.opacity = data.status === 'online' ? '1' : '0.5';
            }
        });
    }

    // --- MESSAGING ---

    sendBtn.onclick = sendMessage;
    messageInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

    async function sendMessage() {
        const text = messageInput.value.trim();
        const imageFile = document.getElementById('image-upload').files[0];
        
        if (!text && !imageFile) return;

        let payload = { text, iv: null };
        
        // If DM, encrypt the text
        if (currentDM) {
            const secret = localStorage.getItem(`secret_${currentDM}`) || 'default-secret';
            const key = await deriveKey(secret);
            const encrypted = await encryptMessage(text, key);
            payload = { cipher: encrypted.cipher, iv: encrypted.iv };
        }

        const messageData = {
            room: currentDM ? null : currentRoom,
            target: currentDM,
            type: currentDM ? 'dm' : 'group',
            message: currentDM ? JSON.stringify(payload) : text,
            image: null
        };

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = () => {
                messageData.image = reader.result;
                socket.emit('send_message', messageData);
            };
            reader.readAsDataURL(imageFile);
        } else {
            socket.emit('send_message', messageData);
        }

        messageInput.value = '';
        messageInput.focus();
        document.getElementById('image-upload').value = '';
    }

    async function appendMessage(data) {
        const isSelf = data.sender === currentUser.username;
        const isDM = data.type === 'dm';
        
        if (currentDM) {
            if (!isDM || (data.sender !== currentDM && !isSelf)) return;
        } else {
            if (isDM || data.room !== currentRoom) return;
        }

        let displayMessage = data.message;
        if (isDM) {
            try {
                const payload = JSON.parse(data.message);
                if (payload.cipher) {
                    const otherParty = isSelf ? currentDM : data.sender;
                    const secret = localStorage.getItem(`secret_${otherParty}`) || 'default-secret';
                    const key = await deriveKey(secret);
                    displayMessage = await decryptMessage(payload, key);
                }
            } catch (e) {
                console.error('Failed to parse/decrypt message', e);
            }
        }

        const msgEl = document.createElement('div');
        msgEl.className = `message-group ${isSelf ? 'self' : 'other'}`;
        const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        msgEl.innerHTML = `
            <div class="message-meta">
                <span class="sender-name">${data.sender}</span> • 
                <span class="timestamp">${time}</span>
                ${isDM ? '<span class="e2ee-tag" title="End-to-End Encrypted">🔒</span>' : ''}
            </div>
            <div class="message-bubble">
                <div class="bubble-content">
                    ${data.image ? `<img src="${data.image}" class="message-image">` : ''}
                    <div class="text-content">${escapeHTML(displayMessage)}</div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(msgEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }


    // --- NAVIGATION ---

    function updateRoomDisplay() {
        if (currentRoom) {
            const roomKey = currentRoom.toLowerCase();
            currentChatName.textContent = `# ${t(roomKey)}`;
        } else if (currentDM) {
            currentChatName.textContent = `@ ${currentDM}`;
        }
    }

    roomItems.forEach(item => {
        item.onclick = () => {
            currentRoom = item.dataset.room;
            currentDM = null;
            updateRoomDisplay();
            roomItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.friend-item').forEach(i => i.classList.remove('active'));
            
            messagesContainer.innerHTML = `<div class="welcome-message"><h3># ${t(currentRoom.toLowerCase())}</h3></div>`;
            socket.emit('join_room', currentRoom);
        };
    });

    function renderFriends() {
        friendsList.innerHTML = '';
        friends.forEach(friend => {
            const el = document.createElement('div');
            el.className = 'room-item friend-item';
            el.dataset.friend = friend;
            el.innerHTML = `👤 ${friend}`;
            el.onclick = () => {
                currentDM = friend;
                currentRoom = null;
                updateRoomDisplay();
                roomItems.forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.friend-item').forEach(i => i.classList.remove('active'));
                el.classList.add('active');
                
                messagesContainer.innerHTML = `<div class="welcome-message"><h3>${t('chat_with', friend)}</h3><p>${t('e2ee_desc')}</p></div>`;
            };
            friendsList.appendChild(el);
        });
    }

    // --- SOCIAL & QR ---

    document.getElementById('show-qr-btn').onclick = () => {
        const tempKey = Math.random().toString(36).substring(2, 10).toUpperCase();
        const qrData = JSON.stringify({ u: currentUser.username, k: tempKey });
        
        qrcodeContainer.innerHTML = '';
        new QRCode(qrcodeContainer, {
            text: qrData,
            width: 200,
            height: 200
        });
        
        tempKeyDisplay.textContent = `${t('username')}: ${currentUser.username} | ${t('temp_key')}: ${tempKey}`;
        qrModal.classList.remove('hidden');
    };

    document.getElementById('add-friend-btn').onclick = () => {
        addFriendModal.classList.remove('hidden');
    };

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => {
            qrModal.classList.add('hidden');
            addFriendModal.classList.add('hidden');
        };
    });

    document.getElementById('confirm-add-friend').onclick = () => {
        const to = document.getElementById('friend-username-input').value.trim();
        const tempKey = document.getElementById('friend-key-input').value.trim();
        
        if (to && tempKey) {
            localStorage.setItem(`secret_${to}`, tempKey);
            socket.emit('add_friend', { from: currentUser.username, to, tempKey });
            addFriendModal.classList.add('hidden');
        }
    };


    // --- UTILS ---

    function showToast(msg) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    function escapeHTML(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
});
