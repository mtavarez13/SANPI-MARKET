import type { Article } from '../types';

export interface FeaturedPlacement {
  articleId: string;
  advertisingFee: number;
}

export interface FeaturedCampaign {
  items: FeaturedPlacement[];
  updatedAt: string;
  updatedBy: string;
}

export function parseFeaturedPlacements(value: unknown): FeaturedPlacement[] {
  if (!value || typeof value !== 'object' || !('items' in value) || !Array.isArray(value.items)) return [];
  return value.items.slice(0, 4).filter((item): item is FeaturedPlacement =>
    Boolean(item) && typeof item.articleId === 'string' &&
    typeof item.advertisingFee === 'number' && Number.isFinite(item.advertisingFee)
  );
}

export function parseFeaturedIds(value: unknown): string[] {
  if (!value || typeof value !== 'object' || !('articleIds' in value) || !Array.isArray(value.articleIds)) return [];
  return value.articleIds.slice(0, 4).filter((id): id is string => typeof id === 'string');
}

export function eligibleFeaturedArticles(articles: Article[]): Article[] {
  return articles.filter(article =>
    article.status === 'aprobado' &&
    article.isPublic === true &&
    (article.stock ?? article.inventory ?? 0) > 0
  );
}

export function validateFeaturedPlacements(items: FeaturedPlacement[], articles: Article[]): string | null {
  if (items.length !== 4) return 'Selecciona exactamente cuatro artículos destacados.';
  const eligibleIds = new Set(eligibleFeaturedArticles(articles).map(article => article.id));
  const ids = items.map(item => item.articleId);
  if (ids.some(id => !eligibleIds.has(id))) return 'Todos los artículos deben estar publicados y tener inventario.';
  if (new Set(ids).size !== 4) return 'Cada espacio debe mostrar un artículo diferente.';
  if (items.some(item => !Number.isFinite(item.advertisingFee) || item.advertisingFee <= 0)) {
    return 'Indica un costo publicitario mayor que cero para cada artículo.';
  }
  return null;
}

export function resolveFeaturedArticles(articleIds: string[], articles: Article[]): Article[] {
  const eligible = new Map(eligibleFeaturedArticles(articles).map(article => [article.id, article]));
  return articleIds.slice(0, 4).map(id => eligible.get(id)).filter((article): article is Article => Boolean(article));
}
