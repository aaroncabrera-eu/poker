import { h } from '../ui/dom.js';
import { load } from '../storage.js';

const EXERCISES = [
  { href: '#/practicar/que-mano', title: '¿Qué mano tienes?', sub: 'Encuentra tu mejor combinación de 5 cartas.', statsKey: 'stats:hand' },
  { href: '#/practicar/quien-gana', title: '¿Qué mano gana?', sub: 'Dos jugadores, una mesa: elige al ganador.', statsKey: 'stats:winner' },
  { href: '#/practicar/outs', title: '¿Cuántos outs tienes?', sub: 'Cuenta las cartas que te ayudan y calcula de cabeza.', statsKey: 'stats:outs' },
  { href: '#/practicar/que-harias', title: '¿Qué harías?', sub: 'Un rival apuesta: ¿pagas o te retiras?', statsKey: 'stats:decide' },
];

export function practiceScreen() {
  return h('section', { class: 'screen' },
    h('p', { class: 'muted lead' }, 'Elige un ejercicio. Tu progreso se guarda en este dispositivo.'),
    h('div', { class: 'list' },
      EXERCISES.map((ex) => {
        const stats = ex.statsKey ? load(ex.statsKey, null) : null;
        const meta = !ex.href
          ? h('span', { class: 'badge' }, 'Próximamente')
          : stats?.played
            ? h('span', { class: 'meta' }, `${Math.round((100 * stats.correct) / stats.played)}% · ${stats.played} hechas`)
            : h('span', { class: 'tile-arrow', 'aria-hidden': 'true' }, '→');
        return h(ex.href ? 'a' : 'div', { class: `tile ${ex.href ? '' : 'is-soon'}`, href: ex.href },
          h('div', { class: 'tile-text' },
            h('span', { class: 'tile-title' }, ex.title),
            h('span', { class: 'tile-sub' }, ex.sub),
          ),
          meta,
        );
      }),
    ),
  );
}
