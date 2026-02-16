/**
 * Конвертация всех .html страниц в .php с заменой внутренних ссылок на .php
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = [
  'index', 'menubeta', 'services', 'contact', 'requisites',
  'login', 'register', 'profile', 'admin', 'redirect', 'login-qr',
  'order-success', '404'
];

const htmlToPhp = (name) => name + '.html';
const phpName = (name) => name + '.php';

function convertFile(htmlFile) {
  const base = path.basename(htmlFile, '.html');
  const phpFile = path.join(path.dirname(htmlFile), phpName(base));
  let content = fs.readFileSync(htmlFile, 'utf8');
  // Замена ссылок на страницы: xxx.html -> xxx.php (только наши страницы)
  PAGES.forEach((p) => {
    const from = htmlToPhp(p);
    const to = phpName(p);
    content = content.split(from).join(to);
  });
  fs.writeFileSync(phpFile, content, 'utf8');
  console.log('OK', path.basename(phpFile));
}

PAGES.forEach((p) => {
  const htmlPath = path.join(ROOT, htmlToPhp(p));
  if (fs.existsSync(htmlPath)) {
    convertFile(htmlPath);
  } else {
    console.log('Skip (not found):', htmlToPhp(p));
  }
});

console.log('Done. PHP files created.');
