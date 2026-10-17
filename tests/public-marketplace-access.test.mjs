import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canOpenMarketplaceView, isPublicMarketplaceUser } from '../src/lib/publicMarketplaceAccess.ts';

test('visitors and customers cannot open operational modules', () => {
  for (const user of [null, { role: 'customer', uid: 'customer-1' }]) {
    assert.equal(isPublicMarketplaceUser(user), true);
    for (const view of ['explore', 'catalogs', 'landing_page', 'seller_landing', 'track']) {
      assert.equal(canOpenMarketplaceView(user, view), true, view);
    }
    for (const view of ['orders', 'admin', 'accounting', 'dropship', 'carrier', 'supplier', 'featured', 'partner']) {
      assert.equal(canOpenMarketplaceView(user, view), false, view);
    }
  }
});

test('only a signed-in customer can open Mis compras', () => {
  assert.equal(canOpenMarketplaceView(null, 'purchases'), false);
  assert.equal(canOpenMarketplaceView({ role: 'customer', uid: 'customer-1' }, 'purchases'), true);
  assert.equal(canOpenMarketplaceView({ role: 'partner', uid: 'partner-1' }, 'purchases'), false);
});

test('operational roles retain panels and the established super-admin override', () => {
  assert.equal(canOpenMarketplaceView({ role: 'partner' }, 'orders'), true);
  assert.equal(canOpenMarketplaceView({ role: 'admin' }, 'admin'), true);
  assert.equal(canOpenMarketplaceView({ role: 'customer' }, 'admin', true), true);
});
