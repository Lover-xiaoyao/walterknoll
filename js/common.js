import {getCatalog, asset, pageUrl, escapeHtml as esc} from './api.js';
const $ = selector => document.querySelector(selector);
const page = document.body.dataset.page;
const section = page?.startsWith('products') ? 'products' : page?.startsWith('materials') ? 'materials' : page;
$(`[data-nav="${section}"]`)?.setAttribute('aria-current','page');
let wishes;
try {wishes = JSON.parse(localStorage.getItem('wk-wishes') || '[]');if (!Array.isArray(wishes)) wishes=[];} catch {wishes=[];}
let toastTimer;
export function toast(message) {
  const node = $('.toast'); node.textContent = message; node.hidden = false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,3000);
}
export function syncFavorites() {
  document.querySelectorAll('[data-favorite]').forEach(button=>button.setAttribute('aria-pressed',String(wishes.includes(button.dataset.favorite))));
  const count = $('.wish-count');count.textContent=wishes.length;count.hidden=!wishes.length;
}
export function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog.open) dialog.showModal();
  if (id==='menuDialog') $('[data-open="menuDialog"]').setAttribute('aria-expanded','true');
  if (id==='searchDialog') {renderSearch();$('#siteSearch').focus();}
  if (id==='wishlistDialog') renderWishlist();
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click',event=>{if (event.target===dialog) {const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close();}});
  dialog.addEventListener('close',()=>{if (dialog.id==='menuDialog') $('[data-open="menuDialog"]').setAttribute('aria-expanded','false');});
}
document.addEventListener('click',async event=>{
  const open = event.target.closest('[data-open]');if(open) openDialog(open.dataset.open);
  const close = event.target.closest('[data-close]');if(close) close.closest('dialog').close();
  if(event.target.closest('[data-top]')) window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  if(event.target.closest('.drawer-nav a')) $('#menuDialog').close();
  const favorite = event.target.closest('[data-favorite]');
  if(favorite) {
    const id=favorite.dataset.favorite;const saved=wishes.includes(id);
    wishes=saved?wishes.filter(value=>value!==id):[...wishes,id];
    try {localStorage.setItem('wk-wishes',JSON.stringify(wishes));} catch { /* The wish list remains usable for this session. */ }
    syncFavorites();toast(saved?'Removed from your wish list.':'Added to your wish list.');
    if($('#wishlistDialog').open) renderWishlist();
  }
  const product = event.target.closest('[data-product-open]');if(product) await showProduct(product.dataset.productOpen);
});
export async function showProduct(id) {
  try {
    const catalog=await getCatalog();const product=catalog.products.find(p=>p.id===id);if(!product)return;
    $('#detailContent').innerHTML=`<div class="product-detail"><img src="${asset(product.image)}" alt="${esc(product.name)}"><div><p class="eyebrow">The collection</p><h2 id="detailTitle">${esc(product.name)}</h2><p>${esc(product.designer || 'Walter Knoll collection')}</p><p>Explore the materials, proportions and design of this piece.</p><button class="button outline" type="button" data-favorite="${esc(product.id)}" aria-pressed="${wishes.includes(product.id)}">Save to wish list ♡</button><p><a class="arrow-link" href="${esc(product.url)}" target="_blank" rel="noopener">Full details on the original <span>↗</span></a></p></div></div>`;
    openDialog('detailDialog');
  } catch(error) {toast(error.message);}
}
async function renderWishlist() {
  try {
    const {products}=await getCatalog();const selected=products.filter((p,i,all)=>wishes.includes(p.id)&&all.findIndex(x=>x.id===p.id)===i);
    $('#wishlistContent').innerHTML=selected.length ? selected.map(p=>`<article class="wishlist-row"><button type="button" data-product-open="${esc(p.id)}" aria-label="Discover ${esc(p.name)}"><img src="${asset(p.image)}" alt="${esc(p.name)}"></button><div><h3>${esc(p.name)}</h3><p class="small muted">${esc(p.designer || 'Walter Knoll collection')}</p></div><button class="text-button" type="button" data-favorite="${esc(p.id)}">Remove</button></article>`).join('') : '<p class="empty-state">Your collection starts here. Save a product with the heart icon.</p>';
  } catch(error) {$('#wishlistContent').textContent=error.message;}
}
const searchPages=[['Products','products','Chairs, sofas, tables and more'],['Chairs & Barstools','products-chairs','Discover seating'],['Material Library','materials','Natural textures and surfaces'],['Leathers','materials-leathers','Leather colors and textures'],['Magazine','magazine','Stories, news and references'],['About us','about','History, purpose and designers'],['Professionals','professionals','Downloads and project services'],['Sustainability','sustainability','Responsibility and enduring design'],['Retailers & Contact','contact','Showrooms and contact']];
let searchRun=0;
async function renderSearch() {
  const run=++searchRun;const query=$('#siteSearch').value.trim().toLowerCase();
  try {
    const catalog=await getCatalog();if(run!==searchRun)return;
    const products=catalog.products.filter((p,i,all)=>all.findIndex(x=>x.id===p.id)===i && query && `${p.name} ${p.designer}`.toLowerCase().includes(query));
    const pages=searchPages.filter(p=>!query || p.join(' ').toLowerCase().includes(query));
    const articles=catalog.articles.filter(a=>query && `${a.title} ${a.category}`.toLowerCase().includes(query));
    $('#searchSummary').textContent=query ? `${products.length+pages.length+articles.length} results for “${$('#siteSearch').value.trim()}”` : 'Explore the collection or enter a search term.';
    $('#searchResults').innerHTML=[...products.slice(0,12).map(p=>`<a class="search-result" href="${pageUrl('products',`?product=${encodeURIComponent(p.id)}`)}"><img src="${asset(p.image)}" alt=""><div><strong>${esc(p.name)}</strong><small>${esc(p.designer || 'Collection')}</small></div></a>`),...pages.map(([name,slug,description])=>`<a class="search-result" href="${pageUrl(slug)}"><div><strong>${name}</strong><small>${description}</small></div><span aria-hidden="true">→</span></a>`),...articles.map(a=>`<a class="search-result" href="${pageUrl('magazine',`?article=${encodeURIComponent(a.id)}`)}"><img src="${asset(a.image)}" alt=""><div><strong>${esc(a.title)}</strong><small>${esc(a.category)}</small></div></a>`)].join('') || '<p class="empty-state">No results. Try “Ayabi”, “leather” or “materials”.</p>';
  } catch(error) {$('#searchSummary').textContent=error.message;}
}
$('#siteSearch')?.addEventListener('input',renderSearch);
$('#newsletterForm')?.addEventListener('submit',event=>{
  event.preventDefault();const form=event.currentTarget;
  form.querySelector('.form-status').textContent='Thank you. This demo is complete; no subscription was sent and your address was not saved.';
  form.reset();
});
syncFavorites();
