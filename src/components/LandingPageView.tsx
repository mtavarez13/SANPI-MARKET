import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  Flame,
  Star,
  MapPin,
  Phone,
  User,
  Share2,
  ArrowLeft,
  ShoppingBag,
  Heart,
  Volume2,
  PhoneCall,
  Zap,
  Award,
  Building2,
  Banknote,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { LandingPageConfig, Article, Delivery, PaymentMethod, BankAccount } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { SANPI_FLAT_SHIPPING_FEE, DOMINICAN_PROVINCES } from '../lib/firebase';
import { DEFAULT_BANK_ACCOUNTS } from '../data/siteThemePresets';
import { speakSanpi } from '../lib/audioTTS';
import { copyToClipboardSafe } from '../lib/clipboard';

interface LandingPageViewProps {
  slug: string;
  onBack: () => void;
  onOrderSuccess?: (delivery: Delivery) => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  slug,
  onBack,
  onOrderSuccess
}) => {
  const [landingPage, setLandingPage] = useState<LandingPageConfig | undefined>(() =>
    sanpiManager.getLandingPageBySlug(slug)
  );
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState({ minutes: 34, seconds: 18 });
  const [recentBuyerCity, setRecentBuyerCity] = useState('Santo Domingo');

  // Checkout Form State
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [province, setProvince] = useState(DOMINICAN_PROVINCES[0]);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');

  // Dynamic Bank Accounts & Transfer Receipt
  const availableBanks: BankAccount[] = sanpiManager.getActiveBankAccounts().length > 0
    ? sanpiManager.getActiveBankAccounts()
    : DEFAULT_BANK_ACCOUNTS;

  const [selectedBankId, setSelectedBankId] = useState<string>(
    availableBanks[0]?.id || 'bank-bpd-1'
  );
  const [transferRef, setTransferRef] = useState('');
  const [copiedBankInfo, setCopiedBankInfo] = useState<string | null>(null);

  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState<Delivery | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const selectedBankObject = availableBanks.find(b => b.id === selectedBankId) || availableBanks[0];

  // Sync and track views
  useEffect(() => {
    const lp = sanpiManager.getLandingPageBySlug(slug);
    if (lp) {
      setLandingPage(lp);
      setSelectedImage(lp.productImage);
      sanpiManager.incrementLandingPageViews(slug);
    }
  }, [slug]);

  // Urgency Timer Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        } else {
          return { minutes: 45, seconds: 0 };
        }
      });
    }, 1000);

    // Dynamic Social Proof Toast Rotation
    const cities = ['Santo Domingo Este', 'Santiago', 'La Vega', 'Punta Cana', 'Puerto Plata', 'San Cristóbal', 'Distrito Nacional'];
    const socialInterval = setInterval(() => {
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      setRecentBuyerCity(randomCity);
    }, 8000);

    return () => {
      clearInterval(timer);
      clearInterval(socialInterval);
    };
  }, []);

  if (!landingPage) {
    return (
      <div className="min-h-[70vh] bg-white flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 border border-purple-100">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Landing Page no encontrada</h2>
        <p className="text-slate-600 max-w-md mb-6 text-sm">
          El enlace de la landing page <code className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-mono">/lp/{slug}</code> no existe o fue deshabilitada por su creador.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold transition-all flex items-center gap-2 text-xs shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Marketplace
        </button>
      </div>
    );
  }

  const product = sanpiManager.articles.find(a => a.id === landingPage.productId);
  const unitPrice = landingPage.customSellingPrice;
  const subtotal = unitPrice * quantity;
  const shippingFee = SANPI_FLAT_SHIPPING_FEE;
  const total = subtotal + shippingFee;

  const handleShare = async () => {
    const url = window.location.href;
    await copyToClipboardSafe(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyAccount = async (accountNum: string, bankLabel: string) => {
    await copyToClipboardSafe(accountNum);
    setCopiedBankInfo(bankLabel);
    setTimeout(() => setCopiedBankInfo(null), 2500);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setReceiptUploadError('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setReceiptUploadError('El archivo es demasiado grande (máx 5MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !province || !city || !address) {
      alert('Por favor completa todos los campos requeridos para coordinar la entrega con Sacha Pack.');
      return;
    }

    if (paymentMethod === 'transferencia' && !receiptDataUrl) {
      setReceiptUploadError('Es obligatorio subir la foto o comprobante de la transferencia.');
      alert('Debes adjuntar la foto del comprobante de transferencia bancaria antes de confirmar.');
      return;
    }

    setLoading(true);
    try {
      const artToOrder: Article = product || {
        id: landingPage.productId,
        storeId: landingPage.originalStoreId,
        storeName: landingPage.ownerName,
        name: landingPage.productName,
        title: landingPage.productName,
        slug: landingPage.slug,
        description: landingPage.heroSubheadline,
        category: 'Dropshipping',
        price: landingPage.customSellingPrice,
        wholesalePrice: landingPage.wholesalePrice,
        compareAtPrice: Math.round(landingPage.customSellingPrice * 1.3),
        image: landingPage.productImage,
        images: landingPage.galleryImages || [landingPage.productImage],
        gallery: landingPage.galleryImages || [landingPage.productImage],
        status: 'aprobado',
        isPublic: true,
        isDropshipping: true,
        views: landingPage.views,
        rating: 4.9,
        stock: landingPage.stockCount || 10,
        inventory: landingPage.stockCount || 10,
        variants: [],
        specifications: {},
        reviews: [],
        reviewCount: 1,
        createdAt: new Date().toISOString()
      };

      const res = await sanpiManager.createCodOrder({
        article: artToOrder,
        quantity,
        customerName,
        customerPhone,
        customerEmail: customerEmail || 'cliente@sanpimarket.do',
        province,
        city,
        municipality: city,
        address,
        notes,
        paymentMethod,
        bankName: paymentMethod === 'transferencia' ? selectedBankObject?.bankName : undefined,
        selectedBankAccountId: paymentMethod === 'transferencia' ? selectedBankObject?.id : undefined,
        transferReference: paymentMethod === 'transferencia' ? (transferRef.trim() || 'Comprobante Adjunto') : undefined,
        transferReceiptUrl: paymentMethod === 'transferencia' ? receiptDataUrl : undefined,
        sourceType: 'landing_page',
        landingPageSlug: landingPage.slug,
        dropshipperId: landingPage.ownerId,
        dropshipperName: landingPage.ownerName,
        customUnitPrice: landingPage.customSellingPrice
      });

      setOrderComplete(res.delivery);
      if (onOrderSuccess) {
        onOrderSuccess(res.delivery);
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Hubo un error al procesar el pedido. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      
      {/* 1. Top Urgency Sticky Bar with Purple Brand Gradient */}
      <div className="sticky top-0 z-30 bg-purple-700 py-2.5 px-4 text-white text-xs font-semibold shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-300 animate-bounce shrink-0" />
            <span className="text-xs">
              ¡OFERTA FLASH EN RD! Quedan solo <strong className="text-amber-200 underline font-bold">{landingPage.stockCount || 12} unidades</strong> en inventario.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-purple-900/60 px-3 py-1 rounded-full border border-purple-400/30 font-mono text-[12px] font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>
                Termina en {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
            
            <button
              onClick={handleShare}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              {copiedLink ? '¡Enlace Copiado!' : 'Compartir'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Top Action */}
      <div className="max-w-6xl mx-auto px-4 pt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-purple-700 bg-slate-50 hover:bg-purple-50 px-4 py-2 rounded-xl border border-slate-200 hover:border-purple-200 transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-purple-700" /> Volver al Marketplace
        </button>

        {/* Dropshipper / Merchant Attribution Tag */}
        <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl text-xs">
          <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
          <span className="text-purple-800 font-medium">Tienda oficial de:</span>
          <strong className="text-purple-950 font-bold">{landingPage.ownerName}</strong>
        </div>
      </div>

      {/* Main Product Hero Presentation */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Left Column: Visual Gallery & Social Proof (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Featured Photo with Badges */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-50 border-2 border-purple-100 shadow-sm group">
              <img
                src={selectedImage || landingPage.productImage}
                alt={landingPage.title}
                className="w-full h-[380px] sm:h-[480px] object-cover object-center group-hover:scale-105 transition-transform duration-500 bg-white"
              />

              {/* Verified COD Badge */}
              <div className="absolute top-4 left-4 bg-purple-700/95 backdrop-blur-xs text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-md border border-purple-400/40 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-300" />
                <span>PAGA AL RECIBIR EN EFECTIVO (COD)</span>
              </div>

              {/* Discount Percentage Pill */}
              {landingPage.originalComparePrice && landingPage.originalComparePrice > landingPage.customSellingPrice && (
                <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-md border border-red-400/40">
                  AHORRA RD$ {(landingPage.originalComparePrice - landingPage.customSellingPrice).toLocaleString()}
                </div>
              )}

              {/* Bottom Real-time Social Proof Banner */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xs rounded-2xl p-3 border border-purple-100 shadow-md flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">
                      Un cliente en <span className="text-purple-700 font-extrabold">{recentBuyerCity}</span> acaba de ordenar
                    </p>
                    <p className="text-[10px] text-slate-500">Despacho oficial vía Sacha Pack Logistics RD</p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </div>

            {/* Gallery Thumbnails */}
            {landingPage.galleryImages && landingPage.galleryImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {landingPage.galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                      selectedImage === img
                        ? 'border-purple-600 shadow-md scale-105'
                        : 'border-slate-200 hover:border-purple-300 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover bg-slate-50" />
                  </button>
                ))}
              </div>
            )}

            {/* Features Highlight Bento Grid */}
            <div className="bg-white border-2 border-purple-100 rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                <Zap className="w-4 h-4 text-purple-600" />
                <span>¿Por qué este producto es el más vendido?</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {landingPage.features.map((feat, i) => (
                  <div key={i} className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-1.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold mb-2">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{feat.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dominican Testimonials */}
            {landingPage.testimonials && landingPage.testimonials.length > 0 && (
              <div className="bg-white border-2 border-purple-100 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    <span>Opiniones Reales de Clientes en República Dominicana</span>
                  </div>
                  <span className="text-xs text-purple-700 font-bold">4.9 / 5.0 (Ventas Verificadas)</span>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1">
                  {landingPage.testimonials.map((test) => (
                    <div key={test.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex gap-3.5 items-start">
                      <img
                        src={test.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                        alt={test.name}
                        className="w-10 h-10 rounded-full object-cover border border-purple-200 shrink-0"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{test.name}</span>
                            <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                              Comprador Verificado
                            </span>
                          </div>
                          <div className="flex text-amber-500">
                            {[...Array(test.rating)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-current" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed italic">"{test.comment}"</p>
                        <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-600" /> {test.city}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Sacha Pack Endorsement on Landing Page */}
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-purple-700 shrink-0" />
                <div>
                  <span className="font-bold text-purple-950 block">Despachado y Garantizado por Sacha Pack</span>
                  <span className="text-slate-600 text-[11px]">Entrega rápida a las 32 provincias de República Dominicana</span>
                </div>
              </div>
              <span className="bg-white text-purple-800 border border-purple-200 font-bold px-2.5 py-1 rounded-lg text-[10px]">
                RD$ 350 COD Fijo
              </span>
            </div>

          </div>

          {/* Right Column: High-Converting Sticky COD Checkout Form (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-16 bg-white border-2 border-purple-600 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
              
              {/* Headline & Pricing Summary */}
              <div className="space-y-2 pb-4 border-b border-purple-100">
                <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-lg tracking-wider">
                  Envío Seguro a Todo el País
                </span>
                
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  {landingPage.heroHeadline || landingPage.title}
                </h1>
                
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {landingPage.heroSubheadline}
                </p>

                {/* Price Display */}
                <div className="flex items-baseline gap-3 pt-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-purple-700 tracking-tight">
                    RD$ {landingPage.customSellingPrice.toLocaleString()}
                  </span>
                  {landingPage.originalComparePrice && (
                    <span className="text-base text-slate-400 line-through font-semibold">
                      RD$ {landingPage.originalComparePrice.toLocaleString()}
                    </span>
                  )}
                  <span className="text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                    + RD$ 350 flete fijo COD
                  </span>
                </div>
              </div>

              {orderComplete ? (
                /* Success Confirmation State */
                <div className="bg-purple-50 border-2 border-purple-200 p-6 rounded-2xl text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto border border-purple-200">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-slate-900">¡Pedido Confirmado con Éxito!</h3>
                    <p className="text-xs text-slate-600">
                      Tu número de guía oficial de seguimiento es:
                    </p>
                    <p className="text-lg font-mono font-black text-purple-900 bg-white py-1.5 px-3 rounded-xl border border-purple-300 inline-block shadow-2xs">
                      {orderComplete.trackingNumber}
                    </p>
                  </div>
                  <div className="text-xs text-slate-700 space-y-1.5 bg-white p-3.5 rounded-xl border border-purple-200 text-left">
                    <p><strong>Cliente:</strong> {orderComplete.customerName}</p>
                    <p><strong>Destino:</strong> {orderComplete.city}, {orderComplete.province}</p>
                    <p><strong>Método de Pago:</strong> {orderComplete.paymentMethod === 'transferencia' ? `Transferencia Bancaria (${orderComplete.bankName || 'Popular'})` : 'Contra Entrega en Efectivo (COD)'}</p>
                    <p><strong>Total a Pagar:</strong> <span className="text-purple-700 font-extrabold text-sm">RD$ {orderComplete.totalCodAmount.toLocaleString()}</span></p>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Un asesor de <strong>Sacha Pack</strong> se comunicará al <strong>{orderComplete.customerPhone}</strong> para coordinar la entrega.
                  </p>
                  <button
                    onClick={() => setOrderComplete(null)}
                    className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Realizar Otro Pedido
                  </button>
                </div>
              ) : (
                /* Fast Checkout Form with Multi-Payment Selection */
                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  
                  {/* Quantity Selector */}
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Cantidad a Comprar:</span>
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-purple-200">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="text-slate-600 hover:text-purple-700 font-bold text-sm px-1 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-slate-900 text-sm">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="text-slate-600 hover:text-purple-700 font-bold text-sm px-1 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Customer Info Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-700" /> Nombre Completo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-purple-700" /> Teléfono / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej. 809-555-0123"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-purple-700" /> Provincia *
                        </label>
                        <select
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-semibold cursor-pointer"
                        >
                          {DOMINICAN_PROVINCES.map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Municipio / Sector *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Bella Vista, Naco..."
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Dirección de Entrega Exacta *</label>
                      <input
                        type="text"
                        required
                        placeholder="Calle, número de casa o apartamento, punto de referencia..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Notas de Entrega (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej. Entregar después de las 2:00 PM..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2 pt-2 border-t border-purple-100">
                    <label className="block text-xs font-bold text-slate-800">Método de Pago *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          paymentMethod === 'COD' || paymentMethod === 'contra entrega'
                            ? 'bg-purple-700 border-purple-700 text-white font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">Pago Contra Entrega</span>
                          {(paymentMethod === 'COD' || paymentMethod === 'contra entrega') && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                          )}
                        </div>
                        <span className={`text-[10px] block mt-1 ${paymentMethod === 'COD' ? 'text-purple-100' : 'text-slate-500'}`}>
                          Efectivo al recibir
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transferencia')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          paymentMethod === 'transferencia'
                            ? 'bg-purple-700 border-purple-700 text-white font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">Transferencia</span>
                          {paymentMethod === 'transferencia' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                          )}
                        </div>
                        <span className={`text-[10px] block mt-1 ${paymentMethod === 'transferencia' ? 'text-purple-100' : 'text-slate-500'}`}>
                          Popular / BHD
                        </span>
                      </button>
                    </div>

                    {paymentMethod === 'transferencia' && (
                      <div className="bg-purple-50/80 border-2 border-purple-200 p-4 rounded-2xl space-y-3.5 mt-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                            <Building2 className="w-4 h-4 text-purple-700" /> Cuentas para Transferir
                          </span>
                          <span className="text-[10px] text-purple-800 bg-purple-100 font-bold px-2 py-0.5 rounded-full">
                            Elige una cuenta
                          </span>
                        </div>

                        <div className="space-y-2">
                          {availableBanks.map((b) => (
                            <div
                              key={b.id}
                              onClick={() => setSelectedBankId(b.id)}
                              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                selectedBankId === b.id
                                  ? 'bg-white border-purple-600 ring-2 ring-purple-600/20 font-bold shadow-xs'
                                  : 'bg-white/80 border-slate-200 text-slate-700 hover:border-purple-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-900 text-xs">{b.bankName}</span>
                                    <span className="text-[10px] bg-purple-50 text-purple-800 font-bold px-1.5 rounded">
                                      {b.accountType === 'corriente' ? 'Corriente' : 'Ahorros'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-600">
                                    Titular: <strong className="text-slate-900">{b.accountHolder}</strong>
                                  </div>
                                  <div className="text-[11px] text-purple-900 font-mono">
                                    No: <strong>{b.accountNumber}</strong>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyAccount(b.accountNumber, b.bankName);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 text-[10px] font-bold border border-purple-200"
                                >
                                  {copiedBankInfo === b.bankName ? '¡Copiado!' : 'Copiar'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* File upload for receipt */}
                        <div className="pt-2 border-t border-purple-200 space-y-1.5">
                          <label className="block text-[11px] font-black text-slate-900 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5 text-purple-700" />
                              Foto del Comprobante de Transferencia *
                            </span>
                            <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              Obligatorio
                            </span>
                          </label>

                          {!receiptDataUrl ? (
                            <div className="relative border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-xl p-3 bg-white text-center cursor-pointer transition-all">
                              <input
                                type="file"
                                accept="image/*"
                                required={paymentMethod === 'transferencia'}
                                onChange={handleReceiptUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="flex flex-col items-center justify-center gap-1 text-slate-600">
                                <ImageIcon className="w-5 h-5 text-purple-600" />
                                <span className="text-xs font-bold text-slate-800">
                                  Toca aquí para subir captura o foto del pago
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <img
                                  src={receiptDataUrl}
                                  alt="Comprobante"
                                  className="w-10 h-10 rounded-lg object-cover border border-emerald-400 shrink-0"
                                />
                                <div className="truncate">
                                  <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                                    <FileCheck className="w-3.5 h-3.5 text-emerald-700" /> Comprobante Listo
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setReceiptDataUrl('')}
                                className="px-2 py-0.5 rounded bg-white text-rose-600 border border-rose-200 text-[10px] font-bold"
                              >
                                Cambiar
                              </button>
                            </div>
                          )}

                          {receiptUploadError && (
                            <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {receiptUploadError}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">No. de Comprobante / Referencia (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Ej. BHD-819238"
                            value={transferRef}
                            onChange={(e) => setTransferRef(e.target.value)}
                            className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Summary Box */}
                  <div className="bg-purple-50/70 rounded-2xl p-4 border border-purple-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal ({quantity} {quantity === 1 ? 'unidad' : 'unidades'}):</span>
                      <span className="font-bold text-slate-900">RD$ {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Flete Nacional Fijo Sacha Pack:</span>
                      <span className="font-bold text-purple-700">+ RD$ {shippingFee.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-purple-200 flex justify-between items-baseline">
                      <span className="font-extrabold text-sm text-slate-900">TOTAL A PAGAR:</span>
                      <span className="font-extrabold text-xl text-purple-700">RD$ {total.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-extrabold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transform active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Truck className="w-5 h-5" />
                    {loading
                      ? 'PROCESANDO ORDEN...'
                      : paymentMethod === 'COD' || paymentMethod === 'contra entrega'
                      ? '¡COMPRAR AHORA Y PAGAR AL RECIBIR!'
                      : '¡CONFIRMAR TRANSFERENCIA BANCARIA!'}
                  </button>

                  {/* WhatsApp Secondary Fast Action */}
                  {landingPage.whatsappNumber && (
                    <a
                      href={`https://wa.me/${landingPage.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola! Quiero ordenar ${quantity}x ${landingPage.productName} con pago contra entrega COD por RD$ ${total.toLocaleString()}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <PhoneCall className="w-4 h-4 text-emerald-600" />
                      Ordenar Rápido por WhatsApp ({landingPage.whatsappNumber})
                    </a>
                  )}

                  {/* Guarantees List */}
                  <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Garantía Oficial
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-purple-700" /> 100% Original
                    </span>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
