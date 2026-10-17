import type { Article, Delivery, Expense, LandingPageConfig, Store, UserProfile } from '../types';
import { visibleOrders } from './orderVisibility';

export function accountingScope(user: UserProfile | null, stores: Store[], articles: Article[], deliveries: Delivery[], expenses: Expense[], pages: LandingPageConfig[]) {
  if (!user?.uid || user.role === 'customer') return { articles: [], deliveries: [], expenses: [] };
  if (user.role === 'admin') return { articles, deliveries, expenses };
  const email = user.email?.trim().toLowerCase();
  const ownStores = new Set(stores.filter(s => s.ownerId === user.uid || (!!email && s.ownerEmail?.trim().toLowerCase() === email)).map(s => s.id));
  const ownPages = new Set(pages.filter(p => p.ownerId === user.uid).map(p => p.productId));
  const scopedArticles = articles.filter(a => ownStores.has(a.storeId) ||
    (user.role === 'dropshipper' && ownPages.has(a.id)) ||
    (user.role === 'supplier' && (a.supplierId === user.uid || (!!email && a.supplierEmail?.trim().toLowerCase() === email))));
  const supplierArticles = new Set(scopedArticles.map(a => a.id));
  const scopedDeliveries = user.role === 'partner' || user.role === 'dropshipper'
    ? visibleOrders(user, deliveries, stores, pages)
    : user.role === 'supplier'
      ? deliveries.filter(d => supplierArticles.has(d.articleId))
      : deliveries.filter(d => d.carrierId === user.uid || d.deliveryPersonId === user.uid);
  const scopedExpenses = expenses.filter(e => e.userId === user.uid || (!!email && e.userEmail?.trim().toLowerCase() === email));
  return { articles: scopedArticles, deliveries: scopedDeliveries, expenses: scopedExpenses };
}
