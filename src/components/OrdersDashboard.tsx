import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Package, Search, ShoppingBag, Truck } from 'lucide-react';
import type { Delivery, LandingPageConfig, Store, UserProfile } from '../types';
import { canViewOrders, isDropshippingOrder, ORDER_STATUSES, visibleOrders } from '../lib/orderVisibility';
import { isSuperAdmin } from '../lib/authService';

interface Props { currentUser: UserProfile | null; deliveries: Delivery[]; stores: Store[]; landingPages: LandingPageConfig[] }
const money = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value || 0);
const date = (value: string) => Number.isNaN(Date.parse(value)) ? 'Sin fecha' : new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium' }).format(new Date(value));

export const OrdersDashboard: React.FC<Props> = ({ currentUser, deliveries, stores, landingPages }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [storeId, setStoreId] = useState('all');
  const [channel, setChannel] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const superAdmin = isSuperAdmin(currentUser?.email);
  const admin = superAdmin || currentUser?.role === 'admin';
  const scoped = useMemo(() => visibleOrders(currentUser, deliveries, stores, landingPages, superAdmin), [currentUser, deliveries, stores, landingPages, superAdmin]);
  const storeNames = useMemo(() => new Map(stores.map(s => [s.id, s.name])), [stores]);
  const availableStores = stores.filter(s => admin || scoped.some(order => order.storeId === s.id));
  const filtered = useMemo(() => scoped.filter(order => {
    const text = [order.id, order.trackingNumber, order.customerName, order.articleName, order.dropshipperName, storeNames.get(order.storeId)].join(' ').toLocaleLowerCase('es');
    const created = new Date(order.createdAt);
    const localDay = Number.isNaN(created.getTime()) ? '' : `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
    return text.includes(search.trim().toLocaleLowerCase('es')) && (status === 'all' || order.status === status) &&
      (storeId === 'all' || order.storeId === storeId) &&
      (channel === 'all' || (channel === 'dropshipping' ? isDropshippingOrder(order) : !isDropshippingOrder(order))) &&
      (!from || localDay >= from) && (!to || (!!localDay && localDay <= to));
  }).sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)), [scoped, search, status, storeId, channel, from, to, storeNames]);
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const activePage = Math.min(page, pages);
  const shown = filtered.slice((activePage - 1) * 12, activePage * 12);
  const setFilter = (setter: (s: string) => void, value: string) => { setter(value); setPage(1); setExpanded(null); };
  const reset = () => { setSearch(''); setStatus('all'); setStoreId('all'); setChannel('all'); setFrom(''); setTo(''); setPage(1); setExpanded(null); };
  if (!canViewOrders(currentUser, superAdmin)) return <section className="rounded-2xl border bg-white p-10 text-center"><Package className="mx-auto mb-4 text-slate-400" /><h1 className="text-xl font-bold">Panel de órdenes</h1><p className="mt-2 text-slate-500">Inicia sesión con una cuenta de administrador, tienda o dropshipper para consultar tus órdenes.</p></section>;
  const metrics = [
    { label: 'Órdenes', value: filtered.length, icon: ShoppingBag, color: 'text-violet-600 bg-violet-50' },
    { label: 'En tránsito', value: filtered.filter(d => d.status === 'en tránsito').length, icon: Truck, color: 'text-blue-600 bg-blue-50' },
    { label: 'Entregadas', value: filtered.filter(d => d.status === 'entregado').length, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Valor entregado', value: money(filtered.filter(d => d.status === 'entregado').reduce((sum, d) => sum + d.totalCodAmount, 0)), icon: ArrowDownLeft, color: 'text-slate-600 bg-slate-100' },
  ];
  return <section className="orders-dashboard pb-12 space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 pt-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">{admin ? 'Administración · Marketplace' : currentUser?.role === 'partner' ? 'Mi tienda' : 'Mi negocio · Pimdrop'}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">{admin ? 'Todas las órdenes' : 'Mis órdenes'}</h1>
        <p className="mt-2 text-sm text-slate-500">{admin ? 'Supervisa las ventas de todas las tiendas y de Pimdrop.' : 'Consulta el estado y el detalle de las órdenes asociadas a tu cuenta.'}</p></div>
      <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">{scoped.length} órdenes en tu panel</span>
    </header>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">{metrics.map(m => <div key={m.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs"><div className="flex items-center justify-between gap-2"><span className="text-xs sm:text-sm text-slate-500">{m.label}</span><m.icon className={`h-9 w-9 rounded-xl p-2 ${m.color}`} /></div><p className="mt-4 text-xl sm:text-2xl font-bold tracking-tight break-words">{m.value}</p><p className="mt-1 text-[11px] text-slate-400">Según los filtros seleccionados</p></div>)}</div>
    <div className="flex flex-wrap gap-2" aria-label="Filtrar por estado"><button onClick={() => setFilter(setStatus, 'all')} aria-pressed={status === 'all'} className={`rounded-full border px-4 py-2 text-xs font-semibold ${status === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}>Todas <span className="ml-1">{scoped.length}</span></button>{Object.entries(ORDER_STATUSES).map(([key, value]) => <button key={key} onClick={() => setFilter(setStatus, key)} aria-pressed={status === key} className={`rounded-full border px-4 py-2 text-xs font-semibold ${status === key ? value.color : 'bg-white border-slate-200 text-slate-600'}`}>{value.label} <span className="ml-1 opacity-70">{scoped.filter(d => d.status === key).length}</span></button>)}</div>
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Registro de órdenes</h2><button onClick={reset} className="text-xs font-semibold text-violet-700 hover:underline">Limpiar filtros</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <label className="relative"><span className="sr-only">Buscar órdenes</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={e => setFilter(setSearch, e.target.value)} placeholder="Orden, cliente, producto o tienda" className="order-input pl-10" /></label>
          <label><span className="sr-only">Tienda</span><select aria-label="Tienda" className="order-input" value={storeId} onChange={e => setFilter(setStoreId, e.target.value)}><option value="all">Todas las tiendas</option>{availableStores.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
          <label><span className="sr-only">Canal de venta</span><select aria-label="Canal de venta" className="order-input" value={channel} onChange={e => setFilter(setChannel, e.target.value)}><option value="all">Todos los canales</option><option value="marketplace">Marketplace</option><option value="dropshipping">Pimdrop</option></select></label>
        </div>
        <div className="flex flex-wrap gap-3 items-center text-xs text-slate-500"><label className="flex items-center gap-2">Desde <input type="date" className="order-input w-auto" value={from} max={to || undefined} onChange={e => setFilter(setFrom, e.target.value)} /></label><label className="flex items-center gap-2">Hasta <input type="date" className="order-input w-auto" value={to} min={from || undefined} onChange={e => setFilter(setTo, e.target.value)} /></label><span className="sm:ml-auto" role="status">{filtered.length} resultados</span></div>
        {from && to && from > to && <p role="alert" className="text-sm text-rose-700">La fecha inicial debe ser anterior a la fecha final.</p>}
      </div>
      <div className="hidden lg:grid grid-cols-[1.2fr_1fr_1fr_.9fr_.9fr_40px] gap-4 px-6 py-3 bg-slate-50 text-[10px] uppercase tracking-wider font-semibold text-slate-500"><span>Orden / cliente</span><span>Tienda / canal</span><span>Fecha</span><span>Total</span><span>Estado</span><span /></div>
      {shown.length === 0 ? <div className="py-16 px-6 text-center"><Package className="h-10 w-10 mx-auto text-slate-300" /><h3 className="mt-4 font-bold">{scoped.length ? 'No encontramos órdenes con estos filtros' : 'Todavía no hay órdenes para mostrar'}</h3><p className="mt-2 text-sm text-slate-500">{scoped.length ? 'Prueba otra búsqueda o limpia los filtros.' : 'Las órdenes asociadas a tu cuenta aparecerán aquí.'}</p></div> : shown.map(order => {
        const state = ORDER_STATUSES[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
        const open = expanded === order.id;
        return <article key={order.id} className="border-b border-slate-100 last:border-b-0">
          <button onClick={() => setExpanded(open ? null : order.id)} aria-expanded={open} aria-controls={`order-${order.id}`} className="w-full text-left grid grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_.9fr_.9fr_40px] gap-4 items-center p-4 sm:px-6 sm:py-5 hover:bg-slate-50/80 transition-colors">
            <div className="min-w-0"><p className="text-sm font-bold truncate">{order.trackingNumber || order.id}</p><p className="text-xs text-slate-500 truncate mt-1">{order.customerName}</p></div>
            <div className="min-w-0"><p className="text-xs font-semibold truncate">{storeNames.get(order.storeId) || 'Tienda no disponible'}</p><p className="mt-1 text-[11px] text-slate-400">{isDropshippingOrder(order) ? 'Pimdrop' : 'Marketplace'}</p></div>
            <span className="text-xs text-slate-500">{date(order.createdAt)}</span><span className="text-sm font-semibold">{money(order.totalCodAmount)}</span>
            <span className={`justify-self-start text-[11px] font-semibold border rounded-full px-2.5 py-1 ${state.color}`}>{state.label}</span><ChevronDown className={`h-4 w-4 justify-self-end text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && <div id={`order-${order.id}`} className="bg-slate-50 px-4 sm:px-6 py-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-6 text-sm">
            <div><h3 className="font-bold mb-3">Detalle del pedido</h3><p>{order.articleName}</p><p className="text-xs text-slate-500 mt-2 break-all">ID: {order.id}</p><dl className="mt-4 space-y-2"><div className="flex justify-between gap-3"><dt className="text-slate-500">Producto</dt><dd>{money(order.basePrice)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Envío</dt><dd>{money(order.shippingFee)}</dd></div><div className="flex justify-between gap-3 font-semibold"><dt>Total</dt><dd>{money(order.totalCodAmount)}</dd></div></dl><p className="mt-3 text-xs text-slate-500">Pago: {order.paymentMethod || 'No especificado'}</p>{order.dropshipperName && <p className="mt-2 text-xs text-slate-500">Dropshipper: {order.dropshipperName}</p>}</div>
            <div><h3 className="font-bold mb-3">Cliente y entrega</h3><p>{order.customerName}</p><p className="text-slate-500 mt-1">{order.customerPhone}</p><p className="text-slate-500 mt-3">{order.address}</p><p className="text-slate-500">{order.city}, {order.province}</p><p className="text-xs text-slate-500 mt-3">Transportista: {order.carrierName || order.logisticsProviderName || 'Por asignar'}</p>{order.notes && <p className="text-xs text-slate-500 mt-3">Notas: {order.notes}</p>}</div>
            <div><h3 className="font-bold mb-3">Historial de estados</h3>{order.history?.length ? <ol className="border-l-2 border-violet-100 pl-4 space-y-4">{[...order.history].sort((a,b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)).map((entry, i) => <li key={i}><p className="text-xs font-semibold">{ORDER_STATUSES[entry.status as keyof typeof ORDER_STATUSES]?.label || entry.status}</p><p className="text-[11px] text-slate-400 mt-1">{date(entry.date)}</p><p className="text-xs text-slate-500 mt-1">{entry.note}</p></li>)}</ol> : <p className="text-xs text-slate-500">Sin movimientos registrados.</p>}</div>
          </div>}
        </article>;
      })}
      <footer className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-100 text-xs text-slate-500"><span>Página {activePage} de {pages}</span><div className="flex gap-2"><button aria-label="Página anterior" disabled={activePage <= 1} onClick={() => { setPage(activePage - 1); setExpanded(null); }} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30"><ChevronLeft size={16} /></button><button aria-label="Página siguiente" disabled={activePage >= pages} onClick={() => { setPage(activePage + 1); setExpanded(null); }} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30"><ChevronRight size={16} /></button></div></footer>
    </div>
  </section>;
}
