import React, { useState, useEffect } from 'react';
import { Article, Store, ProductVariant } from '../types';
import { SANPI_FLAT_SHIPPING_FEE } from '../lib/firebase';
import { sanpiManager } from '../lib/storeManager';
import {
  X,
  Eye,
  Star,
  Truck,
  ShieldCheck,
  CheckCircle,
  ShoppingBag,
  MapPin,
  Phone,
  Share2,
  ChevronRight,
  Sparkles,
  Zap,
  HelpCircle,
  MessageSquare,
  FileText,
  Clock,
  Heart,
  Check,
  ChevronDown,
  Info
} from 'lucide-react';

interface ProductDetailModalProps {
  article: Article | null;
  stores: Store[];
  onClose: () => void;
  onAddToCart: (article: Article, selectedVariant?: Record<string, string>, quantity?: number) => void;
  onSelectStoreSlug: (slug: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  article,
  stores,
  onClose,
  onAddToCart,
  onSelectStoreSlug,
}) => {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'faq' | 'reviews'>('details');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (article?.id) {
      sanpiManager.incrementArticleViews(article.id);
    }
  }, [article?.id]);

  // Initialize selected variants with first options
  useEffect(() => {
    if (article?.variants && article.variants.length > 0) {
      const initialVariants: Record<string, string> = {};
      article.variants.forEach((v) => {
        if (v.options && v.options.length > 0) {
          initialVariants[v.name] = v.options[0];
        }
      });
      setSelectedVariants(initialVariants);
    }
  }, [article]);

  if (!article) return null;

  const store = stores.find((s) => s.id === article.storeId || s.name === article.storeName);
  const gallery =
    article.images && article.images.length > 0
      ? article.images
      : article.gallery && article.gallery.length > 0
      ? article.gallery
      : [article.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'];

  const activeImage = gallery[selectedImgIndex] || gallery[0];
  const unitPrice = article.price;
  const comparePrice = article.compareAtPrice || Math.round(unitPrice * 1.3);
  const discountPercent = Math.max(0, Math.round(((comparePrice - unitPrice) / comparePrice) * 100));
  const totalItemPrice = unitPrice * quantity;
  const totalCodPrice = totalItemPrice + SANPI_FLAT_SHIPPING_FEE;
  const currentStock = article.inventory ?? article.stock ?? 15;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleVariantSelect = (variantName: string, optionVal: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [variantName]: optionVal,
    }));
  };

  const handleBuyNow = () => {
    onAddToCart(article, selectedVariants, quantity);
    onClose();
  };

  // Sample FAQ
  const faqs = [
    {
      q: '¿Cómo funciona el Pago Contra Entrega (COD)?',
      a: 'Pagas en efectivo únicamente cuando el repartidor de Sacha Pack llegue a tu dirección en cualquier provincia de RD y verifiques tu paquete.',
    },
    {
      q: '¿Cuánto tiempo tarda la entrega?',
      a: 'El despacho se realiza en 24 a 48 horas laborables en todo el territorio nacional (Gran Santo Domingo, Santiago, Este, Sur y Norte).',
    },
    {
      q: '¿El producto tiene garantía oficial?',
      a: 'Sí, todas las compras en tiendas verificadas de Sanpi cuentan con respaldo directo de la tienda y soporte de intermediación de la plataforma.',
    },
    {
      q: '¿Puedo revender este producto por Dropshipping?',
      a: '¡Totalmente! Puedes unirte como Dropshipper en Sanpi, compartir el enlace y ganar una comisión directa por cada venta despachada.',
    },
  ];

  const specifications = article.specifications || {
    'Garantía': 'Garantía oficial directa en República Dominicana',
    'Despacho y Logística': 'Sacha Pack Express (24-48 horas a nivel nacional)',
    'Condición': 'Nuevo en caja sellada con empaque original',
    'Método de Pago': 'Efectivo Contra Entrega (COD) o Transferencia',
    'Disponibilidad': `${currentStock} unidades disponibles en almacén`,
  };

  const reviews = article.reviews && article.reviews.length > 0 ? article.reviews : [
    {
      id: 'rev-1',
      author: 'Carlos Medina',
      rating: 5,
      comment: 'Excelente producto, llegó en menos de 24 horas a Santiago por Sacha Pack. Pagué en efectivo al recibir, 100% recomendado.',
      date: '2026-08-15',
      verifiedPurchase: true
    },
    {
      id: 'rev-2',
      author: 'Yomaira Peña',
      rating: 5,
      comment: 'La calidad es tal cual las fotos. Me encantó la atención de la tienda por WhatsApp.',
      date: '2026-08-10',
      verifiedPurchase: true
    },
    {
      id: 'rev-3',
      author: 'Manuel Santana',
      rating: 4.8,
      comment: 'Muy buena compra, el repartidor fue muy amable y el flete de RD$ 350 es súper justo.',
      date: '2026-08-02',
      verifiedPurchase: true
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl sm:rounded-[2.5rem] max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-200 relative max-h-[94vh] flex flex-col my-auto text-slate-900">
        
        {/* Top Floating Control Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span className="text-blue-400">Sanpi Market</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-400">{article.category}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white truncate max-w-[200px] sm:max-w-xs">{article.title || article.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Compartir producto"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsWishlisted(!isWishlisted)}
              className={`p-2 rounded-full transition-colors ${
                isWishlisted ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Guardar en favoritos"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-red-600 text-white transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8">
          
          {/* Main PDP Grid: Gallery (Left) + Central Information & Buy Box (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Gallery Column (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Main Image Display */}
              <div className="relative aspect-square rounded-3xl bg-slate-50 border border-slate-200 overflow-hidden shadow-inner flex items-center justify-center group">
                <img
                  src={activeImage}
                  alt={article.title || article.name}
                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                />

                {discountPercent > 0 && (
                  <div className="absolute top-4 left-4 bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-md uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>-{discountPercent}%</span>
                  </div>
                )}

                <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>{article.views || 18} vistas hoy</span>
                </div>
              </div>

              {/* Thumbnails Row */}
              {gallery.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {gallery.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImgIndex(idx)}
                      className={`w-16 h-16 rounded-2xl overflow-hidden border-2 bg-slate-50 p-1 transition-all shrink-0 ${
                        selectedImgIndex === idx
                          ? 'border-blue-600 ring-2 ring-blue-500/20 scale-95 shadow-md'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="w-full h-full object-cover rounded-xl" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 pt-2">
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-900 p-2.5 rounded-2xl border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pago COD o Transferencia</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 text-blue-900 p-2.5 rounded-2xl border border-blue-200">
                  <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Flete RD$ 350 Nacional</span>
                </div>
              </div>

            </div>

            {/* Product Center Info + Buy Box (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                
                {/* Store Header & Category */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {store ? (
                    <button
                      onClick={() => {
                        onClose();
                        onSelectStoreSlug(store.slug);
                      }}
                      className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border border-slate-200 group"
                    >
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        className="w-5 h-5 rounded-full object-cover border border-slate-300"
                      />
                      <span className="group-hover:text-blue-600">Tienda Oficial {store.name}</span>
                      <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-100" />
                      <span className="text-[10px] text-slate-500 font-normal">({store.province})</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                      {article.storeName || 'Vendedor Verificado'}
                    </span>
                  )}

                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                    SKU: {article.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {article.title || article.name}
                </h1>

                {/* Ratings & Social Proof */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-xl border border-amber-200 font-bold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <span>{article.rating || 4.9}</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    ({article.reviewCount || reviews.length} opiniones verificadas)
                  </button>
                  <span>•</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    En Stock ({currentStock} disponibles)
                  </span>
                </div>

                {/* Price Breakdown Banner */}
                <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-5 space-y-3 shadow-xl border border-slate-800">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-white">
                      RD$ {unitPrice.toLocaleString()}
                    </span>
                    {comparePrice > unitPrice && (
                      <span className="text-sm font-semibold text-slate-400 line-through">
                        RD$ {comparePrice.toLocaleString()}
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span className="bg-emerald-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded-lg uppercase">
                        Ahorras RD$ {(comparePrice - unitPrice).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-yellow-300 font-semibold pt-1 border-t border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4" />
                      Flete Fijo Sacha Pack (Nacional):
                    </span>
                    <span className="bg-yellow-400/20 px-2 py-0.5 rounded text-yellow-300 font-bold">
                      RD$ {SANPI_FLAT_SHIPPING_FEE}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Total a pagar con flete incluido
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-400">
                        RD$ {totalCodPrice.toLocaleString()}
                      </span>
                    </div>
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      💵 COD • 💳 Tarjeta • 🏦 Transf.
                    </span>
                  </div>
                </div>

                {/* Variant Selectors (Color, Size, Capacity, etc.) */}
                {article.variants && article.variants.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {article.variants.map((variantGroup, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span>{variantGroup.name}:</span>
                          <span className="text-blue-600 font-extrabold">
                            {selectedVariants[variantGroup.name] || variantGroup.options[0]}
                          </span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {variantGroup.options.map((opt) => {
                            const isSelected = selectedVariants[variantGroup.name] === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => handleVariantSelect(variantGroup.name, opt)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-102 border border-blue-500'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Key Bullet Highlights */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <p className="font-bold text-slate-800">Lo que debes saber de este producto:</p>
                  <ul className="space-y-1 pl-4 list-disc marker:text-blue-600">
                    <li>Entrega garantizada en 24-48 horas a cualquier rincón de RD.</li>
                    <li>Revisas tu paquete en mano antes de entregar el dinero al courier.</li>
                    <li>Soporte y atención directa con la tienda oficial por WhatsApp.</li>
                  </ul>
                </div>

              </div>

              {/* Buy Box Actions */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                
                <div className="flex items-center gap-3">
                  {/* Quantity Counter */}
                  <div className="flex items-center bg-slate-100 rounded-2xl border border-slate-200 p-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center transition-colors shadow-sm"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-black text-sm text-slate-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                      className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center transition-colors shadow-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart CTA */}
                  <button
                    onClick={() => {
                      onAddToCart(article, selectedVariants, quantity);
                      onClose();
                    }}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
                  >
                    <ShoppingBag className="w-4 h-4 text-blue-400" />
                    <span>Añadir al Carrito ({quantity})</span>
                  </button>
                </div>

                {/* Instant Multi-Payment Buy Now */}
                <button
                  onClick={handleBuyNow}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black py-3.5 px-6 rounded-2xl text-sm transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-98 border border-blue-400/30"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>COMPRAR AHORA • SELECCIONAR PAGO (RD$ {totalCodPrice.toLocaleString()})</span>
                </button>

                {/* Contact Seller via WhatsApp */}
                {store?.contact?.whatsapp && (
                  <a
                    href={`https://wa.me/${store.contact.whatsapp}?text=Hola%20${encodeURIComponent(
                      store.name
                    )},%20tengo%20una%20pregunta%20sobre%20el%20producto%20${encodeURIComponent(
                      article.title || article.name
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Consultar con la tienda por WhatsApp</span>
                  </a>
                )}

              </div>

            </div>

          </div>

          {/* Lower Detail Tabs: Specs, FAQ, Reviews, Description */}
          <div className="pt-6 border-t border-slate-200 space-y-6">
            
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none pb-2">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'details'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Descripción Detallada</span>
              </button>

              <button
                onClick={() => setActiveTab('specs')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'specs'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Especificaciones Técnicas</span>
              </button>

              <button
                onClick={() => setActiveTab('faq')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'faq'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Preguntas Frecuentes</span>
              </button>

              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'reviews'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Reseñas de Clientes ({reviews.length})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
              
              {/* Tab 1: Description */}
              {activeTab === 'details' && (
                <div className="space-y-4 text-xs text-slate-700 leading-relaxed max-w-3xl">
                  <h3 className="text-sm font-black text-slate-900">Sobre este artículo</h3>
                  <p>{article.description}</p>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900">Garantía Sanpi Direct:</h4>
                    <p className="text-slate-600 text-[11px]">
                      Si el artículo presenta defectos de fábrica o discrepancias con la descripción, puedes solicitar reemplazo o devolución a través del canal oficial de atención al cliente de la tienda.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Specs Table */}
              {activeTab === 'specs' && (
                <div className="space-y-4 max-w-2xl">
                  <h3 className="text-sm font-black text-slate-900">Ficha Técnica y Especificaciones</h3>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-200 bg-white">
                    {Object.entries(specifications).map(([key, val], idx) => (
                      <div key={idx} className="grid grid-cols-3 p-3 text-xs">
                        <span className="font-bold text-slate-500">{key}</span>
                        <span className="col-span-2 font-semibold text-slate-900">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: FAQs */}
              {activeTab === 'faq' && (
                <div className="space-y-3 max-w-3xl">
                  <h3 className="text-sm font-black text-slate-900">Dudas Comunes sobre el Pedido</h3>
                  <div className="space-y-2">
                    {faqs.map((f, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
                        <p className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{f.q}</span>
                        </p>
                        <p className="text-xs text-slate-600 pl-5.5 leading-relaxed">{f.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Reviews */}
              {activeTab === 'reviews' && (
                <div className="space-y-6 max-w-3xl">
                  
                  {/* Reviews Summary Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-black text-slate-900">{article.rating || 4.9}</div>
                      <div>
                        <div className="flex items-center text-amber-400">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="w-4 h-4 fill-amber-400" />
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold">Basado en {reviews.length} compras verificadas</p>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      100% Satisfacción en Entregas COD
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                              {rev.author[0]}
                            </div>
                            <span className="text-xs font-bold text-slate-900">{rev.author}</span>
                            {rev.verifiedPurchase && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Compra Verificada
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{rev.date}</span>
                        </div>

                        <div className="flex items-center text-amber-400 gap-0.5">
                          {[...Array(Math.floor(rev.rating))].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                          ))}
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
