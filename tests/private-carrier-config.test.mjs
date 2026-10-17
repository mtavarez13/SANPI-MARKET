import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readPrivateCarrierConfigs, savePrivateCarrierConfig } from '../src/lib/privateCarrierConfig.ts';

test('carrier credentials persist privately by provider without overwriting another provider', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sanpi-carrier-test-'));
  process.env.SANPI_PRIVATE_CONFIG_DIR = root;
  try {
    await savePrivateCarrierConfig('prov_sacha_pack', { storeId: 'sacha-1', endpointUrl: 'https://sacha.example.test/orders', apiKey: 'secret-one' });
    await savePrivateCarrierConfig('prov_caribe_pack', { storeId: 'caribe-1', endpointUrl: 'https://caribe.example.test/orders', apiKey: 'secret-two' });
    const configs = await readPrivateCarrierConfigs();
    assert.equal(configs.prov_sacha_pack.apiKey, 'secret-one');
    assert.equal(configs.prov_caribe_pack.storeId, 'caribe-1');
    await savePrivateCarrierConfig('prov_sacha_pack', { storeId: 'sacha-2', endpointUrl: 'https://sacha.example.test/new', apiKey: 'secret-three' });
    const updated = await readPrivateCarrierConfigs();
    assert.equal(updated.prov_sacha_pack.storeId, 'sacha-2');
    assert.equal(updated.prov_caribe_pack.apiKey, 'secret-two');
  } finally {
    delete process.env.SANPI_PRIVATE_CONFIG_DIR;
    await rm(root, { recursive: true, force: true });
  }
});
