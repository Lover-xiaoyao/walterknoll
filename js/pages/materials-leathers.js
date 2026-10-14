const buttons=[...document.querySelectorAll('[data-swatch]')];
function select(button){
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  const image=document.querySelector('#leatherPreview');image.src=button.querySelector('img').src;image.alt=`Elen leather — ${button.dataset.swatch}`;
  document.querySelector('#selectedColor').textContent=button.dataset.swatch;
  document.querySelector('#colorCaption').textContent=`Elen · ${button.dataset.swatch}`;
}
buttons.forEach(button=>button.addEventListener('click',()=>select(button)));
