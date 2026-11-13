import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAccessPimdrop } from '../src/lib/pimdropAccess.ts';

const partner = { uid: 'owner-a', email: 'owner@example.test', role: 'partner' };
const fullStore = { ownerId: 'owner-a', ownerEmail: 'owner@example.test', plan: 'full', isActive: true, status: 'approved' };

test('Pimdrop opens only for an active Full store owned by the partner', () => {
  assert.equal(canAccessPimdrop(partner, [fullStore]), true);
  assert.equal(canAccessPimdrop(partner, [{ ...fullStore, ownerId: 'legacy', ownerEmail: ' OWNER@example.test ' }]), true);
  assert.equal(canAccessPimdrop(partner, [{ ...fullStore, plan: ' Full ' }]), true);
});

test('other plans and inactive or unapproved stores cannot open Pimdrop', () => {
  for (const store of [
    { ...fullStore, plan: 'basic' },
    { ...fullStore, plan: 'pro' },
    { ...fullStore, plan: 'elite' },
    { ...fullStore, isActive: false },
    { ...fullStore, status: 'pending' },
    { ...fullStore, status: 'rejected' },
    { ...fullStore, ownerId: 'other', ownerEmail: 'other@example.test' },
  ]) assert.equal(canAccessPimdrop(partner, [store]), false);
});

test('a Full store does not grant Pimdrop to another role or a visitor', () => {
  for (const user of [null, { ...partner, role: 'dropshipper' }, { ...partner, role: 'customer' }, { ...partner, role: 'admin' }]) {
    assert.equal(canAccessPimdrop(user, [fullStore]), false);
  }
});
