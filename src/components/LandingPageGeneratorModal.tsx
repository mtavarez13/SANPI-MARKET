import React, { useState, useEffect } from 'react';
import { X, Sparkles, Flame, DollarSign, Eye, CheckCircle2, ShieldCheck, Link2, Phone, Zap } from 'lucide-react';
import { Article, LandingPageConfig, Store, UserProfile } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { getCurrentStoredUser, signInWithGoogle } from '../lib/authService';

interface LandingPageGeneratorModalProps {
  onClose: () => void;
  onSuccess: (newLandingPage: LandingPageConfig) => void;
  preselectedArticle?: Article | null;
  currentUserType?: 'merchant' | 'dropshipper';
  currentUserName?: string;
  currentUserEmail?: string;
}

export const LandingPageGeneratorModal: React.FC<LandingPageGeneratorModalProps> = ({
  onClose,
  onSuccess,
  preselectedArticle,
  currentUserType = 'dropshipper',
  currentUserName = 'Dropshipper Sanpi',
  currentUserEmail = 'dropshipper@sanpi.do'
}) => {
  const articles = sanpiManager.articles.filter(a => a.status === 'aprobado');
  const stores = sanpiManager.stores;

  const [authProfile, setAuthProfile] = useState<UserProfile | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentStoredUser();
    if (user) {
      setAuthProfile(user);
    }
  }, []);

  const handleGoogleConnect = async () => {
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.profile) {
        setAuthProfile(res.profile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGoogleLoading(false);
    }
  };

  const effectiveOwnerName = authProfile?.displayName || currentUserName;
  const effectiveOwnerEmail = authProfile?.email || currentUserEmail;
  const effectiveOwnerId = authProfile?.uid || (currentUserType === 'dropshipper' ? 'drop_user' : 'store_user');

  const [selectedArticleId, setSelectedArticleId] = useState<string>(
    preselectedArticle ? preselectedArticle.id : (articles[0]?.id || '')
  );

  const selectedArticle = articles.find(a => a.id === selectedArticleId) || articles[0];
  const wholesaleCost = selectedArticle?.wholesalePrice || Math.round((selectedArticle?.price || 2000) * 0.65);
  const suggestedPrice = selectedArticle?.price || 2500;

  // Form Fields
  const [sellingPrice, setSellingPrice] = useState<number>(suggestedPrice);
  const [comparePrice, setComparePrice] = useState<number>(Math.round(suggestedPrice * 1.4));
  const [headline, setHeadline] = useState<string>(
    selectedArticle ? `${selectedArticle.name} - Edición Exclusiva` : 'Oferta Especial'
  );
  const [subheadline, setSubheadline] = useState<string>(
    selectedArticle?.description || 'Calidad garantizada. Paga en efectivo al recibir en la puerta de tu casa.'
  );
  const [slug, setSlug] = useState<string>(
    selectedArticle ? selectedArticle.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) : 'oferta-especial'
  );
  const [whatsapp, setWhatsapp] = useState<string>('809-555-8822');
  const [timerMinutes, setTimerMinutes] = useState<number>(45);
  const [stock, setStock] = useState<number>(15);

  const [loading, setLoading] = useState(false);

  // When selected article changes, update defaults
  const handleArticleChange = (artId: string) => {
    setSelectedArticleId(artId);
    const art = articles.find(a => a.id === artId);
    if (art) {
      const wCost = art.wholesalePrice || Math.round(art.price * 0.65);
      setSellingPrice(art.price);
      setComparePrice(Math.round(art.price * 1.4));
      setHeadline(`${art.name} - Edición Exclusiva`);
      setSubheadline(art.description);
      setSlug(art.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30));
    }
  };

  const netProfitPerSale = Math.max(0, sellingPrice - wholesaleCost);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle) return;

    setLoading(true);
    try {
      const newLp = await sanpiManager.createLandingPage({
        slug,
        title: headline,
        heroHeadline: headline,
        heroSubheadline: subheadline,
        ownerId: effectiveOwnerId,
        ownerName: effectiveOwnerName,
        ownerEmail: effectiveOwnerEmail,
        ownerType: (currentUserType === 'merchant' ? 'merchant' : 'dropshipper') as 'merchant' | 'dropshipper',
        productId: selectedArticle.id,
        productName: selectedArticle.name,
        productImage: selectedArticle.image,
        galleryImages: selectedArticle.gallery || [selectedArticle.image],
        originalStoreId: selectedArticle.storeId,
        wholesalePrice: wholesaleCost,
        customSellingPrice: sellingPrice,
        profitMargin: netProfitPerSale,
        originalComparePrice: comparePrice,
        urgencyTimerMinutes: timerMinutes,
        stockCount: stock,
        whatsappNumber: whatsapp,
        features: [
          {
            icon: 'Sparkles',
            title: 'Máxima Calidad Certificada',
            desc: 'Materiales premium seleccionados e inspeccionados por Sanpi Marketplace.'
          },
          {
            icon: 'Truck',
            title: 'Flete Nacional Sacha Pack',
            desc: 'Envío rápido a domicilio en toda República Dominicana por RD$ 350.'
          },
          {
            icon: 'ShieldCheck',
            title: 'Pago Contra Entrega (COD)',
            desc: 'Paga con total confianza en efectivo directamente al repartidor.'
          }
        ],
        testimonials: [
          {
            id: `test_${Date.now()}_1`,
            name: 'Carlos M. Santana',
            city: 'Santo Domingo Norte',
            comment: 'Excelente producto y atención rápida por WhatsApp. Llegó al día siguiente.',
            rating: 5,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
            verified: true
          }
        ],
        active: true
      });

      // If dropshipper, also add to dropship items pool
      if (currentUserType === 'dropshipper') {
        await sanpiManager.addDropshipItem({
          dropshipperId: 'drop_user',
          dropshipperName: currentUserName,
          dropshipperEmail: currentUserEmail,
          productId: selectedArticle.id,
          originalStoreId: selectedArticle.storeId,
          wholesalePrice: wholesaleCost,
          customSellingPrice: sellingPrice,
          profitMargin: netProfitPerSale,
          landingPageSlug: newLp.slug,
          status: 'active'
        });
      }

      onSuccess(newLp);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al generar la landing page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl shadow-purple-950/80 my-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Generador de Landing Pages de Alta Conversión
              </h2>
              <p className="text-xs text-purple-300">
                Crea una página de venta individual con Checkout COD integrado y flete fijo RD$ 350
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="space-y-6">

          {/* Google Profile Connection */}
          <div className="p-3 bg-slate-950/80 border border-purple-900/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {authProfile?.photoURL ? (
                <img 
                  src={authProfile.photoURL} 
                  alt={authProfile.displayName || ''} 
                  className="w-8 h-8 rounded-full border border-purple-500" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-700 shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
              )}
              <div>
                <span className="font-bold text-white text-xs block">
                  {authProfile ? `Creador: ${authProfile.displayName}` : 'Atribución de Comisiones'}
                </span>
                <span className="text-[10px] text-purple-300">
                  {authProfile ? authProfile.email : 'Conecta tu cuenta Google para asignar los beneficios directamente a tu billetera'}
                </span>
              </div>
            </div>

            {!authProfile && (
              <button
                type="button"
                disabled={googleLoading}
                onClick={handleGoogleConnect}
                className="w-full sm:w-auto px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 shadow"
              >
                {googleLoading ? 'Conectando...' : 'Vincular Google'}
              </button>
            )}
          </div>
          
          {/* Step 1: Select Product */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              1. Selecciona el Producto del Catálogo Mayorista:
            </label>
            <select
              value={selectedArticleId}
              onChange={(e) => handleArticleChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              {articles.map((art) => (
                <option key={art.id} value={art.id}>
                  {art.name} — Costo Mayorista: RD$ {(art.wholesalePrice || Math.round(art.price * 0.65)).toLocaleString()} | Sugerido: RD$ {art.price.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing & Profit Simulator Widget */}
          <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-300 text-xs font-black uppercase tracking-wider">
                <Flame className="w-4 h-4" />
                <span>Simulador de Ganancia Neta por Venta</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">Pago directo contra entrega</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block">Costo Mayorista Base:</span>
                <span className="text-base font-black text-slate-300">
                  RD$ {wholesaleCost.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-purple-500/40">
                <span className="text-[10px] text-purple-300 font-semibold block">Tu Precio de Venta:</span>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className="text-xs text-slate-400 font-bold">RD$</span>
                  <input
                    type="number"
                    min={wholesaleCost}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-24 bg-slate-900 border border-purple-500 rounded px-2 py-0.5 text-sm font-black text-white text-center focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-emerald-950/70 p-3 rounded-xl border border-emerald-500/50">
                <span className="text-[10px] text-emerald-300 font-semibold block">Tu Ganancia Neta / Venta:</span>
                <span className="text-lg font-black text-emerald-400">
                  + RD$ {netProfitPerSale.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Copywriting & Customization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Titular Principal de Alto Impacto *
              </label>
              <input
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Slug Personalizado de la URL (/lp/...) *
              </label>
              <div className="flex items-center">
                <span className="bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl px-3 py-2.5 text-xs text-purple-300 font-mono">
                  /lp/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-r-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Subtítulo / Propuesta de Valor *
              </label>
              <textarea
                rows={2}
                required
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Precio de Comparación / Antes (Tachado)
              </label>
              <input
                type="number"
                value={comparePrice}
                onChange={(e) => setComparePrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp de Soporte / Cierre Directo
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ej. 809-555-8822"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              {loading ? 'GENERANDO LANDING...' : 'PUBLICAR LANDING PAGE AHORA'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
