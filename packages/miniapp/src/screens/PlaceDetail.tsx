import { Button } from '../components/Button.js';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PlaceWithCandidates, UpdatePlaceRequest } from '@invite/shared';
import { api, ApiError } from '../api.js';
import { PlaceThumb } from '../components/PlaceThumb.js';
import { useSheetClose } from '../hooks/useSheetClose.js';
import { useSmoothWheelScroll } from '../hooks/useSmoothWheelScroll.js';
import { usePlaceAutosave } from '../hooks/usePlaceAutosave.js';
import { haptic } from '../telegram.js';
import { PhotoEditor } from './PhotoEditor.js';
import closeCross from '../assets/place-detail/close-cross.svg';
import tagCross from '../assets/place-detail/tag-cross.svg';
import trash from '../assets/place-detail/trash.svg';
import '../styles/place-detail.css';

interface PlaceDetailProps {
  place: PlaceWithCandidates;
  availableTags: string[];
  preview?: boolean;
  onSaved(place: PlaceWithCandidates): void;
  onDeleted(id: string): void;
  onClose(): void;
}

export function PlaceDetail({ place, availableTags, preview = false, onSaved, onDeleted, onClose }: PlaceDetailProps) {
  const autosave = usePlaceAutosave(place, onSaved, preview
    ? async (_id: string, patch: UpdatePlaceRequest) => ({ ...place, ...patch })
    : api.updatePlace);
  const { draft, change, flush } = autosave;
  const [newTag, setNewTag] = useState('');
  const tagInput = useRef('');
  const tagElement = useRef<HTMLInputElement>(null);
  const completionStart = useRef<number | null>(null);
  const [tagQuery, setTagQuery] = useState('');
  const [tagsOpen, setTagsOpen] = useState(false);
  const [activeTag, setActiveTag] = useState(-1);
  const library = [...new Map([...availableTags, ...draft.tags].map((tag) => [tag.toLowerCase(), tag])).values()];
  const suggestions = library.filter((tag) =>
    !draft.tags.some((selected) => selected.toLowerCase() === tag.toLowerCase()) &&
    tag.toLowerCase().includes(tagQuery.trim().toLowerCase()),
  ).sort((a, b) => {
    const query = tagQuery.trim().toLowerCase();
    return Number(b.toLowerCase().startsWith(query)) - Number(a.toLowerCase().startsWith(query)) || a.localeCompare(b);
  });
  const showSuggestions = tagsOpen && suggestions.length > 0;
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useSmoothWheelScroll(scroll);
  const previewPhotoInput = useRef<HTMLInputElement>(null);
  const opener = useRef(document.activeElement);
  const { closing, requestClose, onAnimationEnd } = useSheetClose(onClose);

  useLayoutEffect(() => {
    if (completionStart.current !== null) {
      tagElement.current?.setSelectionRange(completionStart.current, newTag.length);
      completionStart.current = null;
    }
  }, [newTag, tagQuery, activeTag]);

  function typeTag(value: string, complete: boolean) {
    setTagQuery(value);
    setTagsOpen(true);
    const match = complete && value && !value.includes(',')
      ? library.filter((tag) => !draft.tags.some((selected) => selected.toLowerCase() === tag.toLowerCase()))
        .sort((a, b) => a.localeCompare(b)).find((tag) => tag.toLowerCase().startsWith(value.toLowerCase()))
      : undefined;
    tagInput.current = match ?? value;
    setNewTag(tagInput.current);
    completionStart.current = match ? value.length : null;
    setActiveTag(-1);
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previousFocus = opener.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    if (!editingPhoto) dialog.current?.focus();
  }, [editingPhoto]);

  useEffect(() => {
    setToast(autosave.notice > 0);
    const timer = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(timer);
  }, [autosave.notice]);

  function commitTag(value = tagInput.current) {
    const additions = value.split(',').map((tag) => tag.trim()).filter(Boolean);
    const tags = [...draft.tags];
    for (const tag of additions) {
      const canonical = library.find((item) => item.toLowerCase() === tag.toLowerCase()) ?? tag;
      if (!tags.some((item) => item.toLowerCase() === canonical.toLowerCase())) tags.push(canonical);
    }
    if (tags.length > 20 || tags.some((tag) => tag.length > 40)) {
      setError('You can add up to 20 tags, each with no more than 40 characters.');
      return false;
    }
    if (additions.length) change({ tags });
    tagInput.current = '';
    setNewTag('');
    setTagQuery('');
    setActiveTag(-1);
    setError(null);
    return true;
  }

  async function finish(action: () => void | Promise<void>) {
    if (locked.current || closing) return;
    if (!commitTag()) return;
    locked.current = true;
    setBusy(true);
    try {
      if (await flush()) await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
      haptic('error');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function remove() {
    if (locked.current) return;
    if (preview) {
      onDeleted(place.id);
      requestClose();
      return;
    }
    locked.current = true;
    setBusy(true);
    setError(null);
    await autosave.pause();
    try {
      await api.deletePlace(place.id);
      onDeleted(place.id);
      haptic('success');
      requestClose();
    } catch (err) {
      autosave.resume();
      locked.current = false;
      setBusy(false);
      setError(err instanceof ApiError ? err.message : 'Could not delete place');
      haptic('error');
    }
  }

  if (editingPhoto) return <PhotoEditor place={place} onSaved={autosave.accept} onClose={() => setEditingPhoto(false)} />;

  return (
    <div ref={dialog} className={`sheet place-detail${closing ? ' sheet--closing' : ''}`}
      role="dialog" aria-modal="true" aria-label={place.name} tabIndex={-1}
      onAnimationEnd={onAnimationEnd}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); void finish(requestClose); }
        if (event.key !== 'Tab') return;
        const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}>
      <Button iconOnly size="small" type="button" className="place-detail__close" disabled={busy}
        onClick={() => void finish(requestClose)} aria-label="Close place card">
        <img className="place-detail__close-cross" src={closeCross} alt="" />
      </Button>

      <div ref={scroll} className="place-detail__scroll">
        <button type="button" className="place-detail__photo" disabled={busy}
          onClick={() => preview ? previewPhotoInput.current?.click() : void finish(() => setEditingPhoto(true))}
          aria-label={place.photo_url ? 'Edit place photo' : 'Add place photo'}>
          <PlaceThumb src={place.photo_url} name={place.name} seed={place.id} size="lg" />
        </button>
        {preview && <input ref={previewPhotoInput} className="place-detail__file" type="file" accept="image/*" tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result !== 'string') return;
              onSaved({ ...place, photo_url: reader.result, photos: [reader.result, ...place.photos.slice(1)] });
            };
            reader.readAsDataURL(file);
            event.target.value = '';
          }} />}

        <div className="place-detail__content">
          {place.enrichment_status === 'needs_confirmation' && place.candidates.length > 0 && (
            <section className="place-detail__confirmation">
              <h2>Which one is it?</h2>
              <p>Choose a place to add it to your envelope.</p>
              {place.candidates.map((candidate) => (
                <button key={candidate.id} type="button" className="place-detail__candidate" disabled={busy}
                  onClick={() => void finish(async () => {
                    autosave.accept(await api.updatePlace(place.id, { confirm_candidate_id: candidate.id }));
                  })}>
                  <strong>{candidate.name}</strong>
                  <span>{[candidate.address, candidate.district].filter(Boolean).join(' · ')}</span>
                </button>
              ))}
            </section>
          )}

          <label className="place-detail__field">
            <span id="place-name-label">Name</span>
            <input aria-labelledby="place-name-label" value={draft.name} maxLength={200} disabled={busy} required
              onChange={(event) => change({ name: event.target.value })}
              onBlur={() => void flush()}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur(); }} />
          </label>
          <label className="place-detail__field place-detail__field--secondary">
            <span id="place-note-label">Note</span>
            <textarea aria-labelledby="place-note-label" value={draft.note} rows={1} maxLength={500} disabled={busy} placeholder="A quiet place"
              onChange={(event) => change({ note: event.target.value })} onBlur={() => void flush()} />
          </label>
          <div className="place-detail__tags">
            <label className="place-detail__field place-detail__field--secondary">
              <span id="place-tags-label">Tags</span>
              <input ref={tagElement} aria-labelledby="place-tags-label" value={newTag} disabled={busy} placeholder="Add tag"
                role="combobox" aria-autocomplete="both" aria-expanded={showSuggestions}
                aria-controls={showSuggestions ? 'place-tag-suggestions' : undefined}
                aria-activedescendant={showSuggestions && activeTag >= 0 ? `place-tag-option-${activeTag}` : undefined}
                autoComplete="off" autoCapitalize="none" spellCheck={false}
                aria-description="Start typing a tag. Use arrow keys to choose a suggestion and Enter to add it. You can also add a new tag."
                onFocus={() => setTagsOpen(true)}
                onChange={(event) => {
                  const input = event.nativeEvent as InputEvent;
                  const atEnd = event.target.selectionStart === event.target.value.length;
                  typeTag(event.target.value, atEnd && !input.isComposing && !input.inputType?.startsWith('delete'));
                }}
                onBlur={() => { setTagsOpen(false); if (commitTag()) void flush(); }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === 'Escape' && tagsOpen) {
                    event.preventDefault(); event.stopPropagation(); setTagsOpen(false);
                    tagInput.current = tagQuery; setNewTag(tagQuery); return;
                  }
                  if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
                    event.preventDefault(); setTagsOpen(true);
                    const next = activeTag < 0
                      ? (event.key === 'ArrowDown' ? 0 : suggestions.length - 1)
                      : (activeTag + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
                    setActiveTag(next);
                    tagInput.current = suggestions[next]!; setNewTag(tagInput.current);
                    completionStart.current = 0; return;
                  }
                  if ((event.key === 'Enter' || event.key === ',') && !event.nativeEvent.isComposing) {
                    event.preventDefault(); if (commitTag()) void flush();
                  }
                }} />
            </label>
            {showSuggestions && <ul id="place-tag-suggestions" className="place-detail__suggestions" role="listbox" aria-label="Tag library">
              {suggestions.map((tag, index) => <li key={tag} id={`place-tag-option-${index}`}
                role="option" aria-selected={activeTag === index} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                <Button type="button" className="place-detail__tag" tabIndex={-1} disabled={busy}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => { if (commitTag(tag)) void flush(); tagElement.current?.focus(); }}>
                  {tag}
                </Button>
              </li>)}
            </ul>}
            {draft.tags.length > 0 && <ul className="place-detail__chips" aria-label="Place tags">
              {draft.tags.map((tag) => <li key={tag}>
                <Button type="button" className="place-detail__tag" disabled={busy} aria-label={`Remove tag ${tag}`}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => { change({ tags: draft.tags.filter((item) => item !== tag) }); void flush(); }}>
                  <span>{tag}</span><img src={tagCross} alt="" />
                </Button>
              </li>)}
            </ul>}
          </div>

          {(error || autosave.error) && <div className="place-detail__error" role="alert">
            <p>{error || autosave.error}</p>
            {autosave.error && <Button type="button" disabled={busy} onClick={() => void finish(() => {})}>Retry saving</Button>}
          </div>}

          <Button type="button" className="place-detail__delete" disabled={busy} onClick={() => void remove()}>
            <img src={trash} alt="" /><span>Delete</span>
          </Button>
        </div>
      </div>
      <div className={`place-detail__toast${toast && !autosave.saving && !error && !autosave.error ? ' place-detail__toast--visible' : ''}`} role="status" aria-live="polite">
        {toast && !autosave.saving && !error && !autosave.error ? 'Changes saved' : ''}
      </div>
    </div>
  );
}
