/**
 * Крошечная стейт-машина сцены.
 * sealed → opening → browsing → confirming → sending → done
 */

export const STATES = {
  SEALED: 'sealed',
  OPENING: 'opening',
  BROWSING: 'browsing',
  CONFIRMING: 'confirming',
  SENDING: 'sending',
  DONE: 'done',
};

const ALLOWED = {
  [STATES.SEALED]: [STATES.OPENING, STATES.DONE],
  [STATES.OPENING]: [STATES.BROWSING],
  [STATES.BROWSING]: [STATES.CONFIRMING],
  [STATES.CONFIRMING]: [STATES.BROWSING, STATES.SENDING],
  [STATES.SENDING]: [STATES.DONE],
  [STATES.DONE]: [],
};

export function createMachine(root, initial = STATES.SEALED) {
  let current = initial;
  const listeners = new Set();

  root.dataset.state = current;

  return {
    get current() {
      return current;
    },
    is(state) {
      return current === state;
    },
    can(next) {
      return ALLOWED[current]?.includes(next) ?? false;
    },
    /** @param {boolean} [force] — пропустить проверку переходов (для восстановления из localStorage) */
    go(next, force = false) {
      if (!force && !this.can(next)) return false;
      const prev = current;
      current = next;
      root.dataset.state = current;
      listeners.forEach((fn) => fn(current, prev));
      return true;
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
