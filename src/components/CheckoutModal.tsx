import React, { useState } from 'react';
import { Article, CartItem, Delivery, PaymentMethod, BankAccount } from '../types';
import { RD_PROVINCES } from '../data/rdProvinces';
import { SANPI_FLAT_SHIPPING_FEE } from '../lib/firebase';
import { sanpiManager } from '../lib/storeManager';
import { DEFAULT_BANK_ACCOUNTS } from '../data/siteThemePresets';
import { speakSanpi } from '../lib/audioTTS';
import confetti from 'canvas-confetti';
import {
  X,
  ShoppingBag,
  Truck,
  MapPin,
  CheckCircle2,
  Volume2,
  Trash2,
  Building2,
  Banknote,
  ShieldCheck,
  Copy,
  Check,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  FileCheck
} from 'lucide-react';
import { copyToClipboardSafe } from '../lib/clipboard';

interface CheckoutModalProps {
  cart: CartItem[];
  onClose: () => void;
  onClearCart: () => void;
  onRemoveFromCart: (articleId: string) => void;
  onUpdateQuantity: (articleId: string, quantity: number) => void;
  onOrderSuccess: (delivery: Delivery) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cart,
  onClose,
  onClearCart,
  onRemoveFromCart,
  onUpdateQuantity,
  onOrderSuccess
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('Distrito Nacional');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  // Payment Method: 'COD' | 'transferencia'
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');

  // Dynamic Bank Accounts from Super Admin Configuration
  const availableBanks: BankAccount[] = sanpiManager.getActiveBankAccounts().length > 0
    ? sanpiManager.getActiveBankAccounts()
    : DEFAULT_BANK_ACCOUNTS;

  const [selectedBankId, setSelectedBankId] = useState<string>(
    availableBanks[0]?.id || 'bank-bpd-1'
  );
  const [transferRef, setTransferRef] = useState('');
  const [copiedBankInfo, setCopiedBankInfo] = useState<string | null>(null);

  // Bank Transfer Receipt Upload
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [createdDelivery, setCreatedDelivery] = useState<Delivery | null>(null);

  const selectedBankObject = availableBanks.find(b => b.id === selectedBankId) || availableBanks[0];

