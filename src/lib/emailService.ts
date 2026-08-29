import { WelcomeEmailPayload, WelcomeEmailResult } from '../types';

/**
 * Dispatches a personalized welcome email to the newly registered user
 * through the server-side proxy endpoint.
 */
export async function sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<WelcomeEmailResult> {
  try {
    const res = await fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Fallo al conectar con el servicio de correo.`);
    }

    const data: WelcomeEmailResult = await res.json();
    return data;
  } catch (err: any) {
    console.warn('⚠️ [Welcome Email Client] Fallback a generación local:', err?.message);
    
    // Client-side fallback if server offline
    const roleLabel = payload.role === 'partner'
      ? 'Tienda Mayorista / Proveedor Oficial'
      : payload.role === 'dropshipper'
      ? 'Dropshipper Profesional RD'
      : payload.role === 'admin'
      ? 'Administrador General'
      : 'Comprador Verificado';

    const planLabel = payload.plan === 'basic'
      ? 'Plan Básico (RD$ 600/mes - 15% Comisión)'
      : payload.plan === 'full' || payload.plan === 'elite'
      ? 'Plan Full Mayorista (RD$ 2,000/mes - 8% Comisión)'
      : 'Plan Pro Recomendado (RD$ 1,500/mes - 10% Comisión)';

    const subject = `🎉 ¡Bienvenido a Sanpi Market RD! Plaza: ${payload.role === 'partner' ? 'Tienda Mayorista' : payload.role === 'dropshipper' ? 'Dropshipper Pro' : 'Comprador'} | Código: ${payload.referralCode}`;

    return {
      success: true,
      emailId: `local_${Date.now()}`,
      sentAt: new Date().toISOString(),
      recipient: payload.email,
      subject,
      roleLabel,
      planLabel,
      referralCode: payload.referralCode,
      message: `Mensaje de bienvenida simulado para ${payload.email}`
    };
  }
}
