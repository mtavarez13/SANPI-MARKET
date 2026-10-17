import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, LogIn, ShoppingCart, Sparkles } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signInWithGoogle } from '../lib/authService';
import { sanpiManager } from '../lib/storeManager';
import { RD_PROVINCES } from '../data/rdProvinces';
import type { SanpiPlan } from '../types';

interface Props {
  plans: SanpiPlan[];
  onBack: () => void;
  onOpenLogin: () => void;
}

const inputStyle = 'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100';

export const StoreRegistrationLanding: React.FC<Props> = ({ plans, onBack, onOpenLogin }) => {
  const activePlans = plans.filter(plan => plan.isActive);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [form, setForm] = useState({ storeName: '', ownerName: '', email: auth.currentUser?.email || '', phone: '', province: 'Distrito Nacional', description: '' });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const chosenPlan = activePlans.find(plan => plan.id === selectedPlan) || activePlans[0];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chosenPlan || busy) return;
    setBusy(true);
    setMessage('');
    try {
      let user = auth.currentUser;
      if (!user || user.isAnonymous) {
        const result = await signInWithGoogle({
          role: 'partner', plan: chosenPlan.id, storeName: form.storeName.trim(),
          phone: form.phone.trim(), province: form.province, isRegistration: true
        });
        if (!result.user) throw new Error(result.error || 'No se pudo verificar tu cuenta Google.');
        user = result.user;
      }
      const verifiedEmail = user.email?.trim().toLowerCase();
      if (!verifiedEmail) throw new Error('Tu cuenta Google debe tener un correo electrónico válido.');
      await sanpiManager.addSubscriptionRequest({
        storeName: form.storeName.trim(),
        ownerName: form.ownerName.trim(),
        email: verifiedEmail,
        phone: form.phone.trim(),
        province: form.province,
        description: form.description.trim(),
        plan: chosenPlan.id,
      });
      setForm(previous => ({ ...previous, email: verifiedEmail }));
      setSubmitted(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-200">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
        <button onClick={onBack} className="flex items-center gap-2 text-left" aria-label="Volver al marketplace">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/20"><ShoppingCart size={19} /></span>
          <span className="text-base font-black uppercase italic tracking-tight text-purple-800 sm:text-xl">Sanpi Marketplace</span>
        </button>
        <button onClick={onOpenLogin} className="inline-flex items-center gap-2 rounded-xl border border-purple-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-purple-700 hover:bg-purple-50 sm:px-5"><LogIn size={16} /> Acceso socios</button>
      </div>
    </header>

    <main>
      <section className="relative overflow-hidden bg-purple-800 px-4 py-14 text-center text-white sm:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #c084fc 0, transparent 30%), radial-gradient(circle at 90% 80%, #6d28d9 0, transparent 35%)' }} />
        <div className="relative mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] backdrop-blur"><Sparkles size={14} className="text-yellow-300" /> Tu tienda en el marketplace</span>
          <h1 className="mt-6 text-5xl font-black uppercase italic leading-none tracking-tighter sm:text-7xl">Registra tu <span className="text-purple-300">tienda</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-relaxed text-purple-100 sm:text-base">Publica tus productos y conecta con clientes de todo el país mediante la operación logística de Sanpi Market.</p>
          <button onClick={onBack} className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-purple-100 underline-offset-4 hover:underline"><ArrowLeft size={15} /> Volver a explorar productos</button>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-8 sm:py-16 lg:grid-cols-12 lg:gap-12" aria-label="Planes y registro de tienda">
        <div className="lg:col-span-5">
          <p className="text-[11px] font-black uppercase italic tracking-[.24em] text-purple-700">1. Elige tu plan</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Crece a tu ritmo</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Los precios y comisiones son los planes activos de Sanpi Market.</p>
          <div className="mt-6 grid gap-4">
            {activePlans.map(plan => {
              const selected = chosenPlan?.id === plan.id;
              return <button key={plan.id} type="button" onClick={() => setSelectedPlan(plan.id)} aria-pressed={selected} className={`overflow-hidden rounded-[2rem] border-2 bg-white text-left transition-all duration-300 ${selected ? 'border-purple-600 shadow-xl shadow-purple-700/10 lg:scale-[1.02]' : 'border-slate-200 hover:border-purple-300'}`}>
                <div className={`flex items-center justify-between px-6 py-4 ${selected ? 'bg-purple-600 text-white' : 'text-slate-900'}`}><strong className="text-xl font-black uppercase italic">{plan.name}</strong>{selected && <CheckCircle2 size={23} />}</div>
                <div className="px-6 py-5"><p className="text-2xl font-black text-purple-800">RD$ {plan.monthlyFee.toLocaleString('es-DO')} <span className="text-xs font-semibold text-slate-500">/mes</span></p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">Comisión por venta: {plan.commissionPercent}%</p>{plan.description && <p className="mt-3 text-sm leading-relaxed text-slate-600">{plan.description}</p>}</div>
              </button>;
            })}
            {!activePlans.length && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">No hay planes disponibles en este momento. Vuelve más tarde.</p>}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-[2.5rem] bg-white shadow-xl shadow-slate-200/80">
            <div className="bg-slate-900 px-6 py-7 text-white sm:px-8"><p className="text-[10px] font-bold uppercase tracking-[.24em] text-purple-300">2. Envía tu solicitud</p><h2 className="mt-2 text-3xl font-black uppercase italic tracking-tight">Formulario de registro</h2><p className="mt-2 text-xs text-slate-300">Cuéntanos sobre tu negocio para preparar tu perfil de socio.</p></div>
            {submitted ? <div className="px-6 py-14 text-center sm:px-8" role="status"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-purple-100 text-purple-700"><CheckCircle2 size={34} /></span><h3 className="mt-5 text-2xl font-black">Solicitud enviada</h3><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">La solicitud de {form.storeName} quedó registrada. El equipo de Sanpi revisará la información y te contactará por los datos proporcionados.</p><button onClick={onBack} className="mt-7 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white hover:bg-purple-700">Volver al marketplace</button></div> : <form onSubmit={submit} className="space-y-5 px-6 py-8 sm:px-8">
              <div className="grid gap-5 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wide text-slate-600">Nombre de tienda *<input required maxLength={100} value={form.storeName} onChange={event => setForm({ ...form, storeName: event.target.value })} placeholder="Ej: Innova Tech RD" className={inputStyle} /></label><label className="text-xs font-bold uppercase tracking-wide text-slate-600">Nombre del propietario *<input required maxLength={100} value={form.ownerName} onChange={event => setForm({ ...form, ownerName: event.target.value })} placeholder="Nombre completo" className={inputStyle} /></label></div>
              <div className="grid gap-5 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wide text-slate-600">WhatsApp de contacto *<input required type="tel" inputMode="tel" maxLength={20} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="809-000-0000" className={inputStyle} /></label><label className="text-xs font-bold uppercase tracking-wide text-slate-600">Correo de acceso *<input required type="email" maxLength={120} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="tu@tienda.com" className={inputStyle} /></label></div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">Provincia *<select required value={form.province} onChange={event => setForm({ ...form, province: event.target.value })} className={inputStyle}>{RD_PROVINCES.map(province => <option key={province.id} value={province.name}>{province.name}</option>)}</select></label>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">¿Qué vendes?<textarea maxLength={500} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Describe tus productos principales" rows={3} className={inputStyle} /></label>
              <p className="rounded-xl bg-purple-50 px-4 py-3 text-xs leading-relaxed text-purple-900">Al enviar, verificaremos tu identidad con Google. El correo de acceso será el de la cuenta Google utilizada. Tu solicitud quedará pendiente de revisión.</p>
              {message && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
              <button disabled={busy || !chosenPlan} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black uppercase italic text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <><Loader2 size={18} className="animate-spin" /> Enviando solicitud...</> : <><Check size={19} /> Unirme a Sanpi Marketplace <ArrowRight size={17} /></>}</button>
            </form>}
          </div>
        </div>
      </section>
    </main>
  </div>;
};
