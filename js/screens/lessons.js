// Lecciones: lista y lección individual.

import { h } from '../ui/dom.js';
import { renderCards } from '../ui/cards.js';
import { parseCards } from '../engine/cards.js';
import { LESSONS } from '../content/lessons.js';
import { load, save } from '../storage.js';

const READ_KEY = 'lessons:read';

export function lessonsScreen() {
  const read = load(READ_KEY, {});
  return h('section', { class: 'screen' },
    h('p', { class: 'muted lead' }, 'Lecciones cortas, en orden. Cada una termina con algo para practicar.'),
    h('div', { class: 'list' },
      LESSONS.map((l, i) => h('a', { class: 'tile', href: `#/aprender/${l.id}` },
        h('span', { class: `lesson-num ${read[l.id] ? 'done' : ''}` }, read[l.id] ? '✓' : i + 1),
        h('div', { class: 'tile-text grow' },
          h('span', { class: 'tile-title' }, l.title),
          h('span', { class: 'tile-sub' }, l.sub),
        ),
        h('span', { class: 'tile-arrow', 'aria-hidden': 'true' }, '→'),
      )),
    ),
  );
}

function block(b) {
  if (b.p) return h('p', {}, b.p);
  if (b.h) return h('h3', { class: 'lesson-h' }, b.h);
  if (b.list) return h('ul', { class: 'lesson-list' }, b.list.map((x) => h('li', {}, x)));
  if (b.cards) return h('figure', { class: 'lesson-cards' }, renderCards(parseCards(b.cards), { size: 'sm' }), b.caption && h('figcaption', {}, b.caption));
  if (b.table) {
    const [head, ...rows] = b.table;
    return h('div', { class: 'table-wrap' }, h('table', { class: 'lesson-table' },
      h('thead', {}, h('tr', {}, head.map((c) => h('th', {}, c)))),
      h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))),
    ));
  }
  if (b.tip) return h('p', { class: 'lesson-tip' }, b.tip);
  return null;
}

export function lessonScreen(id) {
  const idx = LESSONS.findIndex((l) => l.id === id);
  const l = LESSONS[idx];
  if (!l) return lessonsScreen();
  const read = load(READ_KEY, {});
  read[l.id] = true;
  save(READ_KEY, read);
  const next = LESSONS[idx + 1];
  return h('article', { class: 'screen lesson' },
    h('header', {},
      h('span', { class: 'small muted' }, `Lección ${idx + 1} de ${LESSONS.length}`),
      h('h1', { class: 'lesson-title' }, l.title),
    ),
    l.blocks.map(block),
    h('div', { class: 'lesson-actions' },
      h('a', { class: 'btn primary', href: l.practice.href }, l.practice.label),
      l.practice2 && h('a', { class: 'btn', href: l.practice2.href }, l.practice2.label),
      next && h('a', { class: 'btn', href: `#/aprender/${next.id}` }, `Siguiente: ${next.title} →`),
    ),
  );
}

export const lessonTitle = (id) => LESSONS.find((l) => l.id === id)?.title ?? 'Aprender';
