import React, { useState } from 'react';
import {
  Video,
  Palette,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  Play,
  Upload,
  Eye,
  Type,
  Sun,
  Moon,
  Layers,
  HelpCircle,
  Link,
  ShieldCheck,
  Zap,
  Check,
  AlertCircle,
  Building2,
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  Copy,
  FileCheck,
  DollarSign
} from 'lucide-react';
import { SiteThemeConfig, PalettePresetId, ContrastMode, BankAccount } from '../types';
import { THEME_PALETTES, PRESET_VIDEO_LIBRARY, DEFAULT_SITE_THEME_CONFIG, DEFAULT_BANK_ACCOUNTS } from '../data/siteThemePresets';
import { sanpiManager } from '../lib/storeManager';
import { speakSanpi } from '../lib/audioTTS';

interface AdminBrandingManagerProps {
  currentConfig: SiteThemeConfig;
  onConfigSaved: (newConfig: SiteThemeConfig) => void;
}

export const AdminBrandingManager: React.FC<AdminBrandingManagerProps> = ({
  currentConfig,
  onConfigSaved
}) => {
  const [formData, setFormData] = useState<SiteThemeConfig>({
    ...DEFAULT_SITE_THEME_CONFIG,
    ...currentConfig,
    bankAccounts: currentConfig.bankAccounts && currentConfig.bankAccounts.length > 0
      ? currentConfig.bankAccounts
      : DEFAULT_BANK_ACCOUNTS
  });

  const [activeTab, setActiveTab] = useState<'video' | 'palette' | 'logo' | 'content' | 'bank_accounts'>('video');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Bank Accounts Management State
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState<Omit<BankAccount, 'id'>>({
    bankName: 'Banco Popular Dominicano',
    accountNumber: '',
    accountType: 'corriente',
    accountHolder: 'SANPI MARKET SRL',
    rncOrCedula: '1-32-88990-1',
    currency: 'DOP',
    isActive: true,
    notes: 'Transferencias directas y depósitos por ventanilla'
  });
  const [isAddingBank, setIsAddingBank] = useState<boolean>(false);
  const [copiedAccountText, setCopiedAccountText] = useState<string | null>(null);

  // Apply a palette preset
  const handleSelectPalette = (paletteId: PalettePresetId) => {
    const found = THEME_PALETTES.find((p) => p.id === paletteId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        palettePreset: paletteId,
        primaryColor: found.primary,
        primaryHoverColor: found.primaryHover,
        secondaryColor: found.secondary,
        accentColor: found.accent,
        contrastMode: paletteId === 'dark_slate' ? 'dark' : 'light'
      }));
    }
  };

  // Handle image file upload for custom logo
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Por favor selecciona un archivo de imagen válido (PNG, SVG, JPG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('La imagen es demasiado pesada (máximo 2 MB recomendado para rendimiento).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        logoUrl: base64Url
      }));
    };
    reader.onerror = () => {
      setLogoUploadError('Error al procesar el archivo de imagen.');
    };
    reader.readAsDataURL(file);
  };

  // Bank Accounts Management Handlers
  const handleStartAddBank = () => {
    setEditingBankId(null);
    setBankForm({
      bankName: 'Banco Popular Dominicano',
      accountNumber: '',
      accountType: 'corriente',
      accountHolder: formData.siteName ? `${formData.siteName} SRL` : 'SANPI MARKET SRL',
      rncOrCedula: '1-32-88990-1',
      currency: 'DOP',
      isActive: true,
      notes: 'Transferencias directas y depósitos por ventanilla'
    });
    setIsAddingBank(true);
  };

  const handleStartEditBank = (bank: BankAccount) => {
    setEditingBankId(bank.id);
    setBankForm({
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountType: bank.accountType,
      accountHolder: bank.accountHolder,
      rncOrCedula: bank.rncOrCedula || '',
      currency: bank.currency || 'DOP',
      isActive: bank.isActive,
      notes: bank.notes || ''
    });
    setIsAddingBank(true);
  };

  const handleSaveBankForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bankName.trim() || !bankForm.accountNumber.trim() || !bankForm.accountHolder.trim()) {
      alert('Por favor completa el nombre del banco, número de cuenta y nombre del titular.');
      return;
    }

    const currentAccounts = formData.bankAccounts && formData.bankAccounts.length > 0
      ? [...formData.bankAccounts]
      : [...DEFAULT_BANK_ACCOUNTS];

    if (editingBankId) {
      // Edit existing
      const updatedAccounts = currentAccounts.map((b) =>
        b.id === editingBankId ? { ...b, ...bankForm, id: b.id } : b
      );
      setFormData((prev) => ({ ...prev, bankAccounts: updatedAccounts }));
    } else {
      // Add new
      const newBank: BankAccount = {
        ...bankForm,
        id: `bank_${Date.now()}`
      };
      setFormData((prev) => ({ ...prev, bankAccounts: [...currentAccounts, newBank] }));
    }

    setIsAddingBank(false);
    setEditingBankId(null);
  };

  const handleDeleteBank = (id: string) => {
    const currentAccounts = formData.bankAccounts || DEFAULT_BANK_ACCOUNTS;
    if (currentAccounts.length <= 1) {
      alert('Debes mantener al menos una cuenta bancaria registrada.');
      return;
    }
    if (confirm('¿Estás seguro de eliminar esta cuenta bancaria?')) {
      const updated = currentAccounts.filter((b) => b.id !== id);
      setFormData((prev) => ({ ...prev, bankAccounts: updated }));
    }
  };

  const handleToggleBankActive = (id: string) => {
    const currentAccounts = formData.bankAccounts || DEFAULT_BANK_ACCOUNTS;
    const updated = currentAccounts.map((b) =>
      b.id === id ? { ...b, isActive: !b.isActive } : b
    );
    setFormData((prev) => ({ ...prev, bankAccounts: updated }));
  };

  const handleCopyAccount = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccountText(text);
    setTimeout(() => setCopiedAccountText(null), 2500);
  };

  // Save all branding settings to Firestore and LocalStorage
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await sanpiManager.updateSiteThemeConfig(formData);
      onConfigSaved(updated);
      setSaveSuccess(true);
      speakSanpi();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert('Error guardando la configuración: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default Sanpi styling
  const handleResetToDefaults = async () => {
    if (confirm('¿Estás seguro de restablecer la apariencia y video a los valores originales de fábrica de Sanpi?')) {
      setIsSaving(true);
      try {
        const reset = await sanpiManager.resetSiteThemeConfig();
        setFormData(reset);
        onConfigSaved(reset);
        alert('Configuración de apariencia restablecida con éxito.');
      } catch (err: any) {
        alert('Error al restablecer: ' + err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Exclusivo Super Admin
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Personalización Global del Sitio
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Diseño, Video de Fondo & Marca
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Modifica el video de fondo del Home, paletas de colores, contraste global, logotipo y textos oficiales con persistencia en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Fábrica</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition-all shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="animate-spin">⏳</span>
            ) : saveSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saveSuccess ? '¡Guardado con Éxito!' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setActiveTab('video')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'video'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>1. Video de Fondo (Home)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('palette')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'palette'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>2. Paletas & Contraste</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'logo'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>3. Logo & Emblema</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'content'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>4. Textos & Anuncios</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank_accounts')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'bank_accounts'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>5. Cuentas Bancarias & Transferencias</span>
          <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full text-[10px] font-black">
            {(formData.bankAccounts || DEFAULT_BANK_ACCOUNTS).length}
          </span>
        </button>
      </div>

      {/* TAB 1: VIDEO DE FONDO */}
      {activeTab === 'video' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
            <div className="space-y-0.5">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-600" />
                Habilitar Video de Fondo en Página Principal
              </h4>
              <p className="text-xs text-slate-500">
                Muestra un video fluido y silencioso en bucle detrás de la sección principal del Home.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.heroVideoEnabled}
                onChange={(e) => setFormData({ ...formData, heroVideoEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Video URL Input & Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Enlace del Video (URL Directa MP4, WebM o YouTube) *</span>
                  <span className="text-[11px] text-purple-600 font-semibold">Soporta enlaces directos y YouTube</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={formData.heroVideoUrl}
                    onChange={(e) => setFormData({ ...formData, heroVideoUrl: e.target.value })}
                    placeholder="https://assets.mixkit.co/.../video.mp4 o https://youtube.com/watch?v=..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                  />
                  <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pega cualquier enlace público a un video .mp4, enlace de CDN o URL de YouTube.
                </p>
              </div>

              {/* Opacity & Blur Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Opacidad del Video</span>
                    <span className="text-purple-600 font-extrabold">{Math.round((formData.heroVideoOpacity ?? 0.35) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={formData.heroVideoOpacity ?? 0.35}
                    onChange={(e) => setFormData({ ...formData, heroVideoOpacity: parseFloat(e.target.value) })}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>5% (Sutil)</span>
                    <span>100% (Intenso)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Desenfoque (Blur)</span>
                    <span className="text-purple-600 font-extrabold">{formData.heroVideoBlur ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={formData.heroVideoBlur ?? 0}
                    onChange={(e) => setFormData({ ...formData, heroVideoBlur: parseInt(e.target.value) })}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0px (Nítido)</span>
                    <span>10px (Difuminado)</span>
                  </div>
                </div>
              </div>

              {/* Overlay Style Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Estilo de Capa de Superposición (Contraste del Texto)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'light', name: 'Claro Elegante', desc: 'Blanco puro & destello' },
                    { id: 'purple_gradient', name: 'Gradiente Morado', desc: 'Identidad Sanpi' },
                    { id: 'dark', name: 'Oscuro Cine', desc: 'Máximo contraste' },
                    { id: 'minimal', name: 'Minimalista', desc: 'Translúcido suave' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, heroVideoOverlayStyle: style.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        formData.heroVideoOverlayStyle === style.id
                          ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs ring-1 ring-purple-600'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{style.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{style.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Video Preview Box */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-600" />
                <span>Vista Previa del Video en Tiempo Real</span>
              </label>
              
              <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center">
                {formData.heroVideoUrl ? (
                  <div className="absolute inset-0 w-full h-full">
                    {formData.heroVideoUrl.includes('youtube') || formData.heroVideoUrl.includes('youtu.be') ? (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs">
                        <span>Video de YouTube configurado: {formData.heroVideoUrl}</span>
                      </div>
                    ) : (
                      <video
                        key={formData.heroVideoUrl}
                        src={formData.heroVideoUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                        style={{
                          opacity: formData.heroVideoOpacity ?? 0.35,
                          filter: formData.heroVideoBlur ? `blur(${formData.heroVideoBlur}px)` : undefined
                        }}
                      />
                    )}
                    <div className={`absolute inset-0 ${
                      formData.heroVideoOverlayStyle === 'dark' ? 'bg-slate-950/70' :
                      formData.heroVideoOverlayStyle === 'purple_gradient' ? 'bg-purple-950/60' :
                      formData.heroVideoOverlayStyle === 'minimal' ? 'bg-white/30' : 'bg-white/70'
                    }`} />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Sin video asignado</span>
                )}

                {/* Simulated Overlay Badge */}
                <div className="relative z-10 text-center p-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-purple-600 text-white text-[11px] font-bold shadow-md">
                    {formData.siteName || 'SANPI'} • {formData.siteTagline || 'MARKET'}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2">
                    {formData.siteSlogan || 'La Magia de comprar Online'}
                  </h3>
                </div>
              </div>
            </div>

          </div>

          {/* Curated Preset Video Library */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Biblioteca de Videos Predefinidos Sanpi & Logística (1-Click)
              </h4>
              <span className="text-[11px] text-slate-400">Selecciona para cargar inmediatamente</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {PRESET_VIDEO_LIBRARY.map((item) => {
                const isSelected = formData.heroVideoUrl === item.url;
                return (
                  <div
                    key={item.id}
                    onClick={() => setFormData({ ...formData, heroVideoUrl: item.url, heroVideoEnabled: true })}
                    className={`group relative rounded-2xl overflow-hidden border p-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-600'
                        : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="relative h-24 rounded-xl overflow-hidden bg-slate-900 mb-2">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-white/90 text-purple-700 flex items-center justify-center shadow-xs">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 bg-purple-600 text-white rounded-full p-1 shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 line-clamp-1">{item.title}</div>
                    <div className="text-[10px] text-purple-600 font-semibold">{item.category}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PALETAS & CONTRASTE */}
      {activeTab === 'palette' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Preset Palettes Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Seleccionar Paleta de Marca Predefinida
              </label>
              <span className="text-[11px] text-purple-600 font-semibold">Afecta botones, destacados y contrastes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {THEME_PALETTES.map((p) => {
                const isSelected = formData.palettePreset === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPalette(p.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/40 shadow-md ring-2 ring-purple-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{p.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg shadow-xs border border-white"
                        style={{ backgroundColor: p.primary }}
                        title={`Color Primario: ${p.primary}`}
                      />
                      <div
                        className="w-7 h-7 rounded-lg shadow-xs border border-white"
                        style={{ backgroundColor: p.secondary }}
                        title={`Color Secundario: ${p.secondary}`}
                      />
                      <div
                        className="w-7 h-7 rounded-lg shadow-xs border border-white"
                        style={{ backgroundColor: p.accent }}
                        title={`Color Acento: ${p.accent}`}
                      />
                      <div className={`h-7 flex-1 rounded-lg bg-gradient-to-r ${p.previewGradient}`} />
                    </div>

                    <p className="text-[11px] text-slate-500 leading-tight">
                      {p.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Hex Color Pickers */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-purple-600" />
              Ajuste Fino de Colores Hexadecimales (Personalizado)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Color Primario (Botones & Títulos)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor || '#7C3AED'}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value, palettePreset: 'custom' })}
                    className="w-9 h-9 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor || '#7C3AED'}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value, palettePreset: 'custom' })}
                    placeholder="#7C3AED"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Color Secundario / Acento</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.secondaryColor || '#4F46E5'}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value, palettePreset: 'custom' })}
                    className="w-9 h-9 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor || '#4F46E5'}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value, palettePreset: 'custom' })}
                    placeholder="#4F46E5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Color de Destello & Estrellas</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accentColor || '#F59E0B'}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value, palettePreset: 'custom' })}
                    className="w-9 h-9 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={formData.accentColor || '#F59E0B'}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value, palettePreset: 'custom' })}
                    placeholder="#F59E0B"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contrast Mode Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Modo de Contraste General de la Plataforma
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'light', name: 'Blanco & Alto Contraste (Predeterminado)', desc: 'Limpio, moderno, fondo blanco nítido', icon: Sun },
                { id: 'dark', name: 'Modo Oscuro Sofisticado', desc: 'Fondo negro grafito y acentos luminosos', icon: Moon },
                { id: 'warm', name: 'Cálido Suave', desc: 'Tonalidad sutil marfil y sombras suaves', icon: Layers },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = formData.contrastMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, contrastMode: mode.id as ContrastMode })}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{mode.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{mode.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: LOGO & EMBLEMA */}
      {activeTab === 'logo' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Upload or URL form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Subir Archivo de Logo (PNG, SVG, JPG, WebP)
                </label>
                <div className="relative border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      Haz clic para seleccionar o arrastra tu imagen aquí
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Formatos recomendados: PNG transparente o SVG (Máx 2 MB)
                    </p>
                  </div>
                </div>
                {logoUploadError && (
                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {logoUploadError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  O Enlace Directo a la Imagen del Logo (URL)
                </label>
                <input
                  type="url"
                  value={formData.logoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://misitio.com/logo.png"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
                />
              </div>

              {/* Logo Height Slider */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Altura del Logo en Barra Superior (Navbar)</span>
                  <span className="text-purple-600 font-extrabold">{formData.logoHeight ?? 40}px</span>
                </div>
                <input
                  type="range"
                  min="28"
                  max="64"
                  step="2"
                  value={formData.logoHeight ?? 40}
                  onChange={(e) => setFormData({ ...formData, logoHeight: parseInt(e.target.value) })}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Button to remove custom logo */}
              {formData.logoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoUrl: '' })}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Quitar logo personalizado y volver al emblema oficial Sanpi</span>
                </button>
              )}
            </div>

            {/* Logo Preview in Navbar Context */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-600" />
                <span>Vista Previa del Logotipo en la Barra de Navegación</span>
              </label>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center min-h-[220px] space-y-4">
                <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        style={{ height: `${formData.logoHeight ?? 40}px` }}
                        className="object-contain max-w-[180px]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs">
                          <span className="text-white font-black text-xl italic tracking-tighter">S</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-lg tracking-tight text-slate-900">
                              {formData.siteName || 'SANPI'}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-slate-200">
                              {formData.siteTagline || 'MARKET'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {formData.siteSlogan || 'La Magia de comprar Online'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                      🛒
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  El logo se adaptará con proporciones óptimas tanto en escritorio como en dispositivos móviles.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: TEXTOS, SLOGAN & ANUNCIOS */}
      {activeTab === 'content' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre de la Plataforma</label>
              <input
                type="text"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                placeholder="SANPI"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Etiqueta de Marca / Tagline</label>
              <input
                type="text"
                value={formData.siteTagline}
                onChange={(e) => setFormData({ ...formData, siteTagline: e.target.value })}
                placeholder="MARKET"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Frase Principal / Slogan del Home (Con animación de Magia)
            </label>
            <input
              type="text"
              value={formData.siteSlogan}
              onChange={(e) => setFormData({ ...formData, siteSlogan: e.target.value })}
              placeholder="La Magia de comprar Online en República Dominicana"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Subtítulo Descriptivo del Hero
            </label>
            <textarea
              rows={2}
              value={formData.siteSubtitle || ''}
              onChange={(e) => setFormData({ ...formData, siteSubtitle: e.target.value })}
              placeholder="Descubre miles de artículos certificados de tiendas oficiales con pago 100% en efectivo..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-normal text-slate-700 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Texto del Banner Superior de Avisos (Top Ticker)
            </label>
            <input
              type="text"
              value={formData.customAnnouncementText || ''}
              onChange={(e) => setFormData({ ...formData, customAnnouncementText: e.target.value })}
              placeholder="🚚 Envíos rápidos en 24-48h a las 32 provincias vía Sacha Pack (Flete Fijo RD$ 350)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* Feature Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Estrellas Mágicas Doradas
                </span>
                <span className="text-[10px] text-slate-400">Efecto en "La Magia"</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showGoldenMagicStars}
                  onChange={(e) => setFormData({ ...formData, showGoldenMagicStars: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-slate-900 block">
                  Banner Superior Activo
                </span>
                <span className="text-[10px] text-slate-400">Avisos y garantías</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showTopAnnouncementBanner}
                  onChange={(e) => setFormData({ ...formData, showTopAnnouncementBanner: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-slate-900 block">
                  Banner Sacha Pack
                </span>
                <span className="text-[10px] text-slate-400">Sección en el Home</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showSachaPackBanner}
                  onChange={(e) => setFormData({ ...formData, showSachaPackBanner: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

          </div>

        </div>
      )}

      {/* TAB 5: CUENTAS BANCARIAS & TRANSFERENCIAS */}
      {activeTab === 'bank_accounts' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Header Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 text-amber-300 text-[11px] font-extrabold mb-1 backdrop-blur-sm border border-white/10">
                  <DollarSign className="w-3.5 h-3.5" />
                  Módulo de Pagos por Transferencia
                </div>
                <h3 className="text-lg font-black text-white">
                  Cuentas Bancarias y Gestión de Pagos
                </h3>
                <p className="text-xs text-purple-200/90 max-w-xl">
                  Administra las cuentas donde los clientes depositan. Si el cliente elige "Transferencia", verá estos datos y <span className="text-amber-300 font-bold">será obligatorio que adjunte la foto del comprobante de transferencia</span> antes de confirmar su orden.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartAddBank}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Nueva Cuenta</span>
              </button>
            </div>
          </div>

          {/* Form Modal / Inline Editor for Bank Account */}
          {isAddingBank && (
            <div className="p-6 rounded-2xl bg-purple-50/70 border-2 border-purple-200 shadow-inner space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-purple-200">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-700" />
                  <h4 className="text-sm font-black text-slate-900">
                    {editingBankId ? 'Editar Cuenta Bancaria' : 'Registrar Nueva Cuenta Bancaria'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsAddingBank(false); setEditingBankId(null); }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSaveBankForm} className="space-y-4">
                {/* Quick Presets for Dominican Banks */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    1. Selecciona un Banco Popular / Institución Financiera:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Banco Popular Dominicano',
                      'Banreservas',
                      'Banco BHD',
                      'Banco Santa Cruz',
                      'Scotiabank',
                      'Banco Promerica',
                      'APAP',
                      'Qik Banco Digital'
                    ].map((presetBank) => (
                      <button
                        key={presetBank}
                        type="button"
                        onClick={() => setBankForm(prev => ({ ...prev, bankName: presetBank }))}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          bankForm.bankName === presetBank
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {presetBank}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nombre del Banco / Entidad *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                      placeholder="Ej: Banco Popular Dominicano"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Número de Cuenta *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      placeholder="Ej: 812-456789-0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nombre del Titular de la Cuenta *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankForm.accountHolder}
                      onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                      placeholder="Ej: SANPI MARKET SRL o Martín Tavárez"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Tipo de Cuenta
                    </label>
                    <select
                      value={bankForm.accountType}
                      onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value as 'corriente' | 'ahorros' })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="corriente">Cuenta Corriente</option>
                      <option value="ahorros">Cuenta de Ahorros</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      RNC o Cédula del Titular (Opcional)
                    </label>
                    <input
                      type="text"
                      value={bankForm.rncOrCedula || ''}
                      onChange={(e) => setBankForm({ ...bankForm, rncOrCedula: e.target.value })}
                      placeholder="Ej: 1-32-88990-1"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Moneda
                    </label>
                    <select
                      value={bankForm.currency || 'DOP'}
                      onChange={(e) => setBankForm({ ...bankForm, currency: e.target.value as 'DOP' | 'USD' })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="DOP">Pesos Dominicanos (RD$ / DOP)</option>
                      <option value="USD">Dólares Estadounidenses (US$ / USD)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Instrucciones / Notas para el Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={bankForm.notes || ''}
                    onChange={(e) => setBankForm({ ...bankForm, notes: e.target.value })}
                    placeholder="Ej: Transferencias ACH y pagos al instante. Enviar comprobante con tu número de orden."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bankForm.isActive}
                      onChange={(e) => setBankForm({ ...bankForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Cuenta activa y visible en el Checkout
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsAddingBank(false); setEditingBankId(null); }}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md cursor-pointer"
                    >
                      {editingBankId ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* List of Configured Bank Accounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-600" />
                Cuentas Bancarias Registradas ({ (formData.bankAccounts || DEFAULT_BANK_ACCOUNTS).length })
              </h4>
              <span className="text-[11px] text-slate-400">
                Los clientes podrán elegir cualquiera de estas cuentas para transferir
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(formData.bankAccounts || DEFAULT_BANK_ACCOUNTS).map((bank) => (
                <div
                  key={bank.id}
                  className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                    bank.isActive
                      ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                      : 'bg-slate-50/70 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full inline-block mb-1">
                          {bank.accountType === 'corriente' ? 'Cta. Corriente' : 'Cta. Ahorros'} • {bank.currency || 'DOP'}
                        </span>
                        <h5 className="text-sm font-black text-slate-900 leading-tight">
                          {bank.bankName}
                        </h5>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleBankActive(bank.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                          bank.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {bank.isActive ? 'Activa' : 'Inactiva'}
                      </button>
                    </div>

                    {/* Account Details */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-semibold">Número de Cuenta:</span>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(bank.accountNumber)}
                          className="text-[10px] font-mono font-black text-slate-900 hover:text-purple-700 flex items-center gap-1 cursor-pointer bg-white px-1.5 py-0.5 rounded border border-slate-200"
                        >
                          <Copy className="w-3 h-3 text-purple-600" />
                          <span>{bank.accountNumber}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Titular:</span>
                        <span className="font-bold text-slate-900">{bank.accountHolder}</span>
                      </div>

                      {bank.rncOrCedula && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">RNC / Cédula:</span>
                          <span className="font-semibold text-slate-700">{bank.rncOrCedula}</span>
                        </div>
                      )}

                      {bank.notes && (
                        <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-100">
                          {bank.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleStartEditBank(bank)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Modificar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBank(bank.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {copiedAccountText && (
              <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 z-50 animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Copiado al portapapeles: {copiedAccountText}</span>
              </div>
            )}
          </div>

          {/* Customer Checkout Flow Simulator Box */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-700" />
              <h4 className="text-xs font-black uppercase text-amber-900 tracking-wide">
                Garantía de Verificación: Comprobante Obligatorio
              </h4>
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              Cuando cualquier comprador o usuario de Landing Page seleccione el método <strong>"Transferencia Bancaria"</strong>, el sistema le exigirá subir la foto del comprobante de transferencia (recibo de banca en línea, foto de depósito o captura de pantalla). La foto queda enlazada al pedido para que tú como Admin puedas auditarla y validarla antes del despacho.
            </p>
          </div>

        </div>
      )}

      {/* Floating / Sticky Save bar when there are unsaved changes */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Los cambios guardados se sincronizan de inmediato para todos los visitantes del marketplace.</span>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition-all shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <span className="animate-spin">⏳</span>
          ) : saveSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saveSuccess ? '¡Guardado con Éxito!' : 'Guardar y Aplicar al Sitio'}</span>
        </button>
      </div>

    </div>
  );
};
