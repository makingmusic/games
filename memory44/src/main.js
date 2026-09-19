import { hexName, sectionsAt, terrainAt, tileKey } from "./board.js";
import { cardById } from "./content/cards.js";
import { FACE_FROM_ROLL } from "./content/dice.js";
import { UNIT_TYPES } from "./content/units.js";
import {
  COLS,
  ROWS,
  SIDE_LABELS,
  applyAction,
  createGame,
  legalTargets,
  reachableTiles,
  unitAt,
  unitById,
} from "./game.js";
import { mulberry32 } from "./rng.js";

const elements = {
  board: document.querySelector("#board"),
  boardScroller: document.querySelector("#board-scroller"),
  confirmOrders: document.querySelector("#confirm-orders"),
  copyButton: document.querySelector("#copy-button"),
  createButton: document.querySelector("#create-button"),
  diceDismiss: document.querySelector("#dice-dismiss"),
  diceFaces: document.querySelector("#dice-faces"),
  diceOverlay: document.querySelector("#dice-overlay"),
  endBattles: document.querySelector("#end-battles"),
  endMoves: document.querySelector("#end-moves"),
  hand: document.querySelector("#hand"),
  hint: document.querySelector("#hint"),
  joinForm: document.querySelector("#join-form"),
  leaveButton: document.querySelector("#leave-button"),
  lobby: document.querySelector("#lobby"),
  lobbyMessage: document.querySelector("#lobby-message"),
  localButton: document.querySelector("#local-button"),
  medalGoal: document.querySelector("#medal-goal"),
  modeBadge: document.querySelector("#mode-badge"),
  ochreMedals: document.querySelector("#ochre-medals"),
  passGate: document.querySelector("#pass-gate"),
  passHeading: document.querySelector("#pass-heading"),
  phaseLabel: document.querySelector("#phase-label"),
  resolveSpecial: document.querySelector("#resolve-special"),
  revealButton: document.querySelector("#reveal-button"),
  roomCode: document.querySelector("#room-code"),
  roomCodeDisplay: document.querySelector("#room-code-display"),
  roomPanel: document.querySelector("#room-panel"),
  scenarioSelect: document.querySelector("#scenario-select"),
  scenarioTitle: document.querySelector("#scenario-title"),
  seatStatus: document.querySelector("#seat-status"),
  skipGround: document.querySelector("#skip-ground"),
  statusHeading: document.querySelector("#status-heading"),
  table: document.querySelector("#table"),
  takeGround: document.querySelector("#take-ground"),
  tealMedals: document.querySelector("#teal-medals"),
};

let state = createGame("pegasus-bridge", mulberry32(1));
let selectedUnitId = null;
let pendingOrders = [];
let lastRolls = [];
let connection = { mode: "preview", code: null, side: null, token: null, events: null };

function controllingSide() {
  if (connection.mode === "local") return state.activeSide;
  return connection.side;
}

function myTurn() {
  if (connection.mode === "preview") return false;
  if (connection.mode === "online" && connection.connectedSides?.length !== 2) return false;
  return controllingSide() === state.activeSide;
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "The room server did not accept that request.");
  return data;
}

function randomDie() {
  return 1 + Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * 6);
}

function reshuffleOrderFrom(current) {
  const pile = [...current.deck, ...current.discard];
  for (let i = pile.length - 1; i > 0; i -= 1) {
    const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * (i + 1));
    [pile[i], pile[j]] = [pile[j], pile[i]];
  }
  return pile;
}

function showDice(rolls) {
  lastRolls = rolls;
  if (!rolls?.length) return;
  elements.diceFaces.replaceChildren(...rolls.map((value) => {
    const die = document.createElement("span");
    die.className = "die";
    die.textContent = FACE_FROM_ROLL[value];
    return die;
  }));
  elements.diceOverlay.hidden = false;
}

function applyLocal(action) {
  let attempt = { ...action };
  for (let n = 0; n < 4; n += 1) {
    try {
      const next = applyAction(state, attempt);
      if (attempt.rolls) showDice(attempt.rolls);
      state = next;
      selectedUnitId = null;
      return;
    } catch (error) {
      if (error.code === "ROLLS_REQUIRED") {
        attempt = { ...attempt, rolls: Array.from({ length: error.rollsNeeded }, randomDie) };
        continue;
      }
      if (error.code === "RESHUFFLE_REQUIRED") {
        attempt = { ...attempt, reshuffleOrder: reshuffleOrderFrom(state) };
        continue;
      }
      throw error;
    }
  }
}

