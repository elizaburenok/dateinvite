import type { AnswerResponse, InviteResponse } from '@invite/shared';

/**
 * Гость-страница знает о бэкенде ровно два адреса и ни одной детали его логики (§12).
 * Всё, что рисуется на экране, приходит из GET /api/invite/{token}.
 */

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; invite: InviteResponse }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? 'Что-то пошло не так';
  } catch {
    return 'Что-то пошло не так';
  }
}

export async function fetchInvite(token: string): Promise<LoadState> {
  try {
    const response = await fetch(`/api/invite/${encodeURIComponent(token)}`);
    if (response.status === 404) return { kind: 'not_found' };
    if (!response.ok) return { kind: 'error', message: await readError(response) };
    return { kind: 'ready', invite: (await response.json()) as InviteResponse };
  } catch {
    return { kind: 'error', message: 'Нет связи с интернетом' };
  }
}

export class AnswerError extends Error {}

export async function sendAnswer(
  token: string,
  chosenPlaceId: string,
  message: string | null,
): Promise<AnswerResponse> {
  const response = await fetch(`/api/invite/${encodeURIComponent(token)}/answer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chosen_place_id: chosenPlaceId, message }),
  });
  if (!response.ok) throw new AnswerError(await readError(response));
  return (await response.json()) as AnswerResponse;
}

/** Токен — последний сегмент пути /i/<token>. */
export function tokenFromLocation(pathname = window.location.pathname): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last || last === 'i' || last.includes('.')) return null;
  return decodeURIComponent(last);
}
