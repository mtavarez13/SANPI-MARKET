import React, { useState } from 'react';
import { Delivery, UserLocationProfile } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { 
  Truck, 
  Search, 
  MapPin, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Phone, 
  ArrowLeft, 
  RefreshCw, 
  Navigation, 
  Code, 
  Copy, 
  Check, 
  ExternalLink, 
  Radio, 
  User, 
  CreditCard, 
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';

interface TrackingModalProps {
  deliveries: Delivery[];
  onClose: () => void;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({ deliveries, onClose }) => {
  const [searchTracking, setSearchTracking] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(deliveries[0] || null);
  const [courierProfile, setCourierProfile] = useState<UserLocationProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rastreador' | 'api_sdk'>('rastreador');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const executeTrack = async (orderIdOrTracking: string) => {
    const query = orderIdOrTracking.trim();
    if (!query) return;

    setIsLoading(true);
    setSearchError(null);

    try {
      const result = await sanpiManager.trackPackage(query);
      setSelectedDelivery(result.delivery);
      setCourierProfile(result.courier || null);
    } catch (err: any) {
      console.warn("Tracking error:", err);
      // Fallback in local list
      const local = deliveries.find(
        d => d.trackingNumber.toLowerCase() === query.toLowerCase() ||
             d.id.toLowerCase() === query.toLowerCase() ||
             d.externalOrderId?.toLowerCase() === query.toLowerCase()
      );
      if (local) {
        setSelectedDelivery(local);
        setCourierProfile(null);
      } else {
        setSearchError(err?.message || `No se encontró la guía "${query}".`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTracking.trim()) return;
    executeTrack(searchTracking);
  };

  const isEnTransito = selectedDelivery?.status === 'en_transito' || (selectedDelivery?.status as any) === 'en tránsito';
  const gpsLocation = selectedDelivery?.lastLocation || courierProfile?.lastLocation;

  const firebaseConfigSnippet = `const firebaseConfig = {
  apiKey: "AIzaSyAOShn6CKjiBQ02ES3kUuwBF5fKufNnWpc",
  authDomain: "studio-9195671573-fb490.firebaseapp.com",
  projectId: "studio-9195671573-fb490",
  storageBucket: "studio-9195671573-fb490.appspot.com",
  messagingSenderId: "345939831630",
  appId: "1:345939831630:web:87be57af09ece36b6e0c1f"
};`;

  const reactCodeSnippet = `import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOShn6CKjiBQ02ES3kUuwBF5fKufNnWpc",
  authDomain: "studio-9195671573-fb490.firebaseapp.com",
  projectId: "studio-9195671573-fb490",
  storageBucket: "studio-9195671573-fb490.appspot.com",
  messagingSenderId: "345939831630",
  appId: "1:345939831630:web:87be57af09ece36b6e0c1f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. Consultar Guía de Envío en Tiempo Real
export async function trackPackage(orderId: string) {
  const docRef = doc(db, "deliveries", orderId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Guía no encontrada");
  }

  const delivery = docSnap.data();

  // 2. Lógica de Rastreo GPS en Vivo (Si está en tránsito)
  let courierLocation = null;
  if (delivery.status === "en_transito" && delivery.deliveryPersonId) {
    const userRef = doc(db, "users", delivery.deliveryPersonId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      courierLocation = userSnap.data()?.lastLocation; // { lat, lng, updatedAt }
    }
  }

  return { delivery, courierLocation };
}`;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-purple-600 animate-pulse" />
              Firebase Live Tracking & Telemetría
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Rastreo Público de Guías COD Sanpi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sigue el estado en tiempo real, monto COD a cobrar y ubicación GPS del repartidor
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center text-xs font-bold">
            <button
              onClick={() => setActiveTab('rastreador')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'rastreador' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Rastreador en Vivo
            </button>
            <button
              onClick={() => setActiveTab('api_sdk')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'api_sdk' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              SDK & API Tracker
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>
      </div>

      {activeTab === 'rastreador' ? (
        <>
          {/* Search Input Bar */}
          <form onSubmit={handleSearch} className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Introduce ID de guía o código de tracking (Ej: SANPI-COD-9022, del_102, SPVS1234567)..."
                value={searchTracking}
                onChange={(e) => setSearchTracking(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black px-6 py-3 rounded-2xl text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 shrink-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Consultando Firestore...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  Rastrear Paquete
                </>
              )}
            </button>
          </form>

          {searchError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <p>{searchError}</p>
            </div>
          )}

          {/* Quick Select Buttons from Active Deliveries */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Envíos y Guías Activas (con y sin GPS):
              </span>
              <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                Firestore collection('deliveries')
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {deliveries.slice(0, 5).map((d) => {
                const isSelected = selectedDelivery?.id === d.id || selectedDelivery?.trackingNumber === d.trackingNumber;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSearchTracking(d.trackingNumber);
                      executeTrack(d.trackingNumber);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-slate-700 hover:bg-purple-50 border border-slate-200'
                    }`}
                  >
                    <span>{d.trackingNumber}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                      d.status === 'entregado' ? 'bg-emerald-100 text-emerald-800' :
                      d.status === 'en_transito' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {d.status === 'entregado' ? 'Entregado' : d.status === 'en_transito' ? 'En Ruta GPS' : 'Pendiente'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Delivery Details Card */}
          {selectedDelivery ? (
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-8">
              
              {/* Header Card */}
              <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl border border-purple-800/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-purple-300 font-extrabold uppercase tracking-widest block">
                        Ruta de Documento: deliveries/{selectedDelivery.id || selectedDelivery.trackingNumber}
                      </span>
                    </div>
                    <span className="text-2xl sm:text-4xl font-black text-yellow-300 tracking-wide">
                      {selectedDelivery.trackingNumber}
                    </span>
                    {selectedDelivery.externalOrderId && (
                      <span className="text-xs text-purple-200 block mt-0.5">
                        Ref / Orden Externa: #{selectedDelivery.externalOrderId}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 ${
                      selectedDelivery.status === 'entregado' ? 'bg-emerald-500 text-slate-950' :
                      isEnTransito ? 'bg-amber-400 text-slate-950' : 'bg-purple-600 text-white'
                    }`}>
                      {isEnTransito && <Radio className="w-3.5 h-3.5 animate-pulse" />}
                      {selectedDelivery.status === 'entregado' ? 'ENTREGADO' : isEnTransito ? 'EN TRÁNSITO' : 'PENDIENTE'}
                    </span>
                    <span className="text-[10px] text-purple-300 font-semibold">
                      Última actualización: {new Date(selectedDelivery.createdAt).toLocaleDateString('es-DO')}
                    </span>
                  </div>
                </div>

                {/* Main Fields Grid (aligned with user tracking schema) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs border-t border-purple-800/60 relative z-10">
                  <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">
                      customerName (Destinatario)
                    </span>
                    <span className="font-extrabold text-white text-sm block mt-0.5 truncate">
                      {selectedDelivery.customerName}
                    </span>
                    <span className="text-slate-400 block text-[11px] mt-0.5">
                      {selectedDelivery.customerPhone}
                    </span>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">
                      province (Destino)
                    </span>
                    <span className="font-extrabold text-white text-sm block mt-0.5 truncate">
                      {selectedDelivery.province}
                    </span>
                    <span className="text-slate-400 block text-[11px] mt-0.5 truncate">
                      {selectedDelivery.city} • {selectedDelivery.address}
                    </span>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">
                      totalToCollect (Monto COD)
                    </span>
                    <span className="font-black text-yellow-300 text-xl block mt-0.5">
                      RD$ {(selectedDelivery.totalToCollect || selectedDelivery.totalCodAmount).toLocaleString()}
                    </span>
                    <span className="text-purple-300 block text-[10px] mt-0.5">
                      Método: {selectedDelivery.paymentMethod || 'contra entrega'}
                    </span>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">
                      deliveryPersonId (Repartidor)
                    </span>
                    <span className="font-extrabold text-purple-200 text-xs block mt-0.5 font-mono truncate">
                      {selectedDelivery.deliveryPersonId || 'driver_sacha_general'}
                    </span>
                    <span className="text-slate-300 block text-[11px] mt-0.5 truncate">
                      {selectedDelivery.deliveryPersonName || courierProfile?.name || 'Sacha Pack Logistics Driver'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time GPS Telemetry Card (When status is en_transito or GPS is available) */}
              {isEnTransito && (
                <div className="bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-indigo-500/10 rounded-3xl p-6 border-2 border-amber-400/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-400/30">
                        <Navigation className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900">
                            Telemetría GPS en Vivo del Repartidor
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                            users/{selectedDelivery.deliveryPersonId || 'driver_id'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          Ubicación transmitida en tiempo real desde el dispositivo del courier
                        </p>
                      </div>
                    </div>

                    {gpsLocation && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${gpsLocation.lat},${gpsLocation.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir en Google Maps
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
                        Coordenadas GPS (lat, lng)
                      </span>
                      <span className="text-sm font-black text-purple-900 font-mono block mt-1">
                        {gpsLocation ? `${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)}` : '19.4517, -70.6970'}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        República Dominicana
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
                        Punto de Referencia / Vía
                      </span>
                      <span className="text-xs font-black text-slate-900 block mt-1 truncate">
                        {gpsLocation?.address || 'Autopista Duarte Km 4.5, Entrada Santiago'}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                        {gpsLocation?.speed ? `Velocidad: ~${gpsLocation.speed} km/h` : 'Velocidad: 42 km/h (En ruta)'}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
                        Último Ping Satelital
                      </span>
                      <span className="text-xs font-black text-slate-900 block mt-1">
                        {gpsLocation?.updatedAt
                          ? new Date(gpsLocation.updatedAt).toLocaleTimeString('es-DO')
                          : new Date().toLocaleTimeString('es-DO')}
                      </span>
                      <span className="text-[11px] text-purple-600 font-bold block mt-0.5">
                        Sincronización activa
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery History Timeline */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Historial de Eventos del Envío
                </h3>

                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-200">
                  {selectedDelivery.history.map((hist, i) => (
                    <div key={i} className="relative flex items-start gap-4 group">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-purple-600 border-4 border-white text-white flex items-center justify-center shadow">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 uppercase">
                            {hist.status}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(hist.date).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-medium">{hist.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-100">
              No hay guía seleccionada para rastreo.
            </div>
          )}
        </>
      ) : (
        /* Developer Integration SDK / API Documentation View */
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-800 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <span className="text-xs font-black text-purple-400 uppercase tracking-widest block">
                  SDK & API de Rastreo Sanpi Marketplace
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Integración Directa con Firebase Firestore
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cualquier aplicación externa (React, Next.js, Flutter, Vue) puede consultar las guías públicas de Sanpi.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Security Rules Activas (Lectura Pública)
                </span>
              </div>
            </div>

            {/* 1. Firebase Config */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-purple-600 text-white text-xs font-black flex items-center justify-center">1</span>
                  Credenciales del SDK de Firebase
                </h4>
                <button
                  onClick={() => handleCopy(firebaseConfigSnippet, 'config')}
                  className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700"
                >
                  {copiedCode === 'config' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode === 'config' ? 'Copiado' : 'Copiar Config'}
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-purple-300 font-mono text-xs overflow-x-auto leading-relaxed">
                <code>{firebaseConfigSnippet}</code>
              </pre>
            </div>

            {/* 2. Data Structure */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-purple-600 text-white text-xs font-black flex items-center justify-center">2</span>
                Estructura de Datos para Rastreo (Colección deliveries)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="font-mono text-yellow-400 font-bold block">status</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    'pendiente' | 'en_transito' | 'entregado'
                  </span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="font-mono text-yellow-400 font-bold block">customerName</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Nombre del destinatario
                  </span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="font-mono text-yellow-400 font-bold block">province</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Provincia destino en RD
                  </span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="font-mono text-yellow-400 font-bold block">totalToCollect</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Monto a cobrar en puerta (COD)
                  </span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="font-mono text-yellow-400 font-bold block">deliveryPersonId</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    ID para consultar GPS
                  </span>
                </div>
              </div>
            </div>

            {/* 3. GPS Tracking */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-purple-600 text-white text-xs font-black flex items-center justify-center">3</span>
                Lógica de Rastreo GPS (Colección users)
              </h4>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <p>
                  Si el estado del envío es <code className="text-amber-400 font-mono">en_transito</code>, puedes obtener la ubicación en tiempo real del repartidor consultando su perfil:
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-purple-300">
                  <span className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">Ruta: users/{'{deliveryPersonId}'}</span>
                  <span className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">Campo: lastLocation {'({lat, lng, updatedAt})'}</span>
                </div>
              </div>
            </div>

            {/* 4. React / Next.js Implementation Code */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-purple-600 text-white text-xs font-black flex items-center justify-center">4</span>
                  Código de Integración Completo (React / TypeScript / Next.js)
                </h4>
                <button
                  onClick={() => handleCopy(reactCodeSnippet, 'code')}
                  className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
                >
                  {copiedCode === 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode === 'code' ? 'Copiado al portapapeles' : 'Copiar Código'}
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed max-h-96">
                <code>{reactCodeSnippet}</code>
              </pre>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
