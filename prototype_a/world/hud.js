// One persistent drawer; switching subjects never recreates its frame or cards.
export function createHud({cancelBuilding}){
 const drawer=document.getElementById('hud-drawer'),pages=document.getElementById('drawer-pages');
 const title=document.getElementById('drawer-title'),subtitle=document.getElementById('drawer-subtitle');
 const close=document.getElementById('drawer-close'),toggles=[...document.querySelectorAll('.panel-toggle')];
 const panels=[...document.querySelectorAll('.drawer-pages>.panel')],scrollPositions=new Map();
 const buildToggle=document.getElementById('build-toggle');
 const tray=document.getElementById('build-tools');tray.hidden=false;tray.inert=true;
 let active=null,placing=false,lastToggle=null;
 function select(next,cancel=true){
  const previous=active,shouldCancel=cancel&&placing&&next!=='build-panel';
  if(previous)scrollPositions.set(previous,pages.scrollTop);
  if(shouldCancel)cancelBuilding();
  active=next;
  for(const toggle of toggles){const open=toggle.dataset.panel===next;toggle.setAttribute('aria-expanded',String(open));document.getElementById(toggle.getAttribute('aria-controls')).inert=!open;}
  const open=Boolean(next);
  drawer.inert=!open;drawer.classList.toggle('is-open',open);
  if(open){
   const toggle=toggles.find(button=>button.dataset.panel===next);
   lastToggle=toggle;title.textContent=toggle.dataset.title;subtitle.textContent=toggle.dataset.subtitle;drawer.dataset.panel=next;
   for(const panel of panels)panel.hidden=panel.id!==next;
   pages.scrollTop=scrollPositions.get(next)||0;
  }else if(drawer.contains(document.activeElement)){lastToggle?.focus({preventScroll:true});}
 }
 for(const toggle of toggles)toggle.addEventListener('click',()=>{const next=active===toggle.dataset.panel?null:toggle.dataset.panel;select(next);});
 close.addEventListener('click',()=>{select(null);lastToggle?.focus({preventScroll:true});});
 drawer.addEventListener('transitionend',event=>{if(event.target===drawer&&event.propertyName==='opacity'&&!active)for(const panel of panels)panel.hidden=true;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&active){event.preventDefault();select(null);lastToggle?.focus({preventScroll:true});}});
 document.addEventListener('click',event=>{
  const button=event.target.closest('.card-details-toggle,[data-fold-toggle]');if(!button)return;
  const details=document.getElementById(button.getAttribute('aria-controls')),open=button.getAttribute('aria-expanded')!=='true';
  button.setAttribute('aria-expanded',String(open));details.inert=!open;details.classList.toggle('open',open);
 });
 function placement(activePlacement,name=''){
  const focusInTray=tray.contains(document.activeElement);
  placing=activePlacement;buildToggle.dataset.building=String(placing);
  tray.inert=!placing;tray.classList.toggle('is-visible',placing);
  if(placing){document.getElementById('build-selection').textContent='放置 · '+name;select(null,false);}
  else if(focusInTray)buildToggle.focus({preventScroll:true});
 }
 return {placement};
}
