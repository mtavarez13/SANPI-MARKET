import React, { useState } from 'react';
import { ShoppingBag, Store, Sparkles, Truck, DollarSign, ShieldCheck, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

interface HowItWorksSectionProps {
  onStartAsBuyer?: () => void;
  onStartAsSeller?: () => void;
  onStartAsDropshipper?: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({
  onStartAsBuyer,
  onStartAsSeller,
  onStartAsDropshipper,
}) => {
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller' | 'dropshipper'>('buyer');

  return (
    <section id="como-funciona" className="py-16 border-t border-slate-200/80 bg-white">
      <div className="max-w-[1600px] xl:max-w-[1720px] 2xl:max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-slate-700" />
            Flujo Simple & Transparente
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            ¿Cómo Funciona Sanpi Market?
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Una plataforma unificada diseñada para comprar con confianza, vender a escala nacional y generar ingresos con dropshipping sin inventario.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex justify-center">
          <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1.5 shadow-2xs">
            <button
              onClick={() => setActiveTab('buyer')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'buyer'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Para Compradores</span>
            </button>

            <button
              onClick={() => setActiveTab('seller')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'seller'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Para Tiendas & Vendedores</span>
            </button>

            <button
              onClick={() => setActiveTab('dropshipper')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'dropshipper'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Para Dropshippers</span>
            </button>
          </div>
        </div>

        {/* 3 Interactive Cards based on Selected Tab */}
        {activeTab === 'buyer' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900">Explora y Elige</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Navega por miles de artículos verificados de tiendas dominicanas. Compara precios transparentes sin costos ocultos.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Catálogos 100% reales en RD</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-900">Ordena sin Tarjeta de Crédito</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Ingresa tu dirección en cualquiera de las 32 provincias de República Dominicana. Flete fijo garantizado de <strong className="text-slate-900 font-bold">RD$ 350</strong>.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <Truck className="w-3.5 h-3.5 text-slate-700" />
                <span>Guía de rastreo en tiempo real</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900">Recibe y Paga en Efectivo (COD)</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  El mensajero de Sacha Pack entrega en tu puerta. Revisas tu paquete y pagas el total acordado en efectivo.
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cero riesgo para tu bolsillo</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seller' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900">Solicita tu Alta de Tienda</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Selecciona tu plan mensual (Básico, Pro o Élite). Nuestro equipo valida tu identidad y activa tu comercio en minutos.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Comisiones desde solo el 8%</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-900">Publica tu Inventario</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Sube tus fotos, precios y stock. Decide si permites que la red nacional de Dropshippers revenda tus productos por ti.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Ventas multiplicadas por afiliados</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900">Despacha y Recibe tus Fondos</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Sacha Pack recolecta en tu almacén, entrega a nivel nacional, recauda el efectivo COD y liquida tus ingresos directamente.
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Liquidación transparente</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dropshipper' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900">Elige Artículos Ganadores</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Explora el catálogo mayorista de proveedores en RD con stock local listo para despachar de inmediato sin esperar aduanas.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Sin compra previa ni bodegaje</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-900">Genera tu Landing Page con 1 Clic</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Ajusta tu precio de venta final, genera tu página web optimizada para WhatsApp / TikTok Ads y empieza a pautar.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <Zap className="w-3.5 h-3.5 text-purple-600" />
                <span>Conversión optimizada COD</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900">Cobra tus Márgenes Netos</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Cuando la orden es entregada al cliente por Sacha Pack, tu margen de ganancia se acredita automáticamente en tu balance.
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 pt-2 border-t border-slate-200">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ganancias líquidas sin riesgo</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
