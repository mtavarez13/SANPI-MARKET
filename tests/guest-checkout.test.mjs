import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrustedGuestDocuments, isAllowedGuestCheckoutOrigin, validateGuestOrder } from '../src/lib/guestCheckoutServer.ts';

test('guest checkout accepts SANPI public domains behind a Hostinger proxy', () => {
  assert.equal(isAllowedGuestCheckoutOrigin('https://sanpi.connectchat.tech', 'internal.hostinger.test'), true);
  assert.equal(isAllowedGuestCheckoutOrigin('https://sanpi.com.do', 'internal.hostinger.test'), true);
  assert.equal(isAllowedGuestCheckoutOrigin('http://localhost:3012', 'localhost:3012'), true);
  assert.equal(isAllowedGuestCheckoutOrigin('https://other.example', 'internal.hostinger.test'), false);
  assert.equal(isAllowedGuestCheckoutOrigin('http://sanpi.com.do', 'internal.hostinger.test'), false);
});

const article = { id: 'art_6', storeId: 'store_2', name: 'Producto', price: 1250, costPerItem: 700, stock: 40, status: 'aprobado', isPublic: true };
const store = { id: 'store_2', ownerEmail: 'seller@example.com', plan: 'basic', fulfillmentMode: 'fulfillment' };
const delivery = {
  id: 'SPSP675743358MT',
  trackingNumber: 'SPSP675743358MT',
  externalOrderId: 'SPSP675743358MT',
  createdByUid: 'guest',
  isMarketplaceOrder: true,
  articleId: article.id,
  storeId: article.storeId,
  quantity: 1,
  unitPriceAtSale: 1250,
  basePrice: 1250,
  shippingFee: 350,
  deliveryFee: 350,
  totalCodAmount: 1600,
  totalToCollect: 1600,
  deliveryPayment: 0,
  isPaidToOffice: false,
  paymentMethod: 'COD',
  status: 'pendiente',
  customerName: 'Cliente Prueba',
  customerPhone: '8095551234',
  province: 'Santiago',
  city: 'Santiago',
  address: 'Calle Principal 5'
};
const transaction = {
  id: 'tx_1760000000000',
  trackingNumber: delivery.trackingNumber,
  createdByUid: 'guest',
  isMarketplaceOrder: true,
  articleId: article.id,
  storeId: article.storeId,
  quantity: 1,
  basePrice: 1250,
  shippingFee: 350,
  total: 1600,
  paymentMethod: 'COD',
  status: 'pendiente'
};

test('valid COD order from a visitor can be prepared without Firebase identity', () => {
  assert.equal(validateGuestOrder(delivery, transaction, article), null);
});

test('visitor cannot submit a lower price or altered freight', () => {
  assert.match(validateGuestOrder({ ...delivery, unitPriceAtSale: 1 }, transaction, article), /Precio/);
  assert.match(validateGuestOrder({ ...delivery, deliveryFee: 0 }, transaction, article), /Totales/);
});

test('visitor cannot submit another transaction, product or payment method', () => {
  assert.match(validateGuestOrder(delivery, { ...transaction, trackingNumber: 'OTHER' }, article), /guía/);
  assert.match(validateGuestOrder({ ...delivery, articleId: 'another' }, transaction, article), /Artículo/);
  assert.match(validateGuestOrder({ ...delivery, paymentMethod: 'bank_transfer' }, transaction, article), /contra entrega/);
});

test('hidden or out-of-stock articles are rejected', () => {
  assert.match(validateGuestOrder(delivery, transaction, { ...article, isPublic: false }), /no disponible/);
  assert.match(validateGuestOrder(delivery, transaction, { ...article, stock: 0 }), /no disponible/);
});

test('server derives financial fields and stock-relevant values from trusted records', () => {
  const trusted = buildTrustedGuestDocuments(
    { ...delivery, logisticsProviderId: 'prov_sacha_pack', unitCostAtSale: 1, dropshipperProfit: 999999 },
    { ...transaction, commissionRate: 0, commissionAmount: 0 }, article, store
  );
  assert.equal(trusted.delivery.unitCostAtSale, 700);
  assert.equal(trusted.delivery.dropshipperProfit, undefined);
  assert.equal(trusted.transaction.commissionRate, 0.15);
  assert.equal(trusted.transaction.commissionAmount, 188);
  assert.equal(trusted.delivery.status, 'pendiente');
});

test('active landing page price is verified without requiring registration', () => {
  const page = { slug: 'oferta-uno', active: true, productId: article.id, originalStoreId: article.storeId, customSellingPrice: 1500, ownerType: 'dropshipper', ownerId: 'user-1', ownerName: 'Socio', wholesalePrice: 1000 };
  const landingDelivery = { ...delivery, sourceType: 'landing_page', landingPageSlug: page.slug, logisticsProviderId: 'prov_sacha_pack', unitPriceAtSale: 1500, basePrice: 1500, totalCodAmount: 1850, totalToCollect: 1850 };
  const landingTransaction = { ...transaction, sourceType: 'landing_page', basePrice: 1500, total: 1850 };
  const trusted = buildTrustedGuestDocuments(landingDelivery, landingTransaction, article, store, page);
  assert.equal(trusted.delivery.dropshipperId, 'user-1');
  assert.equal(trusted.delivery.dropshipperProfit, 500);
  assert.equal(trusted.transaction.total, 1850);
  assert.match(validateGuestOrder(landingDelivery, landingTransaction, article, store, { ...page, active: false }), /Landing page/);
});
