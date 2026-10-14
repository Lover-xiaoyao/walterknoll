import {openDialog} from '../common.js';
import {escapeHtml as esc} from '../api.js';
document.querySelectorAll('[data-material]').forEach(button=>button.addEventListener('click',()=>{
  const card=button.closest('.material-card');
  document.querySelector('#detailContent').innerHTML=`<img class="material-preview" src="${card.querySelector('img').src}" alt="${esc(button.dataset.material)}"><p class="eyebrow">Material Library</p><h2 id="detailTitle">${esc(button.dataset.material)}</h2><p class="section-copy">${esc(card.dataset.description)}</p><p class="section-copy"><a class="arrow-link" href="${esc(card.dataset.source)}" target="_blank" rel="noopener">Explore on the original <span>↗</span></a></p>`;
  openDialog('detailDialog');
}));
