import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { OrdersDashboard } from './components/OrdersDashboard';
import { CustomerPurchases } from './components/CustomerPurchases';
import { AccountingWorkspace } from './components/AccountingWorkspace';
import { FeaturedProductsManager } from './components/FeaturedProductsManager';
import { parseFeaturedIds, resolveFeaturedArticles } from './lib/featuredProducts';
import { canViewOrders } from './lib/orderVisibility';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { MarketplaceServices } from './components/MarketplaceServices';
import { HowItWorksSection } from './components/HowItWorksSection';
import { PlansSection } from './components/PlansSection';
import { ExploreView } from './components/ExploreView';
import { StoreCatalogView } from './components/StoreCatalogView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CheckoutModal } from './components/CheckoutModal';
import { TrackingModal } from './components/TrackingModal';
import { AdminPanel } from './components/AdminPanel';
import { PartnerRegistrationModal } from './components/PartnerRegistrationModal';
import { NotificationBanner } from './components/NotificationBanner';
import { DropshipperHub } from './components/DropshipperHub';
import { LandingPageView } from './components/LandingPageView';
import { StoreRegistrationLanding } from './components/StoreRegistrationLanding';
import { LandingPageGeneratorModal } from './components/LandingPageGeneratorModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { WelcomeEmailModal } from './components/WelcomeEmailModal';
import { SachaPackProductBanner } from './components/SachaPackProductBanner';
import { CarrierDashboard } from './components/CarrierDashboard';
import { SupplierDashboard } from './components/SupplierDashboard';
import { CustomerAddressModal } from './components/CustomerAddressModal';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { sanpiManager } from './lib/storeManager';
import { Article, CartItem, Delivery, LandingPageConfig, StorePlan, UserProfile } from './types';
import { db, validateFirebaseConnection } from './lib/firebase';
import { getCurrentStoredUser, isSuperAdmin, setupGlobalAuthObserver } from './lib/authService';
import { canOpenMarketplaceView, isPublicMarketplaceUser } from './lib/publicMarketplaceAccess';
import { rolePanelTheme } from './lib/rolePanelTheme';

