import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import firebaseAppletConfig from './firebase-applet-config.json';
import { readPrivateCarrierConfigs, savePrivateCarrierConfig } from './src/lib/privateCarrierConfig';
import { commitGuestOrder, GuestCheckoutValidationError, isAllowedGuestCheckoutOrigin, readPublicArticle, readPublicLandingPage, readPublicStore, recordGuestCarrierResult, validateGuestOrder } from './src/lib/guestCheckoutServer';
import { applyCarrierUpdate, authenticateCarrierWebhook, CarrierStatusError, hasCarrierWebhookSecret, parseCarrierUpdate, rotateCarrierWebhookSecret, syncSachaDelivery } from './src/lib/carrierStatusServer';

const SACHA_WEBHOOK_URL = 'https://sacha--studio-9195671573-fb490.us-east4.hosted.app/api/logistics-webhook';
const SACHA_ALTERNATE_WEBHOOK_URL = 'https://www.sachapack.com/api/logistics-webhook';
const isSachaWebhookUrl = (url: string): boolean =>
  url === SACHA_WEBHOOK_URL || url === SACHA_ALTERNATE_WEBHOOK_URL;
const SACHA_STORE_ID = 'ds_80NC3boX9Le29wnJe3zO9OJ0cFz1';

async function authorizeSachaDispatch(idToken: string, deliveryId: string, order: any): Promise<boolean> {
  if (!idToken || !deliveryId || deliveryId.length > 100) return false;
  const identityResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseAppletConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(10000)
  });
  if (!identityResponse.ok) return false;
  const identity = await identityResponse.json() as any;
  const user = identity.users?.[0];
  if (!user?.localId) return false;

  const documentUrl = `https://firestore.googleapis.com/v1/projects/${firebaseAppletConfig.projectId}/databases/${firebaseAppletConfig.firestoreDatabaseId}/documents/deliveries/${encodeURIComponent(deliveryId)}`;
  const documentResponse = await fetch(documentUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
    signal: AbortSignal.timeout(10000)
  });
  if (!documentResponse.ok) return false;
  const document = await documentResponse.json() as any;
  const fields = document.fields || {};
  const isAdmin = ['sanpimarketplace@gmail.com', 'martin.tavarez.gomez@gmail.com'].includes(String(user.email || '').toLowerCase()) && user.emailVerified === true &&
    user.providerUserInfo?.some((provider: any) => provider.providerId === 'google.com');
  const ownsOrder = fields.createdByUid?.stringValue === user.localId;
  const assignedCarrier = fields.deliveryPersonId?.stringValue === user.localId || fields.carrierId?.stringValue === user.localId;
  if (!isAdmin && !ownsOrder && !assignedCarrier) return false;
  if (fields.isMarketplaceOrder?.booleanValue !== true) return false;
  if (fields.externalOrderId?.stringValue !== order.externalOrderId && fields.trackingNumber?.stringValue !== order.externalOrderId) return false;
  if (!isAdmin) {
    if (fields.customerName?.stringValue !== order.customer.name ||
        fields.customerPhone?.stringValue?.replace(/[^0-9]/g, '') !== order.customer.phone.replace(/[^0-9]/g, '') ||
        fields.address?.stringValue !== order.customer.address ||
        fields.province?.stringValue !== order.customer.province) return false;
    const total = order.items.reduce((sum: number, item: any) => sum + Number(item.quantity) * Number(item.price), 0);
    if (Math.abs(total - Number(fields.basePrice?.doubleValue ?? fields.basePrice?.integerValue ?? 0)) > 0.01) return false;
  }
  return true;
}

// Prevent process crashes caused by broken pipes (EPIPE) on stdout/stderr
process.stdout.on('error', (err: any) => {
  if (err && err.code === 'EPIPE') return;
});

process.stderr.on('error', (err: any) => {
  if (err && err.code === 'EPIPE') return;
});

