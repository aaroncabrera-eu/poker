// Entrenador: explica la situación del jugador humano y recomienda una acción.

import { rankName } from './cards.js';
import { evaluate, compareHands } from './hands.js';
import { situation, raiseTarget } from './bots.js';
import { findOuts, ruleOf2and4, exactFormula } from './outs.js';

const pct = (x) => `${Math.round(x * 100)}%`;
const ITERATIONS = 1500;

// Descripción de las 2 cartas propias antes del flop.
export function describeHole([a, b]) {
  const [hi, lo] = a.rank >= b.rank ? [a, b] : [b, a];
  if (hi.rank === lo.rank) return `Pareja de mano (pocket pair) de ${rankName(hi.rank, true)}`;
  const suited = hi.suit === lo.suit;
  const gap = hi.rank - lo.rank;
  const extras = [suited ? 'del mismo palo (suited)' : 'de distinto palo (offsuit)'];
  if (gap === 1 || (hi.rank === 14 && lo.rank === 2)) extras.push('seguidas (connectors)');
  return `${rankName(hi.rank)} y ${rankName(lo.rank)} ${extras.join(', ')}`;
}

export function advise(game) {
  const { p, la, opponents, equity, potOdds, strength } = situation(game, ITERATIONS);
  const lines = [];

  // 1. Qué tienes
  if (game.board.length === 0) {
    lines.push(`Tus cartas: ${describeHole(p.hole)}.`);
  } else {
    const mine = evaluate([...p.hole, ...game.board]);
    let txt = `Tu mano ahora: ${mine.description}.`;
    if (game.board.length === 5 && compareHands(mine, evaluate(game.board)) === 0) {
      txt += ' Ojo: tu mejor mano está entera en la mesa, así que la tienen todos.';
    }
    lines.push(txt);
  }

  // 2. Probabilidad
  const rivals = opponents === 1 ? '1 rival' : `${opponents} rivales`;
  lines.push(`Contra ${rivals}, ganarías más o menos el ${pct(equity)} de las veces (suponiendo cartas al azar; si alguien ha subido fuerte, seguramente menos).`);

  // Datos para poder explicar después de dónde sale cada porcentaje.
  const calc = { pot: game.pot, callAmount: la.callAmount, toCall: la.toCall, opponents, iterations: ITERATIONS, boardLen: game.board.length, hole: p.hole, outs: null };

  // 2b. Cómo calcularlo de cabeza: outs (solo en el flop y el turn)
  const math = [];
  if (game.board.length === 3 || game.board.length === 4) {
    const mine = evaluate([...p.hole, ...game.board]);
    const r = findOuts(p.hole, game.board, { minCategory: mine.category + 1 });
    const n = r.outs.length;
    calc.outs = { n, unseen: r.unseen, cardsToCome: r.cardsToCome, current: mine.description };
    if (n > 0) {
      const names = [...new Set(r.outs.map((o) => o.hand.name))].join(', ').toLowerCase();
      math.push(`Tienes ${n} outs (cartas que te mejoran: ${names}).`);
      math.push(`De cabeza: ${n} × ${r.cardsToCome === 2 ? 4 : 2} ≈ ${ruleOf2and4(n, r.cardsToCome)}% de mejorar ${r.cardsToCome === 2 ? 'de aquí al river' : 'en el river'}.`);
      math.push(`Cuenta exacta: ${exactFormula(n, r.unseen, r.cardsToCome)}.`);
      math.push('Mejorar no es lo mismo que ganar: a veces ganas sin mejorar y a veces pierdes aunque mejores. Por eso el porcentaje de arriba es distinto.');
    } else {
      math.push('Ninguna carta te mejora por sí sola: lo que tienes ahora es lo que cuenta.');
    }
  }

  // 3. Coste de seguir y recomendación
  let rec;
  let why;
  if (la.toCall > 0) {
    lines.push(`Para seguir tienes que poner ${la.callAmount} y el bote ya tiene ${game.pot}. Necesitas ganar al menos ${la.callAmount} / (${game.pot} + ${la.callAmount}) = ${pct(potOdds)} de las veces para que pagar compense a la larga. Esto se llama pot odds.`);
    if (la.canRaise && (equity > 0.7 || strength > 2)) {
      rec = 'raise';
      why = `Vas claramente por delante (${pct(equity)} frente al ${pct(potOdds)} que necesitas). Subir hace que los demás paguen más cuando tienes ventaja.`;
    } else if (equity >= potOdds) {
      rec = 'call';
      why = `Tu ${pct(equity)} es mayor que el ${pct(potOdds)} que necesitas: igualar sale rentable.`;
    } else {
      rec = 'fold';
      why = `Tu ${pct(equity)} es menor que el ${pct(potOdds)} que necesitas: si pagas en situaciones así, a la larga pierdes fichas.`;
    }
  } else {
    lines.push('Nadie ha apostado en esta ronda, así que puedes pasar gratis.');
    if (la.canRaise && (strength > 1.6 || equity > 0.65)) {
      rec = 'bet';
      why = 'Tu mano es fuerte: apuesta para que los que tienen manos peores paguen. Si pasas, regalas cartas gratis.';
    } else {
      rec = 'check';
      why = 'Tu mano no es lo bastante fuerte para apostar. Pasar no cuesta nada y ves qué hacen los demás.';
    }
  }

  const amount = rec === 'raise' ? raiseTarget(game, 0.75) : rec === 'bet' ? raiseTarget(game, 0.6) : null;
  const label = {
    fold: 'Retirarte (fold)',
    call: `Igualar ${la.callAmount} (call)`,
    check: 'Pasar (check)',
    raise: `Subir a ${amount} (raise)`,
    // Desde la ciega grande antes del flop no es "apostar" sino "subir", aunque no haya que pagar nada.
    bet: la.isBet ? `Apostar ${amount} (bet)` : `Subir a ${amount} (raise)`,
  }[rec];
  return { rec, amount, label, why, lines, math, calc, equity, potOdds, toCall: la.toCall, isBet: la.isBet };
}