async function sendAction(action) {
  try {
    if (connection.mode === "local") {
      const previousSide = state.activeSide;
      applyLocal(action);
      if (state.activeSide !== previousSide && state.phase === "play-card") {
        elements.passHeading.textContent = `${SIDE_LABELS[state.activeSide]} — tap to reveal your hand.`;
        elements.passGate.hidden = false;
      }
      render();
      return;
    }
    if (connection.mode !== "online") return;
    const response = await fetch(`api/rooms/${encodeURIComponent(connection.code)}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: connection.token, action }),
    });
    const payload = await readResponse(response);
    state = payload.state;
    connection.connectedSides = payload.connectedSides;
    selectedUnitId = null;
    render();
  } catch (error) {
    elements.hint.textContent = error.message;
  }
}

function phaseCopy() {
  switch (state.phase) {
    case "play-card": return "Play a command card";
    case "select-orders": return "Select units to order";
    case "move": return "Move ordered units";
    case "battle": return "Battle with ordered units";
    case "overrun": return "Armor overrun";
    case "ground": return "Take ground?";
    case "draw-keep": return "Keep one of the two cards";
    case "air-strike": return "Choose enemy hexes for Air Strike";
    case "barrage": return "Choose an enemy for Barrage";
    case "dig-in": return "Choose infantry to entrench";
    case "repair": return "Choose a damaged unit";
    case "finest-hour": return "Finest Hour";
    case "finished": return "Match complete";
    default: return state.phase;
  }
}

function hintForPhase() {
  if (!myTurn() && state.phase !== "finished") {
    return `Waiting for ${SIDE_LABELS[state.activeSide]}.`;
  }
  if (state.phase === "select-orders") {
    return pendingOrders.length
      ? `${pendingOrders.length} unit(s) marked. Confirm orders.`
      : "Tap units this card can order, then confirm.";
  }
  if (state.phase === "move") return "Tap an ordered unit, then a highlighted hex. When finished, tap Done moving.";
  if (state.phase === "battle") return "Tap an ordered unit, then a marked enemy. When finished, tap End battles.";
  if (state.phase === "ground") return "Advance into the vacated hex, or hold.";
  if (state.phase === "draw-keep") return "Tap the command card you want to keep.";
  if (state.phase === "finished") {
    return `${SIDE_LABELS[state.winner]} wins with ${state.medals[state.winner]} medals.`;
  }
  return state.log[0] ?? "Play a command card.";
}

function renderBoard() {
  const selected = selectedUnitId ? unitById(state, selectedUnitId) : null;
  const moves = selected && state.phase === "move" ? reachableTiles(state, selected.id) : [];
  const targets = selected && (state.phase === "battle" || state.phase === "overrun")
    ? legalTargets(state, selected.id)
    : [];
  const moveSet = new Set(moves.map((hex) => tileKey(hex.q, hex.r)));
  const targetSet = new Set(targets.map((unit) => unit.id));
  const objectiveSet = new Set(state.objectives.map((item) => tileKey(item.q, item.r)));

  const tiles = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let q = 0; q < COLS; q += 1) {
      const terrain = terrainAt(state, q, r);
      const unit = unitAt(state, q, r);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tile terrain-${terrain}`;
      button.style.setProperty("--q", q);
      button.style.setProperty("--r", r);
      button.style.setProperty("--odd", r % 2);
      button.dataset.q = q;
      button.dataset.r = r;
      const section = sectionsAt(q);
      if (section.includes("left") && !section.includes("center")) button.classList.add("section-left");
      if (section.includes("right") && !section.includes("center")) button.classList.add("section-right");
      if (moveSet.has(tileKey(q, r))) button.classList.add("reachable");
      if (unit && targetSet.has(unit.id)) button.classList.add("target");
      if (unit?.id === selectedUnitId || pendingOrders.includes(unit?.id)) button.classList.add("selected");
      if (objectiveSet.has(tileKey(q, r))) button.classList.add("objective");
      button.setAttribute("aria-label", `${hexName(q, r)} ${terrain}${unit ? `, ${unit.side} ${unit.type}` : ""}`);

      if (unit) {
        const marker = document.createElement("span");
        const spent = (state.phase === "move" && unit.moved) || (state.phase === "battle" && unit.battled);
        marker.className = `unit ${unit.side}${spent ? " spent" : ""}`;
        marker.textContent = UNIT_TYPES[unit.type].mark;
        const figures = document.createElement("span");
        figures.className = "figures";
        figures.textContent = unit.figures;
        marker.append(figures);
        button.append(marker);
      }
      tiles.push(button);
    }
  }
  elements.board.replaceChildren(...tiles);
}

