import React, { useState, useRef } from 'react';
import { Article, Store } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { CATEGORIES } from '../data/rdProvinces';
import {
  X,
  Plus,
  Upload,
  Image as ImageIcon,
  Sparkles,
  DollarSign,
  Package,
  Layers,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface AddStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  onSuccess: (newArticle: Article) => void;
}

export const AddStoreProductModal: React.FC<AddStoreProductModalProps> = ({
  isOpen,
  onClose,
  store,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0] || 'Electrónica');
  const [price, setPrice] = useState<number>(1500);
  const [compareAtPrice, setCompareAtPrice] = useState<number>(2200);
  const [costPerItem, setCostPerItem] = useState<number>(950);
  const [inventory, setInventory] = useState<number>(20);
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80');
  const [barcodeImei, setBarcodeImei] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Por favor coloca el nombre del producto.');
      return;
    }
    if (price <= 0) {
      setErrorMessage('El precio de venta debe ser mayor a RD$ 0.');
      return;
    }

    setIsSaving(true);

    try {
      const slug = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const newArticleData: Omit<Article, 'id' | 'createdAt' | 'views'> = {
        storeId: store.id,
        storeName: store.name,
        title: title.trim(),
        name: title.trim(),
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        description: description.trim() || `Producto de alta calidad disponible en ${store.name} con despacho nacional Sacha Pack.`,
        images: [imageUrl],
        image: imageUrl,
        gallery: [imageUrl],
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : Math.round(Number(price) * 1.3),
        costPerItem: costPerItem ? Number(costPerItem) : Math.round(Number(price) * 0.65),
        wholesalePrice: costPerItem ? Number(costPerItem) : Math.round(Number(price) * 0.65),
        category,
        inventory: Number(inventory) || 15,
        stock: Number(inventory) || 15,
        rating: 5.0,
        reviewCount: 1,
        barcode_imei: barcodeImei.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        status: 'aprobado',
        isPublic: true,
        isDropshipping: true,
        variants: [
          { name: 'Modelo / Color', options: ['Estándar', 'Premium'] }
        ],
        specifications: {
          'Vendedor': store.name,
          'Garantía': 'Garantía directa de tienda oficial en RD',
          'Envío': 'Entrega en 24-48 horas con Sacha Pack Express',
          'Pago': 'Pago Contra Entrega (COD) disponible'
        }
      };

      await sanpiManager.addArticle(newArticleData);
      const created = sanpiManager.articles[0];
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Error adding product to store:', err);
      setErrorMessage(err?.message || 'Error al agregar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-purple-800/40 rounded-3xl shadow-2xl overflow-hidden my-auto text-white">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Agregar Producto a {store.name}</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Se publicará de inmediato en tu enlace de tienda <code className="text-purple-300 font-mono">/{store.slug}</code>.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200">
              Nombre del Producto <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Smartwatch Ultra Amoled 2026, Zapatillas Urban Pro..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {/* Category & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200">Código SKU / Código de Barras (Opcional)</label>
              <input
                type="text"
                value={barcodeImei}
                onChange={(e) => setBarcodeImei(e.target.value)}
                placeholder="Ej. SKU-789456"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-emerald-400">
                Precio de Venta (RD$) <span className="text-purple-400">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs text-slate-400 font-bold">RD$</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  min={1}
                  className="w-full bg-slate-950 border border-emerald-600/50 rounded-xl pl-11 pr-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Precio Antes / Comparación (RD$)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs text-slate-400 font-bold">RD$</span>
                <input
                  type="number"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-300">
                Inventario Disponible
              </label>
              <input
                type="number"
                value={inventory}
                onChange={(e) => setInventory(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          {/* Image Upload / URL */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <span>Foto Principal del Producto</span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              <img
                src={imageUrl}
                alt="Product preview"
                className="w-20 h-20 rounded-2xl object-cover border border-slate-700 bg-slate-900 shrink-0"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Pega aquí la URL de la imagen del producto..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Foto</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Puedes subir una foto directamente desde tu teléfono/computadora o pegar un enlace web.
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200">
              Descripción del Producto
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalla las características principales, garantía, contenido de la caja..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSaving ? 'Publicando...' : 'Publicar en Mi Tienda'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
