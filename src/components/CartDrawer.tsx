import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Truck, Package, Check } from 'lucide-react';
import { CartItem } from '../types';
import { SANPI_FLAT_SHIPPING_FEE } from '../lib/firebase';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (articleId: string, quantity: number) => void;
  onRemoveFromCart: (articleId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveFromCart,
  onProceedToCheckout
}) => {
  const subtotal = cart.reduce((acc, item) => acc + item.article.price * item.quantity, 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const shippingFee = cart.length > 0 ? SANPI_FLAT_SHIPPING_FEE : 0;
  const total = subtotal + shippingFee;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Tu Carrito de Compra</h2>
                    <p className="text-xs text-slate-500">{totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Delivery info banner */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Envío Express a 32 Provincias</span>
                </div>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                  Flete RD$ 350 COD
                </span>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-bold text-slate-900">Tu carrito está vacío</p>
                      <p className="text-xs text-slate-500 max-w-xs">
                        Explora nuestro catálogo y agrega productos con pago contra entrega en todo el país.
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      Ver Productos Populares
                    </button>
                  </div>
                ) : (
                  cart.map((item) => {
                    const price = item.article.price;
                    const originalPrice = item.article.compareAtPrice;
                    return (
                      <div
                        key={item.article.id}
                        className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all flex gap-4 relative group"
                      >
                        <img
                          src={item.article.imageUrl || item.article.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                          alt={item.article.title || item.article.name}
                          className="w-20 h-20 rounded-lg object-cover bg-slate-50 border border-slate-100 shrink-0"
                        />

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="space-y-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-xs font-bold text-slate-900 truncate leading-snug">
                                {item.article.title || item.article.name}
                              </h3>
                              <button
                                onClick={() => onRemoveFromCart(item.article.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                                title="Eliminar artículo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              Tienda: {item.article.storeName || 'Sanpi Store'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 mt-1">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-extrabold text-slate-900">
                                RD$ {(price * item.quantity).toLocaleString()}
                              </span>
                              {originalPrice && originalPrice > price && (
                                <span className="text-[10px] line-through text-slate-400">
                                  RD$ {(originalPrice * item.quantity).toLocaleString()}
                                </span>
                              )}
                            </div>

                            {/* Quantity Selector */}
                            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                              <button
                                onClick={() => onUpdateQuantity(item.article.id, Math.max(1, item.quantity - 1))}
                                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-xs font-bold text-slate-800">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(item.article.id, item.quantity + 1)}
                                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer & Checkout Action */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-200/80 bg-slate-50 space-y-4">
                  
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal de productos</span>
                      <span className="font-semibold text-slate-900">RD$ {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flete Fijo Sacha Pack (Nacional)</span>
                      <span className="font-semibold text-slate-900">RD$ {shippingFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total a Pagar (al recibir)</span>
                      <span className="text-base text-slate-900">RD$ {total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pagas 100% en efectivo cuando te entreguen en tu dirección</span>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onProceedToCheckout();
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>Completar Orden Contra Entrega</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
