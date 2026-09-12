import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  descriptionFrom,
  productTitle,
  roundPriceTiyin,
  sourceStock,
  stockUnknown,
} from './lib/catalog-copy.mjs';

/*
 * Bu testlar API tomonidagi `shopify-catalog.util.spec.ts` bilan BIR XIL
 * holatlarni tekshiradi. Sabab: bir xil qoidaning ikkita nusxasi bor
 * (TypeScript va skript uchun .mjs), va ular jimgina bir-biridan
 * uzoqlashsa, admin orqali qilingan import bilan qo'lda ishga
 * tushirilgan import boshqa-boshqa natija berardi.
 */

test('nom tarjima qilinmaydi', () => {
  assert.equal(
    productTitle({ title: 'Aliver Bowling Lip Tint (Bowler)' }),
    'Aliver Bowling Lip Tint (Bowler)',
  );
  assert.equal(productTitle({ title: '  Rosemary   Oil  60ml ' }), 'Rosemary Oil 60ml');
});

test('tavsif manbadan olinadi', () => {
  assert.equal(
    descriptionFrom('<p>Soch uchun <b>rozmarin</b> moyi, 60 ml.</p>'),
    'Soch uchun rozmarin moyi, 60 ml.',
  );
});

test('tavsif yo‘q bo‘lsa null — shablon yozilmaydi', () => {
  assert.equal(descriptionFrom(''), null);
  assert.equal(descriptionFrom(null), null);
  assert.equal(descriptionFrom('<p>60 ml</p>'), null);
});

test('uzun tavsif kesiladi', () => {
  const out = descriptionFrom(`<p>${'a'.repeat(3000)}</p>`, 100);
  assert.equal(out.length, 100);
  assert.ok(out.endsWith('…'));
});

test('qoldiq: manbada son bo‘lmasa null', () => {
  assert.equal(sourceStock({}), null);
  assert.equal(sourceStock({ inventory_quantity: null }), null);
  assert.equal(sourceStock({ inventory_quantity: 12 }), 12);
  assert.equal(sourceStock({ inventory_quantity: -5 }), 0);
});

test('qoldiq: hammasi nol bo‘lsa noma’lum', () => {
  assert.equal(stockUnknown({ variants: [{ inventory_quantity: 0 }, {}] }), true);
  assert.equal(stockUnknown({ variants: [{ inventory_quantity: 3 }] }), false);
});

test('narx eng yaqin 1 000 ga yaxlitlanadi', () => {
  assert.equal(roundPriceTiyin(412_303_00n), 412_000_00n);
  assert.equal(roundPriceTiyin(105_933_00n), 106_000_00n);
  assert.equal(roundPriceTiyin(200_201_00n), 200_000_00n);
  assert.equal(roundPriceTiyin(1_500_00n), 2_000_00n);
});

test('arzon tovar nolga aylanmaydi', () => {
  assert.equal(roundPriceTiyin(300_00n), 1_000_00n);
});

test('qadamni o‘zgartirish mumkin', () => {
  assert.equal(roundPriceTiyin(412_303_00n, 5000), 410_000_00n);
});
