const mongoose = require('mongoose');
const dotenv = require('dotenv');
const MenuItem = require('../models/MenuItem');

dotenv.config();

const menuItems = [
    {
        id: 1,
        name: 'Нейро-капучино',
        description: 'бодрящий капучино для старта работы',
        image: 'images/img_1.jpg',
        sizes: [
            { size: '200мл', price: 89 },
            { size: '350мл', price: 110 }
        ],
        category: 'coffee',
        available: true
    },
    {
        id: 2,
        name: 'Квантовый раф',
        description: 'Почти как компьютер, только на сливках',
        image: 'images/img_2.jpg',
        sizes: [
            { size: '350мл', price: 140 },
            { size: '450мл', price: 200 }
        ],
        category: 'coffee',
        available: true
    },
    {
        id: 3,
        name: 'Цифровой Латте',
        description: 'С ним точно ничего не забудите',
        image: 'images/img_3.jpg',
        sizes: [
            { size: '250мл', price: 110 },
            { size: '350мл', price: 150 }
        ],
        category: 'coffee',
        available: true
    },
    {
        id: 4,
        name: 'Серверный американо',
        description: 'Крепкий, для настоящих senior',
        image: 'images/img_4.jpg',
        sizes: [
            { size: '200мл', price: 110 },
            { size: '300мл', price: 130 }
        ],
        category: 'coffee',
        available: true
    },
    {
        id: 5,
        name: 'Ваш нейро-кофе',
        description: 'Сгенерируйте свой нейро-кофе дня',
        image: 'images/img_5.jpg',
        sizes: [
            { size: '200мл-450мл', price: 80 },
            { size: '200мл-450мл', price: 350 }
        ],
        category: 'special',
        available: true
    },
    {
        id: 6,
        name: 'Матча ревью',
        description: 'Для тех, у кого сегодня код-ревью',
        image: 'images/img_6.jpg',
        sizes: [
            { size: '250мл', price: 200 },
            { size: '350мл', price: 250 }
        ],
        category: 'tea',
        available: true
    }
];

async function initializeDatabase() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/neirocafe';
        
        await mongoose.connect(MONGODB_URI);

        console.log('✅ Подключено к MongoDB');

        // Check if menu items exist
        const existingItems = await MenuItem.countDocuments();
        
        if (existingItems === 0) {
            console.log('📋 Инициализация меню...');
            await MenuItem.insertMany(menuItems);
            console.log(`✅ Меню инициализировано: ${menuItems.length} товаров`);
        } else {
            console.log(`✅ Меню уже существует: ${existingItems} товаров`);
        }

        console.log('\n🎉 База данных готова к работе!');
        console.log('\n📝 Следующие шаги:');
        console.log('   1. Убедитесь, что переменные окружения настроены в .env');
        console.log('   2. Запустите сервер: npm run dev');
        console.log('   3. Откройте http://localhost:3307/api/health для проверки\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error.message);
        console.log('\n💡 Убедитесь, что:');
        console.log('   - MongoDB запущен');
        console.log('   - MONGODB_URI в .env файле указан правильно');
        process.exit(1);
    }
}

initializeDatabase();

