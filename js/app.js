// Punto de entrada: barra superior, chuleta y navegación entre pantallas.
// La navegación usa el "#" de la URL (#/practicar...), así funciona en cualquier alojamiento estático.

import { h } from './ui/dom.js';
import { createCheatsheet } from './ui/cheatsheet.js';
import { createRules } from './ui/rules.js';
import { closeAllDropdowns } from './ui/dropdown.js';
import { homeScreen } from './screens/home.js';
import { practiceScreen } from './screens/practice.js';
import { winnerExercise } from './screens/exercise-winner.js';
import { soonScreen } from './screens/soon.js';

const routes = {
  '/': { render: homeScreen },
  '/practicar': { title: 'Practicar', back: '/', render: practiceScreen },
  '/practicar/quien-gana': { title: '¿Qué mano gana?', back: '/practicar', render: winnerExercise },
  '/jugar': { title: 'Jugar', back: '/', render: soonScreen('Aquí estará la mesa contra bots, paso a paso y con pistas.') },
  '/aprender': { title: 'Aprender', back: '/', render: soonScreen('Lecciones cortas: reglas, rondas de apuestas y posiciones.') },
  '/calculadora': { title: 'Calculadora', back: '/', render: soonScreen('Probabilidades exactas y cómo calcularlas de cabeza.') },
};

const cheatsheet = createCheatsheet();
const rules = createRules();
const backLink = h('a', { class: 'back', href: '#/', 'aria-label': 'Volver' }, '←');
const brand = h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark' }, '♠'), 'Poker');
const title = h('span', { class: 'topbar-title' });
const view = h('main', { class: 'view' });

document.getElementById('app').append(
  h('header', { class: 'topbar' },
    h('div', { class: 'topbar-left' }, rules.button, backLink, brand),
    title,
    cheatsheet.button,
  ),
  cheatsheet.backdrop,
  cheatsheet.panel,
  rules.backdrop,
  rules.panel,
  view,
);

function route() {
  const path = location.hash.replace(/^#/, '') || '/';
  const r = routes[path] ?? routes['/'];
  closeAllDropdowns();
  backLink.hidden = !r.back;
  backLink.href = `#${r.back ?? '/'}`;
  brand.hidden = !!r.back;
  title.textContent = r.title ?? '';
  document.title = r.title ? `${r.title} · Poker poco a poco` : 'Poker poco a poco';
  view.replaceChildren(r.render());
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
