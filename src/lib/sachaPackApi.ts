import { SachaPackWebhookPayload, SachaPackWebhookResponse, LogisticsProviderConfig, Delivery, Article, Store, PaymentMethod, LogisticsConnectionTestResult } from '../types';
import { auth } from './firebase';

/**
 * Official Sacha Pack Logistics API Webhook Endpoint (Production)
 */
export const SACHA_PACK_WEBHOOK_URL = 'https://sacha--studio-9195671573-fb490.us-east4.hosted.app/api/logistics-webhook';
export const SACHA_PACK_ALT_WEBHOOK_URL = 'https://www.sachapack.com/api/logistics-webhook';

/**
 * Default Master Account Store Identifier for Sacha Pack Logistics Integration
 */
export const DEFAULT_SACHA_PACK_STORE_ID = 'ds_80NC3boX9Le29wnJe3zO9OJ0cFz1';

/**
 * Default Sacha Pack API Key
 */
export const DEFAULT_SACHA_PACK_API_KEY = '';

/**
 * Default Inbound Webhook Secret for Transport Companies
 */

/**
 * Default JSON Template for Sacha Pack & Logistics Webhooks
 */
export const DEFAULT_LOGISTICS_JSON_TEMPLATE = JSON.stringify(
  {
    storeId: '{{storeId}}',
    externalOrderId: '{{externalOrderId}}',
    items: [
      {
        barcode_imei: '{{barcode_imei}}',
        quantity: 1,
        price: 1500,
        name: '{{itemName}}'
      }
    ],
    customer: {
      name: '{{customerName}}',
      phone: '{{customerPhone}}',
      address: '{{address}}',
      province: '{{province}}'
    }
  },
  null,
  2
);

export const DEFAULT_SACHA_PACK_JSON_TEMPLATE = DEFAULT_LOGISTICS_JSON_TEMPLATE;

/**
 * Initial Default Preconfigured Logistics Providers for Dominican Republic
 */
export const DEFAULT_LOGISTICS_PROVIDERS: LogisticsProviderConfig[] = [
  {
    id: 'prov_sacha_pack',
    name: 'Sacha Pack Logistics',
    code: 'sacha_pack',
    logoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&auto=format&fit=crop&q=80',
    websiteUrl: 'https://www.sachapack.com/',
    webhookUrl: SACHA_PACK_WEBHOOK_URL,
    httpMethod: 'POST',
    authType: 'bearer',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    defaultStoreId: DEFAULT_SACHA_PACK_STORE_ID,
    apiKey: '',
    authToken: '',
    isActive: true,
    isDefault: true,
    jsonTemplate: DEFAULT_LOGISTICS_JSON_TEMPLATE,
    notes: 'Operador logístico principal y oficial para Sanpi Marketplace con cobertura nacional COD.',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-22T12:00:00.000Z'
  },
  {
    id: 'prov_caribe_pack',
    name: 'Caribe Pack Express',
    code: 'caribe_pack',
    logoUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=100&auto=format&fit=crop&q=80',
    websiteUrl: 'https://caribepack.do/',
    webhookUrl: 'https://api.caribepack.do/v1/deliveries/cod-webhook',
    httpMethod: 'POST',
    authType: 'bearer',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    defaultStoreId: 'CP-SANPI-809',
    apiKey: '',
    isActive: true,
    isDefault: false,
    jsonTemplate: DEFAULT_LOGISTICS_JSON_TEMPLATE,
    notes: 'Red interurbana de envíos con terminales en todo el Cibao, Sur y Este.',
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: '2026-08-22T12:00:00.000Z'
  },
  {
    id: 'prov_metro_pac',
    name: 'Metro Pac Logistics',
    code: 'metro_pac',
    logoUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=100&auto=format&fit=crop&q=80',
    websiteUrl: 'https://metropac.com.do/',
    webhookUrl: 'https://metropac.com.do/api/v2/logistics/dispatch',
    httpMethod: 'POST',
    authType: 'bearer',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    defaultStoreId: 'MPAC-RD-2025',
    apiKey: '',
    isActive: true,
    isDefault: false,
    jsonTemplate: DEFAULT_LOGISTICS_JSON_TEMPLATE,
    notes: 'Envíos prioritarios y recolección puerta a puerta en Santo Domingo y Santiago.',
    createdAt: '2026-08-21T11:00:00.000Z',
    updatedAt: '2026-08-22T12:00:00.000Z'
  }
];

