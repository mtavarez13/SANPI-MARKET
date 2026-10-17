import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, PackageCheck, RefreshCw, Search, Truck } from 'lucide-react';
import type { Delivery } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { carrierGuideFor } from '../lib/trackingAliases';

interface Props {
  deliveries: Delivery[];
  initialQuery?: string;
  onClose: () => void;
  backLabel?: string;
}

const colors: Record<string, string> = {
  pendiente: 'bg-orange-50 text-orange-700 border-orange-200',
  'pendiente de recoger pickup': 'bg-orange-50 text-orange-700 border-orange-200',
  'en tránsito': 'bg-blue-50 text-blue-700 border-blue-200',
  entregado: 'bg-green-50 text-green-700 border-green-200',
  reprogramado: 'bg-orange-50 text-orange-700 border-orange-200',
  'pendiente de retorno': 'bg-slate-100 text-slate-700 border-slate-200',
  'retornado a almacén': 'bg-slate-100 text-slate-700 border-slate-200',
  cancelado: 'bg-slate-100 text-slate-700 border-slate-200',
};
const messages: Record<string, string> = {
  pendiente: 'Estamos preparando tu paquete para el envío.',
  'pendiente de recoger pickup': 'El paquete está pendiente de recogida en la tienda.',
  'en tránsito': 'Tu paquete va camino a su destino.',
  entregado: 'El paquete fue entregado.',
  reprogramado: 'La entrega fue reprogramada. Consulta las actualizaciones.',
  'pendiente de retorno': 'El paquete está de regreso al centro de acopio.',
  'retornado a almacén': 'El paquete regresó al almacén de origen.',
  cancelado: 'Este envío fue cancelado.',
};
const dateLabel = (value?: string) => value && !Number.isNaN(Date.parse(value))
  ? new Date(value).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Fecha no disponible';

export const TrackingModal: React.FC<Props> = ({ initialQuery = '', onClose, backLabel = 'Volver al marketplace' }) => {
  const [guide, setGuide] = useState(initialQuery);
  const [searched, setSearched] = useState(initialQuery);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setSearched(clean);
    setGuide(clean);
    setLoading(true);
    setError('');
    setDelivery(null);
    try {
      setDelivery((await sanpiManager.trackPackage(clean)).delivery);
    } catch {
      setError('No encontramos esa guía. Revisa el número e inténtalo de nuevo. Puedes usar la guía Sanpi o la de la transportadora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (initialQuery.trim()) void search(initialQuery); }, [initialQuery]);
  const history = [...(delivery?.history || [])].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const carrierGuide = delivery ? carrierGuideFor(delivery) : undefined;

  return <main className="mx-auto max-w-4xl space-y-6 pb-16 pt-4">
    <button onClick={onClose} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-violet-700"><ArrowLeft size={17} /> {backLabel}</button>
    <div className="rounded-[28px] bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-6 text-white sm:p-9">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15"><Truck size={23} /></span><span className="text-xs font-bold uppercase tracking-[.16em] text-violet-200">Rastreo de paquetes</span></div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">¿Dónde está mi paquete?</h1>
      <p className="mt-2 max-w-xl text-sm text-violet-100">Consulta el estado y las últimas novedades con tu guía Sanpi o el número que te dio la transportadora.</p>
      <form onSubmit={event => { event.preventDefault(); void search(guide); }} className="mt-7 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="tracking-guide" className="sr-only">Número de guía</label>
        <div className="relative flex-1"><Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="tracking-guide" autoComplete="off" value={guide} onChange={event => setGuide(event.target.value)} placeholder="Escribe tu número de guía" className="h-13 w-full rounded-xl border border-white/20 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-violet-300" /></div>
        <button type="submit" disabled={loading || !guide.trim()} className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-violet-500 px-6 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50">{loading ? <RefreshCw size={17} className="animate-spin" /> : <ArrowRight size={17} />} {loading ? 'Consultando...' : 'Consultar envío'}</button>
      </form>
    </div>
    {error && <div role="alert" className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-900">{error}</div>}
    {delivery && <div className="space-y-5">
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Estado actual</p><h2 className="mt-2 text-2xl font-semibold capitalize text-slate-950">{delivery.status}</h2><p className="mt-2 text-sm text-slate-600">{messages[delivery.status] || 'Consulta las novedades de tu envío.'}</p></div>
          <span className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize ${colors[delivery.status] || colors.pendiente}`}>{delivery.status}</span>
        </div>
        <div className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
          <div><p className="text-xs text-slate-500">Guía Sanpi</p><p className="mt-1 break-all font-semibold text-slate-900">{delivery.trackingNumber}</p></div>
          {carrierGuide && <div><p className="text-xs text-slate-500">Guía de {delivery.carrierName || delivery.logisticsProviderName || 'la transportadora'}</p><p className="mt-1 break-all font-semibold text-slate-900">{carrierGuide}</p></div>}
          <div><p className="text-xs text-slate-500">Última actualización</p><p className="mt-1 font-medium text-slate-800">{dateLabel(history[0]?.date || delivery.createdAt)}</p></div>
          {delivery.province && <div><p className="text-xs text-slate-500">Destino</p><p className="mt-1 font-medium text-slate-800">{delivery.province}</p></div>}
        </div>
      </div>
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-label="Actualizaciones del envío">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Clock3 size={20} className="text-violet-600" /> Actualizaciones del envío</h2>
        <div className="mt-6 space-y-4">{history.length ? history.map((item, index) => <div key={`${item.date}-${index}`} className="flex gap-4"><span className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full ${index === 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}><PackageCheck size={16} /></span><div className="min-w-0 flex-1 border-b border-slate-100 pb-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold capitalize text-slate-900">{item.status}</p><time className="text-xs text-slate-500">{dateLabel(item.date)}</time></div>{item.note && <p className="mt-1 text-sm text-slate-600">{item.note}</p>}</div></div>) : <p className="text-sm text-slate-600">Todavía no hay eventos adicionales para esta guía.</p>}</div>
      </section>
      <button onClick={() => void search(searched)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-violet-300 disabled:opacity-50"><RefreshCw size={16} /> Actualizar estado</button>
    </div>}
  </main>;
};
