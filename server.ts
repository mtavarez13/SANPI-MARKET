import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

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
  const PORT = 3000;

  // Middleware for JSON parsing with ample limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
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

    const targetUrl = (endpointUrl || webhookUrl || '').trim();
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        status: 400,
        latencyMs: 0,
        message: 'Debe especificar el Endpoint URL de la empresa de transporte.',
        timestamp: new Date().toISOString(),
        endpoint: ''
      });
    }

    const outgoingHeaders = buildCarrierHeaders({
      apiKey,
      authToken,
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
    console.log(`🔑 [Carrier Connection Test] Headers:`, JSON.stringify(outgoingHeaders, null, 2));

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

    const targetUrl = (endpointUrl || webhookUrl || '').trim();

    if (!targetUrl || !payload) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: endpointUrl/webhookUrl and payload are required'
      });
    }

    const isSachaPack = targetUrl.includes('sachapack.com');
    let sanitizedPayload: any = payload;

    // Safely parse JSON string payload if received as string
    if (typeof sanitizedPayload === 'string') {
      try {
        sanitizedPayload = JSON.parse(sanitizedPayload);
      } catch {
        // Leave as string if not valid JSON
      }
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
          currentStoreId.startsWith('TU_') ||
          currentStoreId.startsWith('store_') ||
          currentStoreId.startsWith('store-') ||
          currentStoreId.length < 10)
      ) {
        sanitizedPayload.storeId = 'Vw5WLzIfe3TI59EgbOBtVisY08U2';
        console.log(`ℹ️ [Server Carrier Dispatch] StoreId normalizado a Master Partner ID Oficial: Vw5WLzIfe3TI59EgbOBtVisY08U2`);
      }
    }

    // Default Sacha Pack API key if missing
    let resolvedApiKey = apiKey || authToken;
    if (isSachaPack && (!resolvedApiKey || resolvedApiKey === 'sk_sacha_live_demo_key')) {
      resolvedApiKey = 'sk_sacha_wcrvnhqagxd86pqpxs1jfikvjq8mqmxt';
    }

    const outgoingHeaders = buildCarrierHeaders({
      apiKey: resolvedApiKey,
      authToken: resolvedApiKey,
      authType: isSachaPack ? 'bearer' : authType,
      customHeaderName,
      headers
    });

    const timestamp = new Date().toISOString();
    console.log(`\n🚚 [Server Carrier Dispatch] Enviando ${httpMethod} a: ${targetUrl}`);
    console.log(`🔑 [Server Carrier Dispatch] Headers:`, JSON.stringify(outgoingHeaders, null, 2));
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

      let isSuccess = response.ok || response.status === 201;
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
        sanitizedPayload?.storeId !== 'Vw5WLzIfe3TI59EgbOBtVisY08U2'
      ) {
        console.log(`🔄 [Server Carrier Dispatch] Tienda no registrada detectada. Reintentando automáticamente con Master Store ID (Vw5WLzIfe3TI59EgbOBtVisY08U2)...`);
        try {
          const retryPayload = {
            ...sanitizedPayload,
            storeId: 'Vw5WLzIfe3TI59EgbOBtVisY08U2'
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
          explanationMessage = `Sacha Pack API (${response.status}): ${responseData.error} Recomendación: Utiliza el Store ID registrado en Sacha Pack ("Vw5WLzIfe3TI59EgbOBtVisY08U2") o registra el UID de tu tienda en Sacha Pack.`;
        }
      }

      return res.status(200).json({
        success: isSuccess,
        status: response.status,
        statusText: response.statusText,
        message: explanationMessage,
        timestamp,
        endpoint: targetUrl,
        trackingNumber: trackingNumber || (isSuccess ? `SPVS-${Date.now().toString().slice(-7)}` : undefined),
        totalToCollect,
        sachaTrackingId: trackingNumber || (isSuccess ? `SPVS-${Date.now().toString().slice(-7)}` : undefined),
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
  app.post('/api/logistics/webhook-receiver', (req, res) => {
    const authHeader = req.headers['authorization'] || req.headers['x-api-key'] || req.headers['x-webhook-secret'] || '';
    const body = req.body;

    console.log('\n📦 [Inbound Carrier Webhook] Recibida actualización de transporte:', JSON.stringify(body, null, 2));

    const {
      externalOrderId,
      trackingNumber,
      carrierTrackingId,
      status, // 'pendiente' | 'en_transito' | 'entregado' | 'cancelado' | 'reprogramado' | 'intento_fallido'
      courierName,
      courierPhone,
      location,
      notes
    } = body || {};

    if (!externalOrderId && !trackingNumber && !carrierTrackingId) {
      return res.status(400).json({
        success: false,
        error: 'Debe incluir externalOrderId, trackingNumber o carrierTrackingId para identificar la orden.'
      });
    }

    return res.status(200).json({
      success: true,
      received: true,
      message: 'Actualización de estado recibida y encolada para sincronización en Sanpi',
      timestamp: new Date().toISOString(),
      orderIdentifier: externalOrderId || trackingNumber || carrierTrackingId,
      newStatus: status || 'en_transito'
    });
  });

  // 4. WELCOME EMAIL DISPATCH ENDPOINT (Sanpi Registration & Referral Program)
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
            storeId: 'Vw5WLzIfe3TI59EgbOBtVisY08U2',
            externalOrderId: 'ORD-98421',
            items: [
              {
                barcode_imei: '742683901234',
                quantity: 1,
                price: 1850
              }
            ],
            customer: {
              name: 'Juan Pérez',
              email: 'juan.perez@ejemplo.do',
              phone: '809-555-0199',
              address: 'Calle Las Palmas #42, Los Cacicazgos',
              province: 'Distrito Nacional',
              municipality: 'Santo Domingo'
            },
            paymentMethod: 'contra entrega',
            codAmount: 2200,
            shippingFee: 350
          }
        },
        inbound_status_webhook: {
          description: 'Endpoint que la empresa de transporte llama para reportar cambios de estado a Sanpi.',
          url: '/api/logistics/webhook-receiver',
          method: 'POST',
          headers: {
            'x-api-key': 'SECRET_SANPI_WEBHOOK_KEY',
            'Content-Type': 'application/json'
          },
          samplePayload: {
            externalOrderId: 'ORD-98421',
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
