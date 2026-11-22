/* Small, keyboard-accessible interactions. No framework or third-party dependency. */
(() => {
  const roles = [...document.querySelectorAll('[data-role]')];
  roles.forEach(button => button.addEventListener('click', () => {
    roles.forEach(other => {
      const active = other === button;
      other.setAttribute('aria-pressed', String(active));
      document.getElementById(other.getAttribute('aria-controls')).hidden = !active;
    });
  }));
  const triggers = [...document.querySelectorAll('[data-preview]')];
  if (!triggers.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'studio-dialog';
  dialog.setAttribute('aria-labelledby', 'preview-caption');
  dialog.innerHTML = '<div class="dialog-top"><h2 id="preview-caption"></h2><button type="button" data-i18n-aria-label="s02d8bddec494" aria-label="Close design preview" autofocus>×</button></div><img alt=""><p data-i18n-source="Design artifact · Click outside or press Esc to close.">Design artifact · Click outside or press Esc to close.</p>';
  document.body.append(dialog);
  let previousFocus;
  triggers.forEach(button => button.addEventListener('click', () => {
    previousFocus = button;
    dialog.querySelector('h2').textContent = button.dataset.caption;
    const image = dialog.querySelector('img');
    image.src = button.dataset.preview;
    image.alt = button.querySelector('img').alt;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
  }));
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    previousFocus?.focus({preventScroll:true});
  });
})();
