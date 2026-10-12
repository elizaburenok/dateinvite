/** The inline pink card is the default; legacy entrances remain available by URL. */
export type Entry = 'card' | 'pile' | 'envelope';

export function entryFromLocation(): Entry {
  const entry = new URLSearchParams(window.location.search).get('entry');
  return entry === 'envelope' || entry === 'pile' ? entry : 'card';
}
