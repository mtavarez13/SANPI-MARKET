import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  FileSpreadsheet,
  FileText,
  PlusCircle,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  User,
  Store,
  Truck,
  Package,
  Sparkles,
  Filter,
  Calendar,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  PieChart,
  Building,
  Receipt,
  Users,
  Eye,
  RefreshCw,
  Crown
} from 'lucide-react';
import { UserProfile, Expense } from '../types';
import { sanpiManager } from '../lib/storeManager';
import { fetchAllRegisteredUsers, isSuperAdmin } from '../lib/authService';
import {
  computeUserAccounting,
  AccountingPeriodFilter,
  UserAccountingReport
} from '../lib/accountingService';
import {
  exportAccountingToExcel,
  exportAccountingToPdf
} from '../lib/accountingExportService';

interface AccountingDashboardProps {
  currentUser: UserProfile | null;
  onBackToMarketplace?: () => void;
  onOpenAuthModal?: () => void;
}

export const AccountingDashboard: React.FC<AccountingDashboardProps> = ({
  currentUser,
  onBackToMarketplace,
  onOpenAuthModal
}) => {
  const isSuper = isSuperAdmin(currentUser?.email);

  // States
  const [period, setPeriod] = useState<AccountingPeriodFilter>('all');
  const [activeTab, setActiveTab] = useState<'balance' | 'expenses' | 'incomes' | 'users_audit'>('balance');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [selectedUserUid, setSelectedUserUid] = useState<string>(isSuper ? 'global' : (currentUser?.uid || 'global'));
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [incomeSearchQuery, setIncomeSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // New Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<Expense['category']>('logistica');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expReference, setExpReference] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expNotes, setExpNotes] = useState('');
  const [expTargetUserUid, setExpTargetUserUid] = useState<string>(currentUser?.uid || '');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Success / Action feedback banner
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load all users for Super Admin / Admin audit
  useEffect(() => {
    let isMounted = true;
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const users = await fetchAllRegisteredUsers();
        if (isMounted) {
          setUsersList(users);
        }
      } catch (err) {
        console.error('Error fetching users for accounting:', err);
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    };

    loadUsers();
    return () => { isMounted = false; };
  }, []);

  // Determine target user for the report
  const targetUser = useMemo(() => {
    if (selectedUserUid === 'global') return null;
    const found = usersList.find(u => u.uid === selectedUserUid);
    if (found) return found;
    if (currentUser?.uid === selectedUserUid) return currentUser;
    return null;
  }, [selectedUserUid, usersList, currentUser]);

  // Compute accounting report
  const isGlobalMode = selectedUserUid === 'global';
  const report: UserAccountingReport = useMemo(() => {
    return computeUserAccounting(targetUser, period, isGlobalMode);
  }, [targetUser, period, isGlobalMode, sanpiManager.expenses, sanpiManager.deliveries, sanpiManager.transactions]);

  // Handle Export Excel
  const handleExportExcel = () => {
    exportAccountingToExcel(report);
    setStatusMessage('Reporte en Microsoft Excel (.xlsx) generado y descargado correctamente.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Handle Export PDF
  const handleExportPdf = () => {
    exportAccountingToPdf(report);
    setStatusMessage('Reporte Ejecutivo en PDF (.pdf) generado y descargado con éxito.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Handle Register Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount || Number(expAmount) <= 0) return;

    setIsSubmittingExpense(true);
    try {
      const assignedUser = usersList.find(u => u.uid === expTargetUserUid) || currentUser;

      await sanpiManager.addExpense(
        expTitle.trim(),
        expCategory,
        Number(expAmount),
        {
          date: expDate,
          reference: expReference.trim() || undefined,
          notes: expNotes.trim() || undefined,
          userId: assignedUser?.uid,
          userEmail: assignedUser?.email || undefined,
          userName: assignedUser?.displayName || assignedUser?.storeName || undefined,
          userRole: assignedUser?.role,
          storeId: assignedUser?.storeName
        }
      );

      setExpTitle('');
      setExpAmount('');
      setExpReference('');
      setExpNotes('');
      setIsExpenseModalOpen(false);
      setStatusMessage('Gasto operativo registrado y asentado en el libro contable.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Error saving expense:', err);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este registro de gasto?')) return;
    await sanpiManager.deleteExpense(id);
    setStatusMessage('Gasto eliminado del libro contable.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Filtered lists for search
  const filteredIncomes = useMemo(() => {
    if (!incomeSearchQuery.trim()) return report.incomes;
    const q = incomeSearchQuery.toLowerCase();
    return report.incomes.filter(inc =>
      inc.title.toLowerCase().includes(q) ||
      inc.referenceId.toLowerCase().includes(q) ||
      (inc.customerName && inc.customerName.toLowerCase().includes(q))
    );
  }, [report.incomes, incomeSearchQuery]);

  const filteredExpenses = useMemo(() => {
    if (!expenseSearchQuery.trim()) return report.expenses;
    const q = expenseSearchQuery.toLowerCase();
    return report.expenses.filter(exp =>
      exp.title.toLowerCase().includes(q) ||
      exp.category.toLowerCase().includes(q) ||
      (exp.reference && exp.reference.toLowerCase().includes(q)) ||
      (exp.notes && exp.notes.toLowerCase().includes(q))
    );
  }, [report.expenses, expenseSearchQuery]);

  // Compute users comparison list for audit tab
  const usersAuditList = useMemo(() => {
    const list = [...usersList];
    // If current user not in list, add
    if (currentUser && !list.some(u => u.uid === currentUser.uid)) {
      list.unshift(currentUser);
    }

    if (!userSearchQuery.trim()) return list;
    const q = userSearchQuery.toLowerCase();
    return list.filter(u =>
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.storeName && u.storeName.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  }, [usersList, currentUser, userSearchQuery]);

  return (
    <div className="space-y-6 pb-16 max-w-[1600px] xl:max-w-[1720px] 2xl:max-w-[1850px] mx-auto" id="accounting-module-container">
      
      {/* TOP HEADER & CONTROLS */}
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl border border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        
        {/* Title & Identity */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Módulo de Contabilidad Integral
                </h1>
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  DOP (RD$)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Balance de ingresos, beneficios netos, gastos operativos y exportación de estados financieros
              </p>
            </div>
          </div>

          {/* Active Target Banner */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-bold text-slate-500">Titular del Balance:</span>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-black">
              {isGlobalMode ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-purple-600" />
                  <span>Plataforma Completa Sanpi Market (Consolidado)</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  <span>{report.user.displayName}</span>
                  <span className="text-[10px] bg-purple-200 text-purple-950 px-2 py-0.2 rounded-full uppercase">
                    {report.user.role}
                  </span>
                  {report.user.storeName && (
                    <span className="text-[10px] text-purple-700 font-bold">
                      ({report.user.storeName})
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Quick Switch for Admin */}
            {isSuper && !isGlobalMode && (
              <button
                onClick={() => setSelectedUserUid('global')}
                className="text-[11px] font-extrabold text-purple-600 hover:text-purple-800 underline ml-1 cursor-pointer"
              >
                Volver a Vista Consolidada Global
              </button>
            )}
          </div>
        </div>

        {/* Right Controls: Period & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          
          {/* User Selector for Super Admin */}
          {isSuper && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <label className="text-[11px] font-black text-slate-500 pl-2">Auditar Usuario:</label>
              <select
                value={selectedUserUid}
                onChange={(e) => setSelectedUserUid(e.target.value)}
                className="text-xs font-bold bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer max-w-[220px] truncate"
                title="Seleccionar usuario para consultar su estado contable"
              >
                <option value="global">👑 Plataforma Completa (Global)</option>
                <optgroup label="Usuarios Registrados">
                  {usersList.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName || u.email} ({u.role.toUpperCase()})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as AccountingPeriodFilter)}
              className="text-xs font-bold bg-white text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">Todo el Histórico</option>
              <option value="this_month">Mes en Curso</option>
              <option value="last_month">Mes Anterior</option>
              <option value="last_30_days">Últimos 30 Días</option>
              <option value="this_year">Año Actual</option>
            </select>
          </div>

          {/* Export & Register Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              title="Descargar Estado Contable en Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Reporte Excel</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition-all shadow-md shadow-purple-600/20 cursor-pointer"
              title="Descargar Estado Contable en Documento PDF (.pdf)"
            >
              <FileText className="w-4 h-4" />
              <span>Reporte PDF</span>
            </button>

            <button
              onClick={() => {
                setExpTargetUserUid(isGlobalMode ? (currentUser?.uid || '') : (targetUser?.uid || currentUser?.uid || ''));
                setIsExpenseModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-md cursor-pointer"
              title="Registrar un nuevo gasto operativo en el libro contable"
            >
              <PlusCircle className="w-4 h-4 text-yellow-400" />
              <span>Registrar Gasto</span>
            </button>
          </div>

        </div>

      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center justify-between text-xs font-bold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* 4 SCORECARDS DE RENDIMIENTO CONTABLE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1: Ingresos Brutos */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 relative overflow-hidden group hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Ingresos / Ventas Brutas
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            RD$ {report.metrics.grossRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 font-semibold pt-1">
            {report.metrics.ordersCount} operaciones registradas ({report.metrics.deliveredCount} completadas)
          </p>
        </div>

        {/* Card 2: Gastos Totales */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 relative overflow-hidden group hover:border-rose-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Gastos & Deducciones
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
            - RD$ {report.metrics.totalExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 font-semibold pt-1">
            {report.expenses.length} conceptos (operativos + deducciones)
          </p>
        </div>

        {/* Card 3: Beneficio Neto Real */}
        <div className={`rounded-[2rem] p-6 shadow-2xl relative overflow-hidden text-white ${
          report.metrics.netProfit >= 0
            ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-950 border border-purple-700/40'
            : 'bg-gradient-to-br from-rose-900 via-slate-900 to-black border border-rose-700/40'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-200">
              Beneficio Neto (Ganancia Real)
            </span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
              report.metrics.status === 'rentable'
                ? 'bg-emerald-400 text-emerald-950'
                : (report.metrics.status === 'equilibrio' ? 'bg-amber-300 text-amber-950' : 'bg-rose-400 text-rose-950')
            }`}>
              {report.metrics.status === 'rentable' ? 'Rentable' : (report.metrics.status === 'equilibrio' ? 'Equilibrio' : 'Déficit')}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-yellow-300 tracking-tight">
            RD$ {report.metrics.netProfit.toLocaleString()}
          </div>
          <p className="text-[11px] text-purple-200/90 font-medium pt-1 flex items-center justify-between">
            <span>Margen: <strong className="text-white">{report.metrics.profitMargin}%</strong></span>
            <span>Período: {report.period}</span>
          </p>
        </div>

        {/* Card 4: Fletes & Logística COD */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 relative overflow-hidden group hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Efectividad Logística COD
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">
            {report.metrics.fulfillmentRate}%
          </div>
          <p className="text-[11px] text-slate-500 font-semibold pt-1">
            Fletes procesados: RD$ {report.metrics.totalShippingRevenue.toLocaleString()}
          </p>
        </div>

      </div>

      {/* NAVIGATION TABS */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 flex flex-wrap items-center gap-2">
        
        <button
          onClick={() => setActiveTab('balance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'balance'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Estado de Resultados & Balances</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-rose-500" />
          <span>Gastos & Egresos ({report.expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('incomes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'incomes'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Beneficios & Ventas ({report.incomes.length})</span>
        </button>

        {isSuper && (
          <button
            onClick={() => setActiveTab('users_audit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              activeTab === 'users_audit'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Auditoría de Contabilidad por Usuario ({usersList.length})</span>
          </button>
        )}

      </div>

      {/* TAB 1: ESTADO DE RESULTADOS & BALANCES */}
      {activeTab === 'balance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* P&L Statement Formal Table */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-purple-600" />
                  Estado de Resultados Integral (P&L)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Estructura contable formal para {report.user.displayName} | {report.period}
                </p>
              </div>
              <span className="text-xs font-black text-purple-700 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                Moneda: DOP (RD$)
              </span>
            </div>

            <div className="space-y-4 text-xs font-bold text-slate-700">
              
              {/* Gross Revenues */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-sm font-black text-slate-900">
                  <span>(+) INGRESOS OPERACIONALES BRUTOS</span>
                  <span className="text-purple-700">RD$ {report.metrics.grossRevenue.toLocaleString()}</span>
                </div>
                <div className="pl-4 space-y-1 text-slate-500 font-medium text-[11px]">
                  <div className="flex justify-between">
                    <span>Ventas de Artículos / Servicios:</span>
                    <span>RD$ {(report.metrics.grossRevenue - report.metrics.totalShippingRevenue).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recaudación de Fletes Logísticos COD:</span>
                    <span>RD$ {report.metrics.totalShippingRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions / Platform costs */}
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 space-y-2">
                <div className="flex items-center justify-between text-sm font-black text-rose-900">
                  <span>(-) DEDUCCIONES & COSTOS DE PLATAFORMA</span>
                  <span className="text-rose-700">- RD$ {(report.metrics.totalPlatformCommissions + report.metrics.subscriptionCost).toLocaleString()}</span>
                </div>
                <div className="pl-4 space-y-1 text-rose-700 font-medium text-[11px]">
                  <div className="flex justify-between">
                    <span>Comisiones de Plataforma Deducidas:</span>
                    <span>- RD$ {report.metrics.totalPlatformCommissions.toLocaleString()}</span>
                  </div>
                  {report.metrics.subscriptionCost > 0 && (
                    <div className="flex justify-between">
                      <span>Cuota de Membresía / Plan {(report.user.plan || 'pro').toUpperCase()}:</span>
                      <span>- RD$ {report.metrics.subscriptionCost.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-sm font-black text-slate-900">
                  <span>(-) GASTOS OPERATIVOS DIRECTOS REGISTRADOS</span>
                  <span className="text-rose-600">- RD$ {report.metrics.directOperatingExpenses.toLocaleString()}</span>
                </div>
                <div className="pl-4 grid grid-cols-2 gap-2 text-slate-600 font-medium text-[11px] pt-1">
                  {Object.entries(report.expensesByCategory).map(([cat, amount]) => (
                    <div key={cat} className="flex justify-between bg-white p-2 rounded-lg border border-slate-100">
                      <span className="capitalize">{cat}:</span>
                      <span className="font-bold text-slate-800">RD$ {amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Net Profit Summary */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-950 text-white flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-xs text-purple-300 font-bold block uppercase tracking-wider">
                    (=) BENEFICIO NETO CONTABLE
                  </span>
                  <span className="text-xs text-purple-200 font-medium">
                    Margen de Ganancia Real: <strong>{report.metrics.profitMargin}%</strong>
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black text-yellow-300">
                    RD$ {report.metrics.netProfit.toLocaleString()}
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    report.metrics.netProfit >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {report.metrics.netProfit >= 0 ? 'Superávit / Ganancia' : 'Déficit Operativo'}
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Expense Category Breakdown */}
          <div className="space-y-6">
            
            {/* Category Bars */}
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-600" />
                Desglose de Gastos por Categoría
              </h3>

              <div className="space-y-3 text-xs font-semibold">
                {Object.entries(report.expensesByCategory).map(([cat, amount]) => {
                  const totalExp = report.metrics.totalExpenses || 1;
                  const pct = Math.min(100, Math.round((amount / totalExp) * 100));
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span className="capitalize font-bold text-slate-800">{cat}</span>
                        <span>RD$ {amount.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black">
                <span className="text-slate-500">Total Gastos Egresados:</span>
                <span className="text-rose-600 font-extrabold text-sm">
                  RD$ {report.metrics.totalExpenses.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quick Actions Box */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-[2.5rem] p-6 border border-purple-100 space-y-4">
              <h3 className="font-extrabold text-purple-950 text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-purple-600" />
                Descargas y Certificación
              </h3>
              <p className="text-xs text-slate-600">
                Genere reportes listos para auditorías contables, declaración impositiva o reportes a socios inversionistas.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleExportPdf}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-black py-2.5 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Descargar Reporte PDF Ejecutivo</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Libro en Excel (.xlsx)</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: GASTOS & EGRESOS DETALLADOS */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Histórico de Gastos Operativos & Deducciones ({filteredExpenses.length})
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Detalle de egresos imputados a {report.user.displayName}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar gastos..."
                  value={expenseSearchQuery}
                  onChange={(e) => setExpenseSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 w-52 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={() => {
                  setExpTargetUserUid(isGlobalMode ? (currentUser?.uid || '') : (targetUser?.uid || ''));
                  setIsExpenseModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nuevo Gasto</span>
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Concepto</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5">Comprobante / NCF</th>
                  <th className="p-3.5">Asignado a</th>
                  <th className="p-3.5 text-right">Monto (DOP)</th>
                  <th className="p-3.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                      No se encontraron registros de gastos para el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-slate-500 font-semibold whitespace-nowrap">{exp.date}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[11px] text-slate-400 font-normal truncate max-w-[240px]">{exp.notes}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                        {exp.reference || '—'}
                      </td>
                      <td className="p-3.5 text-slate-600 text-xs">
                        {exp.userName || exp.userEmail || (isGlobalMode ? 'Plataforma' : report.user.displayName)}
                      </td>
                      <td className="p-3.5 text-right font-black text-rose-600 whitespace-nowrap">
                        - RD$ {exp.amount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        {!exp.isAutomaticFee && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar registro de gasto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: BENEFICIOS & VENTAS DETALLADAS */}
      {activeTab === 'incomes' && (
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Histórico de Operaciones de Ingresos & Beneficios ({filteredIncomes.length})
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Ventas, comisiones ganadas y fletes procesados para {report.user.displayName}
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar órdenes o productos..."
                value={incomeSearchQuery}
                onChange={(e) => setIncomeSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 w-60 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Incomes Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Guía / Referencia</th>
                  <th className="p-3.5">Concepto / Producto</th>
                  <th className="p-3.5">Destino</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5 text-right">Monto Bruto</th>
                  <th className="p-3.5 text-right">Comisión Fee</th>
                  <th className="p-3.5 text-right">Beneficio Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredIncomes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                      No se encontraron registros de ingresos para el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredIncomes.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-slate-500 font-semibold whitespace-nowrap">{inc.date}</td>
                      <td className="p-3.5 font-mono text-[11px] text-purple-700 font-bold whitespace-nowrap">
                        #{inc.referenceId}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{inc.title}</div>
                        {inc.customerName && (
                          <div className="text-[11px] text-slate-400 font-normal">Cliente: {inc.customerName}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 text-[11px]">
                        {inc.customerLocation || 'RD'}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                          inc.status === 'entregado'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : (inc.status === 'cancelado' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200')
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-800 whitespace-nowrap">
                        RD$ {inc.grossAmount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-semibold text-rose-600 whitespace-nowrap">
                        {inc.platformFee > 0 ? `- RD$ ${inc.platformFee.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3.5 text-right font-black text-emerald-600 whitespace-nowrap">
                        RD$ {inc.netIncome.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 4: AUDITORÍA DE CONTABILIDAD POR USUARIO (SOLO SUPER ADMIN) */}
      {activeTab === 'users_audit' && isSuper && (
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Auditoría Contable Comparativa por Usuario ({usersAuditList.length})
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Consulte y audite los beneficios y gastos de cada miembro registrado en Sanpi
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o tienda..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Usuario / Tienda</th>
                  <th className="p-3.5">Rol</th>
                  <th className="p-3.5">Provincia</th>
                  <th className="p-3.5">Plan</th>
                  <th className="p-3.5 text-right">Ingresos Brutos</th>
                  <th className="p-3.5 text-right">Gastos Asignados</th>
                  <th className="p-3.5 text-right">Beneficio Neto</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {usersAuditList.map((u) => {
                  const userReport = computeUserAccounting(u, period, false);
                  const isSelected = selectedUserUid === u.uid;

                  return (
                    <tr key={u.uid} className={`hover:bg-purple-50/40 transition-colors ${isSelected ? 'bg-purple-50/60' : ''}`}>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{u.displayName || u.email}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                        {u.storeName && (
                          <div className="text-[10px] text-purple-700 font-bold">🏪 {u.storeName}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-700 font-bold uppercase px-2 py-0.5 rounded-md text-[10px]">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 text-xs">
                        {u.province || '—'}
                      </td>
                      <td className="p-3.5 font-bold uppercase text-[11px] text-purple-700">
                        {u.plan || 'pro'}
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                        RD$ {userReport.metrics.grossRevenue.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-black text-rose-600 whitespace-nowrap">
                        - RD$ {userReport.metrics.totalExpenses.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-black whitespace-nowrap">
                        <span className={userReport.metrics.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          RD$ {userReport.metrics.netProfit.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUserUid(u.uid);
                              setActiveTab('balance');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            title="Abrir y ver contabilidad de este usuario"
                          >
                            Ver Balance
                          </button>
                          <button
                            onClick={() => exportAccountingToPdf(userReport)}
                            className="p-1 text-slate-500 hover:text-purple-600 rounded-lg"
                            title="Descargar PDF de este usuario"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => exportAccountingToExcel(userReport)}
                            className="p-1 text-slate-500 hover:text-emerald-600 rounded-lg"
                            title="Descargar Excel de este usuario"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* MODAL: REGISTRAR GASTO OPERATIVO */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Registrar Gasto / Egreso Contable
                  </h3>
                  <p className="text-xs text-slate-500">Asentar partida en el libro diario de Sanpi</p>
                </div>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              
              {/* Asignar Usuario */}
              {isSuper && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Imputar Gasto a Usuario / Tienda:</label>
                  <select
                    value={expTargetUserUid}
                    onChange={(e) => setExpTargetUserUid(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">👑 Plataforma Global (Gasto Central Sanpi)</option>
                    {usersList.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName || u.email} ({u.role.toUpperCase()}) {u.storeName ? `- ${u.storeName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Concepto o Descripción del Gasto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Empaques biodegradables, Campaña Meta Ads, Servidores..."
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoría *</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="logistica">Logística & Empaques</option>
                    <option value="marketing">Marketing & Publicidad</option>
                    <option value="servidores">Servidores & APIs Cloud</option>
                    <option value="nomina">Nómina & Choferes</option>
                    <option value="inventario">Inventario & Suministros</option>
                    <option value="suscripciones">Suscripciones & Software</option>
                    <option value="otros">Otros Gastos Varios</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto en Pesos (RD$) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Monto DOP"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-black text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha del Gasto</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Comprobante / NCF (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: B0100001234 o Factura"
                    value={expReference}
                    onChange={(e) => setExpReference(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales sobre este egreso..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md transition-colors"
                >
                  {isSubmittingExpense ? 'Guardando...' : 'Asentar Gasto'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
