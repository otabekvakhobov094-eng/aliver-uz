import { execFileSync } from 'node:child_process';

const required = ['DATABASE_URL','REDIS_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','CLICK_MERCHANT_ID','CLICK_SERVICE_ID','CLICK_SECRET_KEY','PAYME_MERCHANT_ID','PAYME_KEY','OFD_API_URL','OFD_API_TOKEN','OFD_TERMINAL_ID','SMS_API_URL','SMS_API_LOGIN','SMS_API_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) { console.error(`Production sozlamalari yetishmaydi: ${missing.join(', ')}`); process.exit(1); }
if (process.env.APP_ENV !== 'production' || process.env.PAYMENTS_MODE !== 'live' || process.env.OFD_PROVIDER === 'mock' || process.env.SMS_PROVIDER === 'console') {
  console.error('APP_ENV=production, PAYMENTS_MODE=live va real OFD/SMS provayderlari majburiy.'); process.exit(1);
}
for (const [cmd, args] of [['npm',['run','typecheck']], ['npm',['test']], ['npm',['run','build']]]) execFileSync(cmd, args, { stdio: 'inherit' });
console.log('Release gate muvaffaqiyatli. Migratsiya, backup va deployni tasdiqlash mumkin.');
