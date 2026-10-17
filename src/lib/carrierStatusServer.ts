import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { serverFirestore } from './guestCheckoutServer';
import type { DeliveryStatus } from '../types';

const PROVIDER_ID = /^prov_[a-z0-9_-]{1,80}$/i;
const GUIDE = /^[a-z0-9_-]{4,120}$/i;

export class CarrierStatusError extends Error {
  constructor(message: string, public readonly statusCode = 400) { super(message); }
}

export function normalizedCarrierStatus(input: unknown): DeliveryStatus | null {
  const value = String(input || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const statuses: Record<string, DeliveryStatus> = {
    pendiente: 'pendiente', pending: 'pendiente',
    'pendiente de recoger pickup': 'pendiente de recoger pickup',
    'en transito': 'en tránsito', 'in transit': 'en tránsito', 'in route': 'en tránsito',
    entregado: 'entregado', entregada: 'entregado', delivered: 'entregado',
    completed: 'entregado', completado: 'entregado', completada: 'entregado',
    reprogramado: 'reprogramado', reprogramada: 'reprogramado', rescheduled: 'reprogramado',
    'pendiente de retorno': 'pendiente de retorno', 'intento fallido': 'pendiente de retorno',
    'retornado a almacen': 'retornado a almacén', returned: 'retornado a almacén',
    cancelado: 'cancelado', cancelada: 'cancelado', cancelled: 'cancelado', canceled: 'cancelado'
  };
  return statuses[value] || null;
}

export interface CarrierUpdate {
  providerId: string;
  identifiers: string[];
  status: DeliveryStatus;
  proofPhotoUrl?: string;
  carrierTrackingId?: string;
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  notes?: string;
  eventTimestamp: string;
  verifiedCustomerPhone?: string;
  verifiedCustomerName?: string;
  carrierTotalToCollect?: number;
  carrierDeliveryFee?: number;
  source?: 'sacha-pull';
}

export function parseCarrierUpdate(body: Record<string, unknown>): CarrierUpdate {
  const providerId = String(body.providerId || 'prov_sacha_pack').trim();
  if (!PROVIDER_ID.test(providerId)) throw new CarrierStatusError('Transportista inválido.');
  const identifiers = [body.externalOrderId, body.trackingNumber, body.carrierTrackingId]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .map(value => value.trim());
  if (!identifiers.length || identifiers.some(value => !GUIDE.test(value)))
    throw new CarrierStatusError('Guía o identificador de orden inválido.');
  const status = normalizedCarrierStatus(body.status);
  if (!status) throw new CarrierStatusError('Estado de entrega desconocido.');
  const proofPhotoUrl = String(body.proofPhotoUrl || body.podPhotoUrl || '').trim();
  const validProof = /^https:\/\//i.test(proofPhotoUrl) && proofPhotoUrl.length <= 2000 ||
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(proofPhotoUrl) && proofPhotoUrl.length <= 200_000;
  if (proofPhotoUrl && !validProof)
    throw new CarrierStatusError('URL de evidencia inválida.');
  const timestamp = String(body.eventTimestamp || body.deliveredAt || '').trim();
  const parsed = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now() + 5 * 60_000)
    throw new CarrierStatusError('Fecha del evento inválida.');
  return {
    providerId, identifiers: [...new Set(identifiers)], status,
    ...(proofPhotoUrl ? { proofPhotoUrl } : {}),
    ...(typeof body.carrierTrackingId === 'string' ? { carrierTrackingId: body.carrierTrackingId.trim() } : {}),
    ...(typeof body.courierId === 'string' ? { courierId: body.courierId.slice(0, 120) } : {}),
    ...(typeof body.courierName === 'string' ? { courierName: body.courierName.slice(0, 120) } : {}),
    ...(typeof body.courierPhone === 'string' ? { courierPhone: body.courierPhone.slice(0, 40) } : {}),
    ...(typeof body.notes === 'string' ? { notes: body.notes.slice(0, 500) } : {}),
    eventTimestamp: parsed.toISOString()
  };
}

const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

export async function hasCarrierWebhookSecret(providerId: string): Promise<boolean> {
  if (!PROVIDER_ID.test(providerId)) return false;
  const doc = await serverFirestore().collection('carrier_webhook_credentials').doc(providerId).get();
  return Boolean(doc.data()?.secretHash);
}

