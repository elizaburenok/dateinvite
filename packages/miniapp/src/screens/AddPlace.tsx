import { Button } from '../components/Button.js';
import { GlassButton } from '../components/GlassButton.js';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PlaceWithCandidates } from '@invite/shared';
import { api, ApiError } from '../api.js';
import { PlaceThumb } from '../components/PlaceThumb.js';
import { useSheetClose } from '../hooks/useSheetClose.js';
import { haptic } from '../telegram.js';
import closeCross from '../assets/place-detail/close-cross.svg';
import tagCross from '../assets/place-detail/tag-cross.svg';
import '../styles/place-detail.css';

interface AddPlaceProps {
  availableTags: string[];
  preview?: boolean;
  onCreated(place: PlaceWithCandidates): void;
  onClose(): void;
}

export function AddPlace({ availableTags, preview = false, onCreated, onClose }: AddPlaceProps) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const tagInput = useRef('');
  const tagElement = useRef<HTMLInputElement>(null);
  const completionStart = useRef<number | null>(null);
  const [tagQuery, setTagQuery] = useState('');
  const [tagsOpen, setTagsOpen] = useState(false);
  const [activeTag, setActiveTag] = useState(-1);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef(document.activeElement);
  const { closing, requestClose, onAnimationEnd } = useSheetClose(onClose);

  const library = [...new Map([...availableTags, ...tags].map((tag) => [tag.toLowerCase(), tag])).values()];
  const suggestions = library.filter((tag) =>
    !tags.some((selected) => selected.toLowerCase() === tag.toLowerCase()) &&
    tag.toLowerCase().includes(tagQuery.trim().toLowerCase()),
  ).sort((a, b) => {
    const query = tagQuery.trim().toLowerCase();
    return Number(b.toLowerCase().startsWith(query)) - Number(a.toLowerCase().startsWith(query)) || a.localeCompare(b);
  });
  const showSuggestions = tagsOpen && suggestions.length > 0;

  useLayoutEffect(() => {
    if (completionStart.current !== null) {
      tagElement.current?.setSelectionRange(completionStart.current, newTag.length);
      completionStart.current = null;
    }
  }, [newTag, tagQuery, activeTag]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = opener.current;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  function typeTag(value: string, complete: boolean) {
    setTagQuery(value);
    setTagsOpen(true);
    const match = complete && value && !value.includes(',')
      ? library.filter((tag) => !tags.some((selected) => selected.toLowerCase() === tag.toLowerCase()))
        .sort((a, b) => a.localeCompare(b)).find((tag) => tag.toLowerCase().startsWith(value.toLowerCase()))
      : undefined;
    tagInput.current = match ?? value;
    setNewTag(tagInput.current);
    completionStart.current = match ? value.length : null;
    setActiveTag(-1);
  }

  function collectTags(value: string): string[] | null {
    const next = [...tags];
    for (const item of value.split(',').map((tag) => tag.trim()).filter(Boolean)) {
      const canonical = library.find((tag) => tag.toLowerCase() === item.toLowerCase()) ?? item;
      if (!next.some((tag) => tag.toLowerCase() === canonical.toLowerCase())) next.push(canonical);
    }
    if (next.length > 20 || next.some((tag) => tag.length > 40)) {
      setError('You can add up to 20 tags, each with no more than 40 characters.');
      return null;
    }
    return next;
  }

  function commitTag(value = tagInput.current) {
    const next = collectTags(value);
    if (!next) return;
    setTags(next);
    tagInput.current = '';
    setNewTag('');
    setTagQuery('');
    setActiveTag(-1);
    setError(null);
  }

  async function save() {
    if (locked.current || closing) return;
    const nextTags = collectTags(tagInput.current);
    if (!nextTags) return;
    const link = mapsUrl.trim();
    if (link) {
      try {
        const url = new URL(link);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Unsupported protocol');
      } catch {
        setError('Enter a valid maps link.');
        return;
      }
    }
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const photos = photo ? [preview ? await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(photo);
      }) : (await api.uploadPhoto(photo)).source_url] : [];
      const draft = {
        name: name.trim() || 'Untitled', address: '', district: null, category: null,
        note: note.trim() || null, tags: nextTags, maps_url: link || null,
        lat: null, lng: null, photos,
      };
      const created = preview ? {
        ...draft, id: crypto.randomUUID(), photo_url: photos[0] ?? null,
        rating: null, hours: null, source: 'manual' as const,
        enrichment_status: 'resolved' as const, created_at: new Date().toISOString(), candidates: [],
      } : await api.createPlace(draft);
      haptic('success');
      onCreated(created);
      requestClose();
    } catch (err) {
      haptic('error');
      setError(err instanceof ApiError ? err.message : 'Could not save place');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <div ref={dialog} className={`sheet place-detail${closing ? ' sheet--closing' : ''}`}
      role="dialog" aria-modal="true" aria-label="New place" tabIndex={-1}
      onAnimationEnd={onAnimationEnd}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); if (!locked.current) requestClose(); }
        if (event.key !== 'Tab') return;
        const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}>
      <Button iconOnly size="small" type="button" className="place-detail__close place-detail__close--new" disabled={busy}
        onClick={requestClose} aria-label="Close place card">
        <img className="place-detail__close-cross" src={closeCross} alt="" />
      </Button>

      <div className="place-detail__scroll">
        <div className="place-detail__photo place-detail__photo--new">
          <PlaceThumb src={photoPreview} name="" seed="new-place" size="lg" />
          <Button type="button" iconOnly size="small" className="place-detail__photo-add" disabled={busy}
            onClick={() => photoInput.current?.click()} aria-label="Add place photo">
            <svg className="place-detail__camera" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></svg>
          </Button>
        </div>
        <input ref={photoInput} className="place-detail__file" type="file" accept="image/*" tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
          }} />

        <div className="place-detail__content">
          <label className="place-detail__field place-detail__field--name">
            <span id="new-place-name-label">Name</span>
            <input aria-labelledby="new-place-name-label" value={name} maxLength={200} disabled={busy}
              placeholder="Place name" onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur(); }} />
          </label>
          <label className="place-detail__field place-detail__field--secondary">
            <span id="new-place-note-label">Note</span>
            <textarea aria-labelledby="new-place-note-label" value={note} rows={1} maxLength={500} disabled={busy}
              placeholder="A quiet place" onChange={(event) => setNote(event.target.value)} />
          </label>
          <label className="place-detail__field place-detail__field--secondary">
            <span id="new-place-maps-label">Map link</span>
            <input aria-labelledby="new-place-maps-label" type="url" inputMode="url" value={mapsUrl}
              disabled={busy} placeholder="Add link" onChange={(event) => setMapsUrl(event.target.value)} />
          </label>
          <div className="place-detail__tags">
            <label className="place-detail__field place-detail__field--secondary">
              <span id="new-place-tags-label">Tags</span>
              <input ref={tagElement} aria-labelledby="new-place-tags-label" value={newTag} disabled={busy}
                placeholder="Add tag" role="combobox" aria-autocomplete="both" aria-expanded={showSuggestions}
                aria-controls={showSuggestions ? 'new-place-tag-suggestions' : undefined}
                aria-activedescendant={showSuggestions && activeTag >= 0 ? `new-place-tag-option-${activeTag}` : undefined}
                autoComplete="off" autoCapitalize="none" spellCheck={false}
                aria-description="Start typing a tag. Use arrow keys to choose a suggestion and Enter to add it. You can also add a new tag."
                onFocus={() => setTagsOpen(true)}
                onChange={(event) => {
                  const input = event.nativeEvent as InputEvent;
                  const atEnd = event.target.selectionStart === event.target.value.length;
                  typeTag(event.target.value, atEnd && !input.isComposing && !input.inputType?.startsWith('delete'));
                }}
                onBlur={() => { setTagsOpen(false); commitTag(); }}
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
                  if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); commitTag(); }
                }} />
            </label>
            {showSuggestions && <ul id="new-place-tag-suggestions" className="place-detail__suggestions" role="listbox" aria-label="Tag library">
              {suggestions.map((tag, index) => <li key={tag} id={`new-place-tag-option-${index}`}
                role="option" aria-selected={activeTag === index} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                <Button type="button" className="place-detail__tag" tabIndex={-1} disabled={busy}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => { commitTag(tag); tagElement.current?.focus(); }}>{tag}</Button>
              </li>)}
            </ul>}
            {tags.length > 0 && <ul className="place-detail__chips" aria-label="Place tags">
              {tags.map((tag) => <li key={tag}>
                <Button type="button" className="place-detail__tag" disabled={busy} aria-label={`Remove tag ${tag}`}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => setTags(tags.filter((item) => item !== tag))}>
                  <span>{tag}</span><img src={tagCross} alt="" />
                </Button>
              </li>)}
            </ul>}
          </div>
          {error && <div className="place-detail__error" role="alert"><p>{error}</p></div>}
          <GlassButton type="button" className="place-detail__save glass-button--frost" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save'}
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
