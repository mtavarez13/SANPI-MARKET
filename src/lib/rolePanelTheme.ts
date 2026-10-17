import type { UserProfile } from '../types';

export const ROLE_PANEL_THEME: Record<Exclude<UserProfile['role'], 'customer'>, { label: string; area: string }> = {
  admin: { label: 'Administración', area: 'Control general de Sanpi Market' },
  partner: { label: 'Tienda socia', area: 'Ventas y operación de tu tienda' },
  dropshipper: { label: 'Pimdrop', area: 'Productos y ventas de tu negocio' },
  supplier: { label: 'Proveedor', area: 'Inventario y abastecimiento' },
  carrier: { label: 'Transportista', area: 'Guías y entregas' },
};

export function rolePanelTheme(role?: UserProfile['role'] | null) {
  return role && role !== 'customer' ? ROLE_PANEL_THEME[role] : null;
}
