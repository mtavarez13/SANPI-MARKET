import React from 'react';
import { ArrowRight, Boxes, PackageCheck, ShoppingBag, Truck } from 'lucide-react';

interface Props { onExplore: () => void; onTrack: () => void }

const services = [
  { icon: Boxes, title: 'Fulfillment', text: 'Tu tienda vende mientras el inventario y la preparación de pedidos se coordinan con la operación logística.' },
  { icon: Truck, title: 'Última milla', text: 'Cada envío tiene una guía para seguir su avance desde el despacho hasta la entrega.' },
  { icon: ShoppingBag, title: 'Marketplace para tiendas', text: 'Un catálogo público reúne productos, tiendas y ofertas en una experiencia sencilla para comprar.' },
];

export const MarketplaceServices: React.FC<Props> = ({ onExplore, onTrack }) => <section id="servicios" className="overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-6 text-white sm:p-10">
  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Sanpi Market · logística conectada</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">De la vitrina a la puerta de tu cliente.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-violet-100">La experiencia de tienda del marketplace se une al seguimiento de Sacha Pack: descubre, compra y consulta cada guía desde un mismo lugar.</p></div>
    <div className="flex shrink-0 flex-wrap gap-2"><button onClick={onExplore} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-violet-950 hover:bg-violet-100">Ver productos <ArrowRight size={15} /></button><button onClick={onTrack} className="inline-flex items-center gap-2 rounded-xl border border-white/35 px-4 py-3 text-xs font-bold text-white hover:bg-white/10"><PackageCheck size={15} /> Rastrear envío</button></div>
  </div>
  <div className="mt-8 grid gap-3 md:grid-cols-3">{services.map(service => <div key={service.title} className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm"><div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-400/20 text-violet-100"><service.icon size={22} /></div><h3 className="mt-5 text-lg font-bold">{service.title}</h3><p className="mt-2 text-sm leading-relaxed text-violet-100/85">{service.text}</p></div>)}</div>
</section>;
