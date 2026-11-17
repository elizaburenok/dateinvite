import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnswerError, fetchInvite, sendAnswer, tokenFromLocation } from './api.js';

afterEach(() => vi.unstubAllGlobals());

describe('ссылки приглашений', () => {
  it('читает токен и безопасно обрабатывает повреждённую ссылку', () => {
    expect(tokenFromLocation('/i/hello%20world')).toBe('hello world');
    expect(tokenFromLocation('/i/%E0%A4%A')).toBeNull();
    expect(tokenFromLocation('/i/')).toBeNull();
    expect(tokenFromLocation('/i/index.html')).toBeNull();
  });
});

describe('загрузка приглашения', () => {
  it('показывает отсутствие приглашения и ошибки сети', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 })).mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetch);
    expect(await fetchInvite('missing')).toEqual({ kind: 'not_found' });
    expect(await fetchInvite('offline')).toEqual({ kind: 'error', message: 'No internet connection' });
  });

  it('передаёт данные без потери русских названий и заметок', async () => {
    const invite = { token: 'test', places: [{ name: 'Кооператив Чёрный', note: 'До встречи' }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(invite))));
    expect(await fetchInvite('test')).toEqual({ kind: 'ready', invite });
  });

  it('переживает не-JSON ответ прокси', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })));
    expect(await fetchInvite('test')).toEqual({ kind: 'error', message: 'Something went wrong' });
  });
});

describe('ответ гостя', () => {
  it('отправляет выбранное место и русскую заметку, экранируя токен', async () => {
    const answer = { chosen_place_id: 'place-1', message: 'Встретимся в семь', answered_at: '2026-10-26' };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(answer)));
    vi.stubGlobal('fetch', fetch);
    expect(await sendAnswer('token/part', answer.chosen_place_id, answer.message)).toEqual(answer);
    expect(fetch).toHaveBeenCalledWith('/api/invite/token%2Fpart/answer', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ chosen_place_id: 'place-1', message: answer.message }),
    }));
  });

  it('возвращает ошибку повторного ответа для отображения гостю', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Ответ уже отправлен' }), { status: 409 })));
    await expect(sendAnswer('test', 'place-1', null)).rejects.toThrow(new AnswerError('Ответ уже отправлен'));
  });
});
