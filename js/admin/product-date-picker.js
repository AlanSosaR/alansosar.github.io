// Selector de fecha local: conserva YYYY-MM-DD y los eventos del formulario.
const input = document.getElementById('fecha_tueste');
if (input) {
  const dialog = document.createElement('dialog');
  dialog.className = 'product-date-picker';
  dialog.setAttribute('aria-labelledby', 'roast-date-title');
  dialog.innerHTML = `
    <header class="date-picker-heading"><span>Seleccionar fecha</span><h2 id="roast-date-title">Fecha de tueste</h2><p class="date-picker-selection" aria-live="polite"></p></header>
    <div class="date-picker-calendar">
      <div class="date-picker-navigation"><button type="button" data-month="-1" aria-label="Mes anterior"><span class="material-symbols-outlined" aria-hidden="true">chevron_left</span></button><strong aria-live="polite"></strong><button type="button" data-month="1" aria-label="Mes siguiente"><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button></div>
      <div class="date-picker-week" aria-hidden="true"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
      <div class="date-picker-days" role="group" aria-label="Días del mes"></div>
    </div>
    <footer class="date-picker-actions"><button type="button" data-action="cancel">Cancelar</button><button type="button" data-action="accept">Aceptar</button></footer>`;
  document.body.append(dialog);
  const days = dialog.querySelector('.date-picker-days');
  const heading = dialog.querySelector('.date-picker-navigation strong');
  const selection = dialog.querySelector('.date-picker-selection');
  let selected, month;
  const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parse = value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? new Date(+match[1], +match[2]-1, +match[3], 12) : new Date();
  };
  function render() {
    heading.textContent = month.toLocaleDateString('es', {month:'long',year:'numeric'});
    selection.textContent = selected.toLocaleDateString('es', {weekday:'short',day:'numeric',month:'short',year:'numeric'});
    days.replaceChildren();
    const offset = (new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7;
    for(let i=0;i<offset;i++) days.append(document.createElement('span'));
    const count = new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    for(let day=1;day<=count;day++) {
      const date = new Date(month.getFullYear(),month.getMonth(),day,12);
      const value = iso(date), button = document.createElement('button');
      button.type = 'button'; button.textContent = day; button.dataset.date = value;
      button.setAttribute('aria-label',date.toLocaleDateString('es',{dateStyle:'full'}));
      button.setAttribute('aria-pressed',String(value===iso(selected)));
      button.classList.toggle('selected',value===iso(selected));
      if(value===iso(new Date())) button.setAttribute('aria-current','date');
      button.disabled = !!((input.min && value<input.min)||(input.max && value>input.max));
      button.addEventListener('click',()=>{ selected=date; render(); days.querySelector(`[data-date="${value}"]`)?.focus(); });
      days.append(button);
    }
    dialog.querySelector('[data-action="accept"]').disabled = !!((input.min && iso(selected)<input.min)||(input.max && iso(selected)>input.max));
  }
  function open(event) {
    event?.preventDefault();
    if(dialog.open) return;
    selected = parse(input.value); month = new Date(selected.getFullYear(),selected.getMonth(),1,12);
    render(); dialog.showModal();
    days.querySelector('.selected:not(:disabled)')?.focus();
  }
  input.readOnly = true;
  input.setAttribute('aria-haspopup','dialog');
  input.setAttribute('aria-label','Fecha de tueste, abrir calendario');
  input.addEventListener('click',open);
  input.addEventListener('keydown',event=>{ if(['Enter',' ','ArrowDown'].includes(event.key)) open(event); });
  dialog.querySelectorAll('[data-month]').forEach(button=>button.addEventListener('click',()=>{
    month.setMonth(month.getMonth()+Number(button.dataset.month)); render();
  }));
  dialog.querySelector('[data-action="cancel"]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-action="accept"]').addEventListener('click',()=>{
    input.value=iso(selected);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    dialog.close();
  });
  dialog.addEventListener('close',()=>input.focus({preventScroll:true}));
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog) return;
    const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) dialog.close();
  });
}
