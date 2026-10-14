import {getCatalog,asset,pageUrl} from '../api.js';
const hero=document.querySelector('.home-hero');
const image=hero.querySelector('img');const title=hero.querySelector('h1');const subtitle=hero.querySelector('.hero-subtitle');const link=hero.querySelector('.hero-caption a');const dots=[...hero.querySelectorAll('[data-slide]')];
let current=0;let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;let timer;
const toggle=hero.querySelector('[data-slide-pause]');
try {
  const {slides}=await getCatalog();
  function show(index) {
    current=(index+slides.length)%slides.length;const slide=slides[current];
    image.src=asset(slide.image);image.alt=slide.title;title.textContent=slide.title;subtitle.textContent=slide.subtitle;
    link.href=pageUrl(slide.category==='chairs-barstools'?'products-chairs':'products',slide.category==='chairs-barstools'?'':`?category=${slide.category}`);
    dots.forEach((dot,i)=>{dot.setAttribute('aria-pressed',String(i===current));});
    hero.querySelector('[data-slide-number]').textContent=String(current+1).padStart(2,'0');
  }
  function schedule() {clearInterval(timer);if(!paused&&!document.hidden)timer=setInterval(()=>show(current+1),6000);}
  function pauseLabel() {toggle.setAttribute('aria-label',paused?'Play slideshow':'Pause slideshow');toggle.textContent=paused?'▶':'Ⅱ';}
  dots.forEach(dot=>dot.addEventListener('click',()=>{show(Number(dot.dataset.slide));schedule();}));
  hero.querySelector('[data-slide-next]').addEventListener('click',()=>{show(current+1);schedule();});
  toggle.addEventListener('click',()=>{paused=!paused;pauseLabel();schedule();});
  document.addEventListener('visibilitychange',schedule);pauseLabel();schedule();
} catch(error) {console.error(error.message);}
