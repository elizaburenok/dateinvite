import type { PlaceRow } from '../domain/places.js';

/** Telegram HTML: экранируем всё, что пришло из внешних источников. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function placeCard(place: PlaceRow): string {
  const lines = [`<b>${escapeHtml(place.name)}</b>`];

  const meta = [place.category, place.district].filter(Boolean).join(' · ');
  if (meta) lines.push(escapeHtml(meta));
  if (place.address) lines.push(escapeHtml(place.address));
  if (place.note) lines.push(`\n<i>${escapeHtml(place.note)}</i>`);
  if (place.maps_url) lines.push(`\n<a href="${escapeHtml(place.maps_url)}">Открыть в Картах</a>`);

  return lines.join('\n');
}

export function candidateLine(index: number, name: string, address: string): string {
  const tail = address ? ` — ${address}` : '';
  return `${index + 1}. ${name}${tail}`;
}
