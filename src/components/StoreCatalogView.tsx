import React, { useState, useMemo } from 'react';
import { Article, Store, UserProfile } from '../types';
import { SANPI_FLAT_SHIPPING_FEE } from '../lib/firebase';
import { StoreSettingsModal } from './StoreSettingsModal';
import { AddStoreProductModal } from './AddStoreProductModal';
import { isSuperAdmin } from '../lib/authService';
import {
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Star,
  ArrowLeft,
  Store as StoreIcon,
  Truck,
  Search,
  SlidersHorizontal,
  CheckCircle,
  Share2,
  Check,
  Zap,
  Tag,
  ExternalLink,
  MessageCircle,
  Info,
  Edit3,
  Plus,
  Copy,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';

interface StoreCatalogViewProps {
  storeSlug: string | null;
  stores: Store[];
  articles: Article[];
  onBack: () => void;
  onSelectArticle: (article: Article) => void;
  onAddToCart: (article: Article) => void;
  onSelectStoreSlug: (slug: string) => void;
  currentUser?: UserProfile | null;
}

export const StoreCatalogView: React.FC<StoreCatalogViewProps> = ({
  storeSlug,
  stores,
  articles,
  onBack,
  onSelectArticle,
  onAddToCart,
  onSelectStoreSlug,
  currentUser
}) => {
  const [storeSearch, setStoreSearch] = useState('');
  const [storeCategoryFilter, setStoreCategoryFilter] = useState('Todas');
  const [storeSortOrder, setStoreSortOrder] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [storeTab, setStoreTab] = useState<'catalog' | 'deals' | 'reviews' | 'about'>('catalog');
  const [copiedLink, setCopiedLink] = useState(false);
  const [allStoresSearch, setAllStoresSearch] = useState('');

  // Modals for editing store & adding products
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);

  const selectedStore = stores.find(
    (s) =>
      s.slug?.toLowerCase() === storeSlug?.toLowerCase() ||
      s.id === storeSlug ||
      s.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === storeSlug?.toLowerCase()
  );

  // Check if current user is owner of the active store or super admin
  const isOwner = useMemo(() => {
    if (!currentUser || !selectedStore) return false;
    if (isSuperAdmin(currentUser.email)) return true;
    if (selectedStore.ownerId && selectedStore.ownerId === currentUser.uid) return true;
    if (selectedStore.ownerEmail && selectedStore.ownerEmail.toLowerCase() === currentUser.email?.toLowerCase()) return true;
    if (currentUser.storeName && currentUser.storeName.toLowerCase() === selectedStore.name.toLowerCase()) return true;
    return false;
  }, [currentUser, selectedStore]);

  const storeArticles = useMemo(() => {
    if (!selectedStore) return [];
    return articles.filter(
      (a) => (a.storeId === selectedStore.id || a.storeName === selectedStore.name) && 
             a.status === 'aprobado' &&
             (isOwner || (!a.isProviderProduct && a.visibility !== 'dropshippers_only' && a.isPublic !== false))
    );
  }, [articles, selectedStore, isOwner]);

  // Categories present in this store
  const storeCategories = useMemo(() => {
    const cats = new Set<string>();
    storeArticles.forEach((a) => {
      if (a.category) cats.add(a.category);
    });
    return ['Todas', ...Array.from(cats)];
  }, [storeArticles]);

  // Filtered store catalog
  const filteredArticles = useMemo(() => {
    return storeArticles
      .filter((art) => {
        if (storeCategoryFilter !== 'Todas' && art.category !== storeCategoryFilter) return false;
        if (storeSearch.trim()) {
          const q = storeSearch.toLowerCase();
          const matchTitle = (art.title || art.name || '').toLowerCase().includes(q);
          const matchDesc = (art.description || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }
        if (storeTab === 'deals') {
          const isDeal = (art.compareAtPrice && art.compareAtPrice > art.price);
          if (!isDeal) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (storeSortOrder === 'price-asc') return a.price - b.price;
        if (storeSortOrder === 'price-desc') return b.price - a.price;
        if (storeSortOrder === 'rating') return (b.rating || 5) - (a.rating || 5);
        return (b.views || 0) - (a.views || 0);
      });
  }, [storeArticles, storeCategoryFilter, storeSearch, storeTab, storeSortOrder]);

  const getStorePublicUrl = (s?: Store) => {
    const target = s || selectedStore;
    if (!target) return window.location.origin;
    return `${window.location.origin}/${target.slug}`;
  };

  const handleShareStore = () => {
    const url = getStorePublicUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    if (!selectedStore) return;
    const url = getStorePublicUrl();
    const text = `¡Hola! Mira mi tienda oficial en Sanpi Market: *${selectedStore.name}* 🛒📦\n\nTodos los productos tienen garantía y pago contra entrega (COD) a todo el país:\n👉 ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // 1. VIEW: LIST OF ALL PARTNER STORES
  if (!selectedStore) {
    const filteredStores = stores.filter((s) => {
      if (!allStoresSearch.trim()) return true;
      const q = allStoresSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.province || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.slug || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-8 pb-16">
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/80 text-white p-6 sm:p-8 rounded-[2rem] border border-purple-800/30 shadow-xl">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <StoreIcon className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Tiendas Oficiales & Enlaces de Vendedores
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl">
              Cada dueño de tienda cuenta con su enlace personalizado <code className="text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded font-mono">/sunombre</code>, foto de portada, perfil y catálogo completo con cobro contra entrega (COD RD$350 flete).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar tiendas por nombre o link..."
                value={allStoresSearch}
                onChange={(e) => setAllStoresSearch(e.target.value)}
                className="bg-slate-800 text-white pl-10 pr-4 py-2.5 rounded-2xl text-xs border border-slate-700 focus:outline-none focus:border-purple-500 w-full sm:w-64 shadow-inner"
              />
            </div>

            {/* Quick Button to Create / Configure My Store */}
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Crear / Personalizar Mi Tienda</span>
            </button>

            <button
              onClick={onBack}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-2 border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Explorar</span>
            </button>
          </div>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
          {filteredStores.map((s) => {
            const storeProducts = articles.filter(
              (a) => (a.storeId === s.id || a.storeName === s.name) && a.status === 'aprobado'
            );
            const primaryCol = s.theme?.primaryColor || '#9333ea';

            return (
              <div
                key={s.id}
                onClick={() => onSelectStoreSlug(s.slug)}
                className="bg-slate-900 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-800 hover:border-purple-500/50 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Store Cover Banner */}
                  <div className="relative h-40 bg-slate-950 overflow-hidden">
                    <img
                      src={s.bannerUrl || s.coverImageUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200'}
                      alt={s.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Store slug badge in cover */}
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-sm border border-purple-700/40 px-2.5 py-1 rounded-xl text-[10px] font-mono text-purple-300 font-bold flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      <span>/{s.slug}</span>
                    </div>

                    {/* Logo & Info Overlay */}
                    <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
                      <img
                        src={s.logoUrl}
                        alt={s.name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500 shadow-xl bg-slate-900 shrink-0"
                      />
                      <div className="text-white min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-base leading-tight group-hover:text-purple-300 transition-colors truncate">
                            {s.name}
                          </h3>
                          <CheckCircle className="w-4 h-4 text-blue-400 fill-blue-400/20 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-400" />
                          <span>{s.province || 'República Dominicana'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {s.description}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{s.rating || 4.9}</span>
                        <span className="text-slate-400 font-normal">({s.totalReviews || 120})</span>
                      </div>
                      <span className="font-bold text-slate-200 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
                        {storeProducts.length} Productos
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0">
                  <button
                    style={{ backgroundColor: primaryCol }}
                    className="w-full text-white font-bold py-2.5 rounded-2xl text-xs transition-opacity hover:opacity-90 flex items-center justify-center gap-2 shadow-md"
                  >
                    <StoreIcon className="w-4 h-4" />
                    <span>Entrar a Tienda Oficial</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Store Settings Modal for creating or editing */}
        <StoreSettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          currentUser={currentUser}
          onSuccess={(newStore) => {
            onSelectStoreSlug(newStore.slug);
          }}
        />
      </div>
    );
  }

  // 2. VIEW: INDIVIDUAL BRANDED STOREFRONT
  const brandPrimaryColor = selectedStore.theme?.primaryColor || '#9333ea';
  const brandSecondaryColor = selectedStore.theme?.secondaryColor || '#581c87';

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Breadcrumb & Return Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-sm border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ver todas las tiendas</span>
        </button>

        {/* Actions for Store Link Sharing & Owner Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Direct Link Tag with Copy Button */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-purple-800/40 px-3 py-1.5 rounded-2xl text-xs">
            <span className="text-slate-400 font-mono text-[11px]">{window.location.origin}/</span>
            <span className="font-mono font-black text-purple-300">{selectedStore.slug}</span>
            <button
              onClick={handleShareStore}
              className="p-1 hover:bg-purple-950/60 rounded text-purple-300 transition-colors"
              title="Copiar Link de la Tienda"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Compartir por WhatsApp</span>
          </button>

          <button
            onClick={handleShareStore}
            className="px-3.5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md shadow-purple-600/20"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? '¡Link Copiado!' : 'Copiar Link /' + selectedStore.slug}</span>
          </button>

          {/* Owner / Admin Management Buttons */}
          {isOwner && (
            <>
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Portada & Perfil</span>
              </button>

              <button
                onClick={() => setAddProductModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Producto</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Brand Panorama Banner Header (FOTO DE PORTADA Y PERFIL) */}
      <div className="relative rounded-[2.5rem] bg-slate-950 text-white overflow-hidden shadow-2xl border border-slate-800">
        
        {/* Cover Banner Image */}
        <div className="h-52 sm:h-80 relative overflow-hidden group">
          <img
            src={selectedStore.bannerUrl || selectedStore.coverImageUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600'}
            alt={selectedStore.name}
            className="w-full h-full object-cover opacity-80 group-hover:scale-102 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Direct link badge overlay */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-purple-700/40 text-xs text-purple-200">
            <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-mono font-bold">sanpimarket.com/{selectedStore.slug}</span>
          </div>

          {/* Owner quick edit banner button */}
          {isOwner && (
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 px-3.5 py-1.5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 border border-purple-500/40 backdrop-blur-md shadow-lg transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-purple-400" />
              <span>Cambiar Portada / Datos</span>
            </button>
          )}
        </div>

        {/* Storefront Info Bar */}
        <div className="relative p-6 sm:p-8 -mt-20 sm:-mt-24 space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            
            {/* Logo & Store Names */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="relative group shrink-0">
                <img
                  src={selectedStore.logoUrl}
                  alt={selectedStore.name}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-slate-900 shadow-2xl bg-slate-900"
                />
                {isOwner && (
                  <button
                    onClick={() => setSettingsModalOpen(true)}
                    className="absolute inset-0 bg-slate-950/60 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                  >
                    Cambiar Logo
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    {selectedStore.name}
                  </h1>
                  <ShieldCheck className="w-6 h-6 text-purple-400 fill-purple-400/20" title="Tienda Oficial Certificada" />
                  <span className="text-[11px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    /{selectedStore.slug}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-1 text-amber-400 font-bold bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-800">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{selectedStore.rating || 4.8}</span>
                    <span className="text-slate-400 font-normal">({selectedStore.totalReviews || 150} reseñas)</span>
                  </div>

                  <span className="flex items-center gap-1 font-semibold text-purple-300 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-800">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedStore.province || 'República Dominicana'}
                  </span>

                  <span className="flex items-center gap-1 bg-emerald-950/70 text-emerald-300 font-bold px-2.5 py-1 rounded-xl border border-emerald-800/40">
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    Envíos Sacha Pack 24-48h (Flete RD$ 350 COD)
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Contact CTAs */}
            <div className="flex flex-wrap items-center gap-2.5">
              {selectedStore.contact?.whatsapp && (
                <a
                  href={`https://wa.me/${selectedStore.contact.whatsapp}?text=Hola%20${encodeURIComponent(
                    selectedStore.name
                  )},%20vi%20su%20tienda%20en%20Sanpi%20Market.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/30"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp de la Tienda</span>
                </a>
              )}

              {selectedStore.contact?.phone && (
                <a
                  href={`tel:${selectedStore.contact.phone}`}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{selectedStore.contact.phone}</span>
                </a>
              )}

              {isOwner && (
                <button
                  onClick={() => setAddProductModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Agregar Producto</span>
                </button>
              )}
            </div>

          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-4xl leading-relaxed">
            {selectedStore.description}
          </p>

          {/* Store Internal Tabs */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setStoreTab('catalog')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                storeTab === 'catalog'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Catálogo de Productos ({storeArticles.length})
            </button>

            <button
              onClick={() => setStoreTab('deals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                storeTab === 'deals'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Ofertas Especiales
            </button>

            <button
              onClick={() => setStoreTab('reviews')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                storeTab === 'reviews'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Opiniones & Reputación
            </button>

            <button
              onClick={() => setStoreTab('about')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                storeTab === 'about'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Políticas de Despacho & Garantía
            </button>
          </div>

        </div>

      </div>

      {/* Main Catalog View Tab */}
      {(storeTab === 'catalog' || storeTab === 'deals') && (
        <div className="space-y-6">
          
          {/* Internal Search & Category Filter Bar */}
          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Buscar en ${selectedStore.name}...`}
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                className="w-full bg-slate-950 pl-10 pr-4 py-2 rounded-2xl text-xs border border-slate-700 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:flex-1 scrollbar-none pb-1 md:pb-0">
              {storeCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setStoreCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                    storeCategoryFilter === cat
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <select
                value={storeSortOrder}
                onChange={(e: any) => setStoreSortOrder(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="featured">Más Populares</option>
                <option value="price-asc">Menor Precio</option>
                <option value="price-desc">Mayor Precio</option>
                <option value="rating">Mejor Calificados</option>
              </select>
            </div>

          </div>

          {/* Product Grid */}
          {filteredArticles.length === 0 ? (
            <div className="bg-slate-900 rounded-3xl p-12 text-center border border-slate-800 space-y-4">
              <ShoppingBag className="w-12 h-12 text-purple-400 mx-auto" />
              <div>
                <p className="text-base font-bold text-white">No se encontraron productos en esta sección.</p>
                <p className="text-xs text-slate-400 mt-1">
                  {isOwner
                    ? '¡Agrega tus primeros productos para que aparezcan en tu link público!'
                    : 'Prueba buscando con otro término o seleccionando otra categoría.'}
                </p>
              </div>

              {isOwner ? (
                <button
                  onClick={() => setAddProductModalOpen(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Agregar Producto a Mi Tienda</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setStoreSearch('');
                    setStoreCategoryFilter('Todas');
                  }}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {filteredArticles.map((art) => {
                const totalCod = art.price + SANPI_FLAT_SHIPPING_FEE;
                const comparePrice = art.compareAtPrice || Math.round(art.price * 1.3);
                const discount = Math.max(0, Math.round(((comparePrice - art.price) / comparePrice) * 100));

                return (
                  <div
                    key={art.id}
                    className="bg-slate-900 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 border border-slate-800 hover:border-purple-500/40 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image Stage */}
                      <div
                        className="relative aspect-square bg-slate-950 cursor-pointer overflow-hidden flex items-center justify-center p-4"
                        onClick={() => onSelectArticle(art)}
                      >
                        <img
                          src={art.image || (art.images && art.images[0]) || ''}
                          alt={art.title || art.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />

                        {discount > 0 && (
                          <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                            -{discount}% OFF
                          </span>
                        )}

                        <span className="absolute bottom-3 right-3 bg-slate-950/90 text-purple-300 text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm border border-purple-800/40">
                          COD RD$ 350
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{art.category}</span>
                          <div className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{art.rating || 4.9}</span>
                          </div>
                        </div>

                        <h3
                          onClick={() => onSelectArticle(art)}
                          className="font-bold text-white text-sm line-clamp-2 cursor-pointer hover:text-purple-400 transition-colors"
                        >
                          {art.title || art.name}
                        </h3>

                        {/* Price Display */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-black text-white">
                              RD$ {art.price.toLocaleString()}
                            </span>
                            {comparePrice > art.price && (
                              <span className="text-xs text-slate-500 line-through">
                                RD$ {comparePrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            <span>Pagas RD$ {totalCod.toLocaleString()} al recibir (COD)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-5 pt-0 flex gap-2">
                      <button
                        onClick={() => onSelectArticle(art)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition-colors border border-slate-700"
                      >
                        Detalles
                      </button>
                      <button
                        onClick={() => onAddToCart(art)}
                        style={{ backgroundColor: brandPrimaryColor }}
                        className="flex-1 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md hover:opacity-90 transition-opacity"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Comprar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Tab: Store Reviews */}
      {storeTab === 'reviews' && (
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-xl font-black text-white">Reputación y Opiniones de {selectedStore.name}</h2>
              <p className="text-xs text-slate-400 mt-1">Calificaciones otorgadas por compradores en República Dominicana con entregas verificadas.</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-950 border border-purple-800/40 p-4 rounded-2xl">
              <span className="text-3xl font-black text-amber-400">{selectedStore.rating || 4.8}</span>
              <div>
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 font-semibold">{selectedStore.totalReviews || 150} entregas exitosas</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Embalaje y Calidad de Productos</span>
                <span className="font-extrabold text-emerald-400">99.2% Satisfacción</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full w-[99%]" />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Puntualidad en Despacho Sacha Pack</span>
                <span className="font-extrabold text-purple-400">98.5% En 24-48 Horas</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full w-[98%]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: About & Shipping Policies */}
      {storeTab === 'about' && (
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6 max-w-4xl text-white">
          <h2 className="text-xl font-black text-white">Políticas de Operación y Garantías de {selectedStore.name}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-300">
            <div className="space-y-2 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-400" />
                Despacho Nacional Sacha Pack (RD$ 350)
              </h3>
              <p>
                Todos los pedidos de {selectedStore.name} son recolectados y despachados a través del convenio oficial con Sacha Pack Express a las 32 provincias de República Dominicana.
              </p>
            </div>

            <div className="space-y-2 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Pago Contra Entrega (COD)
              </h3>
              <p>
                No necesitas tarjeta bancaria. Pagas el total del producto + los RD$ 350 de flete en efectivo directamente al mensajero de Sacha Pack al recibir tu paquete.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Store Settings Modal for editing cover, logo, name and slug */}
      <StoreSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        store={selectedStore}
        currentUser={currentUser}
        onSuccess={(updatedStore) => {
          onSelectStoreSlug(updatedStore.slug);
        }}
      />

      {/* Add Product Modal for adding items directly to this store */}
      {selectedStore && (
        <AddStoreProductModal
          isOpen={addProductModalOpen}
          onClose={() => setAddProductModalOpen(false)}
          store={selectedStore}
          onSuccess={() => {
            // Updated in sanpiManager
          }}
        />
      )}

    </div>
  );
};
