import test from 'node:test';
import assert from 'node:assert/strict';
import { uniqueLogisticsProviders } from '../src/lib/logisticsProviders.ts';

test('duplicate carrier records retain the configured default endpoint and key', () => {
  const providers = uniqueLogisticsProviders([
    { id: 'legacy', code: 'sacha_pack', webhookUrl: 'https://old.example', apiKey: '', isDefault: false, updatedAt: '2026-01-01' },
    { id: 'configured', code: 'sacha_pack', webhookUrl: 'https://configured.example', apiKey: 'saved-key', isDefault: true, updatedAt: '2026-02-01' }
  ]);
  assert.equal(providers.length, 1);
  assert.equal(providers[0].id, 'configured');
  assert.equal(providers[0].webhookUrl, 'https://configured.example');
  assert.equal(providers[0].apiKey, 'saved-key');
});

test('most recently saved provider wins when neither duplicate is default', () => {
  const providers = uniqueLogisticsProviders([
    { id: 'first', code: 'carrier', updatedAt: '2026-01-01', isDefault: false },
    { id: 'second', code: 'carrier', updatedAt: '2026-03-01', isDefault: false }
  ]);
  assert.equal(providers[0].id, 'second');
});