/**
 * Replaces {{variable}} placeholders inside a JSON template string
 */
export function populateJsonTemplate(templateStr: string, variables: Record<string, any>): any {
  try {
    let replaced = templateStr;
    Object.keys(variables).forEach((key) => {
      const val = variables[key];
      // Replace quoted string "{{key}}"
      const regexQuoted = new RegExp(`"\\{\\{${key}\\}\\}"`, 'g');
      if (typeof val === 'number' || typeof val === 'boolean') {
        replaced = replaced.replace(regexQuoted, String(val));
      } else {
        replaced = replaced.replace(regexQuoted, JSON.stringify(val || ''));
      }
      // Replace raw {{key}}
      const regexRaw = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      replaced = replaced.replace(regexRaw, String(val !== undefined && val !== null ? val : ''));
    });

    return JSON.parse(replaced);
  } catch (err) {
    console.warn('Could not parse customized template JSON, falling back to standard schema', err);
    return null;
  }
}

/**
 * Builds the official Sacha Pack logistics payload strictly matching the required schema:
 * {
 *   "storeId": "TU_UID_DE_SOCIO",
 *   "externalOrderId": "INV-2026-001",
 *   "paymentMethod": "contra entrega",
 *   "items": [
 *     {
 *       "sku": "744123456789",
 *       "quantity": 1,
 *       "price": 1500.00,
 *       "name": "Tenis Deportivos"
 *     }
 *   ],
 *   "customer": {
 *     "name": "Juan Perez",
 *     "phone": "8095551212",
 *     "address": "Calle Principal #5, Ens. Libertad",
 *     "province": "Santiago",
 *     "municipality": "Santiago de los Caballeros"
 *   }
 * }
 */
export function buildSachaPackPayload(options: {
  storeId?: string;
  externalOrderId?: string;
  items: Array<{
    barcode_imei?: string;
    sku?: string;
    quantity: number;
    price: number;
    name?: string;
  }>;
  customer: {
    name: string;
    email?: string;
    phone: string;
    address: string;
    province: string;
    municipality?: string;
  };
  paymentMethod?: PaymentMethod | string;
}): SachaPackWebhookPayload {
  let rawStoreId = options.storeId && options.storeId.trim() !== ''
    ? options.storeId.trim()
    : DEFAULT_SACHA_PACK_STORE_ID;

  // Sanitize common placeholder text
  if (rawStoreId === 'TU_UID_DE_SOCIO' || rawStoreId === 'TU_ID_DE_SOCIO' || rawStoreId === 'TU_PARTNER_UID' || rawStoreId === 'TU_STORE_ID') {
    rawStoreId = DEFAULT_SACHA_PACK_STORE_ID;
  }

  const items = options.items.map(item => {
    const code = (item.barcode_imei || item.sku || '').trim();
    return {
      barcode_imei: code,
      quantity: item.quantity > 0 ? item.quantity : 1,
      price: Number(item.price) || 0,
      name: item.name || 'Artículo Sanpi'
    };
  });

  // Clean phone to numeric / standard WhatsApp format (e.g. 8095551212)
  const cleanPhone = options.customer.phone ? options.customer.phone.replace(/[^0-9]/g, '') : '';

  return {
    storeId: rawStoreId,
    externalOrderId: options.externalOrderId || `INV-${Date.now().toString().slice(-6)}`,
    items,
    customer: {
      name: options.customer.name,
      phone: cleanPhone,
      address: options.customer.address,
      province: options.customer.province
    }
  };
}

/**
 * Returns the exact reference sample JSON payload requested for testing & verification
 */
