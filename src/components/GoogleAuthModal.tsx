import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ArrowRight,
  Store,
  ShoppingBag,
  Truck,
  Crown,
  ChevronRight,
  RefreshCw,
  Phone,
  MapPin,
  Building,
  KeyRound,
  AlertCircle,
  Gift,
  Tag,
  Check
} from 'lucide-react';
import {
  signInWithGoogle,
  signOutGoogle,
  signInWithEmailPassword,
  registerWithEmail,
  updateStoredUserProfile,
  isSuperAdmin
} from '../lib/authService';
import { UserProfile, StorePlan } from '../types';
import { RD_PROVINCES } from '../data/rdProvinces';
import { sanpiManager } from '../lib/storeManager';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
  defaultRole?: 'customer' | 'dropshipper' | 'partner';
  onRoleSelected?: (role: 'customer' | 'dropshipper' | 'partner') => void;
  onRegisteredSuccess?: (user: UserProfile) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  defaultRole = 'dropshipper',
  onRoleSelected,
  onRegisteredSuccess
}) => {
  // Navigation Tabs: 'login' | 'register' | 'profile'
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'profile'>(
    currentUser ? 'profile' : 'login'
  );

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [province, setProvince] = useState(currentUser?.province || 'Distrito Nacional');
  const [storeName, setStoreName] = useState(currentUser?.storeName || '');
  const [selectedPlan, setSelectedPlan] = useState<StorePlan>('pro');
  const [referredByCode, setReferredByCode] = useState('');
  
  // Registration Role Selection: 'partner' | 'dropshipper' | 'customer'
  const [registerRole, setRegisterRole] = useState<'customer' | 'dropshipper' | 'partner'>(defaultRole);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setActiveTab('profile');
      setPhone(currentUser.phone || '');
      setProvince(currentUser.province || 'Distrito Nacional');
      setStoreName(currentUser.storeName || '');
      if (currentUser.role && currentUser.role !== 'admin') {
        setRegisterRole(currentUser.role);
      }
      if (currentUser.plan) {
        setSelectedPlan(currentUser.plan);
      }
    } else {
      setActiveTab('login');
      setRegisterRole(defaultRole);
    }
  }, [currentUser, defaultRole, isOpen]);

  if (!isOpen) return null;

  // --- HANDLERS ---
  const handleGoogleAuth = async (isRegistrationFlow: boolean = false) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await signInWithGoogle(
        isRegistrationFlow
          ? {
              role: registerRole,
              plan: registerRole === 'partner' ? selectedPlan : undefined,
              storeName: registerRole === 'partner' ? storeName.trim() : undefined,
              phone: phone.trim(),
              province,
              referredByCode: referredByCode.trim()
            }
          : undefined
      );

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.profile) {
        const isUserAdmin = isSuperAdmin(result.profile.email);
        const detectedRole = isUserAdmin ? 'admin' : (result.profile.role || 'customer');
        onUserChange(result.profile);
        
        if (onRoleSelected && detectedRole !== 'admin') {
          onRoleSelected(detectedRole as 'customer' | 'dropshipper' | 'partner');
        }
        
        const roleLabel = detectedRole === 'admin' 
          ? 'Super Administrador' 
          : detectedRole === 'partner' 
          ? 'Tienda / Socio Mayorista' 
          : detectedRole === 'dropshipper' 
          ? 'Dropshipper Pro' 
          : 'Comprador';

        setSuccessMessage(`¡Bienvenido! Acceso verificado como: ${roleLabel}`);
        
        if (isRegistrationFlow || result.isNewUser) {
          if (onRegisteredSuccess) {
            onRegisteredSuccess(result.profile);
          }
        }

        setTimeout(() => onClose(), 600);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const res = await signInWithEmailPassword(email, password);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    if (res.profile) {
      const isUserAdmin = isSuperAdmin(res.profile.email);
      const detectedRole = isUserAdmin ? 'admin' : (res.profile.role || 'customer');
      
      onUserChange(res.profile);
      if (onRoleSelected && detectedRole !== 'admin') {
        onRoleSelected(detectedRole as 'customer' | 'dropshipper' | 'partner');
      }

      const roleLabel = detectedRole === 'admin' 
        ? 'Super Administrador' 
        : detectedRole === 'partner' 
        ? 'Tienda / Socio Mayorista' 
        : detectedRole === 'dropshipper' 
        ? 'Dropshipper Pro' 
        : 'Comprador';

      setSuccessMessage(`¡Bienvenido a Sanpi Market! Perfil identificado como ${roleLabel}`);
      setTimeout(() => onClose(), 600);
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (registerRole === 'partner' && !storeName.trim()) {
      setError('Por favor especifica el nombre comercial de tu tienda mayorista.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const res = await registerWithEmail({
      name: fullName,
      email,
      password,
      role: registerRole,
      plan: registerRole === 'partner' ? selectedPlan : undefined,
      phone,
      province,
      storeName: registerRole === 'partner' ? storeName : undefined,
      referredByCode: referredByCode.trim() || undefined
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    if (res.profile) {
      onUserChange(res.profile);
      if (onRoleSelected) onRoleSelected(registerRole);
      
      setSuccessMessage('¡Cuenta creada exitosamente! Enviando correo de bienvenida...');
      
      if (onRegisteredSuccess) {
        onRegisteredSuccess(res.profile);
      }
      
      setTimeout(() => onClose(), 600);
    }
    setLoading(false);
  };

  const handleSaveProfile = () => {
    if (!currentUser) return;
    const isUserAdmin = isSuperAdmin(currentUser.email);
    const updated = updateStoredUserProfile({
      role: isUserAdmin ? 'admin' : currentUser.role,
      phone,
      province,
      storeName: currentUser.role === 'partner' ? storeName : undefined
    });
    onUserChange(updated);
    setSuccessMessage('Perfil actualizado exitosamente');
    setTimeout(() => onClose(), 400);
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOutGoogle();
    onUserChange(null);
    setLoading(false);
    onClose();
  };

  const superAdmin = isSuperAdmin(currentUser?.email);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-[2.5rem] max-w-xl w-full overflow-hidden shadow-2xl border border-purple-900/40 relative my-auto">
        
        {/* TOP BRAND HEADER (Sanpi Purple Theme) */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 border-b border-purple-900/30 relative">
          <div className="flex items-center justify-between">
            
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 border border-purple-400/30">
                <span className="font-black text-xl italic tracking-tighter">S</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    SANPI MARKET
                  </h2>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-extrabold uppercase border border-purple-400/30">
                    RD
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  E-commerce, Tiendas Mayoristas & Dropshipping COD República Dominicana
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Value Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-purple-900/30 text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-purple-900/40">
              <Truck className="w-3.5 h-3.5 text-purple-400" /> Flete Fijo RD$ 350
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-purple-900/40">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Pago Contra Entrega (COD)
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-purple-900/40">
              <Gift className="w-3.5 h-3.5 text-amber-400" /> Programa de Referidos
            </span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2">
          {!currentUser ? (
            <>
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setError(null); }}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'login'
                    ? 'border-purple-500 text-white bg-slate-900/80 rounded-t-xl shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-purple-300'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                Iniciar Sesión
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(null); }}
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'register'
                    ? 'border-purple-500 text-white bg-slate-900/80 rounded-t-xl shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-purple-300'
                }`}
              >
                <User className="w-3.5 h-3.5 text-purple-400" />
                Crear Cuenta (Registro)
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { setActiveTab('profile'); setError(null); }}
              className="flex-1 py-3 text-xs font-bold border-b-2 border-purple-500 text-white bg-slate-900/80 rounded-t-xl flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              Mi Perfil Sanpi
            </button>
          )}
        </div>

        {/* BODY CONTENT */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Alerts */}
          {error && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-purple-950/60 border border-purple-800/80 rounded-2xl text-purple-200 text-xs flex items-start gap-2 animate-in fade-in shadow-inner">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1 font-semibold">{successMessage}</div>
            </div>
          )}

          {/* TAB 1: INICIAR SESIÓN */}
          {activeTab === 'login' && (
            <div className="space-y-5">
              
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-white">Ingresa a tu cuenta de Sanpi</h3>
                <p className="text-xs text-slate-400">
                  Accede a tu panel como Comprador, Dropshipper o Tienda Mayorista.
                </p>
              </div>

              {/* Google 1-Click Access Button */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleGoogleAuth(false)}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-extrabold py-3.5 px-4 rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-50 border border-slate-200 group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{loading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
              </button>

              {/* OR Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  o ingresa con tu correo
                </span>
                <div className="border-t border-slate-800 w-full" />
              </div>

              {/* Form Email & Password */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Correo Electrónico:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tunombre@ejemplo.com"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Contraseña:
                    </label>
                    <span className="text-[10px] text-purple-400/80">
                      (Acceso seguro)
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-slate-600 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-[0.98] disabled:opacity-50 border border-purple-400/30"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Iniciar Sesión en Sanpi</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick switch to register */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  ¿Aún no tienes cuenta en Sanpi?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-purple-400 hover:text-purple-300 hover:underline font-bold"
                  >
                    Crear cuenta y elegir plaza
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: CREAR CUENTA NUEVA (PREGUNTA CÓMO DESEA OPERAR: TIENDA O DROPSHIPPER) */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* PRIMARY QUESTION: ¿CÓMO DESEAS OPERAR? */}
              <div className="space-y-2 bg-slate-950/70 p-4 rounded-2xl border border-purple-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <label className="text-xs sm:text-sm font-black text-white tracking-tight">
                    ¿Cómo deseas operar en Sanpi Market?
                  </label>
                </div>
                <p className="text-[11px] text-slate-400">
                  Selecciona tu plaza para configurar tu cuenta, comisiones y generar tu código de referido.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  
                  {/* TIENDA MAYORISTA */}
                  <div
                    onClick={() => setRegisterRole('partner')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative ${
                      registerRole === 'partner'
                        ? 'border-purple-500 bg-purple-950/60 shadow-lg ring-1 ring-purple-500'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-purple-400" />
                        <span className="font-black text-xs text-white">Tienda Mayorista</span>
                      </div>
                      {registerRole === 'partner' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      Publicar inventario, catálogo mayorista y despachos en RD.
                    </p>
                  </div>

                  {/* DROPSHIPPER */}
                  <div
                    onClick={() => setRegisterRole('dropshipper')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative ${
                      registerRole === 'dropshipper'
                        ? 'border-purple-500 bg-purple-950/60 shadow-lg ring-1 ring-purple-500'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="font-black text-xs text-white">Dropshipper Pro</span>
                      </div>
                      {registerRole === 'dropshipper' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      Vender sin stock, Landing Pages con IA y cobro COD.
                    </p>
                  </div>

                  {/* COMPRADOR */}
                  <div
                    onClick={() => setRegisterRole('customer')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative ${
                      registerRole === 'customer'
                        ? 'border-purple-500 bg-purple-950/60 shadow-lg ring-1 ring-purple-500'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-emerald-400" />
                        <span className="font-black text-xs text-white">Comprador</span>
                      </div>
                      {registerRole === 'customer' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      Comprar con pago contra entrega en efectivo.
                    </p>
                  </div>

                </div>
              </div>

              {/* IF PARTNER: PLAZA / PLAN SELECTOR & STORE NAME */}
              {registerRole === 'partner' && (
                <div className="space-y-3 p-4 bg-purple-950/30 rounded-2xl border border-purple-800/40 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-purple-200">
                    Plaza de Membresía para tu Tienda Mayorista:
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('basic')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedPlan === 'basic'
                          ? 'border-purple-400 bg-purple-900/50 text-white ring-1 ring-purple-400'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">Básico</div>
                      <div className="text-[11px] font-black text-purple-300">RD$ 600/mes</div>
                      <div className="text-[10px] text-slate-400">15% comisión</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPlan('pro')}
                      className={`p-2.5 rounded-xl border text-left transition-all relative ${
                        selectedPlan === 'pro'
                          ? 'border-purple-400 bg-purple-900/50 text-white ring-1 ring-purple-400'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="absolute -top-2 right-2 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">Top</span>
                      <div className="font-bold text-xs text-white">Pro (Recomendado)</div>
                      <div className="text-[11px] font-black text-purple-300">RD$ 1,500/mes</div>
                      <div className="text-[10px] text-slate-400">10% comisión</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPlan('full')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedPlan === 'full'
                          ? 'border-purple-400 bg-purple-900/50 text-white ring-1 ring-purple-400'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">Full Mayorista</div>
                      <div className="text-[11px] font-black text-purple-300">RD$ 2,000/mes</div>
                      <div className="text-[10px] text-slate-400">8% comisión</div>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-300 mb-1">
                      Nombre Comercial de la Tienda Mayorista:
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="Ej: Distribuidora Nacional Dominicana SRL"
                        className="w-full bg-slate-950 border border-purple-800/80 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-semibold"
                        required={registerRole === 'partner'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre Completo / Titular:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: Lic. Juan Pérez"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
                    required
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Correo Electrónico (Para Bienvenida):
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    WhatsApp / Teléfono:
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="809-555-0123"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Province & Referral Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Provincia (32 Provincias de RD):
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
                    >
                      {RD_PROVINCES.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Código Referido (Opcional):</span>
                    <span className="text-[10px] text-purple-400">🎁 Descuento</span>
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={referredByCode}
                      onChange={(e) => setReferredByCode(e.target.value.toUpperCase())}
                      placeholder="Ej: SANPI-DS-CARLOS82"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Submit registration buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-[0.98] disabled:opacity-50 border border-purple-400/30"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Registrarme como {registerRole === 'partner' ? 'Tienda Mayorista' : registerRole === 'dropshipper' ? 'Dropshipper Pro' : 'Comprador'}
                      </span>
                    </>
                  )}
                </button>

                {/* Google 1-click alternative for registration */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleGoogleAuth(true)}
                  className="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-slate-800"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Registrarme con Google en esta plaza</span>
                </button>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-400">
                  ¿Ya tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-purple-400 hover:text-purple-300 hover:underline font-bold"
                  >
                    Iniciar Sesión
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* TAB 3: MI PERFIL SANPI & AJUSTES */}
          {activeTab === 'profile' && currentUser && (
            <div className="space-y-5">
              
              {/* User Hero Banner */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-purple-900/30 flex items-center gap-4">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Usuario'}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                      {currentUser.displayName}
                    </h3>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      superAdmin
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                        : currentUser.role === 'partner'
                        ? 'bg-purple-400/20 text-purple-300 border-purple-400/30'
                        : currentUser.role === 'dropshipper'
                        ? 'bg-indigo-400/20 text-indigo-300 border-indigo-400/30'
                        : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                    }`}>
                      {superAdmin
                        ? 'Super Admin General'
                        : currentUser.role === 'partner'
                        ? 'Socio Tienda Mayorista'
                        : currentUser.role === 'dropshipper'
                        ? 'Dropshipper Pro RD'
                        : 'Comprador Verificado'}
                    </span>
                    {superAdmin && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                </div>
              </div>

              {/* Referral Code Quick View Card */}
              <div className="p-3.5 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 rounded-2xl border border-purple-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                    Tu Código de Referido Sanpi
                  </span>
                  <span className="text-sm font-black text-white font-mono">
                    {currentUser.referralCode || 'SANPI-SOCIO'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onRegisteredSuccess) onRegisteredSuccess(currentUser);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow"
                >
                  Ver Bienvenida & Código
                </button>
              </div>

              {/* Editable Profile Information */}
              <div className="space-y-3.5 pt-1">
                
                {/* Commercial Name if partner */}
                {currentUser.role === 'partner' && (
                  <div>
                    <label className="block text-xs font-bold text-purple-300 mb-1">
                      Nombre Comercial de la Tienda:
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Ej: ElectroShop Dominicana"
                      className="w-full bg-slate-950 border border-purple-800/80 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                )}

                {/* Phone & Province */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Teléfono / WhatsApp de Contacto:
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="809-555-0123"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Provincia Operativa:
                    </label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    >
                      {RD_PROVINCES.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Cambios de Perfil</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-4 py-3.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 rounded-xl text-xs font-bold transition-all border border-rose-900/50 flex items-center justify-center gap-1.5"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER SECURITY PROOF */}
        <div className="bg-slate-950 px-6 py-3 border-t border-purple-900/20 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            Conexión Encriptada SSL 256-bit
          </span>
          <span>Sanpi Market Dominicana © 2026</span>
        </div>

      </div>
    </div>
  );
};
