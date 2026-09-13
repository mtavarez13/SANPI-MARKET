export interface SachaPackItem {
  barcode_imei?: string; // Identificador del producto para descontar stock
  sku?: string; // SKU o IMEI para descontar stock
  quantity: number; // Cantidad de unidades
  price: number; // Precio unitario
  name?: string; // Nombre descriptivo del producto
}

export interface SachaPackCustomer {
  name: string; // Nombre y apellido del cliente
  phone: string; // WhatsApp de contacto (formato: 8095551234)
  address: string; // Dirección detallada (Calle, No., Sector)
  province: string; // Nombre exacto de la provincia (ej: "Santiago")
  municipality?: string; // Nombre del municipio (opcional pero recomendado)
  email?: string;
}

export interface SachaPackWebhookPayload {
  storeId: string; // Tu identificador único de socio en Sacha Pack
  externalOrderId?: string; // ID de la orden en tu sistema (ej: #1024 o INV-2026-001)
  paymentMethod?: 'contra entrega' | 'tarjeta' | 'transferencia' | 'COD' | string; // "contra entrega" (Suma envío) o "tarjeta" (Pagado)
  items: SachaPackItem[]; // Lista de artículos en el paquete
  customer: SachaPackCustomer; // Datos del destinatario final
}

export interface SachaPackWebhookResponse {
  success: boolean;
  status: number;
  message: string;
  timestamp: string;
  endpoint: string;
  trackingNumber?: string; // e.g. "SPVS1234567"
  totalToCollect?: number; // e.g. 1800.00
  sachaTrackingId?: string; // alias
  providerId?: string;
  providerName?: string;
  rawResponse?: any;
  isSimulated?: boolean;
}

export type AuthHeaderType = 'bearer' | 'x-api-key' | 'apikey' | 'custom_header' | 'none';

export interface LogisticsConnectionTestResult {
  success: boolean;
  status: number;
  latencyMs: number;
  message: string;
  timestamp: string;
  endpoint: string;
  rawResponse?: any;
  diagnostic?: {
    dnsOk: boolean;
    sslOk: boolean;
    authHeaderDetected: boolean;
    contentType?: string;
    details?: string;
  };
}

export interface LogisticsInboundWebhookPayload {
  externalOrderId?: string;
  trackingNumber?: string;
  carrierTrackingId?: string;
  status: 'pendiente' | 'en_transito' | 'entregado' | 'cancelado' | 'reprogramado' | 'intento_fallido';
  carrierName?: string;
  courierName?: string;
  courierPhone?: string;
  location?: {
    lat: number;
    lng: number;
    updatedAt?: string;
  };
  podPhotoUrl?: string; // Proof of Delivery photo
  recipientSignature?: string;
  notes?: string;
  secretToken?: string;
  eventTimestamp?: string;
}

export interface LogisticsProviderConfig {
  id: string;
  name: string; // e.g. 'Sacha Pack Logistics', 'Caribe Pack Express', 'Metro Pac', 'BM Cargo'
  code: string; // e.g. 'sacha_pack', 'caribe_pack', 'metro_pac', 'custom'
  logoUrl?: string;
  websiteUrl?: string;
  webhookUrl: string; // e.g. 'https://sachapack.com/api/logistics-webhook' or 'https://api.transport-company.com/v1/dispatch'
  httpMethod: 'POST' | 'PUT';
  headers?: Record<string, string>;
  defaultStoreId: string; // e.g. 'sxOzEivG9GP9SvaVuF1nVpQZCOu1' or Account ID
  apiKey?: string; // API Key for authentication
  authToken?: string; // Bearer token or authorization key
  authType?: AuthHeaderType; // Scheme used to transmit apiKey
  customHeaderName?: string; // Custom header name if authType is 'custom_header' (e.g. 'X-Transport-Key')
  trackingUrlTemplate?: string; // e.g. 'https://tracking.empresa.com/v1/shipment/{{trackingId}}'
  inboundWebhookSecret?: string; // Secret key for incoming status updates
  isActive: boolean;
  isDefault: boolean;
  jsonTemplate: string; // JSON schema template supporting {{variable}} tags
  notes?: string;
  lastPingStatus?: 'success' | 'error' | 'pending' | 'untested';
  lastPingAt?: string;
  lastPingLatencyMs?: number;
  lastPingMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'customer' | 'dropshipper' | 'partner' | 'supplier' | 'carrier' | 'admin';
  phone?: string;
  province?: string;
  storeName?: string;
  companyName?: string;
  apiKey?: string;
  rnc?: string;
  coverageProvinces?: string[];
  isProviderApproved?: boolean;
  supplierCategory?: string;
  plan?: StorePlan;
  referralCode?: string;
  referredByCode?: string;
  welcomeEmailSent?: boolean;
  createdAt: string;
}

