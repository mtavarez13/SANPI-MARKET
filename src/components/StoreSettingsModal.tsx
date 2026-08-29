import React, { useState, useRef } from 'react';
import { Store, UserProfile } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { RD_PROVINCES } from '../data/rdProvinces';
import { updateStoredUserProfile } from '../lib/authService';
import {
  X,
  Store as StoreIcon,
  Upload,
  Link as LinkIcon,
  Check,
  Copy,
  Share2,
  MessageCircle,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Palette,
  MapPin,
  Phone,
  Eye,
  ExternalLink,
  ShieldCheck,
  Save,
  AlertCircle
} from 'lucide-react';

interface StoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store?: Store | null;
  currentUser?: UserProfile | null;
  onSuccess: (updatedStore: Store) => void;
}

// Preset high-definition e-commerce banners
const COVER_PRESETS = [
  {
    name: 'Tecnología & Gadgets',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
    category: 'Tecnología'
  },
  {
    name: 'Fulfillment & Logística Sanpi',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&auto=format&fit=crop&q=80',
    category: 'Logística'
  },
  {
    name: 'Moda & Boutique Caribeña',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80',
    category: 'Moda'
  },
  {
    name: 'Belleza & Cosméticos',
    url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1600&auto=format&fit=crop&q=80',
    category: 'Belleza'
  },
  {
    name: 'Neón Púrpura Sanpi Élite',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
    category: 'Marca'
  },
  {
    name: 'Joyería & Accesorios',
    url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&auto=format&fit=crop&q=80',
    category: 'Joyería'
  },
  {
    name: 'Hogar & Confort',
    url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&auto=format&fit=crop&q=80',
    category: 'Hogar'
  }
];

// Preset brand logo avatars
const LOGO_PRESETS = [
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300&auto=format&fit=crop&q=80'
];