export function getSampleSachaPackPayload(storeId?: string): SachaPackWebhookPayload {
  const resolvedStoreId = (storeId && storeId.trim() !== '' && !storeId.startsWith('TU_'))
    ? storeId.trim()
    : DEFAULT_SACHA_PACK_STORE_ID;

  return {
    storeId: resolvedStoreId,
    externalOrderId: 'PEDIDO-10001',
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

/**
 * Dispatches an order to any configured Logistics Provider API Webhook
 * Uses the backend server proxy (/api/logistics-dispatch) to bypass browser CORS constraints,
 * and falls back to client direct fetch if needed.
 */
export async function sendToLogisticsWebhook(
  payload: any,
  provider?: LogisticsProviderConfig | null,
  deliveryId?: string
): Promise<SachaPackWebhookResponse> {
  const webhookUrl = provider?.webhookUrl || SACHA_PACK_WEBHOOK_URL;
  const isSachaPack = provider?.code === 'sacha_pack' || provider?.id === 'prov_sacha_pack' || webhookUrl === SACHA_PACK_WEBHOOK_URL;
  const providerName = provider?.name || 'Sacha Pack Logistics';
  const httpMethod = provider?.httpMethod || 'POST';
  const apiKey = provider?.apiKey || provider?.authToken || '';
  const customHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(provider?.headers || {})
  };

  if (apiKey && !isSachaPack) {
    customHeaders['Authorization'] = `Bearer ${apiKey.trim()}`;
    customHeaders['x-api-key'] = apiKey.trim();
  }

  const timestamp = new Date().toISOString();
  console.group(`🚚 [Logistics API - ${providerName}] Despachando a ${webhookUrl}`);
  console.log('Payload Enviado:', JSON.stringify(payload, null, 2));

  // 1. First attempt: Dispatch via full-stack Node.js server proxy (/api/logistics-dispatch)
  // This guarantees reliable server-to-server HTTP request without browser CORS restrictions
  try {
    const idToken = await auth.currentUser?.getIdToken();
    const proxyResponse = await fetch('/api/logistics-dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(idToken ? { 'X-Sanpi-Id-Token': idToken } : {})
      },
      body: JSON.stringify({
        webhookUrl,
        httpMethod,
        headers: customHeaders,
        apiKey,
        authToken: apiKey,
        providerId: provider?.id,
        providerCode: provider?.code,
        deliveryId,
        payload
      })
    });

    const proxyResult: SachaPackWebhookResponse = await proxyResponse.json();
    if (proxyResponse.ok || isSachaPack || provider?.id) {
      console.log(`✅ [Logistics API Proxy - ${providerName}] Respuesta Recibida:`, proxyResult);
      console.groupEnd();
      return {
        ...proxyResult,
        providerId: provider?.id,
        providerName
      };
    }
  } catch (proxyError: any) {
    console.warn(`[Logistics API Proxy] Proxy local no disponible, intentando llamada directa:`, proxyError.message);
    if (isSachaPack || provider?.id) return {
      success: false,
      status: 503,
      message: `No se pudo conectar con el servidor de Sanpi: ${proxyError.message}`,
      timestamp,
      endpoint: webhookUrl,
      providerId: provider?.id,
      providerName
    };
  }

  // 2. Second attempt: Direct client fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(webhookUrl, {
      method: httpMethod,
      headers: customHeaders,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let rawResponse: any = null;
    try {
      rawResponse = await response.json();
    } catch {
      try {
        rawResponse = await response.text();
      } catch {
        rawResponse = null;
      }
    }

    if (response.ok) {
      console.log(`✅ [Logistics API Direct - ${providerName}] Respuesta Exitosa:`, response.status, rawResponse);
      console.groupEnd();
      return {
        success: true,
        status: response.status,
        message: `Orden ${payload.externalOrderId || 'ORD-SYNC'} recibida exitosamente en ${providerName} API`,
        timestamp,
        endpoint: webhookUrl,
        providerId: provider?.id,
        providerName,
        sachaTrackingId: rawResponse?.trackingNumber || rawResponse?.trackingId || rawResponse?.id || rawResponse?.tracking_number || `LOG-${Date.now()}`,
        trackingNumber: rawResponse?.trackingNumber || rawResponse?.trackingId || rawResponse?.tracking_number || rawResponse?.id,
        totalToCollect: rawResponse?.totalToCollect !== undefined ? Number(rawResponse.totalToCollect) : undefined,
        rawResponse,
        isSimulated: false
      };
    } else {
      console.warn(`⚠️ [Logistics API Direct - ${providerName}] Servidor respondió con error:`, response.status, rawResponse);
      console.groupEnd();
      return {
        success: false,
        status: response.status,
        message: `Servidor ${providerName} respondió con código ${response.status}: ${JSON.stringify(rawResponse || '')}`,
        timestamp,
        endpoint: webhookUrl,
        providerId: provider?.id,
        providerName,
        rawResponse,
        isSimulated: false
      };
    }
  } catch (error: any) {
    console.error(`❌ [Logistics API - ${providerName}] Error en el despacho:`, error.message);
    console.groupEnd();

    return {
      success: false,
      status: 500,
      message: `Error al despachar orden a ${providerName}: ${error.message}`,
      timestamp,
      endpoint: webhookUrl,
      providerId: provider?.id,
      providerName,
      rawResponse: {
        error: error.message,
        provider: providerName,
        storeId: payload.storeId,
        externalOrderId: payload.externalOrderId
      },
      isSimulated: false
    };
  }
}

