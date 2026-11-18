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
      h('div', { class: 'cs-text' },
        h('div', { class: 'cs-name' }, cat.name, h('span', { class: 'en' }, cat.en)),
        h('div', { class: 'cs-tip' }, cat.tip),
      ),
      renderCards(hand.cards, { size: 'xs', highlight: coreCards(hand), className: 'soft' }),
    );
  });

  const panel = h('div', { class: 'cheatsheet', id: 'cheatsheet', 'aria-hidden': 'true' },
    h('div', { class: 'cs-inner' },
      h('p', { class: 'cs-intro' }, 'De mejor (1) a peor (9). Las cartas resaltadas forman la jugada.'),
      h('ol', { class: 'cs-list' }, rows),
      h('ul', { class: 'cs-foot' },
        h('li', {}, 'Tu mano: las 5 mejores de tus 2 cartas + las 5 de la mesa.'),
        h('li', {}, 'Mismo tipo: ganan las cartas más altas. El palo no desempata.'),
        h('li', {}, 'El As vale arriba (10-J-Q-K-A) o abajo (A-2-3-4-5).'),
      ),
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
