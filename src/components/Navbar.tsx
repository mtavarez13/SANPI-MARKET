import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Truck,
  Store,
  ShieldCheck,
  Sparkles,
  MapPin,
  LogIn,
  Crown,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Flame,
  ArrowRight,
  CheckCircle2,
  Package,
  Calculator
} from 'lucide-react';
import { Article, Store as StoreType, UserProfile, SiteThemeConfig } from '../types';
import { isSuperAdmin, signOutGoogle } from '../lib/authService';
import { RD_PROVINCES, CATEGORIES } from '../data/rdProvinces';

interface NavbarProps {
  currentView: 'explore' | 'catalogs' | 'dropship' | 'track' | 'partner' | 'admin' | 'pdp' | 'carrier' | 'supplier' | 'accounting';
  setCurrentView: (view: 'explore' | 'catalogs' | 'dropship' | 'track' | 'partner' | 'admin' | 'pdp' | 'carrier' | 'supplier' | 'accounting') => void;
  selectedStoreSlug?: string | null;
  onSelectStoreSlug?: (slug: string | null) => void;
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
  onOpenPartnerModal?: () => void;
  onUserLoggedOut?: () => void;
  articles?: Article[];
  stores?: StoreType[];
  onSelectArticle?: (article: Article) => void;
  selectedLocation?: string;
  onSelectLocation?: (location: string) => void;
  config?: SiteThemeConfig;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onSelectStoreSlug,
  cartCount,
  onOpenCart,
  searchQuery,
  setSearchQuery,
  currentUser,
  onOpenAuthModal,
  onOpenPartnerModal,
  onUserLoggedOut,
  articles = [],
  stores = [],
  onSelectArticle,
  selectedLocation = 'Distrito Nacional',
  onSelectLocation,
  config,
  onToggleSidebar,
  isSidebarOpen
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState<string>('Todas');
  const [searchFocused, setSearchFocused] = useState(false);

