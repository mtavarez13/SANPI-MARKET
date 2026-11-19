import assert from 'node:assert/strict';
import { test } from 'node:test';
import { storeDashboardData } from '../src/lib/storeDashboardData.ts';

const partner = { uid: 'seller-1', email: 'seller@example.test', role: 'partner' };
const stores = [
  { id: 'one', ownerId: 'seller-1', name: 'Mi Tienda' },
  { id: 'two', ownerId: 'someone-else', name: 'Otra Tienda' },
];
const articles = [
  { id: 'item-1', storeId: 'one', inventory: 4, costPerItem: 100, price: 250 },
  { id: 'item-2', storeId: 'two', inventory: 99, costPerItem: 20, price: 50 },
];
const order = (id, storeId, status, extras = {}) => ({ id, trackingNumber: id, storeId, articleId: 'item-1', status, createdAt: '2026-11-10T12:00:00Z', basePrice: 250, shippingFee: 40, quantity: 1, ...extras });
const deliveries = [
  order('delivered', 'one', 'entregado', { storePaidAt: '2026-11-12', storePaidAmount: 225, deliveryPayment: 20 }),
  order('transit', 'one', 'en tránsito'),
  order('other-store', 'two', 'entregado', { basePrice: 9999 }),
];
const transactions = [{ trackingNumber: 'delivered', storeId: 'one', commissionAmount: 25, basePrice: 250 }];

test('store dashboard only includes owned inventory and packages', () => {
  const data = storeDashboardData(partner, stores, articles, deliveries, transactions, [], []);
  assert.deepEqual(data.orders.map(row => row.id).sort(), ['delivered', 'transit']);
  assert.equal(data.inventoryUnits, 4);
  assert.equal(data.inventoryCost, 400);
  assert.equal(data.inventoryRetail, 1000);
  assert.equal(data.statusCounts['en tránsito'], 1);
  assert.equal(data.statusCounts.entregado, 1);
});

test('delivered product, freight, payout and net store profit stay separate', () => {
  const data = storeDashboardData(partner, stores, articles, deliveries, transactions, [{ userId: 'seller-1', amount: 15 }], []);
  assert.equal(data.productSales, 250);
  assert.equal(data.freightBilled, 40);
  assert.equal(data.driverPayments, 20);
  assert.equal(data.storePayable, 225);
  assert.equal(data.storePaid, 225);
  assert.equal(data.storePending, 0);
  assert.equal(data.netProfit, 110);
});

test('unverified commissions and missing costs do not inflate net profit', () => {
  const extra = [order('no-transaction', 'one', 'entregado', { basePrice: 900 }), order('no-cost', 'one', 'entregado', { articleId: 'deleted', basePrice: 500 })];
  const data = storeDashboardData(partner, stores, articles, [...deliveries, ...extra], [...transactions, { trackingNumber: 'no-cost', storeId: 'one', commissionAmount: 50 }], [], []);
  assert.equal(data.deliveredCount, 3);
  assert.equal(data.reviewCount, 1);
  assert.equal(data.missingCostCount, 1);
  assert.equal(data.netProfit, 125);
});

test('other roles and visitors receive no store data', () => {
  for (const user of [null, { ...partner, role: 'customer' }, { ...partner, role: 'admin' }]) {
    const data = storeDashboardData(user, stores, articles, deliveries, transactions, [], []);
    assert.equal(data.orders.length, 0);
    assert.equal(data.productSales, 0);
  }
});

test('legacy paid guide without recorded amount is not shown as pending or assigned an invented payment amount', () => {
  const data = storeDashboardData(partner, stores, articles,
    [order('delivered', 'one', 'entregado', { storePaidAt: '2026-11-12' })], transactions, [], []);
  assert.equal(data.storePaid, 0);
  assert.equal(data.storePending, 0);
});
