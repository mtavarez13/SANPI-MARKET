import React, { useMemo, useState } from 'react';
import { ArrowRight, Boxes, CircleDollarSign, PackageCheck, Truck } from 'lucide-react';
import type { Article, Delivery, Expense, LandingPageConfig, Store, Transaction, UserProfile } from '../types';
import { ORDER_STATUSES } from '../lib/orderVisibility';
import { normalizeDeliveryStatus } from '../lib/deliveryWorkflow';
import { storeDashboardData } from '../lib/storeDashboardData';

interface Props {
  currentUser: UserProfile;
  stores: Store[];
  articles: Article[];
  deliveries: Delivery[];
  transactions: Transaction[];
  expenses: Expense[];
  landingPages: LandingPageConfig[];
  onOpenOrders: () => void;
  onOpenAccounting: () => void;
}

const money = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
const date = (value: string) => value ? new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export const StoreDashboard: React.FC<Props> = ({ currentUser, stores, articles, deliveries, transactions, expenses, landingPages, onOpenOrders, onOpenAccounting }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const data = useMemo(() => storeDashboardData(currentUser, stores, articles, deliveries, transactions, expenses, landingPages),
    [currentUser, stores, articles, deliveries, transactions, expenses, landingPages]);
  const visibleOrders = data.orders.filter(order => statusFilter === 'all' || normalizeDeliveryStatus(order.status) === statusFilter).slice(0, 10);
  const statusEntries = Object.entries(ORDER_STATUSES);

  return <section className="space-y-6 pb-12" aria-label="Panel de tienda">
    <header className="rounded-3xl bg-gradient-to-br from-teal-950 via-emerald-900 to-teal-800 px-6 py-7 text-white shadow-lg sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-200">Panel de tienda</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-black sm:text-3xl">{data.stores.length === 1 ? data.stores[0].name : currentUser.storeName || 'Mis tiendas'}</h1><p className="mt-2 max-w-xl text-sm text-emerald-100">Inventario, entregas y resultado de tus paquetes en un solo lugar.</p></div>
        <button onClick={onOpenOrders} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-teal-950 hover:bg-emerald-50">Ver todas las órdenes <ArrowRight size={16} /></button>
      </div>
    </header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: 'Paquetes entregados', value: String(data.deliveredCount), icon: PackageCheck, note: `${data.orders.length} órdenes de tu tienda` },
        { label: 'Ventas entregadas', value: money(data.productSales), icon: CircleDollarSign, note: 'Valor de los productos entregados' },
        { label: 'Flete facturado', value: money(data.freightBilled), icon: Truck, note: 'Cobrado al cliente por transporte' },
        { label: 'Beneficio neto conocido', value: money(data.netProfit), icon: Boxes, note: 'Liquidación − costo − gastos registrados' },
      ].map(card => <article key={card.label} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-bold text-slate-500">{card.label}</h2><card.icon size={19} className="text-emerald-600" /></div><p className="mt-3 break-words text-2xl font-black text-teal-950">{card.value}</p><p className="mt-2 text-xs text-slate-500">{card.note}</p></article>)}
    </div>

    {(data.reviewCount > 0 || data.missingCostCount > 0) && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">El beneficio neto solo incluye entregas con comisión y costo conocidos. {data.reviewCount > 0 && `${data.reviewCount} entrega(s) tienen comisión pendiente de verificar. `}{data.missingCostCount > 0 && `${data.missingCostCount} entrega(s) no tienen costo registrado.`}</p>}

    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Estado de los paquetes</h2><p className="text-xs text-slate-500">Selecciona un estado para ver sus órdenes.</p></div><button onClick={onOpenOrders} className="text-sm font-bold text-emerald-700 hover:underline">Abrir órdenes</button></div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{statusEntries.map(([status, meta]) => <button key={status} onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)} aria-pressed={statusFilter === status} className={`rounded-xl border p-3 text-left transition ${meta.color} ${statusFilter === status ? 'ring-2 ring-emerald-500' : 'hover:shadow-sm'}`}><span className="block text-xs font-semibold">{meta.label}</span><strong className="mt-2 block text-2xl">{data.statusCounts[status] || 0}</strong></button>)}</div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Inventario y liquidación</h2><p className="text-xs text-slate-500">Existencias actuales y ventas entregadas.</p></div><button onClick={onOpenAccounting} className="text-sm font-bold text-emerald-700 hover:underline">Contabilidad</button></div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{[
          ['Unidades en inventario', data.inventoryUnits.toLocaleString('es-DO')],
          ['Inventario a costo', money(data.inventoryCost)],
          ['Inventario a precio de venta', money(data.inventoryRetail)],
          ['A recibir por entregas', money(data.storePending)],
          ['Pagado a la tienda', money(data.storePaid)],
          ['Costo de artículos entregados', money(data.productCosts)],
          ['Gastos registrados', money(data.expenses)],
          ['Pago a repartidores', money(data.driverPayments)],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-emerald-50/60 p-3"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 font-bold text-teal-950">{value}</dd></div>)}</dl>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">El flete y el pago al repartidor corresponden a la operación de transporte y se muestran separados del beneficio de la tienda. Los gastos registrados se descuentan del beneficio neto.</p>
      </article>
    </div>

    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><h2 className="text-lg font-black">Últimas órdenes {statusFilter !== 'all' && `· ${ORDER_STATUSES[statusFilter as keyof typeof ORDER_STATUSES]?.label || statusFilter}`}</h2>{statusFilter !== 'all' && <button onClick={() => setStatusFilter('all')} className="text-xs font-bold text-emerald-700">Mostrar todas</button>}</div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Guía', 'Fecha', 'Producto', 'Venta', 'Flete', 'Estado'].map(label => <th key={label} className="px-5 py-3 font-bold">{label}</th>)}</tr></thead><tbody>{visibleOrders.map(order => { const status = normalizeDeliveryStatus(order.status); const meta = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES]; return <tr key={order.id} className="border-t border-slate-100"><td className="px-5 py-3 font-bold text-slate-900">{order.trackingNumber}</td><td className="px-5 py-3 text-slate-500">{date(order.createdAt)}</td><td className="px-5 py-3">{order.articleName}{order.quantity && order.quantity > 1 ? ` × ${order.quantity}` : ''}</td><td className="px-5 py-3 font-semibold">{money(order.basePrice)}</td><td className="px-5 py-3">{money(order.deliveryFee ?? order.shippingFee ?? 0)}</td><td className="px-5 py-3"><span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold ${meta?.color || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{meta?.label || status}</span></td></tr>; })}</tbody></table>{!visibleOrders.length && <p className="p-6 text-sm text-slate-500">No hay paquetes en esta selección.</p>}</div></article>

    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Pagos de órdenes entregadas</h2><p className="text-xs text-slate-500">Consulta qué guías ya fueron liquidadas a tu tienda.</p></div><button onClick={onOpenOrders} className="text-sm font-bold text-emerald-700 hover:underline">Ver todas</button></div>
      <div className="mt-4 divide-y divide-slate-100">{data.orders.filter(order => normalizeDeliveryStatus(order.status) === 'entregado').slice(0, 10).map(order => <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><strong className="text-slate-900">{order.trackingNumber || order.id}</strong><p className="text-xs text-slate-500">{order.articleName}</p></div>{order.storePaidAt ? <div className="text-right"><strong className="text-emerald-700">Pagada{order.storePaidAmount !== undefined ? ` · ${money(order.storePaidAmount)}` : ''}</strong><p className="text-xs text-slate-500">{date(order.storePaidAt)}{order.storePaymentReference ? ` · ${order.storePaymentReference}` : ''}</p></div> : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Pendiente de pago</span>}</div>)}{!data.deliveredCount && <p className="py-4 text-sm text-slate-500">Aún no hay órdenes entregadas.</p>}</div>
    </article>

    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><h2 className="text-lg font-black">Artículos en inventario</h2><button onClick={onOpenAccounting} className="text-sm font-bold text-emerald-700 hover:underline">Ver detalle contable</button></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Artículo', 'Unidades', 'Costo unitario', 'Precio de venta', 'Valor a costo'].map(label => <th key={label} className="px-5 py-3 font-bold">{label}</th>)}</tr></thead><tbody>{data.articles.map(article => { const units = Math.max(0, article.stock ?? article.inventory ?? 0); const cost = Math.max(0, article.costPerItem ?? article.wholesalePrice ?? article.baseCost ?? 0); return <tr key={article.id} className="border-t border-slate-100"><td className="px-5 py-3 font-semibold">{article.title || article.name}</td><td className="px-5 py-3">{units}</td><td className="px-5 py-3">{money(cost)}</td><td className="px-5 py-3">{money(article.price)}</td><td className="px-5 py-3 font-bold">{money(units * cost)}</td></tr>; })}</tbody></table>{!data.articles.length && <p className="p-6 text-sm text-slate-500">Tu tienda aún no tiene artículos registrados.</p>}</div></article>
  </section>;
};
