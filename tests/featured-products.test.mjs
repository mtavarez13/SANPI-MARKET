import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleFeaturedArticles, parseFeaturedIds, resolveFeaturedArticles, validateFeaturedPlacements } from '../src/lib/featuredProducts.ts';

const articles = Array.from({ length: 5 }, (_, index) => ({
  id: `article-${index + 1}`,
  status: 'aprobado',
  isPublic: true,
  stock: 5,
  price: 100 + index
}));
const placements = articles.slice(0, 4).map(article => ({ articleId: article.id, advertisingFee: 250 }));

test('exactly four unique, published, stocked products with positive ad fees are required', () => {
  assert.equal(validateFeaturedPlacements(placements, articles), null);
  assert.match(validateFeaturedPlacements(placements.slice(0, 3), articles), /exactamente cuatro/);
  assert.match(validateFeaturedPlacements([...placements.slice(0, 3), placements[0]], articles), /diferente/);
  assert.match(validateFeaturedPlacements([{ ...placements[0], advertisingFee: 0 }, ...placements.slice(1)], articles), /mayor que cero/);
  assert.match(validateFeaturedPlacements(placements, [{ ...articles[0], stock: 0 }, ...articles.slice(1)]), /inventario/);
});

test('homepage uses the administrator-selected order and excludes hidden products', () => {
  const ids = placements.map(item => item.articleId).reverse();
  assert.deepEqual(parseFeaturedIds({ articleIds: ids }), ids);
  assert.deepEqual(resolveFeaturedArticles(ids, articles).map(article => article.id), ids);
  assert.equal(eligibleFeaturedArticles([{ ...articles[0], isPublic: false }, ...articles.slice(1)]).length, 4);
  assert.deepEqual(resolveFeaturedArticles(ids, [{ ...articles[0], isPublic: false }, ...articles.slice(1)]).map(article => article.id), ids.filter(id => id !== articles[0].id));
});
