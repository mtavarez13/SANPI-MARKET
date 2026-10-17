import assert from 'node:assert/strict';
import { test } from 'node:test';
import { belongsToCustomer } from '../src/lib/customerPurchases.ts';

test('purchase history is bound to the authenticated Firebase UID', () => {
  assert.equal(belongsToCustomer({ createdByUid: 'buyer-1' }, 'buyer-1'), true);
  assert.equal(belongsToCustomer({ createdByUid: 'buyer-2' }, 'buyer-1'), false);
  assert.equal(belongsToCustomer({ createdByUid: 'guest', customerEmail: 'buyer@example.com' }, 'buyer-1'), false);
  assert.equal(belongsToCustomer({ customerEmail: 'buyer@example.com' }, 'buyer-1'), false);
  assert.equal(belongsToCustomer({ createdByUid: 'buyer-1' }, ''), false);
});
