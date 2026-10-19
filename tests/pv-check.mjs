import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const r = await page.goto(process.argv[2], { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const body = await page.textContent('body');
const extra = process.argv[4]; const ok = body?.includes(process.argv[3]) && (!extra || extra === 'x' || body?.includes(extra));
console.log(process.argv[4], 'status', r?.status(), 'content:', ok ? 'OK' : 'MISSING');
if (!ok) { console.log(body?.slice(0, 300)); process.exit(1); }
await browser.close();
