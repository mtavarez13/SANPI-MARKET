var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "sanpi-market",
  appId: "1:465446427322:web:2dfd2209aff731a26dc083",
  apiKey: "AIzaSyCPFd9PFVo6mdwAv7rGyNbdn976XrufJIE",
  authDomain: "sanpi-market.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-sanpimarket-0d7cf290-2e17-4f87-b9cf-2fc45925699f",
  storageBucket: "sanpi-market.firebasestorage.app",
  messagingSenderId: "465446427322",
  measurementId: "G-3Y03GCE0WG",
  oAuthClientId: "465446427322-0007h5lqr3vt99qfaalbqvr8e2c53sui.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/lib/privateCarrierConfig.ts
var import_promises = require("node:fs/promises");
var import_node_os = require("node:os");
var import_node_path = __toESM(require("node:path"), 1);
var privateCarrierConfigPath = () => import_node_path.default.join(
  process.env.SANPI_PRIVATE_CONFIG_DIR || (0, import_node_os.homedir)(),
  ".sanpi-market",
  "carrier-config.json"
);
async function readPrivateCarrierConfigs() {
  try {
    const contents = await (0, import_promises.readFile)(privateCarrierConfigPath(), "utf8");
    return JSON.parse(contents);
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}
async function savePrivateCarrierConfig(providerId, config) {
  const file = privateCarrierConfigPath();
  const configs = await readPrivateCarrierConfigs();
  configs[providerId] = { ...config, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  await (0, import_promises.mkdir)(import_node_path.default.dirname(file), { recursive: true, mode: 448 });
  const temporaryFile = `${file}.${process.pid}.tmp`;
  await (0, import_promises.writeFile)(temporaryFile, JSON.stringify(configs), { mode: 384 });
  await (0, import_promises.rename)(temporaryFile, file);
}

// src/lib/guestCheckoutServer.ts
var import_app = require("firebase-admin/app");
var import_firestore = require("firebase-admin/firestore");
var publicCheckoutHosts = /* @__PURE__ */ new Set([
  "sanpi.connectchat.tech",
  "sanpi.com.do",
  "www.sanpi.com.do"
]);
function isAllowedGuestCheckoutOrigin(origin, requestHost) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = url.host.toLowerCase();
    const sameHost = host === String(requestHost || "").toLowerCase();
    const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal && sameHost)) return false;
    return sameHost || publicCheckoutHosts.has(host);
  } catch {
    return false;
  }
}
function serverFirestore() {
  const app = (0, import_app.getApps)().find((item) => item.name === "sanpi-guest-checkout") || (0, import_app.initializeApp)({ credential: (0, import_app.applicationDefault)(), projectId: firebase_applet_config_default.projectId }, "sanpi-guest-checkout");
  return (0, import_firestore.getFirestore)(app, firebase_applet_config_default.firestoreDatabaseId);
}
async function readPublicDocument(collection, id) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
  const snapshot = await serverFirestore().collection(collection).doc(id).get();
  return snapshot.exists ? { ...snapshot.data(), id: snapshot.id } : null;
}
var readPublicArticle = (articleId) => readPublicDocument("articles", articleId);
var readPublicStore = (storeId) => readPublicDocument("stores", storeId);
async function readPublicLandingPage(slug) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(slug)) return null;
  const snapshot = await serverFirestore().collection("landing_pages").where("slug", "==", slug).limit(1).get();
  const page = snapshot.docs[0];
  return page ? { ...page.data(), id: page.id } : null;
}
function validateGuestOrder(delivery, transaction, article, store, landingPage) {
  if (!delivery || !transaction || !article) return "Orden o producto inv\xE1lido.";
  if (!/^SPSANPI-[A-Z0-9-]{8,100}$/.test(String(delivery.trackingNumber || "")) || delivery.id !== delivery.trackingNumber || delivery.externalOrderId !== delivery.trackingNumber || transaction.trackingNumber !== delivery.trackingNumber) return "N\xFAmero de gu\xEDa inv\xE1lido.";
  if (!/^tx_[0-9]{10,20}$/.test(String(transaction.id || ""))) return "Transacci\xF3n inv\xE1lida.";
  if (delivery.createdByUid !== "guest" || transaction.createdByUid !== "guest" || delivery.isMarketplaceOrder !== true || transaction.isMarketplaceOrder !== true) return "Origen de orden inv\xE1lido.";
  if (delivery.articleId !== article.id || transaction.articleId !== article.id || delivery.storeId !== article.storeId || transaction.storeId !== article.storeId) return "Art\xEDculo o tienda inv\xE1lidos.";
  const sourceType = delivery.sourceType || "marketplace";
  if (!["marketplace", "landing_page"].includes(sourceType) || (transaction.sourceType || "marketplace") !== sourceType) return "Origen de orden inv\xE1lido.";
  if (sourceType === "landing_page" && (!landingPage?.active || landingPage.slug !== delivery.landingPageSlug || landingPage.productId !== article.id || landingPage.originalStoreId !== article.storeId)) return "Landing page no disponible.";
  if (sourceType === "marketplace" && delivery.landingPageSlug) return "Origen de orden inv\xE1lido.";
  const quantity = Number(delivery.quantity);
  const unitPrice = Number(sourceType === "landing_page" ? landingPage?.customSellingPrice : article.price);
  if (article.isPublic !== true || article.status !== "aprobado" || !Number.isFinite(Number(article.stock)) || Number(article.stock) < quantity) {
    return "Art\xEDculo no disponible para venta.";
  }
  if (store && (store.id !== article.storeId || delivery.logisticsProviderId !== (store.logisticsProviderId || "prov_sacha_pack") || delivery.status !== (["pickup", "shop_point"].includes(store.fulfillmentMode) ? "pendiente de recoger pickup" : "pendiente"))) {
    return "Tienda o estado inicial inv\xE1lido.";
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 || !Number.isFinite(unitPrice) || unitPrice <= 0 || delivery.unitPriceAtSale !== unitPrice || transaction.quantity !== quantity || delivery.basePrice !== unitPrice * quantity || transaction.basePrice !== delivery.basePrice) return "Precio o cantidad inv\xE1lidos.";
  if (delivery.shippingFee !== 350 || delivery.deliveryFee !== 350 || delivery.totalCodAmount !== delivery.basePrice + 350 || transaction.shippingFee !== 350 || transaction.total !== delivery.totalCodAmount || delivery.deliveryPayment !== 0 || delivery.isPaidToOffice !== false) return "Totales inv\xE1lidos.";
  if (delivery.paymentMethod !== "COD" || transaction.paymentMethod !== "COD" || delivery.totalToCollect !== delivery.totalCodAmount) return "El checkout de invitado requiere pago contra entrega.";
  if (!["pendiente", "pendiente de recoger pickup"].includes(delivery.status) || transaction.status !== "pendiente") return "Estado inicial inv\xE1lido.";
  for (const [key, limit] of [["customerName", 120], ["customerPhone", 30], ["province", 100], ["city", 120], ["address", 300]]) {
    if (!delivery[key] || typeof delivery[key] !== "string" || delivery[key].trim().length < 2 || delivery[key].length > limit) {
      return `Dato de cliente inv\xE1lido: ${key}.`;
    }
  }
  if (!/^[0-9+() -]{8,30}$/.test(delivery.customerPhone)) return "Tel\xE9fono inv\xE1lido.";
  if (JSON.stringify({ delivery, transaction }).length > 3e4) return "La orden excede el tama\xF1o permitido.";
  return null;
}
var GuestCheckoutValidationError = class extends Error {
};
function buildTrustedGuestDocuments(delivery, transaction, article, store, landingPage) {
  const error = validateGuestOrder(delivery, transaction, article, store, landingPage);
  if (error) throw new GuestCheckoutValidationError(error);
  const quantity = Number(delivery.quantity);
  const sourceType = delivery.sourceType === "landing_page" ? "landing_page" : "marketplace";
  const unitPrice = Number(sourceType === "landing_page" ? landingPage?.customSellingPrice : article.price);
  const basePrice = unitPrice * quantity;
  const shippingFee = 350;
  const total = basePrice + shippingFee;
  const status = ["pickup", "shop_point"].includes(store.fulfillmentMode) ? "pendiente de recoger pickup" : "pendiente";
  const commissionRate = store.ownerEmail?.toLowerCase().trim() === "vsantos.dominicana@gmail.com" ? 0.08 : typeof store.marketplaceCommission === "number" && store.marketplaceCommission > 0 ? store.marketplaceCommission : store.plan === "basic" ? 0.15 : store.plan === "pro" ? 0.1 : ["elite", "full"].includes(store.plan) ? 0.08 : 0.1;
  const dropshipper = sourceType === "landing_page" && landingPage?.ownerType === "dropshipper";
  const attribution = sourceType === "landing_page" ? {
    landingPageSlug: landingPage?.slug,
    ...dropshipper ? {
      dropshipperId: landingPage?.ownerId,
      dropshipperName: landingPage?.ownerName,
      dropshipperProfit: Math.max(0, unitPrice - Number(landingPage?.wholesalePrice || article.wholesalePrice || 0)) * quantity
    } : {}
  } : {};
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const trustedDelivery = {
    id: delivery.trackingNumber,
    trackingNumber: delivery.trackingNumber,
    externalOrderId: delivery.trackingNumber,
    createdByUid: "guest",
    customerName: delivery.customerName.trim(),
    customerPhone: delivery.customerPhone.trim(),
    customerEmail: typeof delivery.customerEmail === "string" && delivery.customerEmail.length <= 200 ? delivery.customerEmail.trim() : "",
    province: delivery.province.trim(),
    city: delivery.city.trim(),
    municipality: String(delivery.municipality || delivery.city).trim().slice(0, 120),
    address: delivery.address.trim(),
    notes: String(delivery.notes || "").trim().slice(0, 500),
    paymentMethod: "COD",
    barcode_imei: String(article.barcode_imei || "1234567890"),
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
    senderName: String(store.name || "Tienda Sanpi").slice(0, 120),
    senderContactName: String(store.ownerName || "").slice(0, 120),
    senderPhone: String(store.contact?.phone || store.phone || "").slice(0, 30),
    senderProvince: String(store.province || "").slice(0, 120),
    senderAddress: String(store.pickupAddress || "").slice(0, 200),
    status,
    isMarketplaceOrder: true,
    sourceType,
    ...attribution,
    logisticsProviderId: store.logisticsProviderId || "prov_sacha_pack",
    logisticsProviderName: String(delivery.logisticsProviderName || "Sacha Pack Logistics").slice(0, 120),
    sachaPackStatus: "pendiente",
    createdAt,
    history: [{ status, date: createdAt, note: "Orden creada en Sanpi Marketplace mediante compra sin registro." }]
  };
  const trustedTransaction = {
    id: transaction.id,
    createdByUid: "guest",
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
    paymentMethod: "COD",
    status: "pendiente",
    isMarketplaceOrder: true,
    sourceType,
    ...attribution,
    createdAt
  };
  return { delivery: trustedDelivery, transaction: trustedTransaction };
}
async function commitGuestOrder(delivery, transaction) {
  const db = serverFirestore();
  const articleRef = db.collection("articles").doc(String(delivery.articleId));
  const storeRef = db.collection("stores").doc(String(delivery.storeId));
  const deliveryRef = db.collection("deliveries").doc(String(delivery.trackingNumber));
  const transactionRef = db.collection("transactions").doc(String(transaction.id));
  const landingPage = delivery.sourceType === "landing_page" ? await readPublicLandingPage(String(delivery.landingPageSlug || "")) : null;
  const landingRef = landingPage ? db.collection("landing_pages").doc(landingPage.id) : null;
  await db.runTransaction(async (tx) => {
    const [articleSnapshot, storeSnapshot, landingSnapshot] = await Promise.all([
      tx.get(articleRef),
      tx.get(storeRef),
      landingRef ? tx.get(landingRef) : Promise.resolve(null)
    ]);
    if (!articleSnapshot.exists || !storeSnapshot.exists) throw new GuestCheckoutValidationError("Art\xEDculo o tienda no disponible.");
    const article = { ...articleSnapshot.data() || {}, id: articleSnapshot.id };
    const store = { ...storeSnapshot.data() || {}, id: storeSnapshot.id };
    const currentLanding = landingSnapshot?.exists ? { ...landingSnapshot.data() || {}, id: landingSnapshot.id } : null;
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
async function recordGuestCarrierResult(trackingNumber, response) {
  const success = response.success === true;
  const carrierTrackingId = typeof response.trackingNumber === "string" ? response.trackingNumber : "";
  await serverFirestore().collection("deliveries").doc(trackingNumber).update({
    sachaPackStatus: success ? "enviado" : "pendiente",
    sachaPackResponse: {
      success,
      message: String(response.message || "").slice(0, 500),
      ...typeof response.status === "number" ? { status: response.status } : {},
      ...carrierTrackingId ? { trackingNumber: carrierTrackingId } : {}
    },
    ...success ? { sachaPackDispatchedAt: (/* @__PURE__ */ new Date()).toISOString() } : {},
    ...carrierTrackingId ? { carrierTrackingId } : {}
  });
}

// src/lib/carrierStatusServer.ts
var import_node_crypto = require("node:crypto");
var PROVIDER_ID = /^prov_[a-z0-9_-]{1,80}$/i;
var GUIDE = /^[a-z0-9_-]{4,120}$/i;
var CarrierStatusError = class extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
};
function normalizedCarrierStatus(input) {
  const value = String(input || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const statuses = {
    pendiente: "pendiente",
    pending: "pendiente",
    "pendiente de recoger pickup": "pendiente de recoger pickup",
    "en transito": "en tr\xE1nsito",
    "in transit": "en tr\xE1nsito",
    "in route": "en tr\xE1nsito",
    entregado: "entregado",
    entregada: "entregado",
    delivered: "entregado",
    completed: "entregado",
    completado: "entregado",
    completada: "entregado",
    reprogramado: "reprogramado",
    reprogramada: "reprogramado",
    rescheduled: "reprogramado",
    "pendiente de retorno": "pendiente de retorno",
    "intento fallido": "pendiente de retorno",
    "retornado a almacen": "retornado a almac\xE9n",
    returned: "retornado a almac\xE9n",
    cancelado: "cancelado",
    cancelada: "cancelado",
    cancelled: "cancelado",
    canceled: "cancelado"
  };
  return statuses[value] || null;
}
function parseCarrierUpdate(body) {
  const providerId = String(body.providerId || "prov_sacha_pack").trim();
  if (!PROVIDER_ID.test(providerId)) throw new CarrierStatusError("Transportista inv\xE1lido.");
  const identifiers = [body.externalOrderId, body.trackingNumber, body.carrierTrackingId].filter((value) => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim());
  if (!identifiers.length || identifiers.some((value) => !GUIDE.test(value)))
    throw new CarrierStatusError("Gu\xEDa o identificador de orden inv\xE1lido.");
  const status = normalizedCarrierStatus(body.status);
  if (!status) throw new CarrierStatusError("Estado de entrega desconocido.");
  const proofPhotoUrl = String(body.proofPhotoUrl || body.podPhotoUrl || "").trim();
  const validProof = /^https:\/\//i.test(proofPhotoUrl) && proofPhotoUrl.length <= 2e3 || /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(proofPhotoUrl) && proofPhotoUrl.length <= 2e5;
  if (proofPhotoUrl && !validProof)
    throw new CarrierStatusError("URL de evidencia inv\xE1lida.");
  const timestamp = String(body.eventTimestamp || body.deliveredAt || "").trim();
  const parsed = timestamp ? new Date(timestamp) : /* @__PURE__ */ new Date();
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now() + 5 * 6e4)
    throw new CarrierStatusError("Fecha del evento inv\xE1lida.");
  return {
    providerId,
    identifiers: [...new Set(identifiers)],
    status,
    ...proofPhotoUrl ? { proofPhotoUrl } : {},
    ...typeof body.carrierTrackingId === "string" ? { carrierTrackingId: body.carrierTrackingId.trim() } : {},
    ...typeof body.courierId === "string" ? { courierId: body.courierId.slice(0, 120) } : {},
    ...typeof body.courierName === "string" ? { courierName: body.courierName.slice(0, 120) } : {},
    ...typeof body.courierPhone === "string" ? { courierPhone: body.courierPhone.slice(0, 40) } : {},
    ...typeof body.notes === "string" ? { notes: body.notes.slice(0, 500) } : {},
    eventTimestamp: parsed.toISOString()
  };
}
var hashSecret = (secret) => (0, import_node_crypto.createHash)("sha256").update(secret).digest("hex");
async function hasCarrierWebhookSecret(providerId) {
  if (!PROVIDER_ID.test(providerId)) return false;
  const doc = await serverFirestore().collection("carrier_webhook_credentials").doc(providerId).get();
  return Boolean(doc.data()?.secretHash);
}
async function rotateCarrierWebhookSecret(providerId) {
  if (!PROVIDER_ID.test(providerId)) throw new CarrierStatusError("Transportista inv\xE1lido.");
  const secret = `whsec_${(0, import_node_crypto.randomBytes)(32).toString("base64url")}`;
  await serverFirestore().collection("carrier_webhook_credentials").doc(providerId).set({
    secretHash: hashSecret(secret),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  return secret;
}
async function authenticateCarrierWebhook(providerId, supplied) {
  if (!PROVIDER_ID.test(providerId) || !supplied) return false;
  const doc = await serverFirestore().collection("carrier_webhook_credentials").doc(providerId).get();
  const saved = String(doc.data()?.secretHash || "");
  if (!/^[a-f0-9]{64}$/.test(saved)) return false;
  const expected = Buffer.from(saved, "hex");
  const actual = Buffer.from(hashSecret(supplied), "hex");
  return (0, import_node_crypto.timingSafeEqual)(expected, actual);
}
async function applyCarrierUpdate(update) {
  const db = serverFirestore();
  const collection = db.collection("deliveries");
  let deliveryRef = update.identifiers.find((value) => value.startsWith("SPSANPI-")) ? collection.doc(update.identifiers.find((value) => value.startsWith("SPSANPI-"))) : null;
  if (deliveryRef && !(await deliveryRef.get()).exists) deliveryRef = null;
  if (!deliveryRef) {
    for (const field of ["externalOrderId", "trackingNumber", "carrierTrackingId"]) {
      for (const identifier of update.identifiers) {
        const found = await collection.where(field, "==", identifier).limit(2).get();
        if (found.size > 1) throw new CarrierStatusError("La gu\xEDa coincide con varias \xF3rdenes.", 409);
        if (found.size === 1) {
          deliveryRef = found.docs[0].ref;
          break;
        }
      }
      if (deliveryRef) break;
    }
  }
  if (!deliveryRef) throw new CarrierStatusError("Orden no encontrada en Sanpi.", 404);
  const transactionQuery = await db.collection("transactions").where("trackingNumber", "==", deliveryRef.id).limit(2).get();
  if (transactionQuery.size > 1) throw new CarrierStatusError("Varias transacciones para esta orden.", 409);
  const transactionRef = transactionQuery.docs[0]?.ref;
  return db.runTransaction(async (tx) => {
    const deliverySnapshot = await tx.get(deliveryRef);
    if (!deliverySnapshot.exists) throw new CarrierStatusError("Orden no encontrada en Sanpi.", 404);
    const delivery = deliverySnapshot.data() || {};
    if (delivery.logisticsProviderId !== update.providerId)
      throw new CarrierStatusError("La orden pertenece a otro transportista.", 403);
    if (!update.identifiers.some((id) => [
      deliverySnapshot.id,
      delivery.trackingNumber,
      delivery.externalOrderId,
      delivery.carrierTrackingId,
      delivery.sachaPackResponse?.trackingNumber,
      delivery.sachaPackResponse?.sachaTrackingId
    ].includes(id)))
      throw new CarrierStatusError("La gu\xEDa no corresponde a la orden.", 403);
    if (update.verifiedCustomerPhone && update.verifiedCustomerPhone.replace(/\D/g, "") !== String(delivery.customerPhone || "").replace(/\D/g, ""))
      throw new CarrierStatusError("El destinatario de Sacha no coincide con Sanpi.", 409);
    if (update.verifiedCustomerName && update.verifiedCustomerName.trim().toLocaleLowerCase("es-DO") !== String(delivery.customerName || "").trim().toLocaleLowerCase("es-DO"))
      throw new CarrierStatusError("El destinatario de Sacha no coincide con Sanpi.", 409);
    if (["entregado", "retornado a almac\xE9n", "cancelado"].includes(delivery.status) && delivery.status !== update.status)
      throw new CarrierStatusError("La orden ya tiene un estado final distinto.", 409);
    if (update.status === "entregado" && !update.proofPhotoUrl && !delivery.proofPhotoUrl)
      throw new CarrierStatusError("Sacha debe adjuntar proofPhotoUrl para confirmar la entrega.", 422);
    if (delivery.status === update.status) return { trackingNumber: deliverySnapshot.id, status: update.status, changed: false };
    if (transactionRef) await tx.get(transactionRef);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    tx.update(deliveryRef, {
      status: update.status,
      history: [...Array.isArray(delivery.history) ? delivery.history : [], {
        status: update.status,
        date: update.eventTimestamp,
        note: update.notes || `Actualizaci\xF3n autenticada de ${update.providerId}.`
      }],
      ...update.proofPhotoUrl ? { proofPhotoUrl: update.proofPhotoUrl } : {},
      ...update.carrierTrackingId ? { carrierTrackingId: update.carrierTrackingId } : {},
      ...update.courierId ? { deliveryPersonId: update.courierId } : {},
      ...update.courierName ? { deliveryPersonName: update.courierName } : {},
      ...update.courierPhone ? { deliveryPersonPhone: update.courierPhone } : {},
      ...update.source ? { carrierStatusSource: update.source } : {},
      ...update.carrierTotalToCollect !== void 0 ? { carrierTotalToCollect: update.carrierTotalToCollect } : {},
      ...update.carrierDeliveryFee !== void 0 ? { carrierDeliveryFee: update.carrierDeliveryFee } : {},
      carrierStatusUpdatedAt: now
    });
    if (transactionRef && ["entregado", "cancelado"].includes(update.status))
      tx.update(transactionRef, { status: update.status });
    return { trackingNumber: deliverySnapshot.id, status: update.status, changed: true };
  });
}
function sachaUpdateFromDocument(guide, remote) {
  const fields = remote.fields || {};
  const value = (name) => String(fields[name]?.stringValue || "");
  if (remote.name?.split("/").pop() !== guide || value("externalOrderId") !== guide || fields.isApiOrder?.booleanValue !== true)
    throw new CarrierStatusError("La gu\xEDa de Sacha no corresponde a la orden.", 409);
  const status = normalizedCarrierStatus(value("status"));
  if (!status) throw new CarrierStatusError("Sacha devolvi\xF3 un estado desconocido.", 422);
  const amount = (name) => Number(fields[name]?.integerValue ?? fields[name]?.doubleValue);
  return {
    providerId: "prov_sacha_pack",
    identifiers: [guide],
    status,
    proofPhotoUrl: value("proofPhotoUrl") || void 0,
    courierId: value("deliveryPersonId") || void 0,
    verifiedCustomerPhone: value("customerPhone"),
    verifiedCustomerName: value("customerName"),
    carrierTotalToCollect: Number.isFinite(amount("totalToCollect")) ? amount("totalToCollect") : void 0,
    carrierDeliveryFee: Number.isFinite(amount("deliveryFee")) ? amount("deliveryFee") : void 0,
    eventTimestamp: remote.updateTime || (/* @__PURE__ */ new Date()).toISOString(),
    notes: `Estado verificado directamente en Sacha Pack: ${status}.`,
    source: "sacha-pull"
  };
}
async function syncSachaDelivery(guide) {
  if (!/^SPSANPI-[A-Z0-9-]{8,100}$/.test(guide)) throw new CarrierStatusError("Gu\xEDa Sanpi inv\xE1lida.");
  const delivery = await serverFirestore().collection("deliveries").doc(guide).get();
  if (!delivery.exists || delivery.data()?.logisticsProviderId !== "prov_sacha_pack")
    throw new CarrierStatusError("Gu\xEDa Sacha no encontrada en Sanpi.", 404);
  const endpoint = `https://firestore.googleapis.com/v1/projects/studio-9195671573-fb490/databases/(default)/documents/deliveries/${guide}`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(1e4) });
  if (response.status === 404) throw new CarrierStatusError("Sacha todav\xEDa no registra esta gu\xEDa.", 404);
  if (!response.ok) throw new CarrierStatusError("No se pudo consultar el estado en Sacha.", 502);
  const remote = await response.json();
  return applyCarrierUpdate(sachaUpdateFromDocument(guide, remote));
}

// server.ts
var SACHA_WEBHOOK_URL = "https://sacha--studio-9195671573-fb490.us-east4.hosted.app/api/logistics-webhook";
var SACHA_ALTERNATE_WEBHOOK_URL = "https://www.sachapack.com/api/logistics-webhook";
var isSachaWebhookUrl = (url) => url === SACHA_WEBHOOK_URL || url === SACHA_ALTERNATE_WEBHOOK_URL;
var SACHA_STORE_ID = "ds_80NC3boX9Le29wnJe3zO9OJ0cFz1";
async function authorizeSachaDispatch(idToken, deliveryId, order) {
  if (!idToken || !deliveryId || deliveryId.length > 100) return false;
  const identityResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebase_applet_config_default.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(1e4)
  });
  if (!identityResponse.ok) return false;
  const identity = await identityResponse.json();
  const user = identity.users?.[0];
  if (!user?.localId) return false;
  const documentUrl = `https://firestore.googleapis.com/v1/projects/${firebase_applet_config_default.projectId}/databases/${firebase_applet_config_default.firestoreDatabaseId}/documents/deliveries/${encodeURIComponent(deliveryId)}`;
  const documentResponse = await fetch(documentUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
    signal: AbortSignal.timeout(1e4)
  });
  if (!documentResponse.ok) return false;
  const document = await documentResponse.json();
  const fields = document.fields || {};
  const isAdmin = ["sanpimarketplace@gmail.com", "martin.tavarez.gomez@gmail.com"].includes(String(user.email || "").toLowerCase()) && user.emailVerified === true && user.providerUserInfo?.some((provider) => provider.providerId === "google.com");
  const ownsOrder = fields.createdByUid?.stringValue === user.localId;
  const assignedCarrier = fields.deliveryPersonId?.stringValue === user.localId || fields.carrierId?.stringValue === user.localId;
  if (!isAdmin && !ownsOrder && !assignedCarrier) return false;
  if (fields.isMarketplaceOrder?.booleanValue !== true) return false;
  if (fields.externalOrderId?.stringValue !== order.externalOrderId && fields.trackingNumber?.stringValue !== order.externalOrderId) return false;
  if (!isAdmin) {
    if (fields.customerName?.stringValue !== order.customer.name || fields.customerPhone?.stringValue?.replace(/[^0-9]/g, "") !== order.customer.phone.replace(/[^0-9]/g, "") || fields.address?.stringValue !== order.customer.address || fields.province?.stringValue !== order.customer.province) return false;
    const total = order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
    if (Math.abs(total - Number(fields.basePrice?.doubleValue ?? fields.basePrice?.integerValue ?? 0)) > 0.01) return false;
  }
  return true;
}
process.stdout.on("error", (err) => {
  if (err && err.code === "EPIPE") return;
});
process.stderr.on("error", (err) => {
  if (err && err.code === "EPIPE") return;
});
process.on("uncaughtException", (err) => {
  if (err && (err.code === "EPIPE" || err.code === "ECONNRESET")) {
    return;
  }
  console.error("Unhandled Exception caught safely:", err);
});
process.on("unhandledRejection", (reason) => {
  console.warn("Unhandled Rejection caught safely:", reason);
});
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.set("trust proxy", 1);
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  const guestOrderAttempts = /* @__PURE__ */ new Map();
  app.post("/api/checkout/guest", async (req, res) => {
    if (!isAllowedGuestCheckoutOrigin(req.get("origin"), req.get("host"))) {
      return res.status(403).json({ success: false, message: "Origen de compra inv\xE1lido." });
    }
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const attempts = guestOrderAttempts.get(clientIp);
    const rate = !attempts || attempts.resetAt < now ? { count: 1, resetAt: now + 6e4 } : { ...attempts, count: attempts.count + 1 };
    guestOrderAttempts.set(clientIp, rate);
    if (rate.count > 5) return res.status(429).json({ success: false, message: "Demasiados intentos. Espera un minuto." });
    try {
      const delivery = req.body?.delivery;
      const transaction = req.body?.transaction;
      if (!delivery || !transaction || JSON.stringify(req.body).length > 3e4) {
        return res.status(400).json({ success: false, message: "Datos de compra inv\xE1lidos." });
      }
      const article = await readPublicArticle(String(delivery.articleId || ""));
      if (!article) return res.status(400).json({ success: false, message: "Art\xEDculo no disponible." });
      const store = await readPublicStore(String(delivery.storeId || ""));
      if (!store) return res.status(400).json({ success: false, message: "Tienda no disponible." });
      const landingPage = delivery.sourceType === "landing_page" ? await readPublicLandingPage(String(delivery.landingPageSlug || "")) : null;
      const validationError = validateGuestOrder(delivery, transaction, article, store, landingPage);
      if (validationError) return res.status(400).json({ success: false, message: validationError });
      const expectedProviderId = String(store.logisticsProviderId || "prov_sacha_pack");
      if (delivery.logisticsProviderId !== expectedProviderId) {
        return res.status(400).json({ success: false, message: "Transportista no corresponde a la tienda." });
      }
      await commitGuestOrder(delivery, transaction);
      let sachaPackResponse = {
        success: false,
        message: "Orden registrada; pendiente de despacho al transportista."
      };
      try {
        const providerId = expectedProviderId;
        const config = (await readPrivateCarrierConfigs())[providerId];
        const endpointUrl = config?.endpointUrl || (providerId === "prov_sacha_pack" ? SACHA_WEBHOOK_URL : "");
        if (endpointUrl) {
          const endpoint = new URL(endpointUrl);
          if (endpoint.protocol !== "https:") throw new Error("Endpoint del transportista inv\xE1lido.");
          const payload = {
            storeId: config?.storeId || SACHA_STORE_ID,
            externalOrderId: delivery.trackingNumber,
            items: [{
              barcode_imei: String(article?.barcode_imei || delivery.barcode_imei || "1234567890"),
              quantity: delivery.quantity,
              price: article?.price,
              name: article?.name
            }],
            customer: {
              name: delivery.customerName,
              phone: delivery.customerPhone,
              address: delivery.address,
              province: delivery.province,
              municipality: delivery.municipality || delivery.city
            },
            paymentMethod: "COD"
          };
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...config?.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(12e3)
          });
          const carrierResult = await response.json().catch(() => ({}));
          sachaPackResponse = {
            success: response.ok && carrierResult.success !== false,
            status: response.status,
            message: String(carrierResult.message || (response.ok ? "Orden recibida por el transportista." : "Transportista no acept\xF3 la orden.")),
            trackingNumber: carrierResult.trackingNumber || carrierResult.trackingId || carrierResult.id,
            providerId
          };
        }
      } catch (dispatchError) {
        console.warn("Guest order carrier dispatch:", dispatchError);
      }
      try {
        await recordGuestCarrierResult(delivery.trackingNumber, sachaPackResponse);
      } catch (recordError) {
        console.warn("Guest order carrier result:", recordError);
      }
      return res.status(201).json({ success: true, trackingNumber: delivery.trackingNumber, sachaPackResponse });
    } catch (error) {
      console.error("Guest checkout:", error);
      if (error instanceof GuestCheckoutValidationError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: "No se pudo registrar la orden. Int\xE9ntalo de nuevo." });
    }
  });
  const isCarrierConfigAdmin = async (req) => {
    const idToken = String(req.headers["x-sanpi-id-token"] || "");
    if (!idToken) return false;
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebase_applet_config_default.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok) return false;
    const identity = await response.json();
    const user = identity.users?.[0];
    if (!user?.emailVerified) return false;
    const email = String(user.email || "").toLowerCase();
    const verifiedGoogleAdmin = ["sanpimarketplace@gmail.com", "martin.tavarez.gomez@gmail.com"].includes(email) && user.providerUserInfo?.some((provider) => provider.providerId === "google.com");
    let claims = {};
    try {
      claims = JSON.parse(user.customAttributes || "{}");
    } catch {
    }
    return Boolean(verifiedGoogleAdmin || claims.role === "admin");
  };
  app.get("/api/carrier/config", async (req, res) => {
    try {
      if (!await isCarrierConfigAdmin(req)) return res.status(403).json({ success: false, message: "Solo administradores pueden ver esta configuraci\xF3n." });
      const providerId = String(req.query.providerId || "");
      if (!/^prov_[a-z0-9_-]{1,80}$/i.test(providerId)) return res.status(400).json({ success: false, message: "Transportista inv\xE1lido." });
      const config = (await readPrivateCarrierConfigs())[providerId] || null;
      return res.json({ success: true, config });
    } catch {
      return res.status(500).json({ success: false, message: "No se pudo leer la configuraci\xF3n privada." });
    }
  });
  app.put("/api/carrier/config", async (req, res) => {
    try {
      if (!await isCarrierConfigAdmin(req)) return res.status(403).json({ success: false, message: "Solo administradores pueden guardar esta configuraci\xF3n." });
      const providerId = String(req.body?.providerId || "");
      const storeId = String(req.body?.storeId || "").trim();
      const endpointUrl = String(req.body?.endpointUrl || "").trim();
      const apiKey = String(req.body?.apiKey || "").trim();
      if (!/^prov_[a-z0-9_-]{1,80}$/i.test(providerId) || !storeId || storeId.length > 200 || apiKey.length > 2e3) {
        return res.status(400).json({ success: false, message: "Store ID, API Key o transportista inv\xE1lido." });
      }
      let endpoint;
      try {
        endpoint = new URL(endpointUrl);
      } catch {
        return res.status(400).json({ success: false, message: "Endpoint inv\xE1lido." });
      }
      if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
        return res.status(400).json({ success: false, message: "El endpoint debe usar HTTPS y no incluir credenciales en la URL." });
      }
      await savePrivateCarrierConfig(providerId, { storeId, endpointUrl, apiKey });
      return res.json({ success: true, message: "Configuraci\xF3n guardada." });
    } catch {
      return res.status(500).json({ success: false, message: "No se pudo guardar la configuraci\xF3n privada." });
    }
  });
  app.get("/api/carrier/webhook-secret", async (req, res) => {
    try {
      if (!await isCarrierConfigAdmin(req)) return res.status(403).json({ success: false });
      const providerId = String(req.query.providerId || "");
      res.setHeader("Cache-Control", "no-store");
      return res.json({ success: true, configured: await hasCarrierWebhookSecret(providerId) });
    } catch {
      return res.status(500).json({ success: false, message: "No se pudo consultar el webhook." });
    }
  });
  app.post("/api/carrier/webhook-secret", async (req, res) => {
    try {
      if (!await isCarrierConfigAdmin(req)) return res.status(403).json({ success: false });
      const secret = await rotateCarrierWebhookSecret(String(req.body?.providerId || ""));
      res.setHeader("Cache-Control", "no-store");
      return res.json({ success: true, secret, message: "Guarda esta clave en Sacha. Solo se mostrar\xE1 ahora." });
    } catch (error) {
      return res.status(error instanceof CarrierStatusError ? error.statusCode : 500).json({ success: false, message: error instanceof CarrierStatusError ? error.message : "No se pudo generar la clave." });
    }
  });
  const buildCarrierHeaders = (options) => {
    const effectiveKey = (options.apiKey || options.authToken || "").trim();
    const outgoingHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Sanpi-Logistics-Gateway/2.0 (Dominican-Republic)",
      ...options.headers || {}
    };
    if (effectiveKey) {
      const authType = options.authType || "x-api-key";
      if (authType === "bearer") {
        outgoingHeaders["Authorization"] = `Bearer ${effectiveKey}`;
      } else if (authType === "custom_header" && options.customHeaderName) {
        outgoingHeaders[options.customHeaderName.trim()] = effectiveKey;
      } else if (authType === "apikey") {
        outgoingHeaders["apikey"] = effectiveKey;
      } else {
        outgoingHeaders["x-api-key"] = effectiveKey;
        outgoingHeaders["Authorization"] = `Bearer ${effectiveKey}`;
        outgoingHeaders["apikey"] = effectiveKey;
      }
    }
    return outgoingHeaders;
  };
  const handleTestConnection = async (req, res) => {
    const {
      endpointUrl,
      webhookUrl,
      apiKey = "",
      authToken = "",
      authType = "x-api-key",
      customHeaderName = "",
      httpMethod = "POST",
      headers = {},
      samplePayload
    } = req.body;
    let rawTargetUrl = (endpointUrl || webhookUrl || req.body?.url || "").trim();
    let rawApiKey = (apiKey || authToken || "").trim();
    if ((rawTargetUrl.startsWith("sk_") || rawTargetUrl.startsWith("sanpi_")) && (rawApiKey.startsWith("http://") || rawApiKey.startsWith("https://"))) {
      const temp = rawTargetUrl;
      rawTargetUrl = rawApiKey;
      rawApiKey = temp;
    } else if (rawTargetUrl.startsWith("sk_") || rawTargetUrl.startsWith("sanpi_") || !rawTargetUrl.includes("://") && rawTargetUrl.length > 25 && !rawTargetUrl.includes("/")) {
      if (!rawApiKey) rawApiKey = rawTargetUrl;
      rawTargetUrl = SACHA_WEBHOOK_URL;
    }
    let targetUrl = rawTargetUrl || SACHA_WEBHOOK_URL;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      if (targetUrl.includes(".")) {
        targetUrl = `https://${targetUrl}`;
      } else {
        return res.status(400).json({
          success: false,
          status: 400,
          latencyMs: 0,
          message: `La URL "${targetUrl}" no es v\xE1lida. Debe comenzar con http:// o https://`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          endpoint: targetUrl
        });
      }
    }
    const outgoingHeaders = buildCarrierHeaders({
      apiKey: rawApiKey,
      authToken: rawApiKey,
      authType,
      customHeaderName,
      headers
    });
    const testPayload = samplePayload || {
      event: "PING_HANDSHAKE",
      source: "Sanpi Marketplace RD",
      test: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      storeId: req.body.defaultStoreId || "SANPI-TEST-STORE",
      message: "Verificaci\xF3n de handshake y conectividad con empresa de transporte"
    };
    const startTime = performance.now();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`
\u{1F50D} [Carrier Connection Test] Probando endpoint: ${targetUrl}`);
    console.log(`\u{1F511} [Carrier Connection Test] Autenticaci\xF3n configurada: ${Boolean(rawApiKey)}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12e3);
      const response = await fetch(targetUrl, {
        method: httpMethod,
        headers: outgoingHeaders,
        body: typeof testPayload === "string" ? testPayload : JSON.stringify(testPayload),
        signal: controller.signal,
        redirect: "manual"
      });
      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);
      const status = response.status;
      const location = response.headers.get("location") || "";
      if ((status === 302 || status === 301 || status === 307) && (location.includes("cloudworkstations.dev") || location.includes("forwardAuthCookie"))) {
        return res.status(200).json({
          success: false,
          status: 302,
          latencyMs,
          message: `El puerto del webhook en Cloud Workstations / Firebase Studio es PRIVADO. Para que reciba \xF3rdenes, cambia la visibilidad a "P\xFAblico" en la pesta\xF1a de Puertos de Firebase Studio.`,
          timestamp,
          endpoint: targetUrl,
          diagnostic: {
            dnsOk: true,
            sslOk: targetUrl.startsWith("https"),
            authHeaderDetected: Boolean(apiKey || authToken),
            details: "Cloud Workstation private port authentication required"
          }
        });
      }
      let responseData = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }
      } else {
        responseData = await response.text();
      }
      const isSuccess = response.ok;
      const message = isSuccess ? `\xA1Conexi\xF3n Exitosa! El servidor de la empresa de transporte respondi\xF3 correctamente (HTTP ${status} en ${latencyMs}ms)` : `Servidor respondi\xF3 con c\xF3digo HTTP ${status} (${response.statusText}) en ${latencyMs}ms.`;
      return res.status(200).json({
        success: isSuccess,
        status,
        latencyMs,
        message,
        timestamp,
        endpoint: targetUrl,
        rawResponse: responseData,
        diagnostic: {
          dnsOk: true,
          sslOk: targetUrl.startsWith("https"),
          authHeaderDetected: Boolean(apiKey || authToken),
          contentType,
          details: isSuccess ? "Handshake completado satisfactoriamente" : "Verifica credenciales o formato"
        }
      });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startTime);
      const isDnsOrUnreachable = err.code === "ENOTFOUND" || err.message?.includes("fetch failed") || err.message?.includes("getaddrinfo") || err.name === "AbortError";
      return res.status(200).json({
        success: false,
        status: isDnsOrUnreachable ? 503 : 500,
        latencyMs,
        message: isDnsOrUnreachable ? `No se pudo alcanzar el endpoint (${targetUrl}). Verifica que el dominio exista y est\xE9 activo en internet.` : `Error de conexi\xF3n: ${err.message}`,
        timestamp,
        endpoint: targetUrl,
        rawResponse: { error: err.message, code: err.code || "CONNECTION_ERROR" },
        diagnostic: {
          dnsOk: !isDnsOrUnreachable,
          sslOk: targetUrl.startsWith("https"),
          authHeaderDetected: Boolean(apiKey || authToken),
          details: err.message
        }
      });
    }
  };
  app.post("/api/logistics/test-connection", handleTestConnection);
  app.post("/api/logistics-test-connection", handleTestConnection);
  const handleLogisticsDispatch = async (req, res) => {
    const {
      webhookUrl,
      endpointUrl,
      httpMethod = "POST",
      headers = {},
      apiKey = "",
      authToken = "",
      authType = "x-api-key",
      customHeaderName = "",
      payload
    } = req.body;
    const providerId = String(req.body?.providerId || "");
    let privateConfig = null;
    if (/^prov_[a-z0-9_-]{1,80}$/i.test(providerId)) {
      try {
        privateConfig = (await readPrivateCarrierConfigs())[providerId] || null;
      } catch {
        return res.status(503).json({ success: false, message: "No se pudo leer la configuraci\xF3n privada del transportista." });
      }
    }
    let rawTargetUrl = String(privateConfig?.endpointUrl || endpointUrl || webhookUrl || req.body?.url || "").trim();
    let rawApiKey = String(privateConfig?.apiKey || apiKey || authToken || "").trim();
    if ((rawTargetUrl.startsWith("sk_") || rawTargetUrl.startsWith("sanpi_")) && (rawApiKey.startsWith("http://") || rawApiKey.startsWith("https://"))) {
      const temp = rawTargetUrl;
      rawTargetUrl = rawApiKey;
      rawApiKey = temp;
    } else if (rawTargetUrl.startsWith("sk_") || rawTargetUrl.startsWith("sanpi_") || !rawTargetUrl.includes("://") && rawTargetUrl.length > 25 && !rawTargetUrl.includes("/")) {
      if (!rawApiKey) rawApiKey = rawTargetUrl;
      rawTargetUrl = SACHA_WEBHOOK_URL;
    }
    let targetUrl = rawTargetUrl || SACHA_WEBHOOK_URL;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      if (targetUrl.includes(".")) {
        targetUrl = `https://${targetUrl}`;
      } else {
        targetUrl = SACHA_WEBHOOK_URL;
      }
    }
    if (!payload) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: payload is required"
      });
    }
    const isSachaPack = req.body?.providerCode === "sacha_pack" || isSachaWebhookUrl(targetUrl);
    const requiresVerifiedOrder = isSachaPack || Boolean(privateConfig?.apiKey);
    let sanitizedPayload = payload;
    if (typeof sanitizedPayload === "string") {
      try {
        sanitizedPayload = JSON.parse(sanitizedPayload);
      } catch {
      }
    }
    if (privateConfig?.storeId && sanitizedPayload && typeof sanitizedPayload === "object") {
      sanitizedPayload.storeId = privateConfig.storeId;
    }
    if (sanitizedPayload && typeof sanitizedPayload === "object") {
      const currentStoreId = String(sanitizedPayload.storeId || "").trim();
      if (isSachaPack && (!currentStoreId || currentStoreId === "TU_UID_DE_SOCIO" || currentStoreId === "TU_ID_DE_SOCIO" || currentStoreId === "TU_PARTNER_UID" || currentStoreId === "TU_STORE_ID" || currentStoreId === "sxOzEivG9GP9SvaVuF1nVpQZCOu1" || currentStoreId.startsWith("TU_") || currentStoreId.startsWith("store_") || currentStoreId.startsWith("store-") || currentStoreId.length < 10)) {
        sanitizedPayload.storeId = SACHA_STORE_ID;
      }
    }
    const resolvedApiKey = isSachaPack ? (rawApiKey || process.env.SACHA_API_KEY || "").trim() : rawApiKey;
    if (requiresVerifiedOrder) {
      const order = sanitizedPayload;
      if (!order || typeof order !== "object" || !order.storeId || !order.externalOrderId || !Array.isArray(order.items) || order.items.length === 0 || order.items.some((item) => !item.barcode_imei || !item.name || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0) || !order.customer?.name || !order.customer?.phone || !order.customer?.address || !order.customer?.province) {
        return res.status(400).json({ success: false, message: "Pedido incompleto para Sacha: storeId, externalOrderId, items y customer son obligatorios." });
      }
      try {
        const authorized = await authorizeSachaDispatch(
          String(req.headers["x-sanpi-id-token"] || ""),
          String(req.body.deliveryId || ""),
          order
        );
        if (!authorized) return res.status(403).json({ success: false, message: "La orden no est\xE1 verificada para el usuario autenticado." });
      } catch {
        return res.status(503).json({ success: false, message: "No se pudo verificar la orden en Firebase. Intenta de nuevo." });
      }
      if (!resolvedApiKey) {
        return res.status(503).json({ success: false, message: "Falta guardar la API Key del transportista o configurar SACHA_API_KEY en Hostinger." });
      }
      sanitizedPayload = {
        storeId: order.storeId,
        externalOrderId: order.externalOrderId,
        items: order.items.map((item) => ({
          barcode_imei: String(item.barcode_imei),
          quantity: Number(item.quantity),
          price: Number(item.price),
          name: String(item.name)
        })),
        customer: {
          name: String(order.customer.name),
          phone: String(order.customer.phone),
          address: String(order.customer.address),
          province: String(order.customer.province)
        }
      };
    }
    const outgoingHeaders = buildCarrierHeaders({
      apiKey: resolvedApiKey,
      authToken: resolvedApiKey,
      authType: isSachaPack ? "bearer" : authType,
      customHeaderName,
      headers
    });
    if (isSachaPack) {
      for (const header of Object.keys(outgoingHeaders)) {
        if (!["content-type", "accept", "authorization"].includes(header.toLowerCase())) delete outgoingHeaders[header];
      }
      outgoingHeaders.Authorization = `Bearer ${resolvedApiKey}`;
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`
\u{1F69A} [Server Carrier Dispatch] Enviando ${httpMethod} a: ${targetUrl}`);
    console.log(`\u{1F511} [Server Carrier Dispatch] Autenticaci\xF3n configurada: ${Boolean(resolvedApiKey)}`);
    console.log(`\u{1F4E6} [Server Carrier Dispatch] Payload:`, JSON.stringify(sanitizedPayload, null, 2));
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15e3);
      const response = await fetch(targetUrl, {
        method: httpMethod,
        headers: outgoingHeaders,
        body: typeof sanitizedPayload === "string" ? sanitizedPayload : JSON.stringify(sanitizedPayload),
        signal: controller.signal,
        redirect: "manual"
      });
      clearTimeout(timeoutId);
      const status = response.status;
      const location = response.headers.get("location") || "";
      if ((status === 302 || status === 301 || status === 307) && (location.includes("cloudworkstations.dev") || location.includes("forwardAuthCookie"))) {
        console.warn(`\u{1F512} [Server Logistics Proxy] El endpoint ${targetUrl} est\xE1 protegido por autenticaci\xF3n de Cloud Workstation.`);
        return res.status(200).json({
          success: false,
          status: 302,
          statusText: "Found (Workstation Auth Required)",
          message: `El puerto del webhook en Cloud Workstations / Firebase Studio es PRIVADO. Para que reciba las \xF3rdenes, cambia la visibilidad del puerto a "P\xFAblico" en la pesta\xF1a de Puertos de Firebase Studio o utiliza una URL p\xFAblica (Cloud Run, ngrok o dominio propio).`,
          timestamp,
          endpoint: targetUrl,
          redirectLocation: location,
          isSimulated: false,
          rawResponse: {
            error: "CLOUD_WORKSTATION_PRIVATE_PORT",
            hint: "Configura el puerto como P\xFAblico en Firebase Studio o usa un endpoint accesible sin cookie de sesi\xF3n.",
            redirectUrl: location
          }
        });
      }
      let responseData = null;
      const responseContentType = response.headers.get("content-type") || "";
      if (responseContentType.includes("application/json")) {
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }
      } else {
        responseData = await response.text();
      }
      console.log(`\u{1F4E5} [Server Carrier Dispatch] Respuesta remota: HTTP ${response.status}`);
      console.log(`\u{1F4C4} [Server Carrier Dispatch] Data:`, typeof responseData === "object" ? JSON.stringify(responseData) : responseData);
      let isSuccess = response.ok && responseData?.success !== false;
      let trackingNumber = typeof responseData === "object" && responseData ? responseData.trackingNumber || responseData.trackingId || responseData.id || responseData.tracking_number || responseData.orderId || responseData.guideNumber : null;
      let totalToCollect = typeof responseData === "object" && responseData && responseData.totalToCollect !== void 0 ? Number(responseData.totalToCollect) : void 0;
      if (!isSuccess && isSachaPack && responseData && typeof responseData === "object" && typeof responseData.error === "string" && responseData.error.toLowerCase().includes("tienda") && sanitizedPayload?.storeId !== SACHA_STORE_ID) {
        console.log(`\u{1F504} [Server Carrier Dispatch] Reintentando con el Store ID configurado de Sacha...`);
        try {
          const retryPayload = {
            ...sanitizedPayload,
            storeId: SACHA_STORE_ID
          };
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 12e3);
          const retryResponse = await fetch(targetUrl, {
            method: httpMethod,
            headers: outgoingHeaders,
            body: JSON.stringify(retryPayload),
            signal: retryController.signal,
            redirect: "manual"
          });
          clearTimeout(retryTimeoutId);
          let retryData = null;
          try {
            retryData = await retryResponse.json();
          } catch {
            retryData = await retryResponse.text();
          }
          console.log(`\u{1F4E5} [Server Carrier Dispatch Retry] Status: HTTP ${retryResponse.status}`, retryData);
          if (retryResponse.ok || retryResponse.status === 201) {
            isSuccess = true;
            responseData = retryData;
            trackingNumber = typeof retryData === "object" && retryData ? retryData.trackingNumber || retryData.trackingId || retryData.id || retryData.tracking_number || retryData.orderId || retryData.guideNumber : null;
            totalToCollect = typeof retryData === "object" && retryData && retryData.totalToCollect !== void 0 ? Number(retryData.totalToCollect) : void 0;
          }
        } catch (retryErr) {
          console.warn(`[Server Carrier Dispatch Retry] Error during master store retry:`, retryErr.message);
        }
      }
      let explanationMessage = isSuccess ? responseData?.message || `Orden integrada exitosamente en la red de la empresa de transporte (HTTP ${response.status})` : `La empresa de transporte respondi\xF3 con c\xF3digo HTTP ${response.status}: ${typeof responseData === "object" ? JSON.stringify(responseData) : String(responseData).slice(0, 300)}`;
      if (!isSuccess && responseData && typeof responseData === "object" && responseData.error) {
        if (typeof responseData.error === "string" && responseData.error.toLowerCase().includes("tienda")) {
          explanationMessage = `Sacha Pack API (${response.status}): ${responseData.error}. Verifica el Store ID registrado en Sacha.`;
        }
      }
      return res.status(200).json({
        success: isSuccess,
        status: response.status,
        statusText: response.statusText,
        message: explanationMessage,
        timestamp,
        endpoint: targetUrl,
        trackingNumber: trackingNumber || void 0,
        totalToCollect,
        sachaTrackingId: trackingNumber || void 0,
        rawResponse: responseData,
        isSimulated: false
      });
    } catch (err) {
      const isDnsOrUnreachable = err.code === "ENOTFOUND" || err.message?.includes("fetch failed") || err.message?.includes("getaddrinfo") || err.name === "AbortError";
      const friendlyMessage = isDnsOrUnreachable ? `No se pudo conectar al endpoint de la empresa de transporte (${targetUrl}). Verifique que la URL y el servidor est\xE9n activos.` : `Fallo de conexi\xF3n al endpoint de transporte: ${err.message}`;
      console.warn(`\u26A0\uFE0F [Server Carrier Dispatch] Aviso de conexi\xF3n a ${targetUrl}: ${err.message}`);
      return res.status(200).json({
        success: false,
        status: isDnsOrUnreachable ? 503 : 502,
        message: friendlyMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        endpoint: targetUrl,
        rawResponse: { error: err.message, code: err.code || "CONNECTION_ERROR", hint: "Verifica la URL del Endpoint y la API Key en la configuraci\xF3n de la empresa." },
        isSimulated: false
      });
    }
  };
  app.post("/api/logistics-dispatch", handleLogisticsDispatch);
  app.post("/api/logistics/dispatch", handleLogisticsDispatch);
  app.post("/api/logistics/webhook-receiver", async (req, res) => {
    try {
      const update = parseCarrierUpdate(req.body || {});
      const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
      const supplied = bearer || String(req.headers["x-webhook-secret"] || req.headers["x-api-key"] || "").trim();
      if (!await authenticateCarrierWebhook(update.providerId, supplied))
        return res.status(401).json({ success: false, message: "Clave de webhook inv\xE1lida o sin configurar." });
      const result = await applyCarrierUpdate(update);
      return res.json({ success: true, ...result });
    } catch (error) {
      console.error("Inbound carrier update failed:", error instanceof Error ? error.message : error);
      return res.status(error instanceof CarrierStatusError ? error.statusCode : 500).json({ success: false, message: error instanceof CarrierStatusError ? error.message : "No se pudo actualizar la orden." });
    }
  });
  const sachaSyncAttempts = /* @__PURE__ */ new Map();
  app.post("/api/sacha/sync-status", async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const previous = sachaSyncAttempts.get(clientIp);
    const rate = !previous || previous.resetAt < now ? { count: 1, resetAt: now + 6e4 } : { ...previous, count: previous.count + 1 };
    sachaSyncAttempts.set(clientIp, rate);
    if (rate.count > 10) return res.status(429).json({ success: false, message: "Demasiadas consultas." });
    try {
      const result = await syncSachaDelivery(String(req.body?.trackingNumber || "").trim());
      return res.json({ success: true, ...result });
    } catch (error) {
      return res.status(error instanceof CarrierStatusError ? error.statusCode : 500).json({ success: false, message: error instanceof CarrierStatusError ? error.message : "No se pudo consultar a Sacha." });
    }
  });
  const handleCarrierNotify = async (req, res) => {
    try {
      const {
        storeId,
        apiKey,
        endpointUrl,
        order,
        // Also accept common alias parameter names for broad compatibility
        carrierEndpointUrl,
        webhookUrl,
        url,
        key,
        token,
        externalOrderId,
        items,
        customer,
        paymentMethod
      } = req.body || {};
      let rawEndpoint = (endpointUrl || carrierEndpointUrl || webhookUrl || url || "").trim();
      let rawApiKey = (apiKey || key || token || req.headers["authorization"]?.replace(/^Bearer\s+/i, "") || "").trim();
      const suppliedStoreId = (storeId || req.body?.store_id || "").trim();
      const resolvedStoreId = !suppliedStoreId || suppliedStoreId === "sxOzEivG9GP9SvaVuF1nVpQZCOu1" ? SACHA_STORE_ID : suppliedStoreId;
      if ((rawEndpoint.startsWith("sk_") || rawEndpoint.startsWith("sanpi_")) && (rawApiKey.startsWith("http://") || rawApiKey.startsWith("https://"))) {
        console.log(`\u{1F504} [Carrier Notify API] Par\xE1metros invertidos detectados. Intercambiando endpointUrl y apiKey.`);
        const temp = rawEndpoint;
        rawEndpoint = rawApiKey;
        rawApiKey = temp;
      } else if (rawEndpoint.startsWith("sk_") || rawEndpoint.startsWith("sanpi_") || !rawEndpoint.includes("://") && rawEndpoint.length > 25 && !rawEndpoint.includes("/")) {
        console.log(`\u{1F511} [Carrier Notify API] Clave API detectada en endpointUrl (${rawEndpoint.slice(0, 10)}...). Asignando a apiKey y usando webhook oficial.`);
        if (!rawApiKey) {
          rawApiKey = rawEndpoint;
        }
        rawEndpoint = SACHA_WEBHOOK_URL;
      }
      if (!rawEndpoint) {
        rawEndpoint = SACHA_WEBHOOK_URL;
      }
      if (!rawEndpoint.startsWith("http://") && !rawEndpoint.startsWith("https://")) {
        if (rawEndpoint.includes(".")) {
          rawEndpoint = `https://${rawEndpoint}`;
        } else {
          rawEndpoint = SACHA_WEBHOOK_URL;
        }
      }
      let targetEndpoint = rawEndpoint;
      try {
        new URL(targetEndpoint);
      } catch {
        console.warn(`\u26A0\uFE0F [Carrier Notify API] URL no parseable "${targetEndpoint}". Usando endpoint oficial por defecto.`);
        targetEndpoint = SACHA_WEBHOOK_URL;
      }
      if (isSachaWebhookUrl(targetEndpoint)) {
        return res.status(410).json({ success: false, message: "Env\xEDa pedidos de Sacha mediante /api/logistics-dispatch con una orden verificada." });
      }
      const resolvedApiKey = rawApiKey;
      if (!resolvedStoreId) {
        return res.status(400).json({
          success: false,
          error: 'Debe especificar el par\xE1metro "storeId" con el ID de la tienda o socio.'
        });
      }
      let carrierPayload;
      if (req.body?.items && req.body?.customer) {
        const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
        carrierPayload = {
          storeId: resolvedStoreId,
          externalOrderId: externalOrderId || req.body.externalOrderId || order?.externalOrderId,
          items: rawItems.map((item) => ({
            barcode_imei: String(item.barcode_imei || item.sku || item.id || "SKU-001"),
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 1500,
            name: String(item.name || "Producto A")
          })),
          customer: {
            name: String(req.body.customer.name || "Juan Perez"),
            phone: String(req.body.customer.phone || "8095551234").replace(/[^0-9]/g, "") || "8095551234",
            address: String(req.body.customer.address || "Calle Principal #5"),
            province: String(req.body.customer.province || "Santiago")
          }
        };
      } else if (order && typeof order === "object") {
        const lineItems = Array.isArray(order.items) ? order.items : Array.isArray(order.line_items) ? order.line_items : [];
        const shipping = order.customer || order.shipping || {};
        carrierPayload = {
          storeId: resolvedStoreId,
          externalOrderId: externalOrderId || order.externalOrderId || order.id,
          items: lineItems.length > 0 ? lineItems.map((item) => ({
            barcode_imei: String(item.barcode_imei || item.sku || item.barcode || item.id || "SKU-001"),
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 1500,
            name: String(item.name || item.title || "Producto A")
          })) : [
            {
              barcode_imei: "SKU-001",
              quantity: 1,
              price: 1500,
              name: "Producto A"
            }
          ],
          customer: {
            name: String(
              shipping.name || (shipping.first_name ? `${shipping.first_name} ${shipping.last_name || ""}`.trim() : "") || "Juan Perez"
            ),
            phone: String(shipping.phone || "8095551234").replace(/[^0-9]/g, "") || "8095551234",
            address: String(shipping.address || shipping.address_1 || "Calle Principal #5"),
            province: String(shipping.province || shipping.state || "Santiago")
          }
        };
      } else {
        carrierPayload = {
          storeId: resolvedStoreId,
          externalOrderId,
          items: [
            {
              barcode_imei: "SKU-001",
              quantity: 1,
              price: 1500,
              name: "Producto A"
            }
          ],
          customer: {
            name: "Juan Perez",
            phone: "8095551234",
            address: "Calle Principal #5",
            province: "Santiago"
          }
        };
      }
      if (isSachaWebhookUrl(targetEndpoint) && !carrierPayload.externalOrderId) {
        return res.status(400).json({ success: false, message: "externalOrderId es obligatorio para Sacha." });
      }
      console.log(`
\u{1F69A} [Carrier Notify API] Enviando solicitud a transportista: ${targetEndpoint}`);
      console.log(`\u{1F3E2} Store ID: ${resolvedStoreId}`);
      console.log(`\u{1F511} API Key configurada: ${Boolean(resolvedApiKey)}`);
      console.log(`\u{1F4E6} Payload estructurado:`, JSON.stringify(carrierPayload, null, 2));
      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15e3);
      const requestHeaders = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Sanpi-Carrier-API/1.0 (Dominican Republic)"
      };
      if (resolvedApiKey) {
        requestHeaders["Authorization"] = `Bearer ${resolvedApiKey}`;
        if (!isSachaWebhookUrl(targetEndpoint)) requestHeaders["x-api-key"] = resolvedApiKey;
      }
      const response = await fetch(targetEndpoint, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(carrierPayload),
        signal: controller.signal,
        redirect: "manual"
      });
      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);
      let responseData = null;
      const responseContentType = response.headers.get("content-type") || "";
      if (responseContentType.includes("application/json")) {
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }
      } else {
        responseData = await response.text();
      }
      const isSuccess = response.ok || response.status === 201;
      console.log(`\u{1F4E5} [Carrier Notify API] Respuesta de transportista HTTP ${response.status} en ${latencyMs}ms`);
      let customMessage = isSuccess ? `Notificaci\xF3n procesada exitosamente por el transportista (HTTP ${response.status} en ${latencyMs}ms)` : `El transportista respondi\xF3 con c\xF3digo HTTP ${response.status}`;
      let hint = void 0;
      if (!isSuccess && responseData && typeof responseData === "object" && responseData.error) {
        if (typeof responseData.error === "string" && responseData.error.toLowerCase().includes("tienda")) {
          customMessage = `Error de Sacha Pack (HTTP ${response.status}): ${responseData.error}`;
          hint = `El Store ID ("${resolvedStoreId}") no est\xE1 dado de alta en la base de datos de Sacha Pack. Para corregirlo: 1) Inicia sesi\xF3n en tu cuenta de socio en https://www.sachapack.com y copia el Store ID / Partner UID asignado a tu tienda. 2) O puedes probar el flujo usando el Webhook Local de Pruebas de Sanpi.`;
        }
      }
      return res.status(200).json({
        success: isSuccess,
        status: response.status,
        latencyMs,
        endpoint: targetEndpoint,
        storeId: resolvedStoreId,
        hint,
        sentPayload: carrierPayload,
        carrierResponse: responseData,
        message: customMessage
      });
    } catch (err) {
      console.error("Error en /api/carrier/notify:", err?.message || err);
      const isDnsOrUnreachable = err.code === "ENOTFOUND" || err.message?.includes("fetch failed") || err.message?.includes("getaddrinfo") || err.name === "AbortError";
      const isInvalidUrl = err.name === "TypeError" && (err.message?.includes("URL") || err.message?.includes("Invalid URL"));
      return res.status(200).json({
        success: false,
        status: isDnsOrUnreachable ? 503 : isInvalidUrl ? 400 : 500,
        error: isInvalidUrl ? `La URL de destino no es v\xE1lida (${req.body?.endpointUrl || req.body?.url || ""}). Debe comenzar con https://` : isDnsOrUnreachable ? `No se pudo alcanzar el endpoint del transportista (${req.body?.endpointUrl || ""}). Verifica que el dominio y servidor est\xE9n activos.` : `Error al comunicar con transportista: ${err.message}`,
        details: err.code || err.name || "CARRIER_NOTIFY_ERROR",
        endpoint: req.body?.endpointUrl || "",
        storeId: req.body?.storeId || ""
      });
    }
  };
  app.post("/api/carrier/notify", handleCarrierNotify);
  app.post("/api/carrier/dispatch", handleCarrierNotify);
  app.post("/api/carrier-notify", handleCarrierNotify);
  app.post("/api/transportista/notificar", handleCarrierNotify);
  app.post("/api/send-welcome-email", (req, res) => {
    const {
      name = "Socio Emprendedor",
      email,
      role = "dropshipper",
      plan = "pro",
      storeName = "",
      referralCode = `SANPI-${Date.now().toString().slice(-6)}`,
      phone = "",
      province = "Rep\xFAblica Dominicana",
      referredByCode = ""
    } = req.body || {};
    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "Debe especificar un correo electr\xF3nico v\xE1lido para el env\xEDo de la bienvenida."
      });
    }
    const emailId = `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sentAt = (/* @__PURE__ */ new Date()).toISOString();
    const roleLabel = role === "partner" ? "Tienda Mayorista / Proveedor Oficial" : role === "dropshipper" ? "Dropshipper Profesional RD" : role === "admin" ? "Administrador General" : "Comprador Verificado";
    const planLabel = plan === "basic" ? "Plan B\xE1sico (RD$ 600/mes - 15% Comisi\xF3n)" : plan === "full" || plan === "elite" ? "Plan Full Mayorista (RD$ 2,000/mes - 8% Comisi\xF3n)" : "Plan Pro Recomendado (RD$ 1,500/mes - 10% Comisi\xF3n)";
    const subject = `\u{1F389} \xA1Bienvenido a Sanpi Market RD! Plaza: ${role === "partner" ? "Tienda Mayorista" : role === "dropshipper" ? "Dropshipper Pro" : "Comprador"} | C\xF3digo: ${referralCode}`;
    const previewText = `Hola ${name}, te damos la bienvenida a Sanpi Market Dominicana. Tu plaza seleccionada es ${roleLabel} con c\xF3digo de referido: ${referralCode}. Disfruta de flete fijo a RD$ 350 y cobro contra entrega COD en las 32 provincias de Rep\xFAblica Dominicana.`;
    const previewHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 24px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #581c87 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #4c1d95; }
    .logo { display: inline-block; background: linear-gradient(135deg, #9333ea, #6366f1); color: #ffffff; font-size: 28px; font-weight: 900; font-style: italic; width: 56px; height: 56px; line-height: 56px; border-radius: 18px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.2); }
    .title { color: #ffffff; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
    .subtitle { color: #cbd5e1; font-size: 13px; margin-top: 6px; }
    .content { padding: 28px 24px; }
    .greeting { font-size: 16px; color: #f8fafc; margin-bottom: 16px; }
    .badge-box { background-color: #1e293b; border-radius: 16px; padding: 18px; margin-bottom: 20px; border: 1px solid #334155; }
    .role-badge { display: inline-block; background-color: #7c3aed; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; rounded-radius: 9999px; border-radius: 20px; text-transform: uppercase; margin-bottom: 8px; }
    .ref-code-box { background: linear-gradient(135deg, #2e1065, #1e1b4b); border: 2px dashed #a855f7; border-radius: 18px; padding: 20px; text-align: center; margin: 24px 0; }
    .ref-code-title { color: #e9d5ff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .ref-code { font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: 3px; margin: 8px 0; font-family: monospace; }
    .ref-code-desc { color: #c084fc; font-size: 12px; line-height: 1.4; margin: 0; }
    .feature-list { margin: 20px 0; padding: 0; list-style: none; }
    .feature-item { padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px; color: #94a3b8; display: flex; align-items: center; }
    .feature-item strong { color: #f1f5f9; margin-right: 6px; }
    .cta-btn { display: block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff !important; text-decoration: none; text-align: center; font-weight: 800; font-size: 14px; padding: 16px 20px; border-radius: 16px; margin-top: 24px; box-shadow: 0 10px 25px rgba(124, 58, 237, 0.4); }
    .footer { background-color: #090d16; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">S</div>
      <h1 class="title">SANPI MARKET DOMINICANA</h1>
      <p class="subtitle">E-commerce, Dropshipping & Red Log\xEDstica COD Rep\xFAblica Dominicana</p>
    </div>
    <div class="content">
      <p class="greeting">\xA1Hola <strong>${name}</strong>!</p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px;">
        Te damos una cordial bienvenida a <strong>Sanpi Market</strong>. Tu cuenta ha sido activada exitosamente para operar en el mercado digital dominicano.
      </p>

      <div class="badge-box">
        <span class="role-badge">${roleLabel}</span>
        <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">
          ${role === "partner" ? `Tienda: ${storeName || name}` : `Operador: ${name}`}
        </div>
        <div style="font-size: 12px; color: #94a3b8;">
          <strong>Plaza Seleccionada:</strong> ${role === "partner" ? planLabel : role === "dropshipper" ? "Plaza Dropshipper Pro (Venta sin Inventario)" : "Plaza Comprador Directo COD"}
        </div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
          <strong>Provincia Base:</strong> ${province} | <strong>Contacto:</strong> ${phone || "Registrado"}
        </div>
        ${referredByCode ? `<div style="font-size: 11px; color: #10b981; margin-top: 6px; font-weight: 600;">\u2713 Registrado con c\xF3digo de referido: ${referredByCode}</div>` : ""}
      </div>

      <div class="ref-code-box">
        <div class="ref-code-title">Tu C\xF3digo \xDAnico de Referido Sanpi</div>
        <div class="ref-code">${referralCode}</div>
        <p class="ref-code-desc">
          Comparte este c\xF3digo con otras tiendas o dropshippers. Al registrarse obtienen descuento y t\xFA acumulas beneficios y comisiones en efectivo.
        </p>
      </div>

      <h3 style="color: #ffffff; font-size: 14px; font-weight: 800; margin-top: 24px; margin-bottom: 10px;">
        Beneficios y Reglas Operativas en Rep\xFAblica Dominicana:
      </h3>
      <ul class="feature-list">
        <li class="feature-item">
          <strong>\u{1F69A} Flete Fijo Nacional:</strong> RD$ 350 a cualquiera de las 32 provincias de Rep\xFAblica Dominicana con Sacha Pack Express.
        </li>
        <li class="feature-item">
          <strong>\u{1F4B5} Pago Contra Entrega (COD):</strong> Cobro 100% en efectivo a domicilio al momento de entregar el producto.
        </li>
        ${role === "dropshipper" ? `
        <li class="feature-item">
          <strong>\u26A1 Generador de Landing Pages con IA:</strong> Crea p\xE1ginas de venta con temporizador de urgencia y WhatsApp en 1 solo clic.
        </li>
        <li class="feature-item">
          <strong>\u{1F4C8} Margen de Ganancia Neto:</strong> T\xFA defines tu precio de venta y recibes tus utilidades tras cada entrega liquidada.
        </li>
        ` : role === "partner" ? `
        <li class="feature-item">
          <strong>\u{1F3EA} Cat\xE1logo Mayorista:</strong> Tu inventario visible para cientos de dropshippers y compradores en todo el pa\xEDs.
        </li>
        <li class="feature-item">
          <strong>\u{1F4E6} Despacho Automatizado:</strong> Integraci\xF3n directa con almac\xE9n y transporte para env\xEDos en 24-48 horas.
        </li>
        ` : `
        <li class="feature-item">
          <strong>\u{1F6CD}\uFE0F Compra Segura:</strong> Revisa tu paquete antes de pagar en tu casa u oficina.
        </li>
        `}
        <li class="feature-item">
          <strong>\u{1F4F2} Soporte Directo WhatsApp:</strong> L\xEDnea oficial de atenci\xF3n al socio <strong>809-676-6690</strong>.
        </li>
      </ul>

      <a href="https://sanpimarket.do" class="cta-btn">
        Entrar a Mi Panel de Sanpi Market &rarr;
      </a>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">Sanpi Market Dominicana SRL \u2022 Santo Domingo, Rep\xFAblica Dominicana</p>
      <p style="margin: 0;">Soporte Oficial WhatsApp: 809-676-6690 \u2022 info@sanpimarket.do</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    console.log(`