export async function rotateCarrierWebhookSecret(providerId: string): Promise<string> {
  if (!PROVIDER_ID.test(providerId)) throw new CarrierStatusError('Transportista inválido.');
  const secret = `whsec_${randomBytes(32).toString('base64url')}`;
  await serverFirestore().collection('carrier_webhook_credentials').doc(providerId).set({
    secretHash: hashSecret(secret), updatedAt: new Date().toISOString()
  });
  return secret;
}

export async function authenticateCarrierWebhook(providerId: string, supplied: string): Promise<boolean> {
  if (!PROVIDER_ID.test(providerId) || !supplied) return false;
  const doc = await serverFirestore().collection('carrier_webhook_credentials').doc(providerId).get();
  const saved = String(doc.data()?.secretHash || '');
  if (!/^[a-f0-9]{64}$/.test(saved)) return false;
  const expected = Buffer.from(saved, 'hex');
  const actual = Buffer.from(hashSecret(supplied), 'hex');
  return timingSafeEqual(expected, actual);
}

export async function applyCarrierUpdate(update: CarrierUpdate): Promise<{ trackingNumber: string; status: DeliveryStatus; changed: boolean }> {
  const db = serverFirestore();
  const collection = db.collection('deliveries');
  let deliveryRef = update.identifiers.find(value => value.startsWith('SPSANPI-'))
    ? collection.doc(update.identifiers.find(value => value.startsWith('SPSANPI-'))!) : null;
  if (deliveryRef && !(await deliveryRef.get()).exists) deliveryRef = null;
  if (!deliveryRef) {
    for (const field of ['externalOrderId', 'trackingNumber', 'carrierTrackingId'] as const) {
      for (const identifier of update.identifiers) {
        const found = await collection.where(field, '==', identifier).limit(2).get();
        if (found.size > 1) throw new CarrierStatusError('La guía coincide con varias órdenes.', 409);
        if (found.size === 1) { deliveryRef = found.docs[0].ref; break; }
      }
      if (deliveryRef) break;
    }
  }
  if (!deliveryRef) throw new CarrierStatusError('Orden no encontrada en Sanpi.', 404);
  const transactionQuery = await db.collection('transactions').where('trackingNumber', '==', deliveryRef.id).limit(2).get();
  if (transactionQuery.size > 1) throw new CarrierStatusError('Varias transacciones para esta orden.', 409);
  const transactionRef = transactionQuery.docs[0]?.ref;
  return db.runTransaction(async tx => {
    const deliverySnapshot = await tx.get(deliveryRef!);
    if (!deliverySnapshot.exists) throw new CarrierStatusError('Orden no encontrada en Sanpi.', 404);
    const delivery = deliverySnapshot.data() || {};
    if (delivery.logisticsProviderId !== update.providerId)
      throw new CarrierStatusError('La orden pertenece a otro transportista.', 403);
    if (!update.identifiers.some(id => [deliverySnapshot.id, delivery.trackingNumber, delivery.externalOrderId,
      delivery.carrierTrackingId, delivery.sachaPackResponse?.trackingNumber, delivery.sachaPackResponse?.sachaTrackingId].includes(id)))
      throw new CarrierStatusError('La guía no corresponde a la orden.', 403);
    if (update.verifiedCustomerPhone && update.verifiedCustomerPhone.replace(/\D/g, '') !== String(delivery.customerPhone || '').replace(/\D/g, ''))
      throw new CarrierStatusError('El destinatario de Sacha no coincide con Sanpi.', 409);
    if (update.verifiedCustomerName && update.verifiedCustomerName.trim().toLocaleLowerCase('es-DO') !== String(delivery.customerName || '').trim().toLocaleLowerCase('es-DO'))
      throw new CarrierStatusError('El destinatario de Sacha no coincide con Sanpi.', 409);
    if (['entregado', 'retornado a almacén', 'cancelado'].includes(delivery.status) && delivery.status !== update.status)
      throw new CarrierStatusError('La orden ya tiene un estado final distinto.', 409);
    if (update.status === 'entregado' && !update.proofPhotoUrl && !delivery.proofPhotoUrl)
      throw new CarrierStatusError('Sacha debe adjuntar proofPhotoUrl para confirmar la entrega.', 422);
    if (delivery.status === update.status) return { trackingNumber: deliverySnapshot.id, status: update.status, changed: false };
    if (transactionRef) await tx.get(transactionRef);
    const now = new Date().toISOString();
    tx.update(deliveryRef!, {
      status: update.status,
      history: [...(Array.isArray(delivery.history) ? delivery.history : []), {
        status: update.status, date: update.eventTimestamp,
        note: update.notes || `Actualización autenticada de ${update.providerId}.`
      }],
      ...(update.proofPhotoUrl ? { proofPhotoUrl: update.proofPhotoUrl } : {}),
      ...(update.carrierTrackingId ? { carrierTrackingId: update.carrierTrackingId } : {}),
      ...(update.courierId ? { deliveryPersonId: update.courierId } : {}),
      ...(update.courierName ? { deliveryPersonName: update.courierName } : {}),
      ...(update.courierPhone ? { deliveryPersonPhone: update.courierPhone } : {}),
      ...(update.source ? { carrierStatusSource: update.source } : {}),
      ...(update.carrierTotalToCollect !== undefined ? { carrierTotalToCollect: update.carrierTotalToCollect } : {}),
      ...(update.carrierDeliveryFee !== undefined ? { carrierDeliveryFee: update.carrierDeliveryFee } : {}),
      carrierStatusUpdatedAt: now
    });
    if (transactionRef && ['entregado', 'cancelado'].includes(update.status))
      tx.update(transactionRef, { status: update.status });
    return { trackingNumber: deliverySnapshot.id, status: update.status, changed: true };
  });
}

