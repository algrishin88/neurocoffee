<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Меню - НейроКофейня</title>
    <link rel="icon" href="images/logo.ico.ico" type="image/x-icon">
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/theme-toggle.css">

    <link rel="stylesheet" href="css/animate.css">
    <link rel="stylesheet" href="css/animations.css">
    <link rel="stylesheet" href="menu.css">
    <script src="register-login.js"></script>
    <link href="/snowFlakes/snow.min.css" rel="stylesheet">
</head>
<body>
    <script src="/snowFlakes/Snow.js"></script>
<script>
	new Snow ();
</script>
    <!-- Header -->
    <header>
        <button id="sidebarToggle">☰</button>
        <div class="nav-container">
            <div class="logo">НейроКофейня</div>
            <nav class="nav-logo">
                <ul class="nav-menu">
                    <li><a href="index.php">Главная</a></li>
                    <li><a href="menubeta.php" class="active">Меню</a></li>
                    <li><a href="services.php">О нас</a></li>
                    <li><a href="contact.php">Контакты</a></li>
                </ul>
            </nav>
            <div class="header-right">
                <div class="cart-icon-container" id="cartIconContainer" style="display: none;">
                    <button class="cart-btn" id="cartBtn">
                        <i class="fas fa-shopping-cart"></i>
                        <span class="cart-count" id="cartCount">0</span>
                    </button>
                </div>
                <div class="auth-buttons">
                    <a href="login.php" class="btn btn-secondary">Войти</a>
                    <a href="register.php" class="btn btn-primary">Регистрация</a>
                </div>
            </div>
            <div class="sidebar">
                <div class="sidebar-brand">НейроКофейня</div>
                <ul>
                    <li><a href="index.php"><i class="fas fa-home"></i> Главная</a></li>
                    <li><a href="menubeta.php"><i class="fas fa-coffee"></i> Меню</a></li>
                    <li><a href="services.php"><i class="fas fa-info-circle"></i> О нас</a></li>
                    <li><a href="contact.php"><i class="fas fa-envelope"></i> Контакты</a></li>
                    <li><a href="profile.php"><i class="fas fa-user"></i> Профиль</a></li>
                </ul>
                <div class="sidebar-social">
                    <a href="https://t.me/+cmzsuwMsLSY3ZmZi" target="_blank" rel="noopener"><i class="fab fa-telegram"></i></a>
                    <a href="https://dzen.ru/id/65e0e96ea9bdc976e134ca84?share_to=link" target="_blank" rel="noopener"><i class="fas fa-newspaper"></i></a>
                    <a href="https://yandex.ru" target="_blank" rel="noopener"><i class="fab fa-yandex"></i></a>
                </div>
            </div>
        </div>
    </header>

    <!-- Cart Sidebar -->
    <div class="cart-sidebar" id="cartSidebar">
        <div class="cart-header">
            <h2>Корзина</h2>
            <button class="close-cart" id="closeCart">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="cart-items" id="cartItems">
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Ваша корзина пуста</p>
            </div>
        </div>
        <div class="cart-footer">
            <div class="cart-total">
                <span>Итого:</span>
                <span class="total-price" id="totalPrice">0 ₽</span>
            </div>
            <button class="checkout-btn" id="checkoutBtn" disabled>Оформить заказ</button>
        </div>
    </div>
    <div class="cart-overlay" id="cartOverlay"></div>

    <!-- Coffee Generation Modal -->
    <div class="coffee-modal" id="coffeeModal">
        <div class="coffee-modal-content liquid-glass coffee-modal-scale">
            <div class="coffee-modal-header">
                <h2>Сгенерировать ваш нейро-кофе</h2>
                <button class="close-modal" id="closeCoffeeModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="coffee-modal-body" id="coffeeModalBody">
                <div class="form-group">
                    <label for="mood">Ваше настроение</label>
                    <textarea id="mood" placeholder="Опишите ваше настроение, что вы чувствуете, какое кофе хотели бы попробовать..."></textarea>
                </div>
                <div class="form-group">
                    <label for="preferences">Предпочтения (необязательно)</label>
                    <textarea id="preferences" placeholder="Любимые вкусы, ингредиенты, крепость кофе..."></textarea>
                </div>
                <button class="generate-btn" id="generateCoffeeBtn">
                    <i class="fas fa-magic"></i> Сгенерировать рецепт
                </button>
            </div>
            <div class="coffee-result" id="coffeeResult" style="display: none;">
                <div class="result-content result-fade-in">
                    <h3 id="resultName"></h3>
                    <p id="resultDescription"></p>
                    <div class="result-details">
                        <div class="result-section">
                            <h4>Ингредиенты:</h4>
                            <p id="resultIngredients"></p>
                        </div>
                        <div class="result-section">
                            <h4>Приготовление:</h4>
                            <p id="resultInstructions"></p>
                        </div>
                        <div class="result-price">
                            <span>Цена: <strong id="resultPrice"></strong> ₽</span>
                            <span>Размер: <strong id="resultSize"></strong></span>
                        </div>
                    </div>
                    <div class="result-full-ai" id="resultFullAiSection">
                        <h4 class="toggle-full-ai" id="toggleFullAi">
                            <i class="fas fa-robot"></i> Полный ответ ИИ
                            <i class="fas fa-chevron-down toggle-icon"></i>
                        </h4>
                        <div class="result-full-text" id="resultFullText"></div>
                    </div>
                    <div class="result-actions">
                        <button class="add-generated-btn" id="addGeneratedBtn">
                            <i class="fas fa-cart-plus"></i> Добавить в корзину
                        </button>
                        <button class="generate-again-btn" id="generateAgainBtn">
                            <i class="fas fa-redo"></i> Сгенерировать ещё
                        </button>
                        <a id="shareRecipeTelegram" href="#" target="_blank" rel="noopener noreferrer" class="share-telegram-btn" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; background: #0088cc; color: #fff; border-radius: 8px; text-decoration: none; font-size: 0.95rem;">
                            <i class="fab fa-telegram"></i> Поделиться в Telegram
                        </a>
                        <button id="sendRecipeBotBtn" class="share-telegram-btn" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; background: #22c55e; color: #fff; border-radius: 8px; border: none; cursor: pointer; font-size: 0.95rem;" onclick="sendRecipeViaBot()">
                            <i class="fas fa-paper-plane"></i> Отправить бариста
                        </button>
                    </div>
                </div>
            </div>
            <div class="coffee-loading" id="coffeeLoading" style="display: none;">
                <div class="loading-spinner"></div>
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
                <p>Генерируем уникальный рецепт для вас...</p>
            </div>
        </div>
    </div>
    <div class="coffee-modal-overlay" id="coffeeModalOverlay"></div>

    <!-- Menu Container -->
    <div class="menu-container">
        <div class="menu-header animated fadeIn" style="animation-duration: 0.8s;">
            <h1 class="menu-title menu-title-glow">Наше Меню</h1>
            <p class="menu-subtitle animated fadeIn" style="animation-delay: 0.2s; animation-fill-mode: both;">*меню будет обновляться</p>
        </div>

        <div class="menu-grid" id="menuGrid">
            <!-- Menu items will be generated by JavaScript -->
        </div>
    </div>

    <!-- Footer -->
    <footer class="site-footer">
        <div class="footer-content">
            <div class="footer-section">
                <h3>Как связаться с нами?</h3>
                <ul>
                    <li><a href="tel:+79001234567"><i class="fas fa-phone"></i> +7 *** *** 05-70</a></li>
                    <li><a href="mailto:TishUp@yandex.ru"><i class="fas fa-envelope"></i> TishUp@yandex.ru</a></li>
                    <li><a href="requisites.php"><i class="fas fa-file-invoice"></i> Реквизиты</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>Мы в соцсетях</h3>
                <ul class="social-icons">
                    <li><a href="https://t.me/+cmzsuwMsLSY3ZmZi" target="_blank" rel="noopener"><i class="fab fa-telegram"></i></a></li>
                    <li><a href="https://dzen.ru/id/65e0e96ea9bdc976e134ca84?share_to=link" target="_blank" rel="noopener"><i class="fas fa-newspaper"></i></a></li>
                    <li><a href="https://yandex.ru" target="_blank" rel="noopener"><i class="fab fa-yandex"></i></a></li>
                </ul>
            </div>
            <div class="copyright">
                <p>&copy; 2025 НейроКофейня</p>
                <p class="copyright-credits">Designed by <a href="https://ssir-team.ru/" target="_blank" rel="noopener">ssir-team</a> <span class="copyright-sep">|</span> <a href="https://t.me/Tisha_sir" target="_blank" rel="noopener">Trogovitsky</a></p>
            </div>
        </div>
    </footer>

    <script src="js/theme-toggle.js"></script>
    <script src="js/api.js"></script>
    <script src="js/shared-ui.js"></script>
    <script src="js/cart.js"></script>
    <script>
        // Menu items data
        const menuItems = [
            {
                id: 1,
                name: 'Нейро-капучино',
                description: 'бодрящий капучино для старта работы',
                image: 'images/img_1.jpg',
                sizes: [
                    { size: '200мл', price: 89 },
                    { size: '350мл', price: 110 }
                ]
            },
            {
                id: 2,
                name: 'Квантовый раф',
                description: 'Почти как компьютер, только на сливках',
                image: 'images/img_2.jpg',
                sizes: [
                    { size: '350мл', price: 140 },
                    { size: '450мл', price: 200 }
                ]
            },
            {
                id: 3,
                name: 'Цифровой Латте',
                description: 'С ним точно ничего не забудите',
                image: 'images/img_3.jpg',
                sizes: [
                    { size: '250мл', price: 110 },
                    { size: '350мл', price: 150 }
                ]
            },
            {
                id: 4,
                name: 'Серверный американо',
                description: 'Крепкий, для настоящих senior',
                image: 'images/img_4.jpg',
                sizes: [
                    { size: '200мл', price: 110 },
                    { size: '300мл', price: 130 }
                ]
            },
            {
                id: 5,
                name: 'Ваш нейро-кофе',
                description: 'Сгенерируйте свой нейро-кофе дня',
                image: 'images/img_5.jpg',
                sizes: [
                    { size: '200мл-450мл', price: 80 },
                    { size: '200мл-450мл', price: 350 }
                ]
            },
            {
                id: 6,
                name: 'Матча ревью',
                description: 'Для тех, у кого сегодня код-ревью',
                image: 'images/img_6.jpg',
                sizes: [
                    { size: '250мл', price: 200 },
                    { size: '350мл', price: 250 }
                ]
            }
        ];

        // Initialize page
        document.addEventListener('DOMContentLoaded', async function() {
            // Render menu items
            renderMenuItems();
            
            // Wait for cart manager to initialize
            setTimeout(() => {
                if (window.cartManager) {
                    window.cartManager.updateCartUI();
                }
            }, 100);
        });

        function renderMenuItems() {
            const menuGrid = document.getElementById('menuGrid');
            if (!menuGrid) return;

            menuGrid.innerHTML = menuItems.map((item, i) => `
                <div class="menu-item liquid-glass menu-item-reveal" style="animation-delay: ${0.05 * (i + 1)}s">
                    <div class="menu-item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="menu-item-content">
                        <h3 class="menu-item-name">${item.name}</h3>
                        <p class="menu-item-description">${item.description}</p>
                        <div class="menu-item-sizes" id="sizes-${item.id}">
                            ${item.sizes.map((size, index) => `
                                <div class="size-option ${index === 0 ? 'selected' : ''}" 
                                     data-size="${size.size}" 
                                     data-price="${size.price}"
                                     onclick="selectSize(${item.id}, '${size.size}', ${size.price})">
                                    <span class="size-label">${size.size}</span>
                                    <span class="size-price">${size.price}₽</span>
                                </div>
                            `).join('')}
                        </div>
                        ${item.id === 5 ? `
                            <button class="generate-coffee-btn" onclick="openCoffeeGenerator(${item.id}, '${item.name.replace(/'/g, "\\'")}', '${item.image}')">
                                <i class="fas fa-magic"></i> Сгенерировать
                            </button>
                        ` : `
                            <button class="add-to-cart-btn" onclick="addToCart(${item.id}, '${item.name.replace(/'/g, "\\'")}', '${item.image}')">
                                <i class="fas fa-plus"></i> В корзину
                            </button>
                        `}
                    </div>
                </div>
            `).join('');
        }

        function selectSize(itemId, size, price) {
            const sizeOptions = document.querySelectorAll(`#sizes-${itemId} .size-option`);
            sizeOptions.forEach(option => {
                option.classList.remove('selected');
                if (option.dataset.size === size) {
                    option.classList.add('selected');
                }
            });
        }

        function getSelectedSize(itemId) {
            const selectedOption = document.querySelector(`#sizes-${itemId} .size-option.selected`);
            if (selectedOption) {
                return {
                    size: selectedOption.dataset.size,
                    price: parseInt(selectedOption.dataset.price)
                };
            }
            return null;
        }

        let currentGeneratingItem = null;

        function openCoffeeGenerator(itemId, name, image) {
            const currentUser = JSON.parse(localStorage.getItem('neuro-cafe-current-user') || sessionStorage.getItem('neuro-cafe-current-user') || 'null');
            
            if (!currentUser || currentUser === 'null') {
                alert('Пожалуйста, войдите в аккаунт, чтобы сгенерировать кофе');
                window.location.href = 'login.php';
                return;
            }

            currentGeneratingItem = { itemId, name, image };
            document.getElementById('coffeeModal').style.display = 'flex';
            document.getElementById('coffeeModalOverlay').style.display = 'block';
            document.getElementById('coffeeModalBody').style.display = 'block';
            document.getElementById('coffeeResult').style.display = 'none';
            document.getElementById('coffeeLoading').style.display = 'none';
            document.getElementById('mood').value = '';
            document.getElementById('preferences').value = '';
            document.getElementById('generateCoffeeBtn').disabled = false;
        }

        function closeCoffeeModal() {
            document.getElementById('coffeeModal').style.display = 'none';
            document.getElementById('coffeeModalOverlay').style.display = 'none';
            currentGeneratingItem = null;
        }

        function backToForm() {
            document.getElementById('coffeeResult').style.display = 'none';
            document.getElementById('coffeeModalBody').style.display = 'block';
            document.getElementById('coffeeLoading').style.display = 'none';
            document.getElementById('mood').value = '';
            document.getElementById('preferences').value = '';
            document.getElementById('generateCoffeeBtn').disabled = false;
            const fullSection = document.getElementById('resultFullAiSection');
            if (fullSection) fullSection.classList.remove('expanded');
        }

        async function generateCoffee() {
            const mood = document.getElementById('mood').value.trim();
            const preferences = document.getElementById('preferences').value.trim();

            if (!mood && !preferences) {
                alert('Пожалуйста, опишите ваше настроение или предпочтения');
                return;
            }

            const loadingEl = document.getElementById('coffeeLoading');
            const resultEl = document.getElementById('coffeeResult');
            const formEl = document.getElementById('coffeeModalBody');
            const generateBtn = document.getElementById('generateCoffeeBtn');

            formEl.style.display = 'none';
            resultEl.style.display = 'none';
            loadingEl.style.display = 'flex';
            generateBtn.disabled = true;

            try {
                const response = await window.API.ai.generateCoffee(mood, preferences);
                
                if (response.success && response.recipe) {
                    const recipe = response.recipe;
                    const rawText = response.rawResponse || recipe.fullText || '';

                    document.getElementById('resultName').textContent = recipe.name || 'Нейро-кофе';
                    document.getElementById('resultDescription').textContent = recipe.description || '';
                    document.getElementById('resultIngredients').textContent = recipe.ingredients || '—';
                    document.getElementById('resultInstructions').textContent = recipe.instructions || '—';
                    document.getElementById('resultPrice').textContent = recipe.price ?? 200;
                    document.getElementById('resultSize').textContent = recipe.size || '350мл';
                    document.getElementById('resultFullText').textContent = rawText || 'Ответ ИИ недоступен.';
                    document.getElementById('resultFullAiSection').classList.remove('expanded');

                    window.generatedRecipe = {
                        ...recipe,
                        itemId: currentGeneratingItem.itemId,
                        image: currentGeneratingItem.image,
                        fullText: rawText,
                        mood: mood,
                        preferences: preferences
                    };
                    localStorage.setItem('neuro-cafe-generated-recipe', JSON.stringify(window.generatedRecipe));

                    var shareText = (recipe.name || 'Нейро-кофе') + '\n\n' + (recipe.description || '') + '\n\nИнгредиенты:\n' + (recipe.ingredients || '') + '\n\nПриготовление:\n' + (recipe.instructions || '');
                    var shareEl = document.getElementById('shareRecipeTelegram');
                    if (shareEl) shareEl.href = 'https://t.me/share/url?text=' + encodeURIComponent(shareText);

                    loadingEl.style.display = 'none';
                    formEl.style.display = 'none';
                    resultEl.style.display = 'block';
                } else {
                    throw new Error(response.message || 'Не удалось сгенерировать рецепт');
                }
            } catch (error) {
                console.error('Generation error:', error);
                alert('Ошибка при генерации рецепта. ' + (error.message || 'Попробуйте еще раз.'));
                formEl.style.display = 'block';
                resultEl.style.display = 'none';
            } finally {
                loadingEl.style.display = 'none';
                generateBtn.disabled = false;
            }
        }

        function addGeneratedToCart() {
            if (!window.generatedRecipe) {
                alert('Сначала сгенерируйте рецепт');
                return;
            }

            if (window.cartManager) {
                window.cartManager.addItem({
                    itemId: window.generatedRecipe.itemId,
                    name: window.generatedRecipe.name,
                    price: window.generatedRecipe.price,
                    size: window.generatedRecipe.size || '350мл',
                    image: window.generatedRecipe.image,
                    quantity: 1
                });

                closeCoffeeModal();
            }
        }

        function addToCart(itemId, name, image) {
            // Check if user is logged in
            const currentUser = JSON.parse(localStorage.getItem('neuro-cafe-current-user') || sessionStorage.getItem('neuro-cafe-current-user') || 'null');
            
            if (!currentUser || currentUser === 'null') {
                alert('Пожалуйста, войдите в аккаунт, чтобы добавить товар в корзину');
                window.location.href = 'login.php';
                return;
            }

            const selectedSize = getSelectedSize(itemId);
            if (!selectedSize) {
                alert('Пожалуйста, выберите размер');
                return;
            }

            if (window.cartManager) {
                window.cartManager.addItem({
                    id: itemId,
                    name: name,
                    price: selectedSize.price,
                    size: selectedSize.size,
                    image: image,
                    quantity: 1
                });
            }
        }

        // Modal event listeners
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('closeCoffeeModal').addEventListener('click', closeCoffeeModal);
            document.getElementById('coffeeModalOverlay').addEventListener('click', closeCoffeeModal);
            document.getElementById('generateCoffeeBtn').addEventListener('click', generateCoffee);
            document.getElementById('addGeneratedBtn').addEventListener('click', addGeneratedToCart);
            document.getElementById('generateAgainBtn').addEventListener('click', backToForm);
            document.getElementById('toggleFullAi').addEventListener('click', function() {
                document.getElementById('resultFullAiSection').classList.toggle('expanded');
            });
        });
    </script>
    <script>
    async function sendRecipeViaBot() {
        const btn = document.getElementById('sendRecipeBotBtn');
        if (!window.generatedRecipe || !window.API) { alert('Сначала сгенерируйте рецепт'); return; }
        btn.textContent = 'Отправка...';
        btn.disabled = true;
        try {
            const res = await window.API.ai.sendRecipeToTelegram(window.generatedRecipe);
            if (res.sent) {
                btn.innerHTML = '<i class="fas fa-check"></i> Отправлено!';
                btn.style.background = '#16a34a';
            } else {
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Бот не настроен';
                btn.style.background = '#f59e0b';
            }
        } catch (e) {
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить бариста';
            alert(e.message || 'Ошибка отправки');
        }
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить бариста';
            btn.style.background = '#22c55e';
            btn.disabled = false;
        }, 3000);
    }
    </script>
    <script src="js/chat-widget.js"></script>
</body>
</html>

