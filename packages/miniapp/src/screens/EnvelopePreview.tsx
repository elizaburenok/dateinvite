import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GuestPlace, PlaceWithCandidates } from '@invite/shared';
import { ENVELOPE_MAX_PLACES, ENVELOPE_MIN_PLACES } from '@invite/shared/constants';
import { CardWheel } from '../../../guest/src/components/envelope/CardWheel.js';
import { usePrefersReducedMotion } from '../../../guest/src/components/envelope/usePrefersReducedMotion.js';
import '../../../guest/src/styles/wheel.css';
import { Button } from '../components/Button.js';
import { GlassButton } from '../components/GlassButton.js';
import { PastelBackground } from '../components/PastelBackground.js';
import { api, ApiError } from '../api.js';
import { envelopeNotes } from '../lib/places.js';
import { haptic } from '../telegram.js';
import closeCross from '../assets/places-feed/library-close-cross.svg';
import '../styles/place-detail.css';
import '../styles/envelope-preview.css';

const sendShadow = new URLSearchParams(window.location.search).get('sendShadow') ?? 'none';
const REVEAL_DURATION_MS = 550;
const REVEAL_STAGGER_MS = 350;
const FOOTER_REVEAL_DURATION_MS = 400;

export function EnvelopePreview({ chosen, notes, hostNote, onCancel, onDone, sendingUnavailable, captions, onCaptionChange }: {
  chosen: PlaceWithCandidates[];
  notes: Record<string, string>;
  captions: Record<string, string>;
  onCaptionChange(id: string, caption: string): void;
  hostNote: string;
  onCancel(): void;
  onDone(): void;
  sendingUnavailable?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [ready, setReady] = useState(reducedMotion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const editor = useRef<HTMLDivElement>(null);
  const editOpener = useRef<HTMLElement | null>(null);
  const creating = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const sharePanel = useRef<HTMLDivElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const sendButton = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const places = useMemo<GuestPlace[]>(() => chosen.map(place => ({
    ...place,
    name: captions[place.id] ?? place.name,
    photos: place.photos.length ? place.photos : place.photo_url ? [place.photo_url] : [],
    note: notes[place.id] ?? place.note,
  })), [chosen, notes, captions]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const opener = document.activeElement;
    document.body.style.overflow = 'hidden';
    panel.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(copyTimer.current);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) { setReady(true); return; }
    const timer = setTimeout(() => setReady(true), FOOTER_REVEAL_DURATION_MS + Math.min(chosen.length, 4) * REVEAL_STAGGER_MS);
    return () => clearTimeout(timer);
  }, [reducedMotion, chosen.length]);

  useEffect(() => {
    if (sharing) sharePanel.current?.focus({ preventScroll: true });
  }, [sharing]);

  function closeShare() {
    setSharing(false);
    setShareError(null);
    requestAnimationFrame(() => sendButton.current?.focus());
  }

  function closeEditor() {
    setEditing(null);
    requestAnimationFrame(() => editOpener.current?.focus({ preventScroll: true }));
  }

  async function send() {
    if (link) { setSharing(true); return; }
    if (sendingUnavailable) { setError(sendingUnavailable); return; }
    if (creating.current || chosen.length < ENVELOPE_MIN_PLACES || chosen.length > ENVELOPE_MAX_PLACES) return;
    creating.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await api.createEnvelope(chosen.map(place => place.id), hostNote.trim() || null, envelopeNotes(chosen, notes), captions);
      setLink(result.url);
      setSharing(true);
      haptic('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send envelope. Please try again.');
      haptic('error');
    } finally {
      creating.current = false;
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    setShareError(null);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      haptic('success');
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      linkInput.current?.focus();
      linkInput.current?.select();
      setShareError('Could not copy automatically. The link is selected; copy it manually.');
    }
  }

  async function share() {
    if (!link) return;
    setShareError(null);
    if (!navigator.share) {
      const params = new URLSearchParams({ url: link, text: 'Choose where we’ll go' });
      window.open(`https://t.me/share/url?${params}`, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await navigator.share({ title: 'Invitation', text: 'Choose where we’ll go', url: link });
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        setShareError('Could not open the share menu. Copy the link instead.');
      }
    }
  }

  return <div ref={panel} className="envelope-preview" role="dialog" aria-modal="true"
    aria-label="Envelope preview" tabIndex={-1} data-ready={ready || undefined}
    data-place-count={chosen.length} data-wheel-page data-send-shadow={sendShadow}
    style={{
      '--preview-items': Math.min(chosen.length, 4),
      '--preview-reveal-duration': `${REVEAL_DURATION_MS}ms`,
      '--preview-reveal-stagger': `${REVEAL_STAGGER_MS}ms`,
      '--preview-footer-reveal-duration': `${FOOTER_REVEAL_DURATION_MS}ms`,
    } as CSSProperties}
    onKeyDown={event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (editing) closeEditor(); else if (sharing) closeShare(); else if (!creating.current) onCancel();
      }
      if (event.key !== 'Tab') return;
      const root = editing ? editor.current : sharing ? sharePanel.current : panel.current;
      const controls = root?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, [tabindex="0"]');
      const first = controls?.[0];
      const last = controls?.[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }}>
    <PastelBackground paused={sharing || Boolean(editing)} />
    <div className="envelope-preview__content" inert={sharing || Boolean(editing)}>
      <Button iconOnly size="small" className="envelope-preview__back" aria-label="Back to places"
        disabled={busy} onClick={onCancel}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14.5 5 7.5 12l7 7M8 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>
      <div className="envelope-preview__carousel">
        <CardWheel places={places} selected={null} readOnly radiusRatio={2.5} dealDurationMs={0} state={ready ? 'open' : 'dealing'} onSelect={() => {}}
          renderCardAction={place => <GlassButton iconOnly size="small" className="envelope-preview__edit envelope-preview__action glass-button--frost"
            data-wheel-action disabled={busy} aria-label={`Edit caption: ${place.name}`}
            onClick={event => {
              event.stopPropagation();
              editOpener.current = event.currentTarget;
              setCaptionDraft(place.name);
              setEditing(place.id);
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m14 5 5 5M4 20l5-1L20 8a2.12 2.12 0 0 0-5-3L4 16v4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </GlassButton>} />
      </div>
      <footer className="envelope-preview__footer">
        <h1 className="envelope-preview__title">Your envelope is ready<br />to be sent</h1>
        {error && <p className="envelope-preview__error" role="alert">{error}</p>}
        <GlassButton ref={sendButton} className="envelope-preview__action glass-button--frost" disabled={busy || chosen.length > ENVELOPE_MAX_PLACES}
          onClick={send} aria-busy={busy}>
          {busy ? 'Creating link…' : link ? 'Share envelope' : 'Send envelope'}
        </GlassButton>
      </footer>
    </div>
    {editing && <div className="envelope-preview__scrim envelope-preview__scrim--editor" onClick={closeEditor}>
      <div ref={editor} className="envelope-preview__share envelope-preview__share--editor" role="dialog" aria-modal="true"
        aria-labelledby="caption-editor-title" tabIndex={-1} onClick={event => event.stopPropagation()}>
        <Button iconOnly size="small" className="envelope-preview__share-close" aria-label="Close caption editor" onClick={closeEditor}>
          <img src={closeCross} width="18" height="18" alt="" />
        </Button>
        <h2 id="caption-editor-title">Card caption</h2>
        <label className="place-detail__field place-detail__field--name envelope-preview__caption-field">
          <span>Name</span>
          <input autoFocus maxLength={200} value={captionDraft} onChange={event => setCaptionDraft(event.target.value)} />
        </label>
        <div className="envelope-preview__share-actions">
          <GlassButton className="envelope-preview__action glass-button--frost" disabled={!captionDraft.trim()} onClick={() => {
            onCaptionChange(editing, captionDraft.trim());
            setLink(null);
            closeEditor();
          }}>Save</GlassButton>
        </div>
      </div>
    </div>}
    {sharing && link && <div className="envelope-preview__scrim" onClick={closeShare}>
      <div ref={sharePanel} className="envelope-preview__share" role="dialog" aria-modal="true"
        aria-labelledby="envelope-share-title" tabIndex={-1} onClick={event => event.stopPropagation()}>
        <Button iconOnly size="small" className="envelope-preview__share-close" aria-label="Close link" onClick={closeShare}>×</Button>
        <h2 id="envelope-share-title">Envelope ready</h2>
        <p>Send the link to someone you want to invite.</p>
        <input ref={linkInput} className="envelope-preview__link" aria-label="Envelope link" readOnly value={link} onFocus={event => event.target.select()} />
        <div className="envelope-preview__share-actions">
          <GlassButton className="envelope-preview__action glass-button--frost" onClick={copy}>{copied ? 'Copied' : 'Copy'}</GlassButton>
          <GlassButton className="envelope-preview__action glass-button--frost" onClick={share}>Share</GlassButton>
        </div>
        <span className="visually-hidden" role="status">{copied ? 'Link copied' : ''}</span>
        {shareError && <p className="envelope-preview__error" role="alert">{shareError}</p>}
        <GlassButton className="envelope-preview__done envelope-preview__action glass-button--frost" onClick={onDone}>Done</GlassButton>
      </div>
    </div>}
  </div>;
}