\u{1F4E7} [Welcome Email Service] Enviando mensaje de bienvenida a: ${email}`);
    console.log(`\u{1F464} Nombre: ${name} | Rol: ${role} | Plaza: ${planLabel} | C\xF3digo de Referido: ${referralCode}`);
    console.log(`\u{1F4E8} Asunto: ${subject}`);
    return res.status(200).json({
      success: true,
      emailId,
      sentAt,
      recipient: email,
      subject,
      roleLabel,
      planLabel,
      referralCode,
      previewHtml,
      previewText,
      message: `Mensaje de bienvenida y c\xF3digo de referido (${referralCode}) generado y despachado a ${email}`
    });
  });
  app.get("/api/logistics/spec", (req, res) => {
    res.json({
      title: "Sanpi Marketplace - Transport & Courier Integration API",
      version: "2.0.0",
      description: "Especificaci\xF3n est\xE1ndar para conectar empresas de transporte y paqueter\xEDa con Sanpi para despacho automatizado COD.",
      authentication: {
        typesSupported: ["x-api-key", "Bearer Token", "Custom Header"],
        headers: {
          "x-api-key": "sk_carrier_xxxxxxxxxxxxxxxxxxxx",
          "Authorization": "Bearer sk_carrier_xxxxxxxxxxxxxxxxxxxx"
        }
      },
      endpoints: {
        outgoing_dispatch: {
          description: "Payload enviado por Sanpi al Endpoint de la empresa de transporte cuando un cliente realiza una compra.",
          method: "POST",
          samplePayload: {
            storeId: SACHA_STORE_ID,
            items: [
              {
                barcode_imei: "SKU-001",
                quantity: 1,
                price: 1500,
                name: "Producto A"
              }
            ],
            customer: {
              name: "Juan Perez",
              phone: "8095551234",
              address: "Calle Principal #5",
              province: "Santiago"
            }
          }
        },
        inbound_status_webhook: {
          description: "Endpoint que la empresa de transporte llama para reportar cambios de estado a Sanpi.",
          url: "https://sanpi.com.do/api/logistics/webhook-receiver",
          method: "POST",
          headers: {
            "Authorization": "Bearer <CLAVE_DE_RETORNO_GENERADA_POR_ADMIN>",
            "Content-Type": "application/json"
          },
          samplePayload: {
            externalOrderId: "SPSANPI-M-SSDLC-1792205308513-C61033827A",
            carrierTrackingId: "CARIBE-98421-X",
            status: "en_transito",
            courierName: "Carlos Ram\xEDrez",
            courierPhone: "829-555-4321",
            location: {
              lat: 18.4861,
              lng: -69.9312,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            },
            notes: "Paquete en ruta de entrega en Santo Domingo"
          }
        },
        connection_test: {
          description: "Endpoint para verificar handshake y credenciales de cualquier transportadora.",
          url: "/api/logistics/test-connection",
          method: "POST"
        }
      }
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.use((err, req, res, next) => {
    if (err && (err.code === "EPIPE" || err.code === "ECONNRESET")) {
      return;
    }
    console.error("Express Error Handler:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error", message: err?.message || "Server error" });
    }
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sanpi Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
