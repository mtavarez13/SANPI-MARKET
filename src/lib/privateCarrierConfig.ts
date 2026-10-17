import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export interface PrivateCarrierConfig {
  storeId: string;
  endpointUrl: string;
  apiKey: string;
  updatedAt: string;
}

export const privateCarrierConfigPath = () => path.join(
  process.env.SANPI_PRIVATE_CONFIG_DIR || homedir(),
  '.sanpi-market',
  'carrier-config.json'
);

export async function readPrivateCarrierConfigs(): Promise<Record<string, PrivateCarrierConfig>> {
  try {
    const contents = await readFile(privateCarrierConfigPath(), 'utf8');
    return JSON.parse(contents) as Record<string, PrivateCarrierConfig>;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}

export async function savePrivateCarrierConfig(providerId: string, config: Omit<PrivateCarrierConfig, 'updatedAt'>): Promise<void> {
  const file = privateCarrierConfigPath();
  const configs = await readPrivateCarrierConfigs();
  configs[providerId] = { ...config, updatedAt: new Date().toISOString() };
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporaryFile = `${file}.${process.pid}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(configs), { mode: 0o600 });
  await rename(temporaryFile, file);
}