const THEME_COLORS = [
  { name: 'Púrpura Sanpi', primary: '#9333ea', secondary: '#581c87' },
  { name: 'Azul Real', primary: '#2563eb', secondary: '#1e3a8a' },
  { name: 'Esmeralda', primary: '#059669', secondary: '#064e3b' },
  { name: 'Ámbar Dorado', primary: '#d97706', secondary: '#78350f' },
  { name: 'Rojo Carmesí', primary: '#dc2626', secondary: '#7f1d1d' },
  { name: 'Índigo Moderno', primary: '#4f46e5', secondary: '#312e81' },
  { name: 'Negro Medianoche', primary: '#0f172a', secondary: '#020617' }
];

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({
  isOpen,
  onClose,
  store,
  currentUser,
  onSuccess
}) => {
  const [name, setName] = useState(store?.name || currentUser?.storeName || currentUser?.displayName || 'Mi Tienda Sanpi');
  const [slug, setSlug] = useState(store?.slug || (store?.name ? store.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'mitienda'));
  const [description, setDescription] = useState(
    store?.description || `Tienda oficial verificada en Sanpi Market. Envíos contra entrega (COD) a todo el país con Sacha Pack.`
  );
  const [logoUrl, setLogoUrl] = useState(store?.logoUrl || currentUser?.photoURL || LOGO_PRESETS[0]);
  const [bannerUrl, setBannerUrl] = useState(store?.bannerUrl || store?.coverImageUrl || COVER_PRESETS[0].url);
  const [whatsapp, setWhatsapp] = useState(store?.contact?.whatsapp || store?.phone || currentUser?.phone || '8096766690');
  const [phone, setPhone] = useState(store?.contact?.phone || store?.phone || currentUser?.phone || '809-676-6690');
  const [province, setProvince] = useState(store?.province || currentUser?.province || 'Distrito Nacional');
  const [primaryColor, setPrimaryColor] = useState(store?.theme?.primaryColor || '#9333ea');
  const [secondaryColor, setSecondaryColor] = useState(store?.theme?.secondaryColor || '#581c87');

  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Clean slug on change
  const handleSlugChange = (raw: string) => {
    const cleaned = raw.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setSlug(cleaned);
    setErrorMessage(null);
  };

  // Upload custom banner from file
  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBannerUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload custom logo from file
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('El logo no debe superar los 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const getFullPublicUrl = () => {
    const cleanSlug = slug || 'mitienda';
    const baseUrl = window.location.origin;
    return `${baseUrl}/${cleanSlug}`;
  };

  const handleCopyLink = () => {
    const url = getFullPublicUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const url = getFullPublicUrl();
    const text = `¡Hola! Te invito a visitar mi tienda oficial en Sanpi Market: *${name}* 🛒📦\n\nTodos los productos tienen garantía y pago contra entrega (COD) a todo el país:\n👉 ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!cleanSlug) {
      setErrorMessage('Por favor especifica un enlace (slug) para tu tienda.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Por favor coloca el nombre de tu tienda.');
      return;
    }

    // Check if slug is used by another store
    const existingStoreWithSlug = sanpiManager.stores.find(
      (s) => s.slug.toLowerCase() === cleanSlug && s.id !== store?.id
    );

    if (existingStoreWithSlug) {
      setErrorMessage(`El enlace "/${cleanSlug}" ya está siendo utilizado por otra tienda. Por favor elige otro.`);
      return;
    }

    setIsSaving(true);

    try {
      let targetStore: Store;

      if (store) {
        // Update existing store
        const updates: Partial<Store> = {
          name: name.trim(),
          slug: cleanSlug,
          description: description.trim(),
          logoUrl,
          bannerUrl,
          coverImageUrl: bannerUrl,
          province,
          contact: {
            phone: phone.trim(),
            whatsapp: whatsapp.replace(/[^0-9]/g, ''),
            email: store.contact?.email || currentUser?.email || 'contacto@sanpimarket.com'
          },
          phone: phone.trim(),
          theme: {
            primaryColor,
            secondaryColor
          }
        };

        await sanpiManager.updateStore(store.id, updates);
        targetStore = { ...store, ...updates };

        // Update product storeNames if changed
        sanpiManager.articles.forEach((art) => {
          if (art.storeId === store.id) {
            art.storeName = name.trim();
          }
        });
      } else {
        // Create brand new store for user
        const newStoreId = `store_${Date.now()}`;
        const generatedRefCode = `SANPI-${cleanSlug.toUpperCase().slice(0, 10)}`;

        targetStore = {
          id: newStoreId,
          ownerId: currentUser?.uid || `user_${Date.now()}`,
          name: name.trim(),
          slug: cleanSlug,
          description: description.trim(),
          logoUrl,
          bannerUrl,
          coverImageUrl: bannerUrl,
          theme: {
            primaryColor,
            secondaryColor
          },
          contact: {
            phone: phone.trim(),
            whatsapp: whatsapp.replace(/[^0-9]/g, ''),
            email: currentUser?.email || 'contacto@sanpimarket.com'
          },
          phone: phone.trim(),
          province,
          rating: 5.0,
          totalReviews: 1,
          isMarketplace: true,
          marketplaceCommission: 0.10,
          ownerEmail: currentUser?.email || undefined,
          ownerName: currentUser?.displayName || name.trim(),
          status: 'approved',
          isActive: true,
          plan: currentUser?.plan || 'pro',
          referralCode: generatedRefCode,
          referralDiscountPercent: 10,
          referralDiscountStatus: 'activo',
          totalReferredStoresCount: 0,
          totalReferralSavings: 0,
          referralProgramActive: true,
          createdAt: new Date().toISOString()
        };

        await sanpiManager.addStore(targetStore);
      }

      // Update User profile cache
      if (currentUser) {
        updateStoredUserProfile({
          storeName: name.trim()
        });
      }

      onSuccess(targetStore);
      onClose();
    } catch (err: any) {
      console.error('Error saving store settings:', err);
      setErrorMessage(err?.message || 'Error al guardar la información de la tienda.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-purple-800/40 rounded-3xl shadow-2xl overflow-hidden my-auto text-white">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Personalizar Mi Tienda & Portada</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Configura tu enlace público <code className="text-purple-300 font-mono">/{slug || 'sunombre'}</code>, foto de portada, perfil y datos de contacto.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. PUBLIC DIRECT STORE LINK BANNER */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-700/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                Tu Enlace Oficial de Tienda:
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Activo & Compartible
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/90 p-2 rounded-xl border border-purple-900/50">
              <div className="flex-1 font-mono text-xs text-purple-200 px-2 truncate">
                <span className="text-slate-400">{window.location.origin}/</span>
                <span className="font-bold text-white bg-purple-600/30 px-1 py-0.5 rounded">{slug || 'sunombre'}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? '¡Copiado!' : 'Copiar Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Tus clientes accederán directamente a tu tienda con este enlace y podrán ver todos tus productos y comprar contra entrega.
            </p>
          </div>

          {/* 2. STORE NAME & LINK / SLUG CONFIGURATION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200">
                Nombre de la Tienda <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. ElectroTech RD, Moda Dominicana..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200">
                Enlace / Slug personalizado <span className="text-purple-400">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs text-slate-500 font-mono select-none">
                  /
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="sunombre"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-6 pr-3.5 py-2.5 text-sm text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-500 transition-colors"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Solo letras minúsculas, números y guiones. Ej: <code className="text-purple-300">tecnord</code>
              </p>
            </div>
          </div>

          {/* 3. COVER BANNER (FOTO DE PORTADA) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>Foto de Portada / Banner Panorámico</span>
              </label>
              <span className="text-[11px] text-slate-400">Recomendado: 1400x400 px</span>
            </div>

            {/* Banner Live Preview */}
            <div className="relative h-36 sm:h-44 rounded-2xl overflow-hidden border border-purple-900/50 bg-slate-950 group">
              <img
                src={bannerUrl}
                alt="Vista previa de portada"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              
              {/* Overlay preview tag */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                <span className="text-xs font-bold text-white bg-slate-950/80 px-2.5 py-1 rounded-lg border border-purple-800/40 backdrop-blur-sm">
                  Vista Previa de Portada
                </span>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Foto Local</span>
                </button>
              </div>
            </div>

            {/* Hidden Banner File Input */}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerFileUpload}
            />

            {/* Banner URL Input */}
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="O pega aquí la URL de tu imagen de portada..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Banner Presets Carousel */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400">O elige una portada prediseñada de alta calidad:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COVER_PRESETS.map((preset) => (
                  <div
                    key={preset.name}
                    onClick={() => setBannerUrl(preset.url)}
                    className={`relative h-16 rounded-xl overflow-hidden cursor-pointer border transition-all ${
                      bannerUrl === preset.url
                        ? 'border-purple-500 ring-2 ring-purple-500/50 scale-95'
                        : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center p-1 text-center">
                      <span className="text-[10px] font-bold text-white leading-tight">{preset.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. PROFILE PHOTO / LOGO */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-400" />
              <span>Foto de Perfil / Logo de la Tienda</span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div className="relative shrink-0">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500 shadow-xl bg-white"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-purple-600 text-white hover:bg-purple-500 shadow-md"
                  title="Cambiar foto de perfil"
                >
                  <Upload className="w-3 h-3" />
                </button>
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFileUpload}
              />

              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="URL de logo o foto..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shrink-0 border border-slate-700"
                  >
                    Subir Archivo
                  </button>
                </div>

                {/* Logo presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-400">Avatares sugeridos:</span>
                  <div className="flex items-center gap-1.5">
                    {LOGO_PRESETS.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="preset"
                        onClick={() => setLogoUrl(url)}
                        className={`w-7 h-7 rounded-lg object-cover cursor-pointer border transition-transform hover:scale-110 ${
                          logoUrl === url ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-slate-700 opacity-60'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. DESCRIPTION / BIO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200">
              Descripción & Lema de la Tienda
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué productos vendes, tiempos de entrega y garantía para tus clientes..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* 6. CONTACT & LOCATION */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp de Ventas</span>
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="8095551234"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>Teléfono de Contacto</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="809-555-1234"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Provincia en RD</span>
              </label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {RD_PROVINCES.map((prov) => (
                  <option key={prov.id} value={prov.name}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 7. BRAND COLOR SCHEME */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Color de Marca & Botones de tu Tienda</span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {THEME_COLORS.map((thm) => (
                <button
                  key={thm.name}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(thm.primary);
                    setSecondaryColor(thm.secondary);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                    primaryColor === thm.primary
                      ? 'border-white ring-2 ring-purple-500 text-white bg-slate-800'
                      : 'border-slate-800 text-slate-400 hover:text-white bg-slate-950'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-sm"
                    style={{ backgroundColor: thm.primary }}
                  />
                  <span>{thm.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Guardando cambios...' : 'Guardar y Publicar Tienda'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
