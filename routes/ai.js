const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate coffee recipe using YandexGPT
router.post('/generate-coffee', auth, async (req, res) => {
    try {
        const { mood, preferences } = req.body;

        if (!mood && !preferences) {
            return res.status(400).json({
                success: false,
                message: 'Необходимо указать настроение или предпочтения'
            });
        }

        // YandexGPT API configuration
        const YANDEX_API_KEY = process.env.YANDEX_API_KEY || process.env.YANDEX_GPT_API_KEY;
        const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID;

        if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID) {
            console.warn('YandexGPT API credentials not configured — используем базовый рецепт');
            return res.json({
                success: true,
                recipe: buildFallbackRecipe(req.body?.mood, req.body?.preferences),
                rawResponse: null,
                fallback: true,
                message: 'Используется базовый рецепт. Для AI-генерации настройте YANDEX_API_KEY и YANDEX_FOLDER_ID в .env.'
            });
        }

        // Prepare prompt for YandexGPT
        const prompt = `Ты - профессиональный бариста в нейрокофейне. Создай уникальный и детальный рецепт кофе на основе следующего:
Настроение клиента: ${mood || 'не указано'}
Предпочтения: ${preferences || 'не указано'}

Создай полный рецепт кофе, который включает:

1. НАЗВАНИЕ НАПИТКА: Креативное название, связанное с нейро-тематикой и настроением клиента

2. ОПИСАНИЕ: 2-3 предложения о напитке, его особенностях и влиянии на настроение

3. ИНГРЕДИЕНТЫ (с точными пропорциями):
   - Перечисли все ингредиенты с указанием количества (в граммах, миллилитрах или порциях)
   - Например: "Эспрессо - 30мл, Молоко - 200мл, Сироп ванильный - 15мл, Корица - 1 щепотка"

4. СПОСОБ ПРИГОТОВЛЕНИЯ (детальная пошаговая инструкция):
   - Опиши каждый шаг приготовления подробно
   - Укажи температуру, время, последовательность действий
   - Например: 
     Шаг 1: Приготовить эспрессо (30мл) при температуре 92-96°C
     Шаг 2: Подогреть молоко до 60-65°C и взбить в пену
     Шаг 3: Добавить сироп в чашку
     Шаг 4: Аккуратно влить эспрессо
     Шаг 5: Добавить молочную пену, создавая латте-арт
     Шаг 6: Посыпать корицей

5. РЕКОМЕНДАЦИИ:
   - Размер порции (в мл)
   - Примерная цена (в рублях)
   - Время приготовления
   - Особые рекомендации по подаче

Формат ответа должен быть структурированным, понятным и готовым к использованию бариста.`;

        // Call YandexGPT API
        const response = await axios.post(
            'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
            {
                modelUri: `gpt://${YANDEX_FOLDER_ID}/yandexgpt/latest`,
                completionOptions: {
                    stream: false,
                    temperature: 0.7,
                    maxTokens: 1000
                },
                messages: [
                    {
                        role: 'system',
                        text: 'Ты профессиональный бариста в нейрокофейне, специализирующийся на создании уникальных рецептов кофе.'
                    },
                    {
                        role: 'user',
                        text: prompt
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Api-Key ${YANDEX_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const generatedText = response.data.result.alternatives[0].message.text;

        // Parse and structure the response
        const recipe = {
            name: extractName(generatedText),
            description: extractDescription(generatedText),
            ingredients: extractIngredients(generatedText),
            instructions: extractInstructions(generatedText),
            price: extractPrice(generatedText),
            size: extractSize(generatedText),
            fullText: generatedText
        };

        res.json({
            success: true,
            recipe,
            rawResponse: generatedText
        });

    } catch (error) {
        console.error('YandexGPT API Error:', error.response?.data || error.message);
        const recipe = buildFallbackRecipe(req.body?.mood, req.body?.preferences);
        res.json({
            success: true,
            recipe,
            rawResponse: recipe.fullText,
            fallback: true,
            message: 'Используется базовый рецепт. API временно недоступен.'
        });
    }
});

// Чат с YaGPT — без авторизации, «по душам» про программирование и кофе
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const msg = (message || '').trim();
        if (!msg) {
            return res.status(400).json({ success: false, message: 'Напишите сообщение' });
        }

        const YANDEX_API_KEY = process.env.YANDEX_API_KEY || process.env.YANDEX_GPT_API_KEY;
        const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID;

        if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID) {
            return res.json({
                success: true,
                reply: 'Я пока не могу поболтать — не настроен YaGPT. Зато у нас отличный кофе и меню! Загляни в раздел «Меню» или напиши в поддержку.',
            });
        }

        const rawHistory = Array.isArray(req.body.history) ? req.body.history : [];
        const history = rawHistory.filter(m => m.role === 'user' || m.role === 'assistant');
        const sys = `Ты — дружелюбный виртуальный собеседник в нейрокофейне. Общайся по душам: программирование, кофе, жизнь. Коротко, тепло, по-человечески. Не более 2–3 абзацев.

Ты также отвечаешь на вопросы о проекте «НейроКофейня» (этот сайт). Кратко что умеет проект:
- Меню с кофе и нейро-кофе (рецепт генерирует YaGPT по настроению).
- Корзина, оформление заказа: самовывоз или доставка (нужен адрес), оплата по СБП (ЮKassa).
- Бронирование столика, контакты, реквизиты.
- Бэкенд: Node.js, Express, PostgreSQL; фронт — HTML/CSS/JS; чат с тобой — через Yandex GPT.
- Вход не нужен для чата, меню и части функций; для заказов и корзины — регистрация/вход.

Если спрашивают про проект, сайт, что тут есть, как заказать, как оплатить, реквизиты, технологии — отвечай по этим фактам.`;
        const messages = [
            { role: 'system', text: sys },
            ...history.slice(-6).map((m) => ({ role: m.role, text: (m.text || '').slice(0, 2000) })),
            { role: 'user', text: msg.slice(0, 2000) },
        ];

        const { data } = await axios.post(
            'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
            {
                modelUri: `gpt://${YANDEX_FOLDER_ID}/yandexgpt/latest`,
                completionOptions: { stream: false, temperature: 0.7, maxTokens: 800 },
                messages,
            },
            {
                headers: {
                    'Authorization': `Api-Key ${YANDEX_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const reply = data?.result?.alternatives?.[0]?.message?.text || 'Не смог ответить. Попробуй ещё раз.';
        res.json({ success: true, reply });
    } catch (e) {
        console.error('AI chat error:', e.response?.data || e.message);
        res.status(500).json({
            success: false,
            message: 'Ошибка чата',
            reply: 'Что-то пошло не так. Попробуй через минуту.',
        });
    }
});

function buildFallbackRecipe(mood, preferences) {
    const moodStr = mood || 'особое';
    const prefsStr = preferences ? ` Предпочтения: ${preferences}.` : '';
    const fullText = `Нейро-кофе дня

Специально созданный для вас кофе на основе вашего настроения: ${moodStr}.${prefsStr} Уникальная смесь, которая поднимет ваше настроение и зарядит энергией.

Ингредиенты: Эспрессо, молоко, специальные добавки
Приготовление: По индивидуальному рецепту нашего бариста
Размер порции: 350мл. Цена: 200 ₽`;
    return {
        name: 'Нейро-кофе дня',
        description: `Специально созданный для вас кофе на основе вашего настроения: ${moodStr}.${prefsStr} Уникальная смесь, которая поднимет ваше настроение и зарядит энергией.`,
        ingredients: 'Эспрессо, молоко, специальные добавки',
        instructions: 'Приготовление по индивидуальному рецепту',
        price: 200,
        size: '350мл',
        fullText
    };
}

// Helper functions to parse GPT response
function extractName(text) {
    const nameMatch = text.match(/(?:Название|Название напитка|Имя)[:：]?\s*([^\n]+)/i);
    if (nameMatch) return nameMatch[1].trim();
    
    // Try to find first line that looks like a name
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.trim().length > 5 && line.trim().length < 50 && !line.includes(':')) {
            return line.trim();
        }
    }
    return 'Нейро-кофе дня';
}

function extractDescription(text) {
    const descMatch = text.match(/(?:Описание|Описание напитка)[:：]?\s*([^\n]+(?:\n[^\n]+)?)/i);
    if (descMatch) return descMatch[1].trim();
    
    // Find paragraph after name
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 1) {
        return lines.slice(1, 3).join(' ').trim();
    }
    return 'Уникальный кофе, созданный специально для вас';
}

function extractIngredients(text) {
    const ingMatch = text.match(/(?:Ингредиенты|Состав)[:：]?\s*([^\n]+(?:\n[^\n]+)?)/i);
    if (ingMatch) return ingMatch[1].trim();
    return 'Эспрессо, молоко, специальные добавки';
}

function extractInstructions(text) {
    const instMatch = text.match(/(?:Способ приготовления|Приготовление|Инструкция)[:：]?\s*([^\n]+(?:\n[^\n]+)?)/i);
    if (instMatch) return instMatch[1].trim();
    return 'Приготовление по индивидуальному рецепту';
}

function extractPrice(text) {
    const priceMatch = text.match(/(?:цена|стоимость)[:：]?\s*(\d+)/i);
    if (priceMatch) return parseInt(priceMatch[1]);
    return 200; // Default price
}

function extractSize(text) {
    const sizeMatch = text.match(/(?:размер|порция)[:：]?\s*(\d+\s*мл)/i);
    if (sizeMatch) return sizeMatch[1];
    return '350мл';
}

module.exports = router;

