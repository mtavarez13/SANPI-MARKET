import React, { useState, useEffect } from 'react';
import { MapPin, X, Check, Truck, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { UserProfile, CustomerShippingAddress } from '../types';
import { RD_PROVINCES } from '../data/rdProvinces';
import { saveCustomerShippingAddress, getCustomerSavedShippingAddress } from '../lib/authService';

interface CustomerAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAddressSaved?: (updatedUser: UserProfile) => void;
}

export const CustomerAddressModal: React.FC<CustomerAddressModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAddressSaved
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('Distrito Nacional');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      const saved = getCustomerSavedShippingAddress(currentUser);
      if (saved) {
        setFullName(saved.fullName || currentUser.displayName || '');
        setPhone(saved.phone || currentUser.phone || '');
        setEmail(saved.email || currentUser.email || '');
        setProvince(saved.province || currentUser.province || 'Distrito Nacional');
        setCity(saved.city || '');
        setAddress(saved.address || '');
        setNotes(saved.notes || '');
      } else {
        setFullName(currentUser.displayName || '');
        setPhone(currentUser.phone || '');
        setEmail(currentUser.email || '');
        setProvince(currentUser.province || 'Distrito Nacional');
        setCity('');
        setAddress('');
        setNotes('');
      }
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMessage('Debes iniciar sesión para registrar tu dirección.');
      return;
    }

    if (!fullName.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      setErrorMessage('Por favor completa todos los campos requeridos (*).');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const shippingAddress: CustomerShippingAddress = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || currentUser.email || '',
        province,
        city: city.trim(),
        address: address.trim(),
        notes: notes.trim()
      };

      const updatedUser = await saveCustomerShippingAddress(currentUser, shippingAddress);
      setSuccessMessage('¡Dirección de envío guardada exitosamente! Se completará automáticamente en tus compras.');
      if (onAddressSaved) {
        onAddressSaved(updatedUser);
      }
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Error al guardar dirección:', err);
      setErrorMessage('Ocurrió un problema guardando tu dirección. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-purple-700 text-white p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-purple-700 flex items-center justify-center font-black shadow-sm shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Mi Dirección de Envío</h2>
              <p className="text-xs text-purple-100">Configura tus datos para compras rápidas en 1 clic</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-purple-800 hover:bg-purple-900 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative reassurance bar */}
        <div className="bg-purple-50 px-5 py-3 border-b border-purple-100 flex items-center gap-2.5 text-xs text-purple-900 font-medium">
          <Truck className="w-4 h-4 text-purple-700 shrink-0" />
          <span>Flete Fijo RD$ 350 a nivel nacional en las 32 provincias de República Dominicana.</span>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre de Quien Recibe *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="Ej: 809-555-0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Provincia de Entrega *
              </label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white cursor-pointer"
              >
                {RD_PROVINCES.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.region})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Municipio / Ciudad / Sector *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Santo Domingo Este / Los Mina / Piantini"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dirección Exacta de Entrega *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Calle Las Flores #24, Residencial Don Pedro, Edificio B, Apto 3-A"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Referencia / Indicaciones para el Mensajero (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Casa verde de dos plantas con rejas blancas, frente al colmado"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Correo Electrónico para Factura / Confirmación (Opcional)
            </label>
            <input
              type="email"
              placeholder="Ej: cliente@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white font-medium"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <span>Guardando Dirección...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Mi Dirección de Entrega</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Tus datos de entrega son 100% privados y se utilizan exclusivamente para despachos de tus compras.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