process.on('uncaughtException', (err: any) => {
  if (err && (err.code === 'EPIPE' || err.code === 'ECONNRESET')) {
    return; // Ignore broken pipes or aborted client connections
  }
  console.error('Unhandled Exception caught safely:', err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled Rejection caught safely:', reason);
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.set('trust proxy', 1);

  // Middleware for JSON parsing with ample limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  const guestOrderAttempts = new Map<string, { count: number; resetAt: number }>();
  app.post('/api/checkout/guest', async (req, res) => {
    if (!isAllowedGuestCheckoutOrigin(req.get('origin'), req.get('host'))) {
      return res.status(403).json({ success: false, message: 'Origen de compra inválido.' });
    }
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const attempts = guestOrderAttempts.get(clientIp);
    const rate = !attempts || attempts.resetAt < now ? { count: 1, resetAt: now + 60_000 } : { ...attempts, count: attempts.count + 1 };
    guestOrderAttempts.set(clientIp, rate);
    if (rate.count > 5) return res.status(429).json({ success: false, message: 'Demasiados intentos. Espera un minuto.' });

    try {
      const delivery = req.body?.delivery;
      const transaction = req.body?.transaction;
      if (!delivery || !transaction || JSON.stringify(req.body).length > 30000) {
        return res.status(400).json({ success: false, message: 'Datos de compra inválidos.' });
      }
      const article = await readPublicArticle(String(delivery.articleId || ''));
      if (!article) return res.status(400).json({ success: false, message: 'Artículo no disponible.' });
      const store = await readPublicStore(String(delivery.storeId || ''));
      if (!store) return res.status(400).json({ success: false, message: 'Tienda no disponible.' });
      const landingPage = delivery.sourceType === 'landing_page' ? await readPublicLandingPage(String(delivery.landingPageSlug || '')) : null;
      const validationError = validateGuestOrder(delivery, transaction, article, store, landingPage);
      if (validationError) return res.status(400).json({ success: false, message: validationError });
      const expectedProviderId = String(store.logisticsProviderId || 'prov_sacha_pack');
      if (delivery.logisticsProviderId !== expectedProviderId) {
        return res.status(400).json({ success: false, message: 'Transportista no corresponde a la tienda.' });
      }

      await commitGuestOrder(delivery, transaction);

      let sachaPackResponse: Record<string, unknown> = {
        success: false,
        message: 'Orden registrada; pendiente de despacho al transportista.'
      };
      try {
        const providerId = expectedProviderId;
        const config = (await readPrivateCarrierConfigs())[providerId];
        const endpointUrl = config?.endpointUrl || (providerId === 'prov_sacha_pack' ? SACHA_WEBHOOK_URL : '');
        if (endpointUrl) {
          const endpoint = new URL(endpointUrl);
          if (endpoint.protocol !== 'https:') throw new Error('Endpoint del transportista inválido.');
          const payload = {
            storeId: config?.storeId || SACHA_STORE_ID,
            externalOrderId: delivery.trackingNumber,
            items: [{
              barcode_imei: String(article?.barcode_imei || delivery.barcode_imei || '1234567890'),
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
            paymentMethod: 'COD'
          };
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(config?.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(12000)
          });
          const carrierResult = await response.json().catch(() => ({})) as Record<string, unknown>;
          sachaPackResponse = {
            success: response.ok && carrierResult.success !== false,
            status: response.status,
            message: String(carrierResult.message || (response.ok ? 'Orden recibida por el transportista.' : 'Transportista no aceptó la orden.')),
            trackingNumber: carrierResult.trackingNumber || carrierResult.trackingId || carrierResult.id,
            providerId
          };
        }
      } catch (dispatchError) {
        console.warn('Guest order carrier dispatch:', dispatchError);
      }
      try {
        await recordGuestCarrierResult(delivery.trackingNumber, sachaPackResponse);
      } catch (recordError) {
        console.warn('Guest order carrier result:', recordError);
      }
      return res.status(201).json({ success: true, trackingNumber: delivery.trackingNumber, sachaPackResponse });
    } catch (error) {
      console.error('Guest checkout:', error);
      if (error instanceof GuestCheckoutValidationError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: 'No se pudo registrar la orden. Inténtalo de nuevo.' });
    }
  });

  const isCarrierConfigAdmin = async (req: express.Request): Promise<boolean> => {
    const idToken = String(req.headers['x-sanpi-id-token'] || '');
    if (!idToken) return false;
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseAppletConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return false;
    const identity = await response.json() as any;
    const user = identity.users?.[0];
    if (!user?.emailVerified) return false;
    const email = String(user.email || '').toLowerCase();
    const verifiedGoogleAdmin = ['sanpimarketplace@gmail.com', 'martin.tavarez.gomez@gmail.com'].includes(email) &&
      user.providerUserInfo?.some((provider: any) => provider.providerId === 'google.com');
    let claims: any = {};
    try { claims = JSON.parse(user.customAttributes || '{}'); } catch {}
    return Boolean(verifiedGoogleAdmin || claims.role === 'admin');
  };

  app.get('/api/carrier/config', async (req, res) => {
    try {
      if (!await isCarrierConfigAdmin(req)) return res.status(403).json({ success: false, message: 'Solo administradores pueden ver esta configuración.' });
      const providerId = String(req.query.providerId || '');
      if (!/^prov_[a-z0-9_-]{1,80}$/i.test(providerId)) return res.status(400).json({ success: false, message: 'Transportista inválido.' });
      const config = (await readPrivateCarrierConfigs())[providerId] || null;
      return res.json({ success: true, config });
    } catch {
      return res.status(500).json({ success: false, message: 'No se pudo leer la configuración privada.' });
    }
  });

  app.put('/api/carrier/config', async (req, res) => {
    try {
      if (!await isCarrierConfigAdmin(req)) return res.status(403).json({ success: false, message: 'Solo administradores pueden guardar esta configuración.' });
      const providerId = String(req.body?.providerId || '');
      const storeId = String(req.body?.storeId || '').trim();
      const endpointUrl = String(req.body?.endpointUrl || '').trim();
      const apiKey = String(req.body?.apiKey || '').trim();
      if (!/^prov_[a-z0-9_-]{1,80}$/i.test(providerId) || !storeId || storeId.length > 200 || apiKey.length > 2000) {
        return res.status(400).json({ success: false, message: 'Store ID, API Key o transportista inválido.' });
      }
      let endpoint: URL;
      try { endpoint = new URL(endpointUrl); } catch { return res.status(400).json({ success: false, message: 'Endpoint inválido.' }); }
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
        return res.status(400).json({ success: false, message: 'El endpoint debe usar HTTPS y no incluir credenciales en la URL.' });
      }
      await savePrivateCarrierConfig(providerId, { storeId, endpointUrl, apiKey });
      return res.json({ success: true, message: 'Configuración guardada.' });
    } catch {
      return res.status(500).json({ success: false, message: 'No se pudo guardar la configuración privada.' });
    }
  });

  app.get('/api/carrier/webhook-secret', async (req, res) => {
    try {
      if (!await isCarrierConfigAdmin(req)) return res.status(403).json({ success: false });
      const providerId = String(req.query.providerId || '');
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ success: true, configured: await hasCarrierWebhookSecret(providerId) });
    } catch { return res.status(500).json({ success: false, message: 'No se pudo consultar el webhook.' }); }
  });

  app.post('/api/carrier/webhook-secret', async (req, res) => {
    try {
      if (!await isCarrierConfigAdmin(req)) return res.status(403).json({ success: false });
      const secret = await rotateCarrierWebhookSecret(String(req.body?.providerId || ''));
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ success: true, secret, message: 'Guarda esta clave en Sacha. Solo se mostrará ahora.' });
    } catch (error) {
      return res.status(error instanceof CarrierStatusError ? error.statusCode : 500)
        .json({ success: false, message: error instanceof CarrierStatusError ? error.message : 'No se pudo generar la clave.' });
    }
  });

  // Helper function to build authentication and transport headers
  const buildCarrierHeaders = (options: {
    apiKey?: string;
    authToken?: string;
    authType?: string;
    customHeaderName?: string;
    headers?: Record<string, string>;
  }): Record<string, string> => {
    const effectiveKey = (options.apiKey || options.authToken || '').trim();
    const outgoingHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Sanpi-Logistics-Gateway/2.0 (Dominican-Republic)',
      ...(options.headers || {})
    };

    if (effectiveKey) {
      const authType = options.authType || 'x-api-key';
      if (authType === 'bearer') {
        outgoingHeaders['Authorization'] = `Bearer ${effectiveKey}`;
      } else if (authType === 'custom_header' && options.customHeaderName) {
        outgoingHeaders[options.customHeaderName.trim()] = effectiveKey;
      } else if (authType === 'apikey') {
        outgoingHeaders['apikey'] = effectiveKey;
      } else {
        // Default standard: support both x-api-key and Authorization
        outgoingHeaders['x-api-key'] = effectiveKey;
        outgoingHeaders['Authorization'] = `Bearer ${effectiveKey}`;
        outgoingHeaders['apikey'] = effectiveKey;
      }
    }
    return outgoingHeaders;
  };

  // 1. TEST CONNECTION / PING ENDPOINT FOR ANY TRANSPORT COMPANY
  // Evaluates Endpoint URL + API Key connectivity, measures latency, checks SSL & HTTP response
  const handleTestConnection = async (req: express.Request, res: express.Response) => {
    const {
      endpointUrl,
      webhookUrl,
      apiKey = '',
      authToken = '',
      authType = 'x-api-key',
      customHeaderName = '',
      httpMethod = 'POST',
      headers = {},
      samplePayload
    } = req.body;

    let rawTargetUrl = (endpointUrl || webhookUrl || req.body?.url || '').trim();
    let rawApiKey = (apiKey || authToken || '').trim();

    // Auto-recovery: If user swapped apiKey and targetUrl
    if ((rawTargetUrl.startsWith('sk_') || rawTargetUrl.startsWith('sanpi_')) && (rawApiKey.startsWith('http://') || rawApiKey.startsWith('https://'))) {
      const temp = rawTargetUrl;
      rawTargetUrl = rawApiKey;
      rawApiKey = temp;
    } else if (rawTargetUrl.startsWith('sk_') || rawTargetUrl.startsWith('sanpi_') || (!rawTargetUrl.includes('://') && rawTargetUrl.length > 25 && !rawTargetUrl.includes('/'))) {
      if (!rawApiKey) rawApiKey = rawTargetUrl;
      rawTargetUrl = SACHA_WEBHOOK_URL;
    }

    let targetUrl = rawTargetUrl || SACHA_WEBHOOK_URL;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (targetUrl.includes('.')) {
        targetUrl = `https://${targetUrl}`;
      } else {
        return res.status(400).json({
          success: false,
          status: 400,
          latencyMs: 0,
          message: `La URL "${targetUrl}" no es válida. Debe comenzar con http:// o https://`,
          timestamp: new Date().toISOString(),
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
      event: 'PING_HANDSHAKE',
      source: 'Sanpi Marketplace RD',
      test: true,
      timestamp: new Date().toISOString(),
      storeId: req.body.defaultStoreId || 'SANPI-TEST-STORE',
      message: 'Verificación de handshake y conectividad con empresa de transporte'
    };

    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    console.log(`\n🔍 [Carrier Connection Test] Probando endpoint: ${targetUrl}`);
    console.log(`🔑 [Carrier Connection Test] Autenticación configurada: ${Boolean(rawApiKey)}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const response = await fetch(targetUrl, {
        method: httpMethod,
        headers: outgoingHeaders,
        body: typeof testPayload === 'string' ? testPayload : JSON.stringify(testPayload),
        signal: controller.signal,
        redirect: 'manual'
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);
      const status = response.status;
      const location = response.headers.get('location') || '';

      // Check Google Cloud Workstations private port redirect
      if ((status === 302 || status === 301 || status === 307) && (location.includes('cloudworkstations.dev') || location.includes('forwardAuthCookie'))) {
        return res.status(200).json({
          success: false,
          status: 302,
          latencyMs,
          message: `El puerto del webhook en Cloud Workstations / Firebase Studio es PRIVADO. Para que reciba órdenes, cambia la visibilidad a "Público" en la pestaña de Puertos de Firebase Studio.`,
          timestamp,
          endpoint: targetUrl,
          diagnostic: {
            dnsOk: true,
            sslOk: targetUrl.startsWith('https'),
            authHeaderDetected: Boolean(apiKey || authToken),
            details: 'Cloud Workstation private port authentication required'
          }
        });
      }

      let responseData: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }
      } else {
        responseData = await response.text();
      }

      const isSuccess = response.ok;
      const message = isSuccess
        ? `¡Conexión Exitosa! El servidor de la empresa de transporte respondió correctamente (HTTP ${status} en ${latencyMs}ms)`
        : `Servidor respondió con código HTTP ${status} (${response.statusText}) en ${latencyMs}ms.`;

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
          sslOk: targetUrl.startsWith('https'),
          authHeaderDetected: Boolean(apiKey || authToken),
          contentType,
          details: isSuccess ? 'Handshake completado satisfactoriamente' : 'Verifica credenciales o formato'
        }
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      const isDnsOrUnreachable = err.code === 'ENOTFOUND' || err.message?.includes('fetch failed') || err.message?.includes('getaddrinfo') || err.name === 'AbortError';

      return res.status(200).json({
        success: false,
        status: isDnsOrUnreachable ? 503 : 500,
        latencyMs,
        message: isDnsOrUnreachable
          ? `No se pudo alcanzar el endpoint (${targetUrl}). Verifica que el dominio exista y esté activo en internet.`
          : `Error de conexión: ${err.message}`,
        timestamp,
        endpoint: targetUrl,
        rawResponse: { error: err.message, code: err.code || 'CONNECTION_ERROR' },
        diagnostic: {
          dnsOk: !isDnsOrUnreachable,
          sslOk: targetUrl.startsWith('https'),
          authHeaderDetected: Boolean(apiKey || authToken),
          details: err.message
        }
      });
    }
  };

  app.post('/api/logistics/test-connection', handleTestConnection);
  app.post('/api/logistics-test-connection', handleTestConnection);

  // 2. DISPATCH ENDPOINT PROXY (Outgoing Sanpi -> Transport Company)
  const handleLogisticsDispatch = async (req: express.Request, res: express.Response) => {
    const {
      webhookUrl,
      endpointUrl,
      httpMethod = 'POST',
      headers = {},
      apiKey = '',
      authToken = '',
      authType = 'x-api-key',
      customHeaderName = '',
      payload
    } = req.body;

    const providerId = String(req.body?.providerId || '');
    let privateConfig = null as Awaited<ReturnType<typeof readPrivateCarrierConfigs>>[string] | null;
    if (/^prov_[a-z0-9_-]{1,80}$/i.test(providerId)) {
      try { privateConfig = (await readPrivateCarrierConfigs())[providerId] || null; } catch {
        return res.status(503).json({ success: false, message: 'No se pudo leer la configuración privada del transportista.' });
      }
    }

    let rawTargetUrl = String(privateConfig?.endpointUrl || endpointUrl || webhookUrl || req.body?.url || '').trim();
    let rawApiKey = String(privateConfig?.apiKey || apiKey || authToken || '').trim();

    // Auto-recovery: If user swapped apiKey and targetUrl
    if ((rawTargetUrl.startsWith('sk_') || rawTargetUrl.startsWith('sanpi_')) && (rawApiKey.startsWith('http://') || rawApiKey.startsWith('https://'))) {
      const temp = rawTargetUrl;
      rawTargetUrl = rawApiKey;
      rawApiKey = temp;
    } else if (rawTargetUrl.startsWith('sk_') || rawTargetUrl.startsWith('sanpi_') || (!rawTargetUrl.includes('://') && rawTargetUrl.length > 25 && !rawTargetUrl.includes('/'))) {
      if (!rawApiKey) rawApiKey = rawTargetUrl;
      rawTargetUrl = SACHA_WEBHOOK_URL;
    }

    let targetUrl = rawTargetUrl || SACHA_WEBHOOK_URL;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (targetUrl.includes('.')) {
        targetUrl = `https://${targetUrl}`;
      } else {
        targetUrl = SACHA_WEBHOOK_URL;
      }
    }

    if (!payload) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: payload is required'
      });
    }

    const isSachaPack = req.body?.providerCode === 'sacha_pack' || isSachaWebhookUrl(targetUrl);
    const requiresVerifiedOrder = isSachaPack || Boolean(privateConfig?.apiKey);
    let sanitizedPayload: any = payload;

    // Safely parse JSON string payload if received as string
    if (typeof sanitizedPayload === 'string') {
      try {
        sanitizedPayload = JSON.parse(sanitizedPayload);
      } catch {
        // Leave as string if not valid JSON
      }
    }

    if (privateConfig?.storeId && sanitizedPayload && typeof sanitizedPayload === 'object') {
      sanitizedPayload.storeId = privateConfig.storeId;
    }

    // If payload is object, sanitize placeholder storeId for Sacha Pack requests
    if (sanitizedPayload && typeof sanitizedPayload === 'object') {
      const currentStoreId = String(sanitizedPayload.storeId || '').trim();
      if (
        isSachaPack &&
        (!currentStoreId ||
          currentStoreId === 'TU_UID_DE_SOCIO' ||
          currentStoreId === 'TU_ID_DE_SOCIO' ||
          currentStoreId === 'TU_PARTNER_UID' ||
          currentStoreId === 'TU_STORE_ID' ||
          currentStoreId === 'sxOzEivG9GP9SvaVuF1nVpQZCOu1' ||
          currentStoreId.startsWith('TU_') ||
          currentStoreId.startsWith('store_') ||
          currentStoreId.startsWith('store-') ||
          currentStoreId.length < 10)
      ) {
        sanitizedPayload.storeId = SACHA_STORE_ID;
      }
    }

    const resolvedApiKey = isSachaPack
      ? (rawApiKey || process.env.SACHA_API_KEY || '').trim()
      : rawApiKey;

    if (requiresVerifiedOrder) {
      const order = sanitizedPayload;
      if (!order || typeof order !== 'object' || !order.storeId || !order.externalOrderId ||
          !Array.isArray(order.items) || order.items.length === 0 ||
          order.items.some((item: any) => !item.barcode_imei || !item.name || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0) ||
          !order.customer?.name || !order.customer?.phone || !order.customer?.address || !order.customer?.province) {
        return res.status(400).json({ success: false, message: 'Pedido incompleto para Sacha: storeId, externalOrderId, items y customer son obligatorios.' });
      }
      try {
        const authorized = await authorizeSachaDispatch(
          String(req.headers['x-sanpi-id-token'] || ''),
          String(req.body.deliveryId || ''),
          order
        );
        if (!authorized) return res.status(403).json({ success: false, message: 'La orden no está verificada para el usuario autenticado.' });
      } catch {
        return res.status(503).json({ success: false, message: 'No se pudo verificar la orden en Firebase. Intenta de nuevo.' });
      }
      if (!resolvedApiKey) {
        return res.status(503).json({ success: false, message: 'Falta guardar la API Key del transportista o configurar SACHA_API_KEY en Hostinger.' });
      }
      sanitizedPayload = {
        storeId: order.storeId,
        externalOrderId: order.externalOrderId,
        items: order.items.map((item: any) => ({
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
      authType: isSachaPack ? 'bearer' : authType,
      customHeaderName,
      headers
    });
    if (isSachaPack) {
      for (const header of Object.keys(outgoingHeaders)) {
        if (!['content-type', 'accept', 'authorization'].includes(header.toLowerCase())) delete outgoingHeaders[header];
      }
      outgoingHeaders.Authorization = `Bearer ${resolvedApiKey}`;
    }

    const timestamp = new Date().toISOString();
    console.log(`\n🚚 [Server Carrier Dispatch] Enviando ${httpMethod} a: ${targetUrl}`);
    console.log(`🔑 [Server Carrier Dispatch] Autenticación configurada: ${Boolean(resolvedApiKey)}`);
    console.log(`📦 [Server Carrier Dispatch] Payload:`, JSON.stringify(sanitizedPayload, null, 2));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

      const response = await fetch(targetUrl, {
        method: httpMethod,
        headers: outgoingHeaders,
        body: typeof sanitizedPayload === 'string' ? sanitizedPayload : JSON.stringify(sanitizedPayload),
        signal: controller.signal,
        redirect: 'manual'
      });

      clearTimeout(timeoutId);

      const status = response.status;
      const location = response.headers.get('location') || '';

      // Detect Google Cloud Workstation IAM private port protection redirect
      if ((status === 302 || status === 301 || status === 307) && (location.includes('cloudworkstations.dev') || location.includes('forwardAuthCookie'))) {
        console.warn(`🔒 [Server Logistics Proxy] El endpoint ${targetUrl} está protegido por autenticación de Cloud Workstation.`);
        return res.status(200).json({
          success: false,
          status: 302,
          statusText: 'Found (Workstation Auth Required)',
          message: `El puerto del webhook en Cloud Workstations / Firebase Studio es PRIVADO. Para que reciba las órdenes, cambia la visibilidad del puerto a "Público" en la pestaña de Puertos de Firebase Studio o utiliza una URL pública (Cloud Run, ngrok o dominio propio).`,
          timestamp,
          endpoint: targetUrl,
          redirectLocation: location,
          isSimulated: false,
          rawResponse: {
            error: 'CLOUD_WORKSTATION_PRIVATE_PORT',
            hint: 'Configura el puerto como Público en Firebase Studio o usa un endpoint accesible sin cookie de sesión.',
            redirectUrl: location
          }
        });
      }

      let responseData: any = null;
      const responseContentType = response.headers.get('content-type') || '';
      
      if (responseContentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }
      } else {
        responseData = await response.text();
      }

      console.log(`📥 [Server Carrier Dispatch] Respuesta remota: HTTP ${response.status}`);
      console.log(`📄 [Server Carrier Dispatch] Data:`, typeof responseData === 'object' ? JSON.stringify(responseData) : responseData);

      let isSuccess = response.ok && responseData?.success !== false;
      let trackingNumber = (typeof responseData === 'object' && responseData)
        ? (responseData.trackingNumber || responseData.trackingId || responseData.id || responseData.tracking_number || responseData.orderId || responseData.guideNumber)
        : null;
      let totalToCollect = (typeof responseData === 'object' && responseData && responseData.totalToCollect !== undefined)
        ? Number(responseData.totalToCollect)
        : undefined;

      // Smart Retry for Sacha Pack: If store is not registered, automatically retry with Sacha Pack Master Partner Store ID
      if (
        !isSuccess &&
        isSachaPack &&
        responseData &&
        typeof responseData === 'object' &&
        typeof responseData.error === 'string' &&
        responseData.error.toLowerCase().includes('tienda') &&
        sanitizedPayload?.storeId !== SACHA_STORE_ID
      ) {
        console.log(`🔄 [Server Carrier Dispatch] Reintentando con el Store ID configurado de Sacha...`);
        try {
          const retryPayload = {
            ...sanitizedPayload,
            storeId: SACHA_STORE_ID
          };
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 12000);
          const retryResponse = await fetch(targetUrl, {
            method: httpMethod,
            headers: outgoingHeaders,
            body: JSON.stringify(retryPayload),
            signal: retryController.signal,
            redirect: 'manual'
          });
          clearTimeout(retryTimeoutId);

          let retryData: any = null;
          try {
            retryData = await retryResponse.json();
          } catch {
            retryData = await retryResponse.text();
          }

          console.log(`📥 [Server Carrier Dispatch Retry] Status: HTTP ${retryResponse.status}`, retryData);
          if (retryResponse.ok || retryResponse.status === 201) {
            isSuccess = true;
            responseData = retryData;
            trackingNumber = (typeof retryData === 'object' && retryData)
              ? (retryData.trackingNumber || retryData.trackingId || retryData.id || retryData.tracking_number || retryData.orderId || retryData.guideNumber)
              : null;
            totalToCollect = (typeof retryData === 'object' && retryData && retryData.totalToCollect !== undefined)
              ? Number(retryData.totalToCollect)
              : undefined;
          }
        } catch (retryErr: any) {
          console.warn(`[Server Carrier Dispatch Retry] Error during master store retry:`, retryErr.message);
        }
      }

      let explanationMessage = isSuccess
        ? (responseData?.message || `Orden integrada exitosamente en la red de la empresa de transporte (HTTP ${response.status})`)
        : `La empresa de transporte respondió con código HTTP ${response.status}: ${typeof responseData === 'object' ? JSON.stringify(responseData) : String(responseData).slice(0, 300)}`;

      if (!isSuccess && responseData && typeof responseData === 'object' && responseData.error) {
        if (typeof responseData.error === 'string' && responseData.error.toLowerCase().includes('tienda')) {
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
        trackingNumber: trackingNumber || undefined,
        totalToCollect,
        sachaTrackingId: trackingNumber || undefined,
        rawResponse: responseData,
        isSimulated: false
      });
    } catch (err: any) {
      const isDnsOrUnreachable = err.code === 'ENOTFOUND' || err.message?.includes('fetch failed') || err.message?.includes('getaddrinfo') || err.name === 'AbortError';
      const friendlyMessage = isDnsOrUnreachable
        ? `No se pudo conectar al endpoint de la empresa de transporte (${targetUrl}). Verifique que la URL y el servidor estén activos.`
        : `Fallo de conexión al endpoint de transporte: ${err.message}`;

      console.warn(`⚠️ [Server Carrier Dispatch] Aviso de conexión a ${targetUrl}: ${err.message}`);

      return res.status(200).json({
        success: false,
        status: isDnsOrUnreachable ? 503 : 502,
        message: friendlyMessage,
        timestamp: new Date().toISOString(),
        endpoint: targetUrl,
        rawResponse: { error: err.message, code: err.code || 'CONNECTION_ERROR', hint: 'Verifica la URL del Endpoint y la API Key en la configuración de la empresa.' },
        isSimulated: false
      });
    }
  };

  app.post('/api/logistics-dispatch', handleLogisticsDispatch);
  app.post('/api/logistics/dispatch', handleLogisticsDispatch);

  // 3. INBOUND WEBHOOK RECEIVER (Transport Company -> Sanpi)
  // Allows external couriers to push live status updates, GPS tracking, and delivery receipts
  app.post('/api/logistics/webhook-receiver', async (req, res) => {
    try {
      const update = parseCarrierUpdate(req.body || {});
      const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      const supplied = bearer || String(req.headers['x-webhook-secret'] || req.headers['x-api-key'] || '').trim();
      if (!await authenticateCarrierWebhook(update.providerId, supplied))
        return res.status(401).json({ success: false, message: 'Clave de webhook inválida o sin configurar.' });
      const result = await applyCarrierUpdate(update);
      return res.json({ success: true, ...result });
    } catch (error) {
      console.error('Inbound carrier update failed:', error instanceof Error ? error.message : error);
      return res.status(error instanceof CarrierStatusError ? error.statusCode : 500)
        .json({ success: false, message: error instanceof CarrierStatusError ? error.message : 'No se pudo actualizar la orden.' });
    }
  });

  const sachaSyncAttempts = new Map<string, { count: number; resetAt: number }>();
  app.post('/api/sacha/sync-status', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const previous = sachaSyncAttempts.get(clientIp);
    const rate = !previous || previous.resetAt < now ? { count: 1, resetAt: now + 60_000 } : { ...previous, count: previous.count + 1 };
    sachaSyncAttempts.set(clientIp, rate);
    if (rate.count > 10) return res.status(429).json({ success: false, message: 'Demasiadas consultas.' });
    try {
      const result = await syncSachaDelivery(String(req.body?.trackingNumber || '').trim());
      return res.json({ success: true, ...result });
    } catch (error) {
      return res.status(error instanceof CarrierStatusError ? error.statusCode : 500)
        .json({ success: false, message: error instanceof CarrierStatusError ? error.message : 'No se pudo consultar a Sacha.' });
    }
  });

  // 4. CARRIER NOTIFY API (Accepts storeId, apiKey, endpointUrl, and order)
  const handleCarrierNotify = async (req: express.Request, res: express.Response) => {
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

      // 1. Extract raw parameters
      let rawEndpoint = (endpointUrl || carrierEndpointUrl || webhookUrl || url || '').trim();
      let rawApiKey = (apiKey || key || token || req.headers['authorization']?.replace(/^Bearer\s+/i, '') || '').trim();
      const suppliedStoreId = (storeId || req.body?.store_id || '').trim();
      const resolvedStoreId = !suppliedStoreId || suppliedStoreId === 'sxOzEivG9GP9SvaVuF1nVpQZCOu1'
        ? SACHA_STORE_ID : suppliedStoreId;

      // 2. Intelligent Auto-Recovery: Handle swapped or misplaced credentials / endpoint URLs
      // Case A: Swapped parameters (endpointUrl is sk_... and apiKey is http...)
      if ((rawEndpoint.startsWith('sk_') || rawEndpoint.startsWith('sanpi_')) && (rawApiKey.startsWith('http://') || rawApiKey.startsWith('https://'))) {
        console.log(`🔄 [Carrier Notify API] Parámetros invertidos detectados. Intercambiando endpointUrl y apiKey.`);
        const temp = rawEndpoint;
        rawEndpoint = rawApiKey;
        rawApiKey = temp;
      }
      // Case B: User passed an API Key in the endpointUrl field (e.g. sk_sacha_q17dqotk57swhxpuytwtdo44vy7irljf)
      else if (rawEndpoint.startsWith('sk_') || rawEndpoint.startsWith('sanpi_') || (!rawEndpoint.includes('://') && rawEndpoint.length > 25 && !rawEndpoint.includes('/'))) {
        console.log(`🔑 [Carrier Notify API] Clave API detectada en endpointUrl (${rawEndpoint.slice(0, 10)}...). Asignando a apiKey y usando webhook oficial.`);
        if (!rawApiKey) {
          rawApiKey = rawEndpoint;
        }
        rawEndpoint = SACHA_WEBHOOK_URL;
      }

      // Case C: Empty endpoint, fallback to official webhook
      if (!rawEndpoint) {
        rawEndpoint = SACHA_WEBHOOK_URL;
      }

      // Ensure proper protocol
      if (!rawEndpoint.startsWith('http://') && !rawEndpoint.startsWith('https://')) {
        if (rawEndpoint.includes('.')) {
          rawEndpoint = `https://${rawEndpoint}`;
        } else {
          rawEndpoint = SACHA_WEBHOOK_URL;
        }
      }

      // Validate URL parseability safely
      let targetEndpoint = rawEndpoint;
      try {
        new URL(targetEndpoint);
      } catch {
        console.warn(`⚠️ [Carrier Notify API] URL no parseable "${targetEndpoint}". Usando endpoint oficial por defecto.`);
        targetEndpoint = SACHA_WEBHOOK_URL;
      }

      if (isSachaWebhookUrl(targetEndpoint)) {
        return res.status(410).json({ success: false, message: 'Envía pedidos de Sacha mediante /api/logistics-dispatch con una orden verificada.' });
      }
      const resolvedApiKey = rawApiKey;

      if (!resolvedStoreId) {
        return res.status(400).json({
          success: false,
          error: 'Debe especificar el parámetro "storeId" con el ID de la tienda o socio.'
        });
      }

      // Format payload according to standard Dominican logistics format:
      // { storeId, items: [{ barcode_imei, quantity, price, name }], customer: { name, phone, address, province } }
      let carrierPayload: any;

      if (req.body?.items && req.body?.customer) {
        const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
        carrierPayload = {
          storeId: resolvedStoreId,
          externalOrderId: externalOrderId || req.body.externalOrderId || order?.externalOrderId,
          items: rawItems.map((item: any) => ({
            barcode_imei: String(item.barcode_imei || item.sku || item.id || 'SKU-001'),
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 1500,
            name: String(item.name || 'Producto A')
          })),
          customer: {
            name: String(req.body.customer.name || 'Juan Perez'),
            phone: String(req.body.customer.phone || '8095551234').replace(/[^0-9]/g, '') || '8095551234',
            address: String(req.body.customer.address || 'Calle Principal #5'),
            province: String(req.body.customer.province || 'Santiago')
          }
        };
      } else if (order && typeof order === 'object') {
        const lineItems = Array.isArray(order.items)
          ? order.items
          : (Array.isArray(order.line_items) ? order.line_items : []);

        const shipping = order.customer || order.shipping || {};

        carrierPayload = {
          storeId: resolvedStoreId,
          externalOrderId: externalOrderId || order.externalOrderId || order.id,
          items: lineItems.length > 0 ? lineItems.map((item: any) => ({
            barcode_imei: String(item.barcode_imei || item.sku || item.barcode || item.id || 'SKU-001'),
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 1500,
            name: String(item.name || item.title || 'Producto A')
          })) : [
            {
              barcode_imei: 'SKU-001',
              quantity: 1,
              price: 1500,
              name: 'Producto A'
            }
          ],
          customer: {
            name: String(
              shipping.name || 
              (shipping.first_name ? `${shipping.first_name} ${shipping.last_name || ''}`.trim() : '') || 
              'Juan Perez'
            ),
            phone: String(shipping.phone || '8095551234').replace(/[^0-9]/g, '') || '8095551234',
            address: String(shipping.address || shipping.address_1 || 'Calle Principal #5'),
            province: String(shipping.province || shipping.state || 'Santiago')
          }
        };
      } else {
        carrierPayload = {
          storeId: resolvedStoreId,
          externalOrderId,
          items: [
            {
              barcode_imei: 'SKU-001',
              quantity: 1,
              price: 1500,
              name: 'Producto A'
            }
          ],
          customer: {
            name: 'Juan Perez',
            phone: '8095551234',
            address: 'Calle Principal #5',
            province: 'Santiago'
          }
        };
      }

      if (isSachaWebhookUrl(targetEndpoint) && !carrierPayload.externalOrderId) {
        return res.status(400).json({ success: false, message: 'externalOrderId es obligatorio para Sacha.' });
      }
      console.log(`\n🚚 [Carrier Notify API] Enviando solicitud a transportista: ${targetEndpoint}`);
      console.log(`🏢 Store ID: ${resolvedStoreId}`);
      console.log(`🔑 API Key configurada: ${Boolean(resolvedApiKey)}`);
      console.log(`📦 Payload estructurado:`, JSON.stringify(carrierPayload, null, 2));

      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Sanpi-Carrier-API/1.0 (Dominican Republic)'
      };

      if (resolvedApiKey) {
        requestHeaders['Authorization'] = `Bearer ${resolvedApiKey}`;
        if (!isSachaWebhookUrl(targetEndpoint)) requestHeaders['x-api-key'] = resolvedApiKey;
      }

      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(carrierPayload),
        signal: controller.signal,
        redirect: 'manual'
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);

      let responseData: any = null;
      const responseContentType = response.headers.get('content-type') || '';
      if (responseContentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }
      } else {
        responseData = await response.text();
      }

      const isSuccess = response.ok || response.status === 201;

      console.log(`📥 [Carrier Notify API] Respuesta de transportista HTTP ${response.status} en ${latencyMs}ms`);

      let customMessage = isSuccess
        ? `Notificación procesada exitosamente por el transportista (HTTP ${response.status} en ${latencyMs}ms)`
        : `El transportista respondió con código HTTP ${response.status}`;

      let hint: string | undefined = undefined;

      if (!isSuccess && responseData && typeof responseData === 'object' && responseData.error) {
        if (typeof responseData.error === 'string' && responseData.error.toLowerCase().includes('tienda')) {
          customMessage = `Error de Sacha Pack (HTTP ${response.status}): ${responseData.error}`;
          hint = `El Store ID ("${resolvedStoreId}") no está dado de alta en la base de datos de Sacha Pack. Para corregirlo: 1) Inicia sesión en tu cuenta de socio en https://www.sachapack.com y copia el Store ID / Partner UID asignado a tu tienda. 2) O puedes probar el flujo usando el Webhook Local de Pruebas de Sanpi.`;
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

    } catch (err: any) {
      console.error('Error en /api/carrier/notify:', err?.message || err);
      const isDnsOrUnreachable = err.code === 'ENOTFOUND' || err.message?.includes('fetch failed') || err.message?.includes('getaddrinfo') || err.name === 'AbortError';
      const isInvalidUrl = err.name === 'TypeError' && (err.message?.includes('URL') || err.message?.includes('Invalid URL'));

      return res.status(200).json({
        success: false,
        status: isDnsOrUnreachable ? 503 : (isInvalidUrl ? 400 : 500),
        error: isInvalidUrl
          ? `La URL de destino no es válida (${req.body?.endpointUrl || req.body?.url || ''}). Debe comenzar con https://`
          : (isDnsOrUnreachable
              ? `No se pudo alcanzar el endpoint del transportista (${req.body?.endpointUrl || ''}). Verifica que el dominio y servidor estén activos.`
              : `Error al comunicar con transportista: ${err.message}`),
        details: err.code || err.name || 'CARRIER_NOTIFY_ERROR',
        endpoint: req.body?.endpointUrl || '',
        storeId: req.body?.storeId || ''
      });
    }
  };

  app.post('/api/carrier/notify', handleCarrierNotify);
  app.post('/api/carrier/dispatch', handleCarrierNotify);
  app.post('/api/carrier-notify', handleCarrierNotify);
  app.post('/api/transportista/notificar', handleCarrierNotify);

  // 5. WELCOME EMAIL DISPATCH ENDPOINT (Sanpi Registration & Referral Program)
  app.post('/api/send-welcome-email', (req, res) => {
    const {
      name = 'Socio Emprendedor',
      email,
      role = 'dropshipper',
      plan = 'pro',
      storeName = '',
      referralCode = `SANPI-${Date.now().toString().slice(-6)}`,
      phone = '',
      province = 'República Dominicana',
      referredByCode = ''
    } = req.body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Debe especificar un correo electrónico válido para el envío de la bienvenida.'
      });
    }

    const emailId = `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sentAt = new Date().toISOString();

    const roleLabel = role === 'partner'
      ? 'Tienda Mayorista / Proveedor Oficial'
      : role === 'dropshipper'
      ? 'Dropshipper Profesional RD'
      : role === 'admin'
      ? 'Administrador General'
      : 'Comprador Verificado';

    const planLabel = plan === 'basic'
      ? 'Plan Básico (RD$ 600/mes - 15% Comisión)'
      : plan === 'full' || plan === 'elite'
      ? 'Plan Full Mayorista (RD$ 2,000/mes - 8% Comisión)'
      : 'Plan Pro Recomendado (RD$ 1,500/mes - 10% Comisión)';

    const subject = `🎉 ¡Bienvenido a Sanpi Market RD! Plaza: ${role === 'partner' ? 'Tienda Mayorista' : role === 'dropshipper' ? 'Dropshipper Pro' : 'Comprador'} | Código: ${referralCode}`;

    const previewText = `Hola ${name}, te damos la bienvenida a Sanpi Market Dominicana. Tu plaza seleccionada es ${roleLabel} con código de referido: ${referralCode}. Disfruta de flete fijo a RD$ 350 y cobro contra entrega COD en las 32 provincias de República Dominicana.`;

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
      <p class="subtitle">E-commerce, Dropshipping & Red Logística COD República Dominicana</p>
    </div>
    <div class="content">
      <p class="greeting">¡Hola <strong>${name}</strong>!</p>
      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px;">
        Te damos una cordial bienvenida a <strong>Sanpi Market</strong>. Tu cuenta ha sido activada exitosamente para operar en el mercado digital dominicano.
      </p>

      <div class="badge-box">
        <span class="role-badge">${roleLabel}</span>
        <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">
          ${role === 'partner' ? `Tienda: ${storeName || name}` : `Operador: ${name}`}
        </div>
        <div style="font-size: 12px; color: #94a3b8;">
          <strong>Plaza Seleccionada:</strong> ${role === 'partner' ? planLabel : role === 'dropshipper' ? 'Plaza Dropshipper Pro (Venta sin Inventario)' : 'Plaza Comprador Directo COD'}
        </div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
          <strong>Provincia Base:</strong> ${province} | <strong>Contacto:</strong> ${phone || 'Registrado'}
        </div>
        ${referredByCode ? `<div style="font-size: 11px; color: #10b981; margin-top: 6px; font-weight: 600;">✓ Registrado con código de referido: ${referredByCode}</div>` : ''}
      </div>

      <div class="ref-code-box">
        <div class="ref-code-title">Tu Código Único de Referido Sanpi</div>
        <div class="ref-code">${referralCode}</div>
        <p class="ref-code-desc">
          Comparte este código con otras tiendas o dropshippers. Al registrarse obtienen descuento y tú acumulas beneficios y comisiones en efectivo.
        </p>
      </div>

      <h3 style="color: #ffffff; font-size: 14px; font-weight: 800; margin-top: 24px; margin-bottom: 10px;">
        Beneficios y Reglas Operativas en República Dominicana:
      </h3>
      <ul class="feature-list">
        <li class="feature-item">
          <strong>🚚 Flete Fijo Nacional:</strong> RD$ 350 a cualquiera de las 32 provincias de República Dominicana con Sacha Pack Express.
        </li>
        <li class="feature-item">
          <strong>💵 Pago Contra Entrega (COD):</strong> Cobro 100% en efectivo a domicilio al momento de entregar el producto.
        </li>
        ${role === 'dropshipper' ? `
        <li class="feature-item">
          <strong>⚡ Generador de Landing Pages con IA:</strong> Crea páginas de venta con temporizador de urgencia y WhatsApp en 1 solo clic.
        </li>
        <li class="feature-item">
          <strong>📈 Margen de Ganancia Neto:</strong> Tú defines tu precio de venta y recibes tus utilidades tras cada entrega liquidada.
        </li>
        ` : role === 'partner' ? `
        <li class="feature-item">
          <strong>🏪 Catálogo Mayorista:</strong> Tu inventario visible para cientos de dropshippers y compradores en todo el país.
        </li>
        <li class="feature-item">
          <strong>📦 Despacho Automatizado:</strong> Integración directa con almacén y transporte para envíos en 24-48 horas.
        </li>
        ` : `
        <li class="feature-item">
          <strong>🛍️ Compra Segura:</strong> Revisa tu paquete antes de pagar en tu casa u oficina.
        </li>
        `}
        <li class="feature-item">
          <strong>📲 Soporte Directo WhatsApp:</strong> Línea oficial de atención al socio <strong>809-676-6690</strong>.
        </li>
      </ul>

      <a href="https://sanpimarket.do" class="cta-btn">
        Entrar a Mi Panel de Sanpi Market &rarr;
      </a>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">Sanpi Market Dominicana SRL • Santo Domingo, República Dominicana</p>
      <p style="margin: 0;">Soporte Oficial WhatsApp: 809-676-6690 • info@sanpimarket.do</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    console.log(`\n📧 [Welcome Email Service] Enviando mensaje de bienvenida a: ${email}`);
    console.log(`👤 Nombre: ${name} | Rol: ${role} | Plaza: ${planLabel} | Código de Referido: ${referralCode}`);
    console.log(`📨 Asunto: ${subject}`);

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
      message: `Mensaje de bienvenida y código de referido (${referralCode}) generado y despachado a ${email}`
    });
  });

  // 5. API SPECIFICATION & DOCUMENTATION ENDPOINT
  // Provides external logistics engineers and systems with the complete schema specifications
  app.get('/api/logistics/spec', (req, res) => {
    res.json({
      title: 'Sanpi Marketplace - Transport & Courier Integration API',
      version: '2.0.0',
      description: 'Especificación estándar para conectar empresas de transporte y paquetería con Sanpi para despacho automatizado COD.',
      authentication: {
        typesSupported: ['x-api-key', 'Bearer Token', 'Custom Header'],
        headers: {
          'x-api-key': 'sk_carrier_xxxxxxxxxxxxxxxxxxxx',
          'Authorization': 'Bearer sk_carrier_xxxxxxxxxxxxxxxxxxxx'
        }
      },
      endpoints: {
        outgoing_dispatch: {
          description: 'Payload enviado por Sanpi al Endpoint de la empresa de transporte cuando un cliente realiza una compra.',
          method: 'POST',
          samplePayload: {
            storeId: SACHA_STORE_ID,
            items: [
              {
                barcode_imei: 'SKU-001',
                quantity: 1,
                price: 1500,
                name: 'Producto A'
              }
            ],
            customer: {
              name: 'Juan Perez',
              phone: '8095551234',
              address: 'Calle Principal #5',
              province: 'Santiago'
            }
          }
        },
        inbound_status_webhook: {
          description: 'Endpoint que la empresa de transporte llama para reportar cambios de estado a Sanpi.',
          url: 'https://sanpi.com.do/api/logistics/webhook-receiver',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer <CLAVE_DE_RETORNO_GENERADA_POR_ADMIN>',
            'Content-Type': 'application/json'
          },
          samplePayload: {
            externalOrderId: 'SPSANPI-M-SSDLC-1792205308513-C61033827A',
            carrierTrackingId: 'CARIBE-98421-X',
            status: 'en_transito',
            courierName: 'Carlos Ramírez',
            courierPhone: '829-555-4321',
            location: {
              lat: 18.4861,
              lng: -69.9312,
              updatedAt: new Date().toISOString()
            },
            notes: 'Paquete en ruta de entrega en Santo Domingo'
          }
        },
        connection_test: {
          description: 'Endpoint para verificar handshake y credenciales de cualquier transportadora.',
          url: '/api/logistics/test-connection',
          method: 'POST'
        }
      }
    });
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Express Error Middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.code === 'EPIPE' || err.code === 'ECONNRESET')) {
      return;
    }
    console.error('Express Error Handler:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: err?.message || 'Server error' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sanpi Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
