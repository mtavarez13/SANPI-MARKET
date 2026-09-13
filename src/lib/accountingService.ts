import { sanpiManager } from './storeManager';
import { UserProfile, Expense, Transaction, Delivery } from '../types';

export interface AccountingIncomeItem {
  id: string;
  date: string;
  type: 'venta_tienda' | 'comision_dropshipper' | 'venta_mayorista' | 'flete_transporte' | 'comision_plataforma' | 'suscripcion_mrr' | 'otro';
  title: string;
  referenceId: string;
  customerName?: string;
  customerLocation?: string;
  grossAmount: number;
  platformFee: number;
  shippingFee: number;
  netIncome: number;
  status: 'entregado' | 'en_transito' | 'pendiente' | 'cancelado';
}

export interface AccountingExpenseItem {
  id: string;
  date: string;
  title: string;
  category: Expense['category'];
  amount: number;
  reference?: string;
  notes?: string;
  userEmail?: string;
  userName?: string;
  isAutomaticFee?: boolean;
}

export interface UserAccountingReport {
  user: {
    uid: string;
    displayName: string;
    email: string;
    role: 'customer' | 'dropshipper' | 'partner' | 'supplier' | 'carrier' | 'admin';
    storeName?: string;
    companyName?: string;
    phone?: string;
    province?: string;
    plan?: string;
    rnc?: string;
  };
  period: string;
  isPlatformGlobal: boolean;
  metrics: {
    grossRevenue: number;
    totalPlatformCommissions: number;
    totalShippingRevenue: number;
    totalExpenses: number;
    directOperatingExpenses: number;
    subscriptionCost: number;
    netProfit: number;
    profitMargin: number;
    ordersCount: number;
    deliveredCount: number;
    fulfillmentRate: number;
    status: 'rentable' | 'equilibrio' | 'deficit';
  };
  expensesByCategory: Record<string, number>;
  incomes: AccountingIncomeItem[];
  expenses: AccountingExpenseItem[];
}

export type AccountingPeriodFilter = 'all' | 'this_month' | 'last_month' | 'last_30_days' | 'this_year';

function isWithinPeriod(dateStr: string, period: AccountingPeriodFilter): boolean {
  if (period === 'all') return true;
  if (!dateStr) return true;

  const itemDate = new Date(dateStr);
  const now = new Date();
  
  if (isNaN(itemDate.getTime())) return true;

  if (period === 'this_month') {
    return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
  }

  if (period === 'last_month') {
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return itemDate.getFullYear() === prevYear && itemDate.getMonth() === prevMonth;
  }

  if (period === 'last_30_days') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return itemDate >= thirtyDaysAgo && itemDate <= now;
  }

  if (period === 'this_year') {
    return itemDate.getFullYear() === now.getFullYear();
  }

  return true;
}

/**
 * Calculates comprehensive accounting balance, profits, and expenses for a specific user
 * or for the global platform if user is null or flagged as global.
 */
