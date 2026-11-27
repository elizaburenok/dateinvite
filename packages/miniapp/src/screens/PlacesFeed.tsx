import { LibrarySheetHeading } from '../components/LibrarySheetHeading.js';
import { usePlacesSheetMotion } from '../hooks/usePlacesSheetMotion.js';
import { useSmoothWheelScroll } from '../hooks/useSmoothWheelScroll.js';
import { Button } from '../components/Button.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlaceWithCandidates } from '@invite/shared';
import { ENVELOPE_MAX_PLACES } from '@invite/shared/constants';
import { GlassButton } from '../components/GlassButton.js';
import libraryPlus from '../assets/places-feed/library-add-plus.svg';
import libraryCross from '../assets/places-feed/library-close-cross.svg';
import { PlaceThumb } from '../components/PlaceThumb.js';
import closeCross from '../assets/places-feed/close-cross.svg';

type FeedEntry = 'create' | 'library';

interface PlacesFeedProps {
  entry: FeedEntry;
  places: PlaceWithCandidates[];
  suspended: boolean;
  selection: string[];
  onClose(): void;
  onNext(): void;
  onAddPlace(): void;
  onOpenPlace(place: PlaceWithCandidates): void;
  onPickPlace(place: PlaceWithCandidates): void;
}

/** Library shows saved-place rows; envelope creation keeps its photo picker. */
export function PlacesFeed({
  entry,
  places,
  suspended,
  selection,
  onClose,
  onNext,
  onAddPlace,
  onOpenPlace,
  onPickPlace,
}: PlacesFeedProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const tagTriggerRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef(document.activeElement);
  const library = entry === 'library';
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const availableTags = useMemo(() => [...new Set(places.flatMap((place) => place.tags))]
    .sort((a, b) => a.localeCompare(b)), [places]);
  const activeTags = useMemo(() => selectedTags.filter(tag => availableTags.includes(tag)), [selectedTags, availableTags]);
  const visiblePlaces = useMemo(() => library && activeTags.length
    ? places.filter(place => activeTags.some(tag => place.tags.includes(tag)))
    : places, [library, places, activeTags]);
  const chooseTag = (tag?: string) => {
    if (listRef.current) listRef.current.scrollTop = 0;
    setSelectedTags(current => tag
      ? current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag]
      : []);
  };
  useEffect(() => {
    if (!tagMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!tagMenuRef.current?.contains(event.target as Node)) setTagMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [tagMenuOpen]);
  const closeSheet = usePlacesSheetMotion(dialogRef, onClose);
  const selecting = entry === 'create';
  const placeCount = `${selection.length} ${selection.length === 1 ? 'place' : 'places'}`;
  useSmoothWheelScroll(listRef, !suspended, visiblePlaces, 55);

  const handleClose = () => closeSheet();

  useEffect(() => {
    const opener = openerRef.current;
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  useEffect(() => {
    if (!suspended) dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (suspended) return;
      if (event.key === 'Escape') handleClose();
      if (event.key !== 'Tab') return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, suspended, library]);

  return (
    <div ref={dialogRef} className={`places-feed${library ? ' places-feed--library places-feed--library-motion' : ' places-feed--create places-feed--create-motion'}`} role="dialog"
      aria-modal={!suspended} aria-label={library ? 'Place library' : 'Places'} tabIndex={-1} inert={suspended}>
      <Button iconOnly size="small" className="places-feed__close" type="button" onClick={handleClose} aria-label="Close place list">
        <img className="places-feed__close-cross" src={library ? libraryCross : closeCross} alt="" />
      </Button>

      <div className="places-feed__window">
        {library ? <LibrarySheetHeading /> : null}
        {library && (
          <div className="places-feed__tags" ref={tagMenuRef} onKeyDown={(event) => {
            if (event.key === 'Escape' && tagMenuOpen) {
              event.stopPropagation();
              setTagMenuOpen(false);
              tagTriggerRef.current?.focus();
            }
          }}>
            <button ref={tagTriggerRef} type="button"
              className={`places-feed__tag-select-wrap glass-button glass-button--frost${activeTags.length ? ' places-feed__tag-select-wrap--active' : ''}`}
              aria-label={`Filter places by tag: ${activeTags.length} selected`}
              aria-expanded={tagMenuOpen} aria-controls="places-feed-tag-options"
              disabled={availableTags.length === 0} onClick={() => setTagMenuOpen(open => !open)}>
              <span aria-hidden="true">{activeTags.length ? `${activeTags.length} selected` : 'Tag'}</span>
              <span className="places-feed__tag-chevron" aria-hidden="true" />
            </button>
            {tagMenuOpen && <div id="places-feed-tag-options" className="places-feed__tag-options" aria-label="Tags">
              {[undefined, ...availableTags].map(tag => <button type="button" key={tag ?? '__all'}
                className="places-feed__tag-option" aria-pressed={tag ? activeTags.includes(tag) : activeTags.length === 0}
                onClick={() => chooseTag(tag)}>
                <span>{tag ?? 'All tags'}</span><span aria-hidden="true">{tag ? activeTags.includes(tag) ? '✓' : '' : activeTags.length === 0 ? '✓' : ''}</span>
              </button>)}
            </div>}
          </div>
        )}
        {places.length === 0 ? (
          <p className="places-feed__empty">{library
            ? 'No places yet. Add your first place with the button below.'
            : 'No places yet. Add a place through the bot and it will appear in your library.'}</p>
        ) : visiblePlaces.length === 0 ? (
          <p className="places-feed__empty">No places with this tag.</p>
        ) : (
          <ul ref={listRef} className="places-feed__list" aria-label={selecting ? 'Choose places for the envelope' : 'Place list'}>
            {visiblePlaces.map((place) => {
              const picked = selection.includes(place.id);
              const canPick = place.enrichment_status === 'resolved';
              const atCapacity = selecting && canPick && !picked && selection.length >= ENVELOPE_MAX_PLACES;
              return (
              <li key={place.id}>
                <button type="button" className="places-feed__row"
                  aria-label={selecting ? `${picked ? 'Remove from envelope' : canPick ? 'Add to envelope' : 'Open to confirm'}: ${place.name}` : `Open place: ${place.name}`}
                  aria-pressed={selecting ? picked : undefined}
                  disabled={atCapacity}
                  onClick={() => selecting && canPick ? onPickPlace(place) : onOpenPlace(place)}>
                  <span className={`places-feed__thumbnail${selecting && picked ? ' places-feed__thumbnail--picked' : ''}`}>
                    <PlaceThumb src={place.photo_url} name={place.name} seed={place.id} />
                  </span>
                  <span className="places-feed__identity">
                    <span className="places-feed__name">{place.name}</span>
                    <span className="places-feed__address">{place.address || 'No address provided'}</span>
                  </span>
                  {selecting && canPick && <span className={`places-feed__check${picked ? ' places-feed__check--picked' : ''}`} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5 6.5 12 13 4.5" />
                    </svg>
                  </span>}
                </button>
              </li>
              );
            })}
          </ul>
        )}
        {library && (
          <GlassButton className="places-feed__library-action glass-button--frost" onClick={onAddPlace} aria-label="Add place">
            <img src={libraryPlus} width="24" height="24" alt="" />
            <span>Add place</span>
          </GlassButton>
        )}
        {selecting && selection.length > 0 && (
          <GlassButton className="places-feed__create-action glass-button--frost" onClick={onNext}
            aria-label={`Next, places added: ${selection.length}`}>
            <span className="places-feed__added">{placeCount}</span>
            <span className={`places-feed__picked-stack${selection.length === 1 ? ' places-feed__picked-stack--single' : ''}`} aria-hidden="true">
              {selection.slice(-2).map((id) => {
                const place = places.find((item) => item.id === id);
                return place && <span className="places-feed__picked-card" key={id}>
                  <span className="places-feed__picked-card-visual">
                    <PlaceThumb src={place.photo_url} name={place.name} seed={place.id} />
                  </span>
                </span>;
              })}
            </span>
            <span className="places-feed__next">Next</span>
          </GlassButton>
        )}
      </div>
    </div>
  );
}
