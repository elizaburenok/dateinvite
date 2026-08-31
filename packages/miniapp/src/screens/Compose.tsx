import { useState } from 'react';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const enough = selection.length >= ENVELOPE_MIN_PLACES;
  const tooMany = selection.length > ENVELOPE_MAX_PLACES;
  const chosen = selection
    .map((id) => places.find((place) => place.id === id))
    .filter((place): place is PlaceWithCandidates => Boolean(place));

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.createEnvelope(selection, hostNote.trim() || null);
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
