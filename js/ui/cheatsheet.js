// Chuleta desplegable con el ranking de manos. Se abre desde la barra superior en cualquier pantalla.

import { h } from './dom.js';
import { renderCards } from './cards.js';
import { parseCards } from '../engine/cards.js';
import { CATEGORIES, evaluate, coreCards } from '../engine/hands.js';

export function createCheatsheet() {
  const rows = [...CATEGORIES].reverse().map((cat, i) => {
    const hand = evaluate(parseCards(cat.example));
    return h('li', { class: 'cs-row' },
      h('div', { class: 'cs-num' }, i + 1),
      h('div', { class: 'cs-body' },
        h('div', { class: 'cs-title' }, h('strong', {}, cat.name), h('span', { class: 'en' }, cat.en)),
        renderCards(hand.cards, { size: 'xs', highlight: coreCards(hand), className: 'soft' }),
        h('p', { class: 'cs-tip' }, cat.tip),
      ),
    );
  });

  const panel = h('div', { class: 'cheatsheet', id: 'cheatsheet', 'aria-hidden': 'true' },
    h('div', { class: 'cs-inner' },
      h('p', { class: 'cs-intro' }, 'De mejor (1) a peor (9). Cada jugador forma su mejor mano con 5 cartas: sus 2 + las 5 de la mesa.'),
      h('ol', { class: 'cs-list' }, rows),
      h('p', { class: 'cs-foot' }, 'Si dos manos son del mismo tipo, gana la de cartas más altas. Los palos nunca desempatan.'),
    ),
  );
  const backdrop = h('div', { class: 'cs-backdrop', onClick: () => toggle(false) });

  const button = h('button', { class: 'cs-toggle', 'aria-expanded': 'false', 'aria-controls': 'cheatsheet', onClick: () => toggle() },
    'Chuleta', h('span', { class: 'chev', 'aria-hidden': 'true' }, '▾'));

  function toggle(force) {
    const open = force ?? !panel.classList.contains('open');
    panel.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
  }

  document.addEventListener('keydown', (e) => e.key === 'Escape' && toggle(false));

  return { button, panel, backdrop, close: () => toggle(false) };
}
