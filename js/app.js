// Punto de entrada: barra superior, chuleta y navegación entre pantallas.
// La navegación usa el "#" de la URL (#/practicar...), así funciona en cualquier alojamiento estático.

import { h } from './ui/dom.js';
import { createCheatsheet } from './ui/cheatsheet.js';
import { createRules } from './ui/rules.js';
import { closeAllDropdowns } from './ui/dropdown.js';
import { homeScreen } from './screens/home.js';
import { practiceScreen } from './screens/practice.js';
import { winnerExercise } from './screens/exercise-winner.js';
import { handExercise } from './screens/exercise-hand.js';
import { outsExercise } from './screens/exercise-outs.js';
import { decideExercise } from './screens/exercise-decide.js';
import { oddsExercise } from './screens/exercise-odds.js';
import { tableScreen } from './screens/table.js';
import { calculatorScreen } from './screens/calculator.js';
import { lessonsScreen, lessonScreen } from './screens/lessons.js';

const routes = {
  '/': { render: homeScreen },
  '/practicar': { title: 'Practicar', back: '/', render: practiceScreen },
  '/practicar/que-mano': { title: '¿Qué mano tienes?', back: '/practicar', render: handExercise },
  '/practicar/quien-gana': { title: '¿Qué mano gana?', back: '/practicar', render: winnerExercise },
  '/practicar/outs': { title: '¿Cuántos outs?', back: '/practicar', render: outsExercise },
  '/practicar/probabilidad': { title: '¿Qué probabilidad?', back: '/practicar', render: oddsExercise },
  '/practicar/que-harias': { title: '¿Qué harías?', back: '/practicar', render: decideExercise },
  '/jugar': { title: 'Jugar', back: '/', render: tableScreen },
  '/aprender': { title: 'Aprender', back: '/', render: lessonsScreen },
  '/calculadora': { title: 'Calculadora', back: '/', render: calculatorScreen },
};

// Rutas con parámetro: #/aprender/<id-de-lección>
function matchRoute(path) {
  if (routes[path]) return routes[path];
  const m = path.match(/^\/aprender\/([\w-]+)$/);
  if (m) return { title: 'Lección', back: '/aprender', render: () => lessonScreen(m[1]) };
  return routes['/'];
}

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
  const r = matchRoute(path);
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
