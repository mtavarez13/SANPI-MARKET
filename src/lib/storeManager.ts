import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, SANPI_FLAT_SHIPPING_FEE } from './firebase';
import { Article, Delivery, Expense, MarketplaceSubscription, Store, Transaction, LandingPageConfig, DropshipItem, SachaPackWebhookPayload, SachaPackWebhookResponse, LogisticsProviderConfig, PaymentMethod, UserLocationProfile, StoreReferralRecord, LogisticsConnectionTestResult, LogisticsInboundWebhookPayload, SanpiPlan, SiteThemeConfig, BankAccount, CarrierUser, DeliveryStatus } from '../types';
import { INITIAL_ARTICLES, INITIAL_DELIVERIES, INITIAL_EXPENSES, INITIAL_STORES, INITIAL_SUBSCRIPTIONS, INITIAL_TRANSACTIONS, INITIAL_LANDING_PAGES, INITIAL_DROPSHIP_ITEMS, INITIAL_STORE_REFERRALS, DEFAULT_SANPI_PLANS, INITIAL_CARRIER_USERS } from '../data/seedData';
import { DEFAULT_SITE_THEME_CONFIG, DEFAULT_BANK_ACCOUNTS } from '../data/siteThemePresets';
import { speakSanpi } from './audioTTS';
import {
  buildSachaPackPayload,
  sendToSachaPackWebhook,
  sendToLogisticsWebhook,
  testLogisticsConnection,
  DEFAULT_SACHA_PACK_STORE_ID,
  DEFAULT_SACHA_PACK_API_KEY,
  SACHA_PACK_WEBHOOK_URL,
  DEFAULT_LOGISTICS_PROVIDERS,
  DEFAULT_LOGISTICS_JSON_TEMPLATE,
  populateJsonTemplate
} from './sachaPackApi';

// Local storage key constants for instant hydration and offline resilience
const LS_STORES = 'sanpi_stores';
const LS_ARTICLES = 'sanpi_articles';
const LS_DELIVERIES = 'sanpi_deliveries';
const LS_TRANSACTIONS = 'sanpi_transactions';
const LS_SUBSCRIPTIONS = 'sanpi_subscriptions';
const LS_EXPENSES = 'sanpi_expenses';
const LS_LANDING_PAGES = 'sanpi_landing_pages';
const LS_DROPSHIP_ITEMS = 'sanpi_dropship_items';
const LS_LOGISTICS_PROVIDERS = 'sanpi_logistics_providers';
const LS_STORE_REFERRALS = 'sanpi_store_referrals';
const LS_PLANS = 'sanpi_membership_plans';
const LS_SITE_THEME_CONFIG = 'sanpi_site_theme_config';
const LS_CARRIER_USERS = 'sanpi_carrier_users';

export class SanpiStoreManager {
  private static instance: SanpiStoreManager;

  public stores: Store[] = [];
  public articles: Article[] = [];
  public deliveries: Delivery[] = [];
  public transactions: Transaction[] = [];
  public subscriptions: MarketplaceSubscription[] = [];
  public expenses: Expense[] = [];
  public landingPages: LandingPageConfig[] = [];
  public dropshipItems: DropshipItem[] = [];
  public logisticsProviders: LogisticsProviderConfig[] = [];
  public storeReferrals: StoreReferralRecord[] = [];
  public plans: SanpiPlan[] = [];
  public siteConfig: SiteThemeConfig = DEFAULT_SITE_THEME_CONFIG;
  public carrierUsers: CarrierUser[] = [];

  private listeners: Set<() => void> = new Set();
  public lastNewOrder: Delivery | null = null;

  private constructor() {
    this.loadFromLocalStorage();
    this.initFirestoreSync();
  }

