import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizedCarrierStatus, parseCarrierUpdate, sachaUpdateFromDocument } from '../src/lib/carrierStatusServer.ts';

test('carrier statuses map to exact shared Firestore strings', () => {
  assert.equal(normalizedCarrierStatus('en_transito'), 'en tránsito');
  assert.equal(normalizedCarrierStatus('DELIVERED'), 'entregado');
  assert.equal(normalizedCarrierStatus('retornado a almacen'), 'retornado a almacén');
  assert.equal(normalizedCarrierStatus('unrecognized'), null);
});

test('carrier callback requires an order identifier and explicit status', () => {
  assert.throws(() => parseCarrierUpdate({ status: 'entregado' }), /Guía/);
  assert.throws(() => parseCarrierUpdate({ externalOrderId: 'SPSANPI-123', status: 'unknown' }), /Estado/);
});

test('carrier callback accepts Sacha delivery event with proof', () => {
  const update = parseCarrierUpdate({
    externalOrderId: 'SPSANPI-M-SSDLC-1792205308513-C61033827A',
    status: 'entregado',
    proofPhotoUrl: 'https://sacha.example.test/proof.jpg'
  });
  assert.equal(update.providerId, 'prov_sacha_pack');
  assert.equal(update.status, 'entregado');
  assert.equal(update.proofPhotoUrl, 'https://sacha.example.test/proof.jpg');
});

test('carrier callback rejects non-HTTPS proof URL', () => {
  assert.throws(() => parseCarrierUpdate({
    externalOrderId: 'SPSANPI-123', status: 'entregado', proofPhotoUrl: 'http://example.test/proof'
  }), /evidencia/);
});

test('carrier callback accepts an embedded image receipt from Sacha', () => {
  const update = parseCarrierUpdate({ externalOrderId: 'SPSANPI-M-12345678', status: 'entregado', proofPhotoUrl: 'data:image/jpeg;base64,AAAA' });
  assert.equal(update.proofPhotoUrl, 'data:image/jpeg;base64,AAAA');
});

test('official Sacha tracking document maps delivery and embedded proof', () => {
  const guide = 'SPSANPI-M-SSDLC-1792205308513-C61033827A';
  const update = sachaUpdateFromDocument(guide, {
    name: `projects/studio-9195671573-fb490/databases/(default)/documents/deliveries/${guide}`,
    updateTime: '2026-10-17T02:49:32Z',
    fields: {
      externalOrderId: { stringValue: guide }, isApiOrder: { booleanValue: true },
      status: { stringValue: 'entregado' }, proofPhotoUrl: { stringValue: 'data:image/jpeg;base64,AAAA' },
      customerName: { stringValue: 'Charina medina' }, customerPhone: { stringValue: '8095551234' },
      totalToCollect: { integerValue: '3780' }, deliveryFee: { integerValue: '450' }
    }
  });
  assert.equal(update.status, 'entregado');
  assert.equal(update.proofPhotoUrl, 'data:image/jpeg;base64,AAAA');
  assert.equal(update.carrierTotalToCollect, 3780);
  assert.equal(update.source, 'sacha-pull');
});

test('Sacha tracking record must match the exact Sanpi guide', () => {
  assert.throws(() => sachaUpdateFromDocument('SPSANPI-M-12345678', {
    name: 'projects/p/databases/(default)/documents/deliveries/OTHER',
    fields: { externalOrderId: { stringValue: 'OTHER' }, isApiOrder: { booleanValue: true }, status: { stringValue: 'entregado' } }
  }), /no corresponde/);
});
