import { chromium } from 'playwright';

const shots = '/tmp/claude-0/verify';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForSelector('#loader', { state: 'hidden', timeout: 60000 });

// record outgoing handoffs instead of performing them
await page.evaluate(() => {
  window.__sent = [];
  window.open = (url) => { window.__sent.push(url); return null; };
  const desc = { set(v) { window.__sent.push(String(v)); }, get() { return ''; } };
  try { Object.defineProperty(window.location.constructor.prototype, 'href', desc); } catch {}
});

await page.evaluate(() => document.getElementById('contact').scrollIntoView());
await page.waitForTimeout(2000);
await page.screenshot({ path: `${shots}/contact-form.png` });

// empty submit should mark fields invalid, not navigate
await page.click('button[data-send="whatsapp"]');
const invalidCount = await page.locator('.contact__input.is-invalid').count();

await page.fill('#cfName', 'Test Visitor');
await page.fill('#cfContact', 'test@example.com');
await page.fill('#cfMessage', 'I want a cinematic site for my brand.');
await page.click('button[data-send="whatsapp"]');
await page.waitForTimeout(300);
const sent = await page.evaluate(() => window.__sent);

console.log('INVALID-ON-EMPTY:', invalidCount);
console.log('WHATSAPP URL:', sent[0] || 'none');

// footer
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${shots}/footer.png` });
const links = await page.$$eval('.footer__links a', (as) => as.map((a) => a.textContent));
console.log('FOOTER:', links.join(' '));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
