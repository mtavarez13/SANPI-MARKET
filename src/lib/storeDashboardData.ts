import type { Article, Delivery, Expense, LandingPageConfig, Store, Transaction, UserProfile } from '../types';
import { accountingScope } from './accountingScope';
import { reconcileSales } from './accountingReconciliation';
import { normalizeDeliveryStatus } from './deliveryWorkflow';

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export function storeDashboardData(
  user: UserProfile | null,
  stores: Store[],
  articles: Article[],
  deliveries: Delivery[],
  transactions: Transaction[],
  expenses: Expense[],
  pages: LandingPageConfig[],
) {
  const empty = { stores: [] as Store[], articles: [] as Article[], orders: [] as Delivery[], statusCounts: {} as Record<string, number>,
    inventoryUnits: 0, inventoryCost: 0, inventoryRetail: 0, deliveredCount: 0, productSales: 0,
    freightBilled: 0, driverPayments: 0, storePayable: 0, storePaid: 0, storePending: 0,
    productCosts: 0, expenses: 0, netProfit: 0, reviewCount: 0, missingCostCount: 0 };
  if (user?.role !== 'partner' || !user.uid) return empty;

  const scoped = accountingScope(user, stores, articles, deliveries, expenses, pages);
  const email = user.email?.trim().toLowerCase();
  const ownStores = stores.filter(store => store.ownerId === user.uid || (!!email && store.ownerEmail?.trim().toLowerCase() === email));
  const ownStoreIds = new Set(ownStores.map(store => store.id));
  const ownOrders = scoped.deliveries.filter(order => ownStoreIds.has(order.storeId));
  const ownArticles = scoped.articles.filter(article => ownStoreIds.has(article.storeId));
  const articleById = new Map(ownArticles.map(article => [article.id, article]));
  const reconciled = reconcileSales(ownOrders, transactions, ownStores);
  const statusCounts: Record<string, number> = {};
  for (const order of ownOrders) {
    const status = normalizeDeliveryStatus(order.status);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  let inventoryUnits = 0;
  let inventoryCost = 0;
  let inventoryRetail = 0;
  for (const article of ownArticles) {
    const units = number(article.stock ?? article.inventory);
    inventoryUnits += units;
    inventoryCost += units * number(article.costPerItem ?? article.wholesalePrice ?? article.baseCost);
    inventoryRetail += units * number(article.price);
  }

  let deliveredCount = 0;
  let productSales = 0;
  let freightBilled = 0;
  let driverPayments = 0;
  let storePayable = 0;
  let storePaid = 0;
  let storePending = 0;
  let productCosts = 0;
  let netBeforeExpenses = 0;
  let reviewCount = 0;
  let missingCostCount = 0;
  for (const row of reconciled) {
    if (!row.delivered) continue;
    deliveredCount++;
    productSales += row.productAmount;
    freightBilled += row.shippingAmount;
    driverPayments += number(row.delivery.deliveryPayment);
    const article = articleById.get(row.delivery.articleId);
    const costValue = row.delivery.unitCostAtSale ?? article?.costPerItem ?? article?.wholesalePrice ?? article?.baseCost;
    const costKnown = costValue !== undefined && costValue !== null && Number.isFinite(Number(costValue));
    const cost = costKnown ? number(costValue) * number(row.delivery.quantity || 1) : 0;
    if (costKnown) productCosts += cost;
    else missingCostCount++;
    if (!row.hasConfirmedCommission) {
      reviewCount++;
      continue;
    }
    storePayable += row.storePayable;
    if (row.delivery.storePaidAt) storePaid += number(row.delivery.storePaidAmount);
    else storePending += row.storePayable;
    if (costKnown) netBeforeExpenses += row.storePayable - cost;
  }
  const expensesTotal = scoped.expenses.reduce((sum, item) => sum + number(item.amount), 0);

  return {
    stores: ownStores, articles: ownArticles,
    orders: [...ownOrders].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)),
    statusCounts, inventoryUnits, inventoryCost, inventoryRetail, deliveredCount, productSales,
    freightBilled, driverPayments, storePayable, storePaid, storePending,
    productCosts, expenses: expensesTotal, netProfit: netBeforeExpenses - expensesTotal,
    reviewCount, missingCostCount,
  };
}
