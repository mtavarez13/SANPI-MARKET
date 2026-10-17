import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, writeBatch } from 'firebase/firestore';
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const available = eligibleFeaturedArticles(articles);

  useEffect(() => {
    return onSnapshot(doc(db, 'featured_placements', 'homepage'), snapshot => {
      const placements = parseFeaturedPlacements(snapshot.data());
      setDraft(Array.from({ length: 4 }, (_, index) => placements[index] || { articleId: '', advertisingFee: 0 }));
    }, () => setMessage('No se pudo leer la configuración privada de publicidad. Comprueba tu acceso de administrador.'));
  }, []);

  const change = (index: number, update: Partial<FeaturedPlacement>) => {
    setDraft(previous => previous.map((item, slot) => slot === index ? { ...item, ...update } : item));
    setMessage('');
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
      <p className="mt-3 max-w-2xl text-sm text-slate-300">Selecciona cuatro artículos para la portada y define el costo publicitario de cada espacio. El importe queda registrado en la configuración; no se cobra automáticamente.</p>
    </header>

    <form onSubmit={save} className="space-y-5">
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
            <label className="mt-3 block text-xs font-semibold text-slate-700">Costo de publicidad (RD$)
              <input type="number" min="0.01" step="0.01" value={item.advertisingFee || ''} onChange={event => change(index, { advertisingFee: Number(event.target.value) })} className="order-input mt-1" required />
            </label>
            {article && <p className="mt-3 text-xs text-slate-500">Precio de venta: {money(article.price)}</p>}
          </div>;
        })}
      </div>
      {message && <p role="status" className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">Total de tarifas configuradas: <strong className="text-slate-950">{money(draft.reduce((sum, item) => sum + (Number.isFinite(item.advertisingFee) ? item.advertisingFee : 0), 0))}</strong></p>
        <button disabled={saving} className="rounded-xl bg-violet-700 px-6 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50">{saving ? 'Publicando…' : 'Publicar cuatro destacados'}</button>
      </div>
    </form>
  </section>;
};