  public static getInstance(): SanpiStoreManager {
    if (!SanpiStoreManager.instance) {
      SanpiStoreManager.instance = new SanpiStoreManager();
    }
    return SanpiStoreManager.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(LS_STORES, JSON.stringify(this.stores));
      localStorage.setItem(LS_ARTICLES, JSON.stringify(this.articles));
      localStorage.setItem(LS_DELIVERIES, JSON.stringify(this.deliveries));
      localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(this.transactions));
      localStorage.setItem(LS_SUBSCRIPTIONS, JSON.stringify(this.subscriptions));
      localStorage.setItem(LS_EXPENSES, JSON.stringify(this.expenses));
      localStorage.setItem(LS_LANDING_PAGES, JSON.stringify(this.landingPages));
      localStorage.setItem(LS_DROPSHIP_ITEMS, JSON.stringify(this.dropshipItems));
      localStorage.setItem(LS_LOGISTICS_PROVIDERS, JSON.stringify(this.logisticsProviders));
      localStorage.setItem(LS_STORE_REFERRALS, JSON.stringify(this.storeReferrals));
      localStorage.setItem(LS_PLANS, JSON.stringify(this.plans));
      localStorage.setItem(LS_SITE_THEME_CONFIG, JSON.stringify(this.siteConfig));
      localStorage.setItem(LS_CARRIER_USERS, JSON.stringify(this.carrierUsers));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  private loadFromLocalStorage() {
    try {
      const storesRaw = localStorage.getItem(LS_STORES);
      const articlesRaw = localStorage.getItem(LS_ARTICLES);
      const deliveriesRaw = localStorage.getItem(LS_DELIVERIES);
      const transactionsRaw = localStorage.getItem(LS_TRANSACTIONS);
      const subsRaw = localStorage.getItem(LS_SUBSCRIPTIONS);
      const expRaw = localStorage.getItem(LS_EXPENSES);
      const lpRaw = localStorage.getItem(LS_LANDING_PAGES);
      const dsRaw = localStorage.getItem(LS_DROPSHIP_ITEMS);
      const provRaw = localStorage.getItem(LS_LOGISTICS_PROVIDERS);
      const refRaw = localStorage.getItem(LS_STORE_REFERRALS);
      const plansRaw = localStorage.getItem(LS_PLANS);
      const siteConfigRaw = localStorage.getItem(LS_SITE_THEME_CONFIG);
      const carriersRaw = localStorage.getItem(LS_CARRIER_USERS);

      this.carrierUsers = carriersRaw ? JSON.parse(carriersRaw) : INITIAL_CARRIER_USERS;

      if (siteConfigRaw) {
        try {
          this.siteConfig = { ...DEFAULT_SITE_THEME_CONFIG, ...JSON.parse(siteConfigRaw) };
        } catch {
          this.siteConfig = DEFAULT_SITE_THEME_CONFIG;
        }
      } else {
        this.siteConfig = DEFAULT_SITE_THEME_CONFIG;
      }

      const parsedStores: Store[] = storesRaw ? JSON.parse(storesRaw) : INITIAL_STORES;
      const parsedArticles: Article[] = articlesRaw ? JSON.parse(articlesRaw) : INITIAL_ARTICLES;

      // Ensure stores have valid theme & contact
      this.stores = parsedStores.map(s => {
        const seedMatch = INITIAL_STORES.find(init => init.id === s.id || init.slug === s.slug);
        return {
          ...seedMatch,
          ...s,
          bannerUrl: s.bannerUrl || s.coverImageUrl || seedMatch?.bannerUrl || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400',
          coverImageUrl: s.coverImageUrl || s.bannerUrl || seedMatch?.coverImageUrl || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400',
          theme: s.theme || seedMatch?.theme || { primaryColor: '#2563eb', secondaryColor: '#0f172a', fontFamily: 'Inter' },
          contact: s.contact || seedMatch?.contact || { email: s.ownerEmail || 'info@sanpi.do', phone: s.phone || '809-555-0100', whatsapp: s.phone?.replace(/\D/g, '') || '8095550100' },
          rating: s.rating ?? seedMatch?.rating ?? 4.8,
          totalReviews: s.totalReviews ?? seedMatch?.totalReviews ?? 150,
          isActive: s.isActive ?? true,
          ownerId: s.ownerId || seedMatch?.ownerId || 'owner_default',
          referralCode: s.referralCode || seedMatch?.referralCode || `SANPI-${(s.slug || s.id).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}`,
          referralDiscountPercent: s.referralDiscountPercent ?? seedMatch?.referralDiscountPercent ?? 10,
          referralDiscountStatus: s.referralDiscountStatus || seedMatch?.referralDiscountStatus || 'activo',
          referralDiscountNote: s.referralDiscountNote || seedMatch?.referralDiscountNote || 'Descuento del programa de referidos',
          totalReferredStoresCount: s.totalReferredStoresCount ?? seedMatch?.totalReferredStoresCount ?? 0,
          totalReferralSavings: s.totalReferralSavings ?? seedMatch?.totalReferralSavings ?? 0,
          referralProgramActive: s.referralProgramActive ?? seedMatch?.referralProgramActive ?? true
        };
      });

      // Ensure articles have valid variants & specs
      this.articles = parsedArticles.map(a => {
        const seedMatch = INITIAL_ARTICLES.find(init => init.id === a.id || init.slug === a.slug);
        const imagesList = a.images && a.images.length > 0 ? a.images : (a.gallery && a.gallery.length > 0 ? a.gallery : [a.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800']);
        return {
          ...seedMatch,
          ...a,
          title: a.title || a.name || seedMatch?.title || 'Producto Sanpi',
          name: a.name || a.title || seedMatch?.name || 'Producto Sanpi',
          images: imagesList,
          image: imagesList[0] || a.image,
          gallery: imagesList,
          variants: (a.variants && a.variants.length > 0) ? a.variants : (seedMatch?.variants || [
            { name: 'Color / Modelo', options: ['Estándar', 'Edición Especial'] }
          ]),
          specifications: a.specifications || seedMatch?.specifications || {
            'Garantía': 'Garantía oficial directa en República Dominicana',
            'Despacho': 'Manejado por Sacha Pack Express (24-48 hrs)',
            'Pago': 'Cobro Contra Entrega (COD) disponible'
          },
          compareAtPrice: a.compareAtPrice || seedMatch?.compareAtPrice || Math.round(a.price * 1.3),
          costPerItem: a.costPerItem || a.wholesalePrice || seedMatch?.costPerItem || Math.round(a.price * 0.65),
          wholesalePrice: a.wholesalePrice || a.costPerItem || seedMatch?.wholesalePrice || Math.round(a.price * 0.65),
          inventory: a.inventory ?? a.stock ?? seedMatch?.inventory ?? 25,
          stock: a.stock ?? a.inventory ?? seedMatch?.stock ?? 25,
          rating: a.rating ?? seedMatch?.rating ?? 4.8,
          reviewCount: a.reviewCount ?? seedMatch?.reviewCount ?? (a.reviews?.length || 24),
          reviews: a.reviews && a.reviews.length > 0 ? a.reviews : (seedMatch?.reviews || [])
        };
      });
      this.deliveries = deliveriesRaw ? JSON.parse(deliveriesRaw) : INITIAL_DELIVERIES;
      this.transactions = transactionsRaw ? JSON.parse(transactionsRaw) : INITIAL_TRANSACTIONS;
      this.subscriptions = subsRaw ? JSON.parse(subsRaw) : INITIAL_SUBSCRIPTIONS;
      this.expenses = expRaw ? JSON.parse(expRaw) : INITIAL_EXPENSES;
      this.landingPages = lpRaw ? JSON.parse(lpRaw) : INITIAL_LANDING_PAGES;
      this.dropshipItems = dsRaw ? JSON.parse(dsRaw) : INITIAL_DROPSHIP_ITEMS;
      this.storeReferrals = refRaw ? JSON.parse(refRaw) : INITIAL_STORE_REFERRALS;
      this.plans = plansRaw ? JSON.parse(plansRaw) : DEFAULT_SANPI_PLANS;
      if (!this.plans || this.plans.length === 0) {
        this.plans = DEFAULT_SANPI_PLANS;
      }
      const parsedProviders: LogisticsProviderConfig[] = provRaw ? JSON.parse(provRaw) : DEFAULT_LOGISTICS_PROVIDERS;
      
      // Auto-migrate Sacha Pack Logistics to the active webhook endpoint and API key
      this.logisticsProviders = parsedProviders.map(p => {
        if (p.id === 'prov_sacha_pack' || p.code === 'sacha_pack') {
          return {
            ...p,
            webhookUrl: p.webhookUrl.includes('sachapack.com') ? SACHA_PACK_WEBHOOK_URL : p.webhookUrl,
            apiKey: p.apiKey || DEFAULT_SACHA_PACK_API_KEY,
            authToken: p.authToken || DEFAULT_SACHA_PACK_API_KEY,
            defaultStoreId: p.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'x-api-key': p.apiKey || DEFAULT_SACHA_PACK_API_KEY,
              ...(p.headers || {})
            }
          };
        }
        return p;
      });
    } catch (e) {
      console.warn('Fallback to seed data', e);
      this.stores = INITIAL_STORES;
      this.articles = INITIAL_ARTICLES;
      this.deliveries = INITIAL_DELIVERIES;
      this.transactions = INITIAL_TRANSACTIONS;
      this.subscriptions = INITIAL_SUBSCRIPTIONS;
      this.expenses = INITIAL_EXPENSES;
      this.landingPages = INITIAL_LANDING_PAGES;
      this.dropshipItems = INITIAL_DROPSHIP_ITEMS;
      this.storeReferrals = INITIAL_STORE_REFERRALS;
      this.logisticsProviders = DEFAULT_LOGISTICS_PROVIDERS;
      this.carrierUsers = INITIAL_CARRIER_USERS;
    }
  }

  private async initFirestoreSync() {
    try {
      // 1. Stores
      const storesSnapshot = await getDocs(collection(db, 'stores')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'stores');
        return null;
      });

      if (!storesSnapshot || storesSnapshot.empty) {
        for (const s of INITIAL_STORES) {
          await setDoc(doc(db, 'stores', s.id), s).catch(err => handleFirestoreError(err, OperationType.WRITE, `stores/${s.id}`));
        }
      } else {
        this.stores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      }

      // 2. Articles
      const articlesSnapshot = await getDocs(collection(db, 'articles')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'articles');
        return null;
      });

      if (!articlesSnapshot || articlesSnapshot.empty) {
        for (const a of INITIAL_ARTICLES) {
          await setDoc(doc(db, 'articles', a.id), a).catch(err => handleFirestoreError(err, OperationType.WRITE, `articles/${a.id}`));
        }
      } else {
        this.articles = articlesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
      }

      // 3. Deliveries
      const deliveriesSnapshot = await getDocs(collection(db, 'deliveries')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'deliveries');
        return null;
      });

      if (!deliveriesSnapshot || deliveriesSnapshot.empty) {
        for (const d of INITIAL_DELIVERIES) {
          await setDoc(doc(db, 'deliveries', d.id), d).catch(err => handleFirestoreError(err, OperationType.WRITE, `deliveries/${d.id}`));
        }
      } else {
        this.deliveries = deliveriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Delivery));
      }

      // 4. Transactions
      const txSnapshot = await getDocs(collection(db, 'transactions')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'transactions');
        return null;
      });

      if (!txSnapshot || txSnapshot.empty) {
        for (const t of INITIAL_TRANSACTIONS) {
          await setDoc(doc(db, 'transactions', t.id), t).catch(err => handleFirestoreError(err, OperationType.WRITE, `transactions/${t.id}`));
        }
      } else {
        this.transactions = txSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      }

      // 5. Subscriptions
      const subSnapshot = await getDocs(collection(db, 'marketplace_subscriptions')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'marketplace_subscriptions');
        return null;
      });

      if (!subSnapshot || subSnapshot.empty) {
        for (const sub of INITIAL_SUBSCRIPTIONS) {
          await setDoc(doc(db, 'marketplace_subscriptions', sub.id), sub).catch(err => handleFirestoreError(err, OperationType.WRITE, `marketplace_subscriptions/${sub.id}`));
        }
      } else {
        this.subscriptions = subSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceSubscription));
      }

      // 6. Expenses
      const expSnapshot = await getDocs(collection(db, 'expenses')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'expenses');
        return null;
      });

      if (!expSnapshot || expSnapshot.empty) {
        for (const exp of INITIAL_EXPENSES) {
          await setDoc(doc(db, 'expenses', exp.id), exp).catch(err => handleFirestoreError(err, OperationType.WRITE, `expenses/${exp.id}`));
        }
      } else {
        this.expenses = expSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      }

      // 7. Landing Pages
      const lpSnapshot = await getDocs(collection(db, 'landing_pages')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'landing_pages');
        return null;
      });

      if (!lpSnapshot || lpSnapshot.empty) {
        for (const lp of INITIAL_LANDING_PAGES) {
          await setDoc(doc(db, 'landing_pages', lp.id), lp).catch(err => handleFirestoreError(err, OperationType.WRITE, `landing_pages/${lp.id}`));
        }
      } else {
        this.landingPages = lpSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LandingPageConfig));
      }

      // 8. Dropship Items
      const dsSnapshot = await getDocs(collection(db, 'dropship_items')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'dropship_items');
        return null;
      });

      if (!dsSnapshot || dsSnapshot.empty) {
        for (const ds of INITIAL_DROPSHIP_ITEMS) {
          await setDoc(doc(db, 'dropship_items', ds.id), ds).catch(err => handleFirestoreError(err, OperationType.WRITE, `dropship_items/${ds.id}`));
        }
      } else {
        this.dropshipItems = dsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DropshipItem));
      }

      // 9. Logistics Providers (Multi-company)
      const provSnapshot = await getDocs(collection(db, 'logistics_providers')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'logistics_providers');
        return null;
      });

      if (!provSnapshot || provSnapshot.empty) {
        for (const p of DEFAULT_LOGISTICS_PROVIDERS) {
          await setDoc(doc(db, 'logistics_providers', p.id), p).catch(err => handleFirestoreError(err, OperationType.WRITE, `logistics_providers/${p.id}`));
        }
      } else {
        const docsProviders = provSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogisticsProviderConfig));
        this.logisticsProviders = docsProviders.map(p => {
          if (p.id === 'prov_sacha_pack' || p.code === 'sacha_pack') {
            const isOutdated = p.webhookUrl.includes('sachapack.com') || !p.apiKey;
            if (isOutdated) {
              const updatedProv = {
                ...p,
                webhookUrl: SACHA_PACK_WEBHOOK_URL,
                apiKey: DEFAULT_SACHA_PACK_API_KEY,
                authToken: DEFAULT_SACHA_PACK_API_KEY,
                defaultStoreId: p.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID,
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'x-api-key': DEFAULT_SACHA_PACK_API_KEY,
                  ...(p.headers || {})
                }
              };
              setDoc(doc(db, 'logistics_providers', p.id), updatedProv).catch(() => {});
              return updatedProv;
            }
          }
          return p;
        });
      }

      // 10. Store Referrals
      const refSnapshot = await getDocs(collection(db, 'store_referrals')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'store_referrals');
        return null;
      });

      if (!refSnapshot || refSnapshot.empty) {
        for (const r of INITIAL_STORE_REFERRALS) {
          await setDoc(doc(db, 'store_referrals', r.id), r).catch(err => handleFirestoreError(err, OperationType.WRITE, `store_referrals/${r.id}`));
        }
      } else {
        this.storeReferrals = refSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreReferralRecord));
      }

      // 11. Membership Plans (Admin dynamic plans)
      const plansSnapshot = await getDocs(collection(db, 'membership_plans')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'membership_plans');
        return null;
      });

      if (!plansSnapshot || plansSnapshot.empty) {
        for (const plan of DEFAULT_SANPI_PLANS) {
          await setDoc(doc(db, 'membership_plans', plan.id), plan).catch(err => handleFirestoreError(err, OperationType.WRITE, `membership_plans/${plan.id}`));
        }
        this.plans = DEFAULT_SANPI_PLANS;
      } else {
        this.plans = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SanpiPlan));
      }

      // 12. Site Global Theme & Video Background Settings
      const siteConfigDoc = await getDoc(doc(db, 'site_settings', 'global_theme')).catch(err => {
        handleFirestoreError(err, OperationType.GET, 'site_settings/global_theme');
        return null;
      });

      if (!siteConfigDoc || !siteConfigDoc.exists()) {
        await setDoc(doc(db, 'site_settings', 'global_theme'), this.siteConfig).catch(err =>
          handleFirestoreError(err, OperationType.WRITE, 'site_settings/global_theme')
        );
      } else {
        this.siteConfig = { ...DEFAULT_SITE_THEME_CONFIG, ...siteConfigDoc.data() as SiteThemeConfig };
      }

      this.saveToLocalStorage();
      this.notify();

      // Listen for real-time delivery orders
      this.setupRealtimeListeners();
    } catch (error) {
      console.warn('Sanpi Firestore init warning:', error);
      this.saveToLocalStorage();
      this.notify();
    }
  }

  private setupRealtimeListeners() {
    try {
      const deliveriesQuery = query(collection(db, 'deliveries'), orderBy('createdAt', 'desc'));
      onSnapshot(deliveriesQuery, (snapshot) => {
        let isInitial = this.deliveries.length === 0;
        const updatedDeliveries: Delivery[] = [];
        snapshot.forEach((doc) => {
          updatedDeliveries.push({ id: doc.id, ...doc.data() } as Delivery);
        });

        if (!isInitial && updatedDeliveries.length > this.deliveries.length) {
          // New delivery arrived! Check if it's a marketplace order
          const latest = updatedDeliveries[0];
          if (latest && latest.isMarketplaceOrder) {
            this.lastNewOrder = latest;
            speakSanpi();
          }
        }

        this.deliveries = updatedDeliveries;
        this.saveToLocalStorage();
        this.notify();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'deliveries');
      });

      // Realtime listener for membership plans
      onSnapshot(collection(db, 'membership_plans'), (snapshot) => {
        if (!snapshot.empty) {
          this.plans = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SanpiPlan));
          this.saveToLocalStorage();
          this.notify();
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'membership_plans');
      });

      // Realtime listener for site global theme config
      onSnapshot(doc(db, 'site_settings', 'global_theme'), (docSnapshot) => {
        if (docSnapshot.exists()) {
          this.siteConfig = { ...DEFAULT_SITE_THEME_CONFIG, ...docSnapshot.data() as SiteThemeConfig };
          this.saveToLocalStorage();
          this.notify();
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'site_settings/global_theme');
      });
    } catch (err) {
      console.warn("Realtime listener setup skipped:", err);
    }
  }

  // --- ACTIONS ---

  // 0. Update Site Global Theme & Video Background Config
  public async updateSiteThemeConfig(partialConfig: Partial<SiteThemeConfig>): Promise<SiteThemeConfig> {
    const updated: SiteThemeConfig = {
      ...this.siteConfig,
      ...partialConfig,
      updatedAt: new Date().toISOString()
    };

    this.siteConfig = updated;
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'site_settings', 'global_theme'), updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'site_settings/global_theme');
    }

    return updated;
  }

  public async resetSiteThemeConfig(): Promise<SiteThemeConfig> {
    const reset = { ...DEFAULT_SITE_THEME_CONFIG, updatedAt: new Date().toISOString() };
    this.siteConfig = reset;
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'site_settings', 'global_theme'), reset);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'site_settings/global_theme');
    }

    return reset;
  }

  // Get active bank accounts for transfer payments
  public getActiveBankAccounts(): BankAccount[] {
    const accounts = this.siteConfig.bankAccounts && this.siteConfig.bankAccounts.length > 0
      ? this.siteConfig.bankAccounts
      : DEFAULT_BANK_ACCOUNTS;
    return accounts.filter(a => a.isActive);
  }

  // Update bank accounts (Super Admin)
  public async updateBankAccounts(bankAccounts: BankAccount[]): Promise<SiteThemeConfig> {
    return this.updateSiteThemeConfig({ bankAccounts });
  }

  // 1. Create Checkout Order (Supports Marketplace + Landing Pages + Dropshipping + Sacha Pack Logistics API + Multi-payment)
  public async createCodOrder(orderData: {
    article: Article;
    quantity: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    province: string;
    city: string;
    municipality?: string;
    address: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
    cardLast4?: string;
    bankName?: string;
    selectedBankAccountId?: string;
    transferReference?: string;
    transferReceiptUrl?: string; // Photo of bank transfer receipt
    sourceType?: 'marketplace' | 'landing_page';
    landingPageSlug?: string;
    dropshipperId?: string;
    dropshipperName?: string;
    customUnitPrice?: number;
  }): Promise<{ delivery: Delivery; transaction: Transaction; sachaPackResponse?: SachaPackWebhookResponse }> {
    const {
      article,
      quantity,
      customerName,
      customerPhone,
      customerEmail,
      province,
      city,
      municipality,
      address,
      notes,
      paymentMethod = 'COD',
      cardLast4,
      bankName,
      selectedBankAccountId,
      transferReference,
      transferReceiptUrl,
      sourceType = 'marketplace',
      landingPageSlug,
      dropshipperId,
      dropshipperName,
      customUnitPrice
    } = orderData;
    
    const store = this.stores.find(s => s.id === article.storeId);
    
    // Commission rate calculation according to business rules:
    // - Socio Maestro vsantos.dominicana@gmail.com: 8% (0.08)
    // - Plan Básico: 15% (0.15)
    // - Plan Pro: 10% (0.10)
    // - Plan Elite / Full: 8% (0.08)
    let commissionRate = 0.10;
    if (store) {
      if (store.ownerEmail?.toLowerCase().trim() === 'vsantos.dominicana@gmail.com') {
        commissionRate = 0.08;
      } else if (typeof store.marketplaceCommission === 'number' && store.marketplaceCommission > 0) {
        commissionRate = store.marketplaceCommission;
      } else if (store.plan === 'basic') {
        commissionRate = 0.15;
      } else if (store.plan === 'pro') {
        commissionRate = 0.10;
      } else if (store.plan === 'elite' || (store.plan as string) === 'full') {
        commissionRate = 0.08;
      }
    }

    const unitPrice = customUnitPrice && customUnitPrice > 0 ? customUnitPrice : article.price;
    const basePriceTotal = unitPrice * quantity;
    const shippingFee = SANPI_FLAT_SHIPPING_FEE;
    const totalCodAmount = basePriceTotal + shippingFee;

    // Dropshipper profit calculation
    let dropshipperProfit = 0;
    if (dropshipperId && article.wholesalePrice) {
      dropshipperProfit = Math.max(0, (unitPrice - article.wholesalePrice) * quantity);
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = `SANPI-COD-${randomNum}`;
    const externalOrderId = `ORD-${randomNum}`;
    const nowIso = new Date().toISOString();
    const barcode_imei = article.barcode_imei || '1234567890';
    
    // Resolve Logistics Provider for Store
    const provider = this.getLogisticsProviderForStore(article.storeId);
    const storeIdToUse = store?.sachaPackStoreId || provider?.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID;

    // Build Logistics API Payload strictly matching required structure
    const sachaPayload: SachaPackWebhookPayload = buildSachaPackPayload({
      storeId: storeIdToUse,
      externalOrderId,
      items: [
        {
          barcode_imei,
          quantity,
          price: unitPrice
        }
      ],
      customer: {
        name: customerName,
        email: customerEmail || 'cliente@sanpimarket.do',
        phone: customerPhone,
        address,
        province,
        municipality: municipality || city || 'Santo Domingo Este'
      },
      paymentMethod
    });

    const deliveryId = `del_${Date.now()}`;
    const newDelivery: Delivery = {
      id: deliveryId,
      trackingNumber,
      externalOrderId,
      customerName,
      customerPhone,
      customerEmail: customerEmail || 'cliente@sanpimarket.do',
      province,
      city,
      municipality: municipality || city || 'Santo Domingo Este',
      address,
      notes: notes || '',
      paymentMethod,
      cardLast4,
      bankName,
      selectedBankAccountId,
      transferReference,
      transferReceiptUrl,
      barcode_imei,
      totalCodAmount,
      basePrice: basePriceTotal,
      shippingFee,
      storeId: article.storeId,
      articleId: article.id,
      articleName: article.name,
      status: 'pendiente',
      isMarketplaceOrder: true,
      sourceType,
      landingPageSlug,
      dropshipperId,
      dropshipperName,
      dropshipperProfit,
      logisticsProviderId: provider?.id || 'prov_sacha_pack',
      logisticsProviderName: provider?.name || 'Sacha Pack Logistics',
      sachaPackStatus: 'enviado',
      sachaPackPayload: sachaPayload,
      sachaPackDispatchedAt: nowIso,
      createdAt: nowIso,
      history: [
        {
          status: 'pendiente',
          date: nowIso,
          note: sourceType === 'landing_page'
            ? `Orden creada vía Landing Page (/lp/${landingPageSlug || ''}) - Despachada a ${provider?.name || 'Sacha Pack'} Webhook (COD RD$ 350 flete)`
            : `Orden creada en Sanpi Marketplace - Despachada a ${provider?.name || 'Sacha Pack'} Webhook (COD RD$ 350 flete)`
        }
      ]
    };

    const transactionId = `tx_${Date.now()}`;
    const newTransaction: Transaction = {
      id: transactionId,
      trackingNumber,
      storeId: article.storeId,
      articleId: article.id,
      productName: article.name,
      quantity,
      basePrice: basePriceTotal,
      shippingFee,
      total: totalCodAmount,
      commissionRate,
      commissionAmount: Math.round(basePriceTotal * commissionRate),
      paymentMethod: paymentMethod,
      status: 'pendiente',
      isMarketplaceOrder: true,
      sourceType,
      landingPageSlug,
      dropshipperId,
      dropshipperName,
      dropshipperProfit,
      createdAt: nowIso
    };

    // Update Local State immediately
    this.deliveries = [newDelivery, ...this.deliveries];
    this.transactions = [newTransaction, ...this.transactions];
    this.lastNewOrder = newDelivery;

    // Decrement product stock if positive
    const artIndex = this.articles.findIndex(a => a.id === article.id);
    if (artIndex !== -1 && this.articles[artIndex].stock > 0) {
      this.articles[artIndex].stock = Math.max(0, this.articles[artIndex].stock - quantity);
    }

    // Increment landing page orders count if applicable
    if (landingPageSlug) {
      const lp = this.landingPages.find(l => l.slug === landingPageSlug);
      if (lp) {
        lp.ordersCount = (lp.ordersCount || 0) + 1;
        lp.stockCount = Math.max(0, (lp.stockCount || 10) - quantity);
      }
    }

    this.saveToLocalStorage();
    this.notify();

    // Trigger TTS Voice Alert: "Sanpi"!
    speakSanpi();

    // Dispatch to Logistics Webhook in background
    let sachaRes: SachaPackWebhookResponse | undefined;
    try {
      sachaRes = await sendToLogisticsWebhook(sachaPayload, provider);
      newDelivery.sachaPackResponse = sachaRes;
      newDelivery.sachaPackStatus = sachaRes.success ? 'enviado' : 'error';
      this.saveToLocalStorage();
      this.notify();
    } catch (e: any) {
      console.warn('Logistics webhook dispatch notice:', e);
    }

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'deliveries', deliveryId), newDelivery);
      await setDoc(doc(db, 'transactions', transactionId), newTransaction);
      if (artIndex !== -1) {
        await updateDoc(doc(db, 'articles', article.id), { stock: this.articles[artIndex].stock });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `deliveries/${deliveryId}`);
    }

    return { delivery: newDelivery, transaction: newTransaction, sachaPackResponse: sachaRes };
  }

  // --- LOGISTICS PROVIDER MULTI-COMPANY ENGINE & ADMIN METHODS ---
  public async addLogisticsProvider(data: Omit<LogisticsProviderConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<LogisticsProviderConfig> {
    const id = `prov_${Date.now()}`;
    const now = new Date().toISOString();

    if (data.isDefault) {
      this.logisticsProviders.forEach(p => { p.isDefault = false; });
    }

    const newProvider: LogisticsProviderConfig = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.logisticsProviders = [...this.logisticsProviders, newProvider];
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'logistics_providers', id), newProvider);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `logistics_providers/${id}`);
    }

    return newProvider;
  }

  public async updateLogisticsProvider(id: string, updates: Partial<LogisticsProviderConfig>): Promise<void> {
    const index = this.logisticsProviders.findIndex(p => p.id === id);
    if (index === -1) return;

    if (updates.isDefault) {
      this.logisticsProviders.forEach(p => {
        if (p.id !== id) p.isDefault = false;
      });
    }

    this.logisticsProviders[index] = {
      ...this.logisticsProviders[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'logistics_providers', id), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `logistics_providers/${id}`);
    }
  }

  public async deleteLogisticsProvider(id: string): Promise<void> {
    this.logisticsProviders = this.logisticsProviders.filter(p => p.id !== id);
    if (this.logisticsProviders.length > 0 && !this.logisticsProviders.some(p => p.isDefault)) {
      this.logisticsProviders[0].isDefault = true;
    }
    this.saveToLocalStorage();
    this.notify();

    try {
      await deleteDoc(doc(db, 'logistics_providers', id));
    } catch (err) {
      // ignore
    }
  }

  public async setDefaultLogisticsProvider(id: string): Promise<void> {
    this.logisticsProviders.forEach(p => {
      p.isDefault = (p.id === id);
    });
    this.saveToLocalStorage();
    this.notify();

    for (const p of this.logisticsProviders) {
      try {
        await updateDoc(doc(db, 'logistics_providers', p.id), { isDefault: p.isDefault });
      } catch (e) {
        // ignore
      }
    }
  }

  public getDefaultLogisticsProvider(): LogisticsProviderConfig | undefined {
    return this.logisticsProviders.find(p => p.isDefault && p.isActive) ||
           this.logisticsProviders.find(p => p.isActive) ||
           this.logisticsProviders[0];
  }

  public getLogisticsProviderForStore(storeId?: string): LogisticsProviderConfig | undefined {
    if (storeId) {
      const store = this.stores.find(s => s.id === storeId);
      if (store?.logisticsProviderId) {
        const found = this.logisticsProviders.find(p => p.id === store.logisticsProviderId && p.isActive);
        if (found) return found;
      }
    }
    return this.getDefaultLogisticsProvider();
  }

  public async pingLogisticsProvider(providerId: string): Promise<LogisticsConnectionTestResult> {
    const provider = this.logisticsProviders.find(p => p.id === providerId) || this.getDefaultLogisticsProvider();
    if (!provider) {
      return {
        success: false,
        status: 404,
        latencyMs: 0,
        message: 'No se encontró la empresa de transporte especificada.',
        timestamp: new Date().toISOString(),
        endpoint: ''
      };
    }

    const testRes = await testLogisticsConnection({
      endpointUrl: provider.webhookUrl,
      apiKey: provider.apiKey || provider.authToken,
      authType: provider.authType || 'x-api-key',
      customHeaderName: provider.customHeaderName,
      httpMethod: provider.httpMethod || 'POST',
      defaultStoreId: provider.defaultStoreId,
      headers: provider.headers
    });

    // Update ping status on provider
    provider.lastPingStatus = testRes.success ? 'success' : 'error';
    provider.lastPingAt = testRes.timestamp;
    provider.lastPingLatencyMs = testRes.latencyMs;
    provider.lastPingMessage = testRes.message;

    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'logistics_providers', provider.id), {
        lastPingStatus: provider.lastPingStatus,
        lastPingAt: provider.lastPingAt,
        lastPingLatencyMs: provider.lastPingLatencyMs,
        lastPingMessage: provider.lastPingMessage,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // ignore
    }

    return testRes;
  }

  public async handleInboundLogisticsWebhook(
    payload: LogisticsInboundWebhookPayload
  ): Promise<{ success: boolean; message: string; delivery?: Delivery }> {
    const queryTerm = (payload.externalOrderId || payload.trackingNumber || payload.carrierTrackingId || '').trim();
    if (!queryTerm) {
      return { success: false, message: 'Falta identificador de la orden en el webhook' };
    }

    const delIndex = this.deliveries.findIndex(d => 
      d.externalOrderId === queryTerm || 
      d.trackingNumber === queryTerm ||
      (d.sachaPackResponse?.sachaTrackingId && d.sachaPackResponse.sachaTrackingId === queryTerm) ||
      d.id === queryTerm
    );

    if (delIndex === -1) {
      return { success: false, message: `Orden ${queryTerm} no encontrada en Sanpi.` };
    }

    const del = this.deliveries[delIndex];
    const nowIso = new Date().toISOString();
    const oldStatus = del.status;
    const newStatus = payload.status || del.status;

    del.status = newStatus;
    if (payload.carrierTrackingId && !del.sachaPackResponse?.sachaTrackingId) {
      if (!del.sachaPackResponse) {
        del.sachaPackResponse = {
          success: true,
          status: 200,
          message: 'Sincronizado vía Webhook de Transporte',
          timestamp: nowIso,
          endpoint: payload.carrierName || 'inbound-webhook',
          sachaTrackingId: payload.carrierTrackingId
        };
      } else {
        del.sachaPackResponse.sachaTrackingId = payload.carrierTrackingId;
      }
    }

    // Add entry to tracking history
    const historyEntry = {
      status: newStatus,
      date: payload.eventTimestamp || nowIso,
      note: payload.notes || `Actualización automática de la transportadora ${payload.carrierName || del.logisticsProviderName || 'Transporte'}: ${newStatus}`
    };

    del.history = [...(del.history || []), historyEntry];

    // If order is completed, update transaction status too
    if (newStatus === 'entregado') {
      const txIndex = this.transactions.findIndex(t => t.trackingNumber === del.trackingNumber);
      if (txIndex !== -1) {
        this.transactions[txIndex].status = 'entregado';
      }
    } else if (newStatus === 'cancelado') {
      const txIndex = this.transactions.findIndex(t => t.trackingNumber === del.trackingNumber);
      if (txIndex !== -1) {
        this.transactions[txIndex].status = 'cancelado';
      }
    }

    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'deliveries', del.id), {
        status: del.status,
        history: del.history,
        sachaPackResponse: del.sachaPackResponse
      });
      const txIndex = this.transactions.findIndex(t => t.trackingNumber === del.trackingNumber);
      if (txIndex !== -1) {
        await updateDoc(doc(db, 'transactions', this.transactions[txIndex].id), {
          status: this.transactions[txIndex].status
        });
      }
    } catch (err) {
      // ignore
    }

    return {
      success: true,
      message: `Orden ${del.trackingNumber} actualizada a estado: ${newStatus}`,
      delivery: del
    };
  }

  public async testLogisticsProviderWebhook(
    providerId: string,
    customPayload?: any
  ): Promise<SachaPackWebhookResponse> {
    const provider = this.logisticsProviders.find(p => p.id === providerId) || this.getDefaultLogisticsProvider();
    const payload = customPayload || buildSachaPackPayload({
      storeId: provider?.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID,
      externalOrderId: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      items: [{ barcode_imei: '1234567890', quantity: 1, price: 1500 }],
      customer: {
        name: 'Cliente Prueba Sanpi',
        email: 'prueba@sanpimarket.do',
        phone: '809-555-0000',
        address: 'Av. Winston Churchill #109, Piantini',
        province: 'Distrito Nacional',
        municipality: 'Santo Domingo'
      },
      paymentMethod: 'contra entrega'
    });

    return await sendToLogisticsWebhook(payload, provider);
  }

  // Dispatch / Re-send an existing Delivery to Logistics Webhook
  public async dispatchDeliveryToSachaPack(
    deliveryId: string,
    overridePayload?: any,
    providerId?: string,
    overrideStoreId?: string
  ): Promise<SachaPackWebhookResponse> {
    const delIndex = this.deliveries.findIndex(d => d.id === deliveryId);
    if (delIndex === -1) {
      throw new Error(`Delivery ${deliveryId} not found.`);
    }

    const del = this.deliveries[delIndex];
    const art = this.articles.find(a => a.id === del.articleId);
    const store = this.stores.find(s => s.id === del.storeId);
    const provider = providerId 
      ? this.logisticsProviders.find(p => p.id === providerId) 
      : this.getLogisticsProviderForStore(del.storeId);

    let currentStoreId = overrideStoreId?.trim() || store?.sachaPackStoreId || provider?.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID;
    if (!currentStoreId || currentStoreId.startsWith('TU_') || currentStoreId === 'TU_UID_DE_SOCIO') {
      currentStoreId = DEFAULT_SACHA_PACK_STORE_ID;
    }
    
    // If overrideStoreId was explicitly provided and store exists, update store's sachaPackStoreId
    if (overrideStoreId && store) {
      this.updateStore(store.id, { sachaPackStoreId: currentStoreId }).catch(() => {});
    }

    let payload: SachaPackWebhookPayload;
    if (overridePayload) {
      payload = { ...overridePayload, storeId: currentStoreId };
    } else {
      payload = buildSachaPackPayload({
        storeId: currentStoreId,
        externalOrderId: del.externalOrderId || del.trackingNumber,
        items: (del.sachaPackPayload?.items && del.sachaPackPayload.items.length > 0)
          ? del.sachaPackPayload.items
          : [
              {
                barcode_imei: del.barcode_imei || art?.barcode_imei || '1234567890',
                quantity: 1,
                price: del.basePrice
              }
            ],
        customer: del.sachaPackPayload?.customer || {
          name: del.customerName,
          email: del.customerEmail || 'cliente@sanpimarket.do',
          phone: del.customerPhone,
          address: del.address,
          province: del.province,
          municipality: del.municipality || del.city || 'Santo Domingo Este'
        },
        paymentMethod: del.paymentMethod || 'contra entrega'
      });
    }

    const res = await sendToLogisticsWebhook(payload, provider);
    
    del.sachaPackPayload = payload;
    del.sachaPackResponse = res;
    del.sachaPackStatus = res.success ? 'enviado' : 'error';
    del.sachaPackDispatchedAt = new Date().toISOString();
    del.logisticsProviderId = provider?.id;
    del.logisticsProviderName = provider?.name;
    del.history = [
      ...del.history,
      {
        status: del.status,
        date: new Date().toISOString(),
        note: `Despachado a ${provider?.name || 'Logística'} Webhook (${res.status} ${res.isSimulated ? 'Simulado' : 'OK'})`
      }
    ];

    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'deliveries', deliveryId), {
        sachaPackPayload: del.sachaPackPayload,
        sachaPackResponse: del.sachaPackResponse,
        sachaPackStatus: del.sachaPackStatus,
        sachaPackDispatchedAt: del.sachaPackDispatchedAt,
        logisticsProviderId: del.logisticsProviderId,
        logisticsProviderName: del.logisticsProviderName,
        history: del.history
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `deliveries/${deliveryId}`);
    }

    return res;
  }

  // Helper: Synchronize Sacha Pack Store ID across all stores in the marketplace
  public async updateAllStoresSachaPackId(newStoreId: string): Promise<void> {
    const trimmed = newStoreId.trim();
    if (!trimmed) return;
    
    this.stores.forEach(s => {
      s.sachaPackStoreId = trimmed;
    });
    
    const sachaProv = this.logisticsProviders.find(p => p.code === 'sacha_pack' || p.id === 'prov_sacha_pack');
    if (sachaProv) {
      sachaProv.defaultStoreId = trimmed;
    }
    
    this.saveToLocalStorage();
    this.notify();

    for (const store of this.stores) {
      try {
        await updateDoc(doc(db, 'stores', store.id), { sachaPackStoreId: trimmed });
      } catch (e) {
        // ignore
      }
    }
    if (sachaProv) {
      try {
        await updateDoc(doc(db, 'logistics_providers', sachaProv.id), { defaultStoreId: trimmed });
      } catch (e) {
        // ignore
      }
    }
  }

  // Direct Live Webhook Tester for Sacha Pack API
  public async testSachaPackWebhookDirect(payload: SachaPackWebhookPayload, providerId?: string): Promise<SachaPackWebhookResponse> {
    const provider = providerId ? this.logisticsProviders.find(p => p.id === providerId) : this.getDefaultLogisticsProvider();
    return await sendToLogisticsWebhook(payload, provider);
  }

  // 2. Increment Product Views
  public async incrementArticleViews(articleId: string) {
    const article = this.articles.find(a => a.id === articleId);
    if (!article) return;
    article.views = (article.views || 0) + 1;
    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'articles', articleId), { views: article.views });
    } catch (e) {
      // ignore offline error
    }
  }

  // 3. Update Delivery Status
  public async updateDeliveryStatus(deliveryId: string, newStatus: Delivery['status'], note: string = '') {
    const delIndex = this.deliveries.findIndex(d => d.id === deliveryId);
    if (delIndex === -1) return;

    const updated = { ...this.deliveries[delIndex] };
    updated.status = newStatus;
    updated.history = [
      ...updated.history,
      { status: newStatus, date: new Date().toISOString(), note: note || `Estatus actualizado a ${newStatus}` }
    ];

    // If delivered, update associated transaction status to delivered
    if (newStatus === 'entregado') {
      const txIndex = this.transactions.findIndex(t => t.trackingNumber === updated.trackingNumber);
      if (txIndex !== -1) {
        this.transactions[txIndex].status = 'entregado';
        try {
          await updateDoc(doc(db, 'transactions', this.transactions[txIndex].id), { status: 'entregado' });
        } catch (e) {
          // ignore
        }
      }
    }

    this.deliveries[delIndex] = updated;
    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'deliveries', deliveryId), {
        status: newStatus,
        history: updated.history
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `deliveries/${deliveryId}`);
    }
  }

  /**
   * Universal Package & GPS Tracking Method
   * Queries Firestore document `deliveries/{orderId}`, or searches deliveries collection / cache
   * and queries `users/{deliveryPersonId}` if in transit for live GPS coordinates.
   */
  public async trackPackage(orderId: string): Promise<{ delivery: Delivery; courier?: UserLocationProfile | null }> {
    const cleanId = orderId.trim();
    if (!cleanId) throw new Error("Guía de envío no válida");

    let deliveryData: Delivery | null = null;

    // 1. Try direct Firestore getDoc on deliveries/{orderId}
    try {
      const docRef = doc(db, "deliveries", cleanId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        deliveryData = docSnap.data() as Delivery;
      }
    } catch (e) {
      console.debug("Firestore direct deliveries lookup notice:", e);
    }

    // 2. If not found by doc ID, search locally or in memory
    if (!deliveryData) {
      const foundLocal = this.deliveries.find(d =>
        d.id.toLowerCase() === cleanId.toLowerCase() ||
        d.trackingNumber.toLowerCase() === cleanId.toLowerCase() ||
        d.externalOrderId?.toLowerCase() === cleanId.toLowerCase()
      );
      if (foundLocal) {
        deliveryData = { ...foundLocal };
      }
    }

    if (!deliveryData) {
      throw new Error(`Guía "${cleanId}" no encontrada en el sistema de rastreo.`);
    }

    // Ensure totalToCollect is populated
    if (deliveryData.totalToCollect === undefined && deliveryData.totalCodAmount) {
      deliveryData.totalToCollect = deliveryData.totalCodAmount;
    }

    // 3. If in transit and deliveryPersonId is present, query courier profile for live GPS
    let courierProfile: UserLocationProfile | null = null;
    const isEnTransito = deliveryData.status === 'en_transito' || (deliveryData.status as any) === 'en tránsito';

    if (isEnTransito && deliveryData.deliveryPersonId) {
      try {
        const userRef = doc(db, "users", deliveryData.deliveryPersonId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          courierProfile = userSnap.data() as UserLocationProfile;
          if (courierProfile?.lastLocation) {
            deliveryData.lastLocation = courierProfile.lastLocation;
          }
        }
      } catch (err) {
        console.debug("Courier profile lookup:", err);
      }
    }

    return { delivery: deliveryData, courier: courierProfile };
  }

  // 4. Partner Subscription Approval / Rejection
  public async updateSubscriptionStatus(subId: string, status: 'aprobado' | 'rechazado') {
    const sub = this.subscriptions.find(s => s.id === subId);
    if (!sub) return;
    sub.status = status;

    if (status === 'aprobado') {
      // Calculate commission rate: vsantos -> 8%, otherwise use configured dynamic plan rate
      const isVsantos = sub.email?.toLowerCase().trim() === 'vsantos.dominicana@gmail.com';
      let commission = isVsantos ? 0.08 : this.getPlanCommissionRate(sub.plan);

      // Check if registered with a referral code
      let referrerStore: Store | undefined;
      let appliedDiscount = sub.referralDiscountPercent || 0;
      if (sub.referralCodeUsed) {
        referrerStore = this.findStoreByReferralCode(sub.referralCodeUsed);
        if (referrerStore) {
          appliedDiscount = appliedDiscount || referrerStore.referralDiscountPercent || 10;
        }
      } else if (sub.referredByStoreId) {
        referrerStore = this.stores.find(s => s.id === sub.referredByStoreId);
        if (referrerStore) {
          appliedDiscount = appliedDiscount || referrerStore.referralDiscountPercent || 10;
        }
      }

      const storeId = `store_${Date.now()}`;
      const generatedRefCode = `SANPI-${sub.storeName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || Date.now().toString().slice(-4)}`;

      const newStore: Store = {
        id: storeId,
        name: sub.storeName,
        slug: sub.storeName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        ownerId: sub.id,
        logoUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&auto=format&fit=crop&q=80',
        coverImageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
        theme: {
          primaryColor: '#2563eb',
          secondaryColor: '#0f172a'
        },
        contact: {
          phone: sub.phone,
          whatsapp: sub.phone.replace(/[^0-9]/g, ''),
          email: sub.email
        },
        rating: 5.0,
        totalReviews: 1,
        isMarketplace: true,
        marketplaceCommission: commission,
        ownerEmail: sub.email,
        ownerName: sub.ownerName,
        phone: sub.phone,
        description: `Tienda socia certificada de Sanpi Marketplace en ${sub.province}.`,
        province: sub.province,
        status: 'approved',
        isActive: true,
        plan: sub.plan,
        referralCode: generatedRefCode,
        referredByStoreId: referrerStore?.id,
        referredByStoreName: referrerStore?.name,
        referredByCode: sub.referralCodeUsed || referrerStore?.referralCode,
        referralDiscountPercent: appliedDiscount || 10,
        referralDiscountStatus: 'activo',
        referralDiscountNote: referrerStore
          ? `Descuento del ${appliedDiscount}% por registro con código de referido de ${referrerStore.name}`
          : 'Descuento estándar de bienvenida',
        totalReferredStoresCount: 0,
        totalReferralSavings: 0,
        referralProgramActive: true,
        createdAt: new Date().toISOString()
      };

      // If referred, create referral record and update referrer store stats
      if (referrerStore) {
        const refRecordId = `ref_${Date.now()}`;
        const newRefRecord: StoreReferralRecord = {
          id: refRecordId,
          referrerStoreId: referrerStore.id,
          referrerStoreName: referrerStore.name,
          referrerOwnerName: referrerStore.ownerName,
          referrerEmail: referrerStore.ownerEmail,
          referredStoreId: storeId,
          referredStoreName: newStore.name,
          referredOwnerName: newStore.ownerName,
          referredEmail: newStore.ownerEmail,
          referralCode: sub.referralCodeUsed || referrerStore.referralCode || 'SANPI-REF',
          discountPercentApplied: appliedDiscount || 10,
          discountStatus: 'activo',
          adminNotes: `Registro completado y aprobado por Admin con ${appliedDiscount || 10}% de descuento`,
          createdAt: new Date().toISOString(),
          appliedByAdminAt: new Date().toISOString()
        };

        this.storeReferrals = [newRefRecord, ...this.storeReferrals];
        referrerStore.totalReferredStoresCount = (referrerStore.totalReferredStoresCount || 0) + 1;
        referrerStore.totalReferralSavings = (referrerStore.totalReferralSavings || 0) + 1500;

        setDoc(doc(db, 'store_referrals', refRecordId), newRefRecord).catch(() => {});
        updateDoc(doc(db, 'stores', referrerStore.id), {
          totalReferredStoresCount: referrerStore.totalReferredStoresCount,
          totalReferralSavings: referrerStore.totalReferralSavings
        }).catch(() => {});
      }

      this.stores = [newStore, ...this.stores];
      try {
        await setDoc(doc(db, 'stores', storeId), newStore);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeId}`);
      }
    }

    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'marketplace_subscriptions', subId), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `marketplace_subscriptions/${subId}`);
    }
  }

  // 5. Add Partner Subscription Request
  public async addSubscriptionRequest(data: Omit<MarketplaceSubscription, 'id' | 'requestedAt' | 'status' | 'monthlyFee'>) {
    const feeMap = { basic: 1500, pro: 3000, elite: 5000 };
    const id = `sub_${Date.now()}`;
    const newSub: MarketplaceSubscription = {
      ...data,
      id,
      monthlyFee: feeMap[data.plan] || 3000,
      status: 'pendiente',
      requestedAt: new Date().toISOString()
    };

    this.subscriptions = [newSub, ...this.subscriptions];
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'marketplace_subscriptions', id), newSub);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `marketplace_subscriptions/${id}`);
    }
  }

  // 6. Register Expense
  public async addExpense(
    title: string,
    category: Expense['category'],
    amount: number,
    extra?: {
      userId?: string;
      userEmail?: string;
      userName?: string;
      userRole?: Expense['userRole'];
      storeId?: string;
      reference?: string;
      notes?: string;
      date?: string;
    }
  ) {
    const id = `exp_${Date.now()}`;
    const today = extra?.date || new Date().toISOString().split('T')[0];
    const newExp: Expense = {
      id,
      title,
      category,
      amount,
      date: today,
      createdAt: new Date().toISOString(),
      userId: extra?.userId,
      userEmail: extra?.userEmail,
      userName: extra?.userName,
      userRole: extra?.userRole,
      storeId: extra?.storeId,
      reference: extra?.reference,
      notes: extra?.notes
    };

    this.expenses = [newExp, ...this.expenses];
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'expenses', id), newExp);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `expenses/${id}`);
    }
    return newExp;
  }

  // 7. Delete Expense
  public async deleteExpense(expenseId: string) {
    this.expenses = this.expenses.filter(e => e.id !== expenseId);
    this.saveToLocalStorage();
    this.notify();
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (e) {
      // ignore
    }
  }

  // 8. Add Product/Article to Store
  public async addArticle(data: Omit<Article, 'id' | 'createdAt' | 'views'>) {
    const id = `art_${Date.now()}`;
    const newArt: Article = {
      ...data,
      id,
      views: 0,
      createdAt: new Date().toISOString()
    };

    this.articles = [newArt, ...this.articles];
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'articles', id), newArt);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `articles/${id}`);
    }
  }

  // 8b. Add Wholesale Provider Article (Hidden from public, visible to dropshippers at base price)
  public async addProviderArticle(data: {
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    baseCost: number; // Wholesale base price
    suggestedRetailPrice?: number;
    stock: number;
    images: string[];
    specifications?: Record<string, string>;
    barcode_imei?: string;
    supplierId?: string;
    supplierName?: string;
    supplierEmail?: string;
  }): Promise<Article> {
    const id = `art_prov_${Date.now()}`;
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50);
    const mainImg = data.images && data.images.length > 0 ? data.images[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';

    const newProviderArt: Article = {
      id,
      storeId: data.supplierId || 'store_provider_generic',
      storeName: data.supplierName || 'Proveedor Mayorista RD',
      title: data.title,
      name: data.title,
      slug,
      description: data.description,
      images: data.images && data.images.length > 0 ? data.images : [mainImg],
      image: mainImg,
      gallery: data.images,
      price: data.baseCost, // Wholesale base cost
      wholesalePrice: data.baseCost,
      baseCost: data.baseCost,
      costPerItem: data.baseCost,
      suggestedRetailPrice: data.suggestedRetailPrice || Math.round(data.baseCost * 1.8),
      compareAtPrice: data.suggestedRetailPrice ? Math.round(data.suggestedRetailPrice * 1.2) : Math.round(data.baseCost * 2),
      category: data.category || 'Tecnología & Gadgets',
      subcategory: data.subcategory,
      variants: [{ name: 'Estándar', options: ['Unidad'] }],
      inventory: data.stock || 50,
      stock: data.stock || 50,
      rating: 5.0,
      reviewCount: 0,
      specifications: data.specifications || {},
      barcode_imei: data.barcode_imei || Date.now().toString(),
      status: 'aprobado',
      isPublic: false, // OCULTO DEL E-COMMERCE GENERAL
      visibility: 'dropshippers_only', // SOLO PARA DROPSHIPPERS
      isProviderProduct: true,
      isDropshipping: true,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      supplierEmail: data.supplierEmail,
      addedToStoreSlugs: [],
      views: 0,
      reviews: [],
      createdAt: new Date().toISOString()
    };

    this.articles = [newProviderArt, ...this.articles];
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'articles', id), newProviderArt);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `articles/${id}`);
    }

    return newProviderArt;
  }

  // 8c. Import / Promote Provider Article into a Dropshipper Store Catalog
  public async importProviderArticleToStore(
    providerArticleId: string,
    targetStoreId: string,
    retailPrice: number
  ): Promise<Article | null> {
    const providerArt = this.articles.find(a => a.id === providerArticleId);
    if (!providerArt) return null;

    const targetStore = this.stores.find(s => s.id === targetStoreId);
    if (!targetStore) return null;

    const newStoreArticleId = `art_ds_${Date.now()}`;
    const retailCost = providerArt.baseCost || providerArt.price;
    const suggestedCompare = Math.round(retailPrice * 1.25);

    const importedProduct: Article = {
      ...providerArt,
      id: newStoreArticleId,
      storeId: targetStore.id,
      storeName: targetStore.name,
      price: retailPrice, // PVP elegido por el dropshipper
      compareAtPrice: suggestedCompare,
      costPerItem: retailCost, // Costo base del proveedor
      wholesalePrice: retailCost,
      isPublic: true, // AHORA ES PÚBLICO EN EL E-COMMERCE DE LA TIENDA
      visibility: 'public',
      isProviderProduct: false,
      isDropshipping: true,
      supplierId: providerArt.supplierId || providerArt.id,
      supplierName: providerArt.supplierName || providerArt.storeName,
      createdAt: new Date().toISOString()
    };

    // Record that this store slug imported it
    if (!providerArt.addedToStoreSlugs) providerArt.addedToStoreSlugs = [];
    if (!providerArt.addedToStoreSlugs.includes(targetStore.slug)) {
      providerArt.addedToStoreSlugs.push(targetStore.slug);
    }

    this.articles = [importedProduct, ...this.articles];
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'articles', newStoreArticleId), importedProduct);
      await updateDoc(doc(db, 'articles', providerArt.id), {
        addedToStoreSlugs: providerArt.addedToStoreSlugs
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `articles/${newStoreArticleId}`);
    }

    return importedProduct;
  }

  // 8d. Carrier User Management
  public async addCarrierUser(carrier: CarrierUser): Promise<CarrierUser> {
    const existingIdx = this.carrierUsers.findIndex(c => c.id === carrier.id);
    if (existingIdx !== -1) {
      this.carrierUsers[existingIdx] = carrier;
    } else {
      this.carrierUsers = [carrier, ...this.carrierUsers];
    }
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'carrier_users', carrier.id), carrier);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `carrier_users/${carrier.id}`);
    }
    return carrier;
  }

  public async updateCarrierUser(id: string, updates: Partial<CarrierUser>): Promise<void> {
    const idx = this.carrierUsers.findIndex(c => c.id === id);
    if (idx === -1) return;

    this.carrierUsers[idx] = { ...this.carrierUsers[idx], ...updates };
    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'carrier_users', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `carrier_users/${id}`);
    }
  }

  public async deleteCarrierUser(id: string): Promise<void> {
    this.carrierUsers = this.carrierUsers.filter(c => c.id !== id);
    this.saveToLocalStorage();
    this.notify();

    try {
      await deleteDoc(doc(db, 'carrier_users', id));
    } catch (err) {
      // ignore
    }
  }

  // 8e. Update Delivery Carrier Info (Status, Chofer, Notas)
  public async updateDeliveryCarrierInfo(
    deliveryId: string,
    info: {
      status?: DeliveryStatus;
      driverName?: string;
      driverPhone?: string;
      carrierNotes?: string;
      carrierId?: string;
      carrierName?: string;
    }
  ): Promise<void> {
    const idx = this.deliveries.findIndex(d => d.id === deliveryId || d.trackingNumber === deliveryId);
    if (idx === -1) return;

    const delivery = this.deliveries[idx];
    const nowIso = new Date().toISOString();
    const newStatus = info.status || delivery.status;

    const newHistoryEntry = {
      status: newStatus,
      date: nowIso,
      note: info.carrierNotes || `Actualización por Transportista (${info.carrierName || delivery.carrierName || 'Courier'}) - Conductor: ${info.driverName || delivery.driverName || 'No asignado'}`
    };

    this.deliveries[idx] = {
      ...delivery,
      ...info,
      status: newStatus,
      collectedAt: newStatus === 'entregado' ? (delivery.collectedAt || nowIso) : delivery.collectedAt,
      history: [...(delivery.history || []), newHistoryEntry]
    };

    // If marked entregado, update transaction status too
    if (newStatus === 'entregado') {
      const txIdx = this.transactions.findIndex(t => t.trackingNumber === delivery.trackingNumber);
      if (txIdx !== -1) {
        this.transactions[txIdx].status = 'entregado';
      }
    }

    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'deliveries', delivery.id), {
        ...info,
        status: newStatus,
        collectedAt: this.deliveries[idx].collectedAt,
        history: this.deliveries[idx].history
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `deliveries/${delivery.id}`);
    }
  }

  // 9. Update Store
  public async updateStore(storeId: string, updates: Partial<Store>) {
    const idx = this.stores.findIndex(s => s.id === storeId);
    if (idx === -1) return;
    this.stores[idx] = { ...this.stores[idx], ...updates };
    this.saveToLocalStorage();
    this.notify();
    try {
      await updateDoc(doc(db, 'stores', storeId), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stores/${storeId}`);
    }
  }

  // 9b. Add Store
  public async addStore(newStore: Store) {
    const existingIdx = this.stores.findIndex(s => s.id === newStore.id);
    if (existingIdx !== -1) {
      this.stores[existingIdx] = newStore;
    } else {
      this.stores = [newStore, ...this.stores];
    }
    this.saveToLocalStorage();
    this.notify();
    try {
      await setDoc(doc(db, 'stores', newStore.id), newStore);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `stores/${newStore.id}`);
    }
  }

  // 9c. Save or Update Store
  public async saveOrUpdateStore(store: Store) {
    const existingIdx = this.stores.findIndex(s => s.id === store.id);
    if (existingIdx !== -1) {
      await this.updateStore(store.id, store);
    } else {
      await this.addStore(store);
    }
  }

  // 10. Delete Store
  public async deleteStore(storeId: string) {
    this.stores = this.stores.filter(s => s.id !== storeId);
    this.articles = this.articles.filter(a => a.storeId !== storeId);
    this.saveToLocalStorage();
    this.notify();
    try {
      await deleteDoc(doc(db, 'stores', storeId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `stores/${storeId}`);
    }
  }

  // 11. Delete Subscription Request
  public async deleteSubscription(subId: string) {
    this.subscriptions = this.subscriptions.filter(s => s.id !== subId);
    this.saveToLocalStorage();
    this.notify();
    try {
      await deleteDoc(doc(db, 'marketplace_subscriptions', subId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `marketplace_subscriptions/${subId}`);
    }
  }

  // 12. Get Aggregated Dropshippers Registry
  public getDropshippersRegistry() {
    const map = new Map<string, {
      id: string;
      name: string;
      email: string;
      phone?: string;
      landingPagesCount: number;
      landingPages: LandingPageConfig[];
      totalOrders: number;
      totalViews: number;
      totalProfitGenerated: number;
      paidProfit: number;
      pendingProfit: number;
      lastActivity: string;
    }>();

    // From landing pages
    this.landingPages.forEach(lp => {
      const key = (lp.ownerEmail || lp.ownerName || 'dropshipper-anonimo').toLowerCase().trim();
      const existing = map.get(key) || {
        id: lp.id,
        name: lp.ownerName || 'Afiliado / Dropshipper',
        email: lp.ownerEmail || 'contacto@sanpimarket.com',
        phone: lp.whatsappNumber,
        landingPagesCount: 0,
        landingPages: [],
        totalOrders: 0,
        totalViews: 0,
        totalProfitGenerated: 0,
        paidProfit: 0,
        pendingProfit: 0,
        lastActivity: lp.createdAt
      };

      existing.landingPagesCount += 1;
      existing.landingPages.push(lp);
      existing.totalViews += (lp.views || 0);
      if (lp.whatsappNumber && !existing.phone) existing.phone = lp.whatsappNumber;

      map.set(key, existing);
    });

    // From deliveries / orders
    this.deliveries.forEach(d => {
      if (d.dropshipperName || d.dropshipperId || d.landingPageSlug) {
        const key = (d.dropshipperName || d.landingPageSlug || 'dropshipper').toLowerCase().trim();
        const existing = map.get(key) || {
          id: d.dropshipperId || `ds_${Date.now()}`,
          name: d.dropshipperName || 'Revendedor COD',
          email: `${key}@sanpimarket.com`,
          landingPagesCount: 0,
          landingPages: [],
          totalOrders: 0,
          totalViews: 0,
          totalProfitGenerated: 0,
          paidProfit: 0,
          pendingProfit: 0,
          lastActivity: d.createdAt
        };

        existing.totalOrders += 1;
        const profit = d.dropshipperProfit || 0;
        existing.totalProfitGenerated += profit;
        if (d.status === 'entregado') {
          existing.paidProfit += profit;
        } else if (d.status === 'pendiente' || d.status === 'en_transito') {
          existing.pendingProfit += profit;
        }

        map.set(key, existing);
      }
    });

    return Array.from(map.values());
  }

  // --- 10. LANDING PAGES ENGINE ---
  public getLandingPageBySlug(slug: string): LandingPageConfig | undefined {
    return this.landingPages.find(lp => lp.slug.toLowerCase() === slug.toLowerCase());
  }

  public async createLandingPage(data: Omit<LandingPageConfig, 'id' | 'views' | 'ordersCount' | 'createdAt'>): Promise<LandingPageConfig> {
    const id = `lp_${Date.now()}`;
    // Clean slug
    const cleanSlug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const newLp: LandingPageConfig = {
      ...data,
      id,
      slug: cleanSlug || `lp-${Date.now()}`,
      views: 0,
      ordersCount: 0,
      createdAt: new Date().toISOString()
    };

    this.landingPages = [newLp, ...this.landingPages];
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'landing_pages', id), newLp);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `landing_pages/${id}`);
    }

    return newLp;
  }

  public async updateLandingPage(id: string, updates: Partial<LandingPageConfig>) {
    const idx = this.landingPages.findIndex(l => l.id === id);
    if (idx === -1) return;

    this.landingPages[idx] = { ...this.landingPages[idx], ...updates };
    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'landing_pages', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `landing_pages/${id}`);
    }
  }

  public async deleteLandingPage(id: string) {
    this.landingPages = this.landingPages.filter(l => l.id !== id);
    this.saveToLocalStorage();
    this.notify();
    try {
      await deleteDoc(doc(db, 'landing_pages', id));
    } catch (e) {
      // ignore
    }
  }

  public async incrementLandingPageViews(slug: string) {
    const lp = this.landingPages.find(l => l.slug === slug);
    if (!lp) return;
    lp.views = (lp.views || 0) + 1;
    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'landing_pages', lp.id), { views: lp.views });
    } catch (e) {
      // ignore
    }
  }

  // --- 11. DROPSHIPPER HUB ENGINE ---
  public async addDropshipItem(data: Omit<DropshipItem, 'id' | 'createdAt'>): Promise<DropshipItem> {
    const id = `ds_${Date.now()}`;
    const newDs: DropshipItem = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };

    this.dropshipItems = [newDs, ...this.dropshipItems];
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'dropship_items', id), newDs);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `dropship_items/${id}`);
    }

    return newDs;
  }

  public getDropshipperStats(dropshipperEmail: string) {
    const userLps = this.landingPages.filter(l => l.ownerEmail?.toLowerCase() === dropshipperEmail.toLowerCase());
    const userOrders = this.deliveries.filter(d => d.dropshipperName?.toLowerCase().includes(dropshipperEmail.toLowerCase()) || userLps.some(lp => lp.slug === d.landingPageSlug));
    const deliveredOrders = userOrders.filter(d => d.status === 'entregado');
    
    const totalViews = userLps.reduce((acc, lp) => acc + (lp.views || 0), 0);
    const totalOrdersCount = userOrders.length;
    const conversionRate = totalViews > 0 ? (totalOrdersCount / totalViews) * 100 : 0;
    
    const totalProfitsGenerated = userOrders.reduce((acc, d) => acc + (d.dropshipperProfit || 0), 0);
    const paidProfits = deliveredOrders.reduce((acc, d) => acc + (d.dropshipperProfit || 0), 0);
    const pendingProfits = totalProfitsGenerated - paidProfits;

    return {
      userLps,
      totalViews,
      totalOrdersCount,
      conversionRate,
      totalProfitsGenerated,
      paidProfits,
      pendingProfits
    };
  }

  // --- 12. STORE REFERRAL PROGRAM ENGINE ---
  public findStoreByReferralCode(code: string): Store | undefined {
    if (!code) return undefined;
    const clean = code.trim().toUpperCase();
    return this.stores.find(s => 
      s.referralCode?.toUpperCase() === clean || 
      `SANPI-${(s.slug || '').toUpperCase()}` === clean ||
      s.slug.toUpperCase() === clean
    );
  }

  public async applyStoreReferralDiscount(storeId: string, discountPercent: number, note: string = '') {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) return;

    store.referralDiscountPercent = discountPercent;
    store.referralDiscountStatus = 'activo';
    store.referralDiscountNote = note || `Descuento de referido del ${discountPercent}% configurado por el Administrador.`;

    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'stores', storeId), {
        referralDiscountPercent: store.referralDiscountPercent,
        referralDiscountStatus: store.referralDiscountStatus,
        referralDiscountNote: store.referralDiscountNote
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stores/${storeId}`);
    }
  }

  public async updateStoreReferralCode(storeId: string, customCode: string) {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) return;

    const formattedCode = customCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    store.referralCode = formattedCode;

    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'stores', storeId), {
        referralCode: formattedCode
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stores/${storeId}`);
    }
  }

  public async toggleStoreReferralProgram(storeId: string, active: boolean) {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) return;

    store.referralProgramActive = active;

    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'stores', storeId), {
        referralProgramActive: active
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stores/${storeId}`);
    }
  }

  public async createStoreReferral(data: Omit<StoreReferralRecord, 'id' | 'createdAt'>): Promise<StoreReferralRecord> {
    const id = `ref_${Date.now()}`;
    const newRef: StoreReferralRecord = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      appliedByAdminAt: new Date().toISOString()
    };

    this.storeReferrals = [newRef, ...this.storeReferrals];

    // Update referrer store stats
    const referrer = this.stores.find(s => s.id === data.referrerStoreId);
    if (referrer) {
      referrer.totalReferredStoresCount = (referrer.totalReferredStoresCount || 0) + 1;
      referrer.totalReferralSavings = (referrer.totalReferralSavings || 0) + 1500;
      updateDoc(doc(db, 'stores', referrer.id), {
        totalReferredStoresCount: referrer.totalReferredStoresCount,
        totalReferralSavings: referrer.totalReferralSavings
      }).catch(() => {});
    }

    // Update referred store discount if specified
    const referred = this.stores.find(s => s.id === data.referredStoreId);
    if (referred) {
      referred.referredByStoreId = data.referrerStoreId;
      referred.referredByStoreName = data.referrerStoreName;
      referred.referredByCode = data.referralCode;
      referred.referralDiscountPercent = data.discountPercentApplied;
      referred.referralDiscountStatus = 'activo';
      updateDoc(doc(db, 'stores', referred.id), {
        referredByStoreId: referred.referredByStoreId,
        referredByStoreName: referred.referredByStoreName,
        referredByCode: referred.referredByCode,
        referralDiscountPercent: referred.referralDiscountPercent,
        referralDiscountStatus: 'activo'
      }).catch(() => {});
    }

    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'store_referrals', id), newRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `store_referrals/${id}`);
    }

    return newRef;
  }

  public async deleteStoreReferral(id: string) {
    this.storeReferrals = this.storeReferrals.filter(r => r.id !== id);
    this.saveToLocalStorage();
    this.notify();

    try {
      await deleteDoc(doc(db, 'store_referrals', id));
    } catch (e) {
      // ignore
    }
  }

  public getStoreReferralStats(storeId: string) {
    const store = this.stores.find(s => s.id === storeId);
    const storeCode = store?.referralCode || `SANPI-${(store?.slug || '').toUpperCase()}`;
    const referralsGiven = this.storeReferrals.filter(r => r.referrerStoreId === storeId || r.referralCode === storeCode);
    const referredBy = this.storeReferrals.find(r => r.referredStoreId === storeId);
    
    return {
      store,
      referralCode: storeCode,
      referralDiscountPercent: store?.referralDiscountPercent || 10,
      referralDiscountStatus: store?.referralDiscountStatus || 'activo',
      totalReferredStores: referralsGiven.length,
      referralsGiven,
      referredBy,
      totalSavingsRD: (store?.totalReferralSavings || (referralsGiven.length * 1500))
    };
  }

  // --- 13. MEMBERSHIP PLANS ENGINE (ADMIN MANAGED) ---
  public getPlans(activeOnly: boolean = false): SanpiPlan[] {
    if (activeOnly) {
      return this.plans.filter(p => p.isActive);
    }
    return this.plans;
  }

  public getPlanById(planId?: string): SanpiPlan | undefined {
    if (!planId) return undefined;
    const clean = planId.toLowerCase().trim();
    // Support aliases: elite -> full
    if (clean === 'elite') {
      const full = this.plans.find(p => p.id === 'full');
      if (full) return full;
    }
    return this.plans.find(p => p.id.toLowerCase() === clean);
  }

  public getPlanFee(planId?: string): number {
    const plan = this.getPlanById(planId);
    if (plan) return plan.monthlyFee;
    if (planId === 'basic') return 600;
    if (planId === 'pro') return 1500;
    if (planId === 'full' || planId === 'elite') return 2000;
    return 1500;
  }

  public getPlanCommissionRate(planId?: string): number {
    const plan = this.getPlanById(planId);
    if (plan) {
      if (plan.commissionRate !== undefined) return plan.commissionRate;
      if (plan.commissionPercent !== undefined) return plan.commissionPercent / 100;
    }
    if (planId === 'basic') return 0.15;
    if (planId === 'pro') return 0.10;
    if (planId === 'full' || planId === 'elite') return 0.08;
    return 0.10;
  }

  public async addPlan(planData: Omit<SanpiPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<SanpiPlan> {
    const rawId = planData.id ? planData.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') : `plan_${Date.now()}`;
    const id = rawId || `plan_${Date.now()}`;
    const now = new Date().toISOString();

    const commissionPercent = planData.commissionPercent ?? (planData.commissionRate ? planData.commissionRate * 100 : 10);
    const commissionRate = planData.commissionRate ?? (commissionPercent / 100);

    const newPlan: SanpiPlan = {
      ...planData,
      id,
      commissionPercent,
      commissionRate,
      isActive: planData.isActive ?? true,
      features: planData.features || [],
      createdAt: now,
      updatedAt: now
    };

    // If marked as popular, update other plans
    if (newPlan.popular) {
      this.plans.forEach(p => { p.popular = false; });
    }

    this.plans = [...this.plans, newPlan];
    this.saveToLocalStorage();
    this.notify();

    try {
      await setDoc(doc(db, 'membership_plans', id), newPlan);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `membership_plans/${id}`);
    }

    return newPlan;
  }

  public async updatePlan(id: string, updates: Partial<SanpiPlan>): Promise<void> {
    const index = this.plans.findIndex(p => p.id === id);
    if (index === -1) return;

    if (updates.commissionPercent !== undefined && updates.commissionRate === undefined) {
      updates.commissionRate = updates.commissionPercent / 100;
    } else if (updates.commissionRate !== undefined && updates.commissionPercent === undefined) {
      updates.commissionPercent = Math.round(updates.commissionRate * 100);
    }

    if (updates.popular) {
      this.plans.forEach(p => {
        if (p.id !== id) p.popular = false;
      });
    }

    const updatedPlan: SanpiPlan = {
      ...this.plans[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.plans[index] = updatedPlan;
    this.saveToLocalStorage();
    this.notify();

    try {
      await updateDoc(doc(db, 'membership_plans', id), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `membership_plans/${id}`);
    }
  }

  public async deletePlan(id: string): Promise<void> {
    this.plans = this.plans.filter(p => p.id !== id);
    this.saveToLocalStorage();
    this.notify();

    try {
      await deleteDoc(doc(db, 'membership_plans', id));
    } catch (err) {
      // ignore
    }
  }

  public async togglePlanStatus(id: string): Promise<void> {
    const plan = this.plans.find(p => p.id === id);
    if (!plan) return;
    await this.updatePlan(id, { isActive: !plan.isActive });
  }

  public async resetPlansToDefault(): Promise<void> {
    this.plans = [...DEFAULT_SANPI_PLANS];
    this.saveToLocalStorage();
    this.notify();

    for (const p of DEFAULT_SANPI_PLANS) {
      try {
        await setDoc(doc(db, 'membership_plans', p.id), p);
      } catch {
        // ignore
      }
    }
  }

  // --- FINANCIAL CALCULATIONS ---
  public getFinancialSummary() {
    // 1. MRR: Sum of monthly fees for approved store subscriptions based on dynamic plan fees
    const approvedStores = this.stores.filter(s => s.status === 'approved' && s.isMarketplace);
    const mrr = approvedStores.reduce((acc, s) => acc + this.getPlanFee(s.plan), 0);

    // 2. Sales Commissions Earned on Delivered Orders
    const deliveredTx = this.transactions.filter(t => t.status === 'entregado');
    const totalCommissions = deliveredTx.reduce((acc, t) => acc + t.commissionAmount, 0);

    // 3. Freight processed (RD$ 350 per delivered order)
    const totalShippingCollected = deliveredTx.reduce((acc, t) => acc + t.shippingFee, 0);

    // 4. Dropshipper payouts delivered
    const totalDropshipperPayouts = deliveredTx.reduce((acc, t) => acc + (t.dropshipperProfit || 0), 0);

    // 5. Total Gross Revenue (MRR + Commissions)
    const grossRevenue = mrr + totalCommissions;

    // 6. Total Expenses
    const totalExpenses = this.expenses.reduce((acc, e) => acc + e.amount, 0);

    // 7. Net Profit (Utilidad Neta)
    const netProfit = grossRevenue - totalExpenses;

    return {
      mrr,
      totalCommissions,
      totalShippingCollected,
      totalDropshipperPayouts,
      grossRevenue,
      totalExpenses,
      netProfit,
      deliveredOrdersCount: deliveredTx.length,
      totalOrdersCount: this.deliveries.length,
      activeLandingPagesCount: this.landingPages.filter(l => l.active).length
    };
  }
}

export const sanpiManager = SanpiStoreManager.getInstance();
