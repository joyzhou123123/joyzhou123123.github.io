/* One original HoloFluid configuration for all five pages; original layered surf motion. */
(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const root=document.documentElement;
  const toggle=document.querySelector('[data-motion-toggle]');
  let paused=false;
  const instances=[];
  const background={
    palette:[[0.52,0.55,0.78],[0.30,0.28,0.20],[1,1,1],[0.08,0.18,0.40]],
    speed:0.62,warp:1.55,bright:0.9,sat:1.15,contrast:1.05,
    wave:0.65,scale:0.62,freq:0.58
  };
  function sync(){
    root.classList.toggle('motion-paused',paused||reduced.matches);
    root.classList.toggle('motion-hidden',document.hidden);
    for(const item of instances)item.fx.setPaused(paused||reduced.matches||document.hidden||!item.visible);
    if(toggle){
      const label=paused?'Resume motion':'Pause motion';
      toggle.dataset.i18n=paused?'ambient.motion.resume':'ambient.motion.pause';
      toggle.textContent=window.PortfolioI18n?window.PortfolioI18n.t(label):label;
      toggle.setAttribute('aria-pressed',String(paused));toggle.hidden=reduced.matches||(!instances.length&&!document.querySelector('.surf-scene'));
    }
  }
  for(const canvas of document.querySelectorAll('[data-fluid]')){
    const surf=canvas.dataset.fluid==='surf';
    if(!window.HoloFluid)continue;
    const fx=new HoloFluid(canvas,{...background,...(surf?{speed:0.55,wave:1.0,scale:0.7,mouse:false}:{})});
    if(fx.dead)continue;
    fx.step(0);canvas.classList.add('is-ready');
    const item={fx,canvas,visible:true};instances.push(item);
    const target=surf?canvas.closest('.surf-scene'):canvas;
    if(surf){
      target.addEventListener('pointerenter',()=>{if(!paused&&!reduced.matches)fx.surge(.7)});
      target.addEventListener('pointerleave',()=>fx.surge(0));
    }
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();fx.setPaused(true);fx.dead=true;canvas.classList.remove('is-ready');
    });
  }
  // Observe the surf image even without WebGL so its CSS layers also pause offscreen.
  if('IntersectionObserver' in window){
    const visibility=new IntersectionObserver(entries=>{
      for(const entry of entries){
        const scene=entry.target.closest('.surf-scene');
        if(scene)scene.classList.toggle('is-offscreen',!entry.isIntersecting);
        for(const item of instances)if(item.canvas===entry.target||item.canvas.closest('.surf-scene')===entry.target)item.visible=entry.isIntersecting;
      }
      sync();
    },{threshold:0});
    document.querySelectorAll('.surf-scene').forEach(scene=>visibility.observe(scene));
  }
  const entries=document.querySelectorAll('[data-enter]');
  if('IntersectionObserver' in window&&!reduced.matches){
    const reveal=new IntersectionObserver(list=>{
      list.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');reveal.unobserve(entry.target)}});
    },{threshold:.08,rootMargin:'0px 0px 24px 0px'});
    entries.forEach(element=>{element.classList.add('enter-ready');reveal.observe(element)});
    reduced.addEventListener('change',()=>{
      if(reduced.matches){reveal.disconnect();entries.forEach(element=>element.classList.add('is-visible'))}
    });
  }
  toggle?.addEventListener('click',()=>{paused=!paused;sync()});
  document.addEventListener('portfolio:language',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  addEventListener('pagehide',()=>{instances.forEach(item=>item.fx.setPaused(true));root.classList.add('motion-hidden')});
  addEventListener('pageshow',sync);
  addEventListener('beforeprint',()=>{instances.forEach(item=>item.fx.setPaused(true));entries.forEach(element=>element.classList.add('is-visible'))});
  addEventListener('afterprint',sync);
  sync();
})();
