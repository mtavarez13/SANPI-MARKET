import type { Expense } from '../types';
import type { ReconciledSale } from './accountingReconciliation';

export type FinanceScope = 'general' | 'logistics' | 'marketplace';
export interface FinanceIncome { amount: number; date: string; financeScope?: FinanceScope }
export interface AuditFilters { from?: string; to?: string; storeId?: string; driverId?: string }

const safe = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
const expenseScope = (entry: Expense): FinanceScope => {
  if (entry.financeScope) return entry.financeScope;
  const category = entry.category?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || '';
  return ['logistica', 'envios', 'fletes', 'transporte'].includes(category) ? 'logistics' : 'general';
};
const within = (value: string | undefined, { from, to }: AuditFilters) => {
  const date = value?.slice(0, 10);
  return Boolean(date && (!from || date >= from) && (!to || date <= to));
};

/** Delivery is the source of truth; article sales are pass-through, not platform revenue. */
export function financialAudit(rows: ReconciledSale[], expenses: Expense[], incomes: FinanceIncome[], filters: AuditFilters = {}) {
  const delivered = rows.filter(row => row.delivered && within(row.deliveredAt, filters)
    && (!filters.storeId || row.delivery.storeId === filters.storeId)
    && (!filters.driverId || row.delivery.deliveryPersonId === filters.driverId));
  const includeExpense = (entry: Expense) => within(entry.date, filters)
    && (!filters.storeId || entry.storeId === filters.storeId)
    && !filters.driverId;
  const includeIncome = (entry: FinanceIncome) => within(entry.date, filters)
    && !filters.storeId && !filters.driverId;
  const sumExpense = (scope: FinanceScope) => expenses.filter(entry => includeExpense(entry) && expenseScope(entry) === scope)
    .reduce((total, entry) => total + safe(entry.amount), 0);
  const sumIncome = (scope: FinanceScope) => incomes.filter(entry => includeIncome(entry) && (entry.financeScope || 'general') === scope)
    .reduce((total, entry) => total + safe(entry.amount), 0);

  const freight = delivered.reduce((total, row) => total + safe(row.shippingAmount), 0);
  const drivers = delivered.reduce((total, row) => total + safe(row.delivery.deliveryPayment), 0);
  const commissions = delivered.reduce((total, row) => total + (row.hasConfirmedCommission ? safe(row.commissionAmount) : 0), 0);
  const logisticsIncome = sumIncome('logistics');
  const logisticsExpenses = sumExpense('logistics');
  const marketplaceIncome = sumIncome('marketplace');
  const marketplaceExpenses = sumExpense('marketplace');
  const generalIncome = sumIncome('general');
  const generalExpenses = sumExpense('general');
  const logisticsNet = freight + logisticsIncome - drivers - logisticsExpenses;
  const marketplaceNet = commissions + marketplaceIncome - marketplaceExpenses;
  const generalNet = generalIncome - generalExpenses;
  return {
    delivered, freight, drivers, commissions, logisticsIncome, logisticsExpenses,
    marketplaceIncome, marketplaceExpenses, generalIncome, generalExpenses,
    logisticsNet, marketplaceNet, generalNet, net: logisticsNet + marketplaceNet + generalNet,
    cashToOffice: delivered.filter(row => !row.delivery.isPaidToOffice)
      .reduce((total, row) => total + safe(row.delivery.totalToCollect), 0),
  };
}

export function allocateStoreExpenses(payables: number[], expenseTotal: number) {
  if (!payables.length || !Number.isFinite(expenseTotal) || expenseTotal < 0 || payables.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('Montos de liquidación inválidos.');
  }
  const gross = payables.reduce((total, value) => total + value, 0);
  if (expenseTotal > gross) throw new Error('Los gastos superan el monto a liquidar.');
  let remaining = expenseTotal;
  return payables.map(value => {
    const deducted = Math.min(value, remaining);
    remaining -= deducted;
    return { gross: value, deducted, paid: value - deducted };
  });
}
