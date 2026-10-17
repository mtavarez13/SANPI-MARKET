import type { Delivery, DeliveryStatus, PaymentMethod, Store } from '../types';

export const DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  'pendiente', 'pendiente de recoger pickup', 'en tránsito', 'entregado',
  'reprogramado', 'pendiente de retorno', 'retornado a almacén', 'cancelado'
];

/** Older records remain readable; new writes always use the shared Firestore values. */
export function normalizeDeliveryStatus(status: string): DeliveryStatus {
  const value = String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const aliases: Record<string, DeliveryStatus> = {
    pending: 'pendiente',
    'pendiente de recoger pickup': 'pendiente de recoger pickup',
    'en transito': 'en tránsito',
    'in transit': 'en tránsito',
    entregada: 'entregado',
    'entregado al cliente': 'entregado',
    'entrega completada': 'entregado',
    delivered: 'entregado',
    completed: 'entregado',
    completado: 'entregado',
    completada: 'entregado',
    reprogramada: 'reprogramado',
    'intento fallido': 'pendiente de retorno',
    'retornado a almacen': 'retornado a almacén',
    cancelada: 'cancelado',
    cancelled: 'cancelado',
    canceled: 'cancelado',
  };
  return aliases[value] || DELIVERY_STATUSES.find(item => item.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === value) || 'pendiente';
}

export function initialDeliveryStatus(store?: Pick<Store, 'fulfillmentMode'> | null): DeliveryStatus {
  return store?.fulfillmentMode === 'pickup' || store?.fulfillmentMode === 'shop_point'
    ? 'pendiente de recoger pickup' : 'pendiente';
}

export function totalToCollect(price: number, shippingFee: number, paymentMethod: PaymentMethod): number {
  return paymentMethod === 'COD' || paymentMethod === 'contra entrega' ? price + shippingFee : 0;
}

export function validateDeliveryTransition(delivery: Delivery, next: DeliveryStatus, updates: Partial<Delivery> = {}): string | null {
  if (!DELIVERY_STATUSES.includes(next)) return 'El estado de entrega no es válido.';
  const merged = { ...delivery, ...updates };
  if (next === 'en tránsito' && !merged.deliveryPersonId?.trim())
    return 'Asigna un repartidor antes de iniciar la ruta.';
  if (next === 'entregado' && !merged.proofPhotoUrl?.trim())
    return 'Adjunta la foto de entrega antes de marcarla como entregada.';
  if (updates.deliveryPayment !== undefined && (!Number.isFinite(updates.deliveryPayment) || updates.deliveryPayment < 0))
    return 'El pago del repartidor debe ser un monto válido mayor o igual a cero.';
  if (next === delivery.status) return null;
  if (delivery.status === 'entregado' || delivery.status === 'retornado a almacén' || delivery.status === 'cancelado')
    return 'Esta orden ya tiene un estado final.';
  if (next === 'pendiente' && delivery.status !== 'pendiente de recoger pickup')
    return 'Solo una orden pickup recibida puede pasar a pendiente.';
  if (delivery.status === 'pendiente de recoger pickup' && next !== 'pendiente' && next !== 'cancelado')
    return 'Confirma primero la recepción física del pedido pickup.';
  if (next === 'en tránsito' && !(updates.deliveryPersonId || delivery.deliveryPersonId))
    return 'Asigna un repartidor antes de iniciar la ruta.';
  if (next === 'en tránsito' && !['pendiente', 'reprogramado'].includes(delivery.status))
    return 'La orden debe estar pendiente o reprogramada antes de salir a ruta.';
  if (next === 'entregado' && delivery.status !== 'en tránsito')
    return 'La orden debe estar en tránsito antes de marcarla como entregada.';
  if (next === 'entregado' && !(updates.proofPhotoUrl || delivery.proofPhotoUrl))
    return 'Adjunta la foto de entrega antes de marcarla como entregada.';
  if (next === 'reprogramado' && delivery.status !== 'en tránsito')
    return 'Solo se puede reprogramar una entrega en ruta.';
  if (next === 'pendiente de retorno' && !['en tránsito', 'reprogramado'].includes(delivery.status))
    return 'El retorno empieza desde una entrega en ruta o reprogramada.';
  if (next === 'retornado a almacén' && delivery.status !== 'pendiente de retorno')
    return 'Registra primero el retorno pendiente.';
  if (next === 'cancelado' && !['pendiente', 'pendiente de recoger pickup'].includes(delivery.status))
    return 'Solo se puede cancelar antes del despacho.';
  return null;
}
