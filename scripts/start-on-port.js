#!/usr/bin/env node
/**
 * Запуск сервера на указанном порту.
 * Использование: node scripts/start-on-port.js [PORT]
 * Пример: node scripts/start-on-port.js 30001
 */
const port = process.argv[2] || 443;
process.env.PORT = port;
require('../server.js');
