import React, { useState, useEffect } from 'react';
import { RD_PROVINCES } from '../data/rdProvinces';
import { StorePlan, UserProfile, Store } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { signInWithGoogle, getCurrentStoredUser, generateUserReferralCode } from '../lib/authService';
import { sendWelcomeEmail } from '../lib/emailService';
import { X, CheckCircle2, Store as StoreIcon, Sparkles, Building, ShieldCheck, Tag, Percent, ArrowRight, Mail, Gift } from 'lucide-react';

interface PartnerRegistrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialPlan?: StorePlan;
}

export const PartnerRegistrationModal: React.FC<PartnerRegistrationModalProps> = ({ onClose, onSuccess, initialPlan = 'pro' }) => {
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('Distrito Nacional');
  const [plan, setPlan] = useState<StorePlan>(initialPlan);
  const [referralCode, setReferralCode] = useState('');
  const [validatedReferrer, setValidatedReferrer] = useState<Store | null>(null);
  const [referralFeedback, setReferralFeedback] = useState<{ message: string; type: 'success' | 'error' | 'idle' }>({ message: '', type: 'idle' });
  const [submitted, setSubmitted] = useState(false);
  const [googleUser, setGoogleUser] = useState<UserProfile | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentStoredUser();
    if (user) {
      setGoogleUser(user);
      if (user.displayName) setOwnerName(user.displayName);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
      if (user.province) setProvince(user.province);
      if (user.storeName) setStoreName(user.storeName);
    }
  }, []);

  const handleValidateReferralCode = (code: string) => {
    setReferralCode(code);
    if (!code.trim()) {
      setValidatedReferrer(null);
      setReferralFeedback({ message: '', type: 'idle' });
      return;
    }

    const found = sanpiManager.findStoreByReferralCode(code);
    if (found) {
      const discount = found.referralDiscountPercent || 10;
      setValidatedReferrer(found);
      setReferralFeedback({
        message: `¡Código válido! Referido por: "${found.name}". Aplicarás para un ${discount}% de descuento en tu cuota y beneficios especiales de socio.`,
        type: 'success'
      });
    } else {
      setValidatedReferrer(null);
      setReferralFeedback({
        message: 'Código de referido no encontrado o inactivo. Puedes continuar el registro normalmente.',
        type: 'error'
      });
    }
  };

  const handleGoogleAutoFill = async () => {
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.profile) {
        setGoogleUser(res.profile);
        if (res.profile.displayName) setOwnerName(res.profile.displayName);
        if (res.profile.email) setEmail(res.profile.email);
        if (res.profile.phone) setPhone(res.profile.phone);
        if (res.profile.province) setProvince(res.profile.province);
        if (res.profile.storeName) setStoreName(res.profile.storeName);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !ownerName || !email || !phone) return;

    const discountRate = validatedReferrer?.referralDiscountPercent || (referralCode ? 10 : 0);
    const assignedReferralCode = generateUserReferralCode('partner', ownerName, email, storeName);

    await sanpiManager.addSubscriptionRequest({
      storeName,
      ownerName,
      email,
      phone,
      province,
      plan,
      referralCodeUsed: referralCode.trim() || undefined,
      referredByStoreId: validatedReferrer?.id,
      referralDiscountPercent: discountRate
    });

    // Send welcome email with assigned referral code and selected plan
    try {
      await sendWelcomeEmail({
        name: ownerName,
        email,
        role: 'partner',
        plan,
        storeName,
        referralCode: assignedReferralCode,
        referredByCode: referralCode.trim() || undefined
      });
    } catch (err) {
      console.warn('Could not dispatch partner welcome email:', err);
    }

    setSubmitted(true);
    onSuccess();
  };

  const activePlans = sanpiManager.getPlans(true);
  const currentPlanObj = sanpiManager.getPlanById(plan) || activePlans[0];
  const currentBaseFee = sanpiManager.getPlanFee(plan);
  const currentDiscountRate = validatedReferrer?.referralDiscountPercent || 0;
  const discountedFee = currentDiscountRate > 0 ? Math.round(currentBaseFee * (1 - currentDiscountRate / 100)) : currentBaseFee;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 relative my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 text-white p-6 sm:p-8 flex items-center justify-between border-b border-purple-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-yellow-300 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">Solicitud de Socio Sanpi Marketplace</h2>
              <p className="text-xs text-purple-200">Únete a la red nacional de Dropshipping, e-commerce COD y programa de referidos</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {submitted ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">¡Solicitud y Plaza Registrada!</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Tu registro para la tienda <strong>{storeName}</strong> en plan <strong>{(plan || 'pro').toUpperCase()}</strong> ha sido ingresado al sistema de socios.
                {validatedReferrer && (
                  <span className="block mt-2 font-semibold text-emerald-600">
                    ✓ Descuento de referido del {validatedReferrer.referralDiscountPercent || 10}% registrado por recomendación de {validatedReferrer.name}.
                  </span>
                )}
              </p>
              
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl max-w-md mx-auto text-left text-xs text-purple-900 flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Correo de Bienvenida enviado a: {email}</span>
                  <span className="text-[11px] text-purple-700">Incluye los detalles de tu plaza {(plan || 'pro').toUpperCase()} y tu código de referido para ganar comisiones y descuentos.</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="bg-purple-600 text-white font-bold px-6 py-3 rounded-2xl text-xs hover:bg-purple-700 transition-colors cursor-pointer shadow-lg shadow-purple-600/30"
              >
                Continuar a Sanpi Market
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Google Fast Autofill Banner */}
              <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200 shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      {googleUser ? `Vinculado con ${googleUser.displayName}` : '¿Tienes cuenta Google?'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {googleUser ? googleUser.email : 'Autocompleta tus datos de socio y valida tu correo al instante'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogleAutoFill}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-300 shadow-sm text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {googleLoading ? 'Conectando...' : googleUser ? 'Actualizar con Google' : 'Autocompletar con Google'}
                </button>
              </div>

              {/* Plan Selection Cards */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Selecciona tu Plan de Socio *</label>
                <div className={`grid gap-3 ${activePlans.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                  {activePlans.map((p) => {
                    const hasDiscount = currentDiscountRate > 0;
                    const finalFee = hasDiscount ? Math.round(p.monthlyFee * (1 - currentDiscountRate / 100)) : p.monthlyFee;
                    const isSelected = plan === p.id || (plan === 'elite' && p.id === 'full');
                    return (
                      <div
                        key={p.id}
                        onClick={() => setPlan(p.id as StorePlan)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all text-center space-y-1 relative ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        {p.badge && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-sm">
                            {p.badge}
                          </span>
                        )}
                        <span className="font-extrabold block text-xs">{p.name}</span>
                        {hasDiscount ? (
                          <div>
                            <span className="text-[10px] text-slate-400 line-through mr-1 font-medium">RD$ {p.monthlyFee.toLocaleString()}/mes</span>
                            <span className="text-[11px] text-emerald-600 font-black block">RD$ {finalFee.toLocaleString()}/mes</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-purple-700 font-bold block">RD$ {p.monthlyFee.toLocaleString()}/mes</span>
                        )}
                        <span className="text-[10px] text-slate-500 font-medium">{p.commissionPercent}% Comisión</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre Comercial de la Tienda *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: ElectroRD Santo Domingo"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre del Propietario / Socio *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Roberto Santana"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    placeholder="socio@tienda.do"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono Móvil / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="809-555-0123"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Provincia de Operación *</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                >
                  {RD_PROVINCES.map((prov) => (
                    <option key={prov.id} value={prov.name}>{prov.name}</option>
                  ))}
                </select>
              </div>

              {/* Referral Code Field */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    <span>¿Fuiste referido por otra tienda socia? (Opcional)</span>
                  </label>
                  <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                    Programa de Referidos
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: SANPI-CARIBBEAN o SANPI-DROPSHIP"
                    value={referralCode}
                    onChange={(e) => handleValidateReferralCode(e.target.value)}
                    className="flex-1 uppercase tracking-wider bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                  />
                </div>

                {referralFeedback.message && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                    referralFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {referralFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Percent className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="leading-snug">
                      <span className="font-semibold">{referralFeedback.message}</span>
                      {validatedReferrer && (
                        <span className="block mt-1 font-bold text-emerald-700">
                          Total con descuento: RD$ {discountedFee.toLocaleString()}/mes (Ahorras RD$ {(currentBaseFee - discountedFee).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black py-4 rounded-2xl text-xs transition-all shadow-xl shadow-purple-600/30 cursor-pointer"
              >
                Enviar Solicitud de Socio a Sanpi {validatedReferrer ? `(Con ${validatedReferrer.referralDiscountPercent || 10}% OFF)` : ''}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

