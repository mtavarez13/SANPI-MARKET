import type { Delivery } from '../types';

export const normalizeGuide = (value: string) => value.trim().toLocaleUpperCase('es-DO');

export const deliveryGuides = (delivery: Delivery): string[] => Array.from(new Set([
  delivery.trackingNumber,
  delivery.id,
  delivery.externalOrderId,
  delivery.carrierTrackingId,
  delivery.sachaPackResponse?.trackingNumber,
  delivery.sachaPackResponse?.sachaTrackingId,
].filter((value): value is string => Boolean(value?.trim()))));

export const matchesDeliveryGuide = (delivery: Delivery, guide: string) =>
  deliveryGuides(delivery).some(value => normalizeGuide(value) === normalizeGuide(guide));

export const carrierGuideFor = (delivery: Delivery): string | undefined =>
  [delivery.carrierTrackingId, delivery.sachaPackResponse?.trackingNumber, delivery.sachaPackResponse?.sachaTrackingId]
    .find(value => value?.trim() && normalizeGuide(value) !== normalizeGuide(delivery.trackingNumber));
