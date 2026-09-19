import { pegasusBridge } from "./pegasus-bridge.js";

export const SCENARIOS = Object.freeze({
  [pegasusBridge.id]: pegasusBridge,
});

export const SCENARIO_LIST = Object.freeze([pegasusBridge]);

export function scenarioById(id) {
  return SCENARIOS[id] ?? null;
}
