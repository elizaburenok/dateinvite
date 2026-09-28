import { useRef, useState } from 'react';
import { ENVELOPE_MAX_PLACES, ENVELOPE_MIN_PLACES } from '@invite/shared/constants';
import type { PlaceWithCandidates } from '@invite/shared';
import { api, ApiError } from '../api.js';
import { haptic } from '../telegram.js';
import { PlaceThumb } from '../components/PlaceThumb.js';

/**
 * Сборка конверта (§10.3). Раньше это была одна фиксированная шторка, которая
 * навсегда накрывала низ библиотеки и показывала заметки ко всем местам разом.
 * Теперь сборка — это:
 *   1) {@link ComposeDrawer} — язычок снизу: свёрнут, лента мест видна целиком;
 *      тап/потяг вверх раскрывает подпись конверта и кнопку сборки;
 *   2) {@link PlaceNoteEditor} — заметка к ОДНОМУ месту в момент его выбора.
 */

/** Порог в пикселях, после которого потяг за язычок считаем осознанным жестом. */
const DRAG_THRESHOLD = 28;

/**
 * Язычок сборки. Свёрнутый — тонкая полоска со счётчиком, лента мест под ней
 * видна и скроллится. Тап или потяг вверх разворачивает шторку: подпись всего
 * конверта и сама сборка. Заметки к местам сюда не попадают — они пишутся
 * по одному в {@link PlaceNoteEditor}.
 */
export function ComposeDrawer({
  chosen,
  notes,
  onCancel,
  onDone,
}: {
  chosen: PlaceWithCandidates[];
  notes: Record<string, string>;
  onCancel(): void;
  onDone(): void;
}) {
  const [open, setOpen] = useState(false);
  const [hostNote, setHostNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Потяг за язычок: копим смещение и раскрываем/сворачиваем по порогу, а чистый
  // тап (смещения почти нет) — просто переключает состояние.
  const dragStartY = useRef<number | null>(null);
  const dragMoved = useRef(false);

  const count = chosen.length;
  const enough = count >= ENVELOPE_MIN_PLACES;
  const tooMany = count > ENVELOPE_MAX_PLACES;
  const peekHint =
    count === 0
      ? 'Отметьте места'
      : tooMany
        ? 'Уберите лишнее'
        : !enough
          ? `Ещё ${ENVELOPE_MIN_PLACES - count} до сборки`
          : open
            ? 'Подпись и сборка'
            : 'Потяните вверх — соберём';

  function onGripPointerDown(event: React.PointerEvent) {
    dragStartY.current = event.clientY;
    dragMoved.current = false;
  }

  function onGripPointerMove(event: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const dy = event.clientY - dragStartY.current;
    if (Math.abs(dy) > 8) dragMoved.current = true;
    if (dy <= -DRAG_THRESHOLD) setOpen(true);
    else if (dy >= DRAG_THRESHOLD) setOpen(false);
  }

  function onGripPointerUp() {
    if (!dragMoved.current) setOpen((value) => !value);
    dragStartY.current = null;
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      // Пустое поле — «в этом конверте без заметки» (null). Триммингом занимается
      // и бэкенд, но не шлём лишних пробелов по сети.
      const placeNotes: Record<string, string | null> = {};
      for (const place of chosen) {
        const trimmed = notes[place.id]?.trim();
        placeNotes[place.id] = trimmed ? trimmed : null;
      }
      const result = await api.createEnvelope(
        chosen.map((place) => place.id),
        hostNote.trim() || null,
        placeNotes,
      );
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

  // Готовый конверт — отдельное состояние: язычок больше не нужен, показываем
  // ссылку по центру шторки над затемнением.
  if (link) {
    return (
      <>
        <div className="scrim" />
        <div className="composed composed--open composed--done">
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
      </>
    );
  }

  return (
    <>
      {open && <div className="scrim scrim--soft" onClick={() => setOpen(false)} />}
      <div className={`composed${open ? ' composed--open' : ''}`}>
        <div
          className="composed__grip"
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-label={open ? 'Свернуть сборку' : 'Развернуть сборку'}
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={onGripPointerUp}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setOpen((value) => !value);
            }
          }}
        >
          <span className="composed__grabber" />
          <div className="composed__peek">
            <span className="composed__count">
              {count} из {ENVELOPE_MAX_PLACES}
            </span>
            <span className="composed__hint">{peekHint}</span>
          </div>
        </div>

        <div className="composed__body">
          <div className="composed__panel">
            {chosen.length > 0 && (
              <p className="composed__names">{chosen.map((place) => place.name).join(' · ')}</p>
            )}

            <input
              className="field"
              placeholder="Подпись: «Выбирай, куда поедем в субботу»"
              maxLength={500}
              value={hostNote}
              onChange={(event) => setHostNote(event.target.value)}
            />

            {error && <p className="error">{error}</p>}

            <div className="composed__actions">
              <button type="button" className="btn btn--ghost" onClick={onCancel}>
                Отмена
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!enough || tooMany || busy}
                onClick={create}
              >
                {busy ? 'Собираем…' : `Собрать конверт · ${count}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Лист заметки одного места. Открывается тапом по «+» (добавить) или по номеру
 * уже выбранного места (поправить/убрать). Гостю уедет её выжимка на карточке.
 */
export function PlaceNoteEditor({
  place,
  initialNote,
  picked,
  atCapacity,
  onSave,
  onRemove,
  onClose,
}: {
  place: PlaceWithCandidates;
  initialNote: string;
  picked: boolean;
  atCapacity: boolean;
  onSave(note: string): void;
  onRemove(): void;
  onClose(): void;
}) {
  const [note, setNote] = useState(initialNote);
  const blocked = !picked && atCapacity;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="notesheet" role="dialog" aria-label={`Заметка: ${place.name}`}>
        <div className="notesheet__head">
          <PlaceThumb src={place.photo_url} name={place.name} seed={place.id} />
          <div className="notesheet__id">
            <span className="notesheet__name">{place.name}</span>
            <span className="notesheet__meta">
              {[place.district, place.category].filter(Boolean).join(' · ') ||
                place.address ||
                'без адреса'}
            </span>
          </div>
        </div>

        <label className="label" htmlFor="env-note">
          Почему сюда — по желанию
        </label>
        <textarea
          id="env-note"
          className="field field--area"
          rows={3}
          maxLength={500}
          autoFocus
          placeholder="тут сырники топ и тихо по утрам"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <p className="hint">Гость увидит её выжимкой на карточке. Можно оставить пустой.</p>

        {blocked && (
          <p className="error">
            В конверте уже {ENVELOPE_MAX_PLACES} мест — уберите одно, чтобы добавить это.
          </p>
        )}

        <div className="notesheet__foot">
          {picked ? (
            <button type="button" className="btn btn--ghost" onClick={onRemove}>
              Убрать из конверта
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Отмена
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary"
            disabled={blocked}
            onClick={() => onSave(note)}
          >
            {picked ? 'Сохранить' : 'Добавить в конверт'}
          </button>
        </div>
      </div>
    </>
  );
}
