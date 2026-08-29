import React, { useState } from 'react';
import {
  Package,
  DollarSign,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Eye,
  ShoppingBag,
  Share2,
  Zap,
  Flame,
  CheckCircle2,
  Copy,
  PlusCircle,
  Truck,
  BarChart3,
  Layers,
  ArrowUpRight,
  Store as StoreIcon,
  Edit3,
  Link as LinkIcon,
  Check,
  MessageCircle,
  Camera
} from 'lucide-react';
import { Article, LandingPageConfig, Store, Delivery, UserProfile } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { copyToClipboardSafe } from '../lib/clipboard';
import { StoreSettingsModal } from './StoreSettingsModal';

interface DropshipperHubProps {
  articles: Article[];
  stores: Store[];
  landingPages: LandingPageConfig[];
  deliveries: Delivery[];
  onOpenGenerator: (article?: Article) => void;
  onViewLandingPage: (slug: string) => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
  onNavigateToStore?: (slug: string) => void;
}

export const DropshipperHub: React.FC<DropshipperHubProps> = ({
  articles,
  stores,
  landingPages,
  deliveries,
  onOpenGenerator,
  onViewLandingPage,
  currentUser,
  onOpenAuthModal,
  onNavigateToStore
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'my_pages' | 'my_store' | 'payouts'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [copiedStoreLink, setCopiedStoreLink] = useState(false);
  const [storeSettingsOpen, setStoreSettingsOpen] = useState(false);

  // User's own store
  const userStore = stores.find(
    (s) =>
      (currentUser?.uid && s.ownerId === currentUser.uid) ||
      (currentUser?.email && s.ownerEmail?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.storeName && s.name.toLowerCase() === currentUser.storeName.toLowerCase())
  );

  // Filter dropshipping pool articles
  const dropshipArticles = articles.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || a.category === selectedCategory;
    return matchesSearch && matchesCat && a.status === 'aprobado';
  });

  const categories = ['all', ...Array.from(new Set(articles.map(a => a.category)))];

  // Calculate statistics for the dropshipper view
  const activeLps = landingPages.filter(lp => lp.active);
  const totalViews = activeLps.reduce((acc, lp) => acc + (lp.views || 0), 0);
  const totalOrders = deliveries.filter(d => d.sourceType === 'landing_page' || d.dropshipperId);
  const totalProfitCalculated = totalOrders.reduce((acc, d) => acc + (d.dropshipperProfit || 0), 0);
  const deliveredOrders = totalOrders.filter(d => d.status === 'entregado');
  const paidProfits = deliveredOrders.reduce((acc, d) => acc + (d.dropshipperProfit || 0), 0);
  const pendingProfits = totalProfitCalculated - paidProfits;

  const handleCopyLink = async (slug: string) => {
    const url = `${window.location.origin}/?lp=${slug}`;
    await copyToClipboardSafe(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 3000);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner Hero */}
      <div className="relative rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-800/40 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 border border-purple-400/30 px-3 py-1 rounded-full text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Pool Mayorista & Generador de Landing Pages RD</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Centro de Dropshipping & Revendedores
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Selecciona productos con precio mayorista garantizado, define tu propio margen de ganancia y genera una <strong>Landing Page de Alta Conversión</strong> en 30 segundos con flete nacional fijo (RD$ 350) y cobro COD contra entrega.
            </p>
          </div>

          <button
            onClick={() => onOpenGenerator()}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-600/30 flex items-center gap-2 transform hover:scale-105 transition-all cursor-pointer flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-yellow-300" />
            + Crear Nueva Landing Page
          </button>
        </div>

        {/* Real-time KPI Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-purple-900/40">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-semibold block">Landing Pages Activas</span>
            <span className="text-xl font-black text-white">{activeLps.length}</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-semibold block">Visitas Acumuladas</span>
            <span className="text-xl font-black text-purple-400">{totalViews.toLocaleString()}</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-semibold block">Órdenes Generadas</span>
            <span className="text-xl font-black text-yellow-400">{totalOrders.length}</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-emerald-900/40">
            <span className="text-[11px] text-emerald-400 font-semibold block">Ganancias Totales</span>
            <span className="text-xl font-black text-emerald-400">RD$ {totalProfitCalculated.toLocaleString()}</span>
          </div>
        </div>

        {/* Google Authentication & Wallet Link Row */}
        <div className="mt-6 pt-4 border-t border-purple-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 bg-purple-950/40 p-4 rounded-2xl border border-purple-800/30">
          <div className="flex items-center gap-3">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || ''}
                className="w-10 h-10 rounded-full border-2 border-yellow-400 shadow"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {currentUser ? `Billetera Dropshipper: ${currentUser.displayName}` : 'Billetera Dropshipper no vinculada'}
                </span>
                {currentUser && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-purple-200">
                {currentUser 
                  ? `Cuenta Google: ${currentUser.email} • Tus ventas COD se asignan a tu cuenta.` 
                  : 'Inicia sesión con Google para asociar tus landing pages y gestionar retiros de comisiones.'}
              </p>
            </div>
          </div>

          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 border border-purple-400/40"
            >
              {currentUser ? 'Gestionar Cuenta Google' : 'Acceder / Vincular Google'}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'catalog'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Catálogo Mayorista ({dropshipArticles.length})
        </button>

        <button
          onClick={() => setActiveTab('my_pages')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'my_pages'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Mis Landing Pages ({landingPages.length})
        </button>

        <button
          onClick={() => setActiveTab('my_store')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'my_store'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <StoreIcon className="w-4 h-4" />
          <span>Mi Tienda & Link {userStore ? `(/${userStore.slug})` : '(/sunombre)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'payouts'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Liquidación de Ganancias COD
        </button>
      </div>

      {/* TAB 1: WHOLESALE CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat === 'all' ? 'Todos los Productos' : cat}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Filtrar por nombre o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {dropshipArticles.map((art) => {
              const wholesalePrice = art.wholesalePrice || Math.round(art.price * 0.65);
              const retailPrice = art.price;
              const estimatedProfit = retailPrice - wholesalePrice;
              const profitPercent = Math.round((estimatedProfit / wholesalePrice) * 100);

              return (
                <div
                  key={art.id}
                  className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-3xl overflow-hidden transition-all duration-300 shadow-xl flex flex-col justify-between group"
                >
                  <div>
                    {/* Image & Badges */}
                    <div className="relative h-52 overflow-hidden bg-slate-950">
                      <img
                        src={art.image}
                        alt={art.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-purple-600/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg border border-purple-400/30">
                        POOL MAYORISTA
                      </div>
                      <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow">
                        +{profitPercent}% MARGEN
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                        {art.category} • {art.storeName}
                      </span>
                      <h3 className="font-extrabold text-white text-base leading-snug line-clamp-2">
                        {art.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {art.description}
                      </p>

                      {/* Profit Breakdown Matrix */}
                      <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">Costo Base</span>
                          <span className="font-bold text-slate-300">RD$ {wholesalePrice.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">PVP Sugerido</span>
                          <span className="font-bold text-slate-300">RD$ {retailPrice.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-400 font-semibold block">Tu Ganancia</span>
                          <span className="font-extrabold text-emerald-400">+RD$ {estimatedProfit.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-5 pt-0">
                    <button
                      onClick={() => onOpenGenerator(art)}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      Crear Landing Page de este Producto
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 2: MY ACTIVE LANDING PAGES */}
      {activeTab === 'my_pages' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
            {landingPages.map((lp) => {
              const ordersForLp = deliveries.filter(d => d.landingPageSlug === lp.slug);
              const totalLpProfits = ordersForLp.reduce((acc, d) => acc + (d.dropshipperProfit || lp.profitMargin || 0), 0);

              return (
                <div
                  key={lp.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                        /lp/{lp.slug}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Activa
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={lp.productImage}
                        alt={lp.title}
                        className="w-14 h-14 rounded-2xl object-cover bg-slate-950 flex-shrink-0 border border-slate-800"
                      />
                      <div>
                        <h4 className="font-bold text-white text-sm line-clamp-1">{lp.title}</h4>
                        <p className="text-xs text-slate-400">{lp.ownerName}</p>
                        <p className="text-xs font-black text-emerald-400 mt-0.5">
                          RD$ {lp.customSellingPrice.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">(Margen: +RD$ {lp.profitMargin?.toLocaleString()})</span>
                        </p>
                      </div>
                    </div>

                    {/* Stats Ribbon */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block">Visitas</span>
                        <span className="font-bold text-purple-300">{lp.views || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block">Pedidos</span>
                        <span className="font-bold text-yellow-400">{lp.ordersCount || ordersForLp.length}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400 font-semibold block">Ganancia</span>
                        <span className="font-black text-emerald-400">RD$ {totalLpProfits.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleCopyLink(lp.slug)}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedSlug === lp.slug ? '¡Copiado!' : 'Copiar Link'}
                    </button>

                    <button
                      onClick={() => onViewLandingPage(lp.slug)}
                      className="py-2.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver Landing
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MY STORE LINK & PROFILE */}
      {activeTab === 'my_store' && (
        <div className="space-y-6">
          {userStore ? (
            <div className="bg-slate-900 rounded-3xl border border-purple-800/40 p-6 sm:p-8 space-y-6">
              
              {/* Store Header Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <div className="h-44 sm:h-56 relative overflow-hidden">
                  <img
                    src={userStore.bannerUrl || userStore.coverImageUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1400'}
                    alt={userStore.name}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                </div>

                <div className="relative p-6 -mt-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                  <div className="flex items-end gap-4">
                    <img
                      src={userStore.logoUrl}
                      alt={userStore.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-slate-900 shadow-2xl bg-white shrink-0"
                    />
                    <div className="text-white space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black">{userStore.name}</h2>
                        <CheckCircle2 className="w-5 h-5 text-blue-400" />
                      </div>
                      <p className="text-xs font-mono text-purple-300">
                        {window.location.origin}/{userStore.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStoreSettingsOpen(true)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Portada & Datos</span>
                    </button>
                    {onNavigateToStore && (
                      <button
                        onClick={() => onNavigateToStore(userStore.slug)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver Mi Tienda</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Link Share Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-purple-400" />
                    <span>Tu Enlace Directo</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/${userStore.slug}`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-purple-300 select-all"
                    />
                    <button
                      onClick={async () => {
                        await copyToClipboardSafe(`${window.location.origin}/${userStore.slug}`);
                        setCopiedStoreLink(true);
                        setTimeout(() => setCopiedStoreLink(false), 2500);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5"
                    >
                      {copiedStoreLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedStoreLink ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>Compartir con Clientes</span>
                    </span>
                    <p className="text-[11px] text-slate-400">Envía tu catálogo por WhatsApp con 1 clic</p>
                  </div>
                  <button
                    onClick={() => {
                      const text = `¡Hola! Te invito a ver mi tienda oficial en Sanpi Market: *${userStore.name}*\n👉 ${window.location.origin}/${userStore.slug}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900 rounded-3xl border border-purple-800/40 p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
                <StoreIcon className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h2 className="text-xl font-black text-white">Crea Tu Enlace de Tienda Oficial (/sunombre)</h2>
                <p className="text-xs text-slate-400">
                  Personaliza tu nombre de tienda, foto de portada, foto de perfil y ofrece todos tus productos en un solo link con despacho Sacha Pack y cobro contra entrega.
                </p>
              </div>
              <button
                onClick={() => setStoreSettingsOpen(true)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-600/30 inline-flex items-center gap-2 transform hover:scale-105 transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Configurar Mi Tienda & Enlace Ahora</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYOUTS & COMMISSIONS LEDGER */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Historial de Órdenes y Comisiones por Venta</h3>
                <p className="text-xs text-slate-400">
                  Las ganancias se liquidan automáticamente una vez la orden es marcada como <strong>Entregada</strong> por Sacha Pack.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-amber-950/60 border border-amber-800/60 px-4 py-2 rounded-2xl text-right">
                  <span className="text-[10px] text-amber-300 font-semibold block">Pendiente por Cobrar</span>
                  <span className="text-base font-black text-yellow-400">RD$ {pendingProfits.toLocaleString()}</span>
                </div>
                <div className="bg-emerald-950/60 border border-emerald-800/60 px-4 py-2 rounded-2xl text-right">
                  <span className="text-[10px] text-emerald-300 font-semibold block">Cobrado / Liquidado</span>
                  <span className="text-base font-black text-emerald-400">RD$ {paidProfits.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto pt-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Guía COD</th>
                    <th className="p-3.5">Landing / Producto</th>
                    <th className="p-3.5">Cliente & Destino</th>
                    <th className="p-3.5">Monto Total</th>
                    <th className="p-3.5">Tu Ganancia Neta</th>
                    <th className="p-3.5 rounded-r-xl">Estado Entrega</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {totalOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No hay ventas registradas vía landing pages aún. ¡Comparte tus enlaces para comenzar a generar comisiones!
                      </td>
                    </tr>
                  ) : (
                    totalOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-purple-400">{ord.trackingNumber}</td>
                        <td className="p-3.5 font-semibold text-white">
                          {ord.articleName}
                          <span className="block text-[10px] text-slate-500 font-mono">/lp/{ord.landingPageSlug || 'direct'}</span>
                        </td>
                        <td className="p-3.5">
                          {ord.customerName}
                          <span className="block text-[10px] text-slate-500">{ord.city}, {ord.province}</span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-200">
                          RD$ {ord.totalCodAmount.toLocaleString()}
                        </td>
                        <td className="p-3.5 font-black text-emerald-400">
                          +RD$ {(ord.dropshipperProfit || 850).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              ord.status === 'entregado'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : ord.status === 'en_ruta'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* Store Settings Modal */}
      <StoreSettingsModal
        isOpen={storeSettingsOpen}
        onClose={() => setStoreSettingsOpen(false)}
        store={userStore}
        currentUser={currentUser}
        onSuccess={(updatedStore) => {
          if (onNavigateToStore) {
            onNavigateToStore(updatedStore.slug);
          }
        }}
      />

    </div>
  );
};
