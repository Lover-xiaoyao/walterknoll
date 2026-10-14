const cards=[...document.querySelectorAll('.store-card')];const input=document.querySelector('#storeSearch');
input.addEventListener('input',()=>{
  const term=input.value.trim().toLowerCase();let count=0;
  cards.forEach(card=>{card.hidden=!card.textContent.toLowerCase().includes(term);if(!card.hidden)count++;});
  document.querySelector('#storeCount').textContent=`${count} showrooms`;document.querySelector('#storeEmpty').hidden=!!count;
});
const form=document.querySelector('#contactForm');
form.addEventListener('submit',event=>{
  event.preventDefault();
  const name=form.elements.name;const message=form.elements.message;
  if(!name.value.trim()){name.setCustomValidity('Please enter your name.');name.reportValidity();return;}
  if(!message.value.trim()){message.setCustomValidity('Please enter your message.');message.reportValidity();return;}
  form.querySelector('.form-status').textContent='Thank you. Your message is valid. This is a study demo: nothing has been sent or saved. Use the official contact link to reach Walter Knoll.';
  form.reset();
});
for(const field of [form.elements.name,form.elements.message])field.addEventListener('input',()=>field.setCustomValidity(''));
