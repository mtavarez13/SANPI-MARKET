import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  Store,
  ShoppingBag,
  Star,
  CheckCircle2,
  PackageCheck,
  TrendingUp,
  Zap
} from 'lucide-react';
import { UserProfile, SiteThemeConfig } from '../types';
import { HeroVideoBackground } from './HeroVideoBackground';

interface HeroSectionProps {
  onExploreClick: () => void;
  onJoinClick: () => void;
  currentUser: UserProfile | null;
  totalProductsCount: number;
  totalStoresCount: number;
  config?: SiteThemeConfig;
}

// Golden magic stars configuration that grow from small to large and disappear after ~2 seconds
const MAGIC_STARS = [
  { id: 1, top: '-24px', left: '-14px', size: 24, delay: 0.1, duration: 2.2, maxScale: 1.5, type: 'sparkle' },
  { id: 2, top: '-28px', left: '38%', size: 20, delay: 0.5, duration: 2.0, maxScale: 1.4, type: 'star' },
  { id: 3, top: '-22px', right: '-18px', size: 26, delay: 0.9, duration: 2.3, maxScale: 1.6, type: 'sparkle' },
  { id: 4, bottom: '-16px', left: '12%', size: 16, delay: 0.3, duration: 1.9, maxScale: 1.3, type: 'star' },
  { id: 5, bottom: '-18px', right: '18%', size: 20, delay: 0.8, duration: 2.1, maxScale: 1.4, type: 'sparkle' },
  { id: 6, top: '22%', right: '-24px', size: 22, delay: 1.3, duration: 2.2, maxScale: 1.5, type: 'sparkle' },
  { id: 7, top: '28%', left: '-22px', size: 18, delay: 1.6, duration: 2.0, maxScale: 1.3, type: 'star' },
  { id: 8, top: '-10px', left: '72%', size: 16, delay: 1.1, duration: 2.0, maxScale: 1.3, type: 'star' },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreClick,
  onJoinClick,
  currentUser,
  totalProductsCount,
  totalStoresCount,
  config
}) => {
  const showMagicStars = config ? config.showGoldenMagicStars !== false : true;
  const siteSlogan = config?.siteSlogan || 'La Magia de comprar Online en República Dominicana';
  const siteSubtitle = config?.siteSubtitle || 'Descubre miles de artículos certificados de tiendas oficiales con pago 100% en efectivo al recibir en las 32 provincias o emprende con dropshipping sin inventario.';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-purple-100/80 bg-white shadow-xs p-6 sm:p-10 md:p-14 my-4">
      
      {/* Background Video (Configurable by Super Admin) */}
      {config && config.heroVideoEnabled && (
        <HeroVideoBackground config={config} />
      )}

      {/* Background Subtle Purple Tone & Glow Texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-50/40 via-white/80 to-purple-50/30 pointer-events-none z-0" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-100/40 rounded-full blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
        
        {/* Micro-Badges of Trust (Verified Reviews & Guarantee) */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50/90 text-purple-900 text-xs font-semibold border border-purple-200 backdrop-blur-xs shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span>Despacho Rápido 24-48h Sacha Pack</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-800 text-xs font-semibold border border-emerald-200/80 backdrop-blur-xs shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pago Contra Entrega COD</span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 text-slate-700 text-xs font-semibold border border-slate-200/80 backdrop-blur-xs shadow-2xs">
            <div className="flex text-amber-500">
              <Star className="w-3 h-3 fill-current" />
            </div>
            <span>4.9/5 Reseñas Verificadas</span>
          </div>
        </motion.div>

        {/* Main Headline & Slogan with Animated Golden Magic Stars */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-3 sm:space-y-4 max-w-4xl mx-auto"
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.14]">
            {/* "La Magia" with Animated Golden Magic Stars */}
            <span className="relative inline-block">
              {/* Golden Stars scaling from small to big, glowing and vanishing after ~2s */}
              {showMagicStars && MAGIC_STARS.map((star) => (
                <motion.span
                  key={star.id}
                  className="absolute pointer-events-none z-20 select-none"
                  style={{
                    top: star.top,
                    left: star.left,
                    right: (star as any).right,
                    bottom: (star as any).bottom,
                  }}
                  initial={{ scale: 0, opacity: 0, rotate: 0 }}
                  animate={{
                    scale: [0, 0.35, star.maxScale, 1.05, 0],
                    opacity: [0, 0.95, 1, 0.85, 0],
                    rotate: [0, 45, 90, 180, 260],
                    y: [0, -4, -12, -18, -26],
                    x: [0, 3, -2, 4, 0],
                  }}
                  transition={{
                    duration: star.duration,
                    delay: star.delay,
                    repeat: Infinity,
                    repeatDelay: 0.6,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  {star.type === 'sparkle' ? (
                    /* 4-Point Golden Magic Sparkle Star */
                    <svg
                      viewBox="0 0 24 24"
                      width={star.size}
                      height={star.size}
                      className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.95)]"
                    >
                      <path
                        fill="currentColor"
                        d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z"
                      />
                    </svg>
                  ) : (
                    /* 5-Point Golden Magic Star */
                    <svg
                      viewBox="0 0 24 24"
                      width={star.size}
                      height={star.size}
                      className="text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]"
                    >
                      <polygon
                        fill="currentColor"
                        points="12,1.5 15.3,8.2 22.7,9.3 17.3,14.6 18.6,22 12,18.5 5.4,22 6.7,14.6 1.3,9.3 8.7,8.2"
                      />
                    </svg>
                  )}
                </motion.span>
              ))}

              <span className="text-purple-700 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 bg-clip-text text-transparent underline decoration-amber-400/70 underline-offset-8">
                La Magia
              </span>
            </span>{' '}
            {siteSlogan.includes('La Magia') ? siteSlogan.replace('La Magia', '').trim() : siteSlogan}
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            {siteSubtitle}
          </p>
        </motion.div>

        {/* High-Conversion Main CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-1"
        >
          <button
            onClick={onExploreClick}
            id="hero-explore-cta"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-98 cursor-pointer group"
          >
            <ShoppingBag className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
            <span>Explorar Catálogo</span>
            <ArrowRight className="w-4 h-4 text-purple-200 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onJoinClick}
            id="hero-join-cta"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-purple-50 text-purple-900 font-bold text-sm transition-all border border-purple-200 hover:border-purple-300 shadow-2xs flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <Store className="w-4 h-4 text-purple-700" />
            <span>
              {currentUser ? 'Acceder a mi Panel' : 'Vender / Ser Dropshipper'}
            </span>
          </button>
        </motion.div>

        {/* 3 Core Minimalist Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 text-left"
        >
          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-purple-100 shadow-2xs space-y-1">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
              <Truck className="w-4 h-4 text-purple-700" />
              <span>Flete Fijo Nacional</span>
            </div>
            <div className="text-base font-extrabold text-slate-900">RD$ 350 COD</div>
            <p className="text-xs text-slate-500 leading-snug">
              Despacho express a 32 provincias vía Sacha Pack en 24 a 48 horas.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-purple-100 shadow-2xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Pago Contra Entrega</span>
            </div>
            <div className="text-base font-extrabold text-slate-900">100% en Efectivo</div>
            <p className="text-xs text-slate-500 leading-snug">
              Pagas al mensajero cuando tengas el producto en tus manos.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-purple-100 shadow-2xs space-y-1">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
              <PackageCheck className="w-4 h-4 text-purple-700" />
              <span>Garantía & Dropshipping</span>
            </div>
            <div className="text-base font-extrabold text-slate-900">30 Días de Cobertura</div>
            <p className="text-xs text-slate-500 leading-snug">
              Control de calidad previo a despacho y soporte humano directo.
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
