// API Configuration
// Переопределите через window.NEURO_CAFE_API_URL перед загрузкой api.js, если сервер на другом порту
const API_BASE_URL = '/api'

// Helper function for API requests
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('neuro-cafe-token') || sessionStorage.getItem('neuro-cafe-token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        console.log(`API Request: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}`);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        console.log(`API Response:`, data);
        
        if (!response.ok) {
            const err = new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            err.response = data;
            err.status = response.status;
            if (response.status === 401 && (data.message || '').toLowerCase().includes('токен')) {
                localStorage.removeItem('neuro-cafe-token');
                sessionStorage.removeItem('neuro-cafe-token');
                localStorage.removeItem('neuro-cafe-current-user');
                sessionStorage.removeItem('neuro-cafe-current-user');
                if (typeof authManager !== 'undefined' && authManager.logout) authManager.logout();
            }
            throw err;
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', {
            endpoint,
            method: options.method || 'GET',
            error: error.message,
            response: error.response,
            status: error.status
        });
        if (error.message === 'Failed to fetch') {
            console.warn('💡 Сервер не отвечает. Запустите backend: npm start (порт 3000) или npm run start:3001 (другой порт — укажите NEURO_CAFE_API_URL в HTML).');
        }
        throw error;
    }
}

// Auth API
const authAPI = {
    async register(userData) {
        return await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async login(email, password) {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.token) {
            localStorage.setItem('neuro-cafe-token', response.token);
            localStorage.setItem('neuro-cafe-current-user', JSON.stringify(response.user));
        }
        
        return response;
    },

    async getCurrentUser() {
        return await apiRequest('/auth/me');
    },

    async updateProfile(updates) {
        return await apiRequest('/auth/me', {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    },

    logout() {
        localStorage.removeItem('neuro-cafe-token');
        localStorage.removeItem('neuro-cafe-current-user');
        sessionStorage.removeItem('neuro-cafe-token');
        sessionStorage.removeItem('neuro-cafe-current-user');
    }
};

// Cart API
const cartAPI = {
    async getCart() {
        return await apiRequest('/cart');
    },

    async addItem(item) {
        return await apiRequest('/cart/add', {
            method: 'POST',
            body: JSON.stringify(item)
        });
    },

    async updateQuantity(itemId, size, quantity) {
        return await apiRequest(`/cart/update/${itemId}/${size}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity })
        });
    },

    async removeItem(itemId, size) {
        return await apiRequest(`/cart/remove/${itemId}/${size}`, {
            method: 'DELETE'
        });
    },

    async clearCart() {
        return await apiRequest('/cart/clear', {
            method: 'DELETE'
        });
    }
};

// Orders API
const ordersAPI = {
    async createOrder(orderData) {
        return await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    },

    async getOrders() {
        return await apiRequest('/orders');
    },

    async getOrder(id) {
        return await apiRequest(`/orders/${id}`);
    }
};

// Payments API (СБП)
const paymentsAPI = {
    async createSbp(orderId) {
        return await apiRequest('/payments/create-sbp', {
            method: 'POST',
            body: JSON.stringify({ orderId })
        });
    }
};

// Bookings API
const bookingsAPI = {
    async createBooking(bookingData) {
        return await apiRequest('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    },

    async getMyBookings() {
        return await apiRequest('/bookings/my');
    }
};

// Contacts API
const contactsAPI = {
    async sendMessage(contactData) {
        return await apiRequest('/contacts', {
            method: 'POST',
            body: JSON.stringify(contactData)
        });
    }
};

// Newsletter API
const newsletterAPI = {
    async subscribe(email) {
        return await apiRequest('/newsletter/subscribe', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }
};

// Menu API
const menuAPI = {
    async getMenu() {
        return await apiRequest('/menu');
    },

    async getMenuItem(id) {
        return await apiRequest(`/menu/${id}`);
    }
};

// AI API
const aiAPI = {
    async generateCoffee(mood, preferences) {
        return await apiRequest('/ai/generate-coffee', {
            method: 'POST',
            body: JSON.stringify({ mood, preferences })
        });
    }
};

// Export API
window.API = {
    auth: authAPI,
    cart: cartAPI,
    orders: ordersAPI,
    payments: paymentsAPI,
    bookings: bookingsAPI,
    contacts: contactsAPI,
    newsletter: newsletterAPI,
    menu: menuAPI,
    ai: aiAPI
};

