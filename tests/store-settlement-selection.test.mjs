import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canSettleStoreOrder } from '../src/lib/storeSettlementSelection.ts';

const row = { delivery: { id: 'A', storeId: 'store-a' }, delivered: true, hasConfirmedCommission: true, storePayable: 1250 };

test('only delivered, unpaid orders with confirmed positive store payment are selectable', () => {
  assert.equal(canSettleStoreOrder(row), true);
  assert.equal(canSettleStoreOrder({ ...row, delivered: false }), false);
  assert.equal(canSettleStoreOrder({ ...row, hasConfirmedCommission: false }), false);
  assert.equal(canSettleStoreOrder({ ...row, storePayable: 0 }), false);
  assert.equal(canSettleStoreOrder({ ...row, delivery: { ...row.delivery, storePaidAt: '2026-11-18' } }), false);
  assert.equal(canSettleStoreOrder(undefined), false);
});

test('a liquidation selects orders for one store only', () => {
  assert.equal(canSettleStoreOrder(row, 'store-a'), true);
  assert.equal(canSettleStoreOrder(row, 'store-b'), false);
});
