import React, { useState } from 'react';
import { ArrowRight, Package, Store, Truck, Wallet, ArrowUpRight, Search } from 'lucide-react';
import type { UserProfile, SiteThemeConfig, Article } from '../types';
import { HeroVideoBackground } from './HeroVideoBackground';

interface HeroSectionProps {
  onExploreClick: () => void;
  onJoinClick: () => void;
  showJoinAction?: boolean;
  currentUser: UserProfile | null;
  totalProductsCount: number;
  totalStoresCount: number;
  config?: SiteThemeConfig;
  featuredArticles?: Article[];
  onSelectArticle?: (article: Article) => void;
  onTrackSearch: (guide: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExploreClick, onJoinClick, showJoinAction = true, onTrackSearch, currentUser, totalProductsCount, totalStoresCount, config, featuredArticles = [], onSelectArticle }) => {
  const [guide, setGuide] = useState('');
  const products = featuredArticles.slice(0, 4);
  return <section className="market-hero relative overflow-hidden rounded-[28px] border border-slate-200 bg-[#eeedf8] my-2">
    {config?.heroVideoEnabled && <HeroVideoBackground config={config} />}
    <div className="relative z-10 grid lg:grid-cols-[1.1fr_.9fr] gap-8 p-6 sm:p-10 xl:p-12 items-center">
      <div>
        <p className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-semibold tracking-[0.18em] uppercase text-violet-800"><span className="w-6 h-px bg-violet-600" /> Tu marketplace en República Dominicana</p>
        <form onSubmit={event => { event.preventDefault(); if (guide.trim()) onTrackSearch(guide.trim()); }} className="mt-6 max-w-xl rounded-2xl border border-violet-200 bg-white p-3 shadow-sm">
          <label htmlFor="hero-tracking-guide" className="mb-2 block text-xs font-semibold text-slate-700">Rastrea tu paquete</label>
          <div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="hero-tracking-guide" value={guide} onChange={event => setGuide(event.target.value)} placeholder="Guía Sanpi o de la transportadora" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-violet-500" /></div><button type="submit" disabled={!guide.trim()} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50">Consultar</button></div>
        </form>
        <h1 className="mt-6 text-4xl sm:text-5xl xl:text-6xl font-semibold tracking-[-0.05em] leading-[1.08] text-slate-950">{config?.siteSlogan || 'Encuentra eso que va contigo.'}</h1>
        <p className="mt-5 text-sm sm:text-base leading-relaxed text-slate-600 max-w-lg">{config?.siteSubtitle || 'Descubre productos, conecta con tiendas locales y recibe tus compras en la puerta de tu casa.'}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button id="hero-explore-cta" onClick={onExploreClick} className="inline-flex items-center gap-3 rounded-xl bg-slate-950 text-white px-6 py-3.5 text-sm font-semibold hover:bg-violet-800 transition-colors">Explorar productos <ArrowRight size={17} /></button>
          {showJoinAction && <button id="hero-join-cta" onClick={onJoinClick} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-5 py-3.5 text-sm font-semibold hover:bg-white transition-colors">{currentUser ? 'Ir a mi panel' : 'Quiero vender'} <ArrowUpRight size={16} /></button>}
        </div>
        <div className="mt-8 flex gap-7 text-xs text-slate-500"><span><strong className="block text-xl font-semibold text-slate-900 mb-1">{totalProductsCount.toLocaleString('es-DO')}</strong>Productos disponibles</span><span className="border-l border-slate-300 pl-7"><strong className="block text-xl font-semibold text-slate-900 mb-1">{totalStoresCount.toLocaleString('es-DO')}</strong>Tiendas en el marketplace</span></div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 items-center" aria-label="Cuatro productos destacados del marketplace">
        {products.length ? products.map((article) => <button key={article.id} onClick={() => onSelectArticle?.(article)} className="market-feature text-left rounded-2xl bg-white p-3 sm:p-4 shadow-sm border border-violet-100 hover:border-violet-300 hover:shadow-lg transition-all">
          <div className="relative overflow-hidden rounded-xl bg-slate-100 aspect-[4/3]"><img src={article.image || article.images?.[0]} alt={article.title || article.name} className="w-full h-full object-cover" /><span className="absolute top-2 left-2 rounded-full bg-violet-700 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white">Destacado</span></div>
          <p className="mt-3 truncate text-xs font-semibold text-slate-800">{article.title || article.name}</p><p className="mt-1 text-sm font-bold">{new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(article.price)}</p>
        </button>) : <div className="col-span-2 rounded-3xl bg-white/70 border border-white p-10 text-center"><Store className="mx-auto h-14 w-14 text-violet-500" /><p className="mt-5 text-xl font-semibold">Muchas tiendas. Un solo lugar.</p><p className="mt-2 text-sm text-slate-500">Descubre lo que tiene Sanpi para ti.</p></div>}
      </div>
    </div>
    <div className="relative z-10 grid sm:grid-cols-3 gap-4 border-t border-slate-200/70 bg-white/80 px-6 sm:px-10 py-5 text-xs">
      {[{ icon: Truck, title: 'Envíos a todo el país', text: 'Cobertura en las 32 provincias' }, { icon: Wallet, title: 'Pago contra entrega', text: 'Paga al recibir tu pedido' }, { icon: Package, title: 'Sigue cada compra', text: 'Consulta el estado de tu orden' }].map(item => <div key={item.title} className="flex items-center gap-3"><item.icon size={21} strokeWidth={1.5} className="text-violet-700 shrink-0" /><div><p className="font-semibold text-slate-800">{item.title}</p><p className="text-slate-500 mt-1">{item.text}</p></div></div>)}
    </div>
  </section>;
};