/**
 * Backward compatibility alias for Sacha Pack
 */
export async function sendToSachaPackWebhook(
  payload: SachaPackWebhookPayload,
  webhookUrl: string = SACHA_PACK_WEBHOOK_URL
): Promise<SachaPackWebhookResponse> {
  return sendToLogisticsWebhook(payload, {
    id: 'prov_sacha_pack',
    name: 'Sacha Pack Logistics',
    code: 'sacha_pack',
    webhookUrl,
    httpMethod: 'POST',
    defaultStoreId: payload.storeId || DEFAULT_SACHA_PACK_STORE_ID,
    isActive: true,
    isDefault: true,
    jsonTemplate: DEFAULT_LOGISTICS_JSON_TEMPLATE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

/**
 * Tests connection with any transport company endpoint using API Key and measures latency
 */
export async function testLogisticsConnection(
  options: {
    endpointUrl: string;
    apiKey?: string;
    authToken?: string;
    authType?: string;
    customHeaderName?: string;
    httpMethod?: 'POST' | 'PUT';
    defaultStoreId?: string;
    headers?: Record<string, string>;
  }
): Promise<LogisticsConnectionTestResult> {
  const endpointUrl = (options.endpointUrl || '').trim();
  const apiKey = (options.apiKey || options.authToken || '').trim();
  const authType = options.authType || 'x-api-key';
  const customHeaderName = options.customHeaderName || '';
  const httpMethod = options.httpMethod || 'POST';
  const defaultStoreId = options.defaultStoreId || 'SANPI-TEST-STORE';
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  // 1. First attempt: Server-Side Connection Test Proxy (/api/logistics/test-connection)
  try {
    const res = await fetch('/api/logistics/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        endpointUrl,
        apiKey,
        authToken: apiKey,
        authType,
        customHeaderName,
        httpMethod,
        defaultStoreId,
        headers: options.headers || {}
      })
    });

    if (res.ok) {
      const data: LogisticsConnectionTestResult = await res.json();
      return data;
    }
  } catch (err: any) {
    console.warn('[Logistics Test] Proxy local falló, intentando fetch directo:', err);
  }

  // 2. Second attempt: Client-side direct ping
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const outgoingHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (apiKey) {
      if (authType === 'bearer') {
        outgoingHeaders['Authorization'] = `Bearer ${apiKey}`;
      } else if (authType === 'custom_header' && customHeaderName) {
        outgoingHeaders[customHeaderName] = apiKey;
      } else {
        outgoingHeaders['x-api-key'] = apiKey;
        outgoingHeaders['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    const testPayload = {
      event: 'PING_HANDSHAKE',
      source: 'Sanpi Marketplace RD',
      test: true,
      timestamp,
      storeId: defaultStoreId,
      message: 'Verificación directa de conectividad y credenciales'
    };

    const response = await fetch(endpointUrl, {
      method: httpMethod,
      headers: outgoingHeaders,
      body: JSON.stringify(testPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    let rawResponse: any = null;
    try {
      rawResponse = await response.json();
    } catch {
      try {
        rawResponse = await response.text();
      } catch {
        rawResponse = null;
      }
    }

    return {
      success: response.ok,
      status: response.status,
      latencyMs,
      message: response.ok
        ? `¡Conexión Exitosa! El endpoint respondió HTTP ${response.status} en ${latencyMs}ms`
        : `El endpoint respondió con código HTTP ${response.status} (${response.statusText}) en ${latencyMs}ms`,
      timestamp,
      endpoint: endpointUrl,
      rawResponse,
      diagnostic: {
        dnsOk: true,
        sslOk: endpointUrl.startsWith('https'),
        authHeaderDetected: Boolean(apiKey),
        details: 'Prueba de conexión directa desde el navegador'
      }
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      status: 500,
      latencyMs,
      message: `Error al conectar con ${endpointUrl}: ${err.message}`,
      timestamp,
      endpoint: endpointUrl,
      rawResponse: { error: err.message },
      diagnostic: {
        dnsOk: false,
        sslOk: endpointUrl.startsWith('https'),
        authHeaderDetected: Boolean(apiKey),
        details: err.message
      }
    };
  }
}
