import React from 'react';
import { Truck, ShieldCheck, ShoppingBag, Store, Sparkles, MapPin, Mail, Phone, ExternalLink, MessageCircle, Code2, Download, Flame } from 'lucide-react';
import { SiteThemeConfig } from '../types';

interface FooterProps {
  onNav: (view: 'explore' | 'catalogs' | 'dropship' | 'track' | 'partner' | 'admin') => void;
  onOpenAuth: () => void;
  onOpenDownloadZip?: () => void;
  config?: SiteThemeConfig;
}

export const Footer: React.FC<FooterProps> = ({ onNav, onOpenAuth, onOpenDownloadZip, config }) => {
  const siteName = config?.siteName || 'SANPI';
  const siteTagline = config?.siteTagline || 'MARKET';
  const siteSlogan = config?.siteSlogan || 'La Magia de comprar Online';
  const supportPhone = config?.supportWhatsApp || '18096766690';
  const displayPhone = supportPhone.replace(/^1/, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') || '809-676-6690';

  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-600 text-xs mt-16">
      <div className="max-w-[1600px] xl:max-w-[1720px] 2xl:max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-12 space-y-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Col 1 & 2: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNav('explore')}>
              {config?.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={siteName}
                  referrerPolicy="no-referrer"
                  style={{ height: `${Math.min(config.logoHeight || 36, 48)}px` }}
                  className="max-w-[160px] object-contain"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs text-white font-extrabold text-lg tracking-tight"
                  style={{ backgroundColor: config?.primaryColor || '#0f172a' }}
                >
                  <span>{siteName.charAt(0)}</span>
                </div>
              )}
              
              {(!config?.logoUrl || config.logoUrl.trim() === '') && (
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl text-slate-900 tracking-tight">{siteName}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold uppercase">
                    {siteTagline}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              "{siteSlogan}". El ecosistema moderno de comercio electrónico y dropshipping con cobro contra entrega (COD) en República Dominicana.
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-800">
              <a
                href={`https://wa.me/${supportPhone}?text=Hola%20${encodeURIComponent(siteName)},%20necesito%20soporte`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold transition-all shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Soporte: <strong>{displayPhone}</strong></span>
              </a>
            </div>
          </div>

          {/* Col 3: Navegación */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Explorar</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNav('explore')} className="hover:text-slate-900 transition-colors cursor-pointer">
                  Catálogo de Artículos
                </button>
              </li>
              <li>
                <button onClick={() => onNav('catalogs')} className="hover:text-slate-900 transition-colors cursor-pointer">
                  Tiendas Verificadas
                </button>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-slate-900 transition-colors">
                  ¿Cómo Funciona?
                </a>
              </li>
              <li>
                <button onClick={() => onNav('track')} className="hover:text-slate-900 transition-colors cursor-pointer">
                  Rastrear Guía de Envío
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Negocios & Dropshipping */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Negocios</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNav('partner')} className="hover:text-slate-900 transition-colors cursor-pointer">
                  Registrar mi Tienda
                </button>
              </li>
              <li>
                <button onClick={() => onNav('dropship')} className="hover:text-slate-900 transition-colors cursor-pointer">
                  Hub de Dropshipping
                </button>
              </li>
              <li>
                <a href="#planes" className="hover:text-slate-900 transition-colors">
                  Planes & Membresías
                </a>
              </li>
              <li>
                <button onClick={onOpenAuth} className="hover:text-slate-900 transition-colors cursor-pointer">
                  Acceso a Panel de Usuario
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenDownloadZip ? onOpenDownloadZip : () => {
                    const link = document.createElement('a');
                    link.href = '/api/download-zip';
                    link.setAttribute('download', 'sanpi-market-firebase.zip');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-bold transition-colors cursor-pointer"
                >
                  <Flame className="w-3 h-3 text-orange-500" />
                  <span>Descargar ZIP (Firebase)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 5: Contacto & Cobertura */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Contacto & Soporte</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <a
                  href="https://wa.me/18096766690?text=Hola%20Sanpi%20Market,%20necesito%20asistencia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>WhatsApp Oficial: 809-676-6690</span>
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Santo Domingo & 32 Provincias</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>soporte@sanpimarket.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Developer Credit & Copyright Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <p>© {new Date().getFullYear()} Sanpi Market RD. Todos los derechos reservados.</p>
          </div>

          {/* INMARTAGO SRL Developer Signature with Direct WhatsApp Link */}
          <div className="flex flex-wrap items-center justify-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 shadow-2xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Code2 className="w-3.5 h-3.5 text-slate-800" />
              Desarrollado por <strong className="text-slate-900 font-bold">@inmartagosrl</strong>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <a
              href="https://wa.me/18094583731?text=Hola%20INMARTAGO%20SRL,%20me%20comunico%20desde%20Sanpi%20Market"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
              title="Mensaje directo a WhatsApp INMARTAGO SRL"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Contacto: 809-458-3731</span>
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};
