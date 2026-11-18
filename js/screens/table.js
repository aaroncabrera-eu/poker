// Mesa contra bots, paso a paso.

import { h } from '../ui/dom.js';
import { renderCard, renderCards } from '../ui/cards.js';
import { sameCard } from '../engine/cards.js';
import { Game, STREET_NAMES } from '../engine/game.js';
import { decideBot, raiseTarget, BOT_NAMES, LEVELS } from '../engine/bots.js';
import { advise } from '../engine/coach.js';
import { evaluate, compareHands, coreCards } from '../engine/hands.js';
import { explainComparison } from '../engine/explain.js';
import { load, save } from '../storage.js';

const SETTINGS_KEY = 'settings:table';
const DEFAULTS = { bots: 3, level: 'easy', auto: false };
const BOT_DELAY = 1100;

const NEXT_STREET_LABEL = {
  preflop: 'Repartir el flop (3 cartas)',
  flop: 'Repartir el turn (1 carta)',
  turn: 'Repartir el river (1 carta)',
  river: 'Enseñar las cartas (showdown)',
};

const ACTION_TAG = { fold: 'Retirado', check: 'Pasa', call: 'Iguala', bet: 'Apuesta', raise: 'Sube' };

export function tableScreen() {
  const root = h('section', { class: 'screen table-screen' });
  const settings = load(SETTINGS_KEY, DEFAULTS);
  let game = null;
  let timer = null;
  const ui = { seen: 0, fresh: [], hint: null, raiseOpen: false, raiseTo: 0 };

  const alive = () => root.isConnected;

  // ---------- Preparación ----------
  function segmented(options, current, onPick) {
    return h('div', { class: 'seg', role: 'radiogroup' },
      options.map(([value, label]) =>
        h('button', { class: `seg-btn ${value === current ? 'on' : ''}`, role: 'radio', 'aria-checked': String(value === current), onClick: () => onPick(value) }, label)));
  }

  function renderSetup() {
    clearTimeout(timer);
    const set = (k, v) => {
      settings[k] = v;
      save(SETTINGS_KEY, settings);
      renderSetup();
    };
    root.replaceChildren(
      h('p', { class: 'muted lead' }, 'Juegas tú contra bots. Nada avanza hasta que pulses un botón, y en tu turno puedes pedir una pista.'),
      h('div', { class: 'field' },
        h('span', { class: 'field-label' }, 'Rivales'),
        segmented([1, 2, 3, 4, 5].map((n) => [n, String(n)]), settings.bots, (v) => set('bots', v)),
      ),
      h('div', { class: 'field' },
        h('span', { class: 'field-label' }, 'Nivel de los bots'),
        segmented(Object.entries(LEVELS).map(([k, l]) => [k, l.name]), settings.level, (v) => set('level', v)),
        h('p', { class: 'small muted' }, LEVELS[settings.level].desc),
      ),
      h('label', { class: 'field toggle' },
        h('input', { type: 'checkbox', checked: settings.auto, onChange: (e) => set('auto', e.target.checked) }),
        h('span', { class: 'toggle-ui', 'aria-hidden': 'true' }),
        h('span', {},
          h('span', { class: 'field-label' }, 'Bots automáticos'),
          h('span', { class: 'small muted block' }, 'Los bots juegan solos con una pausa. Si lo desactivas, pulsas "Siguiente" para cada jugada.'),
        ),
      ),
      h('p', { class: 'small muted' }, 'Empiezas con 1000 fichas. Ciegas 5/10. Si alguien se queda sin fichas, recarga.'),
      h('button', { class: 'btn primary big', onClick: start }, 'Sentarse a la mesa'),
    );
  }

  // ---------- Flujo de la partida ----------
  function start() {
    const bots = BOT_NAMES.slice(0, settings.bots).map((name) => ({ name, level: settings.level }));
    game = new Game({ players: [{ name: 'Tú', isHuman: true }, ...bots], smallBlind: 5, bigBlind: 10, startingStack: 1000 });
    newHand();
  }

  function newHand() {
    game.startHand();
    ui.seen = 0;
    afterStep();
    window.scrollTo({ top: 0 });
  }

  function afterStep() {
    ui.fresh = game.log.slice(ui.seen);
    ui.seen = game.log.length;
    ui.hint = null;
    ui.raiseOpen = false;
    render();
    clearTimeout(timer);
    if (settings.auto && game.phase === 'betting' && !game.current.isHuman) timer = setTimeout(botStep, BOT_DELAY);
  }

  function botStep() {
    if (!alive() || game.phase !== 'betting' || game.current.isHuman) return;
    game.act(decideBot(game, game.current.level));
    afterStep();
  }

  function dealStep() {
    game.next();
    afterStep();
  }

  function humanAct(action) {
    game.act(action);
    afterStep();
  }

  // Cuando ya no puedes actuar (te has retirado o estás all-in), salta al final.
  function skipToEnd() {
    while (game.phase !== 'hand-over') {
      if (game.phase === 'street-end') game.next();
      else if (game.current.isHuman) break;
      else game.act(decideBot(game, game.current.level));
    }
    afterStep();
  }

  // ---------- Piezas ----------
  function badges(p) {
    const list = [];
    if (p.id === game.button) list.push(['D', 'Botón (dealer)']);
    if (p.id === game.sbIndex) list.push(['SB', 'Ciega pequeña']);
    if (p.id === game.bbIndex) list.push(['BB', 'Ciega grande']);
    return list.map(([t, title]) => h('span', { class: `pos pos-${t}`, title }, t));
  }

  function actionTag(p) {
    if (p.folded) return h('span', { class: 'tag tag-fold' }, 'Retirado');
    if (p.allIn) return h('span', { class: 'tag tag-allin' }, 'All-in');
    if (!p.lastAction) return null;
    return h('span', { class: `tag tag-${p.lastAction.type}` }, ACTION_TAG[p.lastAction.type]);
  }

  const showdownShown = (p) => game.phase === 'hand-over' && !game.result.uncontested && !p.folded;

  function oppSeat(p) {
    const turn = game.phase === 'betting' && game.toAct === p.id;
    const won = game.phase === 'hand-over' ? game.result.won[p.id] : 0;
    const shown = showdownShown(p);
    return h('div', { class: ['opp', turn && 'turn', p.folded && 'folded', won && 'winner'].filter(Boolean).join(' ') },
      h('div', { class: 'opp-head' }, h('span', { class: 'opp-name' }, p.name), h('span', { class: 'pos-list' }, badges(p))),
      renderCards(shown ? p.hole : [null, null], { size: 'xs', className: 'opp-cards' }),
      shown && h('div', { class: 'opp-hand' }, game.result.hands[p.id].description),
      h('div', { class: 'opp-foot' },
        h('span', { class: 'stack' }, p.stack),
        won ? h('span', { class: 'tag tag-won' }, `+${won}`) : actionTag(p),
      ),
      p.bet > 0 && h('div', { class: 'bet-chip' }, p.bet),
    );
  }

  function winningCards() {
    if (game.phase !== 'hand-over' || game.result.uncontested) return null;
    const w = game.result.pots[0].winners[0];
    return game.result.hands[w].cards;
  }

  function felt() {
    const hl = winningCards();
    const slots = [0, 1, 2, 3, 4].map((i) => {
      const c = game.board[i];
      if (!c) return h('div', { class: 'card slot', 'aria-hidden': 'true' });
      const inWin = hl ? hl.some((x) => sameCard(x, c)) : false;
      return renderCard(c, { hl: hl && inWin, dim: hl && !inWin });
    });
    return h('div', { class: 'felt table-felt' },
      h('div', { class: 'felt-top' },
        h('span', { class: 'felt-label' }, STREET_NAMES[game.street]),
        h('span', { class: 'pot' }, 'Bote ', h('strong', {}, game.pot)),
      ),
      h('div', { class: 'cards size-board' }, slots),
    );
  }

  function mySeat() {
    const me = game.human;
    const turn = game.phase === 'betting' && game.current === me;
    const won = game.phase === 'hand-over' ? game.result.won[me.id] : 0;
    let hand = null;
    if (game.board.length >= 3 && !me.folded) hand = evaluate([...me.hole, ...game.board]);
    return h('div', { class: ['seat', 'me', turn && 'turn', me.folded && 'folded', won && 'winner'].filter(Boolean).join(' ') },
      h('div', { class: 'seat-top' },
        h('div', { class: 'seat-info' },
          h('span', { class: 'seat-name' }, 'Tú ', h('span', { class: 'pos-list' }, badges(me))),
          h('span', { class: 'stack' }, `${me.stack} fichas`),
          hand && h('span', { class: 'seat-hand' }, `Tienes: ${hand.description}`),
          me.folded && h('span', { class: 'small muted' }, 'Te has retirado de esta mano'),
        ),
        h('div', { class: 'me-cards' },
          renderCards(me.hole, { size: 'md', highlight: hand ? coreCards(hand) : null, className: 'soft' }),
          me.bet > 0 && h('div', { class: 'bet-chip me-bet' }, me.bet),
        ),
      ),
    );
  }

  function narrator() {
    const items = ui.fresh.slice(-4);
    if (!items.length) return null;
    return h('div', { class: 'narrator', 'aria-live': 'polite' }, items.map((e) => h('p', { class: `ev ev-${e.type}` }, e.text)));
  }

  // ---------- Controles ----------
  const actBtn = (label, en, cls, onClick) =>
    h('button', { class: `btn act ${cls}`, onClick }, h('span', {}, label), h('span', { class: 'en' }, en));

  function hintPanel() {
    const a = ui.hint;
    const doIt = () => {
      if (a.rec === 'raise' || a.rec === 'bet') humanAct({ type: 'raise', amount: a.amount });
      else humanAct({ type: a.rec });
    };
    return h('div', { class: 'hint' },
      h('div', { class: 'hint-head' }, h('strong', {}, 'Pista'), h('button', { class: 'link-btn', onClick: () => { ui.hint = null; render(); } }, 'Cerrar')),
      a.lines.map((l) => h('p', {}, l)),
      h('p', { class: 'hint-rec' }, 'Recomendación: ', h('strong', {}, a.label)),
      h('p', {}, a.why),
      h('p', { class: 'small muted' }, 'Es una guía para aprender, no una regla fija.'),
      h('button', { class: 'btn primary', onClick: doIt }, `Hacer esto: ${a.label}`),
    );
  }

  function raisePanel(la) {
    const verb = la.isBet ? 'Apostar' : 'Subir a';
    const amountEl = h('strong', {}, ui.raiseTo);
    const confirm = h('button', { class: 'btn primary', onClick: () => humanAct({ type: 'raise', amount: ui.raiseTo }) }, `${verb} ${ui.raiseTo}`);
    const setTo = (v) => {
      ui.raiseTo = v;
      amountEl.textContent = v;
      confirm.textContent = `${verb} ${v}`;
      slider.value = v;
    };
    const slider = h('input', {
      type: 'range', class: 'range', min: la.minRaiseTo, max: la.maxRaiseTo, step: game.sb, value: ui.raiseTo,
      'aria-label': 'Cantidad',
      onInput: (e) => setTo(Number(e.target.value)),
    });
    const preset = (label, v) => h('button', { class: 'btn chip', onClick: () => setTo(v) }, label);
    return h('div', { class: 'raise-panel' },
      h('div', { class: 'raise-amount' }, h('span', { class: 'muted' }, verb), amountEl),
      slider,
      h('div', { class: 'presets' },
        preset('Mínimo', la.minRaiseTo),
        preset('½ bote', raiseTarget(game, 0.5)),
        preset('Bote', raiseTarget(game, 1)),
        preset('All-in', la.maxRaiseTo),
      ),
      h('div', { class: 'raise-actions' },
        h('button', { class: 'btn', onClick: () => { ui.raiseOpen = false; render(); } }, 'Cancelar'),
        confirm,
      ),
    );
  }

  function humanControls() {
    const la = game.legalActions();
    if (ui.raiseOpen) return raisePanel(la);
    return h('div', { class: 'controls' },
      h('p', { class: 'your-turn' }, la.toCall > 0 ? `Te toca. Para seguir tienes que poner ${la.callAmount}.` : 'Te toca. Nadie ha apostado: puedes pasar gratis.'),
      h('div', { class: 'actions' },
        la.canCall && actBtn('Retirarse', 'fold', 'act-fold', () => humanAct({ type: 'fold' })),
        la.canCheck
          ? actBtn('Pasar', 'check', 'act-check', () => humanAct({ type: 'check' }))
          : actBtn(`Igualar ${la.callAmount}`, la.callAmount < la.toCall ? 'call (all-in)' : 'call', 'act-call', () => humanAct({ type: 'call' })),
        la.canRaise && actBtn(la.isBet ? 'Apostar' : 'Subir', la.isBet ? 'bet' : 'raise', 'act-raise', () => {
          ui.raiseOpen = true;
          ui.raiseTo = la.minRaiseTo;
          render();
        }),
      ),
      ui.hint
        ? hintPanel()
        : h('button', { class: 'btn hint-btn', onClick: () => { ui.hint = advise(game); render(); } }, '¿Qué hago? · Pista'),
    );
  }

  function waitingControls() {
    const me = game.human;
    const cantAct = me.folded || me.allIn;
    const skip = cantAct && h('button', { class: 'btn', onClick: skipToEnd }, 'Saltar al final de la mano');
    if (game.phase === 'street-end') {
      return h('div', { class: 'controls' },
        h('button', { class: 'btn primary', onClick: dealStep }, NEXT_STREET_LABEL[game.street]), skip);
    }
    const p = game.current;
    if (settings.auto) return h('div', { class: 'controls' }, h('p', { class: 'thinking' }, `${p.name} está pensando…`), skip);
    return h('div', { class: 'controls' },
      h('button', { class: 'btn primary', onClick: botStep }, `Siguiente: le toca a ${p.name}`), skip);
  }

  function summary() {
    const r = game.result;
    const me = game.human;
    const net = (r.won[me.id] ?? 0) - me.totalBet;
    const names = r.winners.map((id) => game.players[id].name);
    const iWon = r.winners.includes(me.id);
    const title = iWon ? (r.winners.length > 1 ? 'Empate: te repartes el bote' : '¡Has ganado la mano!') : `Gana ${names.join(' y ')}`;

    const parts = [];
    if (!r.uncontested) {
      parts.push(h('div', { class: 'sd-list' },
        game.livePlayers.map((p) => h('div', { class: `sd-row ${r.winners.includes(p.id) ? 'win' : ''}` },
          h('span', { class: 'sd-name' }, p.name),
          renderCards(p.hole, { size: 'xs' }),
          h('span', { class: 'sd-hand' }, r.hands[p.id].description),
        ))));
      // Por qué gana: ganador del bote principal contra la mejor mano que pierde.
      const main = r.pots[0];
      const w = main.winners[0];
      const losers = main.eligible.filter((id) => !main.winners.includes(id));
      if (losers.length) {
        const l = losers.reduce((a, b) => (compareHands(r.hands[a], r.hands[b]) >= 0 ? a : b));
        const ex = explainComparison(r.hands[w], r.hands[l], game.players[w].name, game.players[l].name);
        parts.push(h('p', { class: 'why' }, ex.lines[1]));
      }
      parts.push(h('p', { class: 'small muted' }, 'En la mesa se resaltan las cartas que forman la mano ganadora.'));
    }

    // Aprendizaje: si te retiraste, ¿qué habría pasado?
    if (me.folded && game.board.length === 5 && !r.uncontested) {
      const mine = evaluate([...me.hole, ...game.board]);
      const best = r.hands[r.pots[0].winners[0]];
      const c = compareHands(mine, best);
      const verdict = c > 0 ? 'habrías ganado' : c === 0 ? 'habrías empatado' : 'habrías perdido igualmente';
      parts.push(h('p', { class: 'whatif' }, `Te retiraste. Si hubieras llegado al final, tendrías ${mine.description}: ${verdict}.`));
    }

    return h('div', { class: `summary ${iWon ? 'ok' : ''}` },
      h('strong', { class: 'summary-title' }, title),
      h('p', { class: `net ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}` }, `Tu balance en esta mano: ${net > 0 ? '+' : ''}${net}`),
      parts,
      h('button', { class: 'btn primary', onClick: newHand }, 'Siguiente mano'),
    );
  }

  function historyLog() {
    return h('details', { class: 'history' },
      h('summary', {}, 'Historial de la mano'),
      h('ol', {}, game.log.map((e) => h('li', { class: `ev-${e.type}` }, e.text))),
    );
  }

  function render() {
    if (!game) return renderSetup();
    const opps = game.players.filter((p) => !p.isHuman);
    const cols = opps.length <= 3 ? opps.length : opps.length === 4 ? 2 : 3;
    let controls;
    if (game.phase === 'hand-over') controls = summary();
    else if (game.phase === 'betting' && game.current.isHuman) controls = humanControls();
    else controls = waitingControls();

    root.replaceChildren(...[
      h('div', { class: 'table-info' },
        h('span', {}, `Mano ${game.handNumber} · Ciegas ${game.sb}/${game.bb}`),
        h('button', { class: 'link-btn', onClick: () => { game = null; renderSetup(); } }, 'Cambiar mesa'),
      ),
      h('div', { class: 'opps', style: { gridTemplateColumns: `repeat(${cols}, 1fr)` } }, opps.map(oppSeat)),
      felt(),
      mySeat(),
      narrator(),
      controls,
      historyLog(),
    ].filter(Boolean));
  }

  renderSetup();
  return root;
}