export interface WelcomeEmailPayload {
  name: string;
  email: string;
  role: 'customer' | 'dropshipper' | 'partner' | 'supplier' | 'carrier' | 'admin';
  plan?: StorePlan;
  storeName?: string;
  companyName?: string;
  referralCode: string;
  phone?: string;
  province?: string;
  referredByCode?: string;
}

export interface CarrierUser {
  id: string;
  name: string; // Nombre comercial de la empresa de transporte
  companyName: string;
  email: string;
  phone: string;
  rnc?: string;
  province?: string;
  apiKey: string;
  webhookUrl?: string;
  coverageProvinces: string[];
  isActive: boolean;
  totalOrdersHandled?: number;
  totalCodCollected?: number;
  createdAt: string;
}

export interface WelcomeEmailResult {
  success: boolean;
  emailId: string;
  sentAt: string;
  recipient: string;
  subject: string;
  roleLabel: string;
  planLabel: string;
  referralCode: string;
  previewHtml?: string;
  previewText?: string;
  message?: string;
}

export type StorePlan = 'basic' | 'pro' | 'full' | 'elite' | string;

export interface SanpiPlan {
  id: string; // 'basic' | 'pro' | 'full' | string
  name: string; // 'Básico', 'Pro', 'Full'
  tagline: string; // 'Tienda Emprendedora', 'Tiendas Consolidadas', 'Mayoristas & Marcas'
  description?: string;
  monthlyFee: number; // 600, 1500, 2000
  commissionPercent: number; // 15, 10, 8
  commissionRate: number; // 0.15, 0.10, 0.08
  maxProducts?: number | string; // 50, 300, 'Ilimitados'
  features: string[];
  popular?: boolean;
  badge?: string; // 'Más Popular', 'VIP', 'Mayoristas'
  isActive: boolean;
  colorScheme?: 'blue' | 'purple' | 'emerald' | 'amber' | 'slate';
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreTheme {
  primaryColor: string; // Hex color personalizado e.g. '#2563eb', '#7c3aed', '#dc2626'
  secondaryColor: string; // Hex color secundario e.g. '#1e293b', '#0f172a'
  fontFamily?: string;
}

export interface StoreContact {
  phone?: string;
  whatsapp?: string;
  email: string;
}

export interface Store {
  id: string;
  ownerId: string;
  slug: string; // ej: "electro-tech"
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  coverImageUrl?: string; // alias for backwards compatibility
  theme: StoreTheme;
  rating: number;
  totalReviews: number;
  contact: StoreContact;
  isActive: boolean;
  createdAt: string;
  // Marketplace & logistics integration fields
  isMarketplace?: boolean;
  marketplaceCommission?: number; // e.g. 0.08, 0.10, 0.15
  ownerEmail?: string;
  ownerName?: string;
  phone?: string;
  province?: string;
  status?: 'approved' | 'pending' | 'rejected';
  plan?: StorePlan;
  logisticsProviderId?: string; // ID de la empresa de logística configurada
  logisticsProviderName?: string; // Nombre del operador logístico
  sachaPackStoreId?: string; // e.g. 'sxOzEivG9GP9SvaVuF1nVpQZCOu1'
  // Store Referral Program Fields
  referralCode?: string; // e.g. 'SANPI-TECHZONE', 'SANPI-MODACARIBE'
  referredByStoreId?: string; // ID de la tienda que la refirió
  referredByStoreName?: string;
  referredByCode?: string;
  referralDiscountPercent?: number; // % de descuento asignado por el admin (ej: 10, 15, 20)
  referralDiscountStatus?: 'activo' | 'inactivo' | 'aplicado' | 'pendiente';
  referralDiscountNote?: string; // Nota de admin justificando el % de descuento
  totalReferredStoresCount?: number; // Cantidad de tiendas referidas
  totalReferralSavings?: number; // Ahorros RD$ generados
  referralProgramActive?: boolean;
}

export interface StoreReferralRecord {
  id: string;
  referrerStoreId: string;
  referrerStoreName: string;
  referrerOwnerName?: string;
  referrerEmail?: string;
  referredStoreId: string;
  referredStoreName: string;
  referredOwnerName?: string;
  referredEmail?: string;
  referredStoreOwnerEmail?: string; // alias
  referralCode: string;
  referrerCode?: string; // alias
  discountPercentApplied: number; // e.g. 10 (%)
  discountAmountSaved?: number; // RD$ saved / granted
  discountStatus?: 'activo' | 'pendiente' | 'aplicado' | 'revocado' | 'pausado';
  status?: 'activo' | 'pendiente' | 'aplicado' | 'revocado' | 'pausado'; // alias
  adminNotes?: string;
  createdAt: string;
  appliedByAdminAt?: string;
}

export interface ProductVariant {
  name: string; // ej: "Color", "Talla", "Capacidad"
  options: string[];
}

export interface ProductReview {
  id: string;
  authorName: string;
  authorLocation?: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verifiedPurchase: boolean;
  images?: string[];
  helpfulCount: number;
}

export interface Product {
  id: string;
  storeId: string; // Relación con la tienda
  storeName?: string;
  title: string;
  name?: string; // compatibility alias
  slug: string;
  description: string;
  images: string[];
  image?: string; // compatibility alias (images[0])
  gallery?: string[]; // compatibility alias
  price: number;
  compareAtPrice?: number;
  costPerItem?: number; // wholesalePrice for dropshippers
  wholesalePrice?: number;
  category: string;
  subcategory?: string;
  variants: ProductVariant[];
  inventory: number; // stock count
  stock?: number;
  rating: number;
  reviewCount: number;
  specifications: Record<string, string>;
  isFeatured?: boolean;
  barcode_imei?: string; // Barcode or IMEI code for Sacha Pack warehouse stock
  status?: 'aprobado' | 'pendiente';
  isPublic?: boolean;
  isDropshipping?: boolean;
  // Supplier & Wholesale Platform Fields
  isProviderProduct?: boolean; // Subido por un proveedor mayorista a precio base
  visibility?: 'public' | 'dropshippers_only'; // 'dropshippers_only' oculto en el e-commerce público
  baseCost?: number; // Costo base mayorista del proveedor
  suggestedRetailPrice?: number; // PVP recomendado
  supplierId?: string; // ID del proveedor mayorista
  supplierName?: string; // Nombre de la empresa proveedora
  supplierEmail?: string;
  addedToStoreSlugs?: string[]; // Slugs de tiendas que promocionan este producto
  views?: number;
  reviews?: ProductReview[];
  createdAt: string;
}

// Compatibility alias so existing components compile seamlessly
export type Article = Product;

export interface DeliveryHistoryItem {
  status: string;
  date: string;
  note: string;
}

export type DeliveryStatus = 'pendiente' | 'en_transito' | 'entregado' | 'cancelado' | 'reprogramado' | 'intento_fallido';

export type PaymentMethod = 'COD' | 'transferencia' | 'contra entrega';

export interface DeliveryPersonLocation {
  lat: number;
  lng: number;
  updatedAt: string;
  speed?: number;
  heading?: number;
  address?: string;
}

export interface UserLocationProfile {
  id: string;
  name: string;
  role: 'delivery' | 'merchant' | 'admin' | 'customer';
  phone?: string;
  vehicleType?: 'motocicleta' | 'camioneta' | 'furgoneta' | 'camion';
  lastLocation?: DeliveryPersonLocation;
}

export interface BankAccount {
  id: string;
  bankName: string; // e.g. "Banco Popular Dominicano", "Banreservas", "Banco BHD"
  accountNumber: string; // e.g. "812-456789-0"
  accountType: 'corriente' | 'ahorros';
  accountHolder: string; // e.g. "SANPI LOGISTICS SRL"
  rncOrCedula?: string; // e.g. "1-32-88990-1"
  currency?: 'DOP' | 'USD';
  isActive: boolean;
  notes?: string;
}

export interface Delivery {
  id: string;
  trackingNumber: string;
  externalOrderId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  province: string;
  city: string;
  municipality?: string;
  address: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  cardLast4?: string;
  bankName?: string;
  selectedBankAccountId?: string;
  transferReference?: string;
  transferReceiptUrl?: string; // Base64 Data URL or hosted image URL for transfer receipt verification
  barcode_imei?: string;
  totalCodAmount: number; // basePrice + shippingFee
  totalToCollect?: number; // Compatible alias with tracking spec
  basePrice: number;
  shippingFee: number; // Fixed RD$ 350
  storeId: string;
  articleId: string;
  articleName: string;
  status: DeliveryStatus;
  deliveryPersonId?: string; // ID del repartidor asignado para rastreo GPS
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  lastLocation?: DeliveryPersonLocation;
  isMarketplaceOrder: boolean;
  sourceType?: 'marketplace' | 'landing_page';
  landingPageSlug?: string;
  dropshipperId?: string;
  dropshipperName?: string;
  dropshipperProfit?: number;
  // Multi-Provider Logistics API Integration Fields
  logisticsProviderId?: string;
  logisticsProviderName?: string;
  carrierId?: string; // ID de la empresa de transporte asignada (ej: 'sacha_pack', 'metro_pac', 'caribe_pack')
  carrierName?: string; // Nombre comercial del courier
  carrierApiKey?: string;
  driverName?: string; // Nombre del chofer o repartidor
  driverPhone?: string; // Teléfono del chofer
  carrierNotes?: string;
  collectedAt?: string;
  sachaPackStatus?: 'pendiente' | 'enviado' | 'error' | 'simulado';
  sachaPackPayload?: SachaPackWebhookPayload;
  sachaPackResponse?: SachaPackWebhookResponse;
  sachaPackDispatchedAt?: string;
  createdAt: string;
  history: DeliveryHistoryItem[];
}

export interface Transaction {
  id: string;
  trackingNumber: string;
  storeId: string;
  articleId: string;
  productName: string;
  quantity: number;
  basePrice: number;
  shippingFee: number;
  total: number;
  commissionRate: number; // 0.08, 0.10, 0.15
  commissionAmount: number;
  paymentMethod: PaymentMethod;
  status: 'pendiente' | 'entregado' | 'cancelado';
  isMarketplaceOrder: boolean;
  sourceType?: 'marketplace' | 'landing_page';
  landingPageSlug?: string;
  dropshipperId?: string;
  dropshipperName?: string;
  dropshipperProfit?: number;
  createdAt: string;
}

export interface LandingPageFeature {
  icon: string;
  title: string;
  desc: string;
}

export interface LandingPageTestimonial {
  id: string;
  name: string;
  city: string;
  comment: string;
  rating: number;
  avatar: string;
  verified: boolean;
}

export interface LandingPageConfig {
  id: string;
  slug: string; // Unique URL identifier e.g. 'smartwatch-ultra-sacha'
  title: string;
  heroHeadline: string;
  heroSubheadline: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerType: 'merchant' | 'dropshipper';
  productId: string;
  productName: string;
  productImage: string;
  galleryImages: string[];
  originalStoreId: string;
  wholesalePrice: number; // Provider cost
  customSellingPrice: number; // Price customer pays
  profitMargin: number; // customSellingPrice - wholesalePrice
  originalComparePrice: number; // Strikethrough price for urgency
  urgencyTimerMinutes: number;
  stockCount: number;
  whatsappNumber: string;
  features: LandingPageFeature[];
  testimonials: LandingPageTestimonial[];
  views: number;
  ordersCount: number;
  active: boolean;
  createdAt: string;
}

export interface DropshipItem {
  id: string;
  dropshipperId: string;
  dropshipperName: string;
  dropshipperEmail: string;
  productId: string;
  originalStoreId: string;
  wholesalePrice: number;
  customSellingPrice: number;
  profitMargin: number;
  landingPageSlug?: string;
  status: 'active' | 'paused';
  createdAt: string;
}

export interface MarketplaceSubscription {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  province: string;
  plan: StorePlan;
  monthlyFee: number; // RD$ 1,500 basic, RD$ 3,000 pro, RD$ 5,000 elite
  status: 'pendiente' | 'aprobado' | 'rechazado';
  referralCodeUsed?: string;
  referralDiscountPercent?: number;
  referredByStoreId?: string;
  referredByStoreName?: string;
  requestedAt: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'logistica' | 'marketing' | 'servidores' | 'nomina' | 'inventario' | 'suscripciones' | 'otros';
  amount: number;
  date: string;
  createdAt: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: 'customer' | 'dropshipper' | 'partner' | 'supplier' | 'carrier' | 'admin';
  storeId?: string;
  reference?: string;
  notes?: string;
}

export interface CartItem {
  article: Article;
  quantity: number;
}

export interface RDProvinceInfo {
  id: string;
  name: string;
  region: 'Cibao' | 'Sur' | 'Este' | 'Metro';
  capital: string;
  pathD?: string; // SVG path data for RD map rendering
  coordinates: { x: number; y: number }; // Relative map coordinates
}

export type ContrastMode = 'light' | 'dark' | 'warm';
export type PalettePresetId = 'purple_sanpi' | 'blue_sacha' | 'emerald_success' | 'indigo_exec' | 'crimson_sale' | 'amber_gold' | 'dark_slate' | 'custom';

export interface SiteThemeConfig {
  // Brand identity
  siteName: string; // e.g. "SANPI"
  siteTagline: string; // e.g. "MARKET"
  siteSlogan: string; // e.g. "La Magia de comprar Online en República Dominicana"
  siteSubtitle?: string;
  logoUrl?: string; // custom logo url or base64 data:image
  logoHeight?: number; // px, e.g. 40
  faviconUrl?: string;

  // Background Video Settings
  heroVideoEnabled: boolean;
  heroVideoUrl: string; // Direct mp4/webm link, YouTube URL, Vimeo, etc.
  heroVideoOpacity: number; // 0.1 to 1.0 (default 0.75)
  heroVideoOverlayStyle: 'light' | 'dark' | 'purple_gradient' | 'minimal';
  heroVideoBlur: number; // 0 to 10 (px)

  // Color Palette & Global Contrast
  palettePreset: PalettePresetId;
  primaryColor: string; // Hex e.g. '#7C3AED'
  primaryHoverColor: string; // Hex e.g. '#6D28D9'
  secondaryColor: string; // Hex e.g. '#4F46E5'
  accentColor: string; // Hex e.g. '#F59E0B' (gold/amber)
  contrastMode: ContrastMode; // 'light' | 'dark' | 'warm'

  // Animations & Highlights
  showGoldenMagicStars: boolean;
  showTopAnnouncementBanner: boolean;
  customAnnouncementText?: string;
  showSachaPackBanner: boolean;

  // Support
  supportWhatsApp?: string;

  // Bank Accounts for Transfer Payments (Managed by Super Admin)
  bankAccounts?: BankAccount[];

  updatedAt?: string;
  updatedBy?: string;
}

