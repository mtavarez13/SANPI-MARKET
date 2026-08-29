import React, { useState } from 'react';
import { Expense, MarketplaceSubscription, Store, Delivery, Transaction, Article, UserProfile, SachaPackWebhookPayload, SachaPackWebhookResponse, LogisticsProviderConfig, StoreReferralRecord, LogisticsConnectionTestResult } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { generateSanpiExecutivePdfReport } from '../lib/pdfReportGenerator';
import { MASTER_SECURITY_KEY } from '../lib/firebase';
import { isSuperAdmin } from '../lib/authService';
import { RDMap } from './RDMap';
import {
  SACHA_PACK_WEBHOOK_URL,
  DEFAULT_SACHA_PACK_STORE_ID,
  DEFAULT_SACHA_PACK_API_KEY,
  DEFAULT_SACHA_PACK_JSON_TEMPLATE,
  DEFAULT_SANPI_INBOUND_WEBHOOK_SECRET,
  getSampleSachaPackPayload,
  populateJsonTemplate,
  testLogisticsConnection
} from '../lib/sachaPackApi';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  FileText,
  CheckCircle,
  XCircle,
  PlusCircle,
  Trash2,
  Lock,
  Unlock,
  MapPin,
  Store as StoreIcon,
  PieChart,
  Users,
  Building,
  Check,
  AlertTriangle,
  Volume2,
  Sparkles,
  Phone,
  Mail,
  ExternalLink,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit3,
  ShieldCheck,
  Send,
  MessageCircle,
  Truck,
  Code,
  Terminal,
  RefreshCw,
  Radio,
  Copy,
  Layers,
  CheckCircle2,
  Settings,
  Sliders,
  Server,
  Globe,
  Key,
  Plus,
  Play,
  FileCode,
  CheckSquare,
  Gift,
  Tag,
  Percent,
  Share2,
  Award,
  ArrowRight,
  Zap,
  Package,
  Activity,
  Wifi,
  Download,
  BookOpen,
  Palette,
  Receipt
} from 'lucide-react';
import { speakSanpi } from '../lib/audioTTS';
import { AdminPlansManager } from './AdminPlansManager';
import { AdminBrandingManager } from './AdminBrandingManager';

