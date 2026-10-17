import test from 'node:test';
import assert from 'node:assert/strict';
import { createCodTrackingNumber } from '../src/lib/trackingNumber.ts';

test('COD guides include store initials and province plus municipality initials', () => {
  const guide = createCodTrackingNumber('Moda Caribe', 'Santiago', 'Santiago de los Caballeros');
  assert.match(guide, /^SPSANPI-MC-SSDLC-\d{13}-[A-F0-9]{10}$/);
});

test('guides normalize accents, handle missing names, and remain unique', () => {
  const first = createCodTrackingNumber('Éxito Ágil', 'La Romana', 'San José');
  const second = createCodTrackingNumber('Éxito Ágil', 'La Romana', 'San José');
  assert.match(first, /^SPSANPI-EA-LSJ-/);
  assert.notEqual(first, second);
  assert.match(createCodTrackingNumber('', '', ''), /^SPSANPI-T-PM-/);
});
