const { chromium } = require('playwright');
(async () => {
  const apiBase = 'http://127.0.0.1:8080';
  const loginRes = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'codex+82b4345a@example.com', password: 'Test1234!' }),
  });
  const loginJson = await loginRes.json();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((authToken) => localStorage.setItem('deeply_fit_token', authToken), loginJson.access_token);
  const page = await context.newPage();
  await page.goto('http://localhost:3000/community', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '+ Post' }).click();
  await page.getByText('Share an update').waitFor({ timeout: 5000 });
  console.log('POST_MODAL_VISIBLE');
  await browser.close();
})();
