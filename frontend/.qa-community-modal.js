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
  const shotsDir = path.join(process.cwd(), 'qa-shots-3');
  if (!fs.existsSync(shotsDir)) fs.mkdirSync(shotsDir);

  await page.goto('http://localhost:3000/community', { waitUntil: 'networkidle' });
  await page.click('button:has-text("+ Post")');
  await page.screenshot({ path: path.join(shotsDir, 'community-post-modal.png'), fullPage: true });
  console.log('MODAL_OPENED');
  await browser.close();
})();
