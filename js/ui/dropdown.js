// Panel desplegable bajo la barra superior (lo usan la chuleta y las reglas).
// Solo puede haber uno abierto a la vez.

import { h } from './dom.js';

const all = [];

export function createDropdown({ id, button, content, label }) {
  const panel = h('div', { class: 'dropdown', id, role: 'dialog', 'aria-label': label, 'aria-hidden': 'true' },
    h('div', { class: 'dd-inner' }, content));
  const backdrop = h('div', { class: 'dd-backdrop', onClick: () => toggle(false) });

  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', id);
  button.addEventListener('click', () => toggle());

  function toggle(force) {
    const open = force ?? !panel.classList.contains('open');
    if (open) all.forEach((d) => d !== api && d.close());
    panel.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    if (open) panel.scrollTop = 0;
  }

  const api = { button, panel, backdrop, close: () => toggle(false) };
  all.push(api);
  return api;
}

export const closeAllDropdowns = () => all.forEach((d) => d.close());

document.addEventListener('keydown', (e) => e.key === 'Escape' && closeAllDropdowns());
