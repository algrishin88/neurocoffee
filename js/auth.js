// Authentication Management System for НейроКофейня

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.updateUI();
        this.setupEventListeners();
    }

    // Load current user from storage
    loadCurrentUser() {
        this.currentUser = JSON.parse(localStorage.getItem('neuro-cafe-current-user') || sessionStorage.getItem('neuro-cafe-current-user') || null);
    }

    // Update UI based on auth status
    updateUI() {
        const authButtons = document.querySelector('.auth-buttons');
        if (!authButtons) return;

        if (this.currentUser) {
            // User is logged in
            authButtons.innerHTML = `
                <div class="user-menu">
                    <button class="user-btn" onclick="authManager.toggleUserMenu()">
                        <i class="fas fa-user"></i>
                        ${this.currentUser.firstName}
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-dropdown" id="user-dropdown">
                        <a href="profile.html"><i class="fas fa-user-circle"></i> Профиль</a>
                        <a href="orders.html"><i class="fas fa-shopping-bag"></i> Мои заказы</a>
                        <a href="favorites.html"><i class="fas fa-heart"></i> Избранное</a>
                        <a href="#" onclick="authManager.logout()"><i class="fas fa-sign-out-alt"></i> Выйти</a>
                    </div>
                </div>
            `;
        } else {
            // User is not logged in
            authButtons.innerHTML = `
                <a href="login.html" class="btn btn-secondary">Войти</a>
                <a href="register.html" class="btn btn-primary">Регистрация</a>
            `;
        }
    }

    // Toggle user dropdown menu
    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    // Login user
    login(email, password, remember = false) {
        return new Promise((resolve, reject) => {
            // Simulate API call
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('neuro-cafe-users') || '[]');
                const user = users.find(u => u.email === email && u.password === password);
                
                if (user) {
                    this.currentUser = user;
                    
                    // Save user session
                    if (remember) {
                        localStorage.setItem('neuro-cafe-current-user', JSON.stringify(user));
                    } else {
                        sessionStorage.setItem('neuro-cafe-current-user', JSON.stringify(user));
                    }
                    
                    this.updateUI();
                    resolve(user);
                } else {
                    reject(new Error('Неверный email или пароль'));
                }
            }, 1000);
        });
    }

    // Register new user
    register(userData) {
        return new Promise((resolve, reject) => {
            // Simulate API call
            setTimeout(() => {
                try {
                    const users = JSON.parse(localStorage.getItem('neuro-cafe-users') || '[]');
                    
                    // Check if user already exists
                    if (users.find(u => u.email === userData.email)) {
                        reject(new Error('Пользователь с таким email уже существует'));
                        return;
                    }
                    
                    // Create new user
                    const newUser = {
                        id: Date.now(),
                        ...userData,
                        createdAt: new Date().toISOString()
                    };
                    
                    // Add user to storage
                    users.push(newUser);
                    localStorage.setItem('neuro-cafe-users', JSON.stringify(users));
                    
                    resolve(newUser);
                } catch (error) {
                    reject(new Error('Ошибка при создании аккаунта'));
                }
            }, 1000);
        });
    }

    // Logout user
    logout() {
        this.currentUser = null;
        localStorage.removeItem('neuro-cafe-current-user');
        sessionStorage.removeItem('neuro-cafe-current-user');
        this.updateUI();
        
        // Redirect to main page
        if (window.location.pathname.includes('profile') || 
            window.location.pathname.includes('orders') || 
            window.location.pathname.includes('favorites')) {
            window.location.href = 'index.html';
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Update user profile
    updateProfile(updates) {
        return new Promise((resolve, reject) => {
            if (!this.currentUser) {
                reject(new Error('Пользователь не авторизован'));
                return;
            }
            
            try {
                // Update current user
                this.currentUser = { ...this.currentUser, ...updates };
                
                // Update in storage
                const users = JSON.parse(localStorage.getItem('neuro-cafe-users') || '[]');
                const userIndex = users.findIndex(u => u.id === this.currentUser.id);
                
                if (userIndex !== -1) {
                    users[userIndex] = this.currentUser;
                    localStorage.setItem('neuro-cafe-users', JSON.stringify(users));
                    
                    // Update session storage
                    if (sessionStorage.getItem('neuro-cafe-current-user')) {
                        sessionStorage.setItem('neuro-cafe-current-user', JSON.stringify(this.currentUser));
                    }
                    if (localStorage.getItem('neuro-cafe-current-user')) {
                        localStorage.setItem('neuro-cafe-current-user', JSON.stringify(this.currentUser));
                    }
                    
                    resolve(this.currentUser);
                } else {
                    reject(new Error('Пользователь не найден'));
                }
            } catch (error) {
                reject(new Error('Ошибка при обновлении профиля'));
            }
        });
    }

    // Setup event listeners
    setupEventListeners() {
        // Close user dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const userMenu = document.querySelector('.user-menu');
            if (userMenu && !userMenu.contains(e.target)) {
                const dropdown = document.getElementById('user-dropdown');
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
            }
        });
    }
}

// Initialize auth manager
let authManager;

document.addEventListener('DOMContentLoaded', function() {
    authManager = new AuthManager();
});

// Global auth functions
window.authManager = authManager;

// Utility functions
function showAuthMessage(message, type = 'info') {
    const messageContainer = document.createElement('div');
    messageContainer.className = `auth-message ${type}`;
    messageContainer.textContent = message;
    
    document.body.appendChild(messageContainer);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageContainer.parentNode) {
            messageContainer.parentNode.removeChild(messageContainer);
        }
    }, 5000);
}

// Auth message styles
const authMessageStyles = document.createElement('style');
authMessageStyles.textContent = `
    .auth-message {
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    }
    
    .auth-message.success {
        background: linear-gradient(45deg, #4ecdc4, #44a08d);
    }
    
    .auth-message.error {
        background: linear-gradient(45deg, #ff6b6b, #ee5a52);
    }
    
    .auth-message.info {
        background: linear-gradient(45deg, #45b7d1, #3a8bb8);
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .user-menu {
        position: relative;
    }
    
    .user-btn {
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 25px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
    }
    
    .user-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: rgba(15, 15, 35, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 15px;
        padding: 1rem 0;
        min-width: 200px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.3s ease;
    }
    
    .user-dropdown.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
    
    .user-dropdown a {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.5rem;
        color: white;
        text-decoration: none;
        transition: all 0.3s ease;
    }
    
    .user-dropdown a:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #4ecdc4;
    }
    
    .user-dropdown a i {
        width: 16px;
        text-align: center;
    }
`;

document.head.appendChild(authMessageStyles); 