function renderHand() {
  const side = controllingSide();
  if (!side || (connection.mode === "local" && !elements.passGate.hidden)) {
    elements.hand.replaceChildren();
    return;
  }
  const cards = state.hands[side] ?? [];
  const keepable = state.phase === "draw-keep" && state.activeSide === side;
  elements.hand.replaceChildren(...cards.map((cardId) => {
    if (cardId === "hidden") {
      const back = document.createElement("button");
      back.type = "button";
      back.className = "card";
      back.disabled = true;
      back.innerHTML = "<strong>Command</strong><small>Hidden</small>";
      return back;
    }
    const card = cardById(cardId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `card ${card.kind}`;
    button.dataset.cardId = cardId;
    const sectionMarks = card.section
      ? `<span class="sections"><i class="${card.section === "left" ? "on" : ""}"></i><i class="${card.section === "center" ? "on" : ""}"></i><i class="${card.section === "right" ? "on" : ""}"></i></span>`
      : "";
    button.innerHTML = `<span class="family">${card.kind}</span><strong>${card.name}</strong><small>${card.text}</small>${sectionMarks}`;
    if (keepable) button.classList.add("selected");
    return button;
  }));
}

function render() {
  elements.scenarioTitle.textContent = state.title ?? "Command-card battle";
  elements.ochreMedals.textContent = state.medals.ochre;
  elements.tealMedals.textContent = state.medals.teal;
  elements.medalGoal.textContent = state.medalGoal;
  elements.phaseLabel.textContent = phaseCopy();
  elements.statusHeading.textContent = state.phase === "finished"
    ? `${SIDE_LABELS[state.winner]} wins`
    : `${SIDE_LABELS[state.activeSide]} command`;
  elements.hint.textContent = hintForPhase();
  elements.seatStatus.textContent = connection.mode === "online"
    ? (connection.connectedSides?.length === 2
      ? `You command ${SIDE_LABELS[connection.side]}.`
      : `You command ${SIDE_LABELS[connection.side]}. Waiting for the other player…`)
    : connection.mode === "local" ? "Pass & play" : "";

  const turn = myTurn();
  elements.confirmOrders.hidden = !(turn && state.phase === "select-orders");
  elements.endMoves.hidden = !(turn && state.phase === "move");
  elements.endBattles.hidden = !(turn && state.phase === "battle");
  elements.takeGround.hidden = !(turn && state.phase === "ground");
  elements.skipGround.hidden = !(turn && state.phase === "ground");
  elements.resolveSpecial.hidden = !(turn && state.phase === "finest-hour");

  renderBoard();
  renderHand();
}

function enterMatch(mode, payload = null) {
  selectedUnitId = null;
  pendingOrders = [];
  elements.lobby.hidden = true;
  elements.table.hidden = false;
  elements.leaveButton.hidden = false;

  if (mode === "local") {
    connection = { mode: "local", code: null, side: null, token: null, events: null };
    state = createGame(elements.scenarioSelect.value);
    elements.modeBadge.textContent = "Pass & play";
    elements.roomPanel.hidden = true;
  } else {
    connection = {
      mode: "online",
      code: payload.code,
      side: payload.side,
      token: payload.token,
      connectedSides: payload.connectedSides,
      events: null,
    };
    state = payload.state;
    elements.modeBadge.textContent = `Online · ${SIDE_LABELS[payload.side]}`;
    elements.roomCodeDisplay.textContent = payload.code;
    elements.roomPanel.hidden = false;
    connectEvents();
  }
  render();
}

function connectEvents() {
  connection.events?.close();
  connection.events = new EventSource(
    `api/rooms/${encodeURIComponent(connection.code)}/events?token=${encodeURIComponent(connection.token)}`,
  );
  connection.events.addEventListener("state", (event) => {
    const payload = JSON.parse(event.data);
    state = payload.state;
    connection.connectedSides = payload.connectedSides;
    render();
  });
  connection.events.onerror = () => {
    elements.hint.textContent = "Room connection interrupted; trying to reconnect…";
  };
}

function handleTileClick(event) {
  const tile = event.target.closest(".tile");
  if (!tile || !myTurn()) return;
  const q = Number(tile.dataset.q);
  const r = Number(tile.dataset.r);
  const clicked = unitAt(state, q, r);

  if (state.phase === "select-orders" && clicked?.side === controllingSide()) {
    pendingOrders = pendingOrders.includes(clicked.id)
      ? pendingOrders.filter((id) => id !== clicked.id)
      : [...pendingOrders, clicked.id];
    render();
    return;
  }

  if (state.phase === "move") {
    const selected = selectedUnitId ? unitById(state, selectedUnitId) : null;
    if (selected && !clicked) {
      sendAction({ type: "move", unitId: selected.id, to: { q, r } });
      return;
    }
    if (clicked?.ordered && clicked.side === controllingSide()) {
      selectedUnitId = clicked.id;
      render();
    }
    return;
  }

  if (state.phase === "battle" || state.phase === "overrun") {
    const selected = selectedUnitId ? unitById(state, selectedUnitId) : null;
    if (selected && clicked && clicked.side !== controllingSide()) {
      sendAction({ type: "battle", unitId: selected.id, targetId: clicked.id });
      return;
    }
    if (clicked?.ordered && clicked.side === controllingSide()) {
      selectedUnitId = clicked.id;
      render();
    }
    return;
  }

  if (state.phase === "air-strike" && clicked && clicked.side !== controllingSide()) {
    sendAction({ type: "air-strike", hexes: [{ q, r }] });
  }
  if (state.phase === "barrage" && clicked && clicked.side !== controllingSide()) {
    sendAction({ type: "barrage", targetId: clicked.id });
  }
  if (state.phase === "repair" && clicked?.side === controllingSide()) {
    sendAction({ type: "repair", unitId: clicked.id });
  }
  if (state.phase === "dig-in" && clicked?.side === controllingSide()) {
    sendAction({ type: "dig-in", unitIds: [clicked.id] });
  }
}

function handleHandClick(event) {
  const button = event.target.closest("[data-card-id]");
  if (!button || !myTurn()) return;
  const cardId = button.dataset.cardId;
  if (state.phase === "play-card") {
    const card = cardById(cardId);
    const action = { type: "play-card", cardId };
    if (card.family === "infantry-push") action.section = "center";
    sendAction(action);
    return;
  }
  if (state.phase === "draw-keep") sendAction({ type: "draw-keep", keepId: cardId });
}

elements.board.addEventListener("click", handleTileClick);
elements.hand.addEventListener("click", handleHandClick);
elements.confirmOrders.addEventListener("click", () => {
  sendAction({ type: "select-orders", unitIds: pendingOrders });
  pendingOrders = [];
});
elements.endMoves.addEventListener("click", () => sendAction({ type: "end-moves" }));
elements.endBattles.addEventListener("click", () => sendAction({ type: "end-battles" }));
elements.takeGround.addEventListener("click", () => sendAction({ type: "take-ground" }));
elements.skipGround.addEventListener("click", () => sendAction({ type: "skip-ground" }));
elements.resolveSpecial.addEventListener("click", () => sendAction({ type: "finest-hour", assignments: {} }));
elements.diceDismiss.addEventListener("click", () => {
  elements.diceOverlay.hidden = true;
});
elements.revealButton.addEventListener("click", () => {
  elements.passGate.hidden = true;
  render();
});
elements.localButton.addEventListener("click", () => enterMatch("local"));

elements.createButton.addEventListener("click", async () => {
  elements.createButton.disabled = true;
  elements.lobbyMessage.textContent = "Creating room…";
  try {
    const payload = await readResponse(await fetch("api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: elements.scenarioSelect.value }),
    }));
    enterMatch("online", payload);
  } catch (error) {
    elements.lobbyMessage.textContent = `${error.message} Start the room server with npm run dev.`;
  } finally {
    elements.createButton.disabled = false;
  }
});

