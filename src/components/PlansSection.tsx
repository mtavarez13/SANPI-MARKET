import React from 'react';
import { Check, Sparkles, Store, Zap, Shield, ArrowRight, Star } from 'lucide-react';
import { UserProfile, SanpiPlan } from '../types';
import { sanpiManager } from '../lib/storeManager';

interface PlansSectionProps {
  onSelectPlan: (plan: 'basic' | 'pro' | 'elite' | 'dropshipper' | string) => void;
  currentUser: UserProfile | null;
  plans?: SanpiPlan[];
}

export const PlansSection: React.FC<PlansSectionProps> = ({
  onSelectPlan,
  currentUser,
  plans: customPlans
}) => {
  const activePlans = customPlans || sanpiManager.getPlans(true);

  return (
    <section id="planes" className="py-16 border-t border-slate-200/80 bg-white">
      <div className="max-w-[1600px] xl:max-w-[1720px] 2xl:max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-slate-700" />
            Membresías Transparentes
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Planes para Tiendas & Dropshippers
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Escoge el modelo que mejor se adapte a tu volumen. Sin contratos forzosos ni comisiones ocultas.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Dynamic Store Membership Plans */}
          {activePlans.map((plan) => {
            const isPopular = plan.popular || plan.id === 'pro';
            const isFull = plan.id === 'full' || plan.id === 'elite';

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden ${
                  isPopular
                    ? 'bg-slate-900 text-white shadow-md border-2 border-slate-900'
                    : 'bg-white text-slate-900 border border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                {/* Badge if present */}
                {(plan.badge || isPopular) && (
                  <div className="absolute top-4 right-4">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                      isPopular
                        ? 'bg-white text-slate-900'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}>
                      {plan.badge || (isPopular ? 'Más Popular' : 'Recomendado')}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      isPopular ? 'text-slate-300' : 'text-slate-500'
                    }`}>
                      {plan.tagline || 'Plan de Membresía'}
                    </span>
                    <h3 className={`text-xl font-bold mt-1 ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                      Plan {plan.name}
                    </h3>
                    {plan.description && (
                      <p className={`text-xs mt-1 ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>
                        {plan.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-extrabold ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                        RD$ {plan.monthlyFee.toLocaleString()}
                      </span>
                      <span className={`text-xs ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>/mes</span>
                    </div>
                    <div className={`mt-2 text-xs font-semibold py-1 px-2.5 rounded-lg inline-block ${
                      isPopular
                        ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/60'
                        : 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                    }`}>
                      {plan.commissionPercent}% Comisión por Venta
                    </div>
                  </div>

                  <ul className={`space-y-2.5 text-xs pt-4 border-t ${
                    isPopular ? 'text-slate-200 border-slate-800' : 'text-slate-600 border-slate-100'
                  }`}>
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer ${
                    isPopular
                      ? 'bg-white hover:bg-slate-100 text-slate-900 shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                  }`}
                >
                  <span>Seleccionar {plan.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {/* Plan Dropshipper */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between space-y-6 shadow-2xs">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Afiliados & Creadores</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Dropshipper</h3>
                <p className="text-xs text-slate-500 mt-1">Gana dinero revendiendo productos sin invertir en stock.</p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">RD$ 0</span>
                  <span className="text-xs text-slate-500">/cuota fija</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 py-1 px-2.5 rounded-lg inline-block">
                  100% de tu Margen
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Generador de Landing Pages con 1 Clic</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Define tu propio precio de venta</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Enlace directo para pauta y WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cobro de comisiones semanales</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onSelectPlan('dropshipper')}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs transition-all border border-slate-200 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Empezar como Dropshipper</span>
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
