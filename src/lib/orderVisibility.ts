import type { Delivery, LandingPageConfig, Store, UserProfile } from '../types';

export const ORDER_STATUSES = {
  pendiente: { label: 'Pendiente', color: 'bg-orange-50 text-orange-800 border-orange-200' },
  'pendiente de recoger pickup': { label: 'Pickup pendiente', color: 'bg-orange-50 text-orange-800 border-orange-200' },
  'en tránsito': { label: 'En tránsito', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  entregado: { label: 'Entregado', color: 'bg-green-50 text-green-800 border-green-200' },
  reprogramado: { label: 'Reprogramado', color: 'bg-violet-50 text-violet-800 border-violet-200' },
  'pendiente de retorno': { label: 'Pendiente de retorno', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'retornado a almacén': { label: 'Retornado a almacén', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  cancelado: { label: 'Cancelado', color: 'bg-slate-100 text-slate-600 border-slate-200' },
} as const;

export function canViewOrders(user: UserProfile | null, superAdmin = false) {
  return !!user?.uid && (superAdmin || ['admin', 'partner', 'dropshipper'].includes(user.role));
}

export function isDropshippingOrder(order: Delivery) {
  return !!order.dropshipperId || order.sourceType === 'landing_page';
}

// Presentation scoping only. Firestore authorization must also be enforced by the backend.
export function visibleOrders(user: UserProfile | null, orders: Delivery[], stores: Store[], pages: LandingPageConfig[], superAdmin = false): Delivery[] {
  if (!canViewOrders(user, superAdmin) || !user) return [];
  if (superAdmin || user.role === 'admin') return orders;
  const email = user.email?.trim().toLowerCase();
  const ownStores = new Set(stores.filter(store => store.ownerId === user.uid ||
    (!!email && store.ownerEmail?.trim().toLowerCase() === email)).map(store => store.id));
  const ownPages = new Set(pages.filter(page => page.ownerId === user.uid).map(page => page.slug));
  return orders.filter(order => ownStores.has(order.storeId) || (user.role === 'dropshipper' &&
    (order.dropshipperId === user.uid || (!order.dropshipperId && !!order.landingPageSlug && ownPages.has(order.landingPageSlug)))));
}
