import React, { useState, useMemo } from 'react';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Code,
  ShieldCheck,
  MapPin,
  Phone,
  MessageCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  ChevronDown,
  Building,
  Terminal,
  Send,
  Sliders,
  CheckSquare,
  Sparkles,
  Globe,
  Info
} from 'lucide-react';
import { Delivery, DeliveryStatus, UserProfile, CarrierUser } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { exportCarrierOrdersToExcel, exportCarrierOrdersToPdf } from '../lib/carrierReportsGenerator';
import { RD_PROVINCES } from '../data/rdProvinces';

interface CarrierDashboardProps {
  currentUser: UserProfile | null;
  onSelectDeliveryTracking?: (tracking: string) => void;
  onBackToMarketplace?: () => void;
}

export const CarrierDashboard: React.FC<CarrierDashboardProps> = ({
  currentUser,
  onSelectDeliveryTracking,
  onBackToMarketplace
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'orders' | 'metrics' | 'api' | 'reports'>('orders');

  // Multi-carrier selection (if admin or viewing specific courier)
  const carrierUsers = sanpiManager.carrierUsers;
  const initialCarrier = useMemo(() => {
    if (currentUser?.role === 'carrier') {
      const match = carrierUsers.find(c => c.email.toLowerCase() === currentUser.email?.toLowerCase() || c.name.toLowerCase() === currentUser.displayName?.toLowerCase());
      if (match) return match;
      return {
        id: currentUser.uid,
        name: currentUser.companyName || currentUser.displayName || 'Mi Empresa de Transporte',
        companyName: currentUser.companyName || 'Transportes Express RD',
        email: currentUser.email || 'transporte@sanpi.do',
        phone: currentUser.phone || '809-555-0000',
        apiKey: currentUser.apiKey || 'sanpi_live_carrier_key_rd',
        coverageProvinces: ['Todas las 32 Provincias'],
        isActive: true,
        createdAt: currentUser.createdAt || new Date().toISOString()
      };
    }
    return carrierUsers[0] || null;
  }, [currentUser, carrierUsers]);

  const [selectedCarrier, setSelectedCarrier] = useState<CarrierUser | null>(initialCarrier);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [provinceFilter, setProvinceFilter] = useState<string>('todas');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // UI States
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [activeModalOrder, setActiveModalOrder] = useState<Delivery | null>(null);
  const [selectedDriverName, setSelectedDriverName] = useState('');
  const [selectedDriverPhone, setSelectedDriverPhone] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState<DeliveryStatus>('en_transito');
  const [carrierNotesInput, setCarrierNotesInput] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // API Playground State
  const [apiMethod, setApiMethod] = useState<'GET' | 'PUT' | 'POST'>('GET');
  const [apiEndpoint, setApiEndpoint] = useState('/api/carrier/orders');
  const [apiTesting, setApiTesting] = useState(false);
  const [apiResponse, setApiResponse] = useState<any | null>(null);

  // Carrier Notification (POST Webhook) State
  const [carrierStoreId, setCarrierStoreId] = useState('sxOzEivG9GP9SvaVuF1nVpQZCOu1');
  const [carrierApiKeyInput, setCarrierApiKeyInput] = useState(currentUser?.apiKey || 'sk_sacha_wcrvnhqagxd86pqpxs1jfikvjq8mqmxt');
  const [showNotifyKey, setShowNotifyKey] = useState(false);
  const [carrierEndpointUrl, setCarrierEndpointUrl] = useState('https://studio-345939831630.us-central1.run.app/api/logistics-webhook');
  const [selectedNotifyOrderId, setSelectedNotifyOrderId] = useState<string>('sample');
  const [codeTab, setCodeTab] = useState<'js' | 'curl' | 'python'>('js');
  const [notifyingCarrier, setNotifyingCarrier] = useState(false);
  const [carrierNotifyResult, setCarrierNotifyResult] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Deliveries list from store manager
  const allDeliveries = sanpiManager.deliveries;

  // Filtered Deliveries for this carrier
  const filteredDeliveries = useMemo(() => {
    return allDeliveries.filter(del => {
      // Status filter
      if (statusFilter !== 'todos' && del.status !== statusFilter) return false;

      // Province filter
      if (provinceFilter !== 'todas' && del.province !== provinceFilter) return false;

      // Date filter
      if (dateFilter !== 'all' && del.createdAt) {
        const orderDate = new Date(del.createdAt);
        const now = new Date();
        if (dateFilter === 'today') {
          if (orderDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (orderDate < weekAgo) return false;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (orderDate < monthAgo) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTracking = (del.trackingNumber || del.id).toLowerCase().includes(q);
        const matchCustomer = (del.customerName || '').toLowerCase().includes(q);
        const matchPhone = (del.customerPhone || '').toLowerCase().includes(q);
        const matchAddress = (del.address || '').toLowerCase().includes(q);
        const matchArticle = (del.articleName || '').toLowerCase().includes(q);
        const matchProvince = (del.province || '').toLowerCase().includes(q);
        if (!matchTracking && !matchCustomer && !matchPhone && !matchAddress && !matchArticle && !matchProvince) {
          return false;
        }
      }

      return true;
    });
  }, [allDeliveries, statusFilter, provinceFilter, dateFilter, searchQuery]);

  // Operational KPIs
  const kpis = useMemo(() => {
    const total = filteredDeliveries.length;
    const delivered = filteredDeliveries.filter(d => d.status === 'entregado').length;
    const inTransit = filteredDeliveries.filter(d => d.status === 'en_transito').length;
    const pending = filteredDeliveries.filter(d => d.status === 'pendiente').length;
    const failed = filteredDeliveries.filter(d => d.status === 'intento_fallido' || d.status === 'cancelado').length;

    const totalCodToCollect = filteredDeliveries.reduce((acc, d) => {
      return acc + (d.totalCodAmount || ((d.basePrice || 0) + (d.shippingFee || 350)));
    }, 0);

    const codAlreadyCollected = filteredDeliveries
      .filter(d => d.status === 'entregado')
      .reduce((acc, d) => acc + (d.totalCodAmount || ((d.basePrice || 0) + (d.shippingFee || 350))), 0);

    const deliverySuccessRate = total > 0 ? Math.round((delivered / total) * 100) : 100;

    return {
      total,
      delivered,
      inTransit,
      pending,
      failed,
      totalCodToCollect,
      codAlreadyCollected,
      deliverySuccessRate
    };
  }, [filteredDeliveries]);

  // Copy API key to clipboard
  const handleCopyKey = () => {
    if (!selectedCarrier?.apiKey) return;
    navigator.clipboard.writeText(selectedCarrier.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Copy Webhook URL
  const handleCopyWebhook = () => {
    const url = `${window.location.origin}/api/logistics/webhook-receiver?apiKey=${selectedCarrier?.apiKey || 'sanpi_key'}`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Open order modal for status & driver update
  const handleOpenOrderModal = (del: Delivery) => {
    setActiveModalOrder(del);
    setSelectedDriverName(del.driverName || del.deliveryPersonName || '');
    setSelectedDriverPhone(del.driverPhone || del.deliveryPersonPhone || '');
    setNewOrderStatus(del.status || 'en_transito');
    setCarrierNotesInput(del.carrierNotes || '');
  };

  // Save Order Status Update
  const handleSaveOrderStatus = async () => {
    if (!activeModalOrder) return;
    setIsUpdatingOrder(true);
    try {
      await sanpiManager.updateDeliveryCarrierInfo(activeModalOrder.id, {
        status: newOrderStatus,
        driverName: selectedDriverName.trim() || undefined,
        driverPhone: selectedDriverPhone.trim() || undefined,
        carrierNotes: carrierNotesInput.trim() || undefined,
        carrierId: selectedCarrier?.id,
        carrierName: selectedCarrier?.name
      });
      setNotificationMsg(`Guía ${activeModalOrder.trackingNumber} actualizada a "${newOrderStatus.toUpperCase()}" exitosamente.`);
      setTimeout(() => setNotificationMsg(null), 4000);
      setActiveModalOrder(null);
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err?.message || 'Revisa tu conexión'}`);
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Trigger Excel Export
  const handleExportExcel = () => {
    const label = statusFilter === 'todos' ? 'Todos los Estados' : statusFilter.toUpperCase();
    exportCarrierOrdersToExcel(filteredDeliveries, selectedCarrier?.name || 'Transportes RD', label);
  };

  // Trigger PDF Export
  const handleExportPdf = () => {
    const label = statusFilter === 'todos' ? 'Todos los Estados' : statusFilter.toUpperCase();
    exportCarrierOrdersToPdf(filteredDeliveries, selectedCarrier?.name || 'Transportes RD', selectedCarrier, label);
  };

  // Simulate API Call in Playground
  const handleRunApiTest = () => {
    setApiTesting(true);
    setTimeout(() => {
      if (apiEndpoint.includes('/orders')) {
        setApiResponse({
          status: 'success',
          code: 200,
          timestamp: new Date().toISOString(),
          carrier: selectedCarrier?.name || 'Transporte Courier RD',
          total_orders: filteredDeliveries.length,
          orders: filteredDeliveries.slice(0, 3).map(d => ({
            tracking_number: d.trackingNumber,
            customer: {
              name: d.customerName,
              phone: d.customerPhone,
              province: d.province,
              address: d.address
            },
            product: d.articleName,
            cod_amount_rd: d.totalCodAmount || (d.basePrice + 350),
            status: d.status,
            created_at: d.createdAt
          }))
        });
      } else {
        setApiResponse({
          status: 'success',
          code: 200,
          message: 'Estado de entrega actualizado en SanPi Cloud Database',
          updated_at: new Date().toISOString()
        });
      }
      setApiTesting(false);
    }, 600);
  };

  // Dispatch Real Carrier Notification via /api/carrier/notify
  const handleNotifyCarrier = async () => {
    let finalEndpoint = carrierEndpointUrl.trim();
    let finalApiKey = carrierApiKeyInput.trim();

    // Auto-recovery: If user swapped endpoint and apiKey or pasted apiKey in endpoint
    if ((finalEndpoint.startsWith('sk_') || finalEndpoint.startsWith('sanpi_')) && (finalApiKey.startsWith('http://') || finalApiKey.startsWith('https://'))) {
      const temp = finalEndpoint;
      finalEndpoint = finalApiKey;
      finalApiKey = temp;
      setCarrierEndpointUrl(finalEndpoint);
      setCarrierApiKeyInput(finalApiKey);
    } else if (finalEndpoint.startsWith('sk_') || finalEndpoint.startsWith('sanpi_') || (!finalEndpoint.includes('://') && finalEndpoint.length > 25 && !finalEndpoint.includes('/'))) {
      finalApiKey = finalEndpoint;
      finalEndpoint = 'https://studio-345939831630.us-central1.run.app/api/logistics-webhook';
      setCarrierApiKeyInput(finalApiKey);
      setCarrierEndpointUrl(finalEndpoint);
    } else if (!finalEndpoint.startsWith('http://') && !finalEndpoint.startsWith('https://')) {
      if (finalEndpoint.includes('.')) {
        finalEndpoint = `https://${finalEndpoint}`;
        setCarrierEndpointUrl(finalEndpoint);
      } else {
        alert('Por favor ingresa una URL válida que comience con https://');
        return;
      }
    }

    if (!finalEndpoint) {
      alert('Por favor especifica la URL de endpoint del transportista.');
      return;
    }
    if (!carrierStoreId.trim()) {
      alert('Por favor especifica el Store ID del socio.');
      return;
    }

    setNotifyingCarrier(true);
    setCarrierNotifyResult(null);

    // Pick selected delivery or use representative sample order in exact required format
    const chosenDelivery = allDeliveries.find(d => d.id === selectedNotifyOrderId);

    const orderPayload = chosenDelivery ? {
      storeId: carrierStoreId.trim() || 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
      items: [
        {
          barcode_imei: chosenDelivery.barcode_imei || chosenDelivery.articleId || 'SKU-001',
          quantity: 1,
          price: chosenDelivery.basePrice || chosenDelivery.totalCodAmount || 1500,
          name: chosenDelivery.articleName || 'Producto A'
        }
      ],
      customer: {
        name: chosenDelivery.customerName || 'Juan Perez',
        phone: (chosenDelivery.customerPhone || '8095551234').replace(/[^0-9]/g, '') || '8095551234',
        address: chosenDelivery.address || 'Calle Principal #5',
        province: chosenDelivery.province || 'Santiago'
      }
    } : {
      storeId: carrierStoreId.trim() || 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
      items: [
        {
          barcode_imei: 'SKU-001',
          quantity: 1,
          price: 1500,
          name: 'Producto A'
        }
      ],
      customer: {
        name: 'Juan Perez',
        phone: '8095551234',
        address: 'Calle Principal #5',
        province: 'Santiago'
      }
    };

    try {
      const res = await fetch('/api/carrier/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeId: carrierStoreId.trim() || 'sxOzEivG9GP9SvaVuF1nVpQZCOu1',
          apiKey: finalApiKey,
          endpointUrl: finalEndpoint,
          order: orderPayload,
          items: orderPayload.items,
          customer: orderPayload.customer
        })
      });

      const data = await res.json();
      setCarrierNotifyResult(data);
      if (data.success) {
        setNotificationMsg(`Notificación enviada exitosamente al transportista (${data.latencyMs || 0}ms)`);
        setTimeout(() => setNotificationMsg(null), 4000);
      }
    } catch (err: any) {
      setCarrierNotifyResult({
        success: false,
        error: err?.message || 'Error al conectar con /api/carrier/notify',
        status: 500
      });
    } finally {
      setNotifyingCarrier(false);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Top Banner & Carrier Branding */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {selectedCarrier?.name || 'Portal de Empresas de Transporte'}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                    API Live
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Dashboard de Logística, Despacho COD Nacional y Conexión API SanPi
                </p>
              </div>
            </div>

            {/* Carrier Switcher (if admin) or User badge */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {carrierUsers.length > 1 && (
                <div className="relative">
                  <select
                    className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    value={selectedCarrier?.id || ''}
                    onChange={(e) => {
                      const found = carrierUsers.find(c => c.id === e.target.value);
                      if (found) setSelectedCarrier(found);
                    }}
                  >
                    {carrierUsers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              )}

              {onBackToMarketplace && (
                <button
                  onClick={onBackToMarketplace}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                >
                  <span>Volver a Tienda</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick API Key Strip */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-slate-400">API Key Privada:</span>
              <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-200">
                {showApiKey
                  ? (selectedCarrier?.apiKey || 'sanpi_live_demo_key')
                  : `${(selectedCarrier?.apiKey || 'sanpi_live_demo').slice(0, 14)}••••••••••••`}
              </span>
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-slate-400 hover:text-white transition p-1"
                title="Mostrar/Ocultar API Key"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleCopyKey}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 transition"
              >
                {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey ? 'Copiada' : 'Copiar'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Cobertura:</span>
              <span className="bg-slate-800 text-blue-300 font-semibold px-2 py-0.5 rounded border border-slate-700">
                República Dominicana (32 Provincias COD)
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto py-2">
            <nav className="flex space-x-1 sm:space-x-2 min-w-max">
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                  activeTab === 'orders'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Órdenes & Despachos ({filteredDeliveries.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('metrics')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                  activeTab === 'metrics'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Métricas & Liquidación COD</span>
              </button>

              <button
                onClick={() => setActiveTab('api')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                  activeTab === 'api'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Code className="w-4 h-4" />
                <span>Conexión API & Webhooks</span>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Reportes (Excel / PDF)</span>
              </button>
            </nav>

            {/* Quick Export Action Buttons in Bar */}
            <div className="hidden lg:flex items-center space-x-2 pl-4">
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                title="Descargar Reporte en Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Descargar Excel</span>
              </button>
              <button
                onClick={handleExportPdf}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition"
                title="Descargar Manifiesto Oficial en PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Descargar PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Notification Banner */}
        {notificationMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold">{notificationMsg}</p>
            </div>
            <button
              onClick={() => setNotificationMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold uppercase"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Operational KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Envíos</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{kpis.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">En sistema logístico</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs bg-gradient-to-b from-blue-50/40 to-white">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">En Camino</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{kpis.inTransit}</p>
            <p className="text-[11px] text-blue-600/70 mt-0.5">Repartidor en ruta</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs bg-gradient-to-b from-emerald-50/40 to-white">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Entregados</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{kpis.delivered}</p>
            <p className="text-[11px] text-emerald-600/70 mt-0.5">{kpis.deliverySuccessRate}% efectividad</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs bg-gradient-to-b from-amber-50/40 to-white">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pendientes</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{kpis.pending}</p>
            <p className="text-[11px] text-amber-600/70 mt-0.5">Por retirar / despachar</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs bg-gradient-to-b from-purple-50/40 to-white">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">COD Recaudar</p>
            <p className="text-lg font-black text-purple-600 mt-1 truncate">
              RD$ {kpis.totalCodToCollect.toLocaleString()}
            </p>
            <p className="text-[11px] text-purple-600/70 mt-0.5">Monto total en calle</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs bg-gradient-to-b from-emerald-50/40 to-white">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">COD Cobrado</p>
            <p className="text-lg font-black text-emerald-600 mt-1 truncate">
              RD$ {kpis.codAlreadyCollected.toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-600/70 mt-0.5">En caja / listo a liquidar</p>
          </div>
        </div>

        {/* TAB 1: ORDERS DASHBOARD */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar guía, cliente, teléfono, dirección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Status Selector */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 cursor-pointer"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="pendiente">Pendiente de Despacho</option>
                    <option value="en_transito">En Tránsito (Reparto)</option>
                    <option value="entregado">Entregado Exitoso</option>
                    <option value="intento_fallido">Intento Fallido / Novedad</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Province Selector */}
                <div>
                  <select
                    value={provinceFilter}
                    onChange={(e) => setProvinceFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 cursor-pointer"
                  >
                    <option value="todas">Todas las Provincias ({RD_PROVINCES.length})</option>
                    {RD_PROVINCES.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date Range Selector */}
                <div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 cursor-pointer"
                  >
                    <option value="all">Histórico Completo</option>
                    <option value="today">Órdenes de Hoy</option>
                    <option value="week">Últimos 7 Días</option>
                    <option value="month">Últimos 30 Días</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Manifiesto de Despacho & Órdenes</h2>
                  <p className="text-xs text-slate-500">
                    Mostrando {filteredDeliveries.length} de {allDeliveries.length} envíos asignados
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-600" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>

              {filteredDeliveries.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-700">No se encontraron órdenes con estos filtros</p>
                  <p className="text-xs text-slate-500 mt-1">Prueba cambiando el estado, provincia o término de búsqueda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Guía / Tracking</th>
                        <th className="py-3 px-4">Destinatario</th>
                        <th className="py-3 px-4">Destino (Provincia & Dirección)</th>
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4">Monto COD a Cobrar</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Chofer / Repartidor</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDeliveries.map((del) => {
                        const totalCod = del.totalCodAmount || ((del.basePrice || 0) + (del.shippingFee || 350));
                        const cleanPhone = (del.customerPhone || '').replace(/[^0-9]/g, '');

                        return (
                          <tr key={del.id} className="hover:bg-blue-50/30 transition">
                            {/* Tracking */}
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                              <button
                                onClick={() => onSelectDeliveryTracking?.(del.trackingNumber || del.id)}
                                className="text-blue-600 hover:underline inline-flex items-center space-x-1"
                              >
                                <span>{del.trackingNumber || del.id}</span>
                                <ExternalLink className="w-3 h-3 text-blue-400" />
                              </button>
                              <div className="text-[10px] text-slate-400 font-sans font-normal">
                                {del.createdAt ? new Date(del.createdAt).toLocaleDateString('es-DO') : ''}
                              </div>
                            </td>

                            {/* Customer */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-900">{del.customerName}</div>
                              <div className="flex items-center space-x-1 text-slate-500 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{del.customerPhone}</span>
                                {cleanPhone && (
                                  <a
                                    href={`https://wa.me/1${cleanPhone}?text=Hola%20${encodeURIComponent(del.customerName)},%20te%20escribimos%20del%20transporte%20de%20SanPi%20Market%20por%20tu%20paquete%20con%20guia%20${del.trackingNumber}.`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 ml-1 p-0.5"
                                    title="Contactar por WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>

                            {/* Destination */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-semibold text-slate-900 flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                <span>{del.province || 'Distrito Nacional'}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate" title={del.address}>
                                {del.address}
                              </div>
                            </td>

                            {/* Product */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-medium text-slate-800 truncate" title={del.articleName}>
                                {del.articleName}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {del.sourceType === 'landing_page' ? 'Venta Landing Page' : 'Venta Tienda E-commerce'}
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-black text-slate-900 text-sm">
                                RD$ {totalCod.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-emerald-700 font-semibold uppercase">
                                Pago Contra Entrega (COD)
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {del.status === 'entregado' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                  Entregado
                                </span>
                              )}
                              {del.status === 'en_transito' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  <Truck className="w-3 h-3 mr-1 text-blue-600" />
                                  En Tránsito
                                </span>
                              )}
                              {del.status === 'pendiente' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 mr-1 text-amber-600" />
                                  Pendiente
                                </span>
                              )}
                              {del.status === 'intento_fallido' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                  <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />
                                  Intento Fallido
                                </span>
                              )}
                              {del.status === 'cancelado' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  Cancelado
                                </span>
                              )}
                            </td>

                            {/* Driver */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">
                                {del.driverName || del.deliveryPersonName || 'Sin Chofer'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {del.driverPhone || del.deliveryPersonPhone || 'Pendiente asignar'}
                              </div>
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleOpenOrderModal(del)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>Actualizar</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: METRICS & COD SETTLEMENT */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-black text-slate-900 mb-1">Métricas Operativas & Balance COD</h2>
              <p className="text-xs text-slate-500 mb-6">
                Monitoreo en tiempo real del dinero recaudado en efectivo a nivel nacional y efectividad de entrega.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Financial Summary Card */}
                <div className="p-5 rounded-xl bg-slate-900 text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-slate-400">Total Facturación COD</span>
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-white">
                      RD$ {kpis.totalCodToCollect.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">En {kpis.total} envíos asignados</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Efectivo Cobrado:</span>
                      <span className="font-bold text-emerald-400">RD$ {kpis.codAlreadyCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Por Cobrar en Ruta:</span>
                      <span className="font-bold text-amber-400">
                        RD$ {(kpis.totalCodToCollect - kpis.codAlreadyCollected).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Flete SanPi (RD$ 350/envío):</span>
                      <span className="font-bold text-blue-400">RD$ {(kpis.total * 350).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Success Rate Card */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase font-bold text-blue-900">Efectividad de Entrega</span>
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-4xl font-black text-blue-900">{kpis.deliverySuccessRate}%</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {kpis.delivered} de {kpis.total} paquetes completados sin devolución
                    </p>
                  </div>

                  <div className="w-full bg-blue-200 rounded-full h-3 mt-4 overflow-hidden">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${kpis.deliverySuccessRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quick Export Panel */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex flex-col justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-emerald-900">Descarga de Reportes</span>
                    <h3 className="text-base font-bold text-emerald-950 mt-1">Exportación Contable</h3>
                    <p className="text-xs text-emerald-800 mt-1">
                      Genera sábanas completas en Excel para el departamento contable o manifiestos en PDF con membrete.
                    </p>
                  </div>

                  <div className="space-y-2 mt-4">
                    <button
                      onClick={handleExportExcel}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Descargar Sábana Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={handleExportPdf}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Descargar Manifiesto PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: API CONNECTION & WEBHOOKS */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {/* Credentials Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Credenciales de Integración API</h2>
                  <p className="text-xs text-slate-500">
                    Conecta el ERP, software de bodega o app móvil de mensajeros de tu empresa con SanPi Market
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* API Key */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">API Key (x-api-key)</span>
                    <button
                      onClick={handleCopyKey}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center space-x-1"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copiada' : 'Copiar Key'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs break-all">
                    {selectedCarrier?.apiKey || 'sanpi_live_sacha_9824kx9182la'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Incluye esta llave en la cabecera HTTP: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">x-api-key: [TU_KEY]</code>
                  </p>
                </div>

                {/* Webhook Endpoint */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Webhook Inbound SanPi</span>
                    <button
                      onClick={handleCopyWebhook}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center space-x-1"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWebhook ? 'Copiado' : 'Copiar URL'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs truncate">
                    {`${window.location.origin}/api/logistics/webhook-receiver`}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Envía actualizaciones de estado en formato JSON con método POST.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive API Playground */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Simulador & Probador de API en Vivo</h3>
                  <p className="text-xs text-slate-500">Ejecuta solicitudes en vivo para validar la respuesta JSON</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  Sandbox Listo
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={apiMethod}
                  onChange={(e) => setApiMethod(e.target.value as any)}
                  className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                  <option value="POST">POST</option>
                </select>

                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  onClick={handleRunApiTest}
                  disabled={apiTesting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center justify-center space-x-1.5"
                >
                  {apiTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{apiTesting ? 'Enviando...' : 'Ejecutar Request'}</span>
                </button>
              </div>

              {/* JSON Response View */}
              {apiResponse && (
                <div className="p-4 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                    <span className="font-bold text-emerald-400">HTTP 200 OK</span>
                    <span>Content-Type: application/json</span>
                  </div>
                  <pre className="font-mono text-xs overflow-x-auto text-emerald-300 max-h-64">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* DEDICATED CARRIER NOTIFICATION API CONNECTOR */}
            <div className="bg-white p-6 rounded-xl border-2 border-blue-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black">
                      <Truck className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">
                      API de Notificación para Transportistas (POST Webhook)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Acepta <span className="font-bold text-slate-800">Store ID</span>, <span className="font-bold text-slate-800">API Key</span> y la <span className="font-bold text-slate-800">URL del Endpoint</span> del transportista para despachar órdenes automáticamente.
                  </p>
                </div>
                <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  POST /api/carrier/notify
                </span>
              </div>

              {/* Parameter Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Store ID */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <span>Store ID (ID de Socio)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCarrierStoreId('sxOzEivG9GP9SvaVuF1nVpQZCOu1')}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                    >
                      Store ID Oficial
                    </button>
                  </div>
                  <input
                    type="text"
                    value={carrierStoreId}
                    onChange={(e) => setCarrierStoreId(e.target.value)}
                    placeholder="sxOzEivG9GP9SvaVuF1nVpQZCOu1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-500">Tu ID único de socio en el transportista</p>
                </div>

                {/* 2. API Key */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      API Key (Bearer Token)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNotifyKey(!showNotifyKey)}
                      className="text-[10px] text-slate-500 hover:text-slate-800 inline-flex items-center space-x-1 font-semibold"
                    >
                      {showNotifyKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showNotifyKey ? 'Ocultar' : 'Ver'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNotifyKey ? 'text' : 'password'}
                      value={carrierApiKeyInput}
                      onChange={(e) => setCarrierApiKeyInput(e.target.value)}
                      placeholder="sk_sacha_..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {(carrierApiKeyInput.trim().startsWith('http://') || carrierApiKeyInput.trim().startsWith('https://')) && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                      <span>⚠️ URL detectada en campo de API Key.</span>
                      <button
                        type="button"
                        onClick={() => {
                          const tmp = carrierApiKeyInput.trim();
                          setCarrierApiKeyInput(carrierEndpointUrl.startsWith('http') ? '' : carrierEndpointUrl);
                          setCarrierEndpointUrl(tmp);
                        }}
                        className="ml-2 font-bold underline text-blue-700 hover:text-blue-900"
                      >
                        Intercambiar con URL
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500">Enviada en header Authorization: Bearer</p>
                </div>

                {/* 3. Endpoint URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Endpoint URL del Transportista
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setCarrierEndpointUrl('https://studio-345939831630.us-central1.run.app/api/logistics-webhook')}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                        title="Endpoint oficial Studio Cloud Run"
                      >
                        Studio Run
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setCarrierEndpointUrl('https://www.sachapack.com/api/logistics-webhook')}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                        title="Endpoint oficial sachapack.com"
                      >
                        Sacha Pack
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setCarrierEndpointUrl(`${window.location.origin}/api/logistics/webhook-receiver`)}
                        className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold"
                        title="Webhook de simulación local de Sanpi para pruebas de desarrollo"
                      >
                        Local
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    value={carrierEndpointUrl}
                    onChange={(e) => setCarrierEndpointUrl(e.target.value)}
                    placeholder="https://studio-345939831630.us-central1.run.app/api/logistics-webhook"
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      carrierEndpointUrl.trim().startsWith('sk_') || carrierEndpointUrl.trim().startsWith('sanpi_') ? 'border-amber-400 bg-amber-50/50' : 'border-slate-300'
                    }`}
                  />
                  {(carrierEndpointUrl.trim().startsWith('sk_') || carrierEndpointUrl.trim().startsWith('sanpi_')) && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                      <span>⚠️ API Key detectada en el campo de URL.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCarrierApiKeyInput(carrierEndpointUrl.trim());
                          setCarrierEndpointUrl('https://studio-345939831630.us-central1.run.app/api/logistics-webhook');
                        }}
                        className="ml-2 font-bold underline text-blue-700 hover:text-blue-900"
                      >
                        Mover a API Key y usar URL oficial
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500">Webhook de destino para recibir la orden</p>
                </div>
              </div>

              {/* Order Selection & Payload Settings */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-800">
                    Orden para Notificar:
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Selecciona una orden de la lista o envía la orden demo preconfigurada
                  </p>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <select
                    value={selectedNotifyOrderId}
                    onChange={(e) => setSelectedNotifyOrderId(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
                  >
                    <option value="sample">Orden Demo (Carlos Gómez • Santiago - COD RD$ 2,800)</option>
                    {filteredDeliveries.map(del => (
                      <option key={del.id} value={del.id}>
                        {del.trackingNumber || del.id.slice(0, 10)} • {del.recipientName} ({del.province})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleNotifyCarrier}
                    disabled={notifyingCarrier}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center space-x-1.5 whitespace-nowrap"
                  >
                    {notifyingCarrier ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{notifyingCarrier ? 'Notificando...' : 'Enviar Notificación'}</span>
                  </button>
                </div>
              </div>

              {/* Code Examples Tabs (JS, cURL, Python) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setCodeTab('js')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition ${codeTab === 'js' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      JavaScript / Node.js
                    </button>
                    <button
                      onClick={() => setCodeTab('curl')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition ${codeTab === 'curl' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      cURL / REST
                    </button>
                    <button
                      onClick={() => setCodeTab('python')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition ${codeTab === 'python' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Python
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const snippet = codeTab === 'js'
                        ? `// Ejemplo de conexión rápida (Node.js/JavaScript)
async function sendOrder(orderData) {
  const response = await fetch('${carrierEndpointUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + '${carrierApiKeyInput || 'YOUR_API_KEY'}'
    },
    body: JSON.stringify(orderData)
  });
  return await response.json();
}

// Estructura requerida de orderData:
const sampleOrder = {
  "storeId": "${carrierStoreId}",
  "items": [
    { "barcode_imei": "SKU-001", "quantity": 1, "price": 1500, "name": "Producto A" }
  ],
  "customer": {
    "name": "Juan Perez",
    "phone": "8095551234",
    "address": "Calle Principal #5",
    "province": "Santiago"
  }
};

// Enviar orden
sendOrder(sampleOrder).then(console.log);`
                        : codeTab === 'curl'
                        ? `curl -X POST "${carrierEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${carrierApiKeyInput || 'YOUR_API_KEY'}" \\
  -d '{
    "storeId": "${carrierStoreId}",
    "items": [
      { "barcode_imei": "SKU-001", "quantity": 1, "price": 1500, "name": "Producto A" }
    ],
    "customer": {
      "name": "Juan Perez",
      "phone": "8095551234",
      "address": "Calle Principal #5",
      "province": "Santiago"
    }
  }'`
                        : `import requests

# Ejemplo de conexión (Python)
def send_order(order_data):
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer ${carrierApiKeyInput || 'YOUR_API_KEY'}"
    }
    response = requests.post("${carrierEndpointUrl}", json=order_data, headers=headers)
    return response.json()

order_data = {
    "storeId": "${carrierStoreId}",
    "items": [
        {"barcode_imei": "SKU-001", "quantity": 1, "price": 1500, "name": "Producto A"}
    ],
    "customer": {
        "name": "Juan Perez",
        "phone": "8095551234",
        "address": "Calle Principal #5",
        "province": "Santiago"
    }
}

result = send_order(order_data)
print(result)`;
                      handleCopyCode(snippet);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center space-x-1"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Código Copiado' : 'Copiar Código'}</span>
                  </button>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-72 border border-slate-800">
                  {codeTab === 'js' && (
                    <pre className="text-emerald-300 whitespace-pre">
{`// Ejemplo de conexión rápida (Node.js/JavaScript)
async function sendOrder(orderData) {
  const response = await fetch('${carrierEndpointUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + '${carrierApiKeyInput || 'YOUR_API_KEY'}'
    },
    body: JSON.stringify(orderData)
  });
  return await response.json();
}

// Estructura requerida de orderData:
const sampleOrder = {
  "storeId": "${carrierStoreId}",
  "items": [
    { "barcode_imei": "SKU-001", "quantity": 1, "price": 1500, "name": "Producto A" }
  ],
  "customer": {
    "name": "Juan Perez",
    "phone": "8095551234",
    "address": "Calle Principal #5",
    "province": "Santiago"
  }
};

// Enviar orden
sendOrder(sampleOrder).then(console.log);`}
                    </pre>
                  )}

                  {codeTab === 'curl' && (
                    <pre className="text-sky-300 whitespace-pre">
{`curl -X POST "${carrierEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${carrierApiKeyInput || 'YOUR_API_KEY'}" \\
  -d '{
  "storeId": "${carrierStoreId}",
  "items": [
    { "barcode_imei": "SKU-001", "quantity": 1, "price": 1500, "name": "Producto A" }
  ],
  "customer": {
    "name": "Juan Perez",
    "phone": "8095551234",
    "address": "Calle Principal #5",
    "province": "Santiago"
  }
}'`}
                    </pre>
                  )}

                  {codeTab === 'python' && (
                    <pre className="text-amber-300 whitespace-pre">
{`import requests

# Ejemplo de conexión (Python)
def send_order(order_data):
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer ${carrierApiKeyInput || 'YOUR_API_KEY'}"
    }
    response = requests.post("${carrierEndpointUrl}", json=order_data, headers=headers)
    return response.json()

order_data = {
    "storeId": "${carrierStoreId}",
    "items": [
        {"barcode_imei": "SKU-001", "quantity": 1, "price": 1500, "name": "Producto A"}
    ],
    "customer": {
        "name": "Juan Perez",
        "phone": "8095551234",
        "address": "Calle Principal #5",
        "province": "Santiago"
    }
}

result = send_order(order_data)
print(result)`}
                    </pre>
                  )}
                </div>
              </div>

              {/* Notification Live Result Box */}
              {carrierNotifyResult && (
                <div className={`p-4 rounded-xl border ${carrierNotifyResult.success ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-900' : 'bg-red-950/20 border-red-500/40 text-red-900'} space-y-2`}>
                  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-slate-200">
                    <span className="flex items-center space-x-1.5">
                      {carrierNotifyResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span>
                        {carrierNotifyResult.success ? 'HTTP 200 / 201 Notificación Aceptada' : `HTTP ${carrierNotifyResult.status || 500} Respuesta de Transporte`}
                      </span>
                    </span>
                    {carrierNotifyResult.latencyMs && (
                      <span className="text-[11px] font-mono text-slate-500">
                        {carrierNotifyResult.latencyMs} ms
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium">
                    {carrierNotifyResult.message || carrierNotifyResult.error}
                  </p>

                  {/* Diagnostic / Solution helper when store is not registered in Sacha Pack */}
                  {carrierNotifyResult.hint && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs space-y-2">
                      <div className="font-bold flex items-center space-x-1.5 text-amber-800">
                        <Info className="w-4 h-4" />
                        <span>¿Por qué ocurre este error y cómo solucionarlo?</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {carrierNotifyResult.hint}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCarrierEndpointUrl(`${window.location.origin}/api/logistics/webhook-receiver`);
                            setTimeout(() => handleNotifyCarrier(), 100);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Probar ahora con Webhook Local Sanpi (Respuesta 200)</span>
                        </button>
                        <a
                          href="https://www.sachapack.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-amber-400 text-amber-900 rounded text-[11px] font-bold transition inline-flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir Portal Sacha Pack</span>
                        </a>
                      </div>
                    </div>
                  )}

                  <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto max-h-56">
                    {JSON.stringify(carrierNotifyResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* cURL Example */}
            <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ejemplo cURL / REST API</span>
                <span className="text-xs text-blue-400 font-mono">Bash</span>
              </div>
              <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
{`curl -X GET "${window.location.origin}/api/carrier/orders" \\
  -H "x-api-key: ${selectedCarrier?.apiKey || 'sanpi_live_sacha_9824kx9182la'}" \\
  -H "Accept: application/json"`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: REPORT EXPORTS */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Excel Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Reporte Completo en Microsoft Excel (.xlsx)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Exporta una hoja de cálculo con columnas formateadas: Número de Guía, Destinatario, Teléfono WhatsApp, Dirección exacta, Contenido del paquete, Total COD a recaudar, Chofer asignado y Fila de totales.
                </p>
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-900 space-y-1">
                  <p className="font-bold">Incluye en el archivo:</p>
                  <p>• {filteredDeliveries.length} órdenes seleccionadas con el filtro actual</p>
                  <p>• Sumatoria de cobros COD: RD$ {kpis.totalCodToCollect.toLocaleString()}</p>
                </div>
              </div>

              <button
                onClick={handleExportExcel}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition flex items-center justify-center space-x-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Generar y Descargar Excel (.xlsx)</span>
              </button>
            </div>

            {/* PDF Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Manifiesto Oficial de Despacho en PDF</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Documento formal listo para imprimir o enviar por correo con membrete oficial de SanPi Logistics, resumen de métricas, tabla de envíos y bloque de firmas de conformidad para el chofer y receptor.
                </p>
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-900 space-y-1">
                  <p className="font-bold">Estructura del documento:</p>
                  <p>• Membrete corporativo y fecha de emisión</p>
                  <p>• Balance de recaudación y cuadro de firmas de entrega</p>
                </div>
              </div>

              <button
                onClick={handleExportPdf}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Generar y Descargar PDF</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* UPDATE ORDER MODAL */}
      {activeModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">Actualizar Estado de Despacho</h3>
                <p className="text-xs text-slate-500">Guía: {activeModalOrder.trackingNumber || activeModalOrder.id}</p>
              </div>
              <button
                onClick={() => setActiveModalOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Summary Box */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p><strong className="text-slate-700">Cliente:</strong> {activeModalOrder.customerName} ({activeModalOrder.customerPhone})</p>
              <p><strong className="text-slate-700">Destino:</strong> {activeModalOrder.province} - {activeModalOrder.address}</p>
              <p><strong className="text-slate-700">Monto COD a Cobrar:</strong> <span className="font-bold text-emerald-700 text-sm">RD$ {(activeModalOrder.totalCodAmount || (activeModalOrder.basePrice + 350)).toLocaleString()}</span></p>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nuevo Estado de la Orden</label>
                <select
                  value={newOrderStatus}
                  onChange={(e) => setNewOrderStatus(e.target.value as DeliveryStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pendiente">Pendiente de Despacho</option>
                  <option value="en_transito">En Tránsito (Repartidor en Ruta)</option>
                  <option value="entregado">Entregado Exitoso & Dinero Cobrado</option>
                  <option value="intento_fallido">Intento Fallido (Cliente no contesta / Novedad)</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chofer / Repartidor</label>
                  <input
                    type="text"
                    placeholder="Ej: Carlos Henríquez"
                    value={selectedDriverName}
                    onChange={(e) => setSelectedDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono Chofer</label>
                  <input
                    type="text"
                    placeholder="809-000-0000"
                    value={selectedDriverPhone}
                    onChange={(e) => setSelectedDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas / Observaciones de Entrega</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Cobrado en efectivo en torre de apartamentos, entregado a portero con recibo firmado..."
                  value={carrierNotesInput}
                  onChange={(e) => setCarrierNotesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setActiveModalOrder(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveOrderStatus}
                disabled={isUpdatingOrder}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
              >
                {isUpdatingOrder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isUpdatingOrder ? 'Guardando...' : 'Guardar Estado'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
