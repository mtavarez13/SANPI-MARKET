import React, { useState } from 'react';
import { SanpiPlan } from '../types';
import { sanpiManager } from '../lib/storeManager';
import {
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Check,
  Percent,
  DollarSign,
  ShieldCheck,
  Star,
  Info,
  X
} from 'lucide-react';

interface AdminPlansManagerProps {
  onRefresh: () => void;
}

export const AdminPlansManager: React.FC<AdminPlansManagerProps> = ({ onRefresh }) => {
  const plans = sanpiManager.plans;
  const [editingPlan, setEditingPlan] = useState<SanpiPlan | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form State
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formTagline, setFormTagline] = useState('');
  const [formFee, setFormFee] = useState<number>(600);
  const [formCommission, setFormCommission] = useState<number>(15);
  const [formDescription, setFormDescription] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formPopular, setFormPopular] = useState<boolean>(false);
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formFeaturesText, setFormFeaturesText] = useState('');

  const openCreateModal = () => {
    setFormId('');
    setFormName('');
    setFormTagline('');
    setFormFee(600);
    setFormCommission(15);
    setFormDescription('');
    setFormBadge('');
    setFormPopular(false);
    setFormActive(true);
    setFormFeaturesText(
      'Hasta 50 productos en catálogo\nLogística Sacha Pack COD integrada\nFlete Fijo Nacional RD$ 350\nSoporte estándar vía ticket'
    );
    setEditingPlan(null);
    setIsCreating(true);
  };

  const openEditModal = (plan: SanpiPlan) => {
    setEditingPlan(plan);
    setFormId(plan.id);
    setFormName(plan.name);
    setFormTagline(plan.tagline || '');
    setFormFee(plan.monthlyFee);
    setFormCommission(plan.commissionPercent ?? Math.round((plan.commissionRate || 0.1) * 100));
    setFormDescription(plan.description || '');
    setFormBadge(plan.badge || '');
    setFormPopular(!!plan.popular);
    setFormActive(plan.isActive ?? true);
    setFormFeaturesText((plan.features || []).join('\n'));
    setIsCreating(false);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Por favor introduce el nombre del plan.');
      return;
    }

    const featuresArray = formFeaturesText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const commissionPercent = Number(formCommission);
    const commissionRate = commissionPercent / 100;
    const monthlyFee = Number(formFee);

    if (editingPlan) {
      // Update existing
      await sanpiManager.updatePlan(editingPlan.id, {
        name: formName.trim(),
        tagline: formTagline.trim() || undefined,
        monthlyFee,
        commissionPercent,
        commissionRate,
        description: formDescription.trim() || undefined,
        badge: formBadge.trim() || undefined,
        popular: formPopular,
        isActive: formActive,
        features: featuresArray
      });
      alert(`Plan "${formName}" actualizado con éxito.`);
    } else {
      // Create new
      const planId = formId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || `plan_${Date.now()}`;
      await sanpiManager.addPlan({
        id: planId,
        name: formName.trim(),
        tagline: formTagline.trim() || undefined,
        monthlyFee,
        commissionPercent,
        commissionRate,
        description: formDescription.trim() || undefined,
        badge: formBadge.trim() || undefined,
        popular: formPopular,
        isActive: formActive,
        features: featuresArray
      });
      alert(`Nuevo plan "${formName}" creado con éxito.`);
    }

    setIsCreating(false);
    setEditingPlan(null);
    onRefresh();
  };

  const handleDeletePlan = async (plan: SanpiPlan) => {
    if (confirm(`¿Estás seguro de eliminar el plan "${plan.name}"? Los comercios actualmente con este plan mantendrán su tasa asignada.`)) {
      await sanpiManager.deletePlan(plan.id);
      onRefresh();
    }
  };

  const handleTogglePlan = async (plan: SanpiPlan) => {
    await sanpiManager.togglePlanStatus(plan.id);
    onRefresh();
  };

  const handleResetDefaults = async () => {
    if (confirm('¿Restablecer los planes oficiales a: Básico RD$ 600 (15%), Pro RD$ 1,500 (10%), Full RD$ 2,000 (8%)?')) {
      await sanpiManager.resetPlansToDefault();
      onRefresh();
      alert('Planes restablecidos a la estructura oficial.');
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-8">
      
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Configuración de Membresías & Comisiones
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            Planes Disponibles Sanpi Marketplace
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Administra las tarifas mensuales (MRR), el porcentaje de comisión por ventas y los beneficios que se muestran a los socios al registrarse.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Restablecer Básico $600, Pro $1500, Full $2000"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restablecer Oficiales</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Plan</span>
          </button>
        </div>
      </div>

      {/* Official 3-Plan Banner Card */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-4 border border-purple-200/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-yellow-300 flex items-center justify-center font-black text-sm shrink-0 shadow-md">
            %
          </div>
          <div className="text-xs">
            <span className="font-extrabold text-slate-900 block">Estructura de Precios Oficial Sanpi</span>
            <span className="text-slate-600">
              <strong>Básico:</strong> RD$ 600/mes (15% comisión) &bull; <strong>Pro:</strong> RD$ 1,500/mes (10% comisión) &bull; <strong>Full:</strong> RD$ 2,000/mes (8% comisión)
            </span>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-3 py-1 bg-white text-purple-700 font-black rounded-xl border border-purple-200 text-[11px] shadow-sm">
          {plans.length} Planes en Base de Datos
        </span>
      </div>

      {/* Plans Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isPopular = p.popular || p.id === 'pro';
          const isFull = p.id === 'full' || p.id === 'elite';

          return (
            <div
              key={p.id}
              className={`rounded-3xl border-2 p-6 flex flex-col justify-between space-y-6 transition-all relative overflow-hidden ${
                !p.isActive
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : isPopular
                  ? 'bg-gradient-to-b from-blue-50/50 to-white border-blue-400 shadow-lg'
                  : isFull
                  ? 'bg-gradient-to-b from-purple-50/40 to-white border-purple-300 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              {/* Badges */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md uppercase">
                  ID: {p.id}
                </span>

                <div className="flex items-center gap-1.5">
                  {p.badge && (
                    <span className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      {p.badge}
                    </span>
                  )}
                  {p.popular && !p.badge && (
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      Más Popular
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {p.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Title & Pricing */}
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {p.tagline || 'Plan de Membresía'}
                  </span>
                  <h4 className="text-2xl font-black text-slate-900 mt-0.5">Plan {p.name}</h4>
                  {p.description && (
                    <p className="text-xs text-slate-600 mt-1">{p.description}</p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Cuota Mensual MRR</span>
                    <span className="text-xl font-black text-slate-900">RD$ {p.monthlyFee.toLocaleString()}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Comisión Sanpi</span>
                    <span className="text-base font-black text-purple-700">{p.commissionPercent}% por Venta</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
                  <span className="font-bold text-[11px] text-slate-400 uppercase block">Beneficios Incluidos:</span>
                  <ul className="space-y-1.5">
                    {(p.features || []).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-700">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditModal(p)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Modificar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTogglePlan(p)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    p.isActive
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                  }`}
                  title={p.isActive ? 'Desactivar plan' : 'Activar plan'}
                >
                  {p.isActive ? 'Desactivar' : 'Activar'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeletePlan(p)}
                  className="py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs transition-colors cursor-pointer"
                  title="Eliminar plan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT PLAN MODAL */}
      {(isCreating || editingPlan) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 relative my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-900">
                    {editingPlan ? `Modificar Plan "${editingPlan.name}"` : 'Crear Nuevo Plan de Membresía'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Configura las cuotas fijas, porcentajes y beneficios
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsCreating(false); setEditingPlan(null); }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre del Plan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Básico, Pro, Full, VIP"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Identificador ID (Slug)</label>
                  <input
                    type="text"
                    disabled={!!editingPlan}
                    placeholder="Ej: basic, pro, full"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtítulo / Audiencia Objetivo</label>
                <input
                  type="text"
                  placeholder="Ej: Para negocios que inician en el comercio electrónico"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200">
                  <label className="block font-bold text-purple-900 mb-1">Cuota Mensual (RD$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-purple-700">RD$</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      placeholder="600"
                      value={formFee}
                      onChange={(e) => setFormFee(Number(e.target.value))}
                      className="w-full pl-12 pr-3 py-2 bg-white border border-purple-200 rounded-xl text-slate-900 font-black text-sm"
                    />
                  </div>
                  <span className="text-[10px] text-purple-700 mt-1 block">Facturación mensual fija de membresía</span>
                </div>

                <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200">
                  <label className="block font-bold text-blue-900 mb-1">Comisión por Venta (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder="15"
                      value={formCommission}
                      onChange={(e) => setFormCommission(Number(e.target.value))}
                      className="w-full pr-8 pl-3 py-2 bg-white border border-blue-200 rounded-xl text-slate-900 font-black text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-blue-700">%</span>
                  </div>
                  <span className="text-[10px] text-blue-700 mt-1 block">Retención Sanpi sobre ventas entregadas COD</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Etiqueta / Badge Visual</label>
                  <input
                    type="text"
                    placeholder="Ej: Más Popular, Recomendado, VIP"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs"
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPopular}
                      onChange={(e) => setFormPopular(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600"
                    />
                    <span>Destacado Popular</span>
                  </label>

                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>Plan Activo</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Beneficios y Características (Uno por línea)
                </label>
                <textarea
                  rows={4}
                  placeholder="Hasta 50 productos en catálogo&#10;Logística Sacha Pack COD integrada&#10;Flete Fijo Nacional RD$ 350"
                  value={formFeaturesText}
                  onChange={(e) => setFormFeaturesText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingPlan(null); }}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95"
                >
                  {editingPlan ? 'Guardar Cambios del Plan' : 'Crear y Publicar Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
