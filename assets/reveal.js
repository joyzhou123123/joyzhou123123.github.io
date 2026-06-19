/* reveal.js — scroll reveal, text split entrance, parallax, card gloss. */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // When the tab/iframe is hidden, the browser pauses CSS transitions & rAF —
  // content would be trapped at its pre-reveal (invisible) state. So if we're
  // not in a position to animate, just show everything.
  const canAnimate = () => !reduce && !document.hidden;

  // Split [data-split] headlines into per-word spans for staggered entrance.
  function splitText() {
    document.querySelectorAll("[data-split]").forEach((el) => {
      if (el.dataset.splitDone) return;
      el.dataset.splitDone = "1";
      const walk = (node) => {
        const out = [];
        node.childNodes.forEach((n) => {
          if (n.nodeType === 3) {
            n.textContent.split(/(\s+)/).forEach((w) => {
              if (w.trim() === "") { out.push(document.createTextNode(w)); return; }
              const wrap = document.createElement("span");
              wrap.className = "word";
              const inner = document.createElement("span");
              inner.className = "word-i";
              inner.textContent = w;
              wrap.appendChild(inner);
              out.push(wrap);
            });
          } else if (n.nodeType === 1) {
            const clone = n.cloneNode(false);
            walk(n).forEach((c) => clone.appendChild(c));
            out.push(clone);
          }
        });
        return out;
      };
      const kids = walk(el);
      el.innerHTML = "";
      kids.forEach((k) => el.appendChild(k));
      el.querySelectorAll(".word-i").forEach((w, i) => {
        w.style.transitionDelay = (i * 55) + "ms";
      });
    });
  }

  // Scroll-position based reveal (IntersectionObserver is unreliable in some
  // preview iframes). Reveals elements once their top crosses 88% of viewport.
  function observeReveal() {
    const all = [...document.querySelectorAll("[data-reveal], [data-split]")];
    // No-animation context (reduced motion, or hidden iframe with paused
    // transitions): show everything instantly so nothing is trapped invisible.
    if (!canAnimate()) {
      all.forEach((el) => { el.classList.add("in", "no-anim"); });
      return;
    }
    const items = all.filter((el) => !el.hasAttribute("data-gate"));
    let pending = items;
    const check = () => {
      const vh = window.innerHeight;
      pending = pending.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.88 && r.bottom > 0) { el.classList.add("in"); return false; }
        return true;
      });
      if (!pending.length) window.removeEventListener("scroll", onScroll);
    };
    let ticking = false;
    const onScroll = () => { if (!ticking) { requestAnimationFrame(() => { check(); ticking = false; }); ticking = true; } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // initial pass (twice, to catch post-layout/font shifts)
    check();
    setTimeout(check, 120);
    setTimeout(check, 600);
  }

  // Parallax: [data-parallax="0.2"] translates with scroll.
  function parallax() {
    if (reduce) return;
    const items = [...document.querySelectorAll("[data-parallax]")];
    if (!items.length) return;
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2 - vh / 2;
        const k = parseFloat(el.dataset.parallax) || 0.15;
        el.style.transform = `translate3d(0, ${(-center * k).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  // Card gloss: track pointer, set --mx/--my for a moving sheen.
  function cardGloss() {
    document.querySelectorAll("[data-gloss]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    });
  }

  /* Surf intro choreography. Drives a HoloFluid hero instance:
     a calm line, then a building swell, a snap (cut-back), settle —
     then resolves so the headline can reveal. */
  function surfIntro(fx, onResolve) {
    if (!fx || !canAnimate()) { if (onResolve) onResolve(); return; }
    const seq = [
      { at: 200,  surge: 0.15 },  // paddle / glide
      { at: 700,  surge: 0.55 },  // pop-up, drop in
      { at: 1150, surge: 1.0 },   // bottom turn — drive up the face
      { at: 1500, surge: 0.25 },  // snap / cut-back whip
      { at: 1750, surge: 0.85 },  // re-engage
      { at: 2050, surge: 0.0 },   // settle into the line
    ];
    seq.forEach((s) => setTimeout(() => fx.surge(s.surge), s.at));
    setTimeout(() => { if (onResolve) onResolve(); }, 900);
  }

  function init() {
    splitText();
    observeReveal();
    parallax();
    cardGloss();
  }
  // When the tab/iframe becomes hidden the browser freezes transitions & rAF;
  // snap any in-flight reveals to their end state so captures aren't blank.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      document.querySelectorAll("[data-reveal], [data-split]").forEach((el) => el.classList.add("in", "no-anim"));
      if (window.__renderHolos) window.__renderHolos();
    }
  });
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);

  window.Reveal = { surfIntro, splitText, reduce,
    forceAll() {
      document.querySelectorAll("[data-reveal], [data-split]").forEach((el) => el.classList.add("in", "no-anim"));
    }
  };
})();
