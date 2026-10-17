import type { LogisticsProviderConfig } from '../types';

/** Prefer the configured default when legacy imports created duplicate carrier records. */
export function uniqueLogisticsProviders(providers: LogisticsProviderConfig[]): LogisticsProviderConfig[] {
  const byCode = new Map<string, LogisticsProviderConfig>();
  for (const provider of providers) {
    const key = provider.code?.trim().toLowerCase() || provider.id;
    const current = byCode.get(key);
    if (!current || (provider.isDefault && !current.isDefault) ||
        (provider.isDefault === current.isDefault && provider.updatedAt > current.updatedAt)) {
      byCode.set(key, provider);
    }
  }
  return [...byCode.values()];
}
