function sectionCard(family, section, index, orders, extra = {}) {
  const sectionLabel = { left: "Left", center: "Center", right: "Right" }[section];
  const names = {
    assault: "Assault",
    probe: "Probe",
    attack: "Attack",
    recon: "Scout",
  };
  return Object.freeze({
    id: `${family}-${section}-${index}`,
    kind: "section",
    family,
    section,
    orders,
    name: `${names[family]} ${sectionLabel}`,
    text: extra.text,
    ...extra.fields,
  });
}

function copies(count, factory) {
  return Array.from({ length: count }, (_, index) => factory(index + 1));
}

const SECTION_CARDS = [
  ...["left", "center", "right"].flatMap((section) => [
    ...copies(2, (n) => sectionCard("assault", section, n, "all", {
      text: `Order every unit in the ${section} section.`,
    })),
    ...copies(section === "center" ? 5 : 4, (n) => sectionCard("probe", section, n, 2, {
      text: `Order up to 2 units in the ${section} section.`,
    })),
    ...copies(section === "center" ? 4 : 3, (n) => sectionCard("attack", section, n, 3, {
      text: `Order up to 3 units in the ${section} section.`,
    })),
    ...copies(2, (n) => sectionCard("recon", section, n, 1, {
      text: `Order 1 unit in the ${section} section. Draw 2 command cards and keep 1.`,
      fields: { reconDraw: true },
    })),
  ]),
  Object.freeze({
    id: "full-front-1",
    kind: "section",
    family: "full-front",
    name: "Full Front",
    text: "Order up to 2 units in each section.",
    perSection: 2,
  }),
  Object.freeze({
    id: "pincer-1",
    kind: "section",
    family: "pincer",
    name: "Pincer",
    text: "Order 1 unit on the left and 1 unit on the right.",
    left: 1,
    right: 1,
  }),
  ...copies(3, (n) => Object.freeze({
    id: `three-scout-${n}`,
    kind: "section",
    family: "three-scout",
    name: "Three-Section Scout",
    text: "Order 1 unit in each section.",
    perSection: 1,
  })),
];

const TACTIC_CARDS = [
  Object.freeze({
    id: "air-strike-1",
    kind: "tactic",
    family: "air-strike",
    name: "Air Strike",
    text: "Strike up to 4 contiguous enemy hexes. The air-dominant side rolls 2 dice per hex, the other 1. Symbols, bursts, and signals hit. Pushes cannot be ignored.",
  }),
  Object.freeze({
    id: "ambush-1",
    kind: "tactic",
    family: "ambush",
    name: "Ambush",
    text: "Play when an enemy close-assaults you. Your unit battles first. The attacker continues only if it remains in place.",
    reaction: true,
  }),
  ...copies(2, (n) => Object.freeze({
    id: `armor-push-${n}`,
    kind: "tactic",
    family: "armor-push",
    name: "Armor Push",
    text: "Order up to 4 armor. Close assaults roll +1 die. If you have no armor, order any 1 unit.",
    order: { type: "armor", max: 4, closeAssaultBonus: 1, fallbackAny: 1 },
  })),
  Object.freeze({
    id: "gun-line-1",
    kind: "tactic",
    family: "gun-line",
    name: "Gun Line",
    text: "Order all your artillery. Each may move up to 3 hexes without battling, or stay and fire twice. If you have no artillery, order any 1 unit.",
  }),
  Object.freeze({
    id: "barrage-1",
    kind: "tactic",
    family: "barrage",
    name: "Barrage",
    text: "4 dice against any 1 enemy unit. Ignore range, line of sight, and terrain. Hits on that unit's symbol or a burst. Pushes cannot be ignored.",
  }),
  Object.freeze({
    id: "deep-patrol-1",
    kind: "tactic",
    family: "deep-patrol",
    name: "Deep Patrol",
    text: "Order 1 infantry. It may move 3, battle, then move 3 again, ignoring terrain movement limits. If you have no infantry, order any 1 unit.",
  }),
  Object.freeze({
    id: "close-assault-1",
    kind: "tactic",
    family: "close-assault",
    name: "Close Assault",
    text: "Order every infantry or armor already adjacent to an enemy. They may not move. Each battles with +1 die.",
  }),
  ...copies(2, (n) => Object.freeze({
    id: `counter-order-${n}`,
    kind: "tactic",
    family: "counter-order",
    name: "Counter Order",
    text: "Replay the command card your opponent just played. Left and right section cards swap flanks for you.",
  })),
  Object.freeze({
    id: "dig-in-1",
    kind: "tactic",
    family: "dig-in",
    name: "Dig In",
    text: "Place sandbags on up to 4 of your infantry. If you have no infantry, order any 1 unit.",
  }),
  ...copies(2, (n) => Object.freeze({
    id: `headquarters-${n}`,
    kind: "tactic",
    family: "headquarters",
    name: "Headquarters",
    text: "Order any 4 units anywhere.",
    order: { max: 4, anywhere: true },
  })),
  Object.freeze({
    id: "firefight-1",
    kind: "tactic",
    family: "firefight",
    name: "Firefight",
    text: "Order up to 4 units not adjacent to an enemy. They may not move. Each battles with +1 die.",
  }),
  ...copies(2, (n) => Object.freeze({
    id: `infantry-push-${n}`,
    kind: "tactic",
    family: "infantry-push",
    name: "Infantry Push",
    text: "Order all infantry in one section. Each may move 3 without battling, or 2 and still battle. If you have no infantry, order any 1 unit.",
  })),
  Object.freeze({
    id: "repair-party-1",
    kind: "tactic",
    family: "repair-party",
    name: "Repair Party",
    text: "Order 1 damaged unit. Roll 1 die per card in your hand, including this one. Matching symbols and signals restore figures. If any figure returns, the unit may move and battle.",
  }),
  ...copies(2, (n) => Object.freeze({
    id: `move-out-${n}`,
    kind: "tactic",
    family: "move-out",
    name: "Move Out",
    text: "Order up to 4 infantry under the normal rules. If you have no infantry, order any 1 unit.",
    order: { type: "infantry", max: 4, fallbackAny: 1 },
  })),
  Object.freeze({
    id: "finest-hour-1",
    kind: "tactic",
    family: "finest-hour",
    name: "Finest Hour",
    text: "Roll 1 die per card in your hand, including this one. Each unit symbol orders a matching unit; each signal orders any unit. Ordered units battle with +1 die. Then shuffle the discard into the deck.",
  }),
];

export const CARD_DECK = Object.freeze([...SECTION_CARDS, ...TACTIC_CARDS]);

export const CARDS_BY_ID = Object.freeze(Object.fromEntries(
  CARD_DECK.map((card) => [card.id, card]),
));

export function cardById(id) {
  return CARDS_BY_ID[id] ?? null;
}

export function makeDeck() {
  return CARD_DECK.map((card) => card.id);
}

export function oppositeSection(section) {
  if (section === "left") return "right";
  if (section === "right") return "left";
  return section;
}