export function computeUserAccounting(
  user: UserProfile | null,
  period: AccountingPeriodFilter = 'all',
  isGlobalPlatform: boolean = false
): UserAccountingReport {
  const allStores = sanpiManager.stores;
  const allDeliveries = sanpiManager.deliveries;
  const allTransactions = sanpiManager.transactions;
  const allExpenses = sanpiManager.expenses;

  // Check if target is global platform (Super Admin overview)
  const isGlobal = isGlobalPlatform || !user || user.role === 'admin';

  let userDisplayName = user?.displayName || user?.storeName || user?.companyName || user?.email || 'Plataforma Global Sanpi';
  let userEmail = user?.email || 'admin@sanpimarket.do';
  let userRole = user?.role || 'admin';
  let userStoreName = user?.storeName || '';
  let userCompanyName = user?.companyName || '';
  let userPhone = user?.phone || '809-676-6690';
  let userProvince = user?.province || 'Distrito Nacional';
  let userPlan = user?.plan || 'pro';
  let userRnc = user?.rnc || '1-32-88990-1';

  const incomes: AccountingIncomeItem[] = [];
  const expenses: AccountingExpenseItem[] = [];

  // 1. Process Incomes
  if (isGlobal) {
    // Global Platform Incomes:
    // Sales commissions + Subscriptions + Deliveries
    allTransactions.forEach((tx) => {
      if (!isWithinPeriod(tx.createdAt, period)) return;

      const isDelivered = tx.status === 'entregado';
      incomes.push({
        id: `inc_tx_${tx.id}`,
        date: tx.createdAt.split('T')[0],
        type: 'comision_plataforma',
        title: `Comisión Venta - ${tx.productName || 'Producto COD'}`,
        referenceId: tx.trackingNumber || tx.id,
        customerName: 'Cliente Marketplace',
        customerLocation: 'República Dominicana',
        grossAmount: tx.total || 0,
        platformFee: tx.commissionAmount || 0,
        shippingFee: tx.shippingFee || 350,
        netIncome: isDelivered ? (tx.commissionAmount || 0) : 0,
        status: isDelivered ? 'entregado' : (tx.status as any || 'pendiente')
      });
    });

    // Subscriptions MRR
    const activeStores = allStores.filter(s => s.status === 'approved');
    activeStores.forEach(s => {
      const fee = sanpiManager.getPlanFee(s.plan);
      incomes.push({
        id: `inc_sub_${s.id}`,
        date: s.createdAt ? s.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        type: 'suscripcion_mrr',
        title: `Cuota Mensual Plan ${(s.plan || 'pro').toUpperCase()} - ${s.name}`,
        referenceId: `SUB-${s.id.slice(0, 6)}`,
        customerName: s.name,
        customerLocation: s.province || 'RD',
        grossAmount: fee,
        platformFee: 0,
        shippingFee: 0,
        netIncome: fee,
        status: 'entregado'
      });
    });

  } else if (userRole === 'partner') {
    // PARTNER / TIENDA:
    // Income is product sales from their store
    const userStore = allStores.find(s => 
      (user.storeName && s.name.toLowerCase() === user.storeName.toLowerCase()) ||
      (user.email && s.ownerEmail?.toLowerCase() === user.email.toLowerCase()) ||
      s.id === user.uid
    );

    const storeIdOrName = userStore?.id || user.storeName || user.uid;

    allDeliveries.forEach(del => {
      const isMatch = del.storeId === storeIdOrName || 
        (userStore && del.storeId === userStore.id) ||
        (user.storeName && del.storeId.toLowerCase() === user.storeName.toLowerCase());

      if (!isMatch) return;
      if (!isWithinPeriod(del.createdAt, period)) return;

      const basePrice = del.basePrice || 0;
      // Approximate platform commission of 10%
      const commission = Math.round(basePrice * 0.10);
      const isDelivered = del.status === 'entregado';

      incomes.push({
        id: `inc_del_${del.id}`,
        date: del.createdAt.split('T')[0],
        type: 'venta_tienda',
        title: `${del.articleName || 'Artículo de Tienda'} (Guía #${del.trackingNumber})`,
        referenceId: del.trackingNumber,
        customerName: del.customerName,
        customerLocation: `${del.municipality ? del.municipality + ', ' : ''}${del.province}`,
        grossAmount: del.totalCodAmount || basePrice + (del.shippingFee || 350),
        platformFee: commission,
        shippingFee: del.shippingFee || 350,
        netIncome: isDelivered ? (basePrice - commission) : 0,
        status: del.status as any
      });
    });

    // Partner Monthly Subscription expense
    const planFee = sanpiManager.getPlanFee(user.plan || userStore?.plan || 'pro');
    expenses.push({
      id: `exp_sub_${user.uid}`,
      date: new Date().toISOString().split('T')[0],
      title: `Cuota Mensual Suscripción Plan ${(user.plan || 'pro').toUpperCase()}`,
      category: 'suscripciones',
      amount: planFee,
      reference: `SANPI-PLAN-${(user.plan || 'pro').toUpperCase()}`,
      notes: 'Membresía activa en el ecosistema de Sanpi Marketplace',
      userEmail: user.email || undefined,
      userName: userDisplayName,
      isAutomaticFee: true
    });

  } else if (userRole === 'dropshipper') {
    // DROPSHIPPER:
    // Incomes from dropshipping commissions
    allDeliveries.forEach(del => {
      const isMatch = del.dropshipperId === user.uid ||
        (user.displayName && del.dropshipperName?.toLowerCase() === user.displayName.toLowerCase()) ||
        (user.email && del.dropshipperName?.toLowerCase() === user.email.toLowerCase()) ||
        (user.storeName && del.dropshipperName?.toLowerCase() === user.storeName.toLowerCase());

      if (!isMatch) return;
      if (!isWithinPeriod(del.createdAt, period)) return;

      const isDelivered = del.status === 'entregado';
      const profit = del.dropshipperProfit || Math.max(0, (del.basePrice || 1200) - 800);

      incomes.push({
        id: `inc_drop_${del.id}`,
        date: del.createdAt.split('T')[0],
        type: 'comision_dropshipper',
        title: `Ganancia Dropshipping - ${del.articleName || 'Producto'} (Guía #${del.trackingNumber})`,
        referenceId: del.trackingNumber,
        customerName: del.customerName,
        customerLocation: `${del.province}`,
        grossAmount: del.totalCodAmount || 0,
        platformFee: 0,
        shippingFee: del.shippingFee || 350,
        netIncome: isDelivered ? profit : 0,
        status: del.status as any
      });
    });

  } else if (userRole === 'supplier') {
    // PROVEEDOR MAYORISTA:
    // Wholesale volume sales
    allDeliveries.forEach(del => {
      if (!isWithinPeriod(del.createdAt, period)) return;
      // In B2B wholesale, consider orders of supplier items
      const isDelivered = del.status === 'entregado';
      const wholesalePrice = Math.round((del.basePrice || 1000) * 0.70);

      incomes.push({
        id: `inc_sup_${del.id}`,
        date: del.createdAt.split('T')[0],
        type: 'venta_mayorista',
        title: `Suministro Mayorista - ${del.articleName} (Guía #${del.trackingNumber})`,
        referenceId: del.trackingNumber,
        customerName: del.customerName,
        customerLocation: del.province,
        grossAmount: del.basePrice || 0,
        platformFee: Math.round(wholesalePrice * 0.05),
        shippingFee: 0,
        netIncome: isDelivered ? wholesalePrice : 0,
        status: del.status as any
      });
    });

  } else if (userRole === 'carrier') {
    // TRANSPORTISTA / LOGÍSTICA:
    // Flete fees collected (RD$ 350 per delivery)
    allDeliveries.forEach(del => {
      const isMatch = del.carrierId === user.uid ||
        (user.companyName && del.carrierName?.toLowerCase() === user.companyName.toLowerCase()) ||
        (user.displayName && del.carrierName?.toLowerCase() === user.displayName.toLowerCase()) ||
        del.carrierId === 'sacha_pack';

      if (!isMatch) return;
      if (!isWithinPeriod(del.createdAt, period)) return;

      const isDelivered = del.status === 'entregado';
      const shippingEarned = del.shippingFee || 350;

      incomes.push({
        id: `inc_car_${del.id}`,
        date: del.createdAt.split('T')[0],
        type: 'flete_transporte',
        title: `Flete Entrega Nacional COD - Guía #${del.trackingNumber}`,
        referenceId: del.trackingNumber,
        customerName: del.customerName,
        customerLocation: `${del.municipality ? del.municipality + ', ' : ''}${del.province}`,
        grossAmount: shippingEarned,
        platformFee: 0,
        shippingFee: shippingEarned,
        netIncome: isDelivered ? shippingEarned : 0,
        status: del.status as any
      });
    });

  } else {
    // CUSTOMER / COMPRADOR:
    // Record purchases
    allDeliveries.forEach(del => {
      const isMatch = (user?.email && del.customerEmail?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.phone && del.customerPhone?.replace(/\D/g, '') === user.phone.replace(/\D/g, ''));

      if (!isMatch) return;
      if (!isWithinPeriod(del.createdAt, period)) return;

      incomes.push({
        id: `inc_cust_${del.id}`,
        date: del.createdAt.split('T')[0],
        type: 'otro',
        title: `Compra Personal - ${del.articleName}`,
        referenceId: del.trackingNumber,
        customerName: del.customerName,
        customerLocation: del.province,
        grossAmount: del.totalCodAmount || 0,
        platformFee: 0,
        shippingFee: del.shippingFee || 350,
        netIncome: 0,
        status: del.status as any
      });
    });
  }

  // 2. Process Expenses
  allExpenses.forEach(exp => {
    if (!isWithinPeriod(exp.date || exp.createdAt, period)) return;

    if (isGlobal) {
      // Global platform includes all expenses
      expenses.push({
        id: exp.id,
        date: exp.date || exp.createdAt.split('T')[0],
        title: exp.title,
        category: exp.category,
        amount: exp.amount,
        reference: exp.reference,
        notes: exp.notes,
        userEmail: exp.userEmail,
        userName: exp.userName,
        isAutomaticFee: false
      });
    } else {
      // User-specific expenses:
      // Match by userId, userEmail, or storeId
      const isAssigned = (exp.userId && exp.userId === user?.uid) ||
        (exp.userEmail && user?.email && exp.userEmail.toLowerCase() === user.email.toLowerCase()) ||
        (exp.storeId && user?.storeName && exp.storeId.toLowerCase() === user.storeName.toLowerCase());

      if (isAssigned) {
        expenses.push({
          id: exp.id,
          date: exp.date || exp.createdAt.split('T')[0],
          title: exp.title,
          category: exp.category,
          amount: exp.amount,
          reference: exp.reference,
          notes: exp.notes,
          userEmail: exp.userEmail,
          userName: exp.userName,
          isAutomaticFee: false
        });
      }
    }
  });

  // Calculate Metrics
  const grossRevenue = incomes.reduce((acc, i) => acc + i.grossAmount, 0);
  const netIncomeFromOps = incomes.reduce((acc, i) => acc + (i.status === 'entregado' ? i.netIncome : 0), 0);
  const totalPlatformCommissions = incomes.reduce((acc, i) => acc + i.platformFee, 0);
  const totalShippingRevenue = incomes.reduce((acc, i) => acc + i.shippingFee, 0);

  const directOperatingExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const subscriptionCost = expenses.filter(e => e.isAutomaticFee).reduce((acc, e) => acc + e.amount, 0);
  const totalExpenses = directOperatingExpenses;

  // Net Profit
  // For global: gross platform commissions + MRR - operating expenses
  // For partner: Net income from product sales - subscription & custom expenses
  // For dropshipper: Net commissions - custom expenses
  const netProfit = isGlobal
    ? (netIncomeFromOps - totalExpenses)
    : (netIncomeFromOps - totalExpenses);

  const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  const ordersCount = incomes.length;
  const deliveredCount = incomes.filter(i => i.status === 'entregado').length;
  const fulfillmentRate = ordersCount > 0 ? Math.round((deliveredCount / ordersCount) * 100) : 100;

  const status: 'rentable' | 'equilibrio' | 'deficit' = 
    netProfit > 500 ? 'rentable' : (netProfit >= -500 ? 'equilibrio' : 'deficit');

  // Breakdown by category
  const expensesByCategory: Record<string, number> = {
    logistica: 0,
    marketing: 0,
    servidores: 0,
    nomina: 0,
    inventario: 0,
    suscripciones: 0,
    otros: 0
  };

  expenses.forEach(e => {
    const cat = e.category || 'otros';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.amount;
  });

  const periodLabelMap: Record<AccountingPeriodFilter, string> = {
    all: 'Histórico Completo',
    this_month: 'Mes en Curso',
    last_month: 'Mes Anterior',
    last_30_days: 'Últimos 30 Días',
    this_year: 'Año Actual'
  };

  return {
    user: {
      uid: user?.uid || 'sanpi_global',
      displayName: userDisplayName,
      email: userEmail,
      role: userRole,
      storeName: userStoreName,
      companyName: userCompanyName,
      phone: userPhone,
      province: userProvince,
      plan: userPlan,
      rnc: userRnc
    },
    period: periodLabelMap[period] || 'Período Contable',
    isPlatformGlobal: isGlobal,
    metrics: {
      grossRevenue,
      totalPlatformCommissions,
      totalShippingRevenue,
      totalExpenses,
      directOperatingExpenses,
      subscriptionCost,
      netProfit,
      profitMargin: Math.round(profitMargin * 10) / 10,
      ordersCount,
      deliveredCount,
      fulfillmentRate,
      status
    },
    expensesByCategory,
    incomes,
    expenses
  };
}
