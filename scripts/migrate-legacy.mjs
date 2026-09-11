import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const args = new Set(process.argv.slice(2));
const commit = args.has('--commit');
const rollback = args.has('--rollback');
const file = process.argv.find((v) => v.startsWith('--file='))?.slice(7);
const type = process.argv.find((v) => v.startsWith('--type='))?.slice(7);
const checkpoint = process.argv.find((v) => v.startsWith('--checkpoint='))?.slice(13) ?? 'migration-checkpoint.json';
if (!file && !rollback) throw new Error('--file=... majburiy');
if (!['customers','products','orders'].includes(type) && !rollback) throw new Error('--type=customers|products|orders majburiy');

function csv(text) {
  const rows = []; let row = []; let value = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) { const c = text[i]; if (c === '"' && text[i + 1] === '"' && quoted) { value += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === ',' && !quoted) { row.push(value); value = ''; } else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = ''; } else value += c; }
  row.push(value); if (row.some(Boolean)) rows.push(row); const headers = rows.shift()?.map((h) => h.trim()) ?? [];
  return rows.map((values, index) => ({ line: index + 2, data: Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? ''])) }));
}

const prisma = new PrismaClient();
try {
  if (rollback) {
    const state = JSON.parse(await readFile(checkpoint, 'utf8'));
    if (!commit) { console.log(JSON.stringify({ dryRun: true, rollback: state.created }, null, 2)); process.exit(0); }
    await prisma.$transaction(async (tx) => { for (const id of state.created.orders ?? []) await tx.order.delete({ where: { id } }); for (const id of state.created.customers ?? []) await tx.customer.delete({ where: { id } }); for (const id of state.created.products ?? []) await tx.product.delete({ where: { id } }); });
    console.log('Rollback yakunlandi.'); process.exit(0);
  }
  const source = await readFile(file, 'utf8'); const checksum = createHash('sha256').update(source).digest('hex'); const rows = csv(source);
  const errors = []; const normalized = [];
  for (const row of rows) {
    const d = row.data;
    if (type === 'customers' && !/^\+?998\d{9}$/.test(d.phone ?? '')) errors.push({ line: row.line, field: 'phone', message: 'Telefon +998XXXXXXXXX formatida bo‘lishi kerak' });
    else if (type === 'products' && (!d.slug || !d.nameUz || !d.nameRu || !d.ikpuCode)) errors.push({ line: row.line, message: 'slug,nameUz,nameRu,ikpuCode majburiy' });
    else if (type === 'orders' && (!d.number || !d.contactPhone || !d.grandTotal)) errors.push({ line: row.line, message: 'number,contactPhone,grandTotal majburiy' });
    else normalized.push(d);
  }
  console.log(JSON.stringify({ mode: commit ? 'commit' : 'dry-run', type, checksum, total: rows.length, valid: normalized.length, errors }, null, 2));
  if (errors.length || !commit) process.exit(errors.length ? 2 : 0);
  const created = { customers: [], products: [], orders: [] };
  await prisma.$transaction(async (tx) => {
    for (const d of normalized) {
      if (type === 'customers') {
        const existed = await tx.customer.findUnique({ where: { phone: d.phone }, select: { id: true } });
        const result = await tx.customer.upsert({ where: { phone: d.phone }, update: { firstName: d.firstName || undefined, lastName: d.lastName || undefined, email: d.email || undefined }, create: { phone: d.phone, firstName: d.firstName || null, lastName: d.lastName || null, email: d.email || null } });
        if (!existed) created.customers.push(result.id);
      }
      if (type === 'products') {
        const existed = await tx.product.findUnique({ where: { slug: d.slug }, select: { id: true } });
        const data = { nameUz: d.nameUz, nameRu: d.nameRu, ingredientsUz: d.ingredientsUz || '-', ingredientsRu: d.ingredientsRu || '-', warningsUz: d.warningsUz || '-', warningsRu: d.warningsRu || '-', ikpuCode: d.ikpuCode, vatRate: Number(d.vatRate || 12), unitCode: d.unitCode || '796', searchText: `${d.nameUz} ${d.nameRu} ${d.slug}` };
        const result = existed ? await tx.product.update({ where: { id: existed.id }, data }) : await tx.product.create({ data: { slug: d.slug, ...data } });
        if (!existed) created.products.push(result.id);
      }
      if (type === 'orders') {
        const existed = await tx.order.findUnique({ where: { number: d.number }, select: { id: true } });
        if (!existed) { const result = await tx.order.create({ data: { number: d.number, contactPhone: d.contactPhone, firstName: d.firstName || 'Legacy', status: d.status || 'DELIVERED', paymentStatus: d.paymentStatus || 'PAID', deliveryType: d.deliveryType || 'COURIER', subtotal: BigInt(d.subtotal || d.grandTotal), grandTotal: BigInt(d.grandTotal), placedAt: d.placedAt ? new Date(d.placedAt) : new Date() } }); created.orders.push(result.id); }
      }
    }
  });
  await writeFile(checkpoint, JSON.stringify({ checksum, type, created, completedAt: new Date().toISOString() }, null, 2));
  console.log(`Import yakunlandi. Checkpoint: ${checkpoint}`);
} finally { await prisma.$disconnect(); }