  // Top Bar Rotating Announcements
  const announcements = [
    '🚚 Envíos rápidos en 24-48h a las 32 provincias vía Sacha Pack (Flete Fijo RD$ 350)',
    '💵 Pago Contra Entrega (COD): Pagas 100% en efectivo al recibir tu paquete',
    '✨ Sanpi: La Magia de comprar Online con garantía de satisfacción asegurada',
    '🚀 Inicia en Dropshipping RD: Vende sin inventario y crea tus Landing Pages'
  ];
  const [currentAnnouncementIdx, setCurrentAnnouncementIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search auto-complete suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    return articles
      .filter((art) => {
        if (searchCategory !== 'Todas' && art.category !== searchCategory) return false;
        const matchTitle = (art.title || art.name || '').toLowerCase().includes(q);
        const matchCat = (art.category || '').toLowerCase().includes(q);
        const matchStore = (art.storeName || '').toLowerCase().includes(q);
        return matchTitle || matchCat || matchStore;
      })
      .slice(0, 5);
  }, [articles, searchQuery, searchCategory]);

  const handleNav = (view: 'explore' | 'catalogs' | 'dropship' | 'track' | 'partner' | 'admin' | 'pdp' | 'carrier' | 'supplier' | 'accounting') => {
    if (view !== 'catalogs' && onSelectStoreSlug) {
      onSelectStoreSlug(null);
    }
    setCurrentView(view);
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  };

  const handleScrollToSection = (sectionId: string) => {
    if (currentView !== 'explore') {
      setCurrentView('explore');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOutGoogle();
    setProfileDropdownOpen(false);
    if (onUserLoggedOut) onUserLoggedOut();
  };

  const superAdmin = isSuperAdmin(currentUser?.email);

  const getRoleLabel = () => {
    if (superAdmin) return 'Super Admin';
    if (currentUser?.role === 'partner') return 'Tienda Oficial';
    if (currentUser?.role === 'dropshipper') return 'Dropshipper Pro';
    return 'Comprador Verificado';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 text-slate-900 shadow-xs">
      
      {/* 1. TOP BAR: Informative top banner with dynamic notices */}
      <div className="bg-slate-900 text-white text-[11px] font-medium py-1.5 px-4">
        <div className="max-w-[1600px] xl:max-w-[1720px] 2xl:max-w-[1850px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate transition-opacity duration-300 font-medium">
              {announcements[currentAnnouncementIdx]}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0 text-[11px] text-slate-300 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Garantía de Satisfacción</span>
            </span>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => handleNav('track')}
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-slate-300" />
              <span>Rastrear Pedido</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <div className="max-w-[1600px] xl:max-w-[1720px] 2xl:max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-3">
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Left Brand + Sidebar Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                id="navbar-sidebar-toggle-btn"
                className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 transition-colors border border-slate-200 cursor-pointer flex items-center gap-1.5 shadow-2xs group"
                title="Abrir Menú de Paneles por Rol"
              >
                <Menu className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="hidden xl:inline text-xs font-bold text-slate-700 group-hover:text-purple-700">
                  Paneles
                </span>
              </button>
            )}

            {/* Logo Brand: Minimalist Sanpi / Custom Uploaded Brand */}
            <div
              className="flex items-center gap-2.5 cursor-pointer group shrink-0"
              onClick={() => handleNav('explore')}
              id="navbar-logo"
            >
              {config?.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={config.siteName || 'Sanpi'}
                  referrerPolicy="no-referrer"
                  style={{ height: `${config.logoHeight || 40}px` }}
                  className="max-w-[180px] object-contain group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200 text-white font-black text-xl italic tracking-tighter"
                  style={{ backgroundColor: config?.primaryColor || '#7C3AED' }}
                >
                  <span>{config?.siteName ? config.siteName.charAt(0) : 'S'}</span>
                </div>
              )}
              
              {(!config?.logoUrl || config.logoUrl.trim() === '') && (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xl tracking-tight text-slate-900">
                      {config?.siteName || 'SANPI'}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-slate-200">
                      {config?.siteTagline || 'MARKET'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium tracking-tight hidden sm:block truncate max-w-[200px]">
                    {config?.siteSlogan || 'La Magia de comprar Online'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Regional Location Selector */}
          <div className="hidden lg:flex items-center">
            <button
              onClick={() => setLocationModalOpen(true)}
              id="navbar-location-btn"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100/80 border border-slate-200 transition-all text-left group"
              title="Cambiar provincia de entrega"
            >
              <MapPin className="w-4 h-4 text-slate-600 shrink-0 group-hover:text-slate-900 transition-colors" />
              <div className="text-[11px] leading-tight">
                <span className="text-slate-400 block text-[10px] font-medium">Enviar a</span>
                <span className="font-bold text-slate-800 max-w-[110px] truncate block">
                  {selectedLocation}
                </span>
              </div>
            </button>
          </div>

          {/* Prominent Search Bar with Autocomplete */}
          <div className="flex-1 max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-1 sm:mx-2 relative" ref={searchContainerRef}>
            <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200/90 focus-within:border-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10 transition-all overflow-hidden">
              
              {/* Category Select */}
              <div className="hidden sm:flex items-center bg-slate-100/70 border-r border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 shrink-0 cursor-pointer">
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="bg-transparent border-none text-slate-700 text-xs font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="Todas">Todas las categorías</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar productos, marcas o tiendas en RD..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  className="w-full bg-transparent pl-10 pr-8 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search Submit */}
              <button
                onClick={() => {
                  if (currentView !== 'explore') handleNav('explore');
                  handleScrollToSection('catalogo');
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 font-bold text-xs flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Autocomplete Dropdown Popover */}
            {searchFocused && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Resultados sugeridos ({searchSuggestions.length})
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {searchSuggestions.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => {
                        if (onSelectArticle) onSelectArticle(art);
                        setSearchFocused(false);
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={art.image || (art.images && art.images[0]) || ''}
                          alt={art.title || art.name}
                          className="w-11 h-11 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-slate-700 truncate">
                            {art.title || art.name}
                          </p>
                          <span className="text-[11px] text-slate-500">
                            {art.storeName || 'Sanpi Store'} • {art.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-slate-900">
                          RD$ {art.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Controls: User Account + Sticky Cart */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* User Profile / Auth State */}
            {!currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAuthModal}
                  id="navbar-login-btn"
                  className="px-3 sm:px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Ingresar</span>
                </button>

                <button
                  onClick={() => {
                    if (onOpenPartnerModal) onOpenPartnerModal();
                    else if (onOpenAuthModal) onOpenAuthModal();
                  }}
                  id="navbar-register-btn"
                  className="hidden md:flex px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs items-center gap-1.5 cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Vender en Sanpi</span>
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-xs cursor-pointer"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Usuario'}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-slate-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                    </div>
                  )}

                  <div className="text-left hidden lg:block leading-tight">
                    <span className="text-[10px] text-slate-400 block font-medium">Mi Cuenta</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-900 max-w-[100px] truncate text-xs">
                        {currentUser.displayName?.split(' ')[0] || 'Usuario'}
                      </span>
                      {superAdmin && <Crown className="w-3 h-3 text-amber-500" />}
                    </div>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in duration-150">
                    <div className="p-2.5 border-b border-slate-100 space-y-1">
                      <p className="font-bold text-slate-900 truncate">{currentUser.displayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <div className="pt-1">
                        <span className="inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {getRoleLabel()}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      {/* User's Own Store Link */}
                      {(() => {
                        const userStore = stores.find(
                          (s) =>
                            (currentUser.uid && s.ownerId === currentUser.uid) ||
                            (currentUser.email && s.ownerEmail?.toLowerCase() === currentUser.email?.toLowerCase()) ||
                            (currentUser.storeName && s.name.toLowerCase() === currentUser.storeName.toLowerCase())
                        );

                        if (userStore) {
                          return (
                            <button
                              onClick={() => {
                                if (onSelectStoreSlug) onSelectStoreSlug(userStore.slug);
                                setCurrentView('catalogs');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-900 flex items-center justify-between transition-colors font-bold"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Store className="w-4 h-4 text-slate-700 shrink-0" />
                                <span className="truncate">Mi Tienda Oficial</span>
                              </div>
                              <span className="text-[10px] font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded shrink-0">
                                /{userStore.slug}
                              </span>
                            </button>
                          );
                        } else if (currentUser.role === 'partner' || currentUser.role === 'dropshipper' || superAdmin) {
                          return (
                            <button
                              onClick={() => {
                                setCurrentView('catalogs');
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center gap-2.5 transition-colors font-semibold"
                            >
                              <Sparkles className="w-4 h-4 text-slate-700" />
                              <span>Personalizar Mi Tienda & Link</span>
                            </button>
                          );
                        }
                        return null;
                      })()}

                      <button
                        onClick={() => handleNav('catalogs')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
                      >
                        <Store className="w-4 h-4 text-slate-500" />
                        <span>Todas las Tiendas Oficiales</span>
                      </button>

                      <button
                        onClick={() => handleNav('dropship')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span>Hub Dropshipping RD</span>
                      </button>

                      <button
                        onClick={() => handleNav('supplier')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-50 text-purple-700 flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <Package className="w-4 h-4 text-purple-600" />
                        <span>Portal Proveedor Mayorista</span>
                      </button>

                      <button
                        onClick={() => handleNav('carrier')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 text-blue-700 flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <Truck className="w-4 h-4 text-blue-600" />
                        <span>Empresas de Transporte & API</span>
                      </button>

                      <button
                        onClick={() => handleNav('track')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-slate-500" />
                        <span>Rastrear Mis Envíos</span>
                      </button>

                      <button
                        onClick={() => handleNav('accounting')}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-800 flex items-center justify-between transition-colors font-bold"
                      >
                        <div className="flex items-center gap-2.5">
                          <Calculator className="w-4 h-4 text-emerald-600" />
                          <span>Contabilidad & Reportes</span>
                        </div>
                        <span className="text-[9px] bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-black">
                          PDF/XLS
                        </span>
                      </button>

                      {superAdmin && (
                        <button
                          onClick={() => handleNav('admin')}
                          className="w-full text-left px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-2.5 transition-colors font-bold border border-amber-200"
                        >
                          <Crown className="w-4 h-4 text-amber-600" />
                          <span>Panel General Admin</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cart Button with Floating Dynamic Badge */}
            <button
              onClick={onOpenCart}
              id="navbar-cart-button"
              className="relative px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer group"
              title="Ver Carrito de Compras"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-emerald-500 text-white font-extrabold text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xs">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline font-bold text-xs">
                Carrito
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* 3. SUB-HEADER NAVIGATION BAR */}
      <div className="bg-slate-50 border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 xl:px-10 py-1.5 text-xs font-semibold overflow-x-auto scrollbar-none">
        <div className="max-w-[1600px] xl:max-w-[1720px] 2xl:max-w-[1850px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            <button
              onClick={() => {
                if (currentView !== 'explore') handleNav('explore');
                handleScrollToSection('catalogo');
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
            >
              <Menu className="w-3.5 h-3.5 text-slate-600" />
              <span>Todos los Departamentos</span>
            </button>

            <button
              onClick={() => {
                if (currentView !== 'explore') handleNav('explore');
                handleScrollToSection('ofertas-del-dia');
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-slate-900 hover:bg-slate-200/70 transition-colors font-bold"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Ofertas del Día</span>
            </button>

            <button
              onClick={() => handleNav('catalogs')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                currentView === 'catalogs' ? 'text-slate-900 bg-white font-bold shadow-2xs border border-slate-200' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-slate-600" />
              <span>Tiendas Oficiales</span>
            </button>

            <button
              onClick={() => handleNav('dropship')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                currentView === 'dropship' ? 'text-slate-900 bg-white font-bold shadow-2xs border border-slate-200' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Dropshipping RD</span>
            </button>

            <button
              onClick={() => handleNav('supplier')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                currentView === 'supplier' ? 'text-purple-900 bg-purple-100 font-bold shadow-2xs border border-purple-300' : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
              }`}
              title="Panel para Proveedores Mayoristas (Subir artículos con precio base oculto)"
            >
              <Package className="w-3.5 h-3.5 text-purple-600" />
              <span>Proveedores Mayoristas</span>
            </button>

            <button
              onClick={() => handleNav('carrier')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                currentView === 'carrier' ? 'text-blue-900 bg-blue-100 font-bold shadow-2xs border border-blue-300' : 'text-blue-700 hover:text-blue-900 hover:bg-blue-50'
              }`}
              title="Dashboard de Empresas de Transporte con API y Manifiestos"
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Transportistas & API</span>
            </button>

            <button
              onClick={() => handleNav('track')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                currentView === 'track' ? 'text-slate-900 bg-white font-bold shadow-2xs border border-slate-200' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rastreo Sacha Pack</span>
            </button>

          </div>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (onOpenPartnerModal) onOpenPartnerModal();
                else if (onOpenAuthModal) onOpenAuthModal();
              }}
              className="text-xs text-slate-700 hover:text-slate-900 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>¿Quieres vender tus productos? Abre tu Tienda</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Location Modal for 32 Provinces Selection */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-bold text-slate-900">Elige tu provincia de entrega</h3>
              </div>
              <button
                onClick={() => setLocationModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Despachos diarios a las 32 provincias de República Dominicana mediante Sacha Pack con flete fijo de RD$ 350 COD.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {RD_PROVINCES.map((prov) => (
                <button
                  key={prov.id}
                  onClick={() => {
                    if (onSelectLocation) onSelectLocation(prov.name);
                    setLocationModalOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    selectedLocation === prov.name
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{prov.name}</span>
                  <span className="text-[10px] opacity-70">Región {prov.region}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
