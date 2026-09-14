import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, StorePlan } from '../types';
import { 
  fetchAllRegisteredUsers, 
  updateUserRoleAndProfile, 
  createRegisteredUser, 
  deleteRegisteredUser,
  isSuperAdmin,
  generateCarrierApiKey
} from '../lib/authService';
import { RD_PROVINCES } from '../data/rdProvinces';
import { speakSanpi } from '../lib/audioTTS';
import * as XLSX from 'xlsx';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  Store,
  Sparkles,
  Package,
  Truck,
  User,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Plus,
  Phone,
  Mail,
  MapPin,
  Key,
  Copy,
  Check,
  X,
  ExternalLink,
  Building,
  ShieldAlert,
  Award,
  Crown
} from 'lucide-react';

interface AdminUsersManagerProps {
  currentUser?: UserProfile | null;
  onRefreshParent?: () => void;
}

export const AdminUsersManager: React.FC<AdminUsersManagerProps> = ({
  currentUser,
  onRefreshParent
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [copiedKeyUid, setCopiedKeyUid] = useState<string | null>(null);

  // Modals
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Editing/Creating
  const [formData, setFormData] = useState<{
    displayName: string;
    email: string;
    phone: string;
    province: string;
    role: 'customer' | 'dropshipper' | 'partner' | 'supplier' | 'carrier' | 'admin';
    storeName: string;
    companyName: string;
    plan: StorePlan;
    supplierCategory: string;
    isProviderApproved: boolean;
    rnc: string;
    apiKey: string;
  }>({
    displayName: '',
    email: '',
    phone: '',
    province: 'Distrito Nacional',
    role: 'customer',
    storeName: '',
    companyName: '',
    plan: 'pro',
    supplierCategory: 'Tecnología & Gadgets',
    isProviderApproved: true,
    rnc: '',
    apiKey: ''
  });

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllRegisteredUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();

    const handleUserUpdate = () => {
      loadUsers();
    };

    window.addEventListener('sanpi_user_registered', handleUserUpdate);
    window.addEventListener('sanpi_users_updated', handleUserUpdate);
    window.addEventListener('sanpi_user_role_updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);

    return () => {
      window.removeEventListener('sanpi_user_registered', handleUserUpdate);
      window.removeEventListener('sanpi_users_updated', handleUserUpdate);
      window.removeEventListener('sanpi_user_role_updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // KPIs
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.role === 'admin' || isSuperAdmin(u.email)).length;
    const partners = users.filter(u => u.role === 'partner').length;
    const dropshippers = users.filter(u => u.role === 'dropshipper').length;
    const suppliers = users.filter(u => u.role === 'supplier').length;
    const carriers = users.filter(u => u.role === 'carrier').length;
    const customers = users.filter(u => u.role === 'customer').length;
    return { total, admins, partners, dropshippers, suppliers, carriers, customers };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }
      // Province filter
      if (provinceFilter !== 'all' && user.province !== provinceFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (user.displayName || '').toLowerCase().includes(q);
        const matchEmail = (user.email || '').toLowerCase().includes(q);
        const matchPhone = (user.phone || '').toLowerCase().includes(q);
        const matchStore = (user.storeName || '').toLowerCase().includes(q);
        const matchCompany = (user.companyName || '').toLowerCase().includes(q);
        const matchProvince = (user.province || '').toLowerCase().includes(q);
        const matchRef = (user.referralCode || '').toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchStore || matchCompany || matchProvince || matchRef;
      }
      return true;
    });
  }, [users, roleFilter, provinceFilter, searchQuery]);

  // Open Edit Modal
  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName || '',
      email: user.email || '',
      phone: user.phone || '809-000-0000',
      province: user.province || 'Distrito Nacional',
      role: isSuperAdmin(user.email) ? 'admin' : user.role,
      storeName: user.storeName || '',
      companyName: user.companyName || '',
      plan: user.plan || 'pro',
      supplierCategory: user.supplierCategory || 'Tecnología & Gadgets',
      isProviderApproved: user.isProviderApproved ?? true,
      rnc: user.rnc || '',
      apiKey: user.apiKey || ''
    });
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsCreatingUser(true);
    setFormData({
      displayName: '',
      email: '',
      phone: '809-',
      province: 'Distrito Nacional',
      role: 'dropshipper',
      storeName: '',
      companyName: '',
      plan: 'pro',
      supplierCategory: 'General',
      isProviderApproved: true,
      rnc: '',
      apiKey: ''
    });
  };

  // Save Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);

    try {
      const updates: Partial<UserProfile> = {
        displayName: formData.displayName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        province: formData.province,
        role: formData.role,
        storeName: formData.role === 'partner' ? formData.storeName.trim() : undefined,
        companyName: (formData.role === 'carrier' || formData.role === 'supplier') ? formData.companyName.trim() : undefined,
        plan: formData.role === 'partner' ? formData.plan : undefined,
        supplierCategory: formData.role === 'supplier' ? formData.supplierCategory : undefined,
        isProviderApproved: formData.role === 'supplier' ? formData.isProviderApproved : undefined,
        rnc: formData.rnc.trim() || undefined,
        apiKey: formData.role === 'carrier' ? (formData.apiKey || generateCarrierApiKey(formData.companyName || formData.displayName)) : undefined
      };

      const updated = await updateUserRoleAndProfile(editingUser.uid, updates);
      setUsers(prev => prev.map(u => u.uid === editingUser.uid ? updated : u));
      
      showToast(`Perfil de "${updated.displayName}" actualizado a rol ${updated.role.toUpperCase()}`);
      speakSanpi();
      
      setEditingUser(null);
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(`Error al actualizar usuario: ${err?.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  // Quick Role Change from table/card
  const handleQuickRoleChange = async (user: UserProfile, newRole: UserProfile['role']) => {
    if (user.role === newRole) return;
    if (isSuperAdmin(user.email) && newRole !== 'admin') {
      alert('No se puede cambiar el rol de Super Admin para este correo protegido.');
      return;
    }

    try {
      const updates: Partial<UserProfile> = { role: newRole, email: user.email };
      if (newRole === 'carrier' && !user.apiKey) {
        updates.apiKey = generateCarrierApiKey(user.companyName || user.displayName || 'carrier');
      }
      if (newRole === 'supplier') {
        updates.isProviderApproved = true;
      }
      if (newRole === 'partner' && !user.plan) {
        updates.plan = 'pro';
      }

      const updated = await updateUserRoleAndProfile(user.uid, updates);
      setUsers(prev => prev.map(u => u.uid === user.uid ? updated : u));
      showToast(`Rol permanente de ${user.displayName || user.email} fijado como ${newRole.toUpperCase()}`);
      speakSanpi();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(`Error al cambiar rol: ${err?.message || 'Error'}`);
    }
  };

  // Save New User
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim() || !formData.email.trim()) {
      alert('Por favor introduce nombre y correo electrónico válidos.');
      return;
    }
    setSaving(true);

    try {
      const newUser = await createRegisteredUser({
        displayName: formData.displayName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        province: formData.province,
        role: formData.role,
        storeName: formData.role === 'partner' ? formData.storeName.trim() : undefined,
        companyName: (formData.role === 'carrier' || formData.role === 'supplier') ? formData.companyName.trim() : undefined,
        plan: formData.role === 'partner' ? formData.plan : undefined,
        supplierCategory: formData.role === 'supplier' ? formData.supplierCategory : undefined,
        isProviderApproved: formData.role === 'supplier' ? formData.isProviderApproved : undefined,
        rnc: formData.rnc.trim() || undefined,
        apiKey: formData.role === 'carrier' ? (formData.apiKey || generateCarrierApiKey(formData.companyName || formData.displayName)) : undefined
      });

      setUsers(prev => [newUser, ...prev]);
      showToast(`Usuario "${newUser.displayName}" registrado exitosamente.`);
      speakSanpi();
      setIsCreatingUser(false);
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(`Error al crear usuario: ${err?.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: UserProfile) => {
    if (isSuperAdmin(user.email)) {
      alert('No es posible eliminar al Super Administrador principal.');
      return;
    }
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el usuario "${user.displayName || user.email}"?`)) {
      return;
    }

    try {
      await deleteRegisteredUser(user.uid, user.email);
      setUsers(prev => prev.filter(u => u.uid !== user.uid && (!user.email || u.email?.toLowerCase() !== user.email.toLowerCase())));
      showToast(`Usuario eliminado correctamente.`);
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(`Error al eliminar: ${err?.message || 'Error'}`);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredUsers.map((u, i) => ({
      '#': i + 1,
      'Nombre': u.displayName || 'Sin Nombre',
      'Correo Electrónico': u.email || '',
      'Rol': u.role.toUpperCase(),
      'Teléfono': u.phone || '',
      'Provincia': u.province || 'Distrito Nacional',
      'Tienda / Empresa': u.storeName || u.companyName || '',
      'Código de Referido': u.referralCode || '',
      'Plan': u.plan || '',
      'Fecha Registro': u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-DO') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios Sanpi');
    XLSX.writeFile(wb, `Usuarios_Sanpi_Market_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Directorio de usuarios exportado a Excel.');
  };

  // Copy API Key helper
  const handleCopyKey = (key: string, uid: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyUid(uid);
    setTimeout(() => setCopiedKeyUid(null), 2500);
    showToast('API Key copiada al portapapeles');
  };

  // Render role badge helper
  const renderRoleBadge = (role: UserProfile['role'], email?: string | null) => {
    const isSuper = isSuperAdmin(email);
    if (isSuper) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs">
          <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          Super Admin
        </span>
      );
    }

    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            Admin
          </span>
        );
      case 'partner':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            Socio Tienda
          </span>
        );
      case 'dropshipper':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Dropshipper
          </span>
        );
      case 'supplier':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <Package className="w-3.5 h-3.5 text-purple-700" />
            Proveedor Mayorista
          </span>
        );
      case 'carrier':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            Transportista
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Cliente
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
              <Users className="w-3.5 h-3.5" />
              Directorio Central de Usuarios Sanpi Market
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Panel de Gestión de Usuarios y Roles</span>
              <span className="bg-purple-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                {users.length} Registrados
              </span>
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Supervisión completa del ecosistema. Consulta todos los usuarios dados de alta, visualiza y asigna roles instantáneamente, y actualiza los perfiles de tiendas, mayoristas, transportistas y dropshippers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-2 transition-all"
              title="Recargar usuarios"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center gap-2 transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-purple-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Usuario</span>
            </button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</div>
            <span className="text-[11px] text-slate-500 font-medium">Usuarios</span>
          </div>

          <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">Admins</span>
            <div className="text-xl font-black text-rose-700 mt-0.5">{stats.admins}</div>
            <span className="text-[11px] text-rose-600 font-medium">Control Total</span>
          </div>

          <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Socios</span>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{stats.partners}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Tiendas Activas</span>
          </div>

          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">Dropship</span>
            <div className="text-xl font-black text-amber-700 mt-0.5">{stats.dropshippers}</div>
            <span className="text-[11px] text-amber-600 font-medium">Revendedores</span>
          </div>

          <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">Mayoristas</span>
            <div className="text-xl font-black text-purple-800 mt-0.5">{stats.suppliers}</div>
            <span className="text-[11px] text-purple-700 font-medium">Proveedores</span>
          </div>

          <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">Transporte</span>
            <div className="text-xl font-black text-blue-700 mt-0.5">{stats.carriers}</div>
            <span className="text-[11px] text-blue-600 font-medium">Couriers / API</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Clientes</span>
            <div className="text-xl font-black text-slate-700 mt-0.5">{stats.customers}</div>
            <span className="text-[11px] text-slate-500 font-medium">Compradores</span>
          </div>
        </div>

        {/* FILTERS AND SEARCH BAR */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo, teléfono, tienda, empresa o provincia..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all text-slate-800"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shrink-0"
            >
              <option value="all">Todos los Roles ({users.length})</option>
              <option value="admin">Admins & Super Admins ({stats.admins})</option>
              <option value="partner">Socios de Tienda ({stats.partners})</option>
              <option value="dropshipper">Dropshippers ({stats.dropshippers})</option>
              <option value="supplier">Proveedores Mayoristas ({stats.suppliers})</option>
              <option value="carrier">Transportistas & Couriers ({stats.carriers})</option>
              <option value="customer">Clientes ({stats.customers})</option>
            </select>

            {/* Province Filter */}
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shrink-0"
            >
              <option value="all">Todas las Provincias</option>
              {RD_PROVINCES.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* USERS TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Usuario & Identidad</th>
                <th className="py-3.5 px-4">Rol en Sanpi</th>
                <th className="py-3.5 px-4">Contacto & Ubicación</th>
                <th className="py-3.5 px-4">Entidad Vinculada</th>
                <th className="py-3.5 px-4">Código Referido</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300 opacity-60" />
                    <p className="text-sm font-bold text-slate-600">No se encontraron usuarios registrados</p>
                    <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros de búsqueda o rol.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSuper = isSuperAdmin(user.email);
                  return (
                    <tr key={user.uid} className="hover:bg-purple-50/30 transition-colors group">
                      {/* USER INFO */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'User')}`}
                            alt={user.displayName || 'Usuario'}
                            className="w-10 h-10 rounded-full object-cover border-2 border-purple-200 bg-purple-50 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'User')}`;
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm truncate">
                                {user.displayName || 'Usuario sin nombre'}
                              </span>
                              {isSuper && (
                                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" title="Super Admin Principal" />
                              )}
                            </div>
                            <div className="text-slate-500 text-xs flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{user.email || 'Sin correo registrado'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              UID: <span className="font-mono">{user.uid.slice(0, 16)}...</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ROLE SELECTOR & BADGE */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div>{renderRoleBadge(user.role, user.email)}</div>
                          
                          {/* Quick Role Dropdown */}
                          {!isSuper && (
                            <select
                              value={user.role}
                              onChange={(e) => handleQuickRoleChange(user, e.target.value as UserProfile['role'])}
                              className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg px-2 py-1 border border-slate-200 transition-colors focus:outline-hidden focus:ring-1 focus:ring-purple-500 cursor-pointer block"
                              title="Cambio rápido de rol"
                            >
                              <option value="customer">Cliente</option>
                              <option value="partner">Socio Tienda</option>
                              <option value="dropshipper">Dropshipper</option>
                              <option value="supplier">Proveedor Mayorista</option>
                              <option value="carrier">Transportista</option>
                              <option value="admin">Administrador</option>
                            </select>
                          )}
                        </div>
                      </td>

                      {/* CONTACT & LOCATION */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-slate-600">
                          {user.phone ? (
                            <a
                              href={`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-medium"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{user.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Sin teléfono</span>
                          )}

                          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{user.province || 'República Dominicana'}</span>
                          </div>
                        </div>
                      </td>

                      {/* ASSOCIATED ENTITY (Store, Company, Wholesale, API Key) */}
                      <td className="py-3.5 px-4">
                        {user.role === 'partner' && (
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <Store className="w-3 h-3 text-emerald-600" />
                              <span>{user.storeName || 'Tienda Sanpi'}</span>
                            </div>
                            {user.plan && (
                              <span className="inline-block mt-0.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Plan {user.plan}
                              </span>
                            )}
                          </div>
                        )}

                        {user.role === 'supplier' && (
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <Package className="w-3 h-3 text-purple-600" />
                              <span>{user.companyName || 'Mayorista Registrado'}</span>
                            </div>
                            <span className="text-[10px] text-purple-700 block mt-0.5">
                              {user.supplierCategory || 'Catálogo Mayorista'}
                            </span>
                          </div>
                        )}

                        {user.role === 'carrier' && (
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-blue-600" />
                              <span>{user.companyName || 'Logística & Envíos'}</span>
                            </div>
                            {user.apiKey && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                  {user.apiKey.slice(0, 12)}...
                                </span>
                                <button
                                  onClick={() => handleCopyKey(user.apiKey!, user.uid)}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                                  title="Copiar API Key"
                                >
                                  {copiedKeyUid === user.uid ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {user.role === 'dropshipper' && (
                          <div className="text-slate-600">
                            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-block">
                              Revendedor COD Activo
                            </span>
                          </div>
                        )}

                        {user.role === 'customer' && (
                          <span className="text-slate-400 text-[11px]">Consumidor</span>
                        )}

                        {user.role === 'admin' && (
                          <span className="text-rose-700 font-semibold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 inline-block">
                            Acceso Maestro Total
                          </span>
                        )}
                      </td>

                      {/* REFERRAL CODE */}
                      <td className="py-3.5 px-4">
                        {user.referralCode ? (
                          <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            {user.referralCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                            title="Modificar perfil y rol de este usuario"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                            <span>Modificar</span>
                          </button>

                          {!isSuper && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: MODIFICAR PERFIL Y ROL DE USUARIO */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={editingUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(editingUser.displayName || 'User')}`}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-300"
                />
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Modificar Perfil y Rol de Usuario
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    UID: {editingUser.uid}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* ROLE SELECTION (PRIMARY ACTION) */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-purple-900 block">
                  Rol Asignado en el Marketplace
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'customer', label: 'Cliente', icon: User, desc: 'Comprador normal' },
                    { id: 'dropshipper', label: 'Dropshipper', icon: Sparkles, desc: 'Revendedor COD' },
                    { id: 'partner', label: 'Socio Tienda', icon: Store, desc: 'Dueño de comercio' },
                    { id: 'supplier', label: 'Proveedor', icon: Package, desc: 'Mayorista con stock' },
                    { id: 'carrier', label: 'Transportista', icon: Truck, desc: 'Empresa logística' },
                    { id: 'admin', label: 'Administrador', icon: ShieldCheck, desc: 'Gestión total' },
                  ].map((r) => {
                    const Icon = r.icon;
                    const selected = formData.role === r.id;
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => setFormData(prev => ({ ...prev, role: r.id as any }))}
                        className={`p-2.5 rounded-xl text-left border transition-all ${
                          selected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Icon className={`w-3.5 h-3.5 ${selected ? 'text-white' : 'text-purple-600'}`} />
                          <span>{r.label}</span>
                        </div>
                        <p className={`text-[10px] mt-0.5 ${selected ? 'text-purple-100' : 'text-slate-400'}`}>
                          {r.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BASIC DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Teléfono / WhatsApp RD
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Provincia Dominicana
                  </label>
                  <select
                    value={formData.province}
                    onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-500"
                  >
                    {RD_PROVINCES.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CONTEXTUAL ROLE SPECIFIC FIELDS */}
              {formData.role === 'partner' && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>Configuración de Socio de Tienda</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Nombre de la Tienda
                      </label>
                      <input
                        type="text"
                        value={formData.storeName}
                        onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                        placeholder="Ej: TecnoStore RD"
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Plan de Membresía
                      </label>
                      <select
                        value={formData.plan}
                        onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value as StorePlan }))}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold"
                      >
                        <option value="basic">Plan Básico (RD$ 1,500/mes)</option>
                        <option value="pro">Plan Pro (RD$ 3,500/mes)</option>
                        <option value="enterprise">Plan Enterprise (RD$ 7,500/mes)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {formData.role === 'supplier' && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span>Configuración de Proveedor Mayorista</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Razón Social / Empresa
                      </label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Ej: Importadora Caribe SRL"
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Categoría de Artículos
                      </label>
                      <input
                        type="text"
                        value={formData.supplierCategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, supplierCategory: e.target.value }))}
                        placeholder="Ej: Tecnología, Belleza..."
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="editIsApproved"
                      checked={formData.isProviderApproved}
                      onChange={(e) => setFormData(prev => ({ ...prev, isProviderApproved: e.target.checked }))}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <label htmlFor="editIsApproved" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Proveedor Aprobado (Permitir publicación en catálogo confidencial de Dropshipping)
                    </label>
                  </div>
                </div>
              )}

              {formData.role === 'carrier' && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Configuración de Empresa de Transporte & API</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nombre de la Empresa Logística
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Ej: Sacha Pack Courier SRL"
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        API Key de Integración
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, apiKey: generateCarrierApiKey(formData.companyName || formData.displayName) }))}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                      >
                        Generar Nueva Key
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.apiKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sanpi_live_..."
                      className="w-full font-mono text-xs px-3 py-2 bg-white border border-blue-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/30 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR NUEVO USUARIO MANUALMENTE */}
      {isCreatingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Registrar Nuevo Usuario en Sanpi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Crea un perfil asignando su rol inicial en la plataforma.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreatingUser(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-4">
              {/* ROLE SELECTION */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Selecciona el Rol Inicial
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'dropshipper', label: 'Dropshipper', icon: Sparkles },
                    { id: 'partner', label: 'Socio Tienda', icon: Store },
                    { id: 'supplier', label: 'Proveedor', icon: Package },
                    { id: 'carrier', label: 'Transportista', icon: Truck },
                    { id: 'customer', label: 'Cliente', icon: User },
                    { id: 'admin', label: 'Admin', icon: ShieldCheck },
                  ].map((r) => {
                    const Icon = r.icon;
                    const selected = formData.role === r.id;
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => setFormData(prev => ({ ...prev, role: r.id as any }))}
                        className={`p-2.5 rounded-xl text-left border transition-all flex items-center gap-2 ${
                          selected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${selected ? 'text-white' : 'text-purple-600'}`} />
                        <span className="text-xs">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Ej: Lic. Ramón Valdez"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Teléfono RD
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="809-555-0000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Provincia
                  </label>
                  <select
                    value={formData.province}
                    onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-500"
                  >
                    {RD_PROVINCES.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CONTEXTUAL FIELD FOR CREATION */}
              {formData.role === 'partner' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nombre de la Tienda
                  </label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                    placeholder="Ej: Joyería del Sol RD"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              )}

              {(formData.role === 'carrier' || formData.role === 'supplier') && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Razón Social o Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Ej: Distribuidora Santiago SRL"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/30 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Crear Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
