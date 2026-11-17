import { defaults, invitation, places, VARIANTS } from './config.js';

const limit = (value, max) => String(value ?? '').trim().slice(0, max);

export function starterDraft() {
  return {
    to: 'Лиза', from: 'Эля',
    skin: defaults.skin, open: defaults.open, cards: defaults.cards,
    invitation: { title: invitation.title, lines: [...invitation.lines] },
    places: places.slice(0, 3).map(({ name, tag, note, motif }) => ({ name, tag, note, motif })),
  };
}

export function normalizeDraft(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.places) || !raw.invitation) return null;
  const list = raw.places.slice(0, 5).map((place, index) => ({
    id: `place-${index + 1}`,
    name: limit(place?.name, 60),
    tag: limit(place?.tag, 40),
    note: limit(place?.note, 180),
    motif: ['flower', 'bowl', 'heart', 'leaf', 'star'].includes(place?.motif) ? place.motif : 'heart',
  })).filter((place) => place.name);
  if (!list.length) return null;
  return {
    to: limit(raw.to, 50), from: limit(raw.from, 50),
    skin: VARIANTS.skin.includes(raw.skin) ? raw.skin : defaults.skin,
    open: VARIANTS.open.includes(raw.open) ? raw.open : defaults.open,
    cards: VARIANTS.cards.includes(raw.cards) ? raw.cards : defaults.cards,
    invitation: {
      kind: 'invitation', eyebrow: 'приглашение',
      title: limit(raw.invitation.title, 70) || invitation.title,
      lines: (Array.isArray(raw.invitation.lines) ? raw.invitation.lines : [])
        .slice(0, 2).map((line) => limit(line, 160)).filter(Boolean),
      hint: 'листай дальше →',
    },
    places: list,
  };
}

export function parseDraft(value) {
  if (!value || value.length > 8000) return null;
  try { return normalizeDraft(JSON.parse(value)); } catch { return null; }
}

export function draftId(draft) {
  const source = JSON.stringify(draft);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return `custom-${(hash >>> 0).toString(36)}`;
}
