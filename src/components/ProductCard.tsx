import React, { useState } from 'react';
import { ShoppingBag, Star, ShieldCheck, Check, Sparkles, Eye, ArrowUpRight } from 'lucide-react';
import { Article, UserProfile } from '../types';

interface ProductCardProps {
  article: Article;
  onSelect: (article: Article) => void;
  onAddToCart: (article: Article) => void;
  onResell?: (article: Article) => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  article,
  onSelect,
  onAddToCart,
  onResell,
  currentUser,
  onOpenAuthModal
}) => {
  const [added, setAdded] = useState(false);
  const [imgHovered, setImgHovered] = useState(false);

  const price = article.price;
  const compareAtPrice = article.compareAtPrice;
  const discountPercent =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const mainImage =
    article.imageUrl ||
    article.image ||
    (article.images && article.images.length > 0 ? article.images[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600');
  
  const secondaryImage =
    article.images && article.images.length > 1
      ? article.images[1]
      : mainImage;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(article);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleResellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    if (onResell) {
      onResell(article);
    }
  };

  return (
    <div
      onClick={() => onSelect(article)}
      className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md cursor-pointer"
    >
      {/* 1. Image Area with Badges & Hover Effect */}
      <div
        className="relative aspect-square sm:aspect-[4/3] w-full bg-slate-50 overflow-hidden flex items-center justify-center"
        onMouseEnter={() => setImgHovered(true)}
        onMouseLeave={() => setImgHovered(false)}
      >
        <img
          src={imgHovered ? secondaryImage : mainImage}
          alt={article.title || article.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          loading="lazy"
        />

        {/* Floating Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between pointer-events-none gap-2">
          <div className="flex flex-col gap-1">
            {discountPercent > 0 && (
              <span className="bg-slate-900 text-white font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-full shadow-xs tracking-tight">
                -{discountPercent}%
              </span>
            )}
            {article.isFeatured && (
              <span className="bg-amber-500 text-white font-bold text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                Destacado
              </span>
            )}
          </div>

          <span className="bg-white/95 backdrop-blur-xs text-emerald-800 border border-emerald-200/60 font-bold text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>COD 100%</span>
          </span>
        </div>

        {/* Quick View Floating Overlay on Desktop */}
        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3 pointer-events-none sm:pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(article);
            }}
            className="w-full py-2 px-3 rounded-xl bg-white/95 backdrop-blur-xs hover:bg-white text-slate-900 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-200"
          >
            <Eye className="w-3.5 h-3.5 text-slate-700" />
            <span>Vista Rápida</span>
          </button>
        </div>
      </div>

      {/* 2. Content & Details Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          
          {/* Category & Store */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="truncate max-w-[120px]">{article.category}</span>
            <span className="truncate max-w-[110px] text-slate-400 font-mono text-[10px]">
              {article.storeName || 'Oficial'}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-slate-800 transition-colors">
            {article.title || article.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="font-bold text-slate-800 text-xs">
              {article.rating ? article.rating.toFixed(1) : '4.9'}
            </span>
            <span className="text-slate-400 text-[11px]">
              ({article.reviewCount || 18})
            </span>
          </div>
        </div>

        {/* 3. Pricing & Actions */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-xs text-slate-500 font-medium">RD$ </span>
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {price.toLocaleString()}
              </span>
            </div>

            {compareAtPrice && compareAtPrice > price && (
              <span className="text-xs line-through text-slate-400 font-medium">
                RD$ {compareAtPrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickAdd}
              id={`quick-add-${article.id}`}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer shadow-xs ${
                added
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-98'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>¡Agregado!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </>
              )}
            </button>

            {article.isDropshipping && (
              <button
                onClick={handleResellClick}
                title="Revender este producto y ganar comisión"
                className="px-2.5 py-2.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50 text-slate-700 hover:text-purple-700 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
