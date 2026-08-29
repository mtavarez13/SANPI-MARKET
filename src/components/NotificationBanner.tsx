import React from 'react';
import { Delivery } from '../types';
import { Volume2, X, Sparkles, Truck, ArrowRight } from 'lucide-react';
import { speakSanpi } from '../lib/audioTTS';

interface NotificationBannerProps {
  order: Delivery | null;
  onDismiss: () => void;
  onViewOrder: (order: Delivery) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ order, onDismiss, onViewOrder }) => {
  if (!order) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-gradient-to-r from-purple-900 via-purple-950 to-slate-950 text-white rounded-3xl p-5 shadow-2xl border-2 border-yellow-400/80 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-3">
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-yellow-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                ¡NUEVA ORDEN SANPI!
              </span>
              <span className="text-[10px] text-purple-300 font-bold">{order.trackingNumber}</span>
            </div>

            <h4 className="font-extrabold text-sm text-white leading-snug">
              {order.articleName}
            </h4>

            <p className="text-xs text-purple-200">
              Cliente: <strong>{order.customerName}</strong> en <strong>{order.province}</strong> • RD$ {order.totalCodAmount.toLocaleString()} COD
            </p>
          </div>
        </div>

        <button onClick={onDismiss} className="text-purple-300 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-purple-800/80 flex items-center justify-between gap-2">
        <button
          onClick={() => speakSanpi()}
          className="bg-purple-800/80 hover:bg-purple-800 text-yellow-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-yellow-400/30"
        >
          <Volume2 className="w-3.5 h-3.5" />
          Voz "Sanpi"
        </button>

        <button
          onClick={() => {
            onViewOrder(order);
            onDismiss();
          }}
          className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md"
        >
          <span>Ver Guía COD</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
