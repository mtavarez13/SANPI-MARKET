import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Mail, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  Store as StoreIcon, 
  Zap, 
  Truck, 
  ShieldCheck, 
  ArrowRight,
  Send,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { sendWelcomeEmail } from '../lib/emailService';

interface WelcomeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onNavigateToWorkspace?: (role: string) => void;
}

export const WelcomeEmailModal: React.FC<WelcomeEmailModalProps> = ({
  isOpen,
  onClose,
  user,
  onNavigateToWorkspace
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'card' | 'email_preview'>('card');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  if (!isOpen || !user) return null;

  const referralCode = user.referralCode || `SANPI-${(user.role === 'partner' ? 'STORE' : 'DS')}-${user.uid.slice(-4).toUpperCase()}`;
  
  const roleTitle = user.role === 'partner' 
    ? 'Tienda Mayorista / Proveedor' 
    : user.role === 'dropshipper' 
    ? 'Dropshipper Profesional RD' 
    : user.role === 'admin' 
    ? 'Administrador General' 
    : 'Comprador Verificado';

  const planName = user.role === 'partner'
    ? (user.plan === 'basic' ? 'Plan Básico (RD$ 600/mes)' : user.plan === 'full' ? 'Plan Full Mayorista (RD$ 2,000/mes)' : 'Plan Pro (RD$ 1,500/mes)')
    : (user.role === 'dropshipper' ? 'Plaza Dropshipper Pro (Comisiones Directas)' : 'Plaza Comprador VIP');

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `¡Hola! Me acabo de registrar en Sanpi Market Dominicana como ${roleTitle}. Únete usando mi código de referido: *${referralCode}* para obtener beneficios y descuentos exclusivos en flete y comisiones. https://sanpimarket.do`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleResendEmail = async () => {
    if (!user.email) return;
    setResending(true);
    try {
      await sendWelcomeEmail({
        name: user.displayName || 'Socio Sanpi',
        email: user.email,
        role: user.role,
        plan: user.plan,
        storeName: user.storeName,
        referralCode: referralCode,
        phone: user.phone,
        province: user.province,
        referredByCode: user.referredByCode
      });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-purple-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col relative text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 p-6 relative border-b border-purple-500/30">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-inner">
              <Sparkles className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Registro Exitoso
                </span>
                <span className="text-xs text-purple-200 font-medium">República Dominicana</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                ¡Bienvenido a Sanpi Market! 🎉
              </h2>
            </div>
          </div>

          {/* Quick tab switcher */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-purple-500/20">
            <button
              onClick={() => setActiveTab('card')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'card'
                  ? 'bg-white text-purple-950 shadow-md'
                  : 'text-purple-200 hover:bg-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Tu Plaza y Código de Referido
            </button>
            <button
              onClick={() => setActiveTab('email_preview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'email_preview'
                  ? 'bg-white text-purple-950 shadow-md'
                  : 'text-purple-200 hover:bg-white/10'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Mensaje Enviado al Correo
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {activeTab === 'card' ? (
            <>
              {/* Notification Banner */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 flex items-start gap-3">
                <Mail className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-emerald-200 leading-relaxed">
                  <span className="font-bold text-white">Mensaje personalizado enviado a:</span>{' '}
                  <span className="underline decoration-emerald-400 font-mono text-white">{user.email}</span>
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    Revisa tu bandeja de entrada o spam. Incluye los accesos a tu plaza y las instrucciones de operación.
                  </p>
                </div>
              </div>

              {/* User Identity & Selected Plaza Box */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'Sanpi')}`} 
                      alt={user.displayName || 'Usuario'} 
                      className="w-12 h-12 rounded-xl object-cover border border-purple-500/40"
                    />
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        {user.displayName}
                      </h3>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      user.role === 'partner'
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : user.role === 'dropshipper'
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                        : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {user.role === 'partner' ? <StoreIcon className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                      {roleTitle}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-700/60 text-xs">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">Plaza Seleccionada</span>
                    <span className="text-white font-bold mt-0.5 block">{planName}</span>
                    {user.storeName && (
                      <span className="text-purple-300 text-[11px] block mt-0.5">Tienda: {user.storeName}</span>
                    )}
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">Ubicación & Teléfono</span>
                    <span className="text-white font-bold mt-0.5 block">{user.province || 'República Dominicana'}</span>
                    <span className="text-slate-300 text-[11px] block mt-0.5">{user.phone || '809-000-0000'}</span>
                  </div>
                </div>
              </div>

              {/* REFERRAL CODE HIGHLIGHT BOX */}
              <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 border-2 border-dashed border-purple-500/50 rounded-2xl p-5 text-center relative overflow-hidden shadow-xl">
                <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
                
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                  🎁 Tu Código Único de Referido
                </span>

                <div className="my-3 font-mono text-2xl sm:text-3xl font-black text-white tracking-widest bg-slate-950/80 py-3 px-4 rounded-xl border border-purple-500/40 inline-flex items-center gap-3 select-all">
                  <span>{referralCode}</span>
                </div>

                <p className="text-xs text-purple-200/90 max-w-md mx-auto leading-relaxed">
                  Comparte tu código con otros comerciantes o emprendedores en RD. Al registrarse obtienen descuentos en membresía y tú acumulas comisiones en efectivo por sus ventas.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                  <button
                    onClick={handleCopyReferral}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        ¡Código Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar Código
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Compartir en WhatsApp
                  </button>
                </div>
              </div>

              {/* DOMINICAN LOGISTICS REASSURANCE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl flex items-start gap-2.5">
                  <Truck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Flete Fijo RD$ 350</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">32 Provincias de RD con Sacha Pack</p>
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Cobro COD Efectivo</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Cobro contra entrega a domicilio</p>
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Soporte WhatsApp</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Línea oficial: 809-676-6690</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* EMAIL PREVIEW TAB */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Destinatario Oficial:</span>
                  <span className="text-white font-mono font-bold">{user.email}</span>
                </div>
                <button
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 rounded-lg font-bold text-xs transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {resending ? 'Reenviando...' : resendSuccess ? '¡Reenviado!' : 'Reenviar Correo'}
                </button>
              </div>

              {/* Email Mock Rendering */}
              <div className="bg-slate-950 border border-slate-700 rounded-2xl p-5 text-slate-300 font-sans space-y-4 shadow-inner text-xs sm:text-sm">
                <div className="border-b border-slate-800 pb-3">
                  <p className="text-slate-400 text-xs">
                    <strong className="text-slate-200">De:</strong> Sanpi Market Dominicana &lt;bienvenida@sanpimarket.do&gt;
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    <strong className="text-slate-200">Asunto:</strong> 🎉 ¡Bienvenido a Sanpi Market RD! Plaza: {roleTitle} | Código: {referralCode}
                  </p>
                </div>

                <div className="space-y-3 pt-2 leading-relaxed">
                  <p className="text-white font-bold text-base">¡Hola {user.displayName}!</p>
                  <p>
                    Te damos la más cordial bienvenida al ecosistema de comercio electrónico y dropshipping más ágil de República Dominicana.
                  </p>
                  
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
                    <p className="font-bold text-purple-300 text-xs uppercase">Datos de tu Plaza Operativa:</p>
                    <p>• <strong>Rol:</strong> {roleTitle}</p>
                    <p>• <strong>Plaza/Plan:</strong> {planName}</p>
                    {user.storeName && <p>• <strong>Nombre Comercial:</strong> {user.storeName}</p>}
                    <p>• <strong>Código de Referido:</strong> <span className="font-mono text-purple-400 font-bold">{referralCode}</span></p>
                  </div>

                  <p>
                    📦 <strong>Logística Nacional:</strong> Todos tus pedidos cuentan con flete fijo nacional de RD$ 350 en las 32 provincias y cobro 100% en efectivo contra entrega (COD).
                  </p>

                  <p>
                    Para cualquier consulta o soporte operativo, puedes comunicarte de inmediato con nuestra mesa de ayuda vía WhatsApp al <strong>809-676-6690</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Cerrar ventana
          </button>

          <button
            onClick={() => {
              onClose();
              if (onNavigateToWorkspace) {
                onNavigateToWorkspace(user.role);
              }
            }}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>
              {user.role === 'partner' 
                ? 'Ir a mi Catálogo de Tienda' 
                : user.role === 'dropshipper' 
                ? 'Ir al Panel de Dropshipping' 
                : 'Ir a Explorar Catálogo'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
