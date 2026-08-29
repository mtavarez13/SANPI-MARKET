import { SiteThemeConfig, PalettePresetId, BankAccount } from '../types';

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-bpd-1',
    bankName: 'Banco Popular Dominicano',
    accountNumber: '812-456789-0',
    accountType: 'corriente',
    accountHolder: 'SANPI MARKET SRL',
    rncOrCedula: '1-32-88990-1',
    currency: 'DOP',
    isActive: true,
    notes: 'Cuenta principal para transferencias ACH y depósitos directos'
  },
  {
    id: 'bank-bhd-1',
    bankName: 'Banco BHD',
    accountNumber: '098-765432-1',
    accountType: 'ahorros',
    accountHolder: 'SANPI MARKET SRL',
    rncOrCedula: '1-32-88990-1',
    currency: 'DOP',
    isActive: true,
    notes: 'Transferencias directas y depósitos por ventanilla'
  },
  {
    id: 'bank-banreservas-1',
    bankName: 'Banreservas',
    accountNumber: '240-123456-7',
    accountType: 'corriente',
    accountHolder: 'SANPI MARKET SRL',
    rncOrCedula: '1-32-88990-1',
    currency: 'DOP',
    isActive: true,
    notes: 'Depósitos en sucursales a nivel nacional y transferencias ACH'
  }
];

export interface ThemePaletteDefinition {
  id: PalettePresetId;
  name: string;
  description: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  glowColor: string;
  previewGradient: string;
}

export const THEME_PALETTES: ThemePaletteDefinition[] = [
  {
    id: 'purple_sanpi',
    name: 'Morado Real Sanpi (Oficial)',
    description: 'Paleta insignia de la marca Sanpi con alto contraste blanco y morado real.',
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    secondary: '#4F46E5',
    accent: '#F59E0B',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-700',
    glowColor: 'rgba(124, 58, 237, 0.4)',
    previewGradient: 'from-purple-600 via-indigo-600 to-purple-800'
  },
  {
    id: 'blue_sacha',
    name: 'Azul Sacha Pack Tech',
    description: 'Tono azul corporativo de alta tecnología y logística confiable.',
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    secondary: '#0284C7',
    accent: '#10B981',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    previewGradient: 'from-blue-600 via-sky-600 to-indigo-700'
  },
  {
    id: 'emerald_success',
    name: 'Esmeralda Caribe & COD',
    description: 'Verde esmeralda de confianza bancaria, cobros COD y prosperidad comercial.',
    primary: '#059669',
    primaryHover: '#047857',
    secondary: '#0D9488',
    accent: '#F59E0B',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
    glowColor: 'rgba(5, 150, 105, 0.4)',
    previewGradient: 'from-emerald-600 via-teal-600 to-green-700'
  },
  {
    id: 'indigo_exec',
    name: 'Índigo Ejecutivo & VIP',
    description: 'Profundidad moderna y elegante para dropshipping de alta gama.',
    primary: '#4F46E5',
    primaryHover: '#4338CA',
    secondary: '#7C3AED',
    accent: '#EC4899',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-700',
    glowColor: 'rgba(79, 70, 229, 0.4)',
    previewGradient: 'from-indigo-600 via-purple-600 to-blue-700'
  },
  {
    id: 'crimson_sale',
    name: 'Rubí Carmesí & Ofertas',
    description: 'Rojo vibrante de alta conversión, ofertas flash y máxima urgencia.',
    primary: '#DC2626',
    primaryHover: '#B91C1C',
    secondary: '#E11D48',
    accent: '#F59E0B',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
    glowColor: 'rgba(220, 38, 38, 0.4)',
    previewGradient: 'from-red-600 via-rose-600 to-orange-600'
  },
  {
    id: 'amber_gold',
    name: 'Ámbar Dorado & Premium',
    description: 'Dorado cálido de lujo y distinción artesanal.',
    primary: '#D97706',
    primaryHover: '#B45309',
    secondary: '#EA580C',
    accent: '#8B5CF6',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-700',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    previewGradient: 'from-amber-600 via-yellow-600 to-orange-600'
  },
  {
    id: 'dark_slate',
    name: 'Grafito Dark / Alto Contraste',
    description: 'Modo oscuro de máxima elegancia con destellos morados y blancos.',
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    secondary: '#8B5CF6',
    accent: '#FBBF24',
    badgeBg: 'bg-slate-800 border-slate-700',
    badgeText: 'text-slate-200',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    previewGradient: 'from-slate-900 via-purple-950 to-slate-950'
  }
];

