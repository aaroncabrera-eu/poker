// Dibujo de cartas.

import { h } from './dom.js';
import { rankLabel, rankName, SUIT_SYMBOLS, SUIT_NAMES, sameCard } from '../engine/cards.js';

// opts: { dim: bool, hl: bool }
export function renderCard(card, opts = {}) {
  const cls = ['card', `suit-${card.suit}`, opts.dim && 'dim', opts.hl && 'hl'].filter(Boolean).join(' ');
  return h('div', { class: cls, role: 'img', 'aria-label': `${rankName(card.rank)} de ${SUIT_NAMES[card.suit]}` },
    h('span', { class: 'card-rank' }, rankLabel(card.rank)),
    h('span', { class: 'card-suit' }, SUIT_SYMBOLS[card.suit]),
  );
}

export const renderBack = () => h('div', { class: 'card back', role: 'img', 'aria-label': 'Carta boca abajo' });

export const renderSlot = () => h('div', { class: 'card slot', 'aria-hidden': 'true' });

// Fila de cartas. `size`: 'xs' | 'sm' | 'md' | 'board'. `highlight`: cartas a resaltar (el resto se atenúa).
// Los huecos (null) se dibujan boca abajo, o como hueco vacío si empty === 'slot'.
export function renderCards(cards, { size = 'md', highlight = null, className = '', empty = 'back' } = {}) {
  return h('div', { class: `cards size-${size} ${className}` },
    cards.map((c) => {
      if (!c) return empty === 'slot' ? renderSlot() : renderBack();
      const inHand = highlight ? highlight.some((x) => sameCard(x, c)) : false;
      return renderCard(c, { hl: highlight && inHand, dim: highlight && !inHand });
    }),
  );
}
