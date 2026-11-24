import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateStoreExpenses, financialAudit } from '../src/lib/financialAudit.ts';
import { reconcileSales } from '../src/lib/accountingReconciliation.ts';

const deliveries = [
  { id: 'A', trackingNumber: 'A', storeId: 'one', articleName: 'A', basePrice: 1000, deliveryFee: 200, deliveryPayment: 80, totalToCollect: 1200, status: 'entregado', createdAt: '2026-11-01', history: [{ status: 'entregado', date: '2026-11-03' }] },
  { id: 'B', trackingNumber: 'B', storeId: 'two', articleName: 'B', basePrice: 500, deliveryFee: 100, deliveryPayment: 40, totalToCollect: 600, status: 'entregado', createdAt: '2026-11-02', history: [{ status: 'entregado', date: '2026-11-04' }], isPaidToOffice: true },
  { id: 'C', trackingNumber: 'C', storeId: 'one', articleName: 'C', basePrice: 800, deliveryFee: 200, deliveryPayment: 80, status: 'pendiente', createdAt: '2026-11-05', history: [] },
];
const transactions = [{ id: 'TX-A', trackingNumber: 'A', commissionAmount: 100, basePrice: 1000 }];
const rows = reconcileSales(deliveries, transactions, [{ id: 'one', name: 'Uno' }, { id: 'two', name: 'Dos' }]);
const expenses = [
  { amount: 30, date: '2026-11-03', financeScope: 'logistics', storeId: 'one' },
  { amount: 20, date: '2026-11-04', financeScope: 'marketplace' },
  { amount: 10, date: '2026-11-03' },
];
const incomes = [{ amount: 50, date: '2026-11-03', financeScope: 'logistics' }, { amount: 15, date: '2026-11-04', financeScope: 'marketplace' }];

test('operational balance separates freight, drivers, marketplace and general movements', () => {
  const report = financialAudit(rows, expenses, incomes);
  assert.equal(report.delivered.length, 2);
  assert.equal(report.freight, 300);
  assert.equal(report.drivers, 120);
  assert.equal(report.cashToOffice, 1200);
  assert.equal(report.logisticsNet, 200);
  assert.equal(report.marketplaceNet, 95);
  assert.equal(report.generalNet, -10);
  assert.equal(report.net, 285);
});

test('date and store filters constrain delivery rows and associated costs', () => {
  const report = financialAudit(rows, expenses, incomes, { from: '2026-11-03', to: '2026-11-03', storeId: 'one' });
  assert.deepEqual(report.delivered.map(row => row.delivery.id), ['A']);
  assert.equal(report.freight, 200);
  assert.equal(report.logisticsExpenses, 30);
  assert.equal(report.logisticsIncome, 0);
});

test('store settlement applies manual expenses exactly once across selected guides', () => {
  assert.deepEqual(allocateStoreExpenses([100, 200], 150), [
    { gross: 100, deducted: 100, paid: 0 },
    { gross: 200, deducted: 50, paid: 150 },
  ]);
  assert.throws(() => allocateStoreExpenses([100], 101), /superan/);
});

test('historical shipping expenses remain in logistics without a new scope field', () => {
  const report = financialAudit(rows, [{ amount: 25, category: 'Logística', date: '2026-11-03' }], []);
  assert.equal(report.logisticsExpenses, 25);
  assert.equal(report.generalExpenses, 0);
});
