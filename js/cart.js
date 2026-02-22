// Cart Management System for НейроКофейня

class CartManager {
    constructor() {
        this.cart = [];
        this.init();
    }

    async init() {
        await this.loadCart();
        this.setupEventListeners();
        this.updateCartUI();
    }

    // Load cart from API
    async loadCart() {
        const currentUser = this.getCurrentUser();
        if (currentUser && window.API) {
            try {
                const response = await window.API.cart.getCart();
                if (response.success && response.cart) {
                    this.cart = response.cart.items || [];
                    
                    // If cart is empty in DB but has items in localStorage, sync them
                    if (this.cart.length === 0) {
                        const cartKey = `neuro-cafe-cart-${currentUser.id}`;
                        const localCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
                        
                        if (localCart.length > 0) {
                            console.log('Syncing localStorage cart to DB...');
                            // Sync each item from localStorage to DB
                            for (const item of localCart) {
                                try {
                                    await window.API.cart.addItem(item);
                                } catch (err) {
                                    console.error('Error syncing item:', err);
                                }
                            }
                            // Reload cart after sync
                            const syncResponse = await window.API.cart.getCart();
                            if (syncResponse.success && syncResponse.cart) {
                                this.cart = syncResponse.cart.items || [];
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading cart:', error);
                // Fallback to localStorage if API fails
                const cartKey = `neuro-cafe-cart-${currentUser.id}`;
                this.cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
            }
        } else {
            // Fallback to localStorage
            const currentUser = this.getCurrentUser();
            if (currentUser) {
                const cartKey = `neuro-cafe-cart-${currentUser.id}`;
                this.cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
            }
        }
        this.updateCartUI();
    }

    // Save cart to API
    async saveCart() {
        // Cart is saved automatically via API calls
        // This method is kept for compatibility
    }

    // Get current user
    getCurrentUser() {
        const token = localStorage.getItem('neuro-cafe-token') || sessionStorage.getItem('neuro-cafe-token');
        if (!token) return null;
        
        const userStr = localStorage.getItem('neuro-cafe-current-user') || sessionStorage.getItem('neuro-cafe-current-user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    // Add item to cart
    async addItem(item) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            showToast('Пожалуйста, войдите в аккаунт, чтобы добавить товар в корзину.', 'warning');
            window.location.href = 'login.html';
            return;
        }

        // Normalize item data - convert 'id' to 'itemId' if needed
        const normalizedItem = {
            itemId: item.itemId || item.id,
            name: item.name,
            price: parseFloat(item.price) || 0,
            size: item.size,
            image: item.image,
            quantity: parseInt(item.quantity) || 1
        };

        if (window.API) {
            try {
                const response = await window.API.cart.addItem(normalizedItem);
                if (response.success && response.cart) {
                    this.cart = response.cart.items || [];
                    this.updateCartUI();
                    this.showNotification('Товар добавлен в корзину');
                } else {
                    throw new Error(response.message || 'Ошибка добавления товара');
                }
            } catch (error) {
                console.error('Error adding to cart via API:', error);
                showToast('Ошибка при добавлении товара: ' + (error.message || 'Попробуйте ещё раз.'), 'error');
            }
        }
    }

    // Remove item from cart
    async removeItem(itemId, size) {
        const currentUser = this.getCurrentUser();
        if (window.API && currentUser) {
            try {
                const response = await window.API.cart.removeItem(itemId, size);
                if (response.success) {
                    this.cart = response.cart.items || [];
                    this.updateCartUI();
                    this.showNotification('Товар удален из корзины');
                }
            } catch (error) {
                console.error('Error removing from cart:', error);
                // Fallback to localStorage
                this.cart = this.cart.filter(item => !(item.itemId === itemId && item.size === size));
                const cartKey = `neuro-cafe-cart-${currentUser.id}`;
                localStorage.setItem(cartKey, JSON.stringify(this.cart));
                this.updateCartUI();
                this.showNotification('Товар удален из корзины');
            }
        } else {
            // Fallback to localStorage
            this.cart = this.cart.filter(item => !(item.itemId === itemId && item.size === size));
            if (currentUser) {
                const cartKey = `neuro-cafe-cart-${currentUser.id}`;
                localStorage.setItem(cartKey, JSON.stringify(this.cart));
            }
            this.updateCartUI();
            this.showNotification('Товар удален из корзины');
        }
    }

    // Update item quantity
    async updateQuantity(itemId, size, change) {
        const item = this.cart.find(cartItem => 
            (cartItem.itemId || cartItem.id) === itemId && cartItem.size === size
        );

        if (item) {
            const newQuantity = item.quantity + change;
            if (newQuantity <= 0) {
                await this.removeItem(itemId, size);
            } else {
                const currentUser = this.getCurrentUser();
                if (window.API && currentUser) {
                    try {
                        const response = await window.API.cart.updateQuantity(itemId, size, newQuantity);
                        if (response.success) {
                            this.cart = response.cart.items || [];
                            this.updateCartUI();
                        }
                    } catch (error) {
                        console.error('Error updating quantity:', error);
                        // Fallback to localStorage
                        item.quantity = newQuantity;
                        if (currentUser) {
                            const cartKey = `neuro-cafe-cart-${currentUser.id}`;
                            localStorage.setItem(cartKey, JSON.stringify(this.cart));
                        }
                        this.updateCartUI();
                    }
                } else {
                    // Fallback to localStorage
                    item.quantity = newQuantity;
                    if (currentUser) {
                        const cartKey = `neuro-cafe-cart-${currentUser.id}`;
                        localStorage.setItem(cartKey, JSON.stringify(this.cart));
                    }
                    this.updateCartUI();
                }
            }
        }
    }

    // Get total price
    getTotalPrice() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Get total items count
    getTotalItems() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    // Get item ID (support both itemId and id)
    getItemId(item) {
        return item.itemId || item.id;
    }

    // Clear cart
    async clearCart() {
        const currentUser = this.getCurrentUser();
        if (window.API && currentUser) {
            try {
                const response = await window.API.cart.clearCart();
                if (response.success) {
                    this.cart = [];
                    this.updateCartUI();
                }
            } catch (error) {
                console.error('Error clearing cart:', error);
                // Fallback to localStorage
                this.cart = [];
                if (currentUser) {
                    const cartKey = `neuro-cafe-cart-${currentUser.id}`;
                    localStorage.setItem(cartKey, JSON.stringify(this.cart));
                }
                this.updateCartUI();
            }
        } else {
            // Fallback to localStorage
            this.cart = [];
            if (currentUser) {
                const cartKey = `neuro-cafe-cart-${currentUser.id}`;
                localStorage.setItem(cartKey, JSON.stringify(this.cart));
            }
            this.updateCartUI();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Cart button
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn) {
            cartBtn.addEventListener('click', () => this.toggleCart());
        }

        // Close cart button
        const closeCart = document.getElementById('closeCart');
        if (closeCart) {
            closeCart.addEventListener('click', () => this.toggleCart());
        }

        // Cart overlay
        const cartOverlay = document.getElementById('cartOverlay');
        if (cartOverlay) {
            cartOverlay.addEventListener('click', () => this.toggleCart());
        }

        // Checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.showCheckoutForm());
        }
        this.ensureCheckoutForm();
    }

    ensureCheckoutForm() {
        if (document.getElementById('checkoutFormWrap')) return;
        const footer = document.querySelector('.cart-footer');
        const btn = document.getElementById('checkoutBtn');
        if (!footer || !btn) return;

        const wrap = document.createElement('div');
        wrap.id = 'checkoutFormWrap';
        wrap.style.display = 'none';
        wrap.className = 'checkout-form-wrap';
        wrap.innerHTML = `
            <form id="checkoutForm" class="checkout-form">
                <label class="checkout-label">Получение</label>
                <div class="checkout-radios">
                    <label><input type="radio" name="deliveryType" value="self_pickup" checked> Самовывоз</label>
                    <label><input type="radio" name="deliveryType" value="delivery"> Доставка</label>
                </div>
                <div id="deliveryAddressBlock" style="display:none">
                    <label class="checkout-label">Адрес доставки *</label>
                    <input type="text" id="checkoutAddress" placeholder="Город, улица, дом, квартира" class="checkout-input" minlength="5">
                </div>
                <label class="checkout-label">Телефон *</label>
                <input type="tel" id="checkoutPhone" required class="checkout-input" placeholder="+7 (999) 123-45-67" pattern="[0-9+()-\\s]*" minlength="11">
                <label class="checkout-label">Комментарий</label>
                <input type="text" id="checkoutNotes" class="checkout-input" placeholder="Пожелания к заказу" maxlength="200">
                <div id="bonusBlock" class="checkout-bonus-block" style="display:none">
                    <label class="checkout-bonus-label">
                        <input type="checkbox" id="useBonusPoints">
                        <span>Использовать бонусы: <strong id="bonusAvailable">0</strong> ₽ (скидка до 50%)</span>
                    </label>
                    <div id="bonusDiscount" class="bonus-discount-info" style="display:none; margin-top: 8px; font-size: 0.85rem; color: #22c55e;"></div>
                </div>
                <div class="checkout-form-btns">
                    <button type="submit" class="checkout-btn checkout-btn-sbp"><i class="fas fa-qrcode"></i> Оплатить СБП</button>
                    <button type="button" class="checkout-btn checkout-btn-cancel" id="checkoutCancel">Отмена</button>
                </div>
            </form>
        `;
        footer.insertBefore(wrap, btn);

        const form = document.getElementById('checkoutForm');
        const cancelBtn = document.getElementById('checkoutCancel');
        const radios = form.querySelectorAll('input[name="deliveryType"]');
        const addressBlock = document.getElementById('deliveryAddressBlock');
        const addressInput = document.getElementById('checkoutAddress');

        radios.forEach(r => {
            r.addEventListener('change', () => {
                addressBlock.style.display = r.value === 'delivery' ? 'block' : 'none';
                if (r.value !== 'delivery') {
                    addressInput.removeAttribute('required');
                    addressInput.value = '';
                } else {
                    addressInput.setAttribute('required', 'required');
                }
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Validate delivery address if needed
            const selectedDelivery = form.querySelector('input[name="deliveryType"]:checked').value;
            if (selectedDelivery === 'delivery' && !addressInput.value.trim()) {
                showToast('Пожалуйста, укажите адрес доставки.', 'error');
                return;
            }
            
            // Validate phone
            const phone = document.getElementById('checkoutPhone').value.trim();
            if (!phone || phone.length < 11) {
                showToast('Пожалуйста, укажите корректный номер телефона.', 'error');
                return;
            }
            
            this.checkout();
        });
        cancelBtn.addEventListener('click', () => this.hideCheckoutForm());
    }

    async showCheckoutForm() {
        if (this.cart.length === 0 || !this.getCurrentUser()) return;
        const wrap = document.getElementById('checkoutFormWrap');
        const btn = document.getElementById('checkoutBtn');
        if (!wrap || !btn) return;
        const user = this.getCurrentUser();
        document.getElementById('checkoutPhone').value = user.phone || '';
        document.getElementById('checkoutNotes').value = '';
        document.getElementById('checkoutAddress').value = '';
        const delivery = wrap.querySelector('input[name="deliveryType"][value="delivery"]');
        if (delivery) delivery.checked = false;
        wrap.querySelector('input[name="deliveryType"][value="self_pickup"]').checked = true;
        document.getElementById('deliveryAddressBlock').style.display = 'none';
        document.getElementById('checkoutAddress').removeAttribute('required');
        wrap.style.display = 'block';
        btn.style.display = 'none';

        // Load bonus points and calculate discount
        try {
            if (window.API && window.API.bonus) {
                const bonusRes = await window.API.bonus.getHistory();
                const balance = bonusRes.balance || 0;
                const bonusBlock = document.getElementById('bonusBlock');
                const bonusAvail = document.getElementById('bonusAvailable');
                
                if (bonusBlock) {
                    if (balance > 0) {
                        bonusBlock.style.display = 'block';
                        bonusAvail.textContent = balance;
                        
                        const checkbox = document.getElementById('useBonusPoints');
                        const discountInfo = document.getElementById('bonusDiscount');
                        
                        // Remove old event listeners and add new one
                        checkbox.checked = false;
                        discountInfo.style.display = 'none';
                        
                        checkbox.removeEventListener('change', checkbox._changeHandler);
                        checkbox._changeHandler = (e) => {
                            if (e.target.checked) {
                                const subtotal = this.getTotalPrice();
                                const maxDiscount = Math.floor(subtotal * 0.5);
                                const discount = Math.min(balance, maxDiscount);
                                discountInfo.style.display = 'block';
                                discountInfo.textContent = `Скидка: -${discount} ₽ | Итого: ${(subtotal - discount).toFixed(2)} ₽`;
                            } else {
                                discountInfo.style.display = 'none';
                            }
                        };
                        checkbox.addEventListener('change', checkbox._changeHandler);
                    } else {
                        bonusBlock.style.display = 'none';
                    }
                }
            }
        } catch (e) {
            console.warn('Could not load bonus points:', e);
            const bonusBlock = document.getElementById('bonusBlock');
            if (bonusBlock) bonusBlock.style.display = 'none';
        }
    }

    hideCheckoutForm() {
        const wrap = document.getElementById('checkoutFormWrap');
        const btn = document.getElementById('checkoutBtn');
        if (wrap) wrap.style.display = 'none';
        if (btn) btn.style.display = '';
    }

    // Toggle cart sidebar
    toggleCart() {
        const cartSidebar = document.getElementById('cartSidebar');
        const cartOverlay = document.getElementById('cartOverlay');
        
        if (cartSidebar && cartOverlay) {
            cartSidebar.classList.toggle('active');
            cartOverlay.classList.toggle('active');
        }
    }

    // Update cart UI
    updateCartUI() {
        this.updateCartCount();
        this.updateCartItems();
        this.updateCartTotal();
    }

    // Update cart count badge
    updateCartCount() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            const count = this.getTotalItems();
            cartCount.textContent = count;
            cartCount.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // Update cart items display
    updateCartItems() {
        const cartItems = document.getElementById('cartItems');
        if (!cartItems) return;

        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Ваша корзина пуста</p>
                </div>
            `;
            return;
        }

        cartItems.innerHTML = this.cart.map(item => {
            const itemId = this.getItemId(item);
            return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-size">${item.size}</div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn" onclick="cartManager.updateQuantity(${itemId}, '${item.size}', -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="cartManager.updateQuantity(${itemId}, '${item.size}', 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="cart-item-price">${item.price * item.quantity}₽</div>
                <button class="remove-item-btn" onclick="cartManager.removeItem(${itemId}, '${item.size}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        }).join('');
    }

    // Update cart total
    updateCartTotal() {
        const totalPrice = document.getElementById('totalPrice');
        const checkoutBtn = document.getElementById('checkoutBtn');
        const formWrap = document.getElementById('checkoutFormWrap');
        if (this.cart.length === 0 && formWrap && formWrap.style.display !== 'none') {
            this.hideCheckoutForm();
        }
        if (totalPrice) {
            totalPrice.textContent = `${this.getTotalPrice()} ₽`;
        }
        if (checkoutBtn) {
            checkoutBtn.disabled = this.cart.length === 0;
            checkoutBtn.style.display = '';
        }
    }

    async checkout() {
        if (this.cart.length === 0) {
            showToast('Корзина пуста', 'warning');
            return;
        }

        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            showToast('Пожалуйста, войдите в аккаунт.', 'warning');
            window.location.href = 'login.html';
            return;
        }

        // Get checkout form values
        const checkoutForm = document.getElementById('checkoutForm');
        if (!checkoutForm) {
            showToast('Форма оформления не найдена. Попробуйте ещё раз.', 'error');
            return;
        }

        const deliveryRadio = checkoutForm.querySelector('input[name="deliveryType"]:checked');
        const phoneInput = document.getElementById('checkoutPhone');
        const notesInput = document.getElementById('checkoutNotes');
        const addressInput = document.getElementById('checkoutAddress');
        const bonusCheckbox = document.getElementById('useBonusPoints');

        const deliveryType = deliveryRadio ? deliveryRadio.value : 'self_pickup';
        const phone = (phoneInput && phoneInput.value ? phoneInput.value.trim() : '') || currentUser.phone || 'Не указан';
        const address = deliveryType === 'delivery' ? (addressInput && addressInput.value ? addressInput.value.trim() : '') : 'Самовывоз';
        const notes = (notesInput && notesInput.value ? notesInput.value.trim() : '') || '';

        // Validate delivery address if delivery type is selected
        if (deliveryType === 'delivery' && !address) {
            showToast('Пожалуйста, укажите адрес доставки.', 'error');
            return;
        }

        // Validate phone
        if (!phone || phone === 'Не указан') {
            showToast('Пожалуйста, укажите номер телефона.', 'error');
            return;
        }

        const orderData = {
            deliveryType: deliveryType,
            deliveryAddress: address,
            phone: phone,
            notes: notes || null,
            recipe: null,
            useBonusPoints: bonusCheckbox ? bonusCheckbox.checked : false
        };

        // Check if there's a generated recipe for AI coffee
        let recipe = null;
        const neuroCoffeeItem = this.cart.find(item => 
            item.itemId === 5 || item.itemId === 7 || item.name?.toLowerCase().includes('нейро-кофе') || item.name?.toLowerCase().includes('ваш нейро')
        );
        
        if (!window.generatedRecipe) {
            const savedRecipe = localStorage.getItem('neuro-cafe-generated-recipe');
            if (savedRecipe) {
                try {
                    window.generatedRecipe = JSON.parse(savedRecipe);
                } catch (e) {
                    console.error('Error loading saved recipe:', e);
                }
            }
        }
        
        if (window.generatedRecipe && neuroCoffeeItem) {
            recipe = window.generatedRecipe;
            orderData.recipe = JSON.stringify(recipe);
        }

        // Disable button during submission
        const btn = checkoutForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Обработка...';

        try {
            if (!window.API || !window.API.orders) {
                throw new Error('Сервис недоступен. Попробуйте обновить страницу.');
            }

            // Create order
            const orderResponse = await window.API.orders.createOrder(orderData);
            if (!orderResponse.success) {
                throw new Error(orderResponse.message || 'Не удалось создать заказ');
            }

            const orderId = orderResponse.order.id || orderResponse.order._id;
            if (!orderId) {
                throw new Error('Не удалось получить ID заказа');
            }

            // Create payment
            if (!window.API.payments) {
                throw new Error('Сервис платежей недоступен');
            }

            const paymentResponse = await window.API.payments.createSbp(orderId);
            if (!paymentResponse.success || !paymentResponse.paymentUrl) {
                throw new Error(paymentResponse.message || 'Не удалось создать платеж СБП. Попробуйте позже.');
            }

            // Clear recipe after successful order
            if (recipe) {
                window.generatedRecipe = null;
                localStorage.removeItem('neuro-cafe-generated-recipe');
            }

            this.hideCheckoutForm();
            this.toggleCart();
            
            // Redirect to payment
            window.location.href = paymentResponse.paymentUrl;
        } catch (error) {
            console.error('Checkout error:', error);
            const errorMsg = error.message || 'Ошибка при оформлении заказа. Попробуйте ещё раз.';
            showToast(errorMsg, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    // Show notification
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
}

// Initialize cart manager
let cartManager;

document.addEventListener('DOMContentLoaded', async function() {
    cartManager = new CartManager();
    window.cartManager = cartManager;
    // Reload cart after a short delay to ensure API is loaded
    setTimeout(async () => {
        if (cartManager) {
            await cartManager.loadCart();
            cartManager.updateCartUI();
        }
    }, 500);
});

// Add notification styles
const cartNotificationStyles = document.createElement('style');
cartNotificationStyles.textContent = `
    .cart-notification {
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(45deg, #ba97869c, #a09995a9);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    }

    .cart-notification.show {
        opacity: 1;
        transform: translateX(0);
    }

    .checkout-form-wrap { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); }
    .checkout-form { display: flex; flex-direction: column; gap: 10px; }
    .checkout-label { font-size: 0.9rem; opacity: 0.9; }
    .checkout-radios { display: flex; gap: 16px; }
    .checkout-radios label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .checkout-input { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.08); color: inherit; }
    .checkout-form-btns { display: flex; gap: 10px; margin-top: 8px; }
    .checkout-btn-sbp { flex: 1; }
    .checkout-btn-cancel { background: rgba(255,255,255,0.15); }
`;

document.head.appendChild(cartNotificationStyles);

