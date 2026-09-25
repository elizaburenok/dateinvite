import { useEffect, useState } from 'react';
import { ENVELOPE_MAX_PLACES, ENVELOPE_MIN_PLACES } from '@invite/shared/constants';
import type { PlaceWithCandidates } from '@invite/shared';
import { api, ApiError } from '../api.js';
import { haptic } from '../telegram.js';

interface ComposeProps {
  places: PlaceWithCandidates[];
  selection: string[];
  onDone(): void;
  onCancel(): void;
}

/**
 * Панель сборки конверта (§10.3). Живёт поверх библиотеки, а не отдельным экраном:
 * выбирать места удобнее там, где они лежат.
 */
export function Compose({ places, selection, onDone, onCancel }: ComposeProps) {
  const [hostNote, setHostNote] = useState('');
  // Заметки к местам этого конверта по id места. Правятся здесь и не трогают
  // библиотеку — в place.note они не пишутся, снимок делает бэкенд при сборке.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const enough = selection.length >= ENVELOPE_MIN_PLACES;
  const tooMany = selection.length > ENVELOPE_MAX_PLACES;
  const chosen = selection
    .map((id) => places.find((place) => place.id === id))
    .filter((place): place is PlaceWithCandidates => Boolean(place));

  // Держим карту заметок ровно по текущему выбору: новое место въезжает со своей
  // заметкой из библиотеки как черновиком (её можно стереть или переписать),
  // снятое — выпадает, уже введённое для оставшихся мест сохраняется.
  useEffect(() => {
    setNotes((prev) => {
      const next: Record<string, string> = {};
      for (const id of selection) {
        const place = places.find((item) => item.id === id);
        if (!place) continue;
        // prev[id] пустой строкой (стёрли заметку) сохраняется — '' не заменится
        // черновиком; undefined (место только въехало) берёт заметку из библиотеки.
        next[id] = prev[id] ?? place.note ?? '';
      }
      return next;
    });
  }, [selection, places]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      // Пустое поле — «в этом конверте без заметки» (null). Триммингом занимается
      // и бэкенд, но не шлём лишних пробелов по сети.
      const placeNotes: Record<string, string | null> = {};
      for (const id of selection) {
        placeNotes[id] = notes[id]?.trim() ? notes[id].trim() : null;
      }
      const result = await api.createEnvelope(selection, hostNote.trim() || null, placeNotes);
      setLink(result.url);
      haptic('success');
    } catch (err) {
      haptic('error');
      setError(err instanceof ApiError ? err.message : 'Не получилось собрать конверт');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      haptic('success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер может быть недоступен — ссылка всё равно видна и её можно выделить.
      setCopied(false);
    }
  }

  if (link) {
    return (
      <div className="compose compose--done">
        <p className="compose__title">Конверт готов</p>
        <p className="compose__lead">Отправьте эту ссылку одному человеку.</p>
        <p className="compose__link">{link}</p>
        <div className="compose__actions">
          <button type="button" className="btn btn--ghost" onClick={onDone}>
            Готово
          </button>
          <button type="button" className="btn btn--primary" onClick={copy}>
            {copied ? 'Скопировано' : 'Скопировать'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="compose">
      <div className="compose__head">
        <p className="compose__title">
          Конверт: {selection.length} из {ENVELOPE_MAX_PLACES}
        </p>
        <button type="button" className="compose__cancel" onClick={onCancel}>
          Отмена
        </button>
      </div>

      <p className="compose__lead">
        {tooMany
          ? `Уберите лишнее: больше ${ENVELOPE_MAX_PLACES} мест в конверт не помещается.`
          : enough
            ? chosen.map((place) => place.name).join(' · ')
            : `Отметьте ещё ${ENVELOPE_MIN_PLACES - selection.length}: меньше ${ENVELOPE_MIN_PLACES} мест — это уже не выбор.`}
      </p>

      <input
        className="field"
        placeholder="Подпись: «Выбирай, куда поедем в субботу»"
        maxLength={500}
        value={hostNote}
        onChange={(event) => setHostNote(event.target.value)}
      />

      {chosen.length > 0 && (
        <div className="compose__notes">
          <p className="compose__notes-title">Заметки к местам</p>
          <p className="hint">
            Гость увидит их выжимкой на карточке. Можно оставить любое место без заметки.
          </p>
          <ul className="compose__places">
            {chosen.map((place) => (
              <li key={place.id} className="compose__place">
                <span className="compose__place-name">{place.name}</span>
                <textarea
                  className="field field--area compose__place-note"
                  rows={2}
                  maxLength={500}
                  placeholder="Почему сюда — по желанию"
                  value={notes[place.id] ?? ''}
                  onChange={(event) =>
                    setNotes((prev) => ({ ...prev, [place.id]: event.target.value }))
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button
        type="button"
        className="btn btn--primary compose__submit"
        disabled={!enough || tooMany || busy}
        onClick={create}
      >
        {busy ? 'Собираем…' : 'Собрать конверт'}
      </button>
    </div>
  );
}
