import type { Delivery, Store, Transaction } from '../types';
import { normalizeDeliveryStatus } from './deliveryWorkflow';

const key = (value: unknown) => String(value ?? '').trim().toLowerCase();
const amount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export interface ReconciledSale {
  delivery: Delivery;
  transaction?: Transaction;
  store?: Store;
  delivered: boolean;
  productAmount: number;
  shippingAmount: number;
  commissionAmount: number;
  dropshipperAmount: number;
  storePayable: number;
  hasConfirmedCommission: boolean;
  deliveredAt: string;
}

/** A delivery is the source of truth: missing legacy transactions never hide a delivered sale. */
export function reconcileSales(deliveries: Delivery[], transactions: Transaction[], stores: Store[]): ReconciledSale[] {
  const byTracking = new Map<string, Transaction>();
  for (const transaction of transactions) {
    const tracking = key(transaction.trackingNumber);
    if (tracking && !byTracking.has(tracking)) byTracking.set(tracking, transaction);
  }
  const byStore = new Map(stores.map(store => [store.id, store]));

  return deliveries.map(delivery => {
    const transaction = [delivery.trackingNumber, delivery.externalOrderId, delivery.id]
      .map(value => byTracking.get(key(value)))
      .find(Boolean);
    const productAmount = amount(delivery.basePrice || transaction?.basePrice);
    const shippingAmount = amount(delivery.deliveryFee ?? delivery.shippingFee ?? transaction?.shippingFee);
    const hasConfirmedCommission = transaction?.commissionAmount !== undefined;
    const commissionAmount = hasConfirmedCommission ? amount(transaction?.commissionAmount) : 0;
    const dropshipperAmount = amount(delivery.dropshipperProfit ?? transaction?.dropshipperProfit);
    const deliveredHistory = [...(delivery.history || [])].reverse()
      .find(entry => normalizeDeliveryStatus(entry.status) === 'entregado');
    return {
      delivery,
      transaction,
      store: byStore.get(delivery.storeId),
      delivered: normalizeDeliveryStatus(delivery.status) === 'entregado',
      productAmount,
      shippingAmount,
      commissionAmount,
      dropshipperAmount,
      storePayable: Math.max(0, productAmount - commissionAmount - dropshipperAmount),
      hasConfirmedCommission,
      deliveredAt: deliveredHistory?.date || delivery.createdAt,
    };
  });
}
