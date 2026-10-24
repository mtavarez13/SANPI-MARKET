function initials(value: string, fallback: string): string {
  const words = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().match(/[A-Z0-9]+/g) || [];
  return (words.map(word => word[0]).join('') || fallback).slice(0, 6);
}

/** Sanpi order guide: SPSP + nine digits + two store initials (for example SPSP675743358MT). */
export function createCodTrackingNumber(storeName: string, _province: string, _municipality: string): string {
  const words = storeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().match(/[A-Z0-9]+/g) || [];
  const storeCode = (words.length > 1 ? initials(storeName, 'SP') : words[0] || 'SP').padEnd(2, 'P').slice(0, 2);
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  const digits = String(random % 1_000_000_000).padStart(9, '0');
  return `SPSP${digits}${storeCode}`;
}
