import React, { useState, useMemo } from 'react';
import { Article, Store, UserProfile } from '../types';
import { CATEGORIES } from '../data/rdProvinces';
import { ProductCard } from './ProductCard';
import {
  Search,
  SlidersHorizontal,
  Star,
  Truck,
  ShoppingBag,
  Sparkles,
  Zap,
  CheckCircle2,
  ChevronRight,
  Store as StoreIcon,
  Flame,
  Clock,
  ShieldCheck,
  Tag,
  ArrowRight
} from 'lucide-react';

interface ExploreViewProps {
  articles: Article[];
  stores: Store[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectArticle: (article: Article) => void;
  onAddToCart: (article: Article) => void;
  onSelectStore: (storeSlug: string) => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
  onResellArticle?: (article: Article) => void;
  onViewLandingPage?: (slug: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  articles,
  stores,
  searchQuery,
  setSearchQuery,
  onSelectArticle,
  onAddToCart,
  onSelectStore,
  currentUser,
  onOpenAuthModal,
  onResellArticle,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedType, setSelectedType] = useState<'all' | 'deals' | 'dropshipping'>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'priceLow' | 'priceHigh' | 'rating'>('popular');
  const [visibleCount, setVisibleCount] = useState<number>(18);

  // Category Highlights (Clean Boutique Look)
  const categoryHighlights = [
    {
      title: 'Tecnología & Audio',
      category: 'Tecnología',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      badge: 'Más Vendidos'
    },
    {
      title: 'Moda & Sneakers',
      category: 'Moda & Calzado',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
      badge: 'Tendencia'
    },
    {
      title: 'Repuestos & Motores',
      category: 'Repuestos & Motores',
      image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500',
      badge: 'Stock Inmediato'
    },
    {
      title: 'Hogar & Electro',
      category: 'Hogar & Cocina',
      image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500',
      badge: 'Garantía 100%'
    }
  ];

  // Filter approved stores
  const validStoreIds = useMemo(() => {
    return new Set(stores.filter((s) => s.isMarketplace).map((s) => s.id));
  }, [stores]);

  // Flash Deals Products
  const flashDeals = useMemo(() => {
    return articles
      .filter((art) => {
        if (!validStoreIds.has(art.storeId)) return false;
        if (art.status !== 'aprobado' || !art.isPublic) return false;
        return (art.compareAtPrice && art.compareAtPrice > art.price) || (art.rating && art.rating >= 4.8);
      })
      .slice(0, 6);
  }, [articles, validStoreIds]);

  // Main catalog articles filtering
  const filteredArticles = useMemo(() => {
    return articles
      .filter((art) => {
        if (!validStoreIds.has(art.storeId)) return false;
        if (art.status !== 'aprobado' || !art.isPublic) return false;

        // Category filter
        if (selectedCategory !== 'Todas' && art.category !== selectedCategory) return false;

        // Type filter
        if (selectedType === 'deals') {
          const isDeal = art.compareAtPrice && art.compareAtPrice > art.price;
          if (!isDeal) return false;
        }
        if (selectedType === 'dropshipping' && !art.isDropshipping) return false;

        // Store filter
        if (selectedStoreId !== 'all' && art.storeId !== selectedStoreId) return false;

        // Search filter
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = (art.title || art.name || '').toLowerCase().includes(q);
          const matchDesc = (art.description || '').toLowerCase().includes(q);
          const matchStore = (art.storeName || '').toLowerCase().includes(q);
          const matchCat = (art.category || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchStore && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priceLow') return a.price - b.price;
        if (sortBy === 'priceHigh') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 5) - (a.rating || 5);
        return (b.views || 0) - (a.views || 0);
      });
  }, [articles, validStoreIds, selectedCategory, selectedType, selectedStoreId, searchQuery, sortBy]);

  const displayedArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArticles.length;

  const isDropshipperUser = currentUser?.role === 'dropshipper' || currentUser?.role === 'admin';

  return (
    <div className="space-y-12 sm:space-y-16">
      
      {/* 1. CATEGORÍAS DESTACADAS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Explora por Categorías
            </h2>
            <p className="text-xs text-slate-500">
              Productos certificados con entrega express a todo el país.
            </p>
          </div>
          <span className="text-xs text-slate-600 font-semibold hidden sm:inline bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            32 Provincias • Flete Fijo RD$ 350
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {categoryHighlights.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedCategory(cat.category);
                const el = document.getElementById('catalogo');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white hover:bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow cursor-pointer group transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 inline-block">
                  {cat.badge}
                </span>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                  {cat.title}
                </h3>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden mt-3 bg-slate-100 border border-slate-200/60">
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="pt-3 flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-slate-700">
                <span>Ver productos</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. OFERTAS FLASH & LIQUIDACIONES */}
      {flashDeals.length > 0 && (
        <div id="ofertas-del-dia" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                <Flame className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Ofertas Flash del Día
                  </h2>
                  <span className="text-[10px] bg-slate-900 text-white font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Hasta -35% OFF
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Precios reducidos por tiempo limitado con pago en efectivo contra entrega (COD).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200 shrink-0">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Tiempo restante: 07h 35m</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {flashDeals.map((art) => (
              <ProductCard
                key={art.id}
                article={art}
                onSelect={onSelectArticle}
                onAddToCart={onAddToCart}
                onResell={onResellArticle}
                currentUser={currentUser}
                onOpenAuthModal={onOpenAuthModal}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. TIENDAS OFICIALES DESTACADAS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <StoreIcon className="w-5 h-5 text-slate-700" />
              Tiendas Oficiales Verificadas
            </h2>
            <p className="text-xs text-slate-500">
              Distribuidores mayoristas e importadores con stock en República Dominicana.
            </p>
          </div>
          <button
            onClick={() => onSelectStore('')}
            className="text-xs font-bold text-slate-800 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            <span>Ver todas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stores.filter((s) => s.isMarketplace).slice(0, 3).map((s) => {
            const storeCount = articles.filter((a) => (a.storeId === s.id || a.storeName === s.name) && a.status === 'aprobado').length;

            return (
              <div
                key={s.id}
                onClick={() => onSelectStore(s.slug)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md cursor-pointer group flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="relative h-24 bg-slate-100 overflow-hidden">
                    <img
                      src={s.bannerUrl || s.coverImageUrl || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800'}
                      alt={s.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                  </div>

                  <div className="p-5 -mt-6 relative space-y-3">
                    <div className="flex items-end gap-3">
                      <img
                        src={s.logoUrl}
                        alt={s.name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-white bg-white shadow-md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-slate-700 transition-colors truncate">
                            {s.name}
                          </h3>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-[11px] text-slate-500">{s.province}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {s.description}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-slate-800 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{s.rating || 4.9}</span>
                        <span className="text-slate-400 font-normal">({s.totalReviews || 120})</span>
                      </div>
                      <span className="text-slate-700 font-bold text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">
                        {storeCount} Productos
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <StoreIcon className="w-3.5 h-3.5" />
                    <span>Visitar Tienda Oficial</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CATÁLOGO GENERAL DE PRODUCTOS */}
      <section id="catalogo" className="space-y-6 scroll-mt-24">
        
        {/* Feed Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-slate-900" />
              Catálogo de Productos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredArticles.length} artículos certificados con flete fijo nacional de RD$ 350.
            </p>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedType === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos los Artículos
            </button>

            <button
              onClick={() => setSelectedType('deals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                selectedType === 'deals'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Solo Ofertas</span>
            </button>

            {isDropshipperUser && (
              <button
                onClick={() => setSelectedType('dropshipping')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedType === 'dropshipping'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Dropshipping RD</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Pills & Sorting Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-x-auto pb-1">
          
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 w-full">
            <button
              onClick={() => setSelectedCategory('Todas')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                selectedCategory === 'Todas'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todas
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs"
            >
              <option value="popular">Más Populares</option>
              <option value="priceLow">Menor Precio</option>
              <option value="priceHigh">Mayor Precio</option>
              <option value="rating">Mejor Calificados</option>
            </select>
          </div>

        </div>

        {/* Products Grid */}
        {displayedArticles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3 shadow-xs">
            <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No se encontraron artículos</h3>
            <p className="text-xs text-slate-500">Intenta buscar con otros términos o cambiar la categoría seleccionada.</p>
            <button
              onClick={() => {
                setSelectedCategory('Todas');
                setSelectedType('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
            {displayedArticles.map((art) => (
              <ProductCard
                key={art.id}
                article={art}
                onSelect={onSelectArticle}
                onAddToCart={onAddToCart}
                onResell={onResellArticle}
                currentUser={currentUser}
                onOpenAuthModal={onOpenAuthModal}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center pt-6">
            <button
              onClick={() => setVisibleCount((prev) => prev + 12)}
              className="px-8 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-200 hover:border-slate-300 transition-all shadow-xs cursor-pointer"
            >
              Cargar más productos ({filteredArticles.length - visibleCount} restantes)
            </button>
          </div>
        )}

      </section>

    </div>
  );
};
