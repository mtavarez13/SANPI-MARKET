import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visibleOrders, canViewOrders, isDropshippingOrder, ORDER_STATUSES } from '../src/lib/orderVisibility.ts';
const user = (role, uid = 'seller-a', email = 'a@example.test') => ({ role, uid, email });
const stores = [{ id: 'a', ownerId: 'seller-a' }, { id: 'b', ownerId: 'seller-b' }, { id: 'legacy', ownerId: 'subscription-id', ownerEmail: ' A@example.test ' }];
const pages = [{ slug: 'my-page', ownerId: 'seller-a' }, { slug: 'other-page', ownerId: 'seller-b' }];
const orders = [
 { id: '1', storeId: 'a' }, { id: '2', storeId: 'b', dropshipperId: 'seller-a' },
 { id: '3', storeId: 'a', dropshipperId: 'seller-b' },
 { id: '4', storeId: 'b', landingPageSlug: 'my-page', sourceType: 'landing_page' },
 { id: '5', storeId: 'legacy' },
 { id: '6', storeId: 'b', landingPageSlug: 'my-page', dropshipperId: 'seller-b' },
 { id: '7', storeId: 'b', dropshipperName: 'a@example.test', landingPageSlug: 'other-page' }
];
const ids = u => visibleOrders(u, orders, stores, pages).map(o => o.id);
test('admin sees orders from every store and channel', () => assert.equal(ids(user('admin')).length, orders.length));
test('partner sees only owned stores, including exact legacy email association', () => assert.deepEqual(ids(user('partner')), ['1','3','5']));
test('dropshipper sees own store sales, attributed sales and legacy page orders', () => assert.deepEqual(ids(user('dropshipper')), ['1','2','3','4','5']));
test('customers, carriers, suppliers and signed-out sessions have no panel', () => {
 for (const u of [null, user('customer'), user('carrier'), user('supplier')]) { assert.deepEqual(ids(u), []); assert.equal(canViewOrders(u), false); }
});
test('another dropshipper sees their own stores and attributed sales', () => assert.deepEqual(ids(user('dropshipper','seller-b','b@example.test')), ['2','3','4','6','7']));
test('missing identity cannot grant access, even with super-admin flag', () => assert.deepEqual(visibleOrders(user('admin',''), orders, stores, pages, true), []));
test('existing super-admin override is supported for identified users', () => assert.equal(visibleOrders(user('customer'), orders, stores, pages, true).length, orders.length));
test('empty email never matches an unowned store', () => assert.deepEqual(visibleOrders(user('partner','unknown',null),orders,stores,pages), []));
test('display names and partial emails never grant store ownership', () => assert.deepEqual(ids({...user('partner','unknown','example.test'), storeName:'a'}), []));
test('channels include legacy landing-page orders', () => { assert.equal(isDropshippingOrder(orders[0]),false); assert.equal(isDropshippingOrder(orders[1]),true); assert.equal(isDropshippingOrder(orders[3]),true); });
test('all eight delivery statuses are represented', () => assert.equal(Object.keys(ORDER_STATUSES).length,8));

test('another explicit dropshipper UID overrides a legacy page match outside owned stores', () => assert.deepEqual(visibleOrders(user('dropshipper'), [orders[5]], stores, pages), []));