// "¿De dónde salen los porcentajes?": explicación paso a paso con los números de la jugada.
// Devuelve una lista de apartados { title, lines }.
export function explainPercentages(advice) {
  const c = advice.calc;
  const e = Math.round(advice.equity * 100);
  const need = Math.round(advice.potOdds * 100);
  const rivals = c.opponents === 1 ? '1 rival' : `${c.opponents} rivales`;
  const sections = [];

  // 1. Lo que necesitabas
  if (c.toCall > 0) {
    sections.push({
      title: `Lo que necesitabas: ${need}%`,
      lines: [
        `Para seguir tenías que poner ${c.callAmount}. Si pagabas, el bote se quedaba en ${c.pot} + ${c.callAmount} = ${c.pot + c.callAmount}.`,
        `Porcentaje necesario = lo que pagas ÷ bote después de pagar = ${c.callAmount} ÷ ${c.pot + c.callAmount} = ${need}%.`,
        `Dicho de otra forma: arriesgas ${c.callAmount} para ganar ${c.pot}. Si ganas más de ${need} de cada 100 veces, a la larga sacas fichas.`,
      ],
    });
  } else {
    sections.push({
      title: 'Lo que necesitabas: 0%',
      lines: ['Nadie había apostado, así que seguir no costaba nada. Por eso pasar nunca es un error: la duda es solo si merece la pena apostar.'],
    });
  }

  // 2. Tu probabilidad de ganar
  const eqLines = [
    `La app lo calcula por simulación: juega esta misma situación ${c.iterations.toLocaleString('es-ES')} veces, repartiendo al azar las cartas de ${rivals} y las de la mesa que faltan, y cuenta cuántas ganas. Te salió ${e} de cada 100.`,
  ];
  if (c.boardLen === 0) {
    const fair = Math.round(100 / (c.opponents + 1));
    const [a, b] = c.hole;
    eqLines.push(`De cabeza, antes del flop se usan referencias: con ${c.opponents + 1} jugadores, una mano normal gana 1 de cada ${c.opponents + 1} veces (${fair}%). Tu ${e}% está ${e > fair * 1.15 ? 'por encima de esa media' : e < fair * 0.85 ? 'por debajo de esa media' : 'más o menos en la media'}.`);
    if (a.rank === b.rank) eqLines.push('Las parejas de mano son de lo mejor que te pueden dar: contra un solo rival con dos cartas más bajas ganan alrededor del 80%.');
    else if (Math.max(a.rank, b.rank) >= 12) eqLines.push('Con cartas altas ganas sobre todo cuando ligas pareja con ellas: una pareja alta suele ser suficiente con pocos rivales.');
    else eqLines.push('Con cartas bajas y sin pareja dependes de ligar mucho en la mesa: por eso suelen ganar poco.');
  } else if (c.outs && c.outs.n > 0) {
    const { n, unseen, cardsToCome } = c.outs;
    const mult = cardsToCome === 2 ? 4 : 2;
    eqLines.push(`De cabeza, con los outs: tienes ${n} cartas que te mejoran y quedan ${unseen} por ver. ${n} × ${mult} ≈ ${ruleOf2and4(n, cardsToCome)}% de mejorar (cuenta exacta: ${exactFormula(n, unseen, cardsToCome)}).`);
    eqLines.push(`Ese número no es exactamente tu probabilidad de ganar: con lo que tienes ahora (${c.outs.current}) a veces ya vas ganando sin mejorar, y a veces mejoras pero un rival tiene algo mejor. Por eso la simulación da ${e}%.`);
  } else if (c.boardLen < 5) {
    eqLines.push('De cabeza: ninguna carta te mejora por sí sola, así que lo que cuenta es si lo que tienes ya gana. Con más rivales, más fácil es que alguien tenga algo mejor.');
  } else {
    eqLines.push('En el river ya no salen más cartas: tu probabilidad es simplemente cuántas manos de los rivales son peores que la tuya.');
  }
  eqLines.push('Ojo: la simulación supone que los rivales pueden tener cualquier mano. Si alguien ha subido fuerte, lo normal es que tenga algo bueno y tu probabilidad real sea menor.');
  sections.push({ title: `Tu probabilidad de ganar: ${e}%`, lines: eqLines });

  // 3. La comparación
  if (c.toCall > 0) {
    sections.push({
      title: 'La comparación',
      lines: [e >= need
        ? `${e}% es más que ${need}%: pagar sale rentable a la larga.${e - need >= 25 ? ' Y como la diferencia es grande, subir también es buena idea.' : ''}`
        : `${e}% es menos que ${need}%: pagar te hace perder fichas a la larga. Lo correcto era retirarse.`],
    });
  } else {
    sections.push({
      title: 'La comparación',
      lines: [advice.rec === 'bet'
        ? `Con un ${e}% tu mano es fuerte: apostar hace que paguen las manos peores.`
        : `Con un ${e}% tu mano no es tan fuerte como para apostar: lo prudente es pasar gratis.`],
    });
  }
  return sections;
}