export interface PresetVideoItem {
  id: string;
  title: string;
  category: string;
  url: string;
  thumbnail: string;
  description: string;
}

export const PRESET_VIDEO_LIBRARY: PresetVideoItem[] = [
  {
    id: 'gofo_logistics',
    title: 'Flujo Global & Logística Inteligente GoFo / Sacha',
    category: 'Logística & Tecnología',
    url: 'https://www.gofo.com/us/_nuxt/mp4/about.CWInqs1V.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600',
    description: 'Video oficial de alta definición en bucle de operaciones de logística y distribución.'
  },
  {
    id: 'warehouse_conveyor',
    title: 'Centro Logístico Sacha Pack & Cintas de Despacho',
    category: 'Logística & Fulfillment',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-conveyor-belt-at-a-distribution-warehouse-42525-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600',
    description: 'Cintas transportadoras y paquetería express de alta velocidad.'
  },
  {
    id: 'warehouse_boxes',
    title: 'Clasificación de Paquetes COD República Dominicana',
    category: 'Logística',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-cardboard-boxes-on-a-conveyor-belt-in-a-warehouse-42524-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=600',
    description: 'Cajas y despachos automatizados listos para entrega contra entrega.'
  },
  {
    id: 'modern_factory',
    title: 'Almacén Automatizado & Tecnología de Inventario',
    category: 'Tecnología',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-automated-assembly-line-in-a-modern-factory-42526-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=600',
    description: 'Robótica y flujo continuo de productos de alta rotación.'
  },
  {
    id: 'ecommerce_shopping',
    title: 'Experiencia de Compra Online en Smartphone',
    category: 'Comercio Digital',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-using-mobile-banking-app-42674-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&q=80&w=600',
    description: 'Clientes navegando y ordenando en Sanpi desde sus teléfonos móviles.'
  },
  {
    id: 'courier_dispatch',
    title: 'Equipo de Despacho & Mensajería Express',
    category: 'Distribución',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-courier-carrying-packages-in-a-warehouse-42531-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=600',
    description: 'Operadores preparando entregas hacia las 32 provincias de RD.'
  }
];

export const DEFAULT_SITE_THEME_CONFIG: SiteThemeConfig = {
  siteName: 'SANPI',
  siteTagline: 'MARKET',
  siteSlogan: 'La Magia de comprar Online en República Dominicana',
  siteSubtitle: 'Descubre miles de artículos certificados de tiendas oficiales con pago 100% en efectivo al recibir en las 32 provincias o emprende con dropshipping sin inventario.',
  logoUrl: '', // empty means default SVG branding
  logoHeight: 40,
  faviconUrl: '',

  // Video background
  heroVideoEnabled: true,
  heroVideoUrl: 'https://www.gofo.com/us/_nuxt/mp4/about.CWInqs1V.mp4',
  heroVideoOpacity: 0.35,
  heroVideoOverlayStyle: 'light',
  heroVideoBlur: 0,

  // Theme & Contrast
  palettePreset: 'purple_sanpi',
  primaryColor: '#7C3AED',
  primaryHoverColor: '#6D28D9',
  secondaryColor: '#4F46E5',
  accentColor: '#F59E0B',
  contrastMode: 'light',

  // Visual effects
  showGoldenMagicStars: true,
  showTopAnnouncementBanner: true,
  customAnnouncementText: '🚚 Envíos rápidos en 24-48h a las 32 provincias vía Sacha Pack (Flete Fijo RD$ 350) • 💵 Pago Contra Entrega COD',
  showSachaPackBanner: true,

  // Support
  supportWhatsApp: '18095550199',

  // Bank Accounts for Transfer Payments
  bankAccounts: DEFAULT_BANK_ACCOUNTS,

  updatedAt: new Date().toISOString(),
  updatedBy: 'martin.tavarez.gomez@gmail.com'
};
