import React, { useState } from 'react';
import {
  Users,
  Shield,
  Store,
  TrendingUp,
  Package,
  Truck,
  Sparkles,
  MapPin,
  Palette,
  CreditCard,
  ShoppingBag,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  LogIn,
  LogOut,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Crown,
  Tag,
  Building2,
  Box,
  Compass,
  Layers,
  Calculator
} from 'lucide-react';
import { UserProfile } from '../types';
import { isSuperAdmin } from '../lib/authService';

export interface SidebarProps {
  currentView: 'explore' | 'catalogs' | 'dropship' | 'landing_page' | 'track' | 'partner' | 'admin' | 'carrier' | 'supplier' | 'accounting';
  setCurrentView: (view: 'explore' | 'catalogs' | 'dropship' | 'landing_page' | 'track' | 'partner' | 'admin' | 'carrier' | 'supplier' | 'accounting') => void;
  adminInitialTab?: string;
  setAdminInitialTab?: (tab: 'users' | 'subs' | 'stores' | 'referrals' | 'dropshippers' | 'landing_pages' | 'config' | 'finance' | 'expenses' | 'map' | 'plans' | 'branding') => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: (defaultRole?: 'customer' | 'dropshipper' | 'partner') => void;
  onOpenPartnerModal: () => void;
  onOpenGeneratorModal: () => void;
  selectedStoreSlug: string | null;
  onSelectStoreSlug: (slug: string | null) => void;
  cartCount: number;
  onOpenCart: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  config?: { logoUrl?: string; siteName?: string; primaryColor?: string };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  adminInitialTab = 'users',
  setAdminInitialTab,
  currentUser,
  onOpenAuthModal,
  onOpenPartnerModal,
  onOpenGeneratorModal,
  selectedStoreSlug,
  onSelectStoreSlug,
  cartCount,
  onOpenCart,
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
  config
}) => {
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<UserProfile['role'] | 'all'>('all');

  const isSuper = isSuperAdmin(currentUser?.email);
  const effectiveRole = isSuper && simulatedRole !== 'all' 
    ? simulatedRole 
    : (currentUser?.role || 'customer');

  const handleNav = (
    view: 'explore' | 'catalogs' | 'dropship' | 'landing_page' | 'track' | 'partner' | 'admin' | 'carrier' | 'supplier' | 'accounting',
    adminTab?: 'users' | 'subs' | 'stores' | 'referrals' | 'dropshippers' | 'landing_pages' | 'config' | 'finance' | 'expenses' | 'map' | 'plans' | 'branding'
  ) => {
    if (view === 'admin' && adminTab && setAdminInitialTab) {
      setAdminInitialTab(adminTab);
    }
    setCurrentView(view);
    setIsMobileOpen(false);
  };

  const handleCopyReferral = () => {
    if (!currentUser?.referralCode) return;
    navigator.clipboard.writeText(currentUser.referralCode);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  // Helper to render role badge in sidebar
  const renderRoleBadge = () => {
    if (isSuper) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">
          <Crown className="w-3 h-3 text-rose-600" />
          <span>Super Admin</span>
        </span>
      );
    }

    switch (currentUser?.role) {
      case 'partner':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Store className="w-3 h-3 text-emerald-600" />
            <span>Tienda / Socio</span>
          </span>
        );
      case 'dropshipper':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>Dropshipper Pro</span>
          </span>
        );
      case 'supplier':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Package className="w-3 h-3 text-indigo-600" />
            <span>Proveedor Mayorista</span>
          </span>
        );
      case 'carrier':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Truck className="w-3 h-3 text-blue-600" />
            <span>Transportista</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <ShoppingBag className="w-3 h-3 text-slate-500" />
            <span>Cliente</span>
          </span>
        );
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="sanpi-left-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 shadow-xl lg:shadow-xs transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'} w-72 h-screen`}
      >
        {/* TOP HEADER: Brand Logo & Collapse Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div
            onClick={() => handleNav('explore')}
            className="flex items-center gap-2.5 cursor-pointer select-none group min-w-0"
          >
            {config?.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Sanpi"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-contain bg-white shrink-0 border border-slate-200"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm italic shadow-xs shrink-0"
                style={{ backgroundColor: config?.primaryColor || '#7C3AED' }}
              >
                S
              </div>
            )}

            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base text-slate-900 tracking-tight">
                    {config?.siteName || 'SANPI'}
                  </span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    RD
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  Paneles & Logística COD
                </p>
              </div>
            )}
          </div>

          {/* Action buttons: Collapse desktop or close mobile */}
          <div className="flex items-center gap-1">
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
              id="sidebar-collapse-btn"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* USER PROFILE & ASSIGNED ROLE CARD */}
        <div className="p-3 border-b border-slate-100 bg-linear-to-b from-slate-50/80 to-white">
          {currentUser ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <img
                    src={currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || currentUser.email)}`}
                    alt={currentUser.displayName || 'Usuario'}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                  />
                  {isSuper && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-[10px] shadow-xs">
                      👑
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                      {currentUser.displayName || 'Usuario'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                      {currentUser.email}
                    </p>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex items-center justify-between gap-1 pt-1">
                  <div>{renderRoleBadge()}</div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Rol Permanente</span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-1">
              {!isCollapsed ? (
                <button
                  onClick={() => {
                    onOpenAuthModal();
                    setIsMobileOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-purple-600/20 transition-all cursor-pointer"
                  id="sidebar-login-btn"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Acceder / Registrarme</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuthModal();
                    setIsMobileOpen(false);
                  }}
                  className="w-10 h-10 mx-auto rounded-xl bg-purple-600 text-white flex items-center justify-center"
                  title="Iniciar Sesión"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* SUPER ADMIN ROLE SIMULATOR / FILTER */}
          {isSuper && !isCollapsed && (
            <div className="mt-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-purple-600" />
                  <span>Modo Vista Rol:</span>
                </span>
                <span className="text-purple-700 uppercase font-black">{simulatedRole}</span>
              </div>
              <select
                value={simulatedRole}
                onChange={(e) => setSimulatedRole(e.target.value as any)}
                className="w-full text-[11px] font-bold bg-slate-100 text-slate-700 rounded-lg px-2 py-1 border border-slate-200 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                title="Filtrar menú por rol"
              >
                <option value="all">👑 Todos los Paneles (Super Admin)</option>
                <option value="partner">🏪 Socio de Tienda Mayorista</option>
                <option value="dropshipper">⚡ Dropshipper Pro</option>
                <option value="supplier">📦 Proveedor Mayorista</option>
                <option value="carrier">🚚 Transportista Logístico</option>
                <option value="customer">🛍️ Cliente Comprador</option>
              </select>
            </div>
          )}
        </div>

        {/* SCROLLABLE NAVIGATION MENU */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 custom-scrollbar">

          {/* SECTION 1: ROLE WORKSPACE PANELS (PANELES DEL ROL) */}
          <div>
            {!isCollapsed && (
              <div className="px-2 mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                  {isSuper && simulatedRole === 'all' ? 'Paneles Super Admin' : 'Mi Espacio de Trabajo'}
                </span>
                <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-sm border border-purple-200">
                  {effectiveRole.toUpperCase()}
                </span>
              </div>
            )}

            <div className="space-y-1">

              {/* SUPER ADMIN MASTER PANELS */}
              {(isSuper || effectiveRole === 'admin') && (
                <>
                  <button
                    onClick={() => handleNav('admin', 'users')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'admin' && adminInitialTab === 'users'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Panel de Usuarios y Roles"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Usuarios & Roles</span>
                        <span className="text-[9px] bg-purple-200 text-purple-950 font-black px-1.5 py-0.5 rounded-full ml-1">
                          RBAC
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('admin', 'finance')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'admin' && adminInitialTab === 'finance'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Finanzas y Ventas Marketplace"
                  >
                    <TrendingUp className="w-4 h-4 shrink-0" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Finanzas & Ventas</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          RD$
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('accounting')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'accounting'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Módulo de Contabilidad por Usuario y Reportes en PDF/Excel"
                  >
                    <Calculator className="w-4 h-4 shrink-0 text-emerald-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Contabilidad & Reportes</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          PDF/XLS
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('admin', 'subs')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'admin' && adminInitialTab === 'subs'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Solicitudes de Registro de Tiendas"
                  >
                    <Store className="w-4 h-4 shrink-0" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Solicitudes Tiendas</span>
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          Planes
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('supplier')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'supplier'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Portal Proveedores Mayoristas"
                  >
                    <Package className="w-4 h-4 shrink-0 text-indigo-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Portal Proveedores</span>
                        <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          Mayorista
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('carrier')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'carrier'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Transportistas & API Logística"
                  >
                    <Truck className="w-4 h-4 shrink-0 text-blue-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Transportistas & API</span>
                        <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          Sacha
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('dropship')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'dropship'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Hub Dropshipping RD"
                  >
                    <Sparkles className="w-4 h-4 shrink-0 text-purple-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Hub Dropshipping</span>
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          COD
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('admin', 'map')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'admin' && adminInitialTab === 'map'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Mapa Logístico RD (32 Provincias)"
                  >
                    <MapPin className="w-4 h-4 shrink-0 text-amber-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Mapa Logístico RD</span>
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          32 Prov
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('admin', 'branding')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'admin' && adminInitialTab === 'branding'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Personalizar Branding e Identidad"
                  >
                    <Palette className="w-4 h-4 shrink-0 text-pink-500" />
                    {!isCollapsed && (
                      <span className="truncate">Branding & Ajustes</span>
                    )}
                  </button>
                </>
              )}

              {/* PARTNER / TIENDA MAYORISTA PANELS */}
              {!isSuper && effectiveRole === 'partner' && (
                <>
                  <button
                    onClick={() => {
                      if (currentUser?.storeName) {
                        const slug = currentUser.storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                        onSelectStoreSlug(slug);
                      }
                      handleNav('catalogs');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'catalogs'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Mi Tienda Oficial y Catálogo"
                  >
                    <Store className="w-4 h-4 shrink-0 text-emerald-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Mi Tienda Oficial</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          Activa
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('track')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'track'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Envíos y Despachos Sacha Pack"
                  >
                    <Truck className="w-4 h-4 shrink-0 text-blue-500" />
                    {!isCollapsed && (
                      <span className="truncate">Envíos COD Sacha Pack</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('dropship')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'dropship'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Hub Dropshipping RD"
                  >
                    <Sparkles className="w-4 h-4 shrink-0 text-purple-500" />
                    {!isCollapsed && (
                      <span className="truncate">Hub Dropshipping</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('accounting')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'accounting'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Contabilidad de mi Tienda, Beneficios y Gastos"
                  >
                    <Calculator className="w-4 h-4 shrink-0 text-emerald-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Mi Contabilidad</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          Ganancias
                        </span>
                      </div>
                    )}
                  </button>
                </>
              )}

              {/* DROPSHIPPER PRO PANELS */}
              {!isSuper && effectiveRole === 'dropshipper' && (
                <>
                  <button
                    onClick={() => handleNav('dropship')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'dropship'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Hub Dropshipping Pro"
                  >
                    <Sparkles className="w-4 h-4 shrink-0 text-purple-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Hub Dropshipping</span>
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          Ganancias
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('accounting')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'accounting'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Mis Beneficios y Gastos de Publicidad"
                  >
                    <Calculator className="w-4 h-4 shrink-0 text-purple-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Beneficios & Gastos</span>
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          PDF/XLS
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onOpenGeneratorModal();
                      setIsMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 transition-all text-left border border-purple-200"
                    title="Crear Landing Page con IA"
                  >
                    <FileText className="w-4 h-4 shrink-0 text-purple-600" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Crear Landing Page</span>
                        <span className="text-[9px] bg-purple-600 text-white font-black px-1.5 py-0.5 rounded-full ml-1">
                          +Nueva
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('track')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'track'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Mis Envíos y Comisiones COD"
                  >
                    <Truck className="w-4 h-4 shrink-0 text-blue-500" />
                    {!isCollapsed && (
                      <span className="truncate">Mis Pedidos y Guías COD</span>
                    )}
                  </button>
                </>
              )}

              {/* SUPPLIER MAYORISTA PANELS */}
              {!isSuper && effectiveRole === 'supplier' && (
                <>
                  <button
                    onClick={() => handleNav('supplier')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'supplier'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Portal de Proveedor Mayorista"
                  >
                    <Package className="w-4 h-4 shrink-0 text-indigo-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Portal Proveedor</span>
                        <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          Stock
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('accounting')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'accounting'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Contabilidad Mayorista y Liquidaciones"
                  >
                    <Calculator className="w-4 h-4 shrink-0 text-indigo-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Contabilidad Mayorista</span>
                        <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          Balance
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onOpenGeneratorModal();
                      setIsMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 transition-all text-left border border-indigo-200"
                    title="Crear Landing Page Mayorista"
                  >
                    <FileText className="w-4 h-4 shrink-0 text-indigo-600" />
                    {!isCollapsed && (
                      <span className="truncate">Generar Landing Page</span>
                    )}
                  </button>
                </>
              )}

              {/* CARRIER LOGISTICS PANELS */}
              {!isSuper && effectiveRole === 'carrier' && (
                <>
                  <button
                    onClick={() => handleNav('carrier')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'carrier'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Dashboard de Despacho Logístico"
                  >
                    <Truck className="w-4 h-4 shrink-0 text-blue-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Despacho & Manifiestos</span>
                        <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          En Vivo
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('accounting')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'accounting'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Liquidación de Fletes y Gastos"
                  >
                    <Calculator className="w-4 h-4 shrink-0 text-blue-500" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Liquidación Fletes</span>
                        <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                          COD
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handleNav('track')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      currentView === 'track'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title="Rastreo y Estado de Envíos"
                  >
                    <Search className="w-4 h-4 shrink-0 text-slate-500" />
                    {!isCollapsed && (
                      <span className="truncate">Rastreador de Guías</span>
                    )}
                  </button>
                </>
              )}

              {/* CUSTOMER / BUYER PANELS */}
              {!isSuper && effectiveRole === 'customer' && (
                <>
                  <button
                    onClick={() => {
                      onOpenPartnerModal();
                      setIsMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-all text-left border border-emerald-200"
                    title="Vender en Sanpi Market"
                  >
                    <Store className="w-4 h-4 shrink-0 text-emerald-600" />
                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">Abrir Mi Tienda</span>
                        <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-full ml-1">
                          Vender
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onOpenAuthModal('dropshipper');
                      setIsMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 transition-all text-left border border-purple-200"
                    title="Hacer Dropshipping COD en RD"
                  >
                    <Sparkles className="w-4 h-4 shrink-0 text-purple-600" />
                    {!isCollapsed && (
                      <span className="truncate">Unirme como Dropshipper</span>
                    )}
                  </button>
                </>
              )}

            </div>
          </div>

          {/* SECTION 2: GENERAL MARKETPLACE NAVIGATION */}
          <div>
            {!isCollapsed && (
              <span className="px-2 mb-2 block text-[10px] uppercase font-black tracking-wider text-slate-400">
                Marketplace RD
              </span>
            )}

            <div className="space-y-1">
              <button
                onClick={() => handleNav('explore')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                  currentView === 'explore'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Catálogo General"
              >
                <Compass className="w-4 h-4 shrink-0 text-slate-500" />
                {!isCollapsed && <span className="truncate">Explorar Catálogo</span>}
              </button>

              <button
                onClick={() => handleNav('catalogs')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                  currentView === 'catalogs'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Tiendas Oficiales Dominicanas"
              >
                <Building2 className="w-4 h-4 shrink-0 text-slate-500" />
                {!isCollapsed && <span className="truncate">Tiendas Oficiales</span>}
              </button>

              <button
                onClick={() => handleNav('track')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                  currentView === 'track'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Rastreo de Envíos COD"
              >
                <Search className="w-4 h-4 shrink-0 text-slate-500" />
                {!isCollapsed && <span className="truncate">Rastrear mi Paquete</span>}
              </button>

              <button
                onClick={() => handleNav('accounting')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                  currentView === 'accounting'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Módulo de Contabilidad y Reportes Financieros"
              >
                <Calculator className="w-4 h-4 shrink-0 text-emerald-500" />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">Contabilidad & Reportes</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full ml-1">
                      PDF/XLS
                    </span>
                  </div>
                )}
              </button>

              <button
                onClick={() => {
                  onOpenCart();
                  setIsMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all text-left"
                title="Mi Carrito de Compras"
              >
                <ShoppingBag className="w-4 h-4 shrink-0 text-slate-500" />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">Mi Carrito</span>
                    {cartCount > 0 && (
                      <span className="text-[10px] font-black bg-purple-600 text-white px-2 py-0.5 rounded-full">
                        {cartCount}
                      </span>
                    )}
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 3: REFERRAL CODE (IF LOGGED IN) */}
          {currentUser?.referralCode && !isCollapsed && (
            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-1.5">
              <span className="text-[10px] font-bold text-purple-900 uppercase block tracking-wider">
                Mi Código de Referido
              </span>
              <div className="flex items-center justify-between bg-white border border-purple-200 rounded-xl px-2.5 py-1.5">
                <span className="font-mono text-xs font-black text-purple-700 truncate">
                  {currentUser.referralCode}
                </span>
                <button
                  onClick={handleCopyReferral}
                  className="p-1 rounded-md text-purple-600 hover:text-purple-900 hover:bg-purple-100 transition-colors ml-1 shrink-0"
                  title="Copiar código"
                >
                  {copiedReferral ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-purple-700 font-medium leading-tight">
                Gana comisiones invitando clientes y vendedores.
              </p>
            </div>
          )}

        </div>

        {/* BOTTOM FOOTER / ACTIONS */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          {currentUser ? (
            <button
              onClick={() => {
                onOpenAuthModal();
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-xs font-bold transition-all"
              title="Ajustes de mi Perfil"
            >
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              {!isCollapsed && <span>Mi Perfil & Cuenta</span>}
            </button>
          ) : (
            <button
              onClick={() => {
                onOpenAuthModal();
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              {!isCollapsed && <span>Iniciar Sesión</span>}
            </button>
          )}
        </div>

      </aside>
    </>
  );
};
