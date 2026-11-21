import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { eligibleFeaturedArticles, parseFeaturedPlacements, validateFeaturedPlacements, type FeaturedPlacement } from '../lib/featuredProducts';
import type { Article, UserProfile } from '../types';

interface Props {
  articles: Article[];
  currentUser: UserProfile | null;
}

const emptySlots = (): FeaturedPlacement[] => Array.from({ length: 4 }, () => ({ articleId: '', advertisingFee: 0 }));
const money = (amount: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount || 0);

export const FeaturedProductsManager: React.FC<Props> = ({ articles, currentUser }) => {
  const [draft, setDraft] = useState<FeaturedPlacement[]>(emptySlots);
  const [priceInputs, setPriceInputs] = useState<string[]>(Array(4).fill(''));
  const [saving, setSaving] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [message, setMessage] = useState('');
  const available = eligibleFeaturedArticles(articles);

  useEffect(() => {
    return onSnapshot(doc(db, 'featured_placements', 'homepage'), snapshot => {
      const placements = parseFeaturedPlacements(snapshot.data());
      setDraft(Array.from({ length: 4 }, (_, index) => placements[index] || { articleId: '', advertisingFee: 0 }));
      setPriceInputs(Array.from({ length: 4 }, (_, index) => placements[index]?.advertisingFee ? String(placements[index].advertisingFee) : ''));
    }, () => setMessage('No se pudo leer la configuración privada de publicidad. Comprueba tu acceso de administrador.'));
  }, []);

  const change = (index: number, update: Partial<FeaturedPlacement>) => {
    setDraft(previous => previous.map((item, slot) => slot === index ? { ...item, ...update } : item));
    setMessage('');
  };

  const changePrice = (index: number, value: string) => {
    setPriceInputs(previous => previous.map((price, slot) => slot === index ? value : price));
    change(index, { advertisingFee: value === '' ? 0 : Number(value) });
  };

  const savePrices = async () => {
    if (currentUser?.role !== 'admin' || !auth.currentUser || auth.currentUser.isAnonymous) {
      setMessage('Inicia sesión con una cuenta administradora de Google para guardar los precios.');
      return;
    }
    if (draft.some(item => !Number.isFinite(item.advertisingFee) || item.advertisingFee <= 0)) {
      setMessage('Indica un precio mayor que cero para cada uno de los cuatro espacios.');
      return;
    }
    setSavingPrices(true);
    try {
      await setDoc(doc(db, 'featured_placements', 'homepage'), {
        items: draft,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser.uid
      }, { merge: true });
      setMessage('Precios guardados. La portada solo cambiará cuando publiques los productos destacados.');
    } catch {
      setMessage('No se pudieron guardar los precios. Comprueba tu sesión y conexión.');
    } finally {
      setSavingPrices(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (currentUser?.role !== 'admin' || !auth.currentUser || auth.currentUser.isAnonymous) {
      setMessage('Inicia sesión con una cuenta administradora de Google para publicar destacados.');
      return;
    }
    const error = validateFeaturedPlacements(draft, articles);
    if (error) { setMessage(error); return; }
    setSaving(true);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'featured_placements', 'homepage'), {
        items: draft,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser.uid
      });
      batch.set(doc(db, 'featured_public', 'homepage'), {
        articleIds: draft.map(item => item.articleId),
        updatedAt: new Date().toISOString()
      });
      await batch.commit();
      setMessage('Los cuatro destacados fueron publicados.');
    } catch {
      setMessage('No se pudo publicar. Comprueba tu sesión de Google, permisos y conexión.');
    } finally {
      setSaving(false);
    }
  };

  return <section className="pb-12 space-y-6">
    <header className="rounded-[28px] bg-slate-950 px-6 py-8 text-white sm:px-9">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">Publicidad del marketplace</p>
      <h1 className="mt-2 text-3xl font-bold">Productos destacados</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-300">Define el precio de cada espacio publicitario y elige los cuatro artículos que aparecerán en la portada.</p>
    </header>

    <div className="rounded-2xl border border-violet-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Precios de publicidad</h2>
          <p className="mt-1 text-sm text-slate-600">Fija el monto en RD$ para cada anuncio. Puedes guardar los precios antes de seleccionar los productos.</p>
        </div>
        <p className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-800">Total: {money(draft.reduce((sum, item) => sum + (Number.isFinite(item.advertisingFee) ? item.advertisingFee : 0), 0))}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {draft.map((_, index) => <label key={index} className="block rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-800">
          Anuncio {index + 1} · Precio (RD$)
          <input type="number" min="0.01" step="0.01" value={priceInputs[index]} onChange={event => changePrice(index, event.target.value)} className="order-input mt-2" aria-label={`Precio de publicidad del anuncio ${index + 1}`} />
        </label>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">El precio queda registrado para el administrador. El cobro se gestiona por separado.</p>
        <button type="button" onClick={savePrices} disabled={savingPrices || saving} className="rounded-xl border border-violet-700 px-5 py-2.5 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-50">{savingPrices ? 'Guardando precios…' : 'Guardar precios'}</button>
      </div>
    </div>

    {message && <p role="status" className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">{message}</p>}

    <form onSubmit={save} className="space-y-5">
      <h2 className="text-lg font-bold text-slate-950">Artículos para la portada</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {draft.map((item, index) => {
          const article = available.find(candidate => candidate.id === item.articleId);
          return <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-700">Espacio {index + 1}</p>
            <div className="mt-3 aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
              {article ? <img src={article.image || article.images?.[0]} alt={article.title || article.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Selecciona un artículo</div>}
            </div>
            <label className="mt-4 block text-xs font-semibold text-slate-700">Artículo
              <select value={item.articleId} onChange={event => change(index, { articleId: event.target.value })} className="order-input mt-1" required>
                <option value="">Seleccionar artículo</option>
                {available.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.title || candidate.name} · {money(candidate.price)}</option>)}
              </select>
            </label>
            <p className="mt-3 text-sm font-bold text-violet-800">Publicidad: {money(item.advertisingFee)}</p>
            {article && <p className="mt-1 text-xs text-slate-500">{article.storeName || 'Tienda'} · Precio de venta: {money(article.price)}</p>}
          </div>;
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">Publicar también guarda los precios actuales. Los productos aparecerán en la portada.</p>
        <button disabled={saving} className="rounded-xl bg-violet-700 px-6 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50">{saving ? 'Publicando…' : 'Publicar cuatro destacados'}</button>
      </div>
    </form>
  </section>;
};
