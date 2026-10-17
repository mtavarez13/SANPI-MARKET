function initials(value: string, fallback: string): string {
  const words = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().match(/[A-Z0-9]+/g) || [];
  return (words.map(word => word[0]).join('') || fallback).slice(0, 6);
}

/** A human-readable store and destination prefix followed by a collision-resistant order suffix. */
export function createCodTrackingNumber(storeName: string, province: string, municipality: string): string {
  const storeCode = initials(storeName, 'T');
  const destinationCode = `${initials(province, 'P').slice(0, 1)}${initials(municipality, 'M')}`;
  const random = crypto.getRandomValues(new Uint8Array(5));
  const suffix = Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `SPSANPI-${storeCode}-${destinationCode}-${Date.now()}-${suffix}`;
}
