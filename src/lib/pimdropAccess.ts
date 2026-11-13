import type { Store, UserProfile } from '../types';

export function canAccessPimdrop(user: UserProfile | null | undefined, stores: Store[]): boolean {
  if (user?.role !== 'partner') return false;

  return stores.some(store => {
    const ownsStore = Boolean(
      (user.uid && store.ownerId === user.uid) ||
      (user.email && store.ownerEmail?.trim().toLowerCase() === user.email.trim().toLowerCase())
    );
    return ownsStore && store.isActive && store.status !== 'pending' && store.status !== 'rejected'
      && store.plan?.trim().toLowerCase() === 'full';
  });
}
