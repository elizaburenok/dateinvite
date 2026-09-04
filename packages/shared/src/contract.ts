import { z } from 'zod';
import { ENVELOPE_MAX_PLACES, ENVELOPE_MIN_PLACES, PLACE_MAX_PHOTOS } from './constants.js';

/**
 * Контракт данных между бэкендом, Mini App и гость-страницей.
 * Соответствует §4 (модель) и §8 (API) ТЗ. Единственный источник правды:
 * ни один из пакетов не описывает эти формы у себя заново.
 */

export {
  ENVELOPE_MIN_PLACES,
  ENVELOPE_MAX_PLACES,
  INIT_DATA_MAX_AGE_SEC,
  PLACE_MAX_PHOTOS,
} from './constants.js';

export const placeSourceSchema = z.enum(['telegram', 'yandex', 'manual']);
export type PlaceSource = z.infer<typeof placeSourceSchema>;

export const enrichmentStatusSchema = z.enum(['resolved', 'needs_confirmation', 'failed']);
export type EnrichmentStatus = z.infer<typeof enrichmentStatusSchema>;

export const envelopeStatusSchema = z.enum(['draft', 'sent', 'opened', 'answered', 'expired']);
export type EnvelopeStatus = z.infer<typeof envelopeStatusSchema>;

/** Снапшот места в библиотеке хоста — §4. */
export const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  district: z.string().nullable(),
  category: z.string().nullable(),
  /** Все фото места. Порядок в массиве — порядок показа. */
  photos: z.array(z.string()),
  /** Обложка = photos[0]. Отдельное поле, чтобы списки и тумбы не разбирали массив. */
  photo_url: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  maps_url: z.string().nullable(),
  rating: z.number().nullable(),
  hours: z.string().nullable(),
  note: z.string().nullable(),
  tags: z.array(z.string()),
  source: placeSourceSchema,
  enrichment_status: enrichmentStatusSchema,
  created_at: z.string(),
});
export type Place = z.infer<typeof placeSchema>;

/**
 * Кандидат для нечёткого распознавания — §3, §7.
 * Пока хост не подтвердил один из них, место живёт как needs_confirmation.
 */
export const placeCandidateSchema = z.object({
  id: z.string(),
  place_id: z.string(),
  name: z.string(),
  address: z.string(),
  district: z.string().nullable(),
  category: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  maps_url: z.string().nullable(),
});
export type PlaceCandidate = z.infer<typeof placeCandidateSchema>;

export const placeWithCandidatesSchema = placeSchema.extend({
  candidates: z.array(placeCandidateSchema),
});
export type PlaceWithCandidates = z.infer<typeof placeWithCandidatesSchema>;

/* ------------------------------------------------------------------ */
/* Host API — §8, авторизация через Telegram initData                  */
/* ------------------------------------------------------------------ */

export const placeFiltersSchema = z.object({
  district: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  status: enrichmentStatusSchema.optional(),
  q: z.string().optional(),
});
export type PlaceFilters = z.infer<typeof placeFiltersSchema>;

/** Фасеты для библиотеки — считаются по всей библиотеке, не по текущей выборке. */
export const libraryFacetsSchema = z.object({
  districts: z.array(z.string()),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  needs_confirmation_count: z.number(),
});
export type LibraryFacets = z.infer<typeof libraryFacetsSchema>;

export const placesResponseSchema = z.object({
  places: z.array(placeWithCandidatesSchema),
  facets: libraryFacetsSchema,
});
export type PlacesResponse = z.infer<typeof placesResponseSchema>;

export const updatePlaceSchema = z
  .object({
    note: z.string().max(500).nullable().optional(),
    photos: z.array(z.string().min(1).max(500)).max(PLACE_MAX_PHOTOS).optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    /** Подтверждение кандидата: enrichment_status → resolved (§8). */
    confirm_candidate_id: z.string().optional(),
    name: z.string().min(1).max(200).optional(),
    address: z.string().max(300).optional(),
    district: z.string().max(120).nullable().optional(),
    category: z.string().max(120).nullable().optional(),
  })
  .strict();
