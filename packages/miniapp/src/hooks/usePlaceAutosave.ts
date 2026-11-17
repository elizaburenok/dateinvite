import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaceWithCandidates, UpdatePlaceRequest } from '@invite/shared';
import { api, ApiError } from '../api.js';
import { haptic } from '../telegram.js';

type Draft = { name: string; note: string; tags: string[] };
const draftOf = (place: PlaceWithCandidates): Draft => ({ name: place.name, note: place.note ?? '', tags: place.tags });
const normalized = (draft: Draft) => ({ name: draft.name.trim(), note: draft.note.trim() || null, tags: draft.tags });

/** Serialize writes so an older response can never overwrite more recent input. */
export function usePlaceAutosave(
  place: PlaceWithCandidates,
  onSaved: (place: PlaceWithCandidates) => void,
  updatePlace: (id: string, patch: UpdatePlaceRequest) => Promise<PlaceWithCandidates> = api.updatePlace,
) {
  const [draft, setDraft] = useState(() => draftOf(place));
  const latest = useRef(draft);
  const saved = useRef(normalized(draft));
  const callback = useRef(onSaved);
  callback.current = onSaved;
  const updater = useRef(updatePlace);
  updater.current = updatePlace;
  const pending = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const paused = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(0);

  const flush = useCallback((): Promise<boolean> => {
    clearTimeout(timer.current);
    if (pending.current) return pending.current;
    if (paused.current) return Promise.resolve(false);
    const save = async () => {
      let changed = false;
      try {
        while (!paused.current) {
          const next = normalized(latest.current);
          const patch: UpdatePlaceRequest = {};
          if (next.name !== saved.current.name) patch.name = next.name;
          if (next.note !== saved.current.note) patch.note = next.note;
          if (JSON.stringify(next.tags) !== JSON.stringify(saved.current.tags)) patch.tags = next.tags;
          if (!Object.keys(patch).length) break;
          if (!next.name) {
            setError('Введите название места');
            return false;
          }
          setSaving(true);
          setError(null);
          const updated = await updater.current(place.id, patch);
          // Apply server normalization only if the user has not changed that field in flight.
          const accepted = draftOf(updated);
          for (const key of ['name', 'note', 'tags'] as const) {
            if (key in patch && JSON.stringify(normalized(latest.current)[key]) === JSON.stringify(next[key])) {
              latest.current = { ...latest.current, [key]: accepted[key] };
            }
          }
          setDraft(latest.current);
          saved.current = normalized(draftOf(updated));
          callback.current(updated);
          changed = true;
        }
        setError(null);
        if (changed && !paused.current) {
          setNotice((value) => value + 1);
          haptic('success');
        }
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Не получилось сохранить. Попробуйте ещё раз.');
        haptic('error');
        return false;
      } finally {
        setSaving(false);
      }
    };
    pending.current = save().finally(() => { pending.current = null; });
    return pending.current;
  }, [place.id]);

  const change = useCallback((patch: Partial<Draft>) => {
    latest.current = { ...latest.current, ...patch };
    setDraft(latest.current);
    setNotice(0);
    setError(null);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 700);
  }, [flush]);

  const accept = (updated: PlaceWithCandidates) => {
    latest.current = draftOf(updated);
    saved.current = normalized(latest.current);
    setDraft(latest.current);
    callback.current(updated);
    setNotice((value) => value + 1);
  };

  const pause = async () => {
    paused.current = true;
    clearTimeout(timer.current);
    await pending.current;
  };

  useEffect(() => () => { clearTimeout(timer.current); }, []);

  return { draft, change, flush, accept, pause, resume: () => { paused.current = false; }, saving, error, notice };
}
