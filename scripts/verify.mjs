import { chromium } from 'playwright';

const shots = '/tmp/claude-0/verify';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()} ${r.url()}`); });

await page.goto('http://localhost:5173/', { waitUntil: 'load' });
// wait for the loader to finish (all 193 frames decoded)
await page.waitForSelector('#loader', { state: 'hidden', timeout: 60000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${shots}/hero-0.png` });

// scrub through the hero scene and capture orbit angles
const heroDepths = [0.12, 0.3, 0.5, 0.7, 0.9];
for (const d of heroDepths) {
  await page.evaluate((f) => {
    const hero = document.getElementById('hero');
    window.scrollTo(0, (hero.offsetHeight - innerHeight) * f);
  }, d);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${shots}/hero-${Math.round(d * 100)}.png` });
}

// FPS measurement while auto-scrolling through the hero
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
const fps = await page.evaluate(() => new Promise((resolve) => {
  const hero = document.getElementById('hero');
  const end = hero.offsetHeight - innerHeight;
  const t0 = performance.now();
  const DUR = 4000;
  let frames = 0;
  let longest = 0;
  let last = t0;
  function tick(now) {
    frames++;
    longest = Math.max(longest, now - last);
    last = now;
    const p = Math.min(1, (now - t0) / DUR);
    window.scrollTo(0, end * p);
    if (p < 1) requestAnimationFrame(tick);
    else resolve({ avgFps: Math.round(frames / (DUR / 1000)), longestFrameMs: Math.round(longest) });
  }
  requestAnimationFrame(tick);
}));
console.log('SCRUB PERF:', JSON.stringify(fps));

// sections
const sections = [['stats', '#stats'], ['pillar2', null], ['work', '#work'], ['finale', '#contact']];
await page.evaluate(() => document.getElementById('stats').scrollIntoView());
await page.waitForTimeout(1500);
await page.screenshot({ path: `${shots}/stats.png` });

// pillars mid-scene (2nd pillar)
await page.evaluate(() => {
  const s = document.getElementById('pillars');
  window.scrollTo(0, s.offsetTop + (s.offsetHeight - innerHeight) * 0.5);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${shots}/pillars-mid.png` });

await page.evaluate(() => {
  const s = document.getElementById('work');
  window.scrollTo(0, s.offsetTop + innerHeight * 1.2);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${shots}/work.png` });

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1800);
await page.screenshot({ path: `${shots}/finale.png` });

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
