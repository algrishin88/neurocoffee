<!DOCTYPE html>
<html lang="ru">
	<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Контакты - НейроКофейня</title>
    <link rel="icon" href="images/logo.ico.ico" type="image/x-icon">
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
	
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/theme-toggle.css">

    <link rel="stylesheet" href="main-style.css">
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
            <a href="index.php" class="logo">НейроКофейня</a>
            <nav class="nav-logo">
                <ul class="nav-menu">
						<li><a href="index.php">Главная</a></li>
                    <li><a href="menubeta.php">Меню</a></li>
                    <li><a href="services.php">О нас</a></li>
                    <li><a href="contact.php" class="active">Контакты</a></li>
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

    <!-- Main Content -->
    <div class="main-content">
        <!-- Hero Section -->
        <div class="hero-section">
            <h1 class="hero-title">Наши контакты</h1>
            <p class="hero-subtitle">Свяжитесь с нами любым удобным способом</p>
							</div>
							
        <!-- Contact Section -->
        <div class="contact-section">
            <!-- Contact Form -->
            <div class="contact-form liquid-glass">
                <h2 class="section-title" style="font-size: 2rem; margin-bottom: 1.5rem;">Напишите нам</h2>
                <form id="contactForm">
                    <div class="form-group">
                        <label for="name">Ваше имя</label>
                        <input type="text" id="name" name="name" placeholder="Введите ваше имя" required>
						</div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" placeholder="Введите ваш email" required>
						</div>
						<div class="form-group">
                        <label for="message">Сообщение</label>
                        <textarea id="message" name="message" placeholder="Напишите сообщение" required></textarea>
						</div>
                    <button type="submit" class="submit-btn">Отправить</button>
					</form>		
				</div>
					
            <!-- Contact Info -->
            <div class="contact-info liquid-glass">
						<h3>Информация</h3>
						<ul>
                    <li>
                        <i class="fas fa-phone"></i>
                        <a href="tel:+7**********">+7 *** *** 05-70</a>
                    </li>
                    <li>
                        <i class="fas fa-envelope"></i>
                        <a href="mailto:TishUp@yandex.ru">TishUp@yandex.ru</a>
                    </li>
                    <li>
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Москва, Россия</span>
                    </li>
                    <li>
                        <i class="fas fa-file-invoice"></i>
                        <a href="requisites.php">Реквизиты</a>
                    </li>
						</ul>
                <div class="map-container">
                    <iframe src="https://yandex.ru/map-widget/v1/?ll=37.614569%2C55.747094&z=15.94" width="100%" height="400" frameborder="0" allowfullscreen="true" style="position:relative; border-radius: 15px;"></iframe>
				</div>
			</div>
		</div>
	</div>

    <!-- Footer -->
    <footer>
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
        // Contact form handler
        document.getElementById('contactForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const contact = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message')
            };
            
            try {
                // Try API first
                if (window.API && window.API.contacts) {
                    const response = await window.API.contacts.sendMessage(contact);
                    if (response.success) {
                        alert('Сообщение отправлено! Мы свяжемся с вами в ближайшее время.');
                        this.reset();
                    }
                } else {
                    // Fallback to localStorage
                    const messages = JSON.parse(localStorage.getItem('neuro-cafe-messages') || '[]');
                    messages.push({
                        ...contact,
                        id: Date.now(),
                        date: new Date().toISOString()
                    });
                    localStorage.setItem('neuro-cafe-messages', JSON.stringify(messages));
                    alert('Сообщение отправлено! Мы свяжемся с вами в ближайшее время.');
                    this.reset();
                }
            } catch (error) {
                console.error('Contact error:', error);
                alert('Ошибка при отправке сообщения. Попробуйте еще раз.');
            }
        });

        // Initialize page
        document.addEventListener('DOMContentLoaded', async function() {
            await checkAuthAndUpdateUI();
            
            setTimeout(() => {
                if (window.cartManager) {
                    window.cartManager.updateCartUI();
                }
            }, 100);
        });
    </script>
    <script src="js/chat-widget.js"></script>
	</body>
</html>
