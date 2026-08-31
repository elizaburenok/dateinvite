import { useState } from 'react';
import type { PlaceWithCandidates } from '@invite/shared';
import { api, ApiError } from '../api.js';
import { PlaceThumb } from '../components/PlaceThumb.js';
import { haptic } from '../telegram.js';

interface PlaceDetailProps {
  place: PlaceWithCandidates;
  onSaved(place: PlaceWithCandidates): void;
  onDeleted(id: string): void;
  onClose(): void;
}

/**
 * Карточка места (§10.2). Здесь же живёт подтверждение кандидата —
 * инбокс и карточка это один и тот же экран, просто в разных состояниях.
 */
export function PlaceDetail({ place, onSaved, onDeleted, onClose }: PlaceDetailProps) {
  const [note, setNote] = useState(place.note ?? '');
  const [name, setName] = useState(place.name);
  const [tagsText, setTagsText] = useState(place.tags.join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsConfirmation = place.enrichment_status === 'needs_confirmation';

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      haptic('success');
    } catch (err) {
      haptic('error');
      setError(err instanceof ApiError ? err.message : 'Не получилось сохранить');
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      const tags = tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const updated = await api.updatePlace(place.id, {
        note: note.trim() || null,
        tags,
        ...(name.trim() && name.trim() !== place.name ? { name: name.trim() } : {}),
      });
      onSaved(updated);
      onClose();
    });

  const confirm = (candidateId: string) =>
    run(async () => {
      const updated = await api.updatePlace(place.id, { confirm_candidate_id: candidateId });
      onSaved(updated);
      setName(updated.name);
    });

  const remove = () =>
    run(async () => {
      await api.deletePlace(place.id);
      onDeleted(place.id);
      onClose();
    });

  return (
    <div className="sheet" role="dialog" aria-label={place.name}>
      <div className="sheet__head">
        <button type="button" className="sheet__close" onClick={onClose} aria-label="Закрыть">
          ←
        </button>
        <span className="sheet__title">Место</span>
      </div>

      <div className="sheet__body">
        <PlaceThumb src={place.photo_url} name={place.name} seed={place.id} size="lg" />

        {needsConfirmation && place.candidates.length > 0 && (
          <section className="confirm">
            <h2 className="confirm__title">Какое из них?</h2>
            <p className="confirm__lead">
              Пост был без геометки, поэтому мы нашли похожие места. Пока не выберете —
              место нельзя положить в конверт.
            </p>
            {place.candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className="candidate"
                disabled={busy}
                onClick={() => confirm(candidate.id)}
              >
                <span className="candidate__name">{candidate.name}</span>
                <span className="candidate__meta">
                  {[candidate.address, candidate.district].filter(Boolean).join(' · ')}
                </span>
              </button>
            ))}
          </section>
        )}

        <label className="label" htmlFor="place-name">
          Название
        </label>
        <input
          id="place-name"
          className="field"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        {place.address && <p className="detail__address">{place.address}</p>}
        {(place.district || place.category) && (
          <p className="detail__meta">
            {[place.district, place.category].filter(Boolean).join(' · ')}
          </p>
        )}

        <label className="label" htmlFor="place-note">
          Почему сюда
        </label>
        <textarea
          id="place-note"
          className="field field--area"
          rows={3}
          maxLength={500}
          placeholder="тут сырники топ и тихо по утрам"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <p className="hint">Эту строку увидит гость — она важнее адреса и рейтинга.</p>

        <label className="label" htmlFor="place-tags">
          Теги
        </label>
        <input
          id="place-tags"
          className="field"
          placeholder="утро, свидание, работа"
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
        />

        {place.maps_url && (
          <a className="detail__link" href={place.maps_url} target="_blank" rel="noreferrer">
            Открыть в Картах
          </a>
        )}

        {error && <p className="error">{error}</p>}
      </div>

      <div className="sheet__foot">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={remove}>
          Удалить
        </button>
        <button type="button" className="btn btn--primary" disabled={busy} onClick={save}>
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
