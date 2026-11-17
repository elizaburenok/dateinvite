import { Button } from '../components/Button.js';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ENVELOPE_MAX_PLACES, ENVELOPE_MIN_PLACES } from '@invite/shared/constants';
import type { PlaceWithCandidates } from '@invite/shared';
import { api, ApiError } from '../api.js';
import { envelopeNotes } from '../lib/places.js';
import { haptic } from '../telegram.js';
import { PlaceThumb } from '../components/PlaceThumb.js';

/** Selected places and notes saved only in this envelope. */

/** Порог в пикселях, после которого потяг за язычок считаем осознанным жестом. */
const DRAG_THRESHOLD = 28;

/** Returning to the list keeps the selection and drafts. */
export function ComposeDrawer({
  chosen,
  notes,
  onCancel,
  onDone,
  onNoteChange,
  onRemovePlace,
  initialHostNote = '',
  onHostNoteChange,
}: {
  chosen: PlaceWithCandidates[];
  notes: Record<string, string>;
  onCancel(): void;
  onDone(): void;
  onNoteChange?(id: string, note: string): void;
  onRemovePlace?(id: string): void;
  initialHostNote?: string;
  onHostNoteChange?(note: string): void;
}) {
  const [noteDrafts, setNoteDrafts] = useState(notes);
  const [editingPlace, setEditingPlace] = useState<PlaceWithCandidates | null>(null);
  const creating = useRef(false);
  const [hostNote, setHostNote] = useState(initialHostNote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => { panel.current?.focus(); }, [editingPlace, link]);

  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !creating.current) {
      event.preventDefault();
      if (link) onDone(); else onCancel();
    }
    if (event.key !== 'Tab') return;
    const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]');
    const first = controls?.[0];
    const last = controls?.[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  };

  // A tap or downward drag returns to place selection while keeping drafts.
  const dragStartY = useRef<number | null>(null);
  const dragMoved = useRef(false);

  const count = chosen.length;
  const enough = count >= ENVELOPE_MIN_PLACES;
  const tooMany = count > ENVELOPE_MAX_PLACES;
  const peekHint =
    count === 0
      ? 'Select places'
      : tooMany
        ? 'Remove extra places'
        : !enough
          ? `${ENVELOPE_MIN_PLACES - count} more to create`
          : '';

  function onGripPointerDown(event: React.PointerEvent) {
    if (creating.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartY.current = event.clientY;
    dragMoved.current = false;
  }

  function onGripPointerMove(event: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const dy = event.clientY - dragStartY.current;
    if (Math.abs(dy) > 8) dragMoved.current = true;
    if (dy >= DRAG_THRESHOLD && !creating.current) {
      dragStartY.current = null;
      onCancel();
    }
  }

  function onGripPointerUp() {
    if (!dragMoved.current && !creating.current) onCancel();
    dragStartY.current = null;
  }

  async function create() {
    if (!enough || tooMany || creating.current) return;
    creating.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await api.createEnvelope(
        chosen.map((place) => place.id),
        hostNote.trim() || null,
        envelopeNotes(chosen, noteDrafts),
      );
      setLink(result.url);
      haptic('success');
    } catch (err) {
      haptic('error');
      setError(err instanceof ApiError ? err.message : 'Could not create envelope');
    } finally {
      creating.current = false;
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

  if (editingPlace) return <PlaceNoteEditor
    place={editingPlace}
    initialNote={noteDrafts[editingPlace.id] ?? editingPlace.note ?? ''}
    picked
    atCapacity={false}
    onSave={(note) => {
      setNoteDrafts((current) => ({ ...current, [editingPlace.id]: note }));
      onNoteChange?.(editingPlace.id, note);
      setEditingPlace(null);
    }}
    onRemove={() => { onRemovePlace?.(editingPlace.id); setEditingPlace(null); }}
    onClose={() => setEditingPlace(null)} />;

  // Готовый конверт — отдельное состояние: язычок больше не нужен, показываем
  // ссылку по центру шторки над затемнением.
  if (link) {
    return (
      <>
        <div className="scrim" />
        <div ref={panel} className="composed composed--open composed--done" role="dialog" aria-modal="true" aria-label="Envelope ready" tabIndex={-1} onKeyDown={onPanelKeyDown}>
          <p className="compose__title">Envelope ready</p>
          <p className="compose__lead">Send this link to one person.</p>
          <p className="compose__link">{link}</p>
          <div className="compose__actions">
            <Button type="button" className="btn btn--ghost" onClick={onDone}>
              Done
            </Button>
            <Button type="button" className="btn btn--primary" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="scrim scrim--soft" onClick={() => { if (!creating.current) onCancel(); }} />
      <div ref={panel} className="composed composed--open" role="dialog" aria-modal="true" aria-label="Create envelope" tabIndex={-1} onKeyDown={onPanelKeyDown}>
        <div
          className="composed__grip"
          role="button"
          tabIndex={0}
          aria-label="Back to places"
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={onGripPointerUp}
          onPointerCancel={() => { dragStartY.current = null; dragMoved.current = true; }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (!creating.current) onCancel();
            }
          }}
        >
          <span className="composed__grabber" />
          <span className="composed__title">Your envelope</span>
          <div className="composed__peek">
            <span className="composed__count">
              {count} of {ENVELOPE_MAX_PLACES}
            </span>
            {peekHint && <span className="composed__hint">{peekHint}</span>}
          </div>
        </div>

        <div className="composed__body">
          <div className="composed__panel">
            {chosen.length > 0 && (
              <ul className="compose-deck" aria-label="Places in envelope">
                {chosen.map((place, index) => (
                  <li key={place.id} className="compose-deck__item"
                    style={{ '--deck-angle': `${(index - (chosen.length - 1) / 2) * 5}deg`, zIndex: chosen.length - index } as CSSProperties}>
                    <button type="button" className="compose-deck__edit" disabled={busy}
                      aria-label={`Note for ${place.name}`} onClick={() => setEditingPlace(place)}>
                    <span className="compose-deck__name" title={place.name}>{place.name}</span>
                    <div className="compose-deck__card">
                      <PlaceThumb src={place.photo_url} name={place.name} seed={place.id} size="lg" />
                    </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <input
              className="field"
              placeholder="Caption: “Choose where we’ll go on Saturday”"
              maxLength={500}
              value={hostNote}
              aria-label="Envelope caption"
              disabled={busy}
              onChange={(event) => { setHostNote(event.target.value); onHostNoteChange?.(event.target.value); }}
            />

            {error && <p className="error">{error}</p>}

            <div className="composed__actions">
              <Button type="button" className="btn btn--ghost" disabled={busy} onClick={onCancel}>
                Back to places
              </Button>
              <Button
                type="button"
                className="btn btn--primary"
                disabled={!enough || tooMany || busy}
                onClick={create}
              >
                {busy ? 'Creating…' : `Create envelope ${count}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * The note sheet opens for one place at a time. The guest sees its summary on the card.
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
  const dialog = useRef<HTMLDivElement>(null);
  const blocked = !picked && atCapacity;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div ref={dialog} className="notesheet" role="dialog" aria-modal="true" aria-label={`Note: ${place.name}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
          if (event.key !== 'Tab') return;
          const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea');
          const first = controls?.[0];
          const last = controls?.[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <div className="notesheet__head">
          <PlaceThumb src={place.photo_url} name={place.name} seed={place.id} />
          <div className="notesheet__id">
            <span className="notesheet__name">{place.name}</span>
            <span className="notesheet__meta">
              {[place.district, place.category].filter(Boolean).join(' · ') ||
                place.address ||
                'No address'}
            </span>
          </div>
        </div>

        <textarea
          id="env-note"
          aria-label="Place note"
          className="field field--area"
          rows={3}
          maxLength={500}
          autoFocus
          placeholder="Great pancakes and quiet mornings"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        {blocked && (
          <p className="error">
            The envelope already has {ENVELOPE_MAX_PLACES} places. Remove one to add this place.
          </p>
        )}

        <div className="notesheet__foot">
          {picked ? (
            <Button type="button" className="btn btn--ghost" onClick={onRemove}>
              Remove from envelope
            </Button>
          ) : (
            <Button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            className="btn btn--primary"
            disabled={blocked}
            onClick={() => onSave(note)}
          >
            {picked ? 'Save' : 'Add to envelope'}
          </Button>
        </div>
      </div>
    </>
  );
}
