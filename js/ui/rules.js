// Desplegable de información: reglas de Texas Hold'em (No Limit) en apartados plegables.

import { h } from './dom.js';
import { createDropdown } from './dropdown.js';

const t = (es, en) => [h('strong', {}, es), en && h('span', { class: 'en' }, ` (${en})`)];

const STREETS = [
  ['Preflop', '2 tuyas'],
  ['Flop', '+3 mesa'],
  ['Turn', '+1 mesa'],
  ['River', '+1 mesa'],
  ['Showdown', 'se enseñan'],
];

const SECTIONS = [
  {
    title: 'Objetivo',
    open: true,
    body: [
      h('p', {}, 'Ganar las fichas del ', ...t('bote', 'pot'), ', que es todo lo apostado en la mano. Se gana de dos formas:'),
      h('ul', {},
        h('li', {}, 'Tener la mejor mano al final, cuando se enseñan las cartas.'),
        h('li', {}, 'Que todos los demás se retiren antes. Entonces ganas sin enseñar nada.'),
      ),
    ],
  },
  {
    title: 'Las cartas',
    body: [
      h('ul', {},
        h('li', {}, 'Cada jugador recibe 2 cartas boca abajo, solo para él: ', ...t('cartas propias', 'hole cards'), '.'),
        h('li', {}, 'En la mesa se ponen 5 cartas boca arriba, compartidas por todos: ', ...t('cartas comunitarias', 'board'), '.'),
        h('li', {}, 'Tu mano es la mejor combinación de 5 entre esas 7. Puedes usar tus 2 cartas, solo 1 o ninguna.'),
      ),
    ],
  },
  {
    title: 'Las rondas',
    body: [
      h('ol', { class: 'streets' },
        STREETS.map(([name, sub]) => h('li', {}, h('strong', {}, name), h('span', {}, sub)))),
      h('p', {}, 'Después de cada reparto hay una ronda de apuestas. Si en cualquier momento solo queda un jugador, la mano termina y se lleva el bote.'),
    ],
  },
  {
    title: 'Botón y ciegas',
    body: [
      h('ul', {},
        h('li', {}, 'El ', ...t('botón', 'dealer, D'), ' marca quién "reparte". Pasa al siguiente jugador (hacia la izquierda) en cada mano.'),
        h('li', {}, 'Los dos jugadores a su izquierda ponen apuestas obligatorias antes de ver las cartas: la ', ...t('ciega pequeña', 'small blind'), ' y la ', ...t('ciega grande', 'big blind'), ', que suele ser el doble.'),
        h('li', {}, 'Las ciegas existen para que siempre haya algo en el bote por lo que jugar.'),
      ),
    ],
  },
  {
    title: 'Qué puedes hacer en tu turno',
    body: [
      h('ul', { class: 'actions' },
        h('li', {}, ...t('Retirarte', 'fold'), ': tiras tus cartas y pierdes lo que ya hayas puesto.'),
        h('li', {}, ...t('Pasar', 'check'), ': no apuestas. Solo si nadie ha apostado antes en esa ronda.'),
        h('li', {}, ...t('Apostar', 'bet'), ': pones fichas cuando nadie lo ha hecho todavía.'),
        h('li', {}, ...t('Igualar', 'call'), ': pones lo mismo que la apuesta más alta para seguir jugando.'),
        h('li', {}, ...t('Subir', 'raise'), ': apuestas más que la apuesta actual. Los demás tendrán que igualar tu subida, subir otra vez o retirarse.'),
        h('li', {}, ...t('Todo', 'all-in'), ': apuestas todas tus fichas.'),
      ),
    ],
  },
  {
    title: 'Orden de juego',
    body: [
      h('ul', {},
        h('li', {}, 'Se juega en el sentido de las agujas del reloj.'),
        h('li', {}, 'Preflop empieza el jugador a la izquierda de la ciega grande.'),
        h('li', {}, 'En el flop, el turn y el river empieza el primer jugador que siga en la mano a la izquierda del botón.'),
        h('li', {}, 'La ronda termina cuando todos los que siguen han puesto lo mismo (o pasado).'),
        h('li', {}, 'Actuar el último es una ventaja, porque ya has visto lo que han hecho los demás.'),
      ),
    ],
  },
  {
    title: 'Final de la mano',
    body: [
      h('ul', {},
        h('li', {}, 'Si tras el river siguen 2 o más jugadores, se enseñan las cartas: ', ...t('showdown', null), '. Gana la mejor mano (mira la chuleta).'),
        h('li', {}, 'Si hay empate exacto, el bote se reparte (', h('span', { class: 'en' }, 'split pot'), ').'),
      ),
    ],
  },
  {
    title: 'Sin límite (No Limit)',
    body: [
      h('ul', {},
        h('li', {}, 'Es la versión más jugada: puedes apostar todas tus fichas cuando quieras.'),
        h('li', {}, 'La apuesta mínima es la ciega grande. Si subes, tienes que subir al menos lo mismo que la última subida.'),
        h('li', {}, 'Si vas all-in con menos fichas que otro, solo puedes ganar de cada rival lo mismo que tú has puesto. El resto se juega aparte en un ', ...t('bote secundario', 'side pot'), '.'),
      ),
    ],
  },
];

export function createRules() {
  const button = h('button', { class: 'info-toggle', 'aria-label': 'Reglas del juego', title: 'Reglas' }, 'i');

  return createDropdown({
    id: 'rules',
    label: 'Reglas de Texas Hold\'em',
    button,
    content: [
      h('div', { class: 'rules-head' },
        h('strong', {}, 'Reglas de Texas Hold\'em'),
        h('span', { class: 'muted small' }, 'Toca un apartado para abrirlo.'),
      ),
      h('div', { class: 'rules' },
        SECTIONS.map((s) => h('details', { class: 'rule', open: s.open },
          h('summary', {}, s.title),
          h('div', { class: 'rule-body' }, s.body),
        )),
      ),
    ],
  });
}
