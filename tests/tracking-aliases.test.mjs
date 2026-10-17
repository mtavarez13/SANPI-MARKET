import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesDeliveryGuide, carrierGuideFor } from '../src/lib/trackingAliases.ts';

const delivery = {
  id: 'SANPI-COD-100',
  trackingNumber: 'SANPI-COD-100',
  externalOrderId: 'PEDIDO-100',
  carrierTrackingId: 'SPVS-200',
  sachaPackResponse: { trackingNumber: 'SACHA-300', sachaTrackingId: 'LEGACY-400' },
};

test('the same delivery can be found by Sanpi, order and carrier guides', () => {
  for (const guide of ['sanpi-cod-100', ' pedido-100 ', 'spvs-200', 'sacha-300', 'legacy-400']) {
    assert.equal(matchesDeliveryGuide(delivery, guide), true, guide);
  }
  assert.equal(matchesDeliveryGuide(delivery, 'OTHER-999'), false);
});

test('the customer sees the independent carrier guide', () => {
  assert.equal(carrierGuideFor(delivery), 'SPVS-200');
  assert.equal(carrierGuideFor({ ...delivery, carrierTrackingId: undefined }), 'SACHA-300');
});
