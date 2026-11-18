import { h } from '../ui/dom.js';
import { renderCards } from '../ui/cards.js';
import { parseCards } from '../engine/cards.js';

const tile = (href, title, subtitle, { big = false, soon = false } = {}) =>
  h('a', { class: `tile ${big ? 'tile-big' : ''} ${soon ? 'is-soon' : ''}`, href },
    h('div', { class: 'tile-text' },
      h('span', { class: 'tile-title' }, title),
      h('span', { class: 'tile-sub' }, subtitle),
    ),
    soon ? h('span', { class: 'badge' }, 'Próximamente') : h('span', { class: 'tile-arrow', 'aria-hidden': 'true' }, '→'),
  );

export function homeScreen() {
  return h('section', { class: 'screen home' },
    h('div', { class: 'hero' },
      renderCards(parseCards('As Kh'), { size: 'md', className: 'hero-cards' }),
      h('h1', {}, 'Poker poco a poco'),
      h('p', { class: 'muted' }, 'Aprende Texas Hold\'em a tu ritmo. Nada avanza hasta que tú quieras.'),
    ),
    h('nav', { class: 'tiles' },
      tile('#/jugar', 'Jugar', 'Mesa contra bots, con pistas en cada jugada', { big: true, soon: true }),
      tile('#/practicar', 'Practicar', 'Ejercicios cortos para entrenar', { big: true }),
      h('div', { class: 'tiles-row' },
        tile('#/aprender', 'Aprender', 'Lecciones', { soon: true }),
        tile('#/calculadora', 'Calculadora', 'Probabilidades', { soon: true }),
      ),
    ),
  );
}