// Valora la jugada del humano comparándola con lo que recomendaba el entrenador.
// action: { type: 'fold' | 'check' | 'call' | 'raise' }. Devuelve { grade: 'good' | 'ok' | 'bad', title, text }.
export function judgeAction(advice, action) {
  // Poner fichas cuando no había que pagar nada (apostar, o subir desde la ciega grande antes del flop)
  // cuenta como "apostar"; poner más cuando sí había que pagar cuenta como "subir".
  const did = action.type === 'raise' ? (advice.toCall > 0 ? 'raise' : 'bet') : action.type;
  const e = pct(advice.equity);
  const need = pct(advice.potOdds);
  const ahead = advice.equity - advice.potOdds;
  const G = (grade, text) => ({ grade, text, title: { good: 'Buena jugada', ok: 'Jugada aceptable', bad: 'Jugada mejorable' }[grade] });

  switch (advice.rec) {
    case 'fold':
      if (did === 'fold') return G('good', `Bien retirado: tenías un ${e} y necesitabas un ${need} para que pagar compensara.`);
      if (did === 'call') return G('bad', `Pagaste con un ${e} cuando necesitabas un ${need}. Hecho muchas veces, esto pierde fichas.`);
      return G('bad', `Subir con una mano floja (${e}) es un farol. A veces funciona, pero a la larga cuesta fichas, sobre todo contra rivales que lo pagan todo.`);
    case 'call':
      if (did === 'call') return G('good', `Bien pagado: tu ${e} es mayor que el ${need} que necesitabas.`);
      if (did === 'raise') return G('ok', `Vas algo por delante (${e} frente a ${need}), pero no tanto: subir arriesga más fichas. Igualar era suficiente.`);
      return G(ahead > 0.1 ? 'bad' : 'ok', `Demasiado prudente: tenías un ${e} y solo necesitabas un ${need}. Pagar habría sido rentable a la larga.`);
    case 'raise':
      if (did === 'raise') return G('good', `Bien subido: con un ${e} vas claramente por delante y haces que paguen más.`);
      if (did === 'call') return G('ok', `Correcto, aunque con un ${e} podías subir para ganar más cuando vas por delante.`);
      return G('bad', `Tiraste una mano muy buena: tenías un ${e} y solo necesitabas un ${need}.`);
    case 'bet':
      if (did === 'bet') return G('good', `Bien apostado: tu mano (${e}) es fuerte y así cobras a las manos peores.`);
      if (did === 'check') return G('ok', `Algo pasivo: con un ${e} conviene apostar. Pasando dejas ver cartas gratis a los demás.`);
      return G('bad', 'No hacía falta retirarse: nadie había apostado y podías pasar gratis, y además tu mano era fuerte.');
    default: // check
      if (did === 'check') return G('good', `Bien pasado: con un ${e} no merece la pena apostar, y pasar es gratis.`);
      if (did === 'fold') return G('bad', 'No hacía falta retirarse: nadie había apostado y podías pasar gratis.');
      return G('ok', `Apostar con un ${e} es casi un farol. Puede funcionar si los rivales se retiran, pero arriesgas fichas con una mano floja.`);
  }
}
