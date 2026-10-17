import type { Delivery } from '../types';

export function belongsToCustomer(delivery: Delivery, uid: string): boolean {
  return Boolean(uid && uid !== 'guest' && delivery.createdByUid === uid);
}