elements.joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = elements.roomCode.value.trim().toUpperCase();
  if (!code) {
    elements.lobbyMessage.textContent = "Enter the room code from the other player.";
    return;
  }
  try {
    const payload = await readResponse(await fetch(`api/rooms/${encodeURIComponent(code)}/join`, { method: "POST" }));
    enterMatch("online", payload);
  } catch (error) {
    elements.lobbyMessage.textContent = error.message;
  }
});

elements.copyButton.addEventListener("click", async () => {
  const invite = `${location.origin}${location.pathname}?room=${encodeURIComponent(connection.code)}`;
  try {
    await navigator.clipboard.writeText(invite);
    elements.copyButton.textContent = "Copied";
    setTimeout(() => { elements.copyButton.textContent = "Copy invite"; }, 1500);
  } catch {
    elements.hint.textContent = `Share room code ${connection.code}.`;
  }
});

elements.leaveButton.addEventListener("click", () => {
  connection.events?.close();
  connection = { mode: "preview", code: null, side: null, token: null, events: null };
  state = createGame("pegasus-bridge", mulberry32(1));
  elements.lobby.hidden = false;
  elements.table.hidden = true;
  elements.roomPanel.hidden = true;
  elements.leaveButton.hidden = true;
  elements.passGate.hidden = true;
  elements.modeBadge.textContent = "Preview";
});

elements.boardScroller.addEventListener("wheel", (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  const current = Number.parseFloat(elements.board.style.scale || "1");
  const next = Math.min(1.8, Math.max(0.7, current + (event.deltaY < 0 ? 0.08 : -0.08)));
  elements.board.style.scale = String(next);
}, { passive: false });

const sharedCode = new URLSearchParams(location.search).get("room");
if (sharedCode) elements.roomCode.value = sharedCode.toUpperCase();
