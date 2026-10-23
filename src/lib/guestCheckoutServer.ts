import firebaseAppletConfig from '../../firebase-applet-config.json';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type JsonRecord = Record<string, any>;

const publicCheckoutHosts = new Set([
  'sanpi.connectchat.tech',
  'sanpi.com.do',
  'www.sanpi.com.do'
]);

export function isAllowedGuestCheckoutOrigin(origin: string | undefined, requestHost: string | undefined): boolean {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = url.host.toLowerCase();
    const sameHost = host === String(requestHost || '').toLowerCase();
    const isLocal = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal && sameHost)) return false;
    return sameHost || publicCheckoutHosts.has(host);
  } catch {
    return false;
  }
}

export function serverFirestore() {
  const app = getApps().find(item => item.name === 'sanpi-guest-checkout') ||
    initializeApp({ credential: applicationDefault(), projectId: firebaseAppletConfig.projectId }, 'sanpi-guest-checkout');
  return getFirestore(app, firebaseAppletConfig.firestoreDatabaseId);
}

async function readPublicDocument(collection: 'articles' | 'stores', id: string): Promise<JsonRecord | null> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
  const snapshot = await serverFirestore().collection(collection).doc(id).get();
  return snapshot.exists ? { ...snapshot.data(), id: snapshot.id } : null;
}

export const readPublicArticle = (articleId: string) => readPublicDocument('articles', articleId);
export const readPublicStore = (storeId: string) => readPublicDocument('stores', storeId);

export async function readPublicLandingPage(slug: string): Promise<JsonRecord | null> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(slug)) return null;
  const snapshot = await serverFirestore().collection('landing_pages').where('slug', '==', slug).limit(1).get();
  const page = snapshot.docs[0];
  return page ? { ...page.data(), id: page.id } : null;
}

export function validateGuestOrder(delivery: JsonRecord, transaction: JsonRecord, article: JsonRecord, store?: JsonRecord, landingPage?: JsonRecord | null): string | null {
  if (!delivery || !transaction || !article) return 'Orden o producto inválido.';
  if (!/^SPSANPI-[A-Z0-9-]{8,100}$/.test(String(delivery.trackingNumber || '')) ||
      delivery.id !== delivery.trackingNumber || delivery.externalOrderId !== delivery.trackingNumber ||
      transaction.trackingNumber !== delivery.trackingNumber) return 'Número de guía inválido.';
  if (!/^tx_[0-9]{10,20}$/.test(String(transaction.id || ''))) return 'Transacción inválida.';
  if (delivery.createdByUid !== 'guest' || transaction.createdByUid !== 'guest' ||
      delivery.isMarketplaceOrder !== true || transaction.isMarketplaceOrder !== true) return 'Origen de orden inválido.';
  if (delivery.articleId !== article.id || transaction.articleId !== article.id ||
      delivery.storeId !== article.storeId || transaction.storeId !== article.storeId) return 'Artículo o tienda inválidos.';
  const sourceType = delivery.sourceType || 'marketplace';
  if (!['marketplace', 'landing_page'].includes(sourceType) || (transaction.sourceType || 'marketplace') !== sourceType) return 'Origen de orden inválido.';
  if (sourceType === 'landing_page' && (!landingPage?.active || landingPage.slug !== delivery.landingPageSlug ||
      landingPage.productId !== article.id || landingPage.originalStoreId !== article.storeId)) return 'Landing page no disponible.';
  if (sourceType === 'marketplace' && delivery.landingPageSlug) return 'Origen de orden inválido.';
  const quantity = Number(delivery.quantity);
  const unitPrice = Number(sourceType === 'landing_page' ? landingPage?.customSellingPrice : article.price);
  if (article.isPublic !== true || article.status !== 'aprobado' ||
      !Number.isFinite(Number(article.stock)) || Number(article.stock) < quantity) {
    return 'Artículo no disponible para venta.';
  }
  if (store && (store.id !== article.storeId ||
      delivery.logisticsProviderId !== (store.logisticsProviderId || 'prov_sacha_pack') ||
      delivery.status !== (['pickup', 'shop_point'].includes(store.fulfillmentMode) ? 'pendiente de recoger pickup' : 'pendiente'))) {
    return 'Tienda o estado inicial inválido.';
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 ||
      !Number.isFinite(unitPrice) || unitPrice <= 0 ||
      delivery.unitPriceAtSale !== unitPrice || transaction.quantity !== quantity ||
      delivery.basePrice !== unitPrice * quantity || transaction.basePrice !== delivery.basePrice) return 'Precio o cantidad inválidos.';
  if (delivery.shippingFee !== 350 || delivery.deliveryFee !== 350 ||
      delivery.totalCodAmount !== delivery.basePrice + 350 ||
      transaction.shippingFee !== 350 || transaction.total !== delivery.totalCodAmount ||
      delivery.deliveryPayment !== 0 || delivery.isPaidToOffice !== false) return 'Totales inválidos.';
  if (delivery.paymentMethod !== 'COD' || transaction.paymentMethod !== 'COD' ||
      delivery.totalToCollect !== delivery.totalCodAmount) return 'El checkout de invitado requiere pago contra entrega.';
  if (!['pendiente', 'pendiente de recoger pickup'].includes(delivery.status) ||
      transaction.status !== 'pendiente') return 'Estado inicial inválido.';
  for (const [key, limit] of [['customerName', 120], ['customerPhone', 30], ['province', 100], ['city', 120], ['address', 300]] as const) {
    if (!delivery[key] || typeof delivery[key] !== 'string' || delivery[key].trim().length < 2 || delivery[key].length > limit) {
      return `Dato de cliente inválido: ${key}.`;
    }
  }
  if (!/^[0-9+() -]{8,30}$/.test(delivery.customerPhone)) return 'Teléfono inválido.';
  if (JSON.stringify({ delivery, transaction }).length > 30000) return 'La orden excede el tamaño permitido.';
  return null;
}