export function sachaUpdateFromDocument(guide: string, remote: { name?: string; updateTime?: string; fields?: Record<string, any> }): CarrierUpdate {
  const fields = remote.fields || {};
  const value = (name: string) => String(fields[name]?.stringValue || '');
  if (remote.name?.split('/').pop() !== guide || value('externalOrderId') !== guide || fields.isApiOrder?.booleanValue !== true)
    throw new CarrierStatusError('La guía de Sacha no corresponde a la orden.', 409);
  const status = normalizedCarrierStatus(value('status'));
  if (!status) throw new CarrierStatusError('Sacha devolvió un estado desconocido.', 422);
  const amount = (name: string) => Number(fields[name]?.integerValue ?? fields[name]?.doubleValue);
  return {
    providerId: 'prov_sacha_pack', identifiers: [guide], status,
    proofPhotoUrl: value('proofPhotoUrl') || undefined,
    courierId: value('deliveryPersonId') || undefined,
    verifiedCustomerPhone: value('customerPhone'),
    verifiedCustomerName: value('customerName'),
    carrierTotalToCollect: Number.isFinite(amount('totalToCollect')) ? amount('totalToCollect') : undefined,
    carrierDeliveryFee: Number.isFinite(amount('deliveryFee')) ? amount('deliveryFee') : undefined,
    eventTimestamp: remote.updateTime || new Date().toISOString(),
    notes: `Estado verificado directamente en Sacha Pack: ${status}.`,
    source: 'sacha-pull'
  };
}

/** Sacha's public tracking record is the fallback when no push callback arrives. */
export async function syncSachaDelivery(guide: string) {
  if (!/^SPSANPI-[A-Z0-9-]{8,100}$/.test(guide)) throw new CarrierStatusError('Guía Sanpi inválida.');
  const delivery = await serverFirestore().collection('deliveries').doc(guide).get();
  if (!delivery.exists || delivery.data()?.logisticsProviderId !== 'prov_sacha_pack')
    throw new CarrierStatusError('Guía Sacha no encontrada en Sanpi.', 404);
  const endpoint = `https://firestore.googleapis.com/v1/projects/studio-9195671573-fb490/databases/(default)/documents/deliveries/${guide}`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
  if (response.status === 404) throw new CarrierStatusError('Sacha todavía no registra esta guía.', 404);
  if (!response.ok) throw new CarrierStatusError('No se pudo consultar el estado en Sacha.', 502);
  const remote = await response.json() as { name?: string; updateTime?: string; fields?: Record<string, any> };
  return applyCarrierUpdate(sachaUpdateFromDocument(guide, remote));
}
