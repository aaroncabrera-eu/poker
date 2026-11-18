// Decisiones de los bots.
//  - Fácil: "calling station". Paga casi todo, rara vez sube. Errores típicos de principiante.
//  - Normal: compara su probabilidad de ganar con lo que cuesta seguir (pot odds), apuesta sus manos buenas
//    y de vez en cuando se tira un farol.

import { estimateEquity } from './equity.js';

export const BOT_NAMES = ['Lince', 'Búho', 'Zorro', 'Tejón', 'Cuervo'];
export const LEVELS = {
  easy: { name: 'Fácil', desc: 'Pagan casi todo y casi nunca suben. Ideal para empezar.' },
  normal: { name: 'Normal', desc: 'Piensan en sus probabilidades, apuestan fuerte con buenas manos y a veces van de farol.' },
};

// Cantidad total a la que subir: igualar + una fracción del bote resultante. Redondeada a la ciega pequeña.
export function raiseTarget(game, frac) {
  const p = game.current;
  const la = game.legalActions();
  const raw = p.bet + la.toCall + frac * (game.pot + la.toCall);
  const step = game.sb;
  const to = Math.round(raw / step) * step;
  return Math.min(la.maxRaiseTo, Math.max(la.minRaiseTo, to));
}

export function situation(game, iterations = 300) {
  const p = game.current;
  const la = game.legalActions();
  const opponents = game.livePlayers.length - 1;
  const { equity } = estimateEquity(p.hole, game.board, opponents, { iterations });
  const potOdds = la.toCall > 0 ? la.toCall / (game.pot + la.toCall) : 0;
  return { p, la, opponents, equity, potOdds, strength: equity * (opponents + 1) };
}

export function decideBot(game, level = 'normal', rng = Math.random) {
  const { p, la, equity, potOdds, strength } = situation(game);
  const preflop = game.street === 'preflop';
  const raise = (frac) => ({ type: 'raise', amount: raiseTarget(game, frac) });
  const r = rng();

  if (level === 'easy') {
    if (la.toCall === 0) {
      if (la.canRaise && equity > 0.75 && r < 0.5) return raise(0.5);
      return { type: 'check' };
    }
    if (la.canRaise && equity > 0.85 && r < 0.3) return raise(0.5);
    const huge = la.toCall > 0.5 * (p.stack + p.bet) && equity < 0.45;
    if (!huge && (equity >= potOdds - 0.12 || r < 0.3)) return { type: 'call' };
    return { type: 'fold' };
  }

  // Normal
  if (la.toCall === 0) {
    if (la.canRaise && (strength > 1.6 || equity > 0.7) && r < 0.8) return raise(0.6);
    if (la.canRaise && strength > 1.2 && r < 0.35) return raise(0.5);
    if (la.canRaise && r < 0.07) return raise(0.5); // farol
    return { type: 'check' };
  }
  if (la.canRaise && (equity > 0.75 || strength > 2.2) && r < 0.6) return raise(0.75);
  // Antes del flop se paga un poco más ligero: aún quedan cartas por ver.
  const needed = preflop ? potOdds * 0.75 : potOdds + 0.03;
  if (equity >= needed) return { type: 'call' };
  if (la.canRaise && r < 0.03) return raise(0.75); // farol
  return { type: 'fold' };
}