export default function App() {
  const [currentView, setCurrentView] = useState<'explore' | 'catalogs' | 'dropship' | 'landing_page' | 'seller_landing' | 'track' | 'partner' | 'admin' | 'carrier' | 'supplier' | 'accounting' | 'orders' | 'featured' | 'purchases'>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackingReturnView, setTrackingReturnView] = useState<'explore' | 'purchases'>('explore');
  const [selectedStoreSlug, setSelectedStoreSlug] = useState<string | null>(null);
  const [activeLpSlug, setActiveLpSlug] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('Distrito Nacional');

  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<'customer' | 'dropshipper' | 'partner'>('customer');
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [welcomeModalUser, setWelcomeModalUser] = useState<UserProfile | null>(null);
  const [customerAddressModalOpen, setCustomerAddressModalOpen] = useState(false);

  // Modals state
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [selectedPlanForRegistration, setSelectedPlanForRegistration] = useState<StorePlan>('pro');
  const [generatorModalOpen, setGeneratorModalOpen] = useState(false);
  const [generatorPreselectedArticle, setGeneratorPreselectedArticle] = useState<Article | null>(null);

  // Sidebar & Admin Tab State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'users' | 'subs' | 'stores' | 'referrals' | 'dropshippers' | 'landing_pages' | 'config' | 'finance' | 'expenses' | 'map' | 'plans' | 'branding'>('users');

  // Manager state subscription
  const [stores, setStores] = useState(sanpiManager.stores);
  const [articles, setArticles] = useState(sanpiManager.articles);
  const [deliveries, setDeliveries] = useState(sanpiManager.deliveries);
  const [transactions, setTransactions] = useState(sanpiManager.transactions);
  const [subscriptions, setSubscriptions] = useState(sanpiManager.subscriptions);
  const [expenses, setExpenses] = useState(sanpiManager.expenses);
  const [landingPages, setLandingPages] = useState(sanpiManager.landingPages);
  const [siteConfig, setSiteConfig] = useState(sanpiManager.siteConfig);
  const [featuredArticleIds, setFeaturedArticleIds] = useState<string[]>([]);

  const [notificationOrder, setNotificationOrder] = useState<Delivery | null>(null);

  // Helper to parse store slug or LP from current URL
  const parseUrlRoute = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const lpParam = urlParams.get('lp');
    const storeParam = urlParams.get('store');

    if (window.location.pathname.replace(/\/+$/, '').toLowerCase() === '/sanpimarketplace') {
      setCurrentView('seller_landing');
      return;
    }

    if (window.location.pathname === '/orders' || window.location.hash === '#/orders') {
      const stored = getCurrentStoredUser();
      setCurrentView(canViewOrders(stored, isSuperAdmin(stored?.email)) ? 'orders' : 'explore');
      return;
    }

    if (window.location.pathname === '/mis-compras' || window.location.hash === '#/mis-compras') {
      const stored = getCurrentStoredUser();
      setCurrentView(stored?.role === 'customer' ? 'purchases' : 'explore');
      return;
    }

    if (lpParam) {
      setActiveLpSlug(lpParam);
      setCurrentView('landing_page');
      return;
    }

    // Check pathname (e.g. /sunombre or /tienda/sunombre) or hash (e.g. #/sunombre)
    let rawPath = window.location.pathname.replace(/^\/+/, '').trim();
    if (rawPath.startsWith('tienda/')) {
      rawPath = rawPath.replace('tienda/', '').trim();
    }
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    const candidate = storeParam || rawPath || hash;
    if (!candidate) {
      setCurrentView('explore');
      return;
    }

    const reserved = ['explore', 'catalogs', 'dropship', 'track', 'partner', 'admin', 'marketplace', 'api', 'landing_page', 'carrier', 'transport', 'supplier', 'proveedor', 'accounting', 'featured', 'mis-compras', ''];
    
    // Restrict direct internal URLs for visitors and customers.
    const stored = getCurrentStoredUser();
    const publicOnly = isPublicMarketplaceUser(stored, isSuperAdmin(stored?.email));

    if (candidate.toLowerCase() === 'carrier' || candidate.toLowerCase() === 'transport' || candidate.toLowerCase() === 'transporte') {
      if (publicOnly) {
        setCurrentView('explore');
        return;
      }
      setCurrentView('carrier');
      return;
    }
    if (candidate.toLowerCase() === 'supplier' || candidate.toLowerCase() === 'proveedor' || candidate.toLowerCase() === 'proveedores') {
      if (publicOnly) {
        setCurrentView('explore');
        return;
      }
      setCurrentView('supplier');
      return;
    }
    if (candidate.toLowerCase() === 'admin' || candidate.toLowerCase() === 'marketplace') {
      if (publicOnly) {
        setCurrentView('explore');
        return;
      }
      setCurrentView('admin');
      return;
    }
    if (candidate.toLowerCase() === 'featured') {
      setCurrentView(publicOnly ? 'explore' : 'featured');
      return;
    }
    if (candidate.toLowerCase() === 'accounting' || candidate.toLowerCase() === 'dropship') {
      if (publicOnly) {
        setCurrentView('explore');
        return;
      }
      setCurrentView(candidate.toLowerCase() as any);
      return;
    }

    if (candidate && !reserved.includes(candidate.toLowerCase())) {
      const match = sanpiManager.stores.find(
        (s) =>
          s.slug?.toLowerCase() === candidate.toLowerCase() ||
          s.id === candidate ||
          s.name.toLowerCase().replace(/[^a-z0-9]/g, '-') === candidate.toLowerCase()
      );
      if (match) {
        setSelectedStoreSlug(match.slug);
        setCurrentView('catalogs');
      } else {
        // Assume it's a store slug and try to open
        setSelectedStoreSlug(candidate);
        setCurrentView('catalogs');
      }
    }
  };

  useEffect(() => {
    validateFirebaseConnection();

    parseUrlRoute();

    const handlePopState = () => {
      parseUrlRoute();
    };
    window.addEventListener('popstate', handlePopState);

    const unsubscribe = sanpiManager.subscribe(() => {
      setStores([...sanpiManager.stores]);
      setArticles([...sanpiManager.articles]);
      setDeliveries([...sanpiManager.deliveries]);
      setTransactions([...sanpiManager.transactions]);
      setSubscriptions([...sanpiManager.subscriptions]);
      setExpenses([...sanpiManager.expenses]);
      setLandingPages([...sanpiManager.landingPages]);
      setSiteConfig({ ...sanpiManager.siteConfig });

      if (sanpiManager.lastNewOrder) {
        setNotificationOrder(sanpiManager.lastNewOrder);
      }
    });
    const unsubscribeFeatured = onSnapshot(doc(db, 'featured_public', 'homepage'), snapshot => {
      setFeaturedArticleIds(parseFeaturedIds(snapshot.data()));
    }, () => setFeaturedArticleIds([]));

    const handleRoleUpdated = (e: any) => {
      const updatedProfile = e.detail as UserProfile;
      const stored = getCurrentStoredUser();
      if (stored) {
        setCurrentUser(stored);
      } else if (updatedProfile) {
        setCurrentUser(prev => (prev?.uid === updatedProfile.uid || prev?.email?.toLowerCase() === updatedProfile.email?.toLowerCase()) ? { ...prev, ...updatedProfile } : prev);
      }
    };
    window.addEventListener('sanpi_user_role_updated', handleRoleUpdated);

    // Global auth observer to auto-sync Google and email logged in users
    const authUnsubscribe = setupGlobalAuthObserver((loadedUser) => {
      setCurrentUser(loadedUser);
      if (loadedUser) parseUrlRoute();
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('sanpi_user_role_updated', handleRoleUpdated);
      authUnsubscribe();
      unsubscribe();
      unsubscribeFeatured();
    };
  }, []);

  // A change of identity immediately removes access to internal views.
  useEffect(() => {
    if (!canOpenMarketplaceView(currentUser, currentView, isSuperAdmin(currentUser?.email))) setCurrentView('explore');
  }, [currentUser, currentView]);

  useEffect(() => {
    if (isPublicMarketplaceUser(currentUser, isSuperAdmin(currentUser?.email))) {
      setSidebarOpen(false);
      setGeneratorModalOpen(false);
      setPartnerModalOpen(false);
      setNotificationOrder(null);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentView === 'featured' && currentUser?.role !== 'admin') setCurrentView('explore');
  }, [currentUser, currentView]);

  useEffect(() => {
    if (currentView === 'orders' && !canViewOrders(currentUser, isSuperAdmin(currentUser?.email))) setCurrentView('explore');
  }, [currentUser, currentView]);

  const handleSetCurrentView = (view: 'explore' | 'catalogs' | 'dropship' | 'landing_page' | 'seller_landing' | 'track' | 'partner' | 'admin' | 'carrier' | 'supplier' | 'accounting' | 'orders' | 'featured' | 'purchases') => {
    if (!canOpenMarketplaceView(currentUser, view, isSuperAdmin(currentUser?.email)) && view !== 'partner') return;
    if (view === 'orders' && !canViewOrders(currentUser, isSuperAdmin(currentUser?.email))) return;
    if (view === 'featured' && currentUser?.role !== 'admin') return;
    if (view === 'track') setTrackingReturnView('explore');
    if (view === 'seller_landing') window.history.pushState({}, '', '/sanpimarketplace');
    else if (view === 'orders') window.history.pushState({}, '', '/orders');
    else if (view === 'purchases') window.history.pushState({}, '', '/mis-compras');
    else if (['/orders', '/mis-compras', '/sanpimarketplace'].includes(window.location.pathname)) window.history.pushState({}, '', '/');
    if (view === 'partner') {
      setSelectedPlanForRegistration('pro');
      setPartnerModalOpen(true);
      return;
    }

    setCurrentView(view);
  };

  const handleSelectStoreSlug = (slug: string | null) => {
    setSelectedStoreSlug(slug);
    if (slug) {
      setCurrentView('catalogs');
      window.history.pushState({}, '', `/${slug}`);
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  const handleOpenLp = (slug: string) => {
    setActiveLpSlug(slug);
    setCurrentView('landing_page');
    window.history.pushState({}, '', `/?lp=${slug}`);
  };

  const handleCloseLp = () => {
    setActiveLpSlug(null);
    setCurrentView('explore');
    window.history.pushState({}, '', '/');
  };

  const handleAddToCart = (article: Article, selectedVariant?: Record<string, string>, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.article.id === article.id);
      if (existing) {
        return prev.map((item) =>
          item.article.id === article.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { article, quantity, selectedVariants: selectedVariant }];
    });
    setCheckoutOpen(true);
  };

  const handleRemoveFromCart = (articleId: string) => {
    setCart((prev) => prev.filter((item) => item.article.id !== articleId));
  };

  const handleUpdateQuantity = (articleId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) => (item.article.id === articleId ? { ...item, quantity } : item))
    );
  };

  const handleResellArticle = (art: Article) => {
    if (!currentUser) {
      setAuthDefaultRole('dropshipper');
      setAuthModalOpen(true);
      return;
    }
    setGeneratorPreselectedArticle(art);
    setGeneratorModalOpen(true);
  };

  const handleSelectPlan = (plan: 'basic' | 'pro' | 'elite' | 'dropshipper') => {
    if (plan === 'dropshipper') {
      if (!currentUser) {
        setAuthDefaultRole('dropshipper');
        setAuthModalOpen(true);
      } else {
        setCurrentView('dropship');
      }
    } else {
      setSelectedPlanForRegistration(plan);
      setPartnerModalOpen(true);
    }
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const publicOnly = isPublicMarketplaceUser(currentUser, isSuperAdmin(currentUser?.email));
  const inRolePanel = !publicOnly && ['admin', 'partner', 'dropship', 'supplier', 'carrier', 'accounting', 'orders', 'featured'].includes(currentView);
  const panelTheme = inRolePanel ? rolePanelTheme(currentUser?.role) : null;

  return (
    <div data-panel-role={panelTheme ? currentUser?.role : undefined} className="marketplace-app min-h-screen bg-[#f7f8fc] text-slate-900 font-sans selection:bg-purple-600 selection:text-white flex flex-col justify-between">
      
      {/* Background Clean Canvas */}
      <div className="fixed inset-0 bg-gradient-to-b from-purple-50/20 via-white to-slate-50/30 -z-10" />

      {/* Left Navigation Sidebar with User Panels by Role */}
      {currentView !== 'landing_page' && currentView !== 'seller_landing' && !publicOnly && (
        <Sidebar
          currentView={currentView}
          setCurrentView={handleSetCurrentView}
          adminInitialTab={adminInitialTab}
          setAdminInitialTab={setAdminInitialTab}
          currentUser={currentUser}
          onOpenAuthModal={(defaultRole) => {
            setAuthDefaultRole(defaultRole || 'dropshipper');
            setAuthModalOpen(true);
          }}
          onOpenPartnerModal={() => {
            setSelectedPlanForRegistration('pro');
            setPartnerModalOpen(true);
          }}
          onOpenGeneratorModal={() => {
            setGeneratorPreselectedArticle(null);
            setGeneratorModalOpen(true);
          }}
          selectedStoreSlug={selectedStoreSlug}
          onSelectStoreSlug={handleSelectStoreSlug}
          cartCount={totalCartCount}
          onOpenCart={() => setCheckoutOpen(true)}
          isMobileOpen={sidebarOpen}
          setIsMobileOpen={setSidebarOpen}
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
          config={siteConfig}
          onOpenAddressModal={() => setCustomerAddressModalOpen(true)}
        />
      )}

      {/* Content Wrapper offset by Left Sidebar on Desktop */}
      <div className={`flex-1 flex flex-col justify-between transition-all duration-300 min-h-screen ${currentView !== 'landing_page' && currentView !== 'seller_landing' && !publicOnly ? (sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72') : ''}`}>

        {/* Main Top Header (hidden in standalone Landing Page view) */}
        {currentView !== 'landing_page' && currentView !== 'seller_landing' && (
          <Navbar
            currentView={currentView}
            setCurrentView={handleSetCurrentView}
            selectedStoreSlug={selectedStoreSlug}
            onSelectStoreSlug={handleSelectStoreSlug}
            cartCount={totalCartCount}
            onOpenCart={() => setCheckoutOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentUser={currentUser}
            onOpenAuthModal={() => {
              setAuthDefaultRole('customer');
              setAuthModalOpen(true);
            }}
            onOpenPartnerModal={() => {
              setSelectedPlanForRegistration('pro');
              setPartnerModalOpen(true);
            }}
            onUserLoggedOut={() => setCurrentUser(null)}
            articles={articles}
            stores={stores}
            onSelectArticle={(art) => setSelectedArticle(art)}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
            config={siteConfig}
            onToggleSidebar={publicOnly ? undefined : () => setSidebarOpen(prev => !prev)}
            isSidebarOpen={sidebarOpen}
            onOpenAddressModal={() => setCustomerAddressModalOpen(true)}
          />
        )}

      {/* App Main Body View Area */}
      <main className={`flex-1 w-full mx-auto ${currentView === 'landing_page' || currentView === 'seller_landing' ? 'px-0 pt-0' : 'max-w-[1600px] xl:max-w-[1720px] 2xl:max-w-[1850px] px-3 sm:px-6 lg:px-8 xl:px-10 pt-4 sm:pt-6'}`}>

        {panelTheme && <div className="role-panel-heading mb-5 rounded-2xl px-5 py-4 text-white" role="banner"><p className="text-[10px] font-black uppercase tracking-[.22em] opacity-80">Panel de {panelTheme.label}</p><p className="mt-1 text-lg font-bold">{panelTheme.area}</p></div>}
        
        {/* LANDING PAGE STANDALONE VIEW (/lp/[slug]) */}
        {currentView === 'landing_page' && activeLpSlug && (
          <LandingPageView
            slug={activeLpSlug}
            onBack={handleCloseLp}
            onOrderSuccess={(delivery) => {
              setDeliveries([...sanpiManager.deliveries]);
            }}
          />
        )}

        {currentView === 'seller_landing' && <StoreRegistrationLanding
          plans={sanpiManager.getPlans(true)}
          onBack={() => handleSetCurrentView('explore')}
          onOpenLogin={() => { setAuthDefaultRole('partner'); setAuthModalOpen(true); }}
        />}

        {/* HOMEPAGE / EXPLORE VIEW */}
        {currentView === 'explore' && (
          <div className="space-y-12 sm:space-y-16">
            
            {/* Hero Section */}
            <HeroSection
              onExploreClick={() => {
                const el = document.getElementById('catalogo');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onJoinClick={() => {
                if (publicOnly) { handleSetCurrentView('seller_landing'); return; }
                if (currentUser) {
                  if (canViewOrders(currentUser, isSuperAdmin(currentUser.email))) handleSetCurrentView('orders');
                  else if (currentUser.role === 'admin') setCurrentView('admin');
                  else setCurrentView('dropship');
                } else {
                  setSelectedPlanForRegistration('pro');
                  setPartnerModalOpen(true);
                }
              }}
              currentUser={currentUser}
              showJoinAction
              totalProductsCount={articles.filter(a => a.status === 'aprobado' && a.isPublic).length}
              totalStoresCount={stores.filter(s => s.isMarketplace && s.isActive).length}
              featuredArticles={resolveFeaturedArticles(featuredArticleIds, articles)}
              onSelectArticle={setSelectedArticle}
              onTrackSearch={(guide) => { setTrackingQuery(guide); setCurrentView('track'); }}
              config={siteConfig}
            />

            {/* Product Explorer */}
            <ExploreView
              articles={articles}
              stores={stores}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectArticle={(art) => setSelectedArticle(art)}
              onAddToCart={handleAddToCart}
              onSelectStore={(slug) => {
                setSelectedStoreSlug(slug);
                setCurrentView('catalogs');
              }}
              currentUser={currentUser}
              onOpenAuthModal={() => {
                setAuthDefaultRole('dropshipper');
                setAuthModalOpen(true);
              }}
              onResellArticle={publicOnly ? undefined : handleResellArticle}
              onViewLandingPage={handleOpenLp}
            />

            <MarketplaceServices
              onExplore={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
              onTrack={() => handleSetCurrentView('track')}
            />

            {/* Sacha Pack Official Product Banner on Main Page */}
            <SachaPackProductBanner
              onTrackClick={() => setCurrentView('track')}
              onExploreClick={() => {
                const el = document.getElementById('catalogo');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* How It Works Section */}
            {!publicOnly && <HowItWorksSection
              onStartAsBuyer={() => {
                const el = document.getElementById('catalogo');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onStartAsSeller={() => {
                setSelectedPlanForRegistration('pro');
                setPartnerModalOpen(true);
              }}
              onStartAsDropshipper={() => {
                if (!currentUser) {
                  setAuthDefaultRole('dropshipper');
                  setAuthModalOpen(true);
                } else {
                  setCurrentView('dropship');
                }
              }}
            />}

            {/* Plans & Subscriptions Section */}
            {!publicOnly && <PlansSection
              onSelectPlan={handleSelectPlan}
              currentUser={currentUser}
            />}

          </div>
        )}

        {currentView === 'orders' && !publicOnly && <OrdersDashboard key={currentUser?.uid} currentUser={currentUser} deliveries={deliveries} stores={stores} landingPages={landingPages} />}
        {currentView === 'purchases' && currentUser?.role === 'customer' && <CustomerPurchases
          key={currentUser.uid}
          currentUser={currentUser}
          articles={articles}
          stores={stores}
          onExplore={() => handleSetCurrentView('explore')}
          onTrack={guide => {
            setTrackingReturnView('purchases');
            setTrackingQuery(guide);
            window.history.pushState({}, '', '/');
            setCurrentView('track');
          }}
        />}

        {/* STORE CATALOGS VIEW */}
        {currentView === 'catalogs' && (
          <StoreCatalogView
            storeSlug={selectedStoreSlug}
            stores={stores}
            articles={articles}
            onBack={() => handleSelectStoreSlug(null)}
            onSelectArticle={(art) => setSelectedArticle(art)}
            onAddToCart={handleAddToCart}
            onSelectStoreSlug={(slug) => handleSelectStoreSlug(slug)}
            currentUser={currentUser}
          />
        )}

        {/* DROPSHIPPING & LANDING PAGES HUB */}
        {currentView === 'dropship' && !publicOnly && (
          <DropshipperHub
            articles={articles}
            stores={stores}
            landingPages={landingPages}
            deliveries={deliveries}
            currentUser={currentUser}
            onOpenAuthModal={() => {
              setAuthDefaultRole('dropshipper');
              setAuthModalOpen(true);
            }}
            onOpenGenerator={(art) => {
              setGeneratorPreselectedArticle(art || null);
              setGeneratorModalOpen(true);
            }}
            onViewLandingPage={handleOpenLp}
            onNavigateToStore={handleSelectStoreSlug}
          />
        )}

        {/* PUBLIC TRACKING VIEW */}
        {currentView === 'track' && (
          <TrackingModal
            deliveries={deliveries}
            initialQuery={trackingQuery}
            backLabel={trackingReturnView === 'purchases' ? 'Volver a mis compras' : undefined}
            onClose={() => { setTrackingQuery(''); handleSetCurrentView(trackingReturnView); setTrackingReturnView('explore'); }}
          />
        )}

        {/* ADMIN PANEL (/marketplace) */}
        {currentView === 'admin' && !publicOnly && (
          <AdminPanel
            stores={stores}
            subscriptions={subscriptions}
            expenses={expenses}
            deliveries={deliveries}
            transactions={transactions}
            articles={articles}
            currentUser={currentUser}
            initialTab={adminInitialTab}
            onViewLandingPage={handleOpenLp}
            onNavigateToAccounting={() => setCurrentView('accounting')}
            onSelectStoreSlug={(slug) => {
              setSelectedStoreSlug(slug);
              setCurrentView('catalogs');
            }}
            onRefresh={() => {
              setStores([...sanpiManager.stores]);
              setArticles([...sanpiManager.articles]);
              setDeliveries([...sanpiManager.deliveries]);
              setTransactions([...sanpiManager.transactions]);
              setSubscriptions([...sanpiManager.subscriptions]);
              setExpenses([...sanpiManager.expenses]);
              setLandingPages([...sanpiManager.landingPages]);
            }}
          />
        )}

        {currentView === 'accounting' && !publicOnly && currentUser && (
          <AccountingWorkspace currentUser={currentUser} stores={stores} articles={articles} deliveries={deliveries} transactions={transactions} expenses={expenses} landingPages={landingPages} />
        )}

        {currentView === 'featured' && !publicOnly && currentUser?.role === 'admin' && (
          <FeaturedProductsManager currentUser={currentUser} articles={articles} />
        )}

        {/* CARRIER / TRANSPORT DASHBOARD */}
        {currentView === 'carrier' && !publicOnly && (
          <CarrierDashboard
            currentUser={currentUser}
            onBackToMarketplace={() => setCurrentView('explore')}
          />
        )}

        {/* SUPPLIER WHOLESALE DASHBOARD */}
        {currentView === 'supplier' && !publicOnly && (
          <SupplierDashboard
            currentUser={currentUser}
            onBackToMarketplace={() => setCurrentView('explore')}
            onOpenLandingGenerator={() => {
              setGeneratorPreselectedArticle(null);
              setGeneratorModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedArticle && (
        <ProductDetailModal
          article={selectedArticle}
          stores={stores}
          onClose={() => setSelectedArticle(null)}
          onAddToCart={handleAddToCart}
          onSelectStoreSlug={(slug) => {
            setSelectedStoreSlug(slug);
            setCurrentView('catalogs');
          }}
        />
      )}

      {/* Checkout COD Modal */}
      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          onClose={() => setCheckoutOpen(false)}
          onClearCart={() => setCart([])}
          onRemoveFromCart={handleRemoveFromCart}
          onUpdateQuantity={handleUpdateQuantity}
          currentUser={currentUser}
          onOpenAddressModal={() => setCustomerAddressModalOpen(true)}
          onOrderSuccess={(delivery) => {
            setDeliveries([...sanpiManager.deliveries]);
          }}
          onViewPurchases={() => {
            setCheckoutOpen(false);
            handleSetCurrentView('purchases');
          }}
        />
      )}

      {/* Customer Shipping Address Profile Modal */}
      <CustomerAddressModal
        isOpen={!publicOnly && customerAddressModalOpen}
        onClose={() => setCustomerAddressModalOpen(false)}
        currentUser={currentUser}
        onAddressSaved={(updatedProfile) => {
          setCurrentUser(updatedProfile);
        }}
      />

      {/* Partner Registration Modal */}
      {!publicOnly && partnerModalOpen && (
        <PartnerRegistrationModal
          initialPlan={selectedPlanForRegistration}
          onClose={() => setPartnerModalOpen(false)}
          onSuccess={() => {
            setSubscriptions([...sanpiManager.subscriptions]);
            setPartnerModalOpen(false);
          }}
        />
      )}

      {/* Landing Page Generator Modal */}
      {!publicOnly && generatorModalOpen && (
        <LandingPageGeneratorModal
          preselectedArticle={generatorPreselectedArticle}
          onClose={() => {
            setGeneratorModalOpen(false);
            setGeneratorPreselectedArticle(null);
          }}
          onSuccess={(newLp) => {
            setLandingPages([...sanpiManager.landingPages]);
            handleOpenLp(newLp.slug);
          }}
        />
      )}

      {/* Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        defaultRole={authDefaultRole}
        onUserChange={(user) => {
          setCurrentUser(user);
          if (user?.role === 'partner' && !user.storeName) {
            setSelectedPlanForRegistration('pro');
            setPartnerModalOpen(true);
          }
        }}
        onRoleSelected={(role) => {
          if (role === 'partner') {
            setSelectedPlanForRegistration('pro');
            setPartnerModalOpen(true);
          } else if (role === 'dropshipper') {
            setCurrentView('dropship');
          }
        }}
        onRegisteredSuccess={(user) => {
          setWelcomeModalUser(user);
          setWelcomeModalOpen(true);
        }}
      />

      {/* Welcome Email Dispatch & Referral Code Confirmation Modal */}
      <WelcomeEmailModal
        isOpen={welcomeModalOpen}
        onClose={() => setWelcomeModalOpen(false)}
        user={welcomeModalUser || currentUser}
        onNavigateToWorkspace={(role) => {
          if (role === 'partner') {
            setSelectedStoreSlug(currentUser?.storeName ? currentUser.storeName.toLowerCase().replace(/[^a-z0-9]/g, '-') : null);
            setCurrentView('catalogs');
          } else if (role === 'dropshipper') {
            setCurrentView('dropship');
          } else {
            setCurrentView('explore');
          }
        }}
      />

      {/* Real-time Order Notification Banner with TTS Voice */}
      {!publicOnly && <NotificationBanner
        order={notificationOrder}
        onDismiss={() => setNotificationOrder(null)}
        onViewOrder={(order) => {
          setCurrentView('track');
        }}
      />}

      {/* Global Minimalist Footer */}
      {currentView !== 'landing_page' && currentView !== 'seller_landing' && (
        <Footer
          onNav={handleSetCurrentView}
          onOpenAuth={() => {
            setAuthDefaultRole('dropshipper');
            setAuthModalOpen(true);
          }}
          config={siteConfig}
          showBusinessLinks={!publicOnly}
        />
      )}

      </div>

      {/* Floating Official Sanpi WhatsApp Support Button (809-676-6690) */}
      {!checkoutOpen && currentView !== 'landing_page' && currentView !== 'seller_landing' && (
        <FloatingWhatsApp
          phoneNumber="18096766690"
          defaultMessage="Hola Sanpi Market, necesito asistencia con una orden o servicio."
        />
      )}

    </div>
  );
}
