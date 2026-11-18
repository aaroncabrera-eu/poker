// Explicaciones en lenguaje natural de por qué una mano gana a otra.

import { rankName } from './cards.js';
import { CATEGORIES, compareHands } from './hands.js';

const ORD = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta'];
const sg = (r) => rankName(r);
const pl = (r) => rankName(r, true);

// Posición en `values` donde empiezan las cartas acompañantes (kickers) de cada categoría.
const FIRST_KICKER = { 1: 1, 2: 2, 3: 1, 7: 1 };

function kicker(cat, i, w, l) {
  const n = i - FIRST_KICKER[cat];
  const which = n === 0 ? 'la carta acompañante' : `la ${ORD[n]} carta acompañante`;
  return `Empatan en lo principal, así que desempata ${which} (kicker): ${sg(w)} gana a ${sg(l)}.`;
}

// Por qué gana una mano a otra de la MISMA categoría. `i` es la posición donde difieren.
function tieBreakReason(cat, i, w, l) {
  switch (cat) {
    case 8:
    case 4:
      return `Las dos son escalera, pero una llega más alto: al ${sg(w)} frente al ${sg(l)}.`;
    case 7:
      return i === 0 ? `Póker de ${pl(w)} gana a póker de ${pl(l)}.` : kicker(cat, i, w, l);
    case 6:
      return i === 0
        ? `En el full manda el trío: trío de ${pl(w)} gana a trío de ${pl(l)}.`
        : `Mismo trío, así que decide la pareja: ${pl(w)} gana a ${pl(l)}.`;
    case 5:
      return `Entre dos colores se comparan las cartas una a una, de mayor a menor. La diferencia está en la ${ORD[i]}: ${sg(w)} frente a ${sg(l)}.`;
    case 3:
      return i === 0 ? `Trío de ${pl(w)} gana a trío de ${pl(l)}.` : kicker(cat, i, w, l);
    case 2:
      if (i === 0) return `Manda la pareja más alta: pareja de ${pl(w)} gana a pareja de ${pl(l)}.`;
      if (i === 1) return `Misma pareja alta, así que decide la segunda: ${pl(w)} gana a ${pl(l)}.`;
      return kicker(cat, i, w, l);
    case 1:
      return i === 0 ? `Pareja de ${pl(w)} gana a pareja de ${pl(l)}.` : kicker(cat, i, w, l);
    default:
      return i === 0
        ? `Nadie liga nada, así que gana la carta más alta: ${sg(w)} frente a ${sg(l)}.`
        : `Nadie liga nada y empatan en las primeras cartas, así que se mira la ${ORD[i]}: ${sg(w)} frente a ${sg(l)}.`;
  }
}

// Compara dos manos ya evaluadas y devuelve { result: 'a' | 'b' | 'tie', lines: [...] }.
export function explainComparison(a, b, nameA = 'A', nameB = 'B') {
  const cmp = compareHands(a, b);
  const lines = [`${nameA}: ${a.description}. ${nameB}: ${b.description}.`];

  if (cmp === 0) {
    lines.push('Sus mejores 5 cartas valen exactamente lo mismo. Los palos nunca desempatan, así que se reparten el bote (split pot).');
    return { result: 'tie', lines };
  }

  const [w, l] = cmp > 0 ? [a, b] : [b, a];
  if (w.category !== l.category) {
    lines.push(`${CATEGORIES[w.category].name} gana a ${CATEGORIES[l.category].name.toLowerCase()}: está más arriba en la chuleta.`);
  } else {
    const i = w.values.findIndex((v, k) => v !== l.values[k]);
    lines.push(tieBreakReason(w.category, i, w.values[i], l.values[i]));
  }
  return { result: cmp > 0 ? 'a' : 'b', lines };
}
