import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:8081';

// App Store: iPhone 15 Pro (6.1インチ相当)
const VIEWPORT = { width: 393, height: 852, deviceScaleFactor: 3 };

// AsyncStorage に入れるデモデータ
const DEMO_RESIDENCE = {
  id: 'demo-001',
  residenceType: 'engineer',
  expiryDate: '2026-08-15',
  applicationStartDate: '2026-04-15',
  memo: '',
  reminders: { fourMonths: true, threeMonths: true, oneMonth: true, twoWeeks: true },
  checklistProgress: { 'engineer-0': true, 'engineer-1': true, 'engineer-2': false },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEMO_USER = { plan: 'free' };

async function injectDemoData(page) {
  await page.evaluate((residence, user) => {
    const residences = [residence];
    localStorage.setItem('@residence_reminder/residences', JSON.stringify(residences));
    localStorage.setItem('@residence_reminder/user', JSON.stringify(user));
  }, DEMO_RESIDENCE, DEMO_USER);
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // まずホームページに移動してデモデータを注入
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 15000 });
  await injectDemoData(page);

  const screens = [
    { name: '01-home',      path: '/',                           wait: 2500 },
    { name: '02-register',  path: '/register',                   wait: 2000 },
    { name: '03-checklist', path: '/checklist/demo-001',         wait: 2500 },
    { name: '04-reminder',  path: '/reminder-settings/demo-001', wait: 2000 },
    { name: '05-settings',  path: '/settings',                   wait: 2000 },
  ];

  for (const screen of screens) {
    try {
      console.log(`Capturing: ${screen.name}`);
      await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, screen.wait));
      const outPath = path.join(__dirname, 'screenshots', `${screen.name}.png`);
      await page.screenshot({ path: outPath });
      console.log(`  ✅ ${outPath}`);
    } catch (e) {
      console.log(`  ❌ ${screen.name}: ${e.message}`);
    }
  }

  await browser.close();
  console.log('\nDone!');
})();
