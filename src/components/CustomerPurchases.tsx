import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ChevronDown, Package, Search, ShoppingBag, Truck } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { belongsToCustomer } from '../lib/customerPurchases';
import { ORDER_STATUSES } from '../lib/orderVisibility';
import type { Article, Delivery, Store, UserProfile } from '../types';

interface Props {
  currentUser: UserProfile;
  articles: Article[];
  stores: Store[];
  onExplore: () => void;
  onTrack: (guide: string) => void;
}

const money = (amount: number) => new Intl.NumberFormat('es-DO', {
  style: 'currency', currency: 'DOP', maximumFractionDigits: 2
}).format(amount || 0);

const date = (value?: string) => value && !Number.isNaN(Date.parse(value))
  ? new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Fecha no disponible';

export const CustomerPurchases: React.FC<Props> = ({ currentUser, articles, stores, onExplore, onTrack }) => {
  const [purchases, setPurchases] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setPurchases([]);
    setLoading(true);
    setError('');
    let unsubscribeOrders: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, firebaseUser => {
      unsubscribeOrders?.();
      unsubscribeOrders = undefined;
      if (!firebaseUser || firebaseUser.isAnonymous || firebaseUser.uid !== currentUser.uid) {
        setPurchases([]);
        setLoading(false);
        setError('Inicia sesión de nuevo para consultar tus compras.');
        return;
      }
      const ownOrders = query(collection(db, 'deliveries'), where('createdByUid', '==', firebaseUser.uid));
      unsubscribeOrders = onSnapshot(ownOrders, snapshot => {
        const next = snapshot.docs
          .map(item => ({ ...item.data(), id: item.id } as Delivery))
          .filter(order => belongsToCustomer(order, firebaseUser.uid))
          .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
        setPurchases(next);
        setLoading(false);
        setError('');
      }, () => {
        setLoading(false);
        setError('No pudimos cargar tus compras. Inténtalo de nuevo más tarde.');
      });
    });
    return () => {
      unsubscribeOrders?.();
      unsubscribeAuth();
    };
  }, [currentUser.uid]);

  const storeNames = useMemo(() => new Map(stores.map(store => [store.id, store.name])), [stores]);
  const articleImages = useMemo(() => new Map(articles.map(article => [article.id, article.image || article.images?.[0]])), [articles]);
  const visible = purchases.filter(order => [order.trackingNumber, order.articleName, storeNames.get(order.storeId)]
    .some(value => value?.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))));

  return <section className="mx-auto max-w-5xl space-y-6 pb-16 pt-4">
    <header className="rounded-3xl bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 px-5 py-8 text-white sm:px-9">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">Tu cuenta Sanpi</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Mis compras</h1>
      <p className="mt-2 max-w-2xl text-sm text-violet-100">Consulta tus pedidos, sus guías y cada actualización de entrega.</p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
        <ShoppingBag size={17} /> {purchases.length} {purchases.length === 1 ? 'compra' : 'compras'}
      </div>
    </header>

    {!loading && !error && purchases.length > 0 && <label className="relative block">
      <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
      <span className="sr-only">Buscar en mis compras</span>
      <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por producto, tienda o guía"
        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-violet-500" />
    </label>}

    {loading ? <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">Cargando tus compras…</p>
      : error ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">{error}</p>
      : purchases.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
        <Package className="mx-auto h-12 w-12 text-violet-500" />
        <h2 className="mt-4 text-xl font-bold">Todavía no hay compras en esta cuenta</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">Aquí aparecerán los pedidos realizados mientras hayas iniciado sesión con esta cuenta.</p>
        <button onClick={onExplore} className="mt-6 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800">Explorar productos</button>
      </div> : visible.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">No encontramos compras con esa búsqueda.</p>
      : <div className="space-y-4">{visible.map(order => {
        const status = ORDER_STATUSES[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
        const open = expanded === order.id;
        return <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button onClick={() => setExpanded(open ? null : order.id)} aria-expanded={open}
            className="flex w-full flex-wrap items-center gap-4 p-4 text-left hover:bg-slate-50 sm:p-5">
            {articleImages.get(order.articleId)
              ? <img src={articleImages.get(order.articleId)} alt="" className="h-16 w-16 rounded-xl object-cover" />
              : <div className="grid h-16 w-16 place-items-center rounded-xl bg-violet-50 text-violet-700"><Package /></div>}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{order.articleName}</p>
              <p className="mt-1 text-xs text-slate-500">{storeNames.get(order.storeId) || 'Tienda Sanpi'} · {date(order.createdAt)}</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">{order.trackingNumber}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${status.color}`}>{status.label}</span>
                <p className="mt-2 text-sm font-bold text-slate-900">{money(order.totalCodAmount)}</p>
              </div>
              <ChevronDown size={17} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {open && <div className="grid gap-5 border-t border-slate-100 bg-slate-50 p-5 sm:grid-cols-2">
            <div className="space-y-2 text-sm">
              <h2 className="font-bold text-slate-900">Detalle de compra</h2>
              <p>Producto: {money(order.basePrice)}</p>
              <p>Envío: {money(order.shippingFee)}</p>
              <p className="font-semibold">Total: {money(order.totalCodAmount)}</p>
              <p className="text-slate-600">Cantidad: {order.quantity || 1} · Pago: {order.paymentMethod || 'No especificado'}</p>
              <button onClick={() => onTrack(order.trackingNumber)} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-800"><Truck size={15} /> Rastrear paquete</button>
            </div>
            <div className="text-sm">
              <h2 className="font-bold text-slate-900">Actualizaciones</h2>
              {order.history?.length ? <ol className="mt-3 space-y-3 border-l-2 border-violet-200 pl-4">
                {[...order.history].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)).map((entry, index) =>
                  <li key={index}><p className="font-semibold">{ORDER_STATUSES[entry.status as keyof typeof ORDER_STATUSES]?.label || entry.status}</p><p className="text-xs text-slate-500">{date(entry.date)}</p>{entry.note && <p className="mt-1 text-xs text-slate-600">{entry.note}</p>}</li>)}
              </ol> : <p className="mt-3 text-slate-500">Sin actualizaciones todavía.</p>}
            </div>
          </div>}
        </article>;
      })}</div>}
  </section>;
};