export class GuestCheckoutValidationError extends Error {}

export function buildTrustedGuestDocuments(delivery: JsonRecord, transaction: JsonRecord, article: JsonRecord, store: JsonRecord, landingPage?: JsonRecord | null) {
  const error = validateGuestOrder(delivery, transaction, article, store, landingPage);
  if (error) throw new GuestCheckoutValidationError(error);
  const quantity = Number(delivery.quantity);
  const sourceType = delivery.sourceType === 'landing_page' ? 'landing_page' : 'marketplace';
  const unitPrice = Number(sourceType === 'landing_page' ? landingPage?.customSellingPrice : article.price);
  const basePrice = unitPrice * quantity;
  const shippingFee = 350;
  const total = basePrice + shippingFee;
  const status = ['pickup', 'shop_point'].includes(store.fulfillmentMode) ? 'pendiente de recoger pickup' : 'pendiente';
  const commissionRate = store.ownerEmail?.toLowerCase().trim() === 'vsantos.dominicana@gmail.com' ? 0.08
    : typeof store.marketplaceCommission === 'number' && store.marketplaceCommission > 0 ? store.marketplaceCommission
    : store.plan === 'basic' ? 0.15 : store.plan === 'pro' ? 0.10 : ['elite', 'full'].includes(store.plan) ? 0.08 : 0.10;
  const dropshipper = sourceType === 'landing_page' && landingPage?.ownerType === 'dropshipper';
  const attribution = sourceType === 'landing_page' ? {
    landingPageSlug: landingPage?.slug,
    ...(dropshipper ? {
      dropshipperId: landingPage?.ownerId,
      dropshipperName: landingPage?.ownerName,
      dropshipperProfit: Math.max(0, unitPrice - Number(landingPage?.wholesalePrice || article.wholesalePrice || 0)) * quantity
    } : {})
  } : {};
  const createdAt = new Date().toISOString();
  const trustedDelivery = {
    id: delivery.trackingNumber,
    trackingNumber: delivery.trackingNumber,
    externalOrderId: delivery.trackingNumber,
    createdByUid: 'guest',
    customerName: delivery.customerName.trim(),
    customerPhone: delivery.customerPhone.trim(),
    customerEmail: typeof delivery.customerEmail === 'string' && delivery.customerEmail.length <= 200 ? delivery.customerEmail.trim() : '',
    province: delivery.province.trim(),
    city: delivery.city.trim(),
    municipality: String(delivery.municipality || delivery.city).trim().slice(0, 120),
    address: delivery.address.trim(),
    notes: String(delivery.notes || '').trim().slice(0, 500),
    paymentMethod: 'COD',
    barcode_imei: String(article.barcode_imei || '1234567890'),
    totalCodAmount: total,
    totalToCollect: total,
    deliveryFee: shippingFee,
    deliveryPayment: 0,
    isPaidToOffice: false,
    basePrice,
    shippingFee,
    quantity,
    unitPriceAtSale: unitPrice,
    unitCostAtSale: Number(article.costPerItem ?? article.wholesalePrice ?? article.baseCost ?? 0),
    storeId: article.storeId,
    articleId: article.id,
    articleName: article.name,
    senderName: String(store.name || 'Tienda Sanpi').slice(0, 120),
    senderContactName: String(store.ownerName || '').slice(0, 120),
    senderPhone: String(store.contact?.phone || store.phone || '').slice(0, 30),
    senderProvince: String(store.province || '').slice(0, 120),
    senderAddress: String(store.pickupAddress || '').slice(0, 200),
    status,
    isMarketplaceOrder: true,
    sourceType,
    ...attribution,
    logisticsProviderId: store.logisticsProviderId || 'prov_sacha_pack',
    logisticsProviderName: String(delivery.logisticsProviderName || 'Sacha Pack Logistics').slice(0, 120),
    sachaPackStatus: 'pendiente',
    createdAt,
    history: [{ status, date: createdAt, note: 'Orden creada en Sanpi Marketplace mediante compra sin registro.' }]
  };
  const trustedTransaction = {
    id: transaction.id,
    createdByUid: 'guest',
    trackingNumber: delivery.trackingNumber,
    storeId: article.storeId,
    articleId: article.id,
    productName: article.name,
    quantity,
    basePrice,
    shippingFee,
    total,
    commissionRate,
    commissionAmount: Math.round(basePrice * commissionRate),
    paymentMethod: 'COD',
    status: 'pendiente',
    isMarketplaceOrder: true,
    sourceType,
    ...attribution,
    createdAt
  };
  return { delivery: trustedDelivery, transaction: trustedTransaction };
}

