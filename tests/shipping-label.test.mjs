import assert from 'node:assert/strict';
import test from 'node:test';
import { writeFileSync } from 'node:fs';
import { createShippingLabelPdf, shippingLabelData, THERMAL_LABEL_MM } from '../src/lib/shippingLabel.ts';

const order = {
  id: 'SPSANPI-M-SSDLC-123', trackingNumber: 'SPSANPI-M-SSDLC-123',
  carrierTrackingId: 'SACHA-789', customerName: 'Ana Pérez', customerPhone: '8095551234',
  province: 'Monte Cristi', city: 'Las Matas', address: 'Calle Duarte 30',
  articleName: 'Producto A', quantity: 2, paymentMethod: 'COD', totalToCollect: 1890,
  createdAt: '2026-10-23T12:00:00.000Z', logisticsProviderName: 'Sacha Pack',
  storeId: 'store-1', senderName: 'Tienda Centro', senderPhone: '8095556789',
  senderProvince: 'Santiago', senderAddress: 'Calle Sol 5',
};

test('thermal label uses exact 4 by 6 inch dimensions and both tracking guides', () => {
  assert.deepEqual(THERMAL_LABEL_MM, { width: 101.6, height: 152.4 });
  const label = shippingLabelData(order);
  assert.equal(label.guide, order.trackingNumber);
  assert.equal(label.carrierGuide, 'SACHA-789');
  assert.equal(label.scanGuide, 'SACHA-789');
  assert.equal(label.carrier, 'SACHA PACK');
  assert.equal(label.routeLetter, 'M');
  assert.equal(label.senderAddress, 'Calle Sol 5');
  assert.equal(label.recipientName, 'Ana Pérez');
  assert.equal(label.quantity, 2);
  assert.match(label.collect, /1[,.]890/);
});

test('prepaid label cannot ask the carrier to collect COD', () => {
  const label = shippingLabelData({ ...order, paymentMethod: 'transferencia' });
  assert.equal(label.payment, 'PAGADO / TRANSFERENCIA');
  assert.match(label.collect, /0[,.]00/);
});

test('legacy contra entrega payment remains COD on the label', () => {
  const label = shippingLabelData({ ...order, paymentMethod: 'contra entrega' });
  assert.equal(label.payment, 'CONTRA ENTREGA');
  assert.match(label.collect, /1[,.]890/);
});

test('older orders can use current store sender details', () => {
  const { senderName, senderPhone, senderProvince, senderAddress, ...legacy } = order;
  const label = shippingLabelData(legacy, {
    name: 'Tienda Antigua', province: 'Santiago', pickupAddress: 'Av. 27 de Febrero',
    contact: { phone: '8091112222', email: 'contacto@example.com' },
  });
  assert.equal(label.senderName, 'Tienda Antigua');
  assert.equal(label.senderPhone, '8091112222');
  assert.equal(label.senderAddress, 'Av. 27 de Febrero');
});

test('PDF renders as one 4 by 6 inch page with scannable guides', async () => {
  const { default: bwipjs } = await import('bwip-js/node');
  const renderCode = async (bcid, text) => new Uint8Array(await bwipjs.toBuffer({
    bcid, text, scale: 3, height: 9, paddingwidth: 0, paddingheight: 0, includetext: false,
  }));
  const pdf = await createShippingLabelPdf({
    ...order,
    trackingNumber: 'SPSANPI-M-SSDLC-1792205308513-C61033827A',
    carrierTrackingId: 'ORD-000001680',
    address: 'Calle Duarte No. 30, sector Centro, próximo al parque municipal de Las Matas de Santa Cruz',
    senderAddress: 'Av. 27 de Febrero No. 10, sector Los Jardines, Santiago',
    senderContactName: 'Miguelina Álvarez',
    notes: 'Llamar antes de entregar',
    articleName: 'Banda multifuncional con pedal para ejercicios',
  }, undefined, renderCode);
  assert.equal(pdf.internal.getNumberOfPages(), 1);
  assert.ok(Math.abs(pdf.internal.pageSize.getWidth() - 101.6) < 0.01);
  assert.ok(Math.abs(pdf.internal.pageSize.getHeight() - 152.4) < 0.01);
  const bytes = Buffer.from(pdf.output('arraybuffer'));
  assert.ok(bytes.length > 3000);
  if (process.env.SANPI_LABEL_SAMPLE_PDF) writeFileSync(process.env.SANPI_LABEL_SAMPLE_PDF, bytes);
});
