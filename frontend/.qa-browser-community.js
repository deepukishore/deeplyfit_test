const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const apiBase = 'http://127.0.0.1:8080';
  const email = 'codex+82b4345a@example.com';
  const password = 'Test1234!';

  const loginRes = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok) throw new Error(JSON.stringify(loginJson));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((authToken) => {
    localStorage.setItem('deeply_fit_token', authToken);
  }, loginJson.access_token);

  const page = await context.newPage();
  page.on('console', (msg) => console.log('BROWSER:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

  const shotsDir = path.join(process.cwd(), 'qa-shots-2');
  if (!fs.existsSync(shotsDir)) fs.mkdirSync(shotsDir);

  for (const [route, name] of [['/diary', 'diary'], ['/community', 'community']]) {
    await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(shotsDir, `${name}.png`), fullPage: true });
    console.log(`SHOT:${name}`);
  }

  await browser.close();
})();
