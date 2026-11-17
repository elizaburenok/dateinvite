import type { PlaceWithCandidates } from '@invite/shared';
import { ENVELOPE_MAX_PLACES } from '@invite/shared/constants';

export interface FeedFilters {
  q?: string;
  district?: string;
  category?: string;
  tag?: string;
  pending?: boolean;
}

export function filterPlaces(places: PlaceWithCandidates[], filters: FeedFilters): PlaceWithCandidates[] {
  const query = filters.q?.trim().toLowerCase();
  return places.filter((place) =>
    (!query || place.name.toLowerCase().includes(query)) &&
    (!filters.district || place.district === filters.district) &&
    (!filters.category || place.category === filters.category) &&
    (!filters.tag || place.tags.some((tag) => tag.toLowerCase() === filters.tag!.toLowerCase())) &&
    (!filters.pending || place.enrichment_status === 'needs_confirmation'),
  );
}

export function togglePlace(selection: string[], place: PlaceWithCandidates): string[] {
  if (selection.includes(place.id)) return selection.filter((id) => id !== place.id);
  if (selection.length >= ENVELOPE_MAX_PLACES || place.enrichment_status !== 'resolved') return selection;
  return [...selection, place.id];
}

/** An absent draft inherits the library note; an empty draft deliberately clears it. */
export function envelopeNotes(places: PlaceWithCandidates[], drafts: Record<string, string>): Record<string, string | null> {
  return Object.fromEntries(places.map((place) => [place.id, (drafts[place.id] ?? place.note)?.trim() || null]));
}