export type UpdatePlaceRequest = z.infer<typeof updatePlaceSchema>;

export const createPlaceSchema = z
  .object({
    name: z.string().min(1).max(200),
    address: z.string().max(300).default(''),
    district: z.string().max(120).nullable().default(null),
    category: z.string().max(120).nullable().default(null),
    note: z.string().max(500).nullable().default(null),
    tags: z.array(z.string().min(1).max(40)).max(20).default([]),
    lat: z.number().nullable().default(null),
    lng: z.number().nullable().default(null),
    maps_url: z.string().url().nullable().default(null),
    photos: z.array(z.string().min(1).max(500)).max(PLACE_MAX_PHOTOS).default([]),
  })
  .strict();
export type CreatePlaceRequest = z.infer<typeof createPlaceSchema>;

export const createEnvelopeSchema = z
  .object({
    place_ids: z
      .array(z.string())
      .min(ENVELOPE_MIN_PLACES, `Нужно минимум ${ENVELOPE_MIN_PLACES} места`)
      .max(ENVELOPE_MAX_PLACES, `Не больше ${ENVELOPE_MAX_PLACES} мест`),
    host_note: z.string().max(500).nullable().default(null),
  })
  .strict();
export type CreateEnvelopeRequest = z.infer<typeof createEnvelopeSchema>;

export const createEnvelopeResponseSchema = z.object({
  token: z.string(),
  url: z.string(),
});
export type CreateEnvelopeResponse = z.infer<typeof createEnvelopeResponseSchema>;

/** Строка списка «Мои конверты» — §10.4. */
export const envelopeSummarySchema = z.object({
  id: z.string(),
  token: z.string(),
  url: z.string(),
  host_note: z.string().nullable(),
  status: envelopeStatusSchema,
  created_at: z.string(),
  sent_at: z.string().nullable(),
  opened_at: z.string().nullable(),
  answered_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  places: z.array(placeSchema),
  answer: z
    .object({
      chosen_place_id: z.string(),
      chosen_place_name: z.string(),
      guest_message: z.string().nullable(),
      answered_at: z.string(),
    })
    .nullable(),
});
export type EnvelopeSummary = z.infer<typeof envelopeSummarySchema>;

/* ------------------------------------------------------------------ */
/* Guest API — §8, публично по токену, без авторизации                 */
/* ------------------------------------------------------------------ */

/** Место глазами гостя: только то, что нужно нарисовать карточку. */
export const guestPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  /* Адрес нужен самой карточке: на ней он стоит второй строкой под названием.
     Район остаётся отдельно — он подпись покрупнее, для корешка в стопке. */
  address: z.string(),
  district: z.string().nullable(),
  category: z.string().nullable(),
  photos: z.array(z.string()),
  photo_url: z.string().nullable(),
  note: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  maps_url: z.string().nullable(),
  rating: z.number().nullable(),
});
export type GuestPlace = z.infer<typeof guestPlaceSchema>;

export const inviteResponseSchema = z.object({
  token: z.string(),
  status: envelopeStatusSchema,
  host_note: z.string().nullable(),
  expires_at: z.string().nullable(),
  places: z.array(guestPlaceSchema),
  /** Заполнено только когда конверт уже отвечен — чтобы гость увидел свой выбор. */
  answer: z
    .object({
      chosen_place_id: z.string(),
      message: z.string().nullable(),
      answered_at: z.string(),
    })
    .nullable(),
});
export type InviteResponse = z.infer<typeof inviteResponseSchema>;

export const answerRequestSchema = z
  .object({
    chosen_place_id: z.string(),
    message: z.string().max(500).nullable().default(null),
  })
  .strict();
export type AnswerRequest = z.infer<typeof answerRequestSchema>;

export const answerResponseSchema = z.object({
  chosen_place_id: z.string(),
  message: z.string().nullable(),
  answered_at: z.string(),
});
export type AnswerResponse = z.infer<typeof answerResponseSchema>;

export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
