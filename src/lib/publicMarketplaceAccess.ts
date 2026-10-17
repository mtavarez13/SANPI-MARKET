import type { UserProfile } from '../types';

export const PUBLIC_MARKETPLACE_VIEWS = ['explore', 'catalogs', 'landing_page', 'seller_landing', 'track'] as const;

export function isPublicMarketplaceUser(user: UserProfile | null | undefined, superAdmin = false): boolean {
  return !user || (user.role === 'customer' && !superAdmin);
}

export function canOpenMarketplaceView(user: UserProfile | null | undefined, view: string, superAdmin = false): boolean {
  if (view === 'purchases') return user?.role === 'customer' && !superAdmin;
  return !isPublicMarketplaceUser(user, superAdmin) || PUBLIC_MARKETPLACE_VIEWS.includes(view as typeof PUBLIC_MARKETPLACE_VIEWS[number]);
}
