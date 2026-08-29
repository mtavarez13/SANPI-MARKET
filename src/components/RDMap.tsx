import React, { useState } from 'react';
import { RD_PROVINCES } from '../data/rdProvinces';
import { Delivery } from '../types';
import { MapPin, Truck, CheckCircle2, TrendingUp, Compass } from 'lucide-react';

interface RDMapProps {
  deliveries: Delivery[];
}

export const RDMap: React.FC<RDMapProps> = ({ deliveries }) => {
  const [selectedRegion, setSelectedRegion] = useState<'Todas' | 'Cibao' | 'Sur' | 'Este' | 'Metro'>('Todas');
  const [activeProvinceId, setActiveProvinceId] = useState<string | null>('DN');

  // Compute statistics per province
  const provinceStats = RD_PROVINCES.map((prov) => {
    const provDeliveries = deliveries.filter(d => d.province.toLowerCase() === prov.name.toLowerCase());
    const delivered = provDeliveries.filter(d => d.status === 'entregado');
    const inTransit = provDeliveries.filter(d => d.status === 'en_transito');
    const totalCodValue = provDeliveries.reduce((acc, d) => acc + d.totalCodAmount, 0);

    return {
      ...prov,
      deliveriesCount: provDeliveries.length,
      deliveredCount: delivered.length,
      inTransitCount: inTransit.length,
      totalCodValue
    };
  });

  const filteredProvinces = provinceStats.filter(p => selectedRegion === 'Todas' || p.region === selectedRegion);

  const activeProvince = provinceStats.find(p => p.id === activeProvinceId) || provinceStats[0];

  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Mapa de Cobertura y Entregas COD (32 Provincias RD)</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualiza la intensidad de logística nacional Sanpi por regiones y provincias
          </p>
        </div>

        {/* Region Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold overflow-x-auto">
          {['Todas', 'Metro', 'Cibao', 'Este', 'Sur'].map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg as any)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedRegion === reg ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {reg}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Interactive RD Map View (Simulated SVG Canvas) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-3xl p-6 text-white relative min-h-[360px] overflow-hidden shadow-2xl border border-purple-900/40 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-widest bg-purple-900/50 px-3 py-1 rounded-full border border-purple-500/30">
              República Dominicana • Flete Fijo RD$ 350
            </span>
            <span className="text-[11px] text-slate-400">Selecciona un punto para ver detalles</span>
          </div>

          {/* Map Nodes Plot */}
          <div className="relative w-full h-[280px] my-4 my-auto">
            {filteredProvinces.map((p) => {
              const isSelected = p.id === activeProvince.id;
              const hasDeliveries = p.deliveriesCount > 0;

              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProvinceId(p.id)}
                  style={{
                    left: `${p.coordinates.x}%`,
                    top: `${p.coordinates.y}%`
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 z-10 focus:outline-none ${
                    isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-20'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Ripple animation for active / high volume */}
                    {hasDeliveries && (
                      <span className="absolute w-8 h-8 bg-purple-500/40 rounded-full animate-ping pointer-events-none" />
                    )}

                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg border-2 transition-all ${
                      isSelected ? 'bg-yellow-400 text-slate-950 border-white ring-4 ring-purple-500/50' :
                      hasDeliveries ? 'bg-purple-600 text-white border-purple-300' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {p.deliveriesCount}
                    </div>

                    {/* Tooltip Label */}
                    <div className={`absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap border border-slate-700 shadow-xl pointer-events-none ${
                      isSelected ? 'block' : 'hidden group-hover:block'
                    }`}>
                      {p.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 z-10 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Con Envíos</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Seleccionada</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block" /> Sin Pedidos</span>
            </div>
            <span>32 Provincias Sanpi Cobertura</span>
          </div>
        </div>

        {/* Selected Province Inspector Card */}
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] uppercase font-extrabold text-purple-600 tracking-wider">Provincia Seleccionada</span>
              <h4 className="text-xl font-black text-slate-900">{activeProvince.name}</h4>
              <span className="text-xs text-slate-500 font-semibold">{activeProvince.region} • Capital: {activeProvince.capital}</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 font-black flex items-center justify-center text-sm shadow-inner">
              {activeProvince.id}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-purple-600" />
                Envíos Totales Registrados:
              </span>
              <span className="font-black text-slate-900 text-sm">{activeProvince.deliveriesCount}</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Guías Entregadas Exitosas:
              </span>
              <span className="font-black text-emerald-600 text-sm">{activeProvince.deliveredCount}</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                Volumen COD Recaudado:
              </span>
              <span className="font-black text-purple-900 text-sm">RD$ {activeProvince.totalCodValue.toLocaleString()}</span>
            </div>
          </div>

          {/* Province List Selector */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Cambiar Provincia:</label>
            <select
              value={activeProvince.id}
              onChange={(e) => setActiveProvinceId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
            >
              {RD_PROVINCES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.region})
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};
