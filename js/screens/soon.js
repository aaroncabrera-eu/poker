import { h } from '../ui/dom.js';

export const soonScreen = (text) => () =>
  h('section', { class: 'screen soon' },
    h('div', { class: 'soon-mark', 'aria-hidden': 'true' }, '♠'),
    h('h2', {}, 'Próximamente'),
    h('p', { class: 'muted' }, text),
    h('a', { class: 'btn', href: '#/' }, 'Volver al inicio'),
  );
