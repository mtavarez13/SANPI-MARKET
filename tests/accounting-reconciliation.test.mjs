import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileSales } from '../src/lib/accountingReconciliation.ts';
import { normalizeDeliveryStatus } from '../src/lib/deliveryWorkflow.ts';

test('legacy delivery spellings are recognized for accounting without changing Firestore write values', () => {
  for (const old of ['entregada', 'entregado al cliente', 'entrega completada', 'delivered', 'completed', 'completada']) {
    assert.equal(normalizeDeliveryStatus(old), 'entregado');
  }
  assert.equal(normalizeDeliveryStatus('retornado a almacen'), 'retornado a almacén');
});

test('every delivered guide appears once, including one without a historical transaction', () => {
  const deliveries = [
    { id: 'S-1', trackingNumber: 'S-1', storeId: 'store-1', articleName: 'Zapatos', basePrice: 1500, shippingFee: 350, dropshipperProfit: 100, status: 'completed', createdAt: '2026-10-01', history: [{ status: 'entregado', date: '2026-10-03' }] },
    { id: 'S-2', trackingNumber: 'S-2', storeId: 'store-1', articleName: 'Bolso', basePrice: 900, shippingFee: 350, status: 'entregado', createdAt: '2026-10-02', history: [] },
  ];
  const transactions = [{ id: 'TX-1', trackingNumber: 'S-1', basePrice: 1500, commissionAmount: 150 }];
  const rows = reconcileSales(deliveries, transactions, [{ id: 'store-1', name: 'Tienda Uno' }]);
  assert.equal(rows.length, 2);
  assert.equal(rows.filter(row => row.delivered).length, 2);
  assert.equal(rows[0].transaction?.id, 'TX-1');
  assert.equal(rows[0].storePayable, 1250);
  assert.equal(rows[0].deliveredAt, '2026-10-03');
  assert.equal(rows[1].transaction, undefined);
  assert.equal(rows[1].hasConfirmedCommission, false);
});
