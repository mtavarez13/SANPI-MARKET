import React, { useState, useMemo } from 'react';
import {
  Boxes,
  PlusCircle,
  EyeOff,
  Users,
  TrendingUp,
  Tag,
  DollarSign,
  Package,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Store as StoreIcon,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { Article, UserProfile } from '../types';
import { sanpiManager } from '../lib/storeManager';
import * as XLSX from 'xlsx';

interface SupplierDashboardProps {
  currentUser: UserProfile | null;
  onBackToMarketplace?: () => void;
  onOpenLandingGenerator?: () => void;
}

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({
  currentUser,
  onBackToMarketplace,
  onOpenLandingGenerator
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'new_product' | 'dropshippers'>('catalog');

  // Supplier Identity
  const supplierId = currentUser?.uid || 'prov_supplier_default';
  const supplierName = currentUser?.companyName || currentUser?.displayName || 'Distribuidora Mayorista RD';
  const supplierEmail = currentUser?.email || 'proveedor@sanpi.do';

  // Form State for new wholesale product
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tecnología & Gadgets');
  const [baseCost, setBaseCost] = useState<number | ''>(1200);
  const [suggestedRetailPrice, setSuggestedRetailPrice] = useState<number | ''>(2600);
  const [stock, setStock] = useState<number | ''>(100);
  const [imageUrl, setImageUrl] = useState('');
  const [barcodeImei, setBarcodeImei] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search in catalog
  const [searchQuery, setSearchQuery] = useState('');

  // Articles from store manager
  const allArticles = sanpiManager.articles;

  // Filter articles belonging to or uploaded as provider products
  const providerArticles = useMemo(() => {
    return allArticles.filter(a => {
      const isMineOrProvider = a.isProviderProduct === true || a.visibility === 'dropshippers_only' || a.supplierId === supplierId;
      if (!isMineOrProvider) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (a.title || a.name).toLowerCase().includes(q);
        const matchCategory = (a.category || '').toLowerCase().includes(q);
        return matchTitle || matchCategory;
      }

      return true;
    });
  }, [allArticles, supplierId, searchQuery]);

  // Total stock & valuation
  const totalStockUnits = providerArticles.reduce((acc, a) => acc + (a.stock || a.inventory || 0), 0);
  const totalWholesaleValue = providerArticles.reduce((acc, a) => acc + ((a.baseCost || a.price) * (a.stock || 1)), 0);

  // Submit new wholesale product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !baseCost || Number(baseCost) <= 0) {
      alert('Por favor completa el título y un precio base mayorista válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newArt = await sanpiManager.addProviderArticle({
        title: title.trim(),
        description: description.trim() || 'Artículo mayorista disponible para la red nacional de dropshippers.',
        category,
        baseCost: Number(baseCost),
        suggestedRetailPrice: suggestedRetailPrice ? Number(suggestedRetailPrice) : undefined,
        stock: stock ? Number(stock) : 50,
        images: imageUrl.trim() ? [imageUrl.trim()] : [
          'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'
        ],
        barcode_imei: barcodeImei.trim() || undefined,
        supplierId,
        supplierName,
        supplierEmail
      });

      setSuccessMsg(`Producto mayorista "${newArt.title}" publicado exitosamente.`);
      setTimeout(() => setSuccessMsg(null), 5000);

      // Reset form
      setTitle('');
      setDescription('');
      setBaseCost(1000);
      setSuggestedRetailPrice(2200);
      setStock(80);
      setImageUrl('');
      setBarcodeImei('');
      setActiveTab('catalog');
    } catch (err: any) {
      alert(`Error al guardar producto: ${err?.message || 'Error de conexión'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export catalog to Excel
  const handleExportCatalog = () => {
    const rows = providerArticles.map((a, i) => ({
      '#': i + 1,
      'ID Producto': a.id,
      'Título / Nombre': a.title || a.name,
      'Categoría': a.category,
      'Precio Base Proveedor (RD$)': a.baseCost || a.price,
      'PVP Sugerido (RD$)': a.suggestedRetailPrice || Math.round((a.baseCost || a.price) * 1.8),
      'Margen Dropshipper Est. (RD$)': (a.suggestedRetailPrice || Math.round((a.baseCost || a.price) * 1.8)) - (a.baseCost || a.price),
      'Stock Disponible': a.stock || a.inventory || 0,
      'Visibilidad': 'Oculto al público (Solo Dropshippers)',
      'Tiendas Promocionando': (a.addedToStoreSlugs || []).length,
      'Fecha Creación': a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-DO') : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 4 },
      { wch: 18 },
      { wch: 35 },
      { wch: 22 },
      { wch: 25 },
      { wch: 20 },
      { wch: 26 },
      { wch: 16 },
      { wch: 32 },
      { wch: 22 },
      { wch: 18 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catalogo_Mayorista');
    XLSX.writeFile(wb, `SanPi_Catalogo_Mayorista_${supplierName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      {/* Header Banner */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">{supplierName}</h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Proveedor Mayorista
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Panel de Carga de Artículos a Precio Base para la Red de Dropshippers SanPi
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCatalog}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar Catálogo</span>
              </button>

              {onBackToMarketplace && (
                <button
                  onClick={onBackToMarketplace}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white transition shadow-sm"
                >
                  <StoreIcon className="w-3.5 h-3.5" />
                  <span>Ver Marketplace</span>
                </button>
              )}
            </div>
          </div>

          {/* Privacy & Wholesale Guarantee Banner */}
          <div className="mt-4 p-3 rounded-lg bg-purple-950/60 border border-purple-800/40 flex items-center space-x-3 text-xs text-purple-200">
            <EyeOff className="w-4 h-4 text-purple-400 shrink-0" />
            <p>
              <strong>Privacidad Mayorista Garantizada:</strong> Todos los productos cargados aquí están <strong>ocultos del público general</strong>. Solo los usuarios con rol de <strong>Dropshipper</strong> tienen visibilidad de tu precio base para promocionarlos en sus tiendas y landing pages con pago contra entrega (COD).
            </p>
          </div>
        </div>
      </header>

      {/* Tabs Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 py-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                activeTab === 'catalog'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Mis Artículos Mayoristas ({providerArticles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('new_product')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                activeTab === 'new_product'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cargar Nuevo Artículo</span>
            </button>

            <button
              onClick={() => setActiveTab('dropshippers')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                activeTab === 'dropshippers'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Red de Dropshippers Activos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold">{successMsg}</p>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold uppercase"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase">Productos Mayoristas</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{providerArticles.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Disponibles a dropshippers</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs bg-gradient-to-b from-purple-50/40 to-white">
            <p className="text-xs font-bold text-purple-700 uppercase">Unidades en Almacén</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{totalStockUnits}</p>
            <p className="text-[11px] text-purple-600/70 mt-0.5">Stock total registrado</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs bg-gradient-to-b from-emerald-50/40 to-white">
            <p className="text-xs font-bold text-emerald-700 uppercase">Valor a Precio Base</p>
            <p className="text-xl font-black text-emerald-600 mt-1">
              RD$ {totalWholesaleValue.toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-600/70 mt-0.5">Inventario en bodega</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs bg-gradient-to-b from-blue-50/40 to-white">
            <p className="text-xs font-bold text-blue-700 uppercase">Tiendas Promotoras</p>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {providerArticles.reduce((acc, a) => acc + (a.addedToStoreSlugs?.length || 0), 0)}
            </p>
            <p className="text-[11px] text-blue-600/70 mt-0.5">Catálogos que te venden</p>
          </div>
        </div>

        {/* TAB 1: CATALOG */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar en catálogo mayorista..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={() => setActiveTab('new_product')}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Subir Nuevo Artículo</span>
              </button>
            </div>

            {/* Articles Grid */}
            {providerArticles.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Aún no has subido artículos mayoristas</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Sube tus productos con su precio base para que cientos de dropshippers en República Dominicana los agreguen a sus tiendas y generen ventas masivas contra entrega.
                </p>
                <button
                  onClick={() => setActiveTab('new_product')}
                  className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Subir Mi Primer Producto</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providerArticles.map(art => {
                  const base = art.baseCost || art.price;
                  const suggested = art.suggestedRetailPrice || Math.round(base * 1.8);
                  const marginEst = suggested - base;
                  const marginPercent = Math.round((marginEst / suggested) * 100);

                  return (
                    <div
                      key={art.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-purple-300 transition"
                    >
                      <div>
                        {/* Image & Badge */}
                        <div className="relative aspect-video bg-slate-100 overflow-hidden">
                          <img
                            src={art.image || art.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'}
                            alt={art.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                              <EyeOff className="w-3 h-3 mr-1 text-purple-400" />
                              Oculto al Público
                            </span>
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500 text-white">
                              Stock: {art.stock || art.inventory || 0}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-4 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                            {art.category}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm line-clamp-2" title={art.title}>
                            {art.title || art.name}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {art.description}
                          </p>

                          {/* Pricing Box */}
                          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-purple-50/70 border border-purple-100">
                              <span className="text-[10px] font-bold text-purple-800 uppercase block">
                                Tu Precio Base
                              </span>
                              <span className="text-base font-black text-purple-900">
                                RD$ {base.toLocaleString()}
                              </span>
                            </div>

                            <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                                PVP Sugerido
                              </span>
                              <span className="text-base font-black text-emerald-900">
                                RD$ {suggested.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span>Margen Dropshipper:</span>
                            <span className="font-bold text-emerald-600">
                              RD$ {marginEst.toLocaleString()} ({marginPercent}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center space-x-1 text-[11px]">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span>{art.addedToStoreSlugs?.length || 0} Dropshippers lo venden</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {art.createdAt ? new Date(art.createdAt).toLocaleDateString('es-DO') : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NEW PRODUCT FORM */}
        {activeTab === 'new_product' && (
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs max-w-3xl mx-auto space-y-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <PlusCircle className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-black text-slate-900">Subir Artículo Mayorista al Catálogo</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ingresa el costo base al que estás dispuesto a despachar el producto. Este precio solo lo verán los dropshippers afiliados.
              </p>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre / Título del Artículo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aspiradora Inalámbrica Multifunción de Auto 120W"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Category & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Tecnología & Gadgets">Tecnología & Gadgets</option>
                    <option value="Hogar & Cocina">Hogar & Cocina</option>
                    <option value="Salud & Belleza">Salud & Belleza</option>
                    <option value="Seguridad & Cámaras">Seguridad & Cámaras</option>
                    <option value="Herramientas & Auto">Herramientas & Auto</option>
                    <option value="Moda & Relojes">Moda & Relojes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock en Bodega / Almacén</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="100"
                    value={stock}
                    onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    Precio Base Mayorista (RD$) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="1200"
                    value={baseCost}
                    onChange={(e) => setBaseCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[10px] text-purple-700 mt-1 block">
                    Costo confidencial para los dropshippers.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PVP Sugerido de Venta al Público (RD$)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="2600"
                    value={suggestedRetailPrice}
                    onChange={(e) => setSuggestedRetailPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Precio de venta sugerido al cliente final en RD.
                  </span>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enlace de Imagen del Producto (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción y Características</label>
                <textarea
                  rows={3}
                  placeholder="Detalles técnicos, qué incluye la caja, especificaciones clave para que los dropshippers creen sus anuncios y landing pages..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition flex items-center space-x-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{isSubmitting ? 'Publicando...' : 'Publicar Producto Oculto para Dropshippers'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: DROPSHIPPERS NETWORK */}
        {activeTab === 'dropshippers' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Red de Tiendas Dropshippers en SanPi</h3>
              <p className="text-xs text-slate-500">
                Estas son las tiendas y creadores que tienen acceso a tu catálogo mayorista y están habilitados para generar landing pages y promocionar tus artículos en Facebook, Instagram y TikTok Ads.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {sanpiManager.stores.map(store => (
                <div key={store.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-3">
                    <img
                      src={store.logoUrl || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=100'}
                      alt={store.name}
                      className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{store.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">sanpi.com.do/{store.slug}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {store.description}
                  </p>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-purple-600 font-semibold">Habilitada para Dropshipping</span>
                    <span className="text-slate-400">República Dominicana</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
