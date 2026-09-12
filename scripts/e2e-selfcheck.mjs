/**
 * E2E testining o'zini tekshirish — mutatsiya sinovi.
 *
 * Yiqilmaydigan test testdan ham yomon: u xotirjamlik beradi, lekin
 * hech narsani ushlamaydi. Shuning uchun `e2e-order-flow.mjs` bilarak
 * buzilgan shartnoma serveriga qarshi ishga tushiriladi va HAR BIR
 * buzilish uchun YIQILISHI shart.
 *
 * Bu CI da haqiqiy API ni talab qilmaydi, shuning uchun u tez va
 * baza kerak emas.
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 4599;
const API = `http://localhost:${PORT}/api`;

/** Har bir buzilish va uning qanday xato berishi kerakligi. */
const BREAKS = [
  ['reserve', 'ombor rezervi bajarilmasa'],
  ['idempotency', 'bir xil kalit bilan ikkinchi buyurtma yaratilsa'],
  ['payment', 'to‘lov tasdiqlanmasa'],
  ['cart-cookie', 'buyurtmadan keyin savat cookie si qolsa'],
  ['phone-mask', 'ochiq sahifada telefon maskalanmasa'],
];

function run(cmd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
}

async function withServer(broken, fn) {
  const server = spawn('node', ['scripts/fixtures/order-flow-contract.mjs'], {
    env: { ...process.env, BREAK: broken, PORT: String(PORT) },
    stdio: 'ignore',
  });
  try {
    await sleep(700);
    return await fn();
  } finally {
    server.kill();
    await sleep(150);
  }
}

let failures = 0;

// 1. Buzilmagan holatda test O'TISHI kerak.
const clean = await withServer('', () =>
  run('node', ['scripts/e2e-order-flow.mjs'], { E2E_API_URL: API }),
);
if (clean.code !== 0) {
  failures += 1;
  console.log('❌ Toza shartnomada test yiqildi — test buzuq:\n' + clean.out.slice(-600));
} else {
  console.log('✓ toza shartnomada o‘tadi');
}

// 2. Har bir buzilishda test YIQILISHI kerak.
for (const [key, description] of BREAKS) {
  const res = await withServer(key, () =>
    run('node', ['scripts/e2e-order-flow.mjs'], { E2E_API_URL: API }),
  );
  if (res.code === 0) {
    failures += 1;
    console.log(`❌ ${description} — test baribir o‘tdi, ya’ni bu holatni ushlamaydi`);
  } else {
    console.log(`✓ ${description} — test yiqiladi`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} ta muammo: E2E testi o‘ziga ishonib bo‘lmaydigan holatda.`);
  process.exit(1);
}
console.log('\nE2E testi tekshiruvdan o‘tdi: buzilganda yiqiladi, tozada o‘tadi.');
