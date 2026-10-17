import React from 'react';
import { MessageCircle, Headphones, Sparkles } from 'lucide-react';

interface FloatingWhatsAppProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  phoneNumber = '18096766690',
  defaultMessage = 'Hola Sanpi Market, necesito asistencia con una orden o servicio.'
}) => {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.startsWith('1') ? cleanPhone : `1${cleanPhone}`;
  const waUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 group">
      {/* Floating Action Button */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="floating-whatsapp-support"
        className="flex h-12 w-12 sm:h-auto sm:w-auto items-center justify-center sm:justify-start sm:gap-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 text-white sm:pl-4 sm:pr-5 sm:py-3 rounded-full shadow-xl shadow-emerald-600/30 border border-emerald-400/30 hover:scale-105 hover:shadow-emerald-500/40 active:scale-95 transition-all duration-300 group"
        aria-label="Soporte oficial por WhatsApp"
        title="WhatsApp Oficial Sanpi: 809-676-6690"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform">
            <MessageCircle className="w-5 h-5 text-white fill-white/20" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        </div>

        <div className="hidden sm:block text-left leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1">
              <Headphones className="w-2.5 h-2.5" /> Soporte Oficial
            </span>
          </div>
          <span className="text-xs font-black text-white block">
            WhatsApp 809-676-6690
          </span>
        </div>
      </a>
    </div>
  );
};
