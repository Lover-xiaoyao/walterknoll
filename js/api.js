// One local data request shared by search, lists and product previews.
const root = new URL('../', import.meta.url);
let catalogRequest;
export const asset = path => new URL(path, root).href;
export const pageUrl = (page, query = '') => new URL(`pages/${page}.html${query}`, root).href;
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function getCatalog() {
  catalogRequest ??= fetch(asset('assets/data/catalog.json')).then(response => {
    if (!response.ok) throw new Error('The collection could not be loaded. Please refresh the page.');
    return response.json();
  });
  return catalogRequest;
}
export function productCard(product) {
  return `<article class="product-card" data-product="${escapeHtml(product.id)}"><div class="card-image"><button class="product-open" type="button" data-product-open="${escapeHtml(product.id)}" aria-label="Discover ${escapeHtml(product.name)}"><img src="${asset(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="750" height="750"></button><button class="favorite-button" type="button" data-favorite="${escapeHtml(product.id)}" aria-label="Save ${escapeHtml(product.name)} to wish list" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg></button></div><button class="product-open" type="button" data-product-open="${escapeHtml(product.id)}"><h3>${escapeHtml(product.name)}</h3></button><p class="designer">${escapeHtml(product.designer || 'Walter Knoll collection')}</p></article>`;
}