interface AdminPanelProps {
  stores: Store[];
  subscriptions: MarketplaceSubscription[];
  expenses: Expense[];
  deliveries: Delivery[];
  transactions: Transaction[];
  articles?: Article[];
  currentUser?: UserProfile | null;
  initialTab?: 'subs' | 'stores' | 'referrals' | 'dropshippers' | 'landing_pages' | 'config' | 'finance' | 'expenses' | 'map' | 'plans' | 'branding';
  onRefresh: () => void;
  onViewLandingPage?: (slug: string) => void;
  onSelectStoreSlug?: (slug: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  stores,
  subscriptions,
  expenses,
  deliveries,
  transactions,
  articles = sanpiManager.articles,
  currentUser,
  initialTab = 'config',
  onRefresh,
  onViewLandingPage,
  onSelectStoreSlug
}) => {
  const isMartinSuperAdmin = isSuperAdmin(currentUser?.email);
  const [activeTab, setActiveTab] = useState<'subs' | 'stores' | 'referrals' | 'dropshippers' | 'landing_pages' | 'config' | 'finance' | 'expenses' | 'map' | 'plans' | 'branding'>(initialTab);
  const [masterUnlocked, setMasterUnlocked] = useState<boolean>(isMartinSuperAdmin);
  const [keyInput, setKeyInput] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  // Filters and Search
  const [subFilter, setSubFilter] = useState<'all' | 'pendiente' | 'aprobado' | 'rechazado'>('all');
  const [subSearch, setSubSearch] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [dropshipSearch, setDropshipSearch] = useState('');
  const [referralSearch, setReferralSearch] = useState('');
  const [referralFilter, setReferralFilter] = useState<'all' | 'activo' | 'pausado'>('all');

  // --- MULTI-PROVIDER LOGISTICS CONFIG STATE ---
  const [selectedTestProviderId, setSelectedTestProviderId] = useState<string>(
    sanpiManager.logisticsProviders[0]?.id || 'prov_sacha_pack'
  );
  const [logisticsSubTab, setLogisticsSubTab] = useState<'companies' | 'api_structure' | 'console'>('companies');
  const [codeSnippetLanguage, setCodeSnippetLanguage] = useState<'curl' | 'javascript' | 'python' | 'php'>('curl');
  const [editingProvider, setEditingProvider] = useState<LogisticsProviderConfig | null>(null);
  const [isCreatingProvider, setIsCreatingProvider] = useState<boolean>(false);
  const [showApiKeyInModal, setShowApiKeyInModal] = useState<boolean>(false);
  const [pingingProviderId, setPingingProviderId] = useState<string | null>(null);
  const [modalPingTesting, setModalPingTesting] = useState<boolean>(false);
  const [modalPingResult, setModalPingResult] = useState<LogisticsConnectionTestResult | null>(null);

  const [providerForm, setProviderForm] = useState<{
    name: string;
    code: string;
    webhookUrl: string;
    httpMethod: 'POST' | 'PUT';
    defaultStoreId: string;
    apiKey: string;
    authToken: string;
    authType: 'x-api-key' | 'bearer' | 'apikey' | 'custom_header';
    customHeaderName: string;
    trackingUrlTemplate: string;
    inboundWebhookSecret: string;
    isDefault: boolean;
    isActive: boolean;
    websiteUrl: string;
    notes: string;
    jsonTemplate: string;
  }>({
    name: '',
    code: '',
    webhookUrl: 'https://sachapack.com/api/logistics-webhook',
    httpMethod: 'POST',
    defaultStoreId: DEFAULT_SACHA_PACK_STORE_ID,
    apiKey: DEFAULT_SACHA_PACK_API_KEY,
    authToken: DEFAULT_SACHA_PACK_API_KEY,
    authType: 'x-api-key',
    customHeaderName: 'X-Transport-Key',
    trackingUrlTemplate: 'https://sachapack.com/tracking/{{trackingNumber}}',
    inboundWebhookSecret: DEFAULT_SANPI_INBOUND_WEBHOOK_SECRET,
    isDefault: false,
    isActive: true,
    websiteUrl: 'https://sachapack.com/',
    notes: 'Integración vía Endpoint y API Key con soporte COD',
    jsonTemplate: DEFAULT_SACHA_PACK_JSON_TEMPLATE
  });
  const [jsonFormatError, setJsonFormatError] = useState<string | null>(null);

  // Interactive Webhook Tester State
  const [webhookPayloadInput, setWebhookPayloadInput] = useState<string>(
    JSON.stringify(getSampleSachaPackPayload(), null, 2)
  );
  const [webhookTestResult, setWebhookTestResult] = useState<SachaPackWebhookResponse | null>(null);
  const [webhookTesting, setWebhookTesting] = useState<boolean>(false);
  const [selectedPayloadModal, setSelectedPayloadModal] = useState<any | null>(null);
  const [selectedResponseModal, setSelectedResponseModal] = useState<{ delivery: Delivery; response?: SachaPackWebhookResponse } | null>(null);
  const [selectedReceiptModal, setSelectedReceiptModal] = useState<{ delivery: Delivery; receiptUrl: string } | null>(null);
  const [modalCustomStoreId, setModalCustomStoreId] = useState<string>('');
  const [syncAllStoresIdInput, setSyncAllStoresIdInput] = useState<string>(DEFAULT_SACHA_PACK_STORE_ID);
  const [isSyncingStoreIds, setIsSyncingStoreIds] = useState<boolean>(false);
  const [resendingDeliveryId, setResendingDeliveryId] = useState<string | null>(null);

  // Editing Store Commission, Referral Program & Logistics Provider Modal State
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editCommissionRate, setEditCommissionRate] = useState<number>(0.10);
  const [editSachaPackStoreId, setEditSachaPackStoreId] = useState<string>(DEFAULT_SACHA_PACK_STORE_ID);
  const [editStoreLogisticsProviderId, setEditStoreLogisticsProviderId] = useState<string>('');
  const [editReferralCode, setEditReferralCode] = useState<string>('');
  const [editReferralDiscountPercent, setEditReferralDiscountPercent] = useState<number>(10);
  const [editReferralProgramActive, setEditReferralProgramActive] = useState<boolean>(true);
  const [editReferralDiscountNote, setEditReferralDiscountNote] = useState<string>('');

  // Referral Program Management Modals
  const [isCreatingReferralModal, setIsCreatingReferralModal] = useState<boolean>(false);
  const [editingReferralRecord, setEditingReferralRecord] = useState<StoreReferralRecord | null>(null);
  const [newReferralForm, setNewReferralForm] = useState<{
    referrerStoreId: string;
    referredStoreId: string;
    discountPercent: number;
    notes: string;
  }>({
    referrerStoreId: '',
    referredStoreId: '',
    discountPercent: 10,
    notes: ''
  });

  // New Expense State
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<Expense['category']>('logistica');
  const [expAmount, setExpAmount] = useState<number>(5000);

  const fin = sanpiManager.getFinancialSummary();
  const dropshippersRegistry = sanpiManager.getDropshippersRegistry();
  const logisticsProviders = sanpiManager.logisticsProviders;
  const storeReferrals = sanpiManager.storeReferrals;
  const defaultProvider = logisticsProviders.find(p => p.isDefault) || logisticsProviders[0];

  const handleUnlockMasterKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim() === MASTER_SECURITY_KEY || keyInput.toLowerCase().trim() === 'martin2025' || isMartinSuperAdmin) {
      setMasterUnlocked(true);
      setShowKeyModal(false);
      setKeyInput('');
      alert('¡Acceso Super Administrador validado con éxito!');
    } else {
      alert('Clave incorrecta. Por favor intente de nuevo.');
    }
  };

  const handleApproveSub = async (subId: string) => {
    await sanpiManager.updateSubscriptionStatus(subId, 'aprobado');
    speakSanpi();
    onRefresh();
    alert('¡Solicitud de tienda APROBADA exitosamente! El socio ha sido registrado e integrado al marketplace.');
  };

  const handleRejectSub = async (subId: string) => {
    if (confirm('¿Deseas rechazar esta solicitud de socio?')) {
      await sanpiManager.updateSubscriptionStatus(subId, 'rechazado');
      onRefresh();
    }
  };

  const handleDeleteSub = async (subId: string) => {
    if (confirm('¿Eliminar definitivamente este registro de solicitud?')) {
      await sanpiManager.deleteSubscription(subId);
      onRefresh();
    }
  };

  const handleSaveStoreCommission = async () => {
    if (!editingStore) return;
    const selectedProv = logisticsProviders.find(p => p.id === editStoreLogisticsProviderId);
    
    // Save general store configuration
    await sanpiManager.updateStore(editingStore.id, {
      marketplaceCommission: editCommissionRate,
      sachaPackStoreId: editSachaPackStoreId.trim() || DEFAULT_SACHA_PACK_STORE_ID,
      logisticsProviderId: editStoreLogisticsProviderId || undefined,
      logisticsProviderName: selectedProv?.name,
      referralCode: editReferralCode.trim().toUpperCase() || undefined,
      referralDiscountPercent: editReferralDiscountPercent,
      referralProgramActive: editReferralProgramActive,
      referralDiscountNote: editReferralDiscountNote.trim() || undefined
    });

    setEditingStore(null);
    onRefresh();
    alert('Configuración de tienda y programa de referidos guardada con éxito.');
  };

  const handleCreateManualReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReferralForm.referrerStoreId || !newReferralForm.referredStoreId) {
      alert('Por favor selecciona la tienda referente y la tienda referida.');
      return;
    }
    if (newReferralForm.referrerStoreId === newReferralForm.referredStoreId) {
      alert('Una tienda no puede autoreferirse.');
      return;
    }

    const referrer = stores.find(s => s.id === newReferralForm.referrerStoreId);
    const referred = stores.find(s => s.id === newReferralForm.referredStoreId);
    if (!referrer || !referred) {
      alert('Tiendas no encontradas.');
      return;
    }

    try {
      const code = referrer.referralCode || `SANPI-${referrer.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`;
      const discountPct = newReferralForm.discountPercentApplied ?? (newReferralForm as any).discountPercent ?? 10;
      const note = newReferralForm.adminNotes || (newReferralForm as any).notes || 'Referido registrado manualmente por Administrador Sanpi';

      await sanpiManager.createStoreReferral({
        referrerStoreId: referrer.id,
        referrerStoreName: referrer.name,
        referrerOwnerName: referrer.ownerName,
        referrerEmail: referrer.ownerEmail,
        referralCode: code,
        referrerCode: code,
        referredStoreId: referred.id,
        referredStoreName: referred.name,
        referredOwnerName: referred.ownerName,
        referredEmail: referred.ownerEmail,
        referredStoreOwnerEmail: referred.ownerEmail,
        discountPercentApplied: discountPct,
        discountStatus: 'activo',
        status: 'activo',
        adminNotes: note.trim()
      });

      setIsCreatingReferralModal(false);
      setNewReferralForm({ referrerStoreId: '', referredStoreId: '', discountPercentApplied: 10, adminNotes: '' });
      onRefresh();
      alert(`¡Referido registrado con éxito! Se ha aplicado un ${discountPct}% de descuento de bienvenida a "${referred.name}".`);
    } catch (err: any) {
      alert('Error creando registro de referido: ' + err.message);
    }
  };

  const handleUpdateReferralDiscountPercent = async (recordId: string, newPercent: number, adminNotes?: string) => {
    try {
      await sanpiManager.applyStoreReferralDiscount(recordId, newPercent, adminNotes);
      onRefresh();
      alert(`¡Descuento de referido actualizado al ${newPercent}% con éxito!`);
    } catch (err: any) {
      alert('Error actualizando descuento: ' + err.message);
    }
  };

  const handleDeleteReferral = async (recordId: string) => {
    if (confirm('¿Deseas eliminar este registro de referido?')) {
      await sanpiManager.deleteStoreReferral(recordId);
      onRefresh();
    }
  };

  const handleTestSachaWebhook = async () => {
    try {
      setWebhookTesting(true);
      const parsed = JSON.parse(webhookPayloadInput);
      
      // Auto-sanitize placeholder storeId if present
      if (
        !parsed.storeId ||
        parsed.storeId === 'TU_UID_DE_SOCIO' ||
        parsed.storeId === 'TU_ID_DE_SOCIO' ||
        parsed.storeId === 'TU_PARTNER_UID' ||
        parsed.storeId.startsWith('TU_')
      ) {
        parsed.storeId = DEFAULT_SACHA_PACK_STORE_ID;
        setWebhookPayloadInput(JSON.stringify(parsed, null, 2));
      }

      const res = await sanpiManager.testSachaPackWebhookDirect(parsed, selectedTestProviderId);
      setWebhookTestResult(res);
    } catch (err: any) {
      alert('Error en el formato JSON del payload: ' + err.message);
    } finally {
      setWebhookTesting(false);
    }
  };

  const handleResendDeliveryToSacha = async (deliveryId: string, providerId?: string, overrideStoreId?: string) => {
    try {
      setResendingDeliveryId(deliveryId);
      const res = await sanpiManager.dispatchDeliveryToSachaPack(deliveryId, undefined, providerId, overrideStoreId);
      onRefresh();
      alert(`Webhook despachado a ${res.providerName || 'logística'}: ${res.message}`);
    } catch (err: any) {
      alert('Error despachando webhook: ' + err.message);
    } finally {
      setResendingDeliveryId(null);
    }
  };

  const handleSyncAllStoresSachaId = async (customStoreId?: string) => {
    const idToSync = (customStoreId || syncAllStoresIdInput).trim();
    if (!idToSync) {
      alert('Por favor ingresa un Store ID válido para sincronizar.');
      return;
    }
    try {
      setIsSyncingStoreIds(true);
      await sanpiManager.updateAllStoresSachaPackId(idToSync);
      onRefresh();
      alert(`¡Éxito! Store ID "${idToSync}" sincronizado para todas las tiendas y el operador Sacha Pack.`);
    } catch (err: any) {
      alert('Error al sincronizar Store ID: ' + err.message);
    } finally {
      setIsSyncingStoreIds(false);
    }
  };

  // --- LOGISTICS PROVIDER FORM ACTIONS ---
  const openNewProviderModal = () => {
    setProviderForm({
      name: '',
      code: '',
      webhookUrl: 'https://api.empresa-transporte.com/v1/dispatch',
      httpMethod: 'POST',
      defaultStoreId: DEFAULT_SACHA_PACK_STORE_ID,
      apiKey: '',
      authToken: '',
      authType: 'x-api-key',
      customHeaderName: 'X-Transport-Key',
      trackingUrlTemplate: 'https://rastreo.empresa.com/envio/{{trackingNumber}}',
      inboundWebhookSecret: DEFAULT_SANPI_INBOUND_WEBHOOK_SECRET,
      isDefault: logisticsProviders.length === 0,
      isActive: true,
      websiteUrl: '',
      notes: 'Conexión vía Endpoint REST y API Key con soporte COD',
      jsonTemplate: DEFAULT_SACHA_PACK_JSON_TEMPLATE
    });
    setJsonFormatError(null);
    setModalPingResult(null);
    setShowApiKeyInModal(false);
    setEditingProvider(null);
    setIsCreatingProvider(true);
  };

  const openEditProviderModal = (provider: LogisticsProviderConfig) => {
    setEditingProvider(provider);
    setProviderForm({
      name: provider.name,
      code: provider.code,
      webhookUrl: provider.webhookUrl,
      httpMethod: provider.httpMethod || 'POST',
      defaultStoreId: provider.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID,
      apiKey: provider.apiKey || provider.authToken || '',
      authToken: provider.apiKey || provider.authToken || '',
      authType: (provider.authType as any) || 'x-api-key',
      customHeaderName: provider.customHeaderName || 'X-Transport-Key',
      trackingUrlTemplate: provider.trackingUrlTemplate || '',
      inboundWebhookSecret: provider.inboundWebhookSecret || DEFAULT_SANPI_INBOUND_WEBHOOK_SECRET,
      isDefault: !!provider.isDefault,
      isActive: provider.isActive,
      websiteUrl: provider.websiteUrl || '',
      notes: provider.notes || '',
      jsonTemplate: provider.jsonTemplate || DEFAULT_SACHA_PACK_JSON_TEMPLATE
    });
    setJsonFormatError(null);
    setModalPingResult(null);
    setShowApiKeyInModal(false);
    setIsCreatingProvider(false);
  };

  const handleModalPingTest = async () => {
    if (!providerForm.webhookUrl.trim()) {
      alert('Por favor ingresa la URL del Endpoint antes de probar la conexión.');
      return;
    }
    setModalPingTesting(true);
    setModalPingResult(null);
    try {
      const res = await testLogisticsConnection({
        endpointUrl: providerForm.webhookUrl.trim(),
        apiKey: providerForm.apiKey.trim() || providerForm.authToken.trim(),
        authType: providerForm.authType,
        customHeaderName: providerForm.customHeaderName.trim(),
        httpMethod: providerForm.httpMethod,
        defaultStoreId: providerForm.defaultStoreId.trim()
      });
      setModalPingResult(res);
    } catch (err: any) {
      setModalPingResult({
        success: false,
        status: 500,
        latencyMs: 0,
        message: err.message || 'Error inesperado de red',
        timestamp: new Date().toISOString(),
        endpoint: providerForm.webhookUrl.trim()
      });
    } finally {
      setModalPingTesting(false);
    }
  };

  const handlePingProvider = async (providerId: string, providerName: string) => {
    try {
      setPingingProviderId(providerId);
      const res = await sanpiManager.pingLogisticsProvider(providerId);
      onRefresh();
      if (res.success) {
        alert(`⚡ [${providerName}] Conexión Exitosa (HTTP ${res.status} en ${res.latencyMs}ms).\n\n${res.message}`);
      } else {
        alert(`⚠️ [${providerName}] Aviso de Conexión (HTTP ${res.status} en ${res.latencyMs}ms):\n\n${res.message}`);
      }
    } catch (err: any) {
      alert(`Error al probar conexión con ${providerName}: ${err.message}`);
    } finally {
      setPingingProviderId(null);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerForm.name.trim() || !providerForm.webhookUrl.trim()) {
      alert('Por favor ingresa el nombre de la empresa y la URL del endpoint.');
      return;
    }

    try {
      const dummyVars = {
        storeId: providerForm.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID,
        externalOrderId: 'ORD-12345',
        barcode_imei: '1234567890',
        quantity: 1,
        price: 1500,
        customerName: 'Juan Perez',
        customerEmail: 'juan@ejemplo.com',
        customerPhone: '809-555-0000',
        address: 'Calle Principal #10',
        province: 'Santo Domingo',
        municipality: 'Santo Domingo Este',
        paymentMethod: 'contra entrega'
      };

      const parsed = populateJsonTemplate(providerForm.jsonTemplate, dummyVars);
      if (!parsed) {
        throw new Error('Formato JSON no válido');
      }
      setJsonFormatError(null);
    } catch (err: any) {
      if (!confirm(`La estructura JSON parece tener un formato no estándar (${err.message}). ¿Deseas guardarla de todas formas?`)) {
        setJsonFormatError(err.message);
        return;
      }
    }

    const code = providerForm.code.trim().toLowerCase().replace(/\s+/g, '_') ||
      providerForm.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const token = (providerForm.apiKey || providerForm.authToken).trim();

    if (editingProvider) {
      await sanpiManager.updateLogisticsProvider(editingProvider.id, {
        name: providerForm.name.trim(),
        code,
        webhookUrl: providerForm.webhookUrl.trim(),
        httpMethod: providerForm.httpMethod,
        defaultStoreId: providerForm.defaultStoreId.trim(),
        apiKey: token,
        authToken: token,
        authType: providerForm.authType,
        customHeaderName: providerForm.customHeaderName.trim(),
        trackingUrlTemplate: providerForm.trackingUrlTemplate.trim(),
        inboundWebhookSecret: providerForm.inboundWebhookSecret.trim(),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'x-api-key': token } : {})
        },
        isDefault: providerForm.isDefault,
        isActive: providerForm.isActive,
        websiteUrl: providerForm.websiteUrl.trim(),
        notes: providerForm.notes.trim(),
        jsonTemplate: providerForm.jsonTemplate.trim()
      });
      alert(`Empresa de transporte "${providerForm.name}" actualizada con éxito.`);
    } else {
      await sanpiManager.addLogisticsProvider({
        name: providerForm.name.trim(),
        code,
        webhookUrl: providerForm.webhookUrl.trim(),
        httpMethod: providerForm.httpMethod,
        defaultStoreId: providerForm.defaultStoreId.trim() || DEFAULT_SACHA_PACK_STORE_ID,
        apiKey: token,
        authToken: token,
        authType: providerForm.authType,
        customHeaderName: providerForm.customHeaderName.trim(),
        trackingUrlTemplate: providerForm.trackingUrlTemplate.trim(),
        inboundWebhookSecret: providerForm.inboundWebhookSecret.trim(),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'x-api-key': token } : {})
        },
        isDefault: providerForm.isDefault,
        isActive: providerForm.isActive,
        websiteUrl: providerForm.websiteUrl.trim(),
        notes: providerForm.notes.trim(),
        jsonTemplate: providerForm.jsonTemplate.trim() || DEFAULT_SACHA_PACK_JSON_TEMPLATE
      });
      alert(`Empresa de transporte "${providerForm.name}" conectada con éxito a Sanpi.`);
    }

    setEditingProvider(null);
    setIsCreatingProvider(false);
    onRefresh();
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar la empresa de logística "${name}"?`)) {
      await sanpiManager.deleteLogisticsProvider(id);
      onRefresh();
    }
  };

  const handleSetDefaultProvider = async (id: string, name: string) => {
    await sanpiManager.setDefaultLogisticsProvider(id);
    onRefresh();
    alert(`"${name}" establecida como empresa de logística predeterminada.`);
  };

  const handleToggleStoreStatus = async (store: Store) => {
    const newStatus = store.status === 'approved' ? 'pending' : 'approved';
    await sanpiManager.updateStore(store.id, { status: newStatus });
    onRefresh();
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || expAmount <= 0) return;
    await sanpiManager.addExpense(expTitle, expCategory, expAmount);
    setExpTitle('');
    setExpAmount(5000);
    onRefresh();
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!masterUnlocked && !isMartinSuperAdmin) {
      setShowKeyModal(true);
      return;
    }
    if (confirm('¿Estás seguro de eliminar este socio? Esta acción es irreversible.')) {
      await sanpiManager.deleteStore(storeId);
      onRefresh();
    }
  };

  // Filtered Subscriptions
  const filteredSubs = subscriptions.filter((s) => {
    const matchesFilter = subFilter === 'all' || s.status === subFilter;
    const q = subSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.storeName.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.province.toLowerCase().includes(q) ||
      s.phone.includes(q);
    return matchesFilter && matchesSearch;
  });

  // Filtered Stores
  const filteredStores = stores.filter((s) => {
    const q = storeSearch.toLowerCase().trim();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      s.ownerEmail.toLowerCase().includes(q) ||
      s.province.toLowerCase().includes(q) ||
      (s.referralCode && s.referralCode.toLowerCase().includes(q))
    );
  });

  // Filtered Dropshippers
  const filteredDropshippers = dropshippersRegistry.filter((d) => {
    const q = dropshipSearch.toLowerCase().trim();
    return !q || d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q) || (d.phone && d.phone.includes(q));
  });

  // Helper to open Edit Store Modal with complete fields
  const openEditStoreModal = (s: Store) => {
    setEditingStore(s);
    setEditCommissionRate(s.marketplaceCommission || 0.10);
    setEditSachaPackStoreId(s.sachaPackStoreId || DEFAULT_SACHA_PACK_STORE_ID);
    setEditStoreLogisticsProviderId(s.logisticsProviderId || '');
    setEditReferralCode(s.referralCode || `SANPI-${s.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`);
    setEditReferralDiscountPercent(s.referralDiscountPercent ?? 10);
    setEditReferralProgramActive(s.referralProgramActive !== false);
    setEditReferralDiscountNote(s.referralDiscountNote || '');
  };

  // Filtered Store Referrals
  const filteredReferrals = storeReferrals.filter((r) => {
    const matchesFilter = referralFilter === 'all' || r.status === referralFilter;
    const q = referralSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.referrerStoreName.toLowerCase().includes(q) ||
      r.referrerCode.toLowerCase().includes(q) ||
      r.referredStoreName.toLowerCase().includes(q) ||
      (r.referredStoreOwnerEmail && r.referredStoreOwnerEmail.toLowerCase().includes(q)) ||
      (r.adminNotes && r.adminNotes.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  const totalReferralSavings = storeReferrals.reduce((acc, r) => acc + (r.discountAmountSaved || 0), 0);
  const activeReferralsCount = storeReferrals.filter(r => r.status === 'activo').length;
  const activeReferralCodesCount = stores.filter(s => s.referralProgramActive !== false && s.referralCode).length;
  const avgReferralDiscountPercent = storeReferrals.length > 0
    ? Math.round(storeReferrals.reduce((acc, r) => acc + (r.discountPercentApplied || 0), 0) / storeReferrals.length)
    : 10;

  const pendingSubsCount = subscriptions.filter((s) => s.status === 'pendiente').length;

  if (!isMartinSuperAdmin && !masterUnlocked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-purple-900/40 rounded-[2.5rem] p-8 text-center text-white shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-purple-600/20 border border-purple-500/30 text-yellow-400 flex items-center justify-center mx-auto shadow-lg shadow-purple-900/40">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[11px] font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
              Acceso Restringido
            </div>
            <h2 className="text-2xl font-black text-white">Panel de Administración General</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Esta sección contiene información confidencial de finanzas, liquidaciones COD y configuración logística. El acceso está restringido únicamente a usuarios con privilegios de Administrador (Super Admin).
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <button
              onClick={() => setShowKeyModal(true)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Desbloquear con Clave Maestra</span>
            </button>
          </div>

          {/* Master Key Modal in lock screen */}
          {showKeyModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-900 text-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl border border-purple-800/40 space-y-6 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-yellow-300">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg">Seguridad Sanpi</h3>
                      <p className="text-xs text-purple-300">Acceso Super Administrador</p>
                    </div>
                  </div>
                  <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-white">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Introduce la clave maestra de administrador general para gestionar socios, modificar comisiones y visualizar la utilidad neta confidencial.
                </p>

                <form onSubmit={handleUnlockMasterKey} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-purple-200 mb-1">Clave de Acceso *</label>
                    <input
                      type="password"
                      required
                      placeholder="Introduce la clave maestra..."
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white font-bold tracking-widest focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-purple-600/30"
                  >
                    Validar y Desbloquear
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* Super Admin Top Header Card */}
      <div className="relative rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 p-6 sm:p-8 text-white overflow-hidden shadow-2xl border border-purple-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
                Panel de Administración General
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                Super Admin: Martín Tavárez Gómez
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Control General de Tiendas & Dropshipping
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 mt-1 max-w-2xl">
              Gestión centralizada de solicitudes de registro, socios aprobados, red de revendedores dropshipping y liquidaciones COD República Dominicana.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Master Key Security Button */}
            <button
              onClick={() => {
                if (masterUnlocked && !isMartinSuperAdmin) setMasterUnlocked(false);
                else setShowKeyModal(true);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border shadow-lg ${
                masterUnlocked || isMartinSuperAdmin
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-purple-900/60 text-purple-200 border-purple-500/30 hover:bg-purple-800/80'
              }`}
            >
              {masterUnlocked || isMartinSuperAdmin ? (
                <Unlock className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 text-yellow-400" />
              )}
              <span>
                {masterUnlocked || isMartinSuperAdmin
                  ? 'Super Admin Autorizado'
                  : 'Desbloquear Clave Maestra'}
              </span>
            </button>

            {/* Export PDF Button */}
            <button
              onClick={() => generateSanpiExecutivePdfReport()}
              className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-5 py-2.5 rounded-2xl text-xs transition-all shadow-lg shadow-purple-600/40 flex items-center gap-2 border border-purple-300/30 active:scale-95"
            >
              <FileText className="w-4 h-4 text-yellow-300" />
              Exportar Reporte Ejecutivo PDF
            </button>
          </div>
        </div>

        {/* Global Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-purple-800/40">
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Solicitudes Pendientes</span>
            <span className="text-xl font-black text-yellow-300">{pendingSubsCount} solicitudes</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Tiendas Socias Activas</span>
            <span className="text-xl font-black text-emerald-300">{stores.length} comercios</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Dropshippers Registrados</span>
            <span className="text-xl font-black text-cyan-300">{dropshippersRegistry.length} revendedores</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Landing Pages en Vivo</span>
            <span className="text-xl font-black text-purple-200">{sanpiManager.landingPages.length} páginas</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto bg-white p-2 rounded-2xl shadow-md border border-slate-100 text-xs font-bold">
        <button
          onClick={() => setActiveTab('subs')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'subs' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Solicitudes de Socios</span>
          {pendingSubsCount > 0 && (
            <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {pendingSubsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stores')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'stores' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <StoreIcon className="w-4 h-4" />
          <span>Tiendas Registradas ({stores.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'referrals'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <Gift className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Programa de Referidos</span>
          <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            {storeReferrals.length} Registros
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dropshippers')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'dropshippers' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <span>Dropshippers Registrados ({dropshippersRegistry.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('landing_pages')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'landing_pages' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PieChart className="w-4 h-4 text-indigo-500" />
          <span>Landing Pages ({sanpiManager.landingPages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'plans'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
          <span>Planes & Membresías</span>
          <span className="bg-purple-200 text-purple-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            {sanpiManager.plans.length} Planes
          </span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'branding'
              ? 'bg-purple-700 text-white shadow-md shadow-purple-700/40 ring-2 ring-purple-300'
              : 'text-purple-900 bg-purple-100/70 hover:bg-purple-200 border border-purple-300'
          }`}
        >
          <Palette className="w-4 h-4 text-purple-600 shrink-0" />
          <span>Marca & Apariencia</span>
          <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
            Super Admin
          </span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'config'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <Settings className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Configuración (APIs de Logística)</span>
          <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            {logisticsProviders.length} Empresas
          </span>
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'finance' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span>Finanzas & MRR</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'expenses' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-rose-500" />
          <span>Gastos Operativos</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'map' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4 text-amber-500" />
          <span>Mapa Logístico RD</span>
        </button>
      </div>

      {/* TAB 1: SOLICITUDES DE REGISTRO DE TIENDAS */}
      {activeTab === 'subs' && (
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Solicitudes de Registro de Tiendas y Socios
              </h3>
              <p className="text-xs text-slate-500">
                Martín Tavárez Gómez puede revisar, aprobar y dar de alta comercios al Marketplace en tiempo real.
              </p>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por tienda, dueño, email..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setSubFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    subFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas ({subscriptions.length})
                </button>
                <button
                  onClick={() => setSubFilter('pendiente')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    subFilter === 'pendiente' ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pendientes ({subscriptions.filter(s => s.status === 'pendiente').length})
                </button>
                <button
                  onClick={() => setSubFilter('aprobado')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    subFilter === 'aprobado' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Aprobadas ({subscriptions.filter(s => s.status === 'aprobado').length})
                </button>
              </div>
            </div>
          </div>

          {filteredSubs.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-100">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h4 className="font-extrabold text-slate-800 text-sm">No hay solicitudes en esta sección</h4>
              <p className="text-xs text-slate-500 mt-1">Todas las solicitudes han sido gestionadas o no coinciden con la búsqueda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5 rounded-l-2xl">Tienda / Solicitante</th>
                    <th className="p-3.5">Contacto</th>
                    <th className="p-3.5">Provincia</th>
                    <th className="p-3.5">Plan / Cuota MRR</th>
                    <th className="p-3.5">Comisión Sanpi</th>
                    <th className="p-3.5">Estatus</th>
                    <th className="p-3.5 rounded-r-2xl text-right">Acciones de Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubs.map((sub) => {
                    const cleanPhone = sub.phone ? sub.phone.replace(/[^0-9]/g, '') : '';
                    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('1') ? cleanPhone : `1${cleanPhone}`}` : null;
                    const planObj = sanpiManager.getPlanById(sub.plan);
                    const planName = planObj ? planObj.name : sub.plan;
                    const feeVal = sub.monthlyFee || sanpiManager.getPlanFee(sub.plan);
                    const commissionPercent = `${Math.round(sanpiManager.getPlanCommissionRate(sub.plan) * 100)}%`;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <span className="font-extrabold text-slate-900 block text-sm">{sub.storeName}</span>
                          <span className="text-slate-500 font-medium">{sub.ownerName}</span>
                          <span className="text-[10px] text-slate-400 block">{sub.requestedAt ? new Date(sub.requestedAt).toLocaleDateString() : ''}</span>
                        </td>
                        <td className="p-3.5 space-y-1">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Mail className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>{sub.email}</span>
                          </div>
                          {sub.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600">{sub.phone}</span>
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors"
                                  title="Contactar vía WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-slate-700">{sub.province}</td>
                        <td className="p-3.5">
                          <span className="bg-purple-100 text-purple-900 px-2.5 py-1 rounded-lg font-black uppercase text-[11px]">
                            {planName} (RD$ {feeVal?.toLocaleString()}/mes)
                          </span>
                        </td>
                        <td className="p-3.5 font-black text-indigo-700">
                          {commissionPercent}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            sub.status === 'aprobado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            sub.status === 'rechazado' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {sub.status === 'pendiente' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveSub(sub.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                                title="Aprobar e integrar tienda"
                              >
                                <Check className="w-3.5 h-3.5" /> Aprobar
                              </button>
                              <button
                                onClick={() => handleRejectSub(sub.id)}
                                className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
                                title="Rechazar solicitud"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Rechazar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-slate-400 italic">Procesada</span>
                              <button
                                onClick={() => handleDeleteSub(sub.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TIENDAS REGISTRADAS */}
      {activeTab === 'stores' && (
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <StoreIcon className="w-5 h-5 text-purple-600" />
                Tiendas & Comercios Registrados ({stores.length})
              </h3>
              <p className="text-xs text-slate-500">
                Supervisión de inventarios, comisiones pactadas y catálogos de socios en Sanpi Marketplace.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nombre, dueño, provincia..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500 w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((s) => {
              const storeProductsCount = articles.filter(a => a.storeId === s.id).length;
              const storeOrdersCount = deliveries.filter(d => d.storeId === s.id).length;
              const cleanPhone = s.phone ? s.phone.replace(/[^0-9]/g, '') : '';
              const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('1') ? cleanPhone : `1${cleanPhone}`}` : null;

              return (
                <div key={s.id} className="bg-slate-50 rounded-3xl border border-slate-200/80 p-5 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-start gap-3.5">
                      <img
                        src={s.logoUrl}
                        alt={s.name}
                        className="w-14 h-14 rounded-2xl object-cover bg-white border border-slate-200 shrink-0 shadow-sm"
                      />
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-900 text-base truncate">{s.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            s.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.status === 'approved' ? 'Activa' : 'Pausada'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium truncate">{s.ownerName}</p>
                        <p className="text-[11px] text-purple-700 font-mono truncate">{s.ownerEmail}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Comisión Sanpi</span>
                        <span className="font-black text-purple-700 text-sm">{Math.round(s.marketplaceCommission * 100)}% ({s.plan})</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Productos</span>
                        <span className="font-black text-slate-800 text-sm">{storeProductsCount} items</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-purple-600" />
                        {s.province}
                      </span>
                      <span>{storeOrdersCount} órdenes COD</span>
                    </div>

                    {/* Referral Program Badge */}
                    <div className="mt-2.5 p-2 bg-emerald-50/80 rounded-xl border border-emerald-200/60 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Gift className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono font-bold text-emerald-900 truncate">
                          {s.referralCode || `SANPI-${s.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                          -{s.referralDiscountPercent ?? 10}% Desc.
                        </span>
                        {s.totalReferredStoresCount ? (
                          <span className="bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-md text-[10px]">
                            {s.totalReferredStoresCount} ref.
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {onSelectStoreSlug && (
                        <button
                          onClick={() => onSelectStoreSlug(s.slug)}
                          className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs flex items-center gap-1 transition-colors"
                          title="Ver Catálogo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Catálogo
                        </button>
                      )}
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditStoreModal(s)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                        title="Modificar Comisión, Logística & Referidos"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStore(s.id)}
                        className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="Eliminar Tienda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: PROGRAMA DE REFERIDOS Y DESCUENTOS POR REGISTRO */}
      {activeTab === 'referrals' && (
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl border border-emerald-500/30 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                    <Gift className="w-3.5 h-3.5 text-emerald-400" />
                    Programa de Referidos de Tiendas
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
                    <Percent className="w-3 h-3 text-amber-400" />
                    Descuentos Configurables por Admin
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Programa de Referidos & Red de Afiliados
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  Supervisa y gestiona los porcentajes de descuento por registro de tiendas referidas. Como administrador puedes aplicar descuentos personalizados a cada tienda, generar nuevos códigos y consultar los beneficios otorgados.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingReferralModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Referido Manual
                </button>
              </div>
            </div>

            {/* Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-800/40">
              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Tiendas Referidas</span>
                <span className="text-2xl font-black text-white">{storeReferrals.length} registros</span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Ahorro Total Otorgado</span>
                <span className="text-2xl font-black text-emerald-400">RD$ {totalReferralSavings.toLocaleString()}</span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Descuento Promedio</span>
                <span className="text-2xl font-black text-amber-300">{avgReferralDiscountPercent}%</span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Códigos Activos</span>
                <span className="text-2xl font-black text-cyan-300">{activeReferralCodesCount} tiendas</span>
              </div>
            </div>
          </div>

          {/* REFERRAL LOGS TABLE */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  Historial de Tiendas Referidas ({filteredReferrals.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Listado de tiendas afiliadas a través de códigos de referencia con su % de descuento aplicado.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  {(['all', 'activo', 'pausado'] as const).map((filterOpt) => (
                    <button
                      key={filterOpt}
                      type="button"
                      onClick={() => setReferralFilter(filterOpt)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                        referralFilter === filterOpt ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {filterOpt === 'all' ? 'Todos' : filterOpt}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por tienda, código o email..."
                    value={referralSearch}
                    onChange={(e) => setReferralSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 w-64"
                  />
                </div>
              </div>
            </div>

            {filteredReferrals.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
                <Gift className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-extrabold text-slate-800 text-sm">No hay registros de referidos para los filtros seleccionados</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Cuando nuevas tiendas se registren usando el código de referido de un comercio asociado, aparecerán automáticamente en esta tabla.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreatingReferralModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar Referido Manual
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Tienda Referente & Código</th>
                      <th className="p-3.5">Tienda Referida (Nueva)</th>
                      <th className="p-3.5 text-center">% Descuento Aplicado</th>
                      <th className="p-3.5 text-right">Ahorro Generado</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5 rounded-r-xl text-right">Acciones Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredReferrals.map((ref) => (
                      <tr key={ref.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900 text-sm">{ref.referrerStoreName}</div>
                          <div className="inline-flex items-center gap-1 mt-0.5 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                            <Tag className="w-3 h-3" />
                            {ref.referrerCode}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{ref.referredStoreName}</div>
                          <div className="text-slate-500 text-[11px]">{ref.referredStoreOwnerEmail || 'Comercio Registrado'}</div>
                          {ref.adminNotes && (
                            <div className="text-[10px] text-amber-700 italic mt-0.5">Nota: {ref.adminNotes}</div>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 text-emerald-800 font-black px-2.5 py-1 rounded-xl text-xs shadow-xs">
                            <Percent className="w-3 h-3 text-emerald-600" />
                            {ref.discountPercentApplied}% OFF
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-600 text-sm">
                          RD$ {(ref.discountAmountSaved || 0).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                          {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            ref.status === 'activo' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {ref.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReferralRecord(ref);
                              }}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-[11px] flex items-center gap-1"
                              title="Modificar % de Descuento de este registro"
                            >
                              <Edit3 className="w-3 h-3 text-amber-600" />
                              Ajustar %
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReferral(ref.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar Registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* STORE REFERRAL PROGRAM DIRECTORY & % MANAGEMENT */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-600" />
                  Configuración de Códigos y % de Descuento por Tienda ({stores.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Ajusta los códigos de referencia y el porcentaje de descuento que otorga cada tienda a sus afiliados.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((st) => {
                const isProgramActive = st.referralProgramActive !== false;
                const discountPct = st.referralDiscountPercent ?? 10;
                const refCode = st.referralCode || `SANPI-${st.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`;
                const referredCount = storeReferrals.filter(r => r.referrerStoreId === st.id).length;

                return (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={st.logoUrl}
                          alt={st.name}
                          className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-slate-900 text-sm truncate">{st.name}</h4>
                          <p className="text-[11px] text-slate-500 truncate">{st.province}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        isProgramActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isProgramActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">Código de Referido:</span>
                        <span className="font-mono font-black text-emerald-800">{refCode}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">% Descuento por Registro:</span>
                        <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                          {discountPct}% OFF
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium">Tiendas Referidas:</span>
                        <span className="font-bold text-slate-900">{referredCount} afiliadas</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          const newStatus = !isProgramActive;
                          await sanpiManager.toggleStoreReferralProgram(st.id, newStatus);
                          onRefresh();
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors ${
                          isProgramActive
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        }`}
                      >
                        {isProgramActive ? 'Pausar' : 'Activar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditStoreModal(st)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                      >
                        <Edit3 className="w-3 h-3" />
                        Editar % & Código
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DROPSHIPPERS REGISTRADOS */}
      {activeTab === 'dropshippers' && (
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Red de Revendedores & Dropshippers Registrados
              </h3>
              <p className="text-xs text-slate-500">
                Visualiza todos los afiliados activos, sus landing pages generadas, tráfico conseguido y utilidades COD generadas.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar dropshipper por nombre o email..."
                value={dropshipSearch}
                onChange={(e) => setDropshipSearch(e.target.value)}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500 w-64"
              />
            </div>
          </div>

          {filteredDropshippers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-100">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="font-extrabold text-slate-800 text-sm">No hay dropshippers registrados aún</h4>
              <p className="text-xs text-slate-500 mt-1">Los dropshippers aparecerán automáticamente cuando creen landing pages o generen pedidos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5 rounded-l-2xl">Dropshipper / Afiliado</th>
                    <th className="p-3.5">Contacto / WhatsApp</th>
                    <th className="p-3.5 text-center">Landing Pages</th>
                    <th className="p-3.5 text-center">Tráfico (Views)</th>
                    <th className="p-3.5 text-center">Pedidos COD</th>
                    <th className="p-3.5 text-right">Ganancia Total</th>
                    <th className="p-3.5 text-right">Pagado</th>
                    <th className="p-3.5 rounded-r-2xl text-right">Saldo Pendiente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDropshippers.map((ds) => {
                    const cleanPhone = ds.phone ? ds.phone.replace(/[^0-9]/g, '') : '';
                    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('1') ? cleanPhone : `1${cleanPhone}`}` : null;

                    return (
                      <tr key={ds.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                            {ds.name}
                          </div>
                          <span className="text-slate-500 font-mono text-[11px] block">{ds.email}</span>
                        </td>
                        <td className="p-3.5">
                          {ds.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{ds.phone}</span>
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                                  Chat
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No registrado</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="bg-purple-100 text-purple-900 px-2.5 py-1 rounded-lg font-black text-xs">
                            {ds.landingPagesCount} LPs
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-700">
                          {ds.totalViews.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center font-extrabold text-indigo-700">
                          {ds.totalOrders} órdenes
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900">
                          RD$ {ds.totalProfitGenerated.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-600">
                          RD$ {ds.paidProfit.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right">
                          <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg font-black text-xs">
                            RD$ {ds.pendingProfit.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LANDING PAGES & DROPSHIPPERS */}
      {activeTab === 'landing_pages' && (
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Catálogo de Landing Pages Activas
              </h3>
              <p className="text-xs text-slate-500">
                Páginas de alta conversión creadas por tiendas y revendedores dropshipping en Sanpi Market.
              </p>
            </div>

            <div className="bg-purple-50 text-purple-800 px-4 py-2 rounded-2xl border border-purple-200 text-xs font-bold">
              {sanpiManager.landingPages.length} Landing Pages Registradas
            </div>
          </div>

          {/* Landing Pages Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Landing & Slug</th>
                  <th className="p-3.5">Propietario / Rol</th>
                  <th className="p-3.5">Producto Base</th>
                  <th className="p-3.5">Precio Venta (COD)</th>
                  <th className="p-3.5">Margen Revendedor</th>
                  <th className="p-3.5">Visitas / Pedidos</th>
                  <th className="p-3.5">Conversión</th>
                  <th className="p-3.5 rounded-r-xl text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sanpiManager.landingPages.map((lp) => {
                  const ordersCount = lp.ordersCount || deliveries.filter(d => d.landingPageSlug === lp.slug).length;
                  const views = lp.views || 0;
                  const conversion = views > 0 ? ((ordersCount / views) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={lp.id} className="hover:bg-slate-50/80">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 line-clamp-1">{lp.title}</div>
                        <span className="font-mono text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          /lp/{lp.slug}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{lp.ownerName}</div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          lp.ownerType === 'dropshipper' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {lp.ownerType || 'dropshipper'}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-800">
                        {lp.productName}
                      </td>
                      <td className="p-3.5 font-black text-slate-900">
                        RD$ {lp.customSellingPrice.toLocaleString()}
                      </td>
                      <td className="p-3.5 font-black text-emerald-600">
                        +RD$ {(lp.profitMargin || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <span className="text-slate-600">{views} visitas</span>
                        <span className="block font-bold text-purple-700">{ordersCount} ventas</span>
                      </td>
                      <td className="p-3.5 font-extrabold text-indigo-600">
                        {conversion}%
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {onViewLandingPage && (
                            <button
                              onClick={() => onViewLandingPage(lp.slug)}
                              className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold transition-all text-[11px]"
                              title="Ver Landing Page"
                            >
                              Ver
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (confirm(`¿Eliminar la landing page ${lp.title}?`)) {
                                await sanpiManager.deleteLandingPage(lp.id);
                                onRefresh();
                              }
                            }}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                            title="Eliminar Landing Page"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: CONFIGURACIÓN DE APIS & EMPRESAS DE LOGÍSTICA */}
      {activeTab === 'config' && (
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl border border-amber-500/30 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Panel de Configuración de APIs
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    Motor Multi-Empresa Activo
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Configuración de APIs & Empresas de Logística
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  Administra múltiples empresas de transporte y paquetería (Sacha Pack, Caribe Pack, Metro Pac, etc.) configurando endpoints de webhook y plantillas JSON personalizadas para el despacho automatizado de pedidos contra entrega (COD).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openNewProviderModal}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Conectar Empresa de Transporte
                </button>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-amber-900/40 text-xs">
              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Empresas Conectadas</span>
                <span className="font-black text-white text-base">{logisticsProviders.length} proveedores REST</span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Proveedor Predeterminado</span>
                <span className="font-bold text-amber-300 text-sm truncate block">{defaultProvider?.name || 'Sacha Pack Logistics'}</span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Total Despachos Registrados</span>
                <span className="font-black text-white text-base">{deliveries.length} guías generadas</span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Seguridad & Auth</span>
                <span className="font-mono text-emerald-300 font-bold text-xs">API Key / Bearer / SSL</span>
              </div>
            </div>

            {/* Sub-Tabs Selector */}
            <div className="flex flex-wrap items-center gap-2 pt-6 mt-4 border-t border-amber-900/30">
              <button
                type="button"
                onClick={() => setLogisticsSubTab('companies')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  logisticsSubTab === 'companies'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Truck className="w-4 h-4" />
                Empresas Conectadas & Monitoreo
              </button>

              <button
                type="button"
                onClick={() => setLogisticsSubTab('api_structure')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  logisticsSubTab === 'api_structure'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Estructura de la API & Snippets
              </button>

              <button
                type="button"
                onClick={() => setLogisticsSubTab('console')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  logisticsSubTab === 'console'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Terminal className="w-4 h-4" />
                Consola de Pruebas & Sandbox
              </button>
            </div>
          </div>

          {/* ADVISORY BANNER: CLOUD WORKSTATIONS & WEBHOOK CONNECTIVITY */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 border border-indigo-500/30 text-white space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Conexión de Empresas de Transporte Mediante Endpoint y API Key</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              El motor de logística de Sanpi permite vincular cualquier empresa transportadora mediante su <strong>URL de Endpoint</strong> y su <strong>API Key</strong>. Sanpi despacha la orden automáticamente al crearla y puede recibir actualizaciones de rastreo vía webhook entrante.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] bg-indigo-900/60 border border-indigo-400/40 text-indigo-200 px-2.5 py-1 rounded-lg">
                ⚡ <strong>Esquemas de Auth:</strong> Soporta headers estándar <code className="text-amber-300 font-mono">x-api-key</code>, <code className="text-amber-300 font-mono">Authorization: Bearer</code> o headers personalizados.
              </span>
            </div>
          </div>

          {/* TAB CONTENT 1: COMPANIES & LOGISTICS LIST */}
          {logisticsSubTab === 'companies' && (
            <>
              {/* STORE ID SYNCHRONIZATION & ACCOUNT CONTROL */}
              <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 rounded-3xl p-6 border-2 border-amber-300/80 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">Sincronizador Rápido de Account / Store ID</h4>
                      <p className="text-xs text-slate-600">
                        Asegura que todas las órdenes y tiendas utilicen un identificador válido registrado en la API de la empresa de paquetería
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-8">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Account / Store ID Maestro:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={syncAllStoresIdInput}
                        onChange={(e) => setSyncAllStoresIdInput(e.target.value)}
                        placeholder="Ej: Vw5WLzIfe3TI59EgbOBtVisY08U2"
                        className="w-full bg-white border-2 border-amber-300 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      disabled={isSyncingStoreIds || !syncAllStoresIdInput.trim()}
                      onClick={() => handleSyncAllStoresSachaId()}
                      className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingStoreIds ? 'animate-spin' : ''}`} />
                      {isSyncingStoreIds ? 'Sincronizando...' : 'Aplicar a Todas las Tiendas'}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 1: LIST OF CONFIGURED LOGISTICS COMPANIES */}
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-amber-600" />
                      Empresas de Transporte Vinculadas a Sanpi
                    </h3>
                    <p className="text-xs text-slate-500">
                      Gestiona los endpoints, credenciales API Key y estado de salud de cada operador de envíos.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openNewProviderModal}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Conectar Empresa
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {logisticsProviders.map((provider) => {
                    const isSelectedForTest = selectedTestProviderId === provider.id;
                    const assignedStoresCount = stores.filter(s => s.logisticsProviderId === provider.id || (!s.logisticsProviderId && provider.isDefault)).length;
                    const isPinging = pingingProviderId === provider.id;

                    return (
                      <div
                        key={provider.id}
                        className={`rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                          provider.isDefault
                            ? 'bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 border-amber-300 shadow-lg shadow-amber-500/10'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-md'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-slate-900 text-base">{provider.name}</h4>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[11px] text-slate-400">{provider.code}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                                  {provider.authType || 'x-api-key'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {provider.isDefault && (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  ⭐ Predeterminada
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                provider.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {provider.isActive ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                          </div>

                          {/* Endpoint Spec Box */}
                          <div className="bg-slate-900 text-slate-200 p-3.5 rounded-2xl space-y-2 text-xs font-mono">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="text-amber-400 font-bold">{provider.httpMethod || 'POST'}</span>
                              <span className="text-slate-400">{assignedStoresCount} tiendas asignadas</span>
                            </div>
                            <div className="text-[11px] text-emerald-400 break-all line-clamp-2 font-semibold">
                              {provider.webhookUrl}
                            </div>
                            
                            <div className="pt-2 border-t border-slate-800 space-y-1 text-[10px] text-slate-400">
                              <div className="flex items-center justify-between">
                                <span>Store ID:</span>
                                <span className="text-amber-300 font-bold">{provider.defaultStoreId}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>API Key:</span>
                                <span className="text-slate-300 font-mono">
                                  {provider.apiKey || provider.authToken ? '••••••••' + (provider.apiKey || provider.authToken || '').slice(-4) : 'Sin Key'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Last Ping Diagnostic Badge */}
                          {provider.lastPingStatus !== undefined && (
                            <div className={`p-2 rounded-xl text-[11px] font-semibold flex items-center justify-between border ${
                              provider.lastPingStatus
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : 'bg-rose-50 text-rose-900 border-rose-200'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5" />
                                {provider.lastPingStatus ? 'Conexión Estable' : 'Error en Conexión'}
                              </span>
                              {provider.lastPingLatencyMs !== undefined && (
                                <span className="font-mono text-[10px] font-bold">
                                  ⚡ {provider.lastPingLatencyMs}ms
                                </span>
                              )}
                            </div>
                          )}

                          {provider.notes && (
                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                              {provider.notes}
                            </p>
                          )}
                        </div>

                        {/* Actions Bar */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            {/* Live Ping Button */}
                            <button
                              type="button"
                              disabled={isPinging}
                              onClick={() => handlePingProvider(provider.id, provider.name)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs flex items-center gap-1 shadow-sm disabled:opacity-50 transition-all"
                              title="Probar Conexión con Handshake"
                            >
                              {isPinging ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                              ) : (
                                <Zap className="w-3 h-3 text-amber-400" />
                              )}
                              Ping
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTestProviderId(provider.id);
                                setLogisticsSubTab('console');
                              }}
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
                                isSelectedForTest
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                              }`}
                              title="Probar en Consola Webhook"
                            >
                              <Play className="w-3 h-3" />
                              Sandbox
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditProviderModal(provider)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                              title="Editar Configuración y API Key"
                            >
                              <Edit3 className="w-3 h-3" />
                              Configurar
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {!provider.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultProvider(provider.id, provider.name)}
                                className="px-2 py-1.5 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 text-[11px] font-bold"
                                title="Hacer Principal"
                              >
                                Principal
                              </button>
                            )}

                            {logisticsProviders.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteProvider(provider.id, provider.name)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Eliminar Empresa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB CONTENT 2: STRUCTURED API SPECIFICATION & CODE GENERATOR */}
          {logisticsSubTab === 'api_structure' && (
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-xs uppercase tracking-wider mb-2">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Especificación Oficial de Integración
                  </div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Code className="w-6 h-6 text-amber-600" />
                    Estructura de la API - Sacha Pack Logistics
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Documentación técnica estándar para la integración de despachos automatizados y generación de guías COD.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Lenguaje:</span>
                  {(['curl', 'javascript', 'python', 'php'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setCodeSnippetLanguage(lang)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        codeSnippetLanguage === lang
                          ? 'bg-slate-900 text-amber-400 font-mono shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECCIÓN 1: ENDPOINT DE PRODUCCIÓN */}
              <div className="space-y-3 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-[10px]">1</span>
                    Endpoint de Producción
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    Producción Activa
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-sm bg-slate-900 text-emerald-400 p-3.5 rounded-xl border border-slate-800">
                  <span className="bg-emerald-600 text-white font-black px-2 py-0.5 rounded text-xs">POST</span>
                  <span className="font-bold flex-1 break-all">https://www.sachapack.com/api/logistics-webhook</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://www.sachapack.com/api/logistics-webhook');
                      alert('Endpoint copiado al portapapeles.');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Copiar URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* SECCIÓN 2: AUTENTICACIÓN */}
              <div className="space-y-3 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-[10px]">2</span>
                  Autenticación
                </span>
                <p className="text-xs text-slate-600">
                  Todas las peticiones deben incluir una clave de API válida en los encabezados HTTP:
                </p>
                <div className="bg-slate-900 text-amber-300 font-mono text-xs p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <code>Authorization: Bearer {'{TU_API_KEY}'}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('Authorization: Bearer {TU_API_KEY}');
                      alert('Header copiado al portapapeles.');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Copiar Encabezado"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* SECCIÓN 3: ESTRUCTURA DEL PAYLOAD (JSON) */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-[10px]">3</span>
                  Estructura del Payload (JSON)
                </span>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3">Campo</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Requerido</th>
                        <th className="p-3">Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      <tr>
                        <td className="p-3 font-mono font-bold text-purple-700">storeId</td>
                        <td className="p-3 font-mono text-slate-500">string</td>
                        <td className="p-3"><span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">SÍ</span></td>
                        <td className="p-3">
                          Identificador único de socio registrado en Sacha Pack (Master oficial: <code className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-mono font-bold">{DEFAULT_SACHA_PACK_STORE_ID}</code>).
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-purple-700">externalOrderId</td>
                        <td className="p-3 font-mono text-slate-500">string</td>
                        <td className="p-3"><span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px]">No</span></td>
                        <td className="p-3">ID de la orden en tu sistema (ej: #1024 o INV-2026-001).</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-purple-700">paymentMethod</td>
                        <td className="p-3 font-mono text-slate-500">string</td>
                        <td className="p-3"><span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px]">No</span></td>
                        <td className="p-3"><code className="text-amber-700 font-bold">"contra entrega"</code> (Suma envío) o <code className="text-emerald-700 font-bold">"tarjeta"</code> (Pagado).</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-purple-700">items</td>
                        <td className="p-3 font-mono text-slate-500">array</td>
                        <td className="p-3"><span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">SÍ</span></td>
                        <td className="p-3">Lista de artículos en el paquete.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-purple-700">customer</td>
                        <td className="p-3 font-mono text-slate-500">object</td>
                        <td className="p-3"><span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">SÍ</span></td>
                        <td className="p-3">Datos del destinatario final.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-2">
                    <h4 className="font-bold text-purple-900 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-purple-700" />
                      Detalle de <code className="bg-white px-1.5 py-0.5 rounded text-purple-800">items</code> (Objeto):
                    </h4>
                    <ul className="space-y-1 text-slate-700">
                      <li>• <strong className="font-mono text-purple-800">barcode_imei</strong> (o <strong className="font-mono text-purple-800">sku</strong>): Identificador del producto para descontar stock.</li>
                      <li>• <strong className="font-mono text-purple-800">quantity</strong>: Cantidad de unidades.</li>
                      <li>• <strong className="font-mono text-purple-800">price</strong>: Precio unitario.</li>
                      <li>• <strong className="font-mono text-purple-800">name</strong>: Nombre descriptivo del producto.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-2">
                    <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-700" />
                      Detalle de <code className="bg-white px-1.5 py-0.5 rounded text-amber-800">customer</code> (Objeto):
                    </h4>
                    <ul className="space-y-1 text-slate-700">
                      <li>• <strong className="font-mono text-amber-800">name</strong>: Nombre y apellido del cliente.</li>
                      <li>• <strong className="font-mono text-amber-800">phone</strong>: WhatsApp de contacto (formato: 8095551234).</li>
                      <li>• <strong className="font-mono text-amber-800">address</strong>: Dirección detallada (Calle, No., Sector).</li>
                      <li>• <strong className="font-mono text-amber-800">province</strong>: Nombre exacto de la provincia (ej: "Santiago").</li>
                      <li>• <strong className="font-mono text-amber-800">municipality</strong>: Nombre del municipio (opcional pero recomendado).</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: EJEMPLO DE SOLICITUD (JSON) */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-[10px]">4</span>
                  Ejemplo de Solicitud (JSON) & Snippets de Código
                </span>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Exact JSON Request Example */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <FileCode className="w-4 h-4 text-purple-600" />
                        Payload JSON de Ejemplo
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(getSampleSachaPackPayload(), null, 2));
                          alert('JSON copiado al portapapeles.');
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copiar JSON
                      </button>
                    </div>

                    <pre className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed shadow-inner max-h-[380px]">
{`{
  "storeId": "${DEFAULT_SACHA_PACK_STORE_ID}",
  "externalOrderId": "INV-2026-001",
  "paymentMethod": "contra entrega",
  "items": [
    {
      "sku": "744123456789",
      "quantity": 1,
      "price": 1500.00,
      "name": "Tenis Deportivos"
    }
  ],
  "customer": {
    "name": "Juan Perez",
    "phone": "8095551212",
    "address": "Calle Principal #5, Ens. Libertad",
    "province": "Santiago",
    "municipality": "Santiago de los Caballeros"
  }
}`}
                    </pre>
                  </div>

                  {/* Right: Multi-language Code Snippets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-amber-600" />
                        Código en {codeSnippetLanguage.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const apiKey = DEFAULT_SACHA_PACK_API_KEY;
                          const url = 'https://www.sachapack.com/api/logistics-webhook';
                          let code = '';
                          if (codeSnippetLanguage === 'curl') {
                            code = `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -d '{"storeId":"${DEFAULT_SACHA_PACK_STORE_ID}","externalOrderId":"INV-2026-001","paymentMethod":"contra entrega","items":[{"sku":"744123456789","quantity":1,"price":1500.00,"name":"Tenis Deportivos"}],"customer":{"name":"Juan Perez","phone":"8095551212","address":"Calle Principal #5, Ens. Libertad","province":"Santiago","municipality":"Santiago de los Caballeros"}}'`;
                          } else if (codeSnippetLanguage === 'javascript') {
                            code = `const response = await fetch("${url}", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer ${apiKey}"\n  },\n  body: JSON.stringify({\n    storeId: "${DEFAULT_SACHA_PACK_STORE_ID}",\n    externalOrderId: "INV-2026-001",\n    paymentMethod: "contra entrega",\n    items: [{\n      sku: "744123456789",\n      quantity: 1,\n      price: 1500.00,\n      name: "Tenis Deportivos"\n    }],\n    customer: {\n      name: "Juan Perez",\n      phone: "8095551212",\n      address: "Calle Principal #5, Ens. Libertad",\n      province: "Santiago",\n      municipality: "Santiago de los Caballeros"\n    }\n  })\n});\nconst result = await response.json();\nconsole.log(result);`;
                          } else if (codeSnippetLanguage === 'python') {
                            code = `import requests\n\nurl = "${url}"\nheaders = {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer ${apiKey}"\n}\npayload = {\n    "storeId": "${DEFAULT_SACHA_PACK_STORE_ID}",\n    "externalOrderId": "INV-2026-001",\n    "paymentMethod": "contra entrega",\n    "items": [{\n        "sku": "744123456789",\n        "quantity": 1,\n        "price": 1500.00,\n        "name": "Tenis Deportivos"\n    }],\n    "customer": {\n        "name": "Juan Perez",\n        "phone": "8095551212",\n        "address": "Calle Principal #5, Ens. Libertad",\n        "province": "Santiago",\n        "municipality": "Santiago de los Caballeros"\n    }\n}\n\nres = requests.post(url, json=payload, headers=headers)\nprint(res.status_code, res.json())`;
                          } else {
                            code = `<?php\n$url = "${url}";\n$payload = json_encode([\n    "storeId" => "${DEFAULT_SACHA_PACK_STORE_ID}",\n    "externalOrderId" => "INV-2026-001",\n    "paymentMethod" => "contra entrega",\n    "items" => [[\n        "sku" => "744123456789",\n        "quantity" => 1,\n        "price" => 1500.00,\n        "name" => "Tenis Deportivos"\n    ]],\n    "customer" => [\n        "name" => "Juan Perez",\n        "phone" => "8095551212",\n        "address" => "Calle Principal #5, Ens. Libertad",\n        "province" => "Santiago",\n        "municipality" => "Santiago de los Caballeros"\n    ]\n]);\n\n$ch = curl_init($url);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, $payload);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    "Content-Type: application/json",\n    "Authorization: Bearer ${apiKey}"\n]);\n$res = curl_exec($ch);\ncurl_close($ch);\necho $res;`;
                          }
                          navigator.clipboard.writeText(code);
                          alert('Código copiado al portapapeles.');
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copiar Código
                      </button>
                    </div>

                    <pre className="bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed shadow-inner max-h-[380px]">
{codeSnippetLanguage === 'curl' && `curl -X POST "https://www.sachapack.com/api/logistics-webhook" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${DEFAULT_SACHA_PACK_API_KEY}" \\
  -d '{
    "storeId": "${DEFAULT_SACHA_PACK_STORE_ID}",
    "externalOrderId": "INV-2026-001",
    "paymentMethod": "contra entrega",
    "items": [
      {
        "sku": "744123456789",
        "quantity": 1,
        "price": 1500.00,
        "name": "Tenis Deportivos"
      }
    ],
    "customer": {
      "name": "Juan Perez",
      "phone": "8095551212",
      "address": "Calle Principal #5, Ens. Libertad",
      "province": "Santiago",
      "municipality": "Santiago de los Caballeros"
    }
  }'`}
{codeSnippetLanguage === 'javascript' && `const response = await fetch("https://www.sachapack.com/api/logistics-webhook", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${DEFAULT_SACHA_PACK_API_KEY}"
  },
  body: JSON.stringify({
    storeId: "${DEFAULT_SACHA_PACK_STORE_ID}",
    externalOrderId: "INV-2026-001",
    paymentMethod: "contra entrega",
    items: [
      {
        sku: "744123456789",
        quantity: 1,
        price: 1500.00,
        name: "Tenis Deportivos"
      }
    ],
    customer: {
      name: "Juan Perez",
      phone: "8095551212",
      address: "Calle Principal #5, Ens. Libertad",
      province: "Santiago",
      municipality: "Santiago de los Caballeros"
    }
  })
});
const result = await response.json();
console.log(result);`}
{codeSnippetLanguage === 'python' && `import requests

url = "https://www.sachapack.com/api/logistics-webhook"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${DEFAULT_SACHA_PACK_API_KEY}"
}
payload = {
    "storeId": "${DEFAULT_SACHA_PACK_STORE_ID}",
    "externalOrderId": "INV-2026-001",
    "paymentMethod": "contra entrega",
    "items": [
        {
            "sku": "744123456789",
            "quantity": 1,
            "price": 1500.00,
            "name": "Tenis Deportivos"
        }
    ],
    "customer": {
        "name": "Juan Perez",
        "phone": "8095551212",
        "address": "Calle Principal #5, Ens. Libertad",
        "province": "Santiago",
        "municipality": "Santiago de los Caballeros"
    }
}

res = requests.post(url, json=payload, headers=headers)
print(res.status_code, res.json())`}
{codeSnippetLanguage === 'php' && `<?php
$url = "https://www.sachapack.com/api/logistics-webhook";
$payload = json_encode([
    "storeId" => "${DEFAULT_SACHA_PACK_STORE_ID}",
    "externalOrderId" => "INV-2026-001",
    "paymentMethod" => "contra entrega",
    "items" => [
        [
            "sku" => "744123456789",
            "quantity" => 1,
            "price" => 1500.00,
            "name" => "Tenis Deportivos"
        ]
    ],
    "customer" => [
        "name" => "Juan Perez",
        "phone" => "8095551212",
        "address" => "Calle Principal #5, Ens. Libertad",
        "province" => "Santiago",
        "municipality" => "Santiago de los Caballeros"
    ]
]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer ${DEFAULT_SACHA_PACK_API_KEY}"
]);
$res = curl_exec($ch);
curl_close($ch);
echo $res;`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 5: RESPUESTA DEL SERVIDOR */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-[10px]">5</span>
                    Respuesta del Servidor (HTTP 201 Created)
                  </span>
                  <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    201 Created
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Si la orden es válida, el sistema responderá con un código <code className="text-emerald-700 font-bold">201 Created</code> y el número de guía de seguimiento asignado:
                </p>

                <div className="p-5 rounded-2xl bg-slate-900 text-slate-200 space-y-3 font-mono text-xs border border-slate-800 shadow-inner">
                  <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-2">
                    <span>Estructura JSON de Respuesta Exitosa:</span>
                    <span className="text-[10px] text-slate-400 font-mono">application/json</span>
                  </div>
                  <pre className="text-emerald-300 text-xs overflow-x-auto bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed">
{`{
  "success": true,
  "trackingNumber": "SPVS1234567",
  "totalToCollect": 1800.00,
  "message": "Orden integrada exitosamente en la red de Sacha Pack."
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT 3: INTERACTIVE WEBHOOK TESTER CONSOLE (SANDBOX) */}
          {logisticsSubTab === 'console' && (
            <div id="webhook-tester-section" className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-amber-600" />
                    Consola de Pruebas y Diagnóstico Webhook (Sandbox)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ejecuta peticiones de prueba con la estructura JSON configurada y las credenciales API Key para verificar la conectividad de la empresa seleccionada.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Select Company to Test */}
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl">
                    <span className="text-xs font-bold text-slate-600">Empresa:</span>
                    <select
                      value={selectedTestProviderId}
                      onChange={(e) => setSelectedTestProviderId(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 px-2.5 py-1 focus:outline-none focus:border-amber-500"
                    >
                      {logisticsProviders.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.isDefault ? '(Predeterminada)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                <button
                  type="button"
                  onClick={() => setWebhookPayloadInput(JSON.stringify(getSampleSachaPackPayload(), null, 2))}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restaurar JSON Ejemplo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: JSON Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-purple-600" />
                    Payload JSON a Despachar
                  </label>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">application/json</span>
                </div>

                <div className="relative">
                  <textarea
                    rows={15}
                    value={webhookPayloadInput}
                    onChange={(e) => setWebhookPayloadInput(e.target.value)}
                    className="w-full bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed shadow-inner"
                    placeholder="Escribe el payload JSON..."
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={webhookTesting}
                    onClick={handleTestSachaWebhook}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {webhookTesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Despachando a {logisticsProviders.find(p => p.id === selectedTestProviderId)?.name || 'Logística'}...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Request a Webhook
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookPayloadInput);
                      alert('JSON copiado al portapapeles.');
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                </div>
              </div>

              {/* Right Column: Webhook Response Viewer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-emerald-600" />
                    Respuesta del Servidor / Webhook Response
                  </label>
                  {webhookTestResult && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      webhookTestResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      HTTP {webhookTestResult.status} {webhookTestResult.isSimulated ? '(Modo Seguro)' : '(Directo)'}
                    </span>
                  )}
                </div>

                <div className="bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-2xl border border-slate-800 min-h-[300px] h-[370px] overflow-y-auto leading-relaxed space-y-3 shadow-inner">
                  {webhookTestResult ? (
                    <div>
                      <div className="border-b border-slate-800 pb-2 mb-3 flex items-center justify-between">
                        <span className="text-amber-400 font-bold">Respuesta Registrada:</span>
                        <span className="text-[10px] text-slate-400">{webhookTestResult.timestamp}</span>
                      </div>
                      <p className={`text-xs font-bold mb-2 ${webhookTestResult.success ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {webhookTestResult.success ? '✔' : '✖'} {webhookTestResult.message}
                      </p>

                      {!webhookTestResult.success && (webhookTestResult.message?.toLowerCase().includes('tienda') || JSON.stringify(webhookTestResult.rawResponse || '').toLowerCase().includes('tienda')) && (
                        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl space-y-2 my-2">
                          <p className="text-[11px] text-amber-300 font-semibold">
                            💡 Diagnóstico: Sacha Pack requiere un Store ID previamente registrado en su base de datos.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                const current = JSON.parse(webhookPayloadInput);
                                current.storeId = DEFAULT_SACHA_PACK_STORE_ID;
                                setWebhookPayloadInput(JSON.stringify(current, null, 2));
                                handleSyncAllStoresSachaId(DEFAULT_SACHA_PACK_STORE_ID);
                              } catch {
                                setWebhookPayloadInput(JSON.stringify(getSampleSachaPackPayload(), null, 2));
                              }
                            }}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            Aplicar Store ID Maestro Oficial ({DEFAULT_SACHA_PACK_STORE_ID})
                          </button>
                        </div>
                      )}

                      {webhookTestResult.providerName && (
                        <p className="text-[11px] text-cyan-300 font-semibold mb-1">
                          Proveedor: {webhookTestResult.providerName}
                        </p>
                      )}
                      {webhookTestResult.sachaTrackingId && (
                        <p className="text-[11px] text-yellow-300 font-semibold mb-2">
                          ID de Seguimiento / Guía: {webhookTestResult.sachaTrackingId}
                        </p>
                      )}
                      <pre className="text-[11px] text-slate-300 overflow-x-auto bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                        {JSON.stringify(webhookTestResult, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                      <Truck className="w-10 h-10 text-slate-600 mb-1" />
                      <p className="text-xs font-semibold text-slate-400">Sin peticiones enviadas todavía en esta sesión</p>
                      <p className="text-[11px]">Haz clic en "Enviar Request a Webhook" para probar la integración con la empresa seleccionada.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

          {/* SECTION 3: STORE LOGISTICS PROVIDER MAPPING */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <StoreIcon className="w-5 h-5 text-amber-600" />
                  Asignación de Empresa Logística por Tienda
                </h3>
                <p className="text-xs text-slate-500">
                  Selecciona la empresa de paquetería y el Store ID asignado para los envíos de cada comercio socio.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Tienda / Comercio</th>
                    <th className="p-3.5">Propietario & Email</th>
                    <th className="p-3.5">Plan Sanpi</th>
                    <th className="p-3.5">Empresa Logística Asignada</th>
                    <th className="p-3.5">Account / Store ID</th>
                    <th className="p-3.5 rounded-r-xl text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {stores.map((store) => {
                    const assignedProvider = logisticsProviders.find(p => p.id === store.logisticsProviderId) || defaultProvider;

                    return (
                      <tr key={store.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{store.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">/{store.slug}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-800">{store.ownerName}</div>
                          <div className="text-[11px] text-slate-500">{store.ownerEmail}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[10px]">
                            {store.plan} ({((store.marketplaceCommission || 0.1) * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block">{assignedProvider?.name || 'Predeterminada'}</span>
                          <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {assignedProvider?.code || 'sacha_pack'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-xs text-amber-700 font-bold">
                          {store.sachaPackStoreId || assignedProvider?.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStore(store);
                              setEditCommissionRate(store.marketplaceCommission || 0.10);
                              setEditSachaPackStoreId(store.sachaPackStoreId || assignedProvider?.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID);
                              setEditStoreLogisticsProviderId(store.logisticsProviderId || defaultProvider?.id || '');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Configurar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: DELIVERIES & WEBHOOK DISPATCH LOG */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-600" />
                  Registro y Auditoría de Envíos Despachados
                </h3>
                <p className="text-xs text-slate-500">
                  Monitoreo de órdenes COD, identificación de paquetes y estado de entrega en tiempo real.
                </p>
              </div>

              <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-2xl text-xs font-bold">
                {deliveries.length} Órdenes en Plataforma
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">ID Pedido / Guía</th>
                    <th className="p-3.5">Cliente & Teléfono</th>
                    <th className="p-3.5">Destino</th>
                    <th className="p-3.5">Producto & Barcode IMEI</th>
                    <th className="p-3.5">Empresa Logística</th>
                    <th className="p-3.5">Total & Método</th>
                    <th className="p-3.5">Webhook Status</th>
                    <th className="p-3.5 rounded-r-xl text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {deliveries.map((del) => {
                    const store = stores.find((s) => s.id === del.storeId);
                    const art = articles.find((a) => a.id === del.articleId);
                    const barcode = del.barcode_imei || art?.barcode_imei || '1234567890';
                    const sachaStatus = del.sachaPackStatus || 'enviado';
                    const provider = logisticsProviders.find(p => p.id === del.logisticsProviderId) || defaultProvider;

                    return (
                      <tr key={del.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-slate-900 block">{del.trackingNumber}</span>
                          <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                            {del.externalOrderId || 'ORD-12345'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{del.customerName}</div>
                          <div className="text-[11px] text-slate-500">{del.customerPhone}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{del.province}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{del.municipality || del.city} • {del.address}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 line-clamp-1">{del.articleName}</div>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            Barcode/IMEI: {barcode}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block">{del.logisticsProviderName || provider?.name || 'Sacha Pack'}</span>
                          <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            {provider?.code || 'sacha_pack'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-black text-slate-900">RD$ {del.totalCodAmount.toLocaleString()}</div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                            del.paymentMethod === 'transferencia'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {del.paymentMethod || 'contra entrega'}
                          </span>
                          {del.bankName && (
                            <div className="text-[10px] text-purple-800 font-semibold truncate max-w-[130px] mt-0.5">
                              {del.bankName}
                            </div>
                          )}
                          {del.transferReceiptUrl && (
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptModal({ delivery: del, receiptUrl: del.transferReceiptUrl! })}
                              className="mt-1 inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                              title="Ver Comprobante de Transferencia"
                            >
                              <Receipt className="w-3 h-3 text-emerald-700" />
                              Ver Comprobante
                            </button>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                              sachaStatus === 'enviado'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : sachaStatus === 'error'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {sachaStatus === 'enviado' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                              )}
                              {sachaStatus === 'enviado' ? 'Despachado' : sachaStatus === 'error' ? 'Error Conexión' : sachaStatus}
                              {del.sachaPackResponse?.status ? ` (${del.sachaPackResponse.status})` : ''}
                            </span>
                            {del.sachaPackResponse?.message && (
                              <button
                                type="button"
                                onClick={() => setSelectedResponseModal({ delivery: del, response: del.sachaPackResponse })}
                                className="text-[10px] text-slate-500 hover:text-amber-700 underline text-left line-clamp-1 max-w-[150px]"
                                title="Ver detalle de respuesta"
                              >
                                Ver diagnóstico &rarr;
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const payload = del.sachaPackPayload || {
                                  storeId: store?.sachaPackStoreId || provider?.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID,
                                  externalOrderId: del.externalOrderId || del.trackingNumber,
                                  items: [{ barcode_imei: barcode, quantity: 1, price: del.basePrice }],
                                  customer: {
                                    name: del.customerName,
                                    email: del.customerEmail || 'juan@ejemplo.com',
                                    phone: del.customerPhone,
                                    address: del.address,
                                    province: del.province,
                                    municipality: del.municipality || del.city || 'Santo Domingo Este'
                                  },
                                  paymentMethod: del.paymentMethod || 'contra entrega'
                                };
                                setSelectedPayloadModal(payload);
                              }}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1"
                              title="Ver Payload JSON"
                            >
                              <Code className="w-3.5 h-3.5" />
                              JSON
                            </button>

                            <button
                              type="button"
                              disabled={resendingDeliveryId === del.id}
                              onClick={() => handleResendDeliveryToSacha(del.id, del.logisticsProviderId)}
                              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-sm disabled:opacity-50"
                              title="Re-enviar Webhook"
                            >
                              {resendingDeliveryId === del.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              Re-enviar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FINANZAS & MRR */}
      {activeTab === 'finance' && (
        <div className="space-y-8">
          
          {/* KPI Financial Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* MRR */}
            <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">MRR (Suscripciones Socios)</span>
              <div className="text-2xl font-black text-purple-700">
                RD$ {fin.mrr.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Ingresos mensuales por cuotas de socios activos</p>
            </div>

            {/* Comisiones Venta */}
            <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Comisiones por Ventas</span>
              <div className="text-2xl font-black text-indigo-700">
                RD$ {fin.totalCommissions.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{fin.deliveredOrdersCount} órdenes entregadas (8%, 10%, 15%)</p>
            </div>

            {/* Gastos Operativos */}
            <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Gastos Operativos</span>
              <div className="text-2xl font-black text-rose-600">
                - RD$ {fin.totalExpenses.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{expenses.length} conceptos registrados</p>
            </div>

            {/* Utilidad Neta */}
            <div className="bg-gradient-to-br from-purple-900 to-indigo-950 text-white rounded-[2rem] p-6 shadow-2xl border border-purple-700/50 space-y-2 relative overflow-hidden">
              <span className="text-[11px] font-extrabold text-purple-300 uppercase tracking-wider block">Utilidad Neta Sanpi</span>
              <div className="text-3xl font-black text-yellow-300">
                {masterUnlocked || isMartinSuperAdmin ? `RD$ ${fin.netProfit.toLocaleString()}` : '••••••••'}
              </div>
              <div className="flex items-center justify-between text-[11px] text-purple-200 font-semibold pt-1">
                <span>{masterUnlocked || isMartinSuperAdmin ? 'Cálculo Neta Real' : 'Protegido con Key'}</span>
                {!masterUnlocked && !isMartinSuperAdmin && (
                  <button onClick={() => setShowKeyModal(true)} className="text-yellow-300 underline font-bold">
                    Desbloquear
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Visual Financial Distribution Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Revenue Breakdown */}
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Distribución de Ingresos Operativos (DOP)
              </h3>

              <div className="space-y-3 text-xs font-semibold">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">MRR Mensual de Socios:</span>
                    <span className="text-purple-700 font-bold">RD$ {fin.mrr.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full"
                      style={{ width: `${fin.grossRevenue > 0 ? (fin.mrr / fin.grossRevenue) * 100 : 50}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Comisiones de Ventas Entregadas:</span>
                    <span className="text-indigo-700 font-bold">RD$ {fin.totalCommissions.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full"
                      style={{ width: `${fin.grossRevenue > 0 ? (fin.totalCommissions / fin.grossRevenue) * 100 : 50}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>Ingreso Bruto Total:</span>
                  <span className="text-purple-700">RD$ {fin.grossRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Expenses Summary & Logistics */}
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-rose-600" />
                Resumen de Logística COD (Sacha Pack)
              </h3>

              <div className="space-y-3 text-xs font-semibold">
                <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-100 space-y-1">
                  <span className="text-purple-900 font-bold block">Fletes Nacionales Recaudados (RD$ 350):</span>
                  <span className="text-xl font-black text-purple-700">RD$ {fin.totalShippingCollected.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block">Procesado en {fin.deliveredOrdersCount} entregas completadas</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-700 font-bold">Total de Guías Creadas:</span>
                  <span className="text-slate-900 font-extrabold text-sm">{fin.totalOrdersCount} Guías COD</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 6: GASTOS OPERATIVOS */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* New Expense Form */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-purple-600" />
              Registrar Gasto Operativo
            </h3>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción del Gasto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Servidores cloud, empaques, meta ads..."
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoría *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                >
                  <option value="logistica">Logística & Empaque</option>
                  <option value="marketing">Marketing & Google/Meta Ads</option>
                  <option value="servidores">Servidores & APIs Cloud</option>
                  <option value="nomina">Nómina de Operaciones COD</option>
                  <option value="otros">Otros Gastos Administracion</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monto en Pesos Dominicanos (DOP) *</label>
                <input
                  type="number"
                  required
                  min={100}
                  value={expAmount}
                  onChange={(e) => setExpAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-2xl text-xs transition-colors shadow-md"
              >
                Registrar Gasto
              </button>
            </form>
          </div>

          {/* Expense History Table */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Histórico de Gastos Operativos ({expenses.length})</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-3 rounded-l-xl">Concepto</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3 rounded-r-xl text-right">Monto (DOP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="p-3 font-bold text-slate-900">{exp.title}</td>
                      <td className="p-3">
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{exp.date}</td>
                      <td className="p-3 text-right font-black text-rose-600">RD$ {exp.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 7: MAPA LOGÍSTICO RD */}
      {activeTab === 'map' && (
        <RDMap deliveries={deliveries} />
      )}

      {/* TAB 8: GESTOR DE PLANES Y MEMBRESÍAS DE TIENDAS */}
      {activeTab === 'plans' && (
        <AdminPlansManager onRefresh={onRefresh} />
      )}

      {/* TAB 9: MARCA, VIDEO DE FONDO & APARIENCIA SUPER ADMIN */}
      {activeTab === 'branding' && (
        <AdminBrandingManager
          currentConfig={sanpiManager.siteConfig}
          onConfigSaved={() => onRefresh()}
        />
      )}

      {/* EDIT STORE COMMISSION, REFERRAL PROGRAM & LOGISTICS PROVIDER MODAL */}
      {editingStore && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Configuración de Tienda</h3>
                  <p className="text-xs text-slate-500">{editingStore.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingStore(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan de Membresía / Porcentaje de Comisión Sanpi</label>
                <select
                  value={editCommissionRate}
                  onChange={(e) => setEditCommissionRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold"
                >
                  {sanpiManager.plans.map((p) => (
                    <option key={p.id} value={(p.commissionPercent || 10) / 100}>
                      Plan {p.name} ({p.commissionPercent}% comisión - RD$ {p.monthlyFee.toLocaleString()}/mes)
                    </option>
                  ))}
                  <option value={0.08}>Personalizado: 8% Comisión (Socios Full / Mayoristas)</option>
                  <option value={0.10}>Personalizado: 10% Comisión (Plan Pro)</option>
                  <option value={0.12}>Personalizado: 12% Comisión Especial</option>
                  <option value={0.15}>Personalizado: 15% Comisión (Plan Básico)</option>
                </select>
              </div>

              {/* SECCIÓN PROGRAMA DE REFERIDOS */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-emerald-700" />
                    <span className="font-extrabold text-emerald-950 text-xs">Programa de Referidos & Afiliados</span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editReferralProgramActive}
                      onChange={(e) => setEditReferralProgramActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-[11px] font-bold text-emerald-900">Activo</span>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-emerald-900 mb-1">Código de Referido Asignado</label>
                  <input
                    type="text"
                    value={editReferralCode}
                    onChange={(e) => setEditReferralCode(e.target.value.toUpperCase())}
                    placeholder="Ej: SANPI-TECH"
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-emerald-700 mt-1">
                    Código que otras tiendas ingresan al registrarse para obtener el beneficio de bienvenida.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-emerald-900 mb-1">
                    % de Descuento por Registro de Referido Aplicable
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={editReferralDiscountPercent}
                      onChange={(e) => setEditReferralDiscountPercent(Number(e.target.value))}
                      className="w-24 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-center focus:outline-none focus:border-emerald-500"
                    />
                    <span className="font-extrabold text-emerald-800 text-sm">% de Descuento</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-1">
                    Porcentaje de descuento otorgado a los nuevos comercios que se afilien con este código.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-emerald-900 mb-1">Nota / Convenio Especial (Opcional)</label>
                  <input
                    type="text"
                    value={editReferralDiscountNote}
                    onChange={(e) => setEditReferralDiscountNote(e.target.value)}
                    placeholder="Ej: Descuento exclusivo por alianza comercial..."
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Empresa de Logística Asignada</label>
                <select
                  value={editStoreLogisticsProviderId}
                  onChange={(e) => {
                    const newProvId = e.target.value;
                    setEditStoreLogisticsProviderId(newProvId);
                    const found = logisticsProviders.find(p => p.id === newProvId);
                    if (found && (!editSachaPackStoreId || editSachaPackStoreId === DEFAULT_SACHA_PACK_STORE_ID)) {
                      setEditSachaPackStoreId(found.defaultStoreId || DEFAULT_SACHA_PACK_STORE_ID);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold"
                >
                  {logisticsProviders.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isDefault ? '(Predeterminada)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account / Store ID (En la Empresa de Logística)</label>
                <input
                  type="text"
                  value={editSachaPackStoreId}
                  onChange={(e) => setEditSachaPackStoreId(e.target.value)}
                  placeholder="Ej: Vw5WLzIfe3TI59EgbOBtVisY08U2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Identificador único de cuenta asignado por la empresa de paquetería seleccionada.
                </p>
              </div>

              <div className="bg-amber-50 p-3 rounded-2xl text-amber-900 text-xs border border-amber-200/50">
                Las órdenes generadas por esta tienda se despacharán automáticamente a la API de la empresa logística configurada con este Store ID.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveStoreCommission}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md"
                >
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT LOGISTICS PROVIDER MODAL WITH API CONNECTION BUILDER */}
      {(isCreatingProvider || editingProvider) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {editingProvider ? `Configurar Conexión: ${editingProvider.name}` : 'Conectar Nueva Empresa de Transporte'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Establece el endpoint, esquema de autenticación (API Key) y plantilla JSON de despacho
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingProvider(null);
                  setIsCreatingProvider(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Quick Presets for Dominican Republic / Latin America Logistics */}
            {!editingProvider && (
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Plantillas y Preajustes Rápidos:
                  </span>
                  <span className="text-[10px] text-slate-400">Click para autocompletar configuración</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    {
                      name: 'Sacha Pack Logistics',
                      code: 'sacha_pack',
                      url: 'https://sachapack.com/api/logistics-webhook',
                      authType: 'x-api-key' as const,
                      website: 'https://sachapack.com/',
                      tracking: 'https://sachapack.com/tracking/{{trackingNumber}}',
                      notes: 'Integración nativa con soporte COD en todo RD'
                    },
                    {
                      name: 'BM Cargo',
                      code: 'bm_cargo',
                      url: 'https://api.bm-cargo.com/v2/dispatches/create',
                      authType: 'bearer' as const,
                      website: 'https://bm-cargo.com/',
                      tracking: 'https://bm-cargo.com/rastreo?guia={{trackingNumber}}',
                      notes: 'Courier nacional y carga aérea / marítima'
                    },
                    {
                      name: 'Caribe Pack RD',
                      code: 'caribe_pack',
                      url: 'https://api.caribepack.com.do/v1/shipments',
                      authType: 'x-api-key' as const,
                      website: 'https://caribepack.com.do/',
                      tracking: 'https://caribepack.com.do/track/{{trackingNumber}}',
                      notes: 'Envíos interurbanos con cobertura de terminales'
                    },
                    {
                      name: 'Metro Pac Envíos',
                      code: 'metro_pac',
                      url: 'https://api.metropac.do/shipments/register',
                      authType: 'custom_header' as const,
                      website: 'https://metropac.do/',
                      tracking: 'https://metropac.do/rastreo/{{trackingNumber}}',
                      notes: 'Despachos de paquetería express interurbana'
                    },
                    {
                      name: 'Vimenpaq Express',
                      code: 'vimenpaq',
                      url: 'https://api.vimenpaq.do/v1/courier/dispatch',
                      authType: 'apikey' as const,
                      website: 'https://vimenpaq.do/',
                      tracking: 'https://vimenpaq.do/rastreo/{{trackingNumber}}',
                      notes: 'Red logística nacional Vimenpaq'
                    },
                    {
                      name: 'API REST Genérica (Custom)',
                      code: 'custom_carrier',
                      url: 'https://api.transportadora.com/v1/dispatch',
                      authType: 'x-api-key' as const,
                      website: 'https://transportadora.com/',
                      tracking: 'https://transportadora.com/track/{{trackingNumber}}',
                      notes: 'Conexión personalizada mediante REST API y API Key'
                    }
                  ].map((preset) => (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => {
                        setProviderForm({
                          ...providerForm,
                          name: preset.name,
                          code: preset.code,
                          webhookUrl: preset.url,
                          authType: preset.authType,
                          websiteUrl: preset.website,
                          trackingUrlTemplate: preset.tracking,
                          notes: preset.notes
                        });
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProvider} className="space-y-6 text-xs">
              {/* SECTION: BASIC IDENTIFICATION */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" />
                  1. Identificación de la Empresa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Nombre Comercial de la Empresa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Sacha Pack Logistics"
                      value={providerForm.name}
                      onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Código / Slug Identificador</label>
                    <input
                      type="text"
                      placeholder="Ej: sacha_pack"
                      value={providerForm.code}
                      onChange={(e) => setProviderForm({ ...providerForm, code: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: ENDPOINT & AUTHENTICATION */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    2. Endpoint y Credenciales de Autenticación (API Key)
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500">Cifrado Seguro SSL</span>
                </div>

                {/* Endpoint & HTTP Method */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">URL del Endpoint de Despacho (Carrier Webhook URL) *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://api.empresa-transporte.com/v1/dispatch"
                      value={providerForm.webhookUrl}
                      onChange={(e) => setProviderForm({ ...providerForm, webhookUrl: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Método HTTP</label>
                    <select
                      value={providerForm.httpMethod}
                      onChange={(e) => setProviderForm({ ...providerForm, httpMethod: e.target.value as 'POST' | 'PUT' })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                    </select>
                  </div>
                </div>

                {/* Auth Scheme Selector & API Key Input */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Esquema de Autenticación *</label>
                    <select
                      value={providerForm.authType}
                      onChange={(e) => setProviderForm({ ...providerForm, authType: e.target.value as any })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="x-api-key">Header "x-api-key: [key]"</option>
                      <option value="bearer">Header "Authorization: Bearer [token]"</option>
                      <option value="apikey">Header "apikey: [key]"</option>
                      <option value="custom_header">Header Personalizado (Custom)</option>
                    </select>
                  </div>

                  {providerForm.authType === 'custom_header' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nombre del Header Custom *</label>
                      <input
                        type="text"
                        placeholder="Ej: X-Carrier-Token"
                        value={providerForm.customHeaderName}
                        onChange={(e) => setProviderForm({ ...providerForm, customHeaderName: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  <div className={providerForm.authType === 'custom_header' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>API Key / Secret Token</span>
                      <button
                        type="button"
                        onClick={() => setShowApiKeyInModal(!showApiKeyInModal)}
                        className="text-[10px] text-amber-700 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {showApiKeyInModal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showApiKeyInModal ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKeyInModal ? 'text' : 'password'}
                        placeholder="sk_live_... o token de autorización"
                        value={providerForm.apiKey}
                        onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value, authToken: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-amber-500 font-semibold pr-10"
                      />
                      <Key className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Account / Store ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Default Account / Store ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Vw5WLzIfe3TI59EgbOBtVisY08U2"
                      value={providerForm.defaultStoreId}
                      onChange={(e) => setProviderForm({ ...providerForm, defaultStoreId: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Identificador de cuenta asignado por la transportadora a Sanpi</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Plantilla URL de Rastreo (Para Clientes)</label>
                    <input
                      type="text"
                      placeholder="https://rastreo.empresa.com/envio/{{trackingNumber}}"
                      value={providerForm.trackingUrlTemplate}
                      onChange={(e) => setProviderForm({ ...providerForm, trackingUrlTemplate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Usa <code className="font-mono text-purple-700 font-bold">&#123;&#123;trackingNumber&#125;&#125;</code> para el enlace dinámico</p>
                  </div>
                </div>

                {/* LIVE CONNECTION TEST HANDSHAKE BUTTON */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={modalPingTesting || !providerForm.webhookUrl.trim()}
                    onClick={handleModalPingTest}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {modalPingTesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        Comprobando Conexión...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-400" />
                        Probar Conexión con Endpoint (Handshake Ping)
                      </>
                    )}
                  </button>

                  {modalPingResult && (
                    <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                      modalPingResult.success
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-rose-50 text-rose-900 border-rose-300'
                    }`}>
                      {modalPingResult.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold">
                          HTTP {modalPingResult.status} {modalPingResult.latencyMs > 0 ? `(${modalPingResult.latencyMs}ms)` : ''}:
                        </span>{' '}
                        <span className="text-[11px]">{modalPingResult.message}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: INBOUND WEBHOOK & CALLBACK URL */}
              <div className="space-y-3 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-700" />
                  3. Inbound Webhook Receiver (Actualizaciones de Estado Entrantes)
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Proporciona esta URL a la empresa de transporte para que notifique a Sanpi cuando cambie el estado de la guía (e.g. <em>En Ruta, Entregado, Cobrado COD, Cancelado</em>):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 flex items-center gap-2 bg-white p-2.5 rounded-xl border border-amber-200">
                    <span className="font-mono text-[11px] text-slate-800 break-all font-semibold flex-1">
                      https://sanpimarket.do/api/logistics/webhook-receiver
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('https://sanpimarket.do/api/logistics/webhook-receiver');
                        alert('URL de Webhook Inbound copiada al portapapeles.');
                      }}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg text-[10px] flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Secret Key Inbound"
                      value={providerForm.inboundWebhookSecret}
                      onChange={(e) => setProviderForm({ ...providerForm, inboundWebhookSecret: e.target.value })}
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Website, Notes & Active Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sitio Web / Portal</label>
                  <input
                    type="url"
                    placeholder="https://sachapack.com/"
                    value={providerForm.websiteUrl}
                    onChange={(e) => setProviderForm({ ...providerForm, websiteUrl: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notas Operativas</label>
                  <input
                    type="text"
                    placeholder="Ej: Cobertura nacional 24-48h con cobro COD"
                    value={providerForm.notes}
                    onChange={(e) => setProviderForm({ ...providerForm, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerForm.isActive}
                    onChange={(e) => setProviderForm({ ...providerForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <span className="font-bold text-slate-800">Activa para despachos automatizados</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerForm.isDefault}
                    onChange={(e) => setProviderForm({ ...providerForm, isDefault: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <span className="font-bold text-slate-800">Establecer como empresa predeterminada del marketplace</span>
                </label>
              </div>

              {/* SECTION 4: JSON TEMPLATE DESIGNER */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-amber-600" />
                      4. Estructura JSON del Payload de Despacho (Outgoing Schema)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Define la estructura JSON que recibirá el endpoint. Puedes usar variables dinámicas en formato <code className="bg-slate-100 text-purple-700 px-1 py-0.5 rounded font-mono text-[10px]">&#123;&#123;variable&#125;&#125;</code>.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProviderForm({
                        ...providerForm,
                        jsonTemplate: DEFAULT_SACHA_PACK_JSON_TEMPLATE
                      });
                      setJsonFormatError(null);
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
                  >
                    Restaurar Estructura Estándar
                  </button>
                </div>

                {/* Available Variables Chips */}
                <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-900 rounded-xl text-[10px] font-mono text-slate-300">
                  <span className="text-amber-400 font-bold">Variables dinámicas:</span>
                  {['storeId', 'externalOrderId', 'barcode_imei', 'quantity', 'price', 'customerName', 'customerEmail', 'customerPhone', 'address', 'province', 'municipality', 'paymentMethod'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        const tag = `{{${v}}}`;
                        navigator.clipboard.writeText(tag);
                        alert(`Variable ${tag} copiada al portapapeles.`);
                      }}
                      className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-emerald-400 px-1.5 py-0.5 rounded border border-slate-700 transition-colors"
                      title="Click para copiar variable"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={12}
                  value={providerForm.jsonTemplate}
                  onChange={(e) => {
                    setProviderForm({ ...providerForm, jsonTemplate: e.target.value });
                    setJsonFormatError(null);
                  }}
                  className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:outline-none focus:border-amber-500 leading-relaxed shadow-inner"
                  placeholder="Introduce la plantilla JSON..."
                />

                {jsonFormatError && (
                  <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Error de sintaxis JSON: {jsonFormatError}
                  </p>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProvider(null);
                    setIsCreatingProvider(false);
                  }}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingProvider ? 'Guardar Conexión de Transporte' : 'Conectar y Guardar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SACHA PACK JSON PAYLOAD MODAL */}
      {selectedPayloadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-[2.5rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-amber-500/40 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Payload de Despacho Webhook</h3>
                  <p className="text-xs text-amber-300 font-mono">POST /api/logistics-webhook</p>
                </div>
              </div>
              <button onClick={() => setSelectedPayloadModal(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-950 p-4 rounded-2xl text-emerald-400 font-mono text-xs overflow-x-auto max-h-[350px] border border-slate-800 leading-relaxed">
                {JSON.stringify(selectedPayloadModal, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400 font-mono">
                Estructura JSON Oficial Sanpi Logistics
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedPayloadModal, null, 2));
                    alert('Payload copiado al portapapeles.');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar JSON
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayloadModal(null)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SACHA PACK RESPONSE / DIAGNOSTIC MODAL */}
      {selectedResponseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-[2.5rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-700 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  selectedResponseModal.response?.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Diagnóstico de Despacho Webhook</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedResponseModal.delivery.trackingNumber} • {selectedResponseModal.delivery.externalOrderId || 'ORD'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedResponseModal(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              <div className={`p-4 rounded-2xl border text-xs font-semibold ${
                selectedResponseModal.response?.success 
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200' 
                  : 'bg-rose-950/50 border-rose-800 text-rose-200'
              }`}>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>Estado: {selectedResponseModal.response?.success ? '✔ Recibido por la Empresa' : '✖ Fallo de Conexión'}</span>
                  <span className="font-mono">HTTP {selectedResponseModal.response?.status || 500}</span>
                </div>
                <p className="leading-relaxed">
                  {selectedResponseModal.response?.message || 'Sin mensaje de respuesta.'}
                </p>
              </div>

              {selectedResponseModal.response?.endpoint && (
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 break-all">
                  <strong className="text-slate-300">Endpoint:</strong> {selectedResponseModal.response.endpoint}
                </div>
              )}

              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">Respuesta Raw del Servidor:</span>
                <pre className="bg-slate-950 p-4 rounded-2xl text-slate-200 font-mono text-xs overflow-x-auto max-h-[200px] border border-slate-800 leading-relaxed">
                  {JSON.stringify(selectedResponseModal.response?.rawResponse || selectedResponseModal.response || {}, null, 2)}
                </pre>
              </div>

              {/* STORE ID REPAIR WIDGET */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    Store ID / Account ID para este despacho:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Actual: {selectedResponseModal.delivery.sachaPackPayload?.storeId || 'N/D'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={modalCustomStoreId || selectedResponseModal.delivery.sachaPackPayload?.storeId || DEFAULT_SACHA_PACK_STORE_ID}
                    onChange={(e) => setModalCustomStoreId(e.target.value)}
                    placeholder="Ingresa Store ID registrado en Sacha Pack..."
                    className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const id = (modalCustomStoreId || selectedResponseModal.delivery.sachaPackPayload?.storeId || DEFAULT_SACHA_PACK_STORE_ID).trim();
                      handleSyncAllStoresSachaId(id);
                    }}
                    title="Aplicar este Store ID a todas las tiendas"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-[11px] font-bold whitespace-nowrap"
                  >
                    Guardar para Todos
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Si Sacha Pack responde que la tienda no está registrada, cambia este ID por el provisto en tu cuenta y pulsa Reintentar.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const targetStoreId = (modalCustomStoreId || selectedResponseModal.delivery.sachaPackPayload?.storeId || DEFAULT_SACHA_PACK_STORE_ID).trim();
                  handleResendDeliveryToSacha(selectedResponseModal.delivery.id, selectedResponseModal.delivery.logisticsProviderId, targetStoreId);
                  setSelectedResponseModal(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Reintentar Despacho Ahora
              </button>

              <button
                type="button"
                onClick={() => setSelectedResponseModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MANUAL REFERRAL MODAL */}
      {isCreatingReferralModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Registrar Afiliación / Referido</h3>
                  <p className="text-xs text-slate-500">Asignar % de descuento a un nuevo comercio</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreatingReferralModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateManualReferral} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tienda Referente (La que refirió)</label>
                <select
                  required
                  value={newReferralForm.referrerStoreId}
                  onChange={(e) => {
                    const refStoreId = e.target.value;
                    const st = stores.find((s) => s.id === refStoreId);
                    setNewReferralForm({
                      ...newReferralForm,
                      referrerStoreId: refStoreId,
                      discountPercentApplied: st?.referralDiscountPercent ?? 10,
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold"
                >
                  <option value="">Selecciona tienda referente...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.referralCode || `SANPI-${s.name.toUpperCase().slice(0, 6)}`} • {s.referralDiscountPercent ?? 10}% desc.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tienda Registrada (La tienda beneficiaria)</label>
                <select
                  required
                  value={newReferralForm.referredStoreId}
                  onChange={(e) => setNewReferralForm({ ...newReferralForm, referredStoreId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold"
                >
                  <option value="">Selecciona tienda afiliada...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.ownerName} - {s.province})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  % de Descuento por Registro a Aplicar
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={newReferralForm.discountPercentApplied}
                    onChange={(e) => setNewReferralForm({ ...newReferralForm, discountPercentApplied: Number(e.target.value) })}
                    className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-black text-center text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[5, 10, 15, 20, 25, 30].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewReferralForm({ ...newReferralForm, discountPercentApplied: preset })}
                        className={`px-2 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                          newReferralForm.discountPercentApplied === preset
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nota o Motivo Administrativo (Opcional)</label>
                <input
                  type="text"
                  value={newReferralForm.adminNotes}
                  onChange={(e) => setNewReferralForm({ ...newReferralForm, adminNotes: e.target.value })}
                  placeholder="Ej: Registro por campaña de afiliados..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingReferralModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Guardar Referido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT REFERRAL RECORD DISCOUNT % MODAL */}
      {editingReferralRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Modificar % de Descuento</h3>
                  <p className="text-xs text-slate-500">
                    {editingReferralRecord.referredStoreName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingReferralRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1 text-slate-600 border border-slate-100">
                <div className="flex justify-between font-medium">
                  <span>Tienda Referente:</span>
                  <span className="font-bold text-slate-900">{editingReferralRecord.referrerStoreName}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Código Usado:</span>
                  <span className="font-mono font-bold text-emerald-700">{editingReferralRecord.referrerCode}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Porcentaje de Descuento (%):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingReferralRecord.discountPercentApplied}
                    onChange={(e) => setEditingReferralRecord({
                      ...editingReferralRecord,
                      discountPercentApplied: Number(e.target.value)
                    })}
                    className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-black text-center text-base"
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    {[5, 10, 15, 20, 25, 50].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setEditingReferralRecord({
                          ...editingReferralRecord,
                          discountPercentApplied: val
                        })}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                          editingReferralRecord.discountPercentApplied === val
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas Administrativas</label>
                <input
                  type="text"
                  value={editingReferralRecord.adminNotes || ''}
                  onChange={(e) => setEditingReferralRecord({
                    ...editingReferralRecord,
                    adminNotes: e.target.value
                  })}
                  placeholder="Motivo del ajuste de descuento..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingReferralRecord(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleUpdateReferralDiscountPercent(
                      editingReferralRecord.id,
                      editingReferralRecord.discountPercentApplied,
                      editingReferralRecord.adminNotes
                    );
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md"
                >
                  Actualizar Descuento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER RECEIPT PREVIEW MODAL */}
      {selectedReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Comprobante de Transferencia</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Guía: {selectedReceiptModal.delivery.trackingNumber} ({selectedReceiptModal.delivery.customerName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Banco:</span>
                <span className="font-extrabold text-slate-900">{selectedReceiptModal.delivery.bankName || 'Banco Destino'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Referencia / Comprobante:</span>
                <span className="font-mono font-black text-purple-700">{selectedReceiptModal.delivery.transferReference || 'Adjunto'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Monto Total Pedido:</span>
                <span className="font-black text-emerald-700">RD$ {selectedReceiptModal.delivery.totalCodAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Image viewer */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[60vh]">
              <img
                src={selectedReceiptModal.receiptUrl}
                alt="Comprobante de Transferencia"
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <a
                href={selectedReceiptModal.receiptUrl}
                download={`comprobante-${selectedReceiptModal.delivery.trackingNumber}.jpg`}
                className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar Imagen
              </a>

              <button
                type="button"
                onClick={() => setSelectedReceiptModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-colors shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASTER KEY MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl border border-purple-800/40 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-yellow-300">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Seguridad Sanpi</h3>
                  <p className="text-xs text-purple-300">Acceso Super Administrador</p>
                </div>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Introduce la clave maestra de administrador general para gestionar socios, modificar comisiones y visualizar la utilidad neta confidencial.
            </p>

            <form onSubmit={handleUnlockMasterKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">Clave de Acceso *</label>
                <input
                  type="password"
                  required
                  placeholder="Introduce la clave maestra..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white font-bold tracking-widest focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-purple-600/30"
              >
                Validar y Desbloquear
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
