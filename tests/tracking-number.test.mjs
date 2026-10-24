import test from 'node:test';
import assert from 'node:assert/strict';
import { createCodTrackingNumber } from '../src/lib/trackingNumber.ts';

test('COD guides use SPSP, nine digits and two store initials', () => {
  const guide = createCodTrackingNumber('Moda Caribe', 'Santiago', 'Santiago de los Caballeros');
  assert.match(guide, /^SPSP\d{9}MC$/);
});

test('guides normalize accents, handle missing names, and remain unique', () => {
  const first = createCodTrackingNumber('Éxito Ágil', 'La Romana', 'San José');
  const second = createCodTrackingNumber('Éxito Ágil', 'La Romana', 'San José');
  assert.match(first, /^SPSP\d{9}EA$/);
  assert.notEqual(first, second);
  assert.match(createCodTrackingNumber('Moda', '', ''), /^SPSP\d{9}MO$/);
  assert.match(createCodTrackingNumber('', '', ''), /^SPSP\d{9}SP$/);
});
