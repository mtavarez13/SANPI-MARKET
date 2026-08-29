import React from 'react';
import { Truck, ShieldCheck, PackageCheck, MapPin, Sparkles, CheckCircle2, ArrowRight, PhoneCall, Building2 } from 'lucide-react';

interface SachaPackProductBannerProps {
  onTrackClick?: () => void;
  onExploreClick?: () => void;
}

export const SachaPackProductBanner: React.FC<SachaPackProductBannerProps> = ({
  onTrackClick,
  onExploreClick,
}) => {
  return (
    <section className="py-12 my-6">
      <div className="rounded-3xl border-2 border-purple-200 bg-white p-6 sm:p-10 lg:p-12 shadow-sm relative overflow-hidden">
        
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-50 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-100/50 rounded-full blur-2xl -z-10 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Official Branding & Context */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              <span>ALIANZA ESTRATÉGICA OFICIAL</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Sanpi es un producto de <span className="text-purple-700 underline decoration-purple-300 underline-offset-4">Sacha Pack</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                "La Magia de comprar Online" cuenta con el respaldo operativo, bodegas de fulfillment y la red de mensajería express de <strong>Sacha Pack Logistics</strong> en todo el territorio dominicano.
              </p>
            </div>

            {/* Feature Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="flex items-start gap-3 bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100">
                <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="text-slate-900 block font-bold">Cobertura 32 Provincias</strong>
                  <span className="text-slate-600">Entregas en 24 a 48 horas en Santo Domingo, Santiago y todo el país.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100">
                <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="text-slate-900 block font-bold">Cobro Contra Entrega (COD)</strong>
                  <span className="text-slate-600">Recaudación 100% segura en efectivo al entregar el paquete al cliente.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100">
                <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="text-slate-900 block font-bold">Flete Nacional Fijo RD$ 350</strong>
                  <span className="text-slate-600">Tarifa plana sin cargos ocultos ni sorpresas para compradores y tiendas.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100">
                <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="text-slate-900 block font-bold">Fulfillment & Dropshipping</strong>
                  <span className="text-slate-600">Almacenaje, empaque profesional y despacho automatizado para vendedores.</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {onTrackClick && (
                <button
                  onClick={onTrackClick}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Rastrear mi Envío Sacha Pack</span>
                </button>
              )}

              {onExploreClick && (
                <button
                  onClick={onExploreClick}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-purple-50 text-purple-900 font-bold text-xs transition-all border border-purple-200 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Explorar Catálogo con Envío COD</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Visual Box & Trust Badge */}
          <div className="lg:col-span-5">
            <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-purple-700/50 space-y-6">
              
              {/* Badge */}
              <div className="flex items-center justify-between border-b border-purple-700/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white text-purple-900 flex items-center justify-center font-black text-xl shadow-md">
                    S
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight text-white">SANPI MARKET RD</h3>
                    <p className="text-[10px] text-purple-200 font-medium">Powered by Sacha Pack Logistics</p>
                  </div>
                </div>
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                  Verificado
                </span>
              </div>

              {/* Stats & Guarantee Details */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-purple-700/40">
                  <span className="text-purple-200">Operador Logístico:</span>
                  <strong className="text-white font-bold">Sacha Pack Dominicana</strong>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-purple-700/40">
                  <span className="text-purple-200">Cobertura Territorial:</span>
                  <strong className="text-white font-bold">32 Provincias (100% RD)</strong>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-purple-700/40">
                  <span className="text-purple-200">Tiempo de Entrega:</span>
                  <strong className="text-emerald-300 font-bold">24 a 48 Horas</strong>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-purple-700/40">
                  <span className="text-purple-200">Modalidad de Cobro:</span>
                  <strong className="text-yellow-300 font-bold">Cash on Delivery (COD)</strong>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-purple-200">Soporte WhatsApp:</span>
                  <strong className="text-white font-bold">809-676-6690</strong>
                </div>
              </div>

              {/* Guarantee footer message */}
              <div className="p-3 rounded-2xl bg-purple-950/60 border border-purple-600/40 flex items-center gap-2.5 text-[11px] text-purple-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Cada orden genera una guía oficial de seguimiento monitoreada en tiempo real.</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
