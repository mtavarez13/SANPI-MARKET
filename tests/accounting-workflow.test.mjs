import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DELIVERY_STATUSES, normalizeDeliveryStatus, initialDeliveryStatus, totalToCollect, validateDeliveryTransition } from '../src/lib/deliveryWorkflow.ts';
import { accountingScope } from '../src/lib/accountingScope.ts';

const delivery = (status = 'pendiente', extra = {}) => ({ id: 'g1', trackingNumber: 'g1', status, storeId: 'store-a', articleId: 'article-a', ...extra });
const users = {
  partner: { uid: 'owner-a', email: 'owner@example.test', role: 'partner' },
  drop: { uid: 'drop-a', email: 'drop@example.test', role: 'dropshipper' },
  supplier: { uid: 'supplier-a', email: 'supplier@example.test', role: 'supplier' },
  carrier: { uid: 'carrier-a', email: 'carrier@example.test', role: 'carrier' },
  customer: { uid: 'buyer', email: 'buyer@example.test', role: 'customer' }
};
const stores = [{ id:'store-a', ownerId:'owner-a' }, { id:'store-b', ownerId:'other' }];
const articles = [{ id:'article-a', storeId:'store-a' }, { id:'article-b', storeId:'store-b', supplierId:'supplier-a' }];
const deliveries = [delivery(), delivery('entregado',{id:'g2',storeId:'store-b',articleId:'article-b',dropshipperId:'drop-a',carrierId:'carrier-a'}), delivery('pendiente de retorno',{id:'g3',storeId:'store-b',articleId:'article-b'})];
const expenses = [{id:'e1',userId:'owner-a'},{id:'e2',userId:'other'}];
const ids = user => accountingScope(user,stores,articles,deliveries,expenses,[]);

test('all eight exact Firestore status values are supported', () => assert.deepEqual(DELIVERY_STATUSES,[
 'pendiente','pendiente de recoger pickup','en tránsito','entregado','reprogramado','pendiente de retorno','retornado a almacén','cancelado']));
test('older status spellings normalize for display and migration', () => { assert.equal(normalizeDeliveryStatus('en_transito'),'en tránsito'); assert.equal(normalizeDeliveryStatus('intento_fallido'),'pendiente de retorno'); });
test('fulfillment and pickup checkout states differ', () => { assert.equal(initialDeliveryStatus({fulfillmentMode:'fulfillment'}),'pendiente'); assert.equal(initialDeliveryStatus({fulfillmentMode:'pickup'}),'pendiente de recoger pickup'); assert.equal(initialDeliveryStatus({fulfillmentMode:'shop_point'}),'pendiente de recoger pickup'); });
test('COD amount includes freight; prepaid amounts do not collect at door', () => { assert.equal(totalToCollect(1500,350,'COD'),1850); assert.equal(totalToCollect(1500,350,'transferencia'),0); });
test('pickup must be physically received before dispatch', () => { assert.match(validateDeliveryTransition(delivery('pendiente de recoger pickup'),'en tránsito',{deliveryPersonId:'driver'}),/recepción/); assert.equal(validateDeliveryTransition(delivery('pendiente de recoger pickup'),'pendiente'),null); });
test('driver and proof are required for last mile', () => { assert.match(validateDeliveryTransition(delivery(),'en tránsito'),/repartidor/); assert.equal(validateDeliveryTransition(delivery(),'en tránsito',{deliveryPersonId:'driver'}),null); assert.match(validateDeliveryTransition(delivery('en tránsito',{deliveryPersonId:'driver'}),'entregado'),/foto/); assert.equal(validateDeliveryTransition(delivery('en tránsito',{deliveryPersonId:'driver'}),'entregado',{proofPhotoUrl:'data:image/png;base64,AA'}),null); });
test('return and cancellation transitions honor workflow', () => { assert.match(validateDeliveryTransition(delivery('pendiente'),'retornado a almacén'),/primero/); assert.equal(validateDeliveryTransition(delivery('pendiente de retorno'),'retornado a almacén'),null); assert.match(validateDeliveryTransition(delivery('en tránsito'),'cancelado'),/antes del despacho/); });
test('same-state edits cannot remove route assignment or delivery evidence', () => {
 assert.match(validateDeliveryTransition(delivery('en tránsito',{deliveryPersonId:'driver'}),'en tránsito',{deliveryPersonId:''}),/repartidor/);
 assert.match(validateDeliveryTransition(delivery('entregado',{proofPhotoUrl:'photo'}),'entregado',{proofPhotoUrl:' '}),/foto/);
});
test('unknown statuses and invalid driver payments are rejected', () => {
 assert.match(validateDeliveryTransition(delivery(),'unknown'),/válido/);
 assert.match(validateDeliveryTransition(delivery(),'pendiente',{deliveryPayment:-1}),/pago/);
 assert.match(validateDeliveryTransition(delivery(),'pendiente',{deliveryPayment:NaN}),/pago/);
});
test('customer has no accounting records', () => assert.deepEqual(ids(users.customer),{articles:[],deliveries:[],expenses:[]}));
test('partner only sees own store products, orders and expenses', () => {const x=ids(users.partner);assert.deepEqual(x.articles.map(a=>a.id),['article-a']);assert.deepEqual(x.deliveries.map(d=>d.id),['g1']);assert.deepEqual(x.expenses.map(e=>e.id),['e1']);});
test('dropshipper sees attributed order', () => assert.deepEqual(ids(users.drop).deliveries.map(d=>d.id),['g2']));
test('supplier and carrier see their associated orders', () => {assert.deepEqual(ids(users.supplier).deliveries.map(d=>d.id),['g2','g3']); assert.deepEqual(ids(users.carrier).deliveries.map(d=>d.id),['g2']);});
