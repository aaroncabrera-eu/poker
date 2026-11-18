// Chuleta desplegable con el ranking de manos. Se abre desde la barra superior en cualquier pantalla.

import { h } from './dom.js';
import { renderCards } from './cards.js';
import { createDropdown } from './dropdown.js';
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

  const button = h('button', { class: 'cs-toggle' },
    'Chuleta', h('span', { class: 'chev', 'aria-hidden': 'true' }, '▾'));

  return createDropdown({
    id: 'cheatsheet',
    label: 'Chuleta de manos',
    button,
    content: [
      h('p', { class: 'cs-intro' }, 'De mejor (1) a peor (9). Las cartas resaltadas forman la jugada.'),
      h('ol', { class: 'cs-list' }, rows),
      h('ul', { class: 'cs-foot' },
        h('li', {}, 'Tu mano: las 5 mejores de tus 2 cartas + las 5 de la mesa.'),
        h('li', {}, 'Mismo tipo: ganan las cartas más altas. El palo no desempata.'),
        h('li', {}, 'El As vale arriba (10-J-Q-K-A) o abajo (A-2-3-4-5).'),
      ),
    ],
  });
}
