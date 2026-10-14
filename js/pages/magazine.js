import {getCatalog,asset,escapeHtml as esc} from '../api.js';
import {openDialog} from '../common.js';
const tabs=[...document.querySelectorAll('[data-topic]')];const params=new URLSearchParams(location.search);let category=params.get('category')||'All Topics';
try {
  const {articles}=await getCatalog();
  function showArticle(id) {
    const article=articles.find(a=>a.id===id);if(!article)return;
    document.querySelector('#detailContent').innerHTML=`<img class="article-preview" src="${asset(article.image)}" alt="${esc(article.title)}"><p class="eyebrow">${esc(article.category)}</p><h2 id="detailTitle">${esc(article.title)}</h2><p class="section-copy">A perspective from the Walter Knoll world of design. Read the full story and explore the project on the original website.</p><p class="section-copy"><a class="arrow-link" href="${esc(article.url)}" target="_blank" rel="noopener">Read the original story <span>↗</span></a></p>`;openDialog('detailDialog');
  }
  function render() {
    if(!tabs.some(t=>t.dataset.topic===category))category='All Topics';
    const filtered=articles.filter(a=>category==='All Topics'||a.category===category);
    tabs.forEach(tab=>{const selected=tab.dataset.topic===category;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    const panel=document.querySelector('#articleList');panel.setAttribute('aria-labelledby',tabs.find(t=>t.dataset.topic===category).id);
    panel.innerHTML=filtered.map(a=>`<article class="article-row"><button class="article-image" type="button" data-article="${esc(a.id)}" aria-label="Read ${esc(a.title)}"><img src="${asset(a.image)}" alt="${esc(a.title)}" loading="lazy" width="1000" height="667"></button><div class="article-copy"><p class="eyebrow">${esc(a.category)}</p><h2><button type="button" data-article="${esc(a.id)}">${esc(a.title)}</button></h2><p class="muted">Architecture, spaces and the people who bring them to life.</p><button class="arrow-link" type="button" data-article="${esc(a.id)}">Discover the story <span>→</span></button></div></article>`).join('');
    document.querySelector('#articleCount').textContent=`${filtered.length} stories`;
  }
  function select(topic){category=topic;render();const query=new URLSearchParams(location.search);query.set('category',category);history.replaceState(null,'',`${location.pathname}?${query}`);}
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>select(tab.dataset.topic));
    tab.addEventListener('keydown',event=>{let target;if(event.key==='ArrowRight')target=(index+1)%tabs.length;if(event.key==='ArrowLeft')target=(index-1+tabs.length)%tabs.length;if(event.key==='Home')target=0;if(event.key==='End')target=tabs.length-1;if(target!==undefined){event.preventDefault();select(tabs[target].dataset.topic);tabs[target].focus();}});
  });
  document.addEventListener('click',event=>{const button=event.target.closest('[data-article]');if(button)showArticle(button.dataset.article);});
  render();if(params.get('article'))showArticle(params.get('article'));
} catch(error){document.querySelector('#articleCount').textContent=error.message;}
