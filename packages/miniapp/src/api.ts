import type {
  CreateEnvelopeResponse,
  EnvelopeSummary,
  PlaceFilters,
  PlacesResponse,
  PlaceWithCandidates,
  UpdatePlaceRequest,
} from '@invite/shared';
import { initData } from './telegram.js';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      // Личность хоста — только initData, подписанная Telegram (§3).
      authorization: `tma ${initData()}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body as { error?: string; message?: string } | null;
    throw new ApiError(error?.message ?? 'Не получилось', error?.error ?? 'unknown');
  }
  return body as T;
}

function query(filters: PlaceFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export const api = {
  places: (filters: PlaceFilters = {}) => request<PlacesResponse>(`/api/places${query(filters)}`),

  place: (id: string) => request<PlaceWithCandidates>(`/api/places/${id}`),

  updatePlace: (id: string, patch: UpdatePlaceRequest) =>
    request<PlaceWithCandidates>(`/api/places/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deletePlace: (id: string) => request<void>(`/api/places/${id}`, { method: 'DELETE' }),

  createEnvelope: (placeIds: string[], hostNote: string | null) =>
    request<CreateEnvelopeResponse>('/api/envelopes', {
      method: 'POST',
      body: JSON.stringify({ place_ids: placeIds, host_note: hostNote }),
    }),

  envelopes: () => request<{ envelopes: EnvelopeSummary[] }>('/api/envelopes'),
};
