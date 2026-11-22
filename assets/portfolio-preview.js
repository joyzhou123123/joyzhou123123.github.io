/* Scale each original 1440 × 840 design as one complete canvas, without cropping. */
(() => {
  document.querySelectorAll('.prototype-stage').forEach(stage => {
    const frame = stage.querySelector('iframe');
    if (!frame) return;
    const fit = () => {
      const scale = stage.clientWidth / 1440;
      if (!scale) return;
      frame.style.width = '1440px';
      frame.style.height = '840px';
      frame.style.transform = `scale(${scale})`;
    };
    fit();
    frame.addEventListener('load', fit);
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(fit);
      observer.observe(stage);
    } else window.addEventListener('resize', fit, {passive:true});
  });
})();
