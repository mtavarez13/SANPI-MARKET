import type { ReconciledSale } from './accountingReconciliation';

export function canSettleStoreOrder(row: ReconciledSale | undefined, selectedStoreId?: string): row is ReconciledSale {
  return Boolean(row?.delivered && !row.delivery.storePaidAt && row.hasConfirmedCommission && row.storePayable > 0
    && (!selectedStoreId || row.delivery.storeId === selectedStoreId));
}
