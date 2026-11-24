import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import type { Article, Delivery, Expense, LandingPageConfig, Store, Transaction, UserProfile } from '../types';
import { auth, db } from '../lib/firebase';
import { sanpiManager } from '../lib/storeManager';
import { accountingScope } from '../lib/accountingScope';
import { normalizeDeliveryStatus } from '../lib/deliveryWorkflow';
import { reconcileSales, type ReconciledSale } from '../lib/accountingReconciliation';
import { exportSettlementsExcel, exportSettlementsPdf } from '../lib/settlementExport';
import { allocateStoreExpenses, financialAudit, type FinanceScope } from '../lib/financialAudit';
import { exportFinancialAuditExcel, exportFinancialAuditPdf } from '../lib/financialAuditExport';

type Kind = 'expense' | 'income';
type Tab = 'summary' | 'audit' | 'settlements' | 'products' | 'expenses' | 'incomes' | 'categories';
interface Category { id: string; ownerId: string; kind: Kind; name: string; createdAt: string }
interface Income { id: string; ownerId: string; title: string; category: string; amount: number; date: string; createdAt: string; financeScope?: FinanceScope }
interface Props { currentUser: UserProfile | null; stores: Store[]; articles: Article[]; deliveries: Delivery[]; transactions: Transaction[]; expenses: Expense[]; landingPages: LandingPageConfig[] }
const defaults: Record<Kind, string[]> = { expense: ['Logística', 'Marketing', 'Inventario', 'Nómina', 'Servicios', 'Otros'], income: ['Ventas', 'Comisiones', 'Servicios', 'Otros'] };
const money = (n: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n || 0);
const today = () => new Date().toISOString().slice(0, 10);