  const baseTotal = cart.reduce((acc, item) => acc + (item.article.price * item.quantity), 0);
  const shippingTotal = cart.length > 0 ? SANPI_FLAT_SHIPPING_FEE : 0;
  const grandTotal = baseTotal + shippingTotal;

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
      setReceiptUploadError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP o captura de pantalla).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setReceiptUploadError('La foto del comprobante es demasiado grande (máximo 5 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setReceiptDataUrl(result);
    };
    reader.onerror = () => {
      setReceiptUploadError('Error al procesar la imagen del comprobante.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName || !customerPhone || !address || !city) {
      alert('Por favor completa todos los campos requeridos para la dirección de envío.');
      return;
    }

    if (paymentMethod === 'transferencia') {
      if (!receiptDataUrl) {
        setReceiptUploadError('Es obligatorio subir la foto o comprobante de tu transferencia para procesar la orden.');
        alert('Debes adjuntar la foto del comprobante de transferencia bancaria antes de confirmar.');
        return;
      }
    }

    setLoading(true);

    try {
      const firstItem = cart[0];

      const { delivery } = await sanpiManager.createCodOrder({
        article: firstItem.article,
        quantity: firstItem.quantity,
        customerName,
        customerPhone,
        customerEmail: customerEmail || 'cliente@sanpimarket.do',
        province: selectedProvince,
        city,
        municipality: city,
        address,
        notes,
        paymentMethod,
        bankName: paymentMethod === 'transferencia' ? selectedBankObject?.bankName : undefined,
        selectedBankAccountId: paymentMethod === 'transferencia' ? selectedBankObject?.id : undefined,
        transferReference: paymentMethod === 'transferencia' ? (transferRef.trim() || 'Comprobante Adjunto') : undefined,
        transferReceiptUrl: paymentMethod === 'transferencia' ? receiptDataUrl : undefined
      });

      setCreatedDelivery(delivery);

      // Trigger Confetti Celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7c3aed', '#6d28d9', '#10b981', '#ffffff']
      });

      // Clear Cart
      onClearCart();
      onOrderSuccess(delivery);
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Hubo un error registrando la orden. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-purple-100 relative max-h-[94vh] flex flex-col my-auto">
        
        {/* Header with Purple Brand Contrast */}
        <div className="bg-purple-700 text-white p-5 sm:p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-purple-700 flex items-center justify-center shrink-0 font-extrabold shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">Finalizar Compra</h2>
              <p className="text-xs text-purple-100">Flete Fijo RD$ 350 a 32 Provincias • Despacho Oficial Sacha Pack</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-purple-800 hover:bg-purple-900 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6 bg-white">

          {/* Success Screen */}
          {createdDelivery ? (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center mx-auto border-2 border-purple-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-800 font-bold px-3.5 py-1 rounded-full text-xs border border-purple-200">
                  <Volume2 className="w-3.5 h-3.5 text-purple-700" />
                  Alerta "Sanpi" Disparada
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">¡Orden Registrada Exitosamente!</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {createdDelivery.paymentMethod === 'COD' || createdDelivery.paymentMethod === 'contra entrega'
                    ? 'Tu orden ha sido registrada para despacho vía Sacha Pack Logistics. Pagarás en efectivo al mensajero cuando recibas tu paquete.'
                    : 'Transferencia bancaria registrada. Tu pedido será despachado tras la verificación del comprobante.'}
                </p>
              </div>

              {/* Guía Box */}
              <div className="bg-purple-50/50 text-slate-900 p-5 sm:p-6 rounded-2xl space-y-4 text-left border-2 border-purple-200">
                <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                  <div>
                    <span className="text-[10px] text-purple-900 uppercase font-bold block">Número de Guía de Envío</span>
                    <span className="text-xl font-black text-purple-950 tracking-wider font-mono">{createdDelivery.trackingNumber}</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-md text-xs font-extrabold uppercase">
                    {(createdDelivery.status || 'pendiente').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Cliente:</span>
                    <span className="font-bold text-slate-900">{createdDelivery.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Destino:</span>
                    <span className="font-bold text-slate-900">{createdDelivery.city}, {createdDelivery.province}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Producto:</span>
                    <span className="font-bold text-slate-900 truncate block">{createdDelivery.articleName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Método de Pago:</span>
                    <span className="font-bold text-purple-900 uppercase">
                      {createdDelivery.paymentMethod === 'transferencia'
                        ? `Transferencia (${createdDelivery.bankName || 'Popular'})`
                        : 'Efectivo Contra Entrega (COD)'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-purple-200 flex items-center justify-between">
                  <span className="text-xs text-slate-700 font-bold">Total a Pagar:</span>
                  <span className="text-xl font-black text-purple-700">RD$ {createdDelivery.totalCodAmount.toLocaleString()}</span>
                </div>

                <div className="pt-3 border-t border-purple-200 flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-purple-700 shrink-0" />
                    <div>
                      <span className="text-slate-900 font-bold block">Despacho Oficial Sacha Pack Logistics RD</span>
                      <span className="text-slate-500 font-mono text-[10px]">Tracking ID: {createdDelivery.trackingNumber}</span>
                    </div>
                  </div>
                  <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                    Webhook 200 OK
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => speakSanpi()}
                  className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 border border-purple-200 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-purple-700" />
                  <span>Repetir Alerta "Sanpi"</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>Continuar Comprando</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Summary List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Resumen del Pedido ({cart.length} ítems)</span>
                  </h3>
                  <span className="text-xs text-purple-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Garantía Oficial Sanpi RD
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500">El carrito está vacío.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.article.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <img src={item.article.image || (item.article.images && item.article.images[0])} alt={item.article.name} className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200" />
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{item.article.name || item.article.title}</h4>
                            <p className="text-[11px] text-slate-500">{item.article.storeName} • RD$ {item.article.price.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-slate-300 rounded-lg bg-white text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.article.id, Math.max(1, item.quantity - 1))}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2 text-slate-900">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.article.id, item.quantity + 1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveFromCart(item.article.id)}
                            className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                            title="Eliminar ítem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-purple-50/50 rounded-xl p-4 space-y-2 text-xs border border-purple-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Productos:</span>
                  <span className="font-bold text-slate-900">RD$ {baseTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-purple-700" /> Flete Nacional Sacha Pack (32 Provincias):</span>
                  <span className="font-bold text-purple-700">+ RD$ {shippingTotal.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-purple-200 flex justify-between font-extrabold text-sm text-slate-900">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-base text-purple-700 font-extrabold">RD$ {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Delivery & Payment Form */}
              <form onSubmit={handleSubmitOrder} className="space-y-6 pt-2">
                
                {/* 1. SELECCIÓN DE MÉTODO DE PAGO */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-purple-700" />
                      <span>Método de Pago *</span>
                    </h3>
                    <span className="text-[11px] text-purple-800 font-bold bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                      100% Seguro
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Method 1: COD */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-3.5 rounded-xl text-left border-2 transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        paymentMethod === 'COD' || paymentMethod === 'contra entrega'
                          ? 'border-purple-600 bg-purple-700 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">Pago Contra Entrega</span>
                        {(paymentMethod === 'COD' || paymentMethod === 'contra entrega') && (
                          <CheckCircle2 className="w-4 h-4 text-amber-300" />
                        )}
                      </div>
                      <span className={`text-[11px] leading-tight ${paymentMethod === 'COD' ? 'text-purple-100' : 'text-slate-500'}`}>
                        Pagas en efectivo al recibir tu paquete
                      </span>
                    </button>

                    {/* Method 2: Transferencia Bancaria */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`p-3.5 rounded-xl text-left border-2 transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        paymentMethod === 'transferencia'
                          ? 'border-purple-600 bg-purple-700 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">Transferencia Bancaria</span>
                        {paymentMethod === 'transferencia' && (
                          <CheckCircle2 className="w-4 h-4 text-amber-300" />
                        )}
                      </div>
                      <span className={`text-[11px] leading-tight ${paymentMethod === 'transferencia' ? 'text-purple-100' : 'text-slate-500'}`}>
                        Popular, BHD, Banreservas
                      </span>
                    </button>
                  </div>

                  {paymentMethod === 'transferencia' && (
                    <div className="bg-purple-50/70 border-2 border-purple-200 p-4 sm:p-5 rounded-2xl space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                          <Building2 className="w-4 h-4 text-purple-700" /> Cuentas Bancarias Oficiales (RD)
                        </h4>
                        <span className="text-[10px] text-purple-900 bg-purple-100 font-bold px-2 py-0.5 rounded-full">
                          Selecciona una cuenta
                        </span>
                      </div>

                      {/* Bank cards */}
                      <div className="space-y-2.5">
                        {availableBanks.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBankId(b.id)}
                            className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              selectedBankId === b.id
                                ? 'bg-white border-purple-600 ring-2 ring-purple-600/20 shadow-sm'
                                : 'bg-white/80 border-slate-200 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-900 text-xs">{b.bankName}</span>
                                  <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 font-bold px-1.5 py-0.2 rounded">
                                    {b.accountType === 'corriente' ? 'Cta. Corriente' : 'Cta. Ahorros'} • {b.currency || 'DOP'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600">
                                  Titular: <strong className="text-slate-900">{b.accountHolder}</strong>
                                  {b.rncOrCedula && (
                                    <span className="text-slate-500 ml-1.5">({b.rncOrCedula})</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-700 flex items-center gap-1.5">
                                  <span>No. de Cuenta:</span>
                                  <span className="font-mono font-black text-purple-900 text-xs bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">{b.accountNumber}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyAccount(b.accountNumber, b.bankName);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold text-purple-900 flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                              >
                                {copiedBankInfo === b.bankName ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-purple-700" />
                                    <span>Copiar No.</span>
                                  </>
                                )}
                              </button>
                            </div>
                            {b.notes && (
                              <p className="text-[10px] text-slate-500 italic mt-1.5 pt-1.5 border-t border-slate-100">
                                💡 {b.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Photo / Receipt Upload Requirement (OBLIGATORIO) */}
                      <div className="pt-2 border-t border-purple-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-purple-700" />
                            <span>Foto del Comprobante de Transferencia *</span>
                          </label>
                          <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            Requerido
                          </span>
                        </div>

                        {!receiptDataUrl ? (
                          <div className="relative border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-xl p-4 bg-white text-center cursor-pointer transition-all group">
                            <input
                              type="file"
                              accept="image/*"
                              required={paymentMethod === 'transferencia'}
                              onChange={handleReceiptUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center justify-center gap-1.5 text-slate-600 group-hover:text-purple-700">
                              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-bold text-slate-800">
                                Haz clic aquí para adjuntar foto o captura de la transferencia
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Formatos admitidos: JPG, PNG, WebP (Máximo 5MB)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <img
                                src={receiptDataUrl}
                                alt="Comprobante de pago"
                                className="w-12 h-12 rounded-lg object-cover border border-emerald-400 bg-white shrink-0"
                              />
                              <div className="truncate">
                                <div className="flex items-center gap-1 text-xs font-black text-emerald-900">
                                  <FileCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                                  <span>¡Comprobante Adjuntado Correctamente!</span>
                                </div>
                                <span className="text-[10px] text-emerald-700 truncate block">
                                  La imagen se registrará con tu orden para validación.
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setReceiptDataUrl('')}
                              className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold shrink-0 cursor-pointer transition-colors"
                            >
                              Cambiar Foto
                            </button>
                          </div>
                        )}

                        {receiptUploadError && (
                          <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{receiptUploadError}</span>
                          </p>
                        )}
                      </div>

                      {/* Reference Input (Optional helper) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Número de Comprobante / No. Aprobación (Opcional si ya subiste foto)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: BHD-9021849 o No. de Autorización"
                          value={transferRef}
                          onChange={(e) => setTransferRef(e.target.value)}
                          className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 font-medium"
                        />
                      </div>
                    </div>
                  )}

                </div>

                {/* 2. DATOS DE ENVÍO */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-purple-700" />
                    <span>Datos de Envío y Entrega (República Dominicana)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Juan Pérez"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono (WhatsApp) *</label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej: 809-555-0000"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico (Opcional)</label>
                      <input
                        type="email"
                        placeholder="Ej: juan@ejemplo.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Provincia de Destino *</label>
                      <select
                        value={selectedProvince}
                        onChange={(e) => setSelectedProvince(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all cursor-pointer"
                      >
                        {RD_PROVINCES.map((prov) => (
                          <option key={prov.id} value={prov.name}>
                            {prov.name} ({prov.region})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad / Municipio / Sector *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Santo Domingo Este / Santiago / Los Minas / Piantini"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dirección Exacta de Entrega *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Calle Principal #10, Residencial Las Palmeras, Apto 3B"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notas para el Mensajero (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: Llamar antes de llegar, dejar con seguridad"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs">
                  <div className="flex items-center gap-2 text-purple-950 font-semibold">
                    <Truck className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>Manejado y despachado por logística de Sacha Pack</span>
                  </div>
                  <span className="text-[10px] bg-white text-purple-900 border border-purple-200 font-mono px-2 py-0.5 rounded font-bold">API Webhook</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || cart.length === 0}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  {loading
                    ? 'Procesando Pedido...'
                    : paymentMethod === 'COD' || paymentMethod === 'contra entrega'
                    ? `Confirmar Pedido COD • RD$ ${grandTotal.toLocaleString()}`
                    : `Confirmar Transferencia • RD$ ${grandTotal.toLocaleString()}`}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
