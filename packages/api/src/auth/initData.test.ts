import { describe, expect, it } from 'vitest';
import { buildDataCheckString, signInitData, validateInitData } from './initData.js';

const BOT_TOKEN = '123456:TEST-TOKEN-FOR-UNIT-TESTS';
const NOW = 1_800_000_000;

function makeInitData(overrides: Record<string, string> = {}, token = BOT_TOKEN): string {
  const params = new URLSearchParams({
    auth_date: String(NOW - 60),
    query_id: 'AAE_test',
    user: JSON.stringify({ id: 42, first_name: 'Элиза', username: 'eliza' }),
    ...overrides,
  });
  params.set('hash', signInitData(buildDataCheckString(params), token));
  return params.toString();
}

describe('validateInitData', () => {
  it('принимает подпись, сделанную настоящим токеном бота', () => {
    const result = validateInitData(makeInitData(), BOT_TOKEN, { nowSec: NOW });
    expect(result).toMatchObject({ ok: true, user: { id: 42, username: 'eliza' } });
  });

  it('отвергает подделанные данные: подменили user, не пересчитав hash', () => {
    const params = new URLSearchParams(makeInitData());
    params.set('user', JSON.stringify({ id: 999, first_name: 'Чужой' }));
    const result = validateInitData(params.toString(), BOT_TOKEN, { nowSec: NOW });
    expect(result).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('отвергает подпись чужим токеном', () => {
    const result = validateInitData(makeInitData({}, 'other:TOKEN'), BOT_TOKEN, { nowSec: NOW });
    expect(result).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('отвергает просроченную initData', () => {
    const initData = makeInitData({ auth_date: String(NOW - 25 * 60 * 60) });
    const result = validateInitData(initData, BOT_TOKEN, { nowSec: NOW });
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('не падает на мусоре и на пустой строке', () => {
    expect(validateInitData('', BOT_TOKEN, { nowSec: NOW })).toEqual({ ok: false, reason: 'malformed' });
    expect(validateInitData('%%%', BOT_TOKEN, { nowSec: NOW })).toEqual({ ok: false, reason: 'missing_hash' });
  });

  it('требует поле user', () => {
    const params = new URLSearchParams({ auth_date: String(NOW - 10) });
    params.set('hash', signInitData(buildDataCheckString(params), BOT_TOKEN));
    expect(validateInitData(params.toString(), BOT_TOKEN, { nowSec: NOW })).toEqual({
      ok: false,
      reason: 'missing_user',
    });
  });

  it('включает signature в data-check-string, а hash — исключает', () => {
    const params = new URLSearchParams({ b: '2', signature: 'sig', a: '1', hash: 'zz' });
    expect(buildDataCheckString(params)).toBe('a=1\nb=2\nsignature=sig');
  });
});