export async function commitGuestOrder(delivery: JsonRecord, transaction: JsonRecord): Promise<void> {
  const db = serverFirestore();
  const articleRef = db.collection('articles').doc(String(delivery.articleId));
  const storeRef = db.collection('stores').doc(String(delivery.storeId));
  const deliveryRef = db.collection('deliveries').doc(String(delivery.trackingNumber));
  const transactionRef = db.collection('transactions').doc(String(transaction.id));
  const landingPage = delivery.sourceType === 'landing_page' ? await readPublicLandingPage(String(delivery.landingPageSlug || '')) : null;
  const landingRef = landingPage ? db.collection('landing_pages').doc(landingPage.id) : null;
  await db.runTransaction(async tx => {
    const [articleSnapshot, storeSnapshot, landingSnapshot] = await Promise.all([
      tx.get(articleRef), tx.get(storeRef), landingRef ? tx.get(landingRef) : Promise.resolve(null)
    ]);
    if (!articleSnapshot.exists || !storeSnapshot.exists) throw new GuestCheckoutValidationError('Artículo o tienda no disponible.');
    const article: JsonRecord = { ...(articleSnapshot.data() || {}), id: articleSnapshot.id };
    const store: JsonRecord = { ...(storeSnapshot.data() || {}), id: storeSnapshot.id };
    const currentLanding: JsonRecord | null = landingSnapshot?.exists ? { ...(landingSnapshot.data() || {}), id: landingSnapshot.id } : null;
    const trusted = buildTrustedGuestDocuments(delivery, transaction, article, store, currentLanding);
    tx.create(transactionRef, trusted.transaction);
    tx.create(deliveryRef, trusted.delivery);
    tx.update(articleRef, { stock: Number(article.stock) - Number(delivery.quantity) });
    if (landingRef && currentLanding) {
      tx.update(landingRef, {
        ordersCount: Number(currentLanding.ordersCount || 0) + 1,
        stockCount: Math.max(0, Number(currentLanding.stockCount || 0) - Number(delivery.quantity))
      });
    }
  });
}

export async function recordGuestCarrierResult(trackingNumber: string, response: JsonRecord): Promise<void> {
  const success = response.success === true;
  const carrierTrackingId = typeof response.trackingNumber === 'string' ? response.trackingNumber : '';
  await serverFirestore().collection('deliveries').doc(trackingNumber).update({
    sachaPackStatus: success ? 'enviado' : 'pendiente',
    sachaPackResponse: {
      success,
      message: String(response.message || '').slice(0, 500),
      ...(typeof response.status === 'number' ? { status: response.status } : {}),
      ...(carrierTrackingId ? { trackingNumber: carrierTrackingId } : {})
    },
    ...(success ? { sachaPackDispatchedAt: new Date().toISOString() } : {}),
    ...(carrierTrackingId ? { carrierTrackingId } : {})
  });
}