export const AccountingWorkspace: React.FC<Props> = ({ currentUser, stores, articles, deliveries, transactions, expenses, landingPages }) => {
  const [tab, setTab] = useState<Tab>('summary');
  const [categories, setCategories] = useState<Category[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [userExpenses, setUserExpenses] = useState<Expense[]>([]);
  const [kind, setKind] = useState<Kind>('expense');
  const [categoryName, setCategoryName] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(defaults.expense[0]);
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [auditStore, setAuditStore] = useState('');
  const [auditDriver, setAuditDriver] = useState('');
  const [financeScope, setFinanceScope] = useState<FinanceScope>('general');
  const [expenseStore, setExpenseStore] = useState('');
  const [deductFromSettlement, setDeductFromSettlement] = useState(false);
  const [settlementStore, setSettlementStore] = useState('');
  const [settlementReference, setSettlementReference] = useState('');
  const [firebaseUid, setFirebaseUid] = useState<string | null>(auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser.uid : null);
  const userId = currentUser?.role === 'customer' ? null : currentUser?.uid;
  const canSync = Boolean(userId && firebaseUid === userId);

  useEffect(() => onAuthStateChanged(auth, user => setFirebaseUid(user && !user.isAnonymous ? user.uid : null)), []);

  useEffect(() => {
    if (!userId) return;
    if (!canSync) {
      try {
        setCategories(JSON.parse(localStorage.getItem(`sanpi_accounting_categories_${userId}`) || '[]'));
        setIncomes(JSON.parse(localStorage.getItem(`sanpi_accounting_incomes_${userId}`) || '[]'));
        setUserExpenses(JSON.parse(localStorage.getItem(`sanpi_accounting_expenses_${userId}`) || '[]'));
      } catch { setCategories([]); setIncomes([]); setUserExpenses([]); }
      return;
    }
    const stopCategories = onSnapshot(query(collection(db, 'accounting_categories'), where('ownerId', '==', userId)), snap => setCategories(snap.docs.map(d => d.data() as Category)), () => setMessage('No se pudieron cargar las categorías.'));
    const stopIncomes = onSnapshot(query(collection(db, 'accounting_incomes'), where('ownerId', '==', userId)), snap => setIncomes(snap.docs.map(d => d.data() as Income)), () => setMessage('No se pudieron cargar los ingresos.'));
    const stopExpenses = onSnapshot(query(collection(db, 'accounting_user_expenses'), where('userId', '==', userId)), snap => setUserExpenses(snap.docs.map(d => d.data() as Expense)), () => setMessage('No se pudieron cargar los gastos.'));
    return () => { stopCategories(); stopIncomes(); stopExpenses(); };
  }, [userId, canSync]);

  const scoped = useMemo(() => accountingScope(currentUser, stores, articles, deliveries, expenses, landingPages), [currentUser, stores, articles, deliveries, expenses, landingPages]);
  const reconciled = useMemo(() => reconcileSales(scoped.deliveries, transactions, stores), [scoped.deliveries, transactions, stores]);
  const auditFilters = { from: auditFrom, to: auditTo, storeId: auditStore, driverId: auditDriver };
  const audit = financialAudit(reconciled, scoped.expenses, incomes, auditFilters);
  const auditSummary = financialAudit(reconciled, scoped.expenses, incomes);
  const deliveredRows = reconciled.filter(row => row.delivered);
  const missingTransactions = deliveredRows.filter(row => !row.transaction).length;
  const payableToStores = deliveredRows.filter(row => !row.delivery.storePaidAt).reduce((sum, row) => sum + row.storePayable, 0);
  const payableToDrivers = deliveredRows.filter(row => !row.delivery.driverPaidAt).reduce((sum, row) => sum + (row.delivery.deliveryPayment || 0), 0);
  const storeBatchRows = deliveredRows.filter(row => row.delivery.storeId === settlementStore && !row.delivery.storePaidAt).slice(0, 50);
  const storeBatchExpenses = scoped.expenses.filter(expense => expense.storeId === settlementStore && expense.deductFromStoreSettlement && !expense.settledAt);
  const storeBatchGross = storeBatchRows.reduce((sum, row) => sum + row.storePayable, 0);
  const storeBatchExpenseTotal = storeBatchExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const storeBatchNet = Math.max(0, storeBatchGross - storeBatchExpenseTotal);
  const currentDeliveries = scoped.deliveries.filter(d => filter === 'all' || normalizeDeliveryStatus(d.status) === filter);
  const financialRows = scoped.deliveries.map(d => {
    const article = articles.find(a => a.id === d.articleId);
    return { delivery: d, cost: (d.unitCostAtSale ?? article?.costPerItem ?? article?.wholesalePrice ?? article?.baseCost ?? 0) * (d.quantity || 1) };
  });
  const rows = financialRows.filter(row => currentDeliveries.includes(row.delivery));
  const delivered = financialRows.filter(row => normalizeDeliveryStatus(row.delivery.status) === 'entregado');
  const sales = delivered.reduce((n, row) => n + row.delivery.basePrice, 0);
  const costs = delivered.reduce((n, row) => n + row.cost, 0);
  const visibleExpenses = currentUser?.role === 'admin' ? scoped.expenses : [...scoped.expenses, ...userExpenses];
  const expensesTotal = visibleExpenses.reduce((n, e) => n + e.amount, 0);
  const incomesTotal = incomes.reduce((n, i) => n + i.amount, 0);
  const freightIncome = delivered.reduce((n, row) => n + (row.delivery.deliveryFee ?? row.delivery.shippingFee ?? 0), 0);
  const driverPayments = delivered.reduce((n, row) => n + (row.delivery.deliveryPayment ?? 0), 0);
  const collectedCash = delivered.reduce((n, row) => n + (row.delivery.totalToCollect ?? 0), 0);
  const cashPendingOffice = delivered.filter(row => !row.delivery.isPaidToOffice).reduce((n, row) => n + (row.delivery.totalToCollect ?? 0), 0);
  const categoriesFor = (type: Kind) => [...new Set([...defaults[type], ...categories.filter(c => c.kind === type).map(c => c.name)])];
  const choose = (next: Tab) => { setTab(next); if (next === 'expenses' || next === 'incomes') { const type = next === 'expenses' ? 'expense' : 'income'; setKind(type); setCategory(defaults[type][0]); } };

  const settle = async (row: ReconciledSale, kind: 'store' | 'driver') => {
    if (currentUser?.role !== 'admin' || !canSync || !row.delivered) return;
    if (kind === 'store' && scoped.expenses.some(expense => expense.storeId === row.delivery.storeId && expense.deductFromStoreSettlement && !expense.settledAt)) {
      setSettlementStore(row.delivery.storeId);
      setMessage('Esta tienda tiene gastos pendientes de deducir. Usa la liquidación conjunta.');
      return;
    }
    const reference = settlementReference.trim();
    if (!reference) { setMessage('Escribe la referencia del pago antes de liquidar.'); return; }
    const value = kind === 'store' ? row.storePayable : row.delivery.deliveryPayment || 0;
    if (value <= 0) { setMessage('No hay un monto pendiente para esta liquidación.'); return; }
    if (kind === 'store' && row.delivery.storePaidAt || kind === 'driver' && row.delivery.driverPaidAt) return;
    const recipient = kind === 'store' ? row.store?.name || row.delivery.storeId : row.delivery.deliveryPersonName || row.delivery.deliveryPersonId || 'repartidor';
    const legacyWarning = kind === 'store' && !row.transaction ? '\nEsta guía no tiene transacción histórica vinculada; verifica la comisión antes de confirmar.' : '';
    if (!window.confirm(`Registrar pago de ${money(value)} a ${recipient} para la guía ${row.delivery.trackingNumber}?\nReferencia: ${reference}${legacyWarning}`)) return;
    setBusy(true);
    try {
      await sanpiManager.recordSettlement(row.delivery.id, kind, currentUser.uid, value, reference);
      setSettlementReference('');
      setMessage(`Pago a ${recipient} registrado. La transferencia se realiza fuera de esta aplicación.`);
    } catch { setMessage('No se pudo registrar la liquidación. Revisa tu permiso de administrador y la conexión.'); }
    finally { setBusy(false); }
  };

  const settleStoreBatch = async () => {
    if (currentUser?.role !== 'admin' || !canSync || !settlementStore || !storeBatchRows.length) return;
    const reference = settlementReference.trim();
    if (!reference) { setMessage('Escribe la referencia del pago confirmado.'); return; }
    try { allocateStoreExpenses(storeBatchRows.map(row => row.storePayable), storeBatchExpenseTotal); }
    catch { setMessage('Los gastos pendientes superan el importe de estas guías.'); return; }
    const storeName = stores.find(store => store.id === settlementStore)?.name || settlementStore;
    if (!window.confirm(`Registrar liquidación ya pagada a ${storeName}: ${storeBatchRows.length} guías, ${money(storeBatchGross)} bruto, ${money(storeBatchExpenseTotal)} en gastos y ${money(storeBatchNet)} pagados. Referencia: ${reference}`)) return;
    setBusy(true);
    try {
      const result = await sanpiManager.recordStoreBatchSettlement(settlementStore, storeBatchRows.map(row => row.delivery.id), storeBatchExpenses.map(expense => expense.id), currentUser.uid, reference);
      setSettlementReference('');
      setMessage(`${result.count} guías liquidadas. Gastos descontados: ${money(result.expenses)}. Pago registrado: ${money(result.paid)}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo registrar la liquidación conjunta.'); }
    finally { setBusy(false); }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault(); if (!userId) return;
    const name = categoryName.trim().slice(0, 60);
    if (!name || categoriesFor(kind).some(c => c.toLowerCase() === name.toLowerCase())) { setMessage('La categoría está vacía o ya existe.'); return; }
    setBusy(true);
    try {
      const item: Category = { id: crypto.randomUUID(), ownerId: userId, kind, name, createdAt: new Date().toISOString() };
      if (canSync) await setDoc(doc(db, 'accounting_categories', item.id), item);
      else {
        const next = [...categories, item];
        localStorage.setItem(`sanpi_accounting_categories_${userId}`, JSON.stringify(next));
        setCategories(next);
      }
      setCategoryName(''); setMessage(canSync ? 'Categoría creada.' : 'Categoría guardada en este dispositivo. Inicia sesión con Google para sincronizar entre dispositivos.');
    } catch { setMessage('No se pudo guardar la categoría. Comprueba tu sesión y conexión.'); }
    finally { setBusy(false); }
  };

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !currentUser || !title.trim() || !date || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return;
    if (kind === 'expense' && deductFromSettlement && (currentUser.role !== 'admin' || !expenseStore)) { setMessage('Selecciona una tienda para descontar el gasto en su liquidación.'); return; }
    setBusy(true);
    try {
      if (kind === 'expense') {
        if (currentUser.role === 'admin') await sanpiManager.addExpense(title.trim(), category, Number(amount), { userId, userEmail: currentUser.email || undefined, userRole: currentUser.role, date, financeScope, storeId: expenseStore || undefined, deductFromStoreSettlement: deductFromSettlement });
        else {
          const item: Expense = { id: crypto.randomUUID(), userId, userEmail: currentUser.email || undefined, userRole: currentUser.role, title: title.trim(), category, amount: Number(amount), date, createdAt: new Date().toISOString(), financeScope: 'general' };
          if (canSync) await setDoc(doc(db, 'accounting_user_expenses', item.id), item);
          else { const next = [...userExpenses, item]; localStorage.setItem(`sanpi_accounting_expenses_${userId}`, JSON.stringify(next)); setUserExpenses(next); }
        }
      }
      else {
        const item: Income = { id: crypto.randomUUID(), ownerId: userId, title: title.trim(), category, amount: Number(amount), date, createdAt: new Date().toISOString(), financeScope: currentUser.role === 'admin' ? financeScope : 'general' };
        if (canSync) await setDoc(doc(db, 'accounting_incomes', item.id), item);
        else {
          const next = [...incomes, item];
          localStorage.setItem(`sanpi_accounting_incomes_${userId}`, JSON.stringify(next));
          setIncomes(next);
        }
      }
      setTitle(''); setAmount(''); setDeductFromSettlement(false); setMessage(canSync || kind === 'expense' ? 'Movimiento guardado.' : 'Ingreso guardado en este dispositivo. Inicia sesión con Google para sincronizar entre dispositivos.');
    } catch { setMessage('No se pudo guardar el movimiento. Comprueba tu sesión y conexión.'); }
    finally { setBusy(false); }
  };

  if (!userId) return <section className="rounded-2xl bg-white p-8">La contabilidad está disponible para usuarios registrados que no sean clientes.</section>;
  return <section className="space-y-6 pb-12">
    <header><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-700">Sanpi Market · Finanzas</p><h1 className="mt-2 text-3xl font-bold">Contabilidad</h1><p className="mt-2 text-sm text-slate-500">Ventas, costos, gastos y pedidos asociados a tu cuenta.</p></header>
    <nav aria-label="Secciones de contabilidad" className="flex gap-2 overflow-x-auto pb-1">{([['summary','Resumen'],...(currentUser?.role === 'admin' ? [['audit','Balance operativo']] : []),['settlements','Liquidaciones'],['products','Artículos'],['expenses','Gastos'],['incomes','Ingresos'],['categories','Categorías']] as [Tab,string][]).map(([key, label]) => <button key={key} onClick={() => choose(key)} aria-current={tab === key ? 'page' : undefined} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}>{label}</button>)}</nav>
    {message && <p role="status" className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">{message}</p>}
    {tab === 'summary' && <>
      {(currentUser?.role === 'admin' || currentUser?.role === 'carrier') && <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><h2 className="font-bold text-violet-950">Cuadre de entregas completadas</h2><div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-3">{[['Fletes facturados',freightIncome],['Pagos a repartidores',driverPayments],['Efectivo cobrado (COD)',collectedCash],['Pendiente de entregar a oficina',cashPendingOffice]].map(([label,value]) => <div key={label} className="rounded-xl bg-white p-4"><p className="text-xs text-violet-700">{label}</p><p className="mt-2 text-lg font-bold text-violet-950">{money(Number(value))}</p></div>)}</div><p className="mt-3 text-xs text-violet-700">Los fletes y pagos a repartidores se muestran separados del resultado de venta de artículos. El efectivo pendiente corresponde a cobros todavía no entregados a la oficina.</p></div>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{(currentUser?.role === 'admin' ? [['Ventas entregadas',sales],['Comisiones marketplace',auditSummary.commissions],['Fletes facturados',auditSummary.freight],['Resultado plataforma',auditSummary.net]] : [['Ventas entregadas',sales],['Costo de artículos',costs],['Gastos',expensesTotal],['Resultado',sales - costs - expensesTotal + incomesTotal]]).map(([label,value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-3 text-xl font-bold">{money(Number(value))}</p></div>)}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Estado de los pedidos</h2><div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">{[['Pendientes',scoped.deliveries.filter(d => ['pendiente','pendiente de recoger pickup'].includes(normalizeDeliveryStatus(d.status))).length,'text-orange-600'],['En tránsito',scoped.deliveries.filter(d => normalizeDeliveryStatus(d.status) === 'en tránsito').length,'text-blue-600'],['Entregados',scoped.deliveries.filter(d => normalizeDeliveryStatus(d.status) === 'entregado').length,'text-green-600'],['Devoluciones',scoped.deliveries.filter(d => ['pendiente de retorno','retornado a almacén'].includes(normalizeDeliveryStatus(d.status))).length,'text-slate-600']].map(([label,value,color]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p></div>)}</div></div>
      <label className="block text-sm font-semibold">Filtrar pedidos <select value={filter} onChange={e => setFilter(e.target.value)} className="ml-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">Todos</option>{['pendiente','pendiente de recoger pickup','en tránsito','entregado','reprogramado','pendiente de retorno','retornado a almacén','cancelado'].map(s => <option key={s} value={s}>{s}</option>)}</select></label>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['Guía','Artículo','Precio de venta','Costo','Estado'].map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{rows.map(({delivery,cost}) => <tr key={delivery.id} className="border-t border-slate-100"><td className="p-4 font-semibold">{delivery.trackingNumber}</td><td className="p-4">{delivery.articleName}</td><td className="p-4">{money(delivery.basePrice)}</td><td className="p-4">{money(cost)}</td><td className="p-4">{normalizeDeliveryStatus(delivery.status)}</td></tr>)}</tbody></table>{!rows.length && <p className="p-6 text-sm text-slate-500">No hay pedidos para esta selección.</p>}</div>
    </>}
    {tab === 'audit' && currentUser?.role === 'admin' && <div className="space-y-5">
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><h2 className="text-lg font-bold text-violet-950">Balance operativo</h2><p className="mt-1 text-sm text-violet-800">Las ventas de mercancía se liquidan a las tiendas. La utilidad de Sanpi separa fletes, comisiones e ingresos y gastos independientes.</p></div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold text-slate-700">Desde<input type="date" value={auditFrom} max={auditTo || undefined} onChange={e => setAuditFrom(e.target.value)} className="order-input mt-1" /></label>
        <label className="text-xs font-semibold text-slate-700">Hasta<input type="date" value={auditTo} min={auditFrom || undefined} onChange={e => setAuditTo(e.target.value)} className="order-input mt-1" /></label>
        <label className="text-xs font-semibold text-slate-700">Tienda<select value={auditStore} onChange={e => setAuditStore(e.target.value)} className="order-input mt-1"><option value="">Todas las tiendas</option>{stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">Repartidor<select value={auditDriver} onChange={e => setAuditDriver(e.target.value)} className="order-input mt-1"><option value="">Todos los repartidores</option>{[...new Map(reconciled.filter(row => row.delivery.deliveryPersonId).map(row => [row.delivery.deliveryPersonId, row.delivery.deliveryPersonName || row.delivery.deliveryPersonId])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4"><button onClick={() => exportFinancialAuditPdf(audit, auditFilters).catch(() => setMessage('No se pudo crear el PDF.'))} disabled={!audit.delivered.length} className="rounded-xl border border-violet-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Descargar PDF</button><button onClick={() => exportFinancialAuditExcel(audit).catch(() => setMessage('No se pudo crear el Excel.'))} className="rounded-xl border border-violet-300 px-4 py-2 text-sm font-semibold">Descargar Excel</button><button onClick={() => { setAuditFrom(''); setAuditTo(''); setAuditStore(''); setAuditDriver(''); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600">Limpiar filtros</button></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[['Fletes cobrados',audit.freight],['Ingresos logísticos',audit.logisticsIncome],['Pago repartidores',audit.drivers],['Gastos logísticos',audit.logisticsExpenses],['Utilidad logística',audit.logisticsNet],['Comisiones Sanpi',audit.commissions],['Otros ingresos marketplace',audit.marketplaceIncome],['Gastos marketplace',audit.marketplaceExpenses],['Utilidad marketplace',audit.marketplaceNet],['Resultado neto',audit.net]].map(([label,value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-lg font-bold text-slate-950">{money(Number(value))}</p></div>)}</div>
      <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">Efectivo COD pendiente de entregar a oficina: <strong>{money(audit.cashToOffice)}</strong>. Resultado general adicional: <strong>{money(audit.generalNet)}</strong>.</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50"><tr>{['Guía / fecha','Tienda','Repartidor','Mercancía','Flete','Pago repartidor','Comisión','A tienda'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{audit.delivered.map(row => <tr key={row.delivery.id} className="border-t border-slate-100"><td className="p-3 font-semibold">{row.delivery.trackingNumber}<small className="block font-normal text-slate-500">{row.deliveredAt.slice(0,10)}</small></td><td className="p-3">{row.store?.name || row.delivery.storeId}</td><td className="p-3">{row.delivery.deliveryPersonName || row.delivery.deliveryPersonId || 'Sin asignar'}</td><td className="p-3">{money(row.productAmount)}</td><td className="p-3">{money(row.shippingAmount)}</td><td className="p-3">{money(row.delivery.deliveryPayment || 0)}</td><td className="p-3">{row.hasConfirmedCommission ? money(row.commissionAmount) : 'Por revisar'}</td><td className="p-3">{money(row.storePayable)}</td></tr>)}</tbody></table>{!audit.delivered.length && <p className="p-5 text-sm text-slate-500">No hay entregas para estos filtros.</p>}</div>
    </div>}
    {tab === 'settlements' && <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">{[['Órdenes entregadas', deliveredRows.length.toLocaleString('es-DO')], ['Pendiente a tiendas', money(payableToStores)], ['Pendiente a repartidores', money(payableToDrivers)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-slate-900">{value}</p></div>)}</div>
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-violet-200 bg-violet-50 p-5"><div><h2 className="font-bold text-violet-950">Ventas para liquidar</h2><p className="mt-1 text-sm text-violet-800">Cada guía entregada aparece una sola vez. {missingTransactions ? `${missingTransactions} sin transacción histórica: revisa su comisión antes de registrar el pago.` : 'Todas tienen transacción vinculada.'}</p></div><div className="flex gap-2"><button onClick={() => exportSettlementsExcel(deliveredRows).catch(() => setMessage('No se pudo crear el Excel.'))} disabled={!deliveredRows.length} className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-xs font-semibold disabled:opacity-50">Excel</button><button onClick={() => exportSettlementsPdf(deliveredRows).catch(() => setMessage('No se pudo crear el PDF.'))} disabled={!deliveredRows.length} className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-xs font-semibold disabled:opacity-50">PDF</button></div></div>
      {currentUser?.role === 'admin' && <label className="block max-w-md text-sm font-semibold">Referencia del pago confirmado<input value={settlementReference} onChange={event => setSettlementReference(event.target.value)} maxLength={100} placeholder="Transferencia, recibo o comprobante" className="order-input mt-2" /><span className="mt-1 block text-xs font-normal text-slate-500">Registrar aquí no envía dinero; deja constancia de un pago ya realizado.</span></label>}
      {currentUser?.role === 'admin' && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-bold text-amber-950">Liquidación conjunta por tienda</h3><p className="mt-1 text-sm text-amber-900">Registra hasta 50 guías pendientes en una operación. Se descuentan los gastos manuales de esa tienda que todavía no se hayan aplicado.</p><label className="mt-4 block max-w-md text-sm font-semibold">Tienda<select value={settlementStore} onChange={event => setSettlementStore(event.target.value)} className="order-input mt-2"><option value="">Seleccionar tienda</option>{stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>{settlementStore && <><div className="mt-4 grid gap-3 sm:grid-cols-4">{[['Guías',storeBatchRows.length],['Bruto a tienda',money(storeBatchGross)],['Gastos a descontar',money(storeBatchExpenseTotal)],['Pago neto',money(storeBatchNet)]].map(([label,value]) => <div key={label} className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}</div>{storeBatchExpenses.length > 0 && <p className="mt-3 text-xs text-amber-900">Gastos incluidos: {storeBatchExpenses.map(expense => `${expense.title} (${money(expense.amount)})`).join(', ')}</p>}{storeBatchExpenseTotal > storeBatchGross && <p className="mt-2 text-sm font-bold text-red-700">Los gastos superan las guías seleccionadas. Registra más entregas antes de liquidar.</p>}<button onClick={settleStoreBatch} disabled={busy || !canSync || !storeBatchRows.length || storeBatchExpenseTotal > storeBatchGross || !settlementReference.trim()} className="mt-4 rounded-xl bg-amber-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Registrar liquidación conjunta</button></>}</div>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50"><tr>{['Guía y fecha','Tienda / artículo','Venta','Comisión','Pimdrop','A tienda','Flete','Repartidor','Liquidación'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{deliveredRows.map(row => <tr key={row.delivery.id} className="border-t border-slate-100 align-top"><td className="p-3"><strong>{row.delivery.trackingNumber}</strong><small className="block text-slate-500">{row.deliveredAt?.slice(0, 10)}</small></td><td className="p-3">{row.store?.name || row.delivery.storeId}<small className="block text-slate-500">{row.delivery.articleName}</small>{!row.transaction && <small className="block font-semibold text-amber-700">Sin transacción histórica</small>}</td><td className="p-3">{money(row.productAmount)}</td><td className="p-3">{row.hasConfirmedCommission ? money(row.commissionAmount) : 'Por revisar'}</td><td className="p-3">{money(row.dropshipperAmount)}</td><td className="p-3 font-bold">{money(row.storePayable)}</td><td className="p-3">{money(row.shippingAmount)}<small className="block text-slate-500">{row.delivery.isPaidToOffice ? 'En oficina' : 'Efectivo pendiente'}</small></td><td className="p-3">{money(row.delivery.deliveryPayment || 0)}<small className="block text-slate-500">{row.delivery.driverPaidAt ? 'Pagado' : 'Pendiente'}</small></td><td className="p-3"><div className="space-y-2">{row.delivery.storePaidAt ? <span className="text-green-700">Tienda pagada · {row.delivery.storePaymentReference || row.delivery.storePaidAt.slice(0, 10)}</span> : currentUser?.role === 'admin' ? <button onClick={() => settle(row, 'store')} disabled={busy || !canSync} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Registrar pago tienda</button> : <span>Pendiente tienda</span>}{row.delivery.deliveryPayment && !row.delivery.driverPaidAt && currentUser?.role === 'admin' ? <button onClick={() => settle(row, 'driver')} disabled={busy || !canSync} className="block rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">Registrar pago repartidor</button> : null}</div></td></tr>)}</tbody></table>{!deliveredRows.length && <p className="p-6 text-sm text-slate-500">No hay entregas completadas en tu ámbito.</p>}</div>
    </div>}
    {tab === 'products' && <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><h2 className="p-5 font-bold">Costo y precio de venta por artículo</h2><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['Artículo','Costo unitario','Precio de venta','Margen bruto','Inventario'].map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{scoped.articles.map(a => { const c = a.costPerItem ?? a.wholesalePrice ?? a.baseCost ?? 0; return <tr key={a.id} className="border-t border-slate-100"><td className="p-4 font-semibold">{a.title || a.name}</td><td className="p-4">{money(c)}</td><td className="p-4">{money(a.price)}</td><td className="p-4">{money(a.price - c)}</td><td className="p-4">{a.stock ?? a.inventory}</td></tr>; })}</tbody></table>{!scoped.articles.length && <p className="p-6 text-sm text-slate-500">No hay artículos asociados a esta cuenta.</p>}</div>}
    {(tab === 'expenses' || tab === 'incomes') && currentUser?.role === 'admin' && <div className="grid gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-5 sm:grid-cols-2"><label className="text-sm font-semibold text-violet-950">Área financiera<select value={financeScope} onChange={e => setFinanceScope(e.target.value as FinanceScope)} className="order-input mt-2"><option value="general">General</option><option value="logistics">Fletes y logística</option><option value="marketplace">Sanpi Marketplace</option></select></label>{tab === 'expenses' && <label className="text-sm font-semibold text-violet-950">Tienda asociada al gasto<select value={expenseStore} onChange={e => setExpenseStore(e.target.value)} className="order-input mt-2"><option value="">Gasto general del área</option>{stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>}<p className="text-xs text-violet-800 sm:col-span-2">El ámbito determina dónde aparece este movimiento en el balance. Los gastos de tienda quedan identificados para revisión.</p></div>}
    {tab === 'expenses' && currentUser?.role === 'admin' && <label className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950"><input type="checkbox" checked={deductFromSettlement} onChange={e => setDeductFromSettlement(e.target.checked)} className="h-4 w-4" />Descontar este gasto de la próxima liquidación de la tienda seleccionada</label>}
    {(tab === 'expenses' || tab === 'incomes') && <div className="grid lg:grid-cols-[minmax(280px,380px)_1fr] gap-5"><form onSubmit={addEntry} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"><h2 className="font-bold">{tab === 'expenses' ? 'Registrar gasto' : 'Registrar ingreso'}</h2><label className="block text-xs font-semibold">Concepto<input required value={title} onChange={e => setTitle(e.target.value)} className="order-input mt-1" /></label><label className="block text-xs font-semibold">Monto (RD$)<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="order-input mt-1" /></label><label className="block text-xs font-semibold">Fecha<input required type="date" value={date} onChange={e => setDate(e.target.value)} className="order-input mt-1" /></label><label className="block text-xs font-semibold">Categoría<select value={category} onChange={e => setCategory(e.target.value)} className="order-input mt-1">{categoriesFor(kind).map(c => <option key={c}>{c}</option>)}</select></label><button disabled={busy} className="w-full rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold disabled:opacity-50">Guardar movimiento</button></form><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">{tab === 'expenses' ? 'Gastos registrados' : 'Ingresos registrados'}</h2><div className="mt-4 divide-y divide-slate-100">{(tab === 'expenses' ? visibleExpenses : incomes).map(item => <div key={item.id} className="flex justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{item.title}</p><p className="text-xs text-slate-500">{item.category} · {item.date}</p></div><strong>{money(item.amount)}</strong></div>)}</div>{!(tab === 'expenses' ? visibleExpenses : incomes).length && <p className="mt-5 text-sm text-slate-500">Aún no hay movimientos.</p>}</div></div>}
    {tab === 'categories' && <div className="grid md:grid-cols-2 gap-5"><form onSubmit={addCategory} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"><h2 className="font-bold">Crear categoría</h2><label className="block text-xs font-semibold">Tipo<select value={kind} onChange={e => { const next = e.target.value as Kind; setKind(next); setCategory(defaults[next][0]); }} className="order-input mt-1"><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label><label className="block text-xs font-semibold">Nombre<input required maxLength={60} value={categoryName} onChange={e => setCategoryName(e.target.value)} className="order-input mt-1" /></label><button disabled={busy} className="rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold disabled:opacity-50">Crear categoría</button></form><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Categorías independientes</h2>{(['expense','income'] as const).map(type => <div key={type} className="mt-5"><h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{type === 'expense' ? 'Gastos' : 'Ingresos'}</h3><div className="flex flex-wrap gap-2 mt-2">{categoriesFor(type).map(name => <span key={name} className="rounded-full border border-slate-200 px-3 py-1 text-xs">{name}</span>)}</div></div>)}</div></div>}
  </section>;
};
