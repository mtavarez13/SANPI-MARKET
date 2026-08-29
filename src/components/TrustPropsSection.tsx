import React from 'react';
import { Truck, ShieldCheck, RefreshCw, Headphones, CheckCircle2 } from 'lucide-react';

export const TrustPropsSection: React.FC = () => {
  const pillars = [
    {
      icon: Truck,
      title: 'Envíos Rápidos 24-48h',
      subtitle: 'Cobertura Nacional',
      description: 'Entregas directas a las 32 provincias de República Dominicana con tarifa plana de RD$ 350.',
      badge: 'Sacha Pack Express'
    },
    {
      icon: ShieldCheck,
      title: 'Pago Contra Entrega',
      subtitle: '100% en Efectivo',
      description: 'Pagas al mensajero únicamente cuando tengas tu paquete en tus manos. Cero riesgos.',
      badge: 'Cero Riesgo'
    },
    {
      icon: RefreshCw,
      title: 'Garantía de Satisfacción',
      subtitle: 'Devolución Asegurada',
      description: 'Todos nuestros productos son certificados e inspeccionados antes de salir de bodega.',
      badge: 'Compra Protegida'
    },
    {
      icon: Headphones,
      title: 'Soporte Humano 24/7',
      subtitle: 'Atención Personalizada',
      description: 'Asistencia inmediata vía WhatsApp y seguimiento en tiempo real de cada orden.',
      badge: 'Respuesta Inmediata'
    }
  ];

  return (
    <section className="py-12 border-y border-slate-200/80 bg-white">
      <div className="max-w-[1600px] xl:max-w-[1720px] 2xl:max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group p-6 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition-all duration-200 flex flex-col justify-between space-y-4 shadow-sm hover:shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
                      <Icon className="w-6 h-6 text-slate-100" />
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                      {item.subtitle}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verificado por Sanpi</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
