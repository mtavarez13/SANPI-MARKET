import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
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
import { LandingPageGeneratorModal } from './components/LandingPageGeneratorModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { WelcomeEmailModal } from './components/WelcomeEmailModal';
import { SachaPackProductBanner } from './components/SachaPackProductBanner';
import { CarrierDashboard } from './components/CarrierDashboard';
import { SupplierDashboard } from './components/SupplierDashboard';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { sanpiManager } from './lib/storeManager';
import { Article, CartItem, Delivery, LandingPageConfig, StorePlan, UserProfile } from './types';
import { validateFirebaseConnection } from './lib/firebase';
import { getCurrentStoredUser, isSuperAdmin, setupGlobalAuthObserver } from './lib/authService';

export default function App() {
  const [currentView, setCurrentView] = useState<'explore' | 'catalogs' | 'dropship' | 'landing_page' | 'track' | 'partner' | 'admin' | 'carrier' | 'supplier'>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreSlug, setSelectedStoreSlug] = useState<string | null>(null);
  const [activeLpSlug, setActiveLpSlug] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('Distrito Nacional');

  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentStoredUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<'customer' | 'dropshipper' | 'partner'>('dropshipper');
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [welcomeModalUser, setWelcomeModalUser] = useState<UserProfile | null>(null);

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

  const [notificationOrder, setNotificationOrder] = useState<Delivery | null>(null);

  // Helper to parse store slug or LP from current URL
  const parseUrlRoute = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const lpParam = urlParams.get('lp');
    const storeParam = urlParams.get('store');

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

    const reserved = ['explore', 'catalogs', 'dropship', 'track', 'partner', 'admin', 'marketplace', 'api', 'landing_page', 'carrier', 'transport', 'supplier', 'proveedor', ''];
    if (candidate.toLowerCase() === 'carrier' || candidate.toLowerCase() === 'transport' || candidate.toLowerCase() === 'transporte') {
      setCurrentView('carrier');
      return;
    }
    if (candidate.toLowerCase() === 'supplier' || candidate.toLowerCase() === 'proveedor' || candidate.toLowerCase() === 'proveedores') {
      setCurrentView('supplier');
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

    // Check stored user
    const stored = getCurrentStoredUser();
    if (stored) {
      setCurrentUser(stored);
    }

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
      if (loadedUser) {
        setCurrentUser(loadedUser);
      }
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('sanpi_user_role_updated', handleRoleUpdated);
      authUnsubscribe();
      unsubscribe();
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-purple-600 selection:text-white flex flex-col justify-between">
      
      {/* Background Clean Canvas */}
      <div className="fixed inset-0 bg-gradient-to-b from-purple-50/20 via-white to-slate-50/30 -z-10" />

      {/* Left Navigation Sidebar with User Panels by Role */}
      {currentView !== 'landing_page' && (
        <Sidebar
          currentView={currentView}
          setCurrentView={(view) => {
            if (view === 'partner') {
              setPartnerModalOpen(true);
            } else {
              setCurrentView(view);
            }
          }}
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
        />
      )}

      {/* Content Wrapper offset by Left Sidebar on Desktop */}
      <div className={`flex-1 flex flex-col justify-between transition-all duration-300 min-h-screen ${currentView !== 'landing_page' ? (sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72') : ''}`}>

        {/* Main Top Header (hidden in standalone Landing Page view) */}
        {currentView !== 'landing_page' && (
          <Navbar
            currentView={currentView === 'landing_page' ? 'dropship' : currentView}
            setCurrentView={(view) => {
              if (view === 'partner') {
                setPartnerModalOpen(true);
              } else {
                setCurrentView(view);
              }
            }}
            selectedStoreSlug={selectedStoreSlug}
            onSelectStoreSlug={handleSelectStoreSlug}
            cartCount={totalCartCount}
            onOpenCart={() => setCheckoutOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentUser={currentUser}
            onOpenAuthModal={() => {
              setAuthDefaultRole('dropshipper');
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
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            isSidebarOpen={sidebarOpen}
          />
        )}

      {/* App Main Body View Area */}
      <main className={`flex-1 w-full mx-auto ${currentView === 'landing_page' ? 'px-0 pt-0' : 'max-w-[1600px] xl:max-w-[1720px] 2xl:max-w-[1850px] px-3 sm:px-6 lg:px-8 xl:px-10 pt-4 sm:pt-6'}`}>
        
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
                if (currentUser) {
                  if (currentUser.role === 'partner') setCurrentView('catalogs');
                  else if (currentUser.role === 'admin') setCurrentView('admin');
                  else setCurrentView('dropship');
                } else {
                  setSelectedPlanForRegistration('pro');
                  setPartnerModalOpen(true);
                }
              }}
              currentUser={currentUser}
              totalProductsCount={articles.filter(a => a.status === 'aprobado' && a.isPublic).length}
              totalStoresCount={stores.filter(s => s.isMarketplace).length}
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
              onResellArticle={handleResellArticle}
              onViewLandingPage={handleOpenLp}
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
            <HowItWorksSection
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
            />

            {/* Plans & Subscriptions Section */}
            <PlansSection
              onSelectPlan={handleSelectPlan}
              currentUser={currentUser}
            />

          </div>
        )}

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
        {currentView === 'dropship' && (
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
            onClose={() => setCurrentView('explore')}
          />
        )}

        {/* ADMIN PANEL (/marketplace) */}
        {currentView === 'admin' && (
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

        {/* CARRIER / TRANSPORT DASHBOARD */}
        {currentView === 'carrier' && (
          <CarrierDashboard
            currentUser={currentUser}
            onBackToMarketplace={() => setCurrentView('explore')}
          />
        )}

        {/* SUPPLIER WHOLESALE DASHBOARD */}
        {currentView === 'supplier' && (
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
          onOrderSuccess={(delivery) => {
            setDeliveries([...sanpiManager.deliveries]);
          }}
        />
      )}

      {/* Partner Registration Modal */}
      {partnerModalOpen && (
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
      {generatorModalOpen && (
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
      <NotificationBanner
        order={notificationOrder}
        onDismiss={() => setNotificationOrder(null)}
        onViewOrder={(order) => {
          setCurrentView('track');
        }}
      />

      {/* Global Minimalist Footer */}
      {currentView !== 'landing_page' && (
        <Footer
          onNav={(view) => {
            if (view === 'partner') {
              setSelectedPlanForRegistration('pro');
              setPartnerModalOpen(true);
            } else {
              setCurrentView(view);
            }
          }}
          onOpenAuth={() => {
            setAuthDefaultRole('dropshipper');
            setAuthModalOpen(true);
          }}
          config={siteConfig}
        />
      )}

      </div>

      {/* Floating Official Sanpi WhatsApp Support Button (809-676-6690) */}
      <FloatingWhatsApp
        phoneNumber="18096766690"
        defaultMessage="Hola Sanpi Market, necesito asistencia con una orden o servicio."
      />

    </div>
  );
}
