import { Button } from '../components/Button.js';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_HALFTONE, MAX_PHOTO_BYTES, type HalftoneSettings, type PlaceWithCandidates } from '@invite/shared';
import { api } from '../api.js';
import { canvasPng, loadPhoto, processPhoto } from '../lib/halftone.js';
import '../styles/photo-editor.css';

interface Props {
  place?: PlaceWithCandidates;
  sampleUrl?: string | null;
  onSaved?(place: PlaceWithCandidates): void;
  onClose(): void;
}

export function PhotoEditor({ place, sampleUrl, onSaved, onClose }: Props) {
  const [settings, setSettings] = useState<HalftoneSettings>({ ...DEFAULT_HALFTONE });
  const [source, setSource] = useState<{ image: HTMLImageElement; url: string; file?: File } | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [preview, setPreview] = useState('');
  const [original, setOriginal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const loadVersion = useRef(0);
  const operation = useRef(new AbortController());

  useEffect(() => {
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    operation.current = new AbortController();
    return () => {
      document.body.style.overflow = previousOverflow;
      operation.current.abort();
      loadVersion.current++;
    };
  }, []);

  const selectedUrl = place?.photos[photoIndex] ?? sampleUrl;
  useEffect(() => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError('');
    setSource(null);
    void (async () => {
      try {
        const defaults = await api.photoStyle();
        if (version !== loadVersion.current) return;
        setSettings(defaults);
        if (selectedUrl) {
          const saved = await api.photoSource(selectedUrl);
          const image = await loadPhoto(saved.source_url);
          if (version !== loadVersion.current) return;
          setSource({ image, url: saved.source_url });
          if (place && selectedUrl.includes('.halftone-')) setSettings(saved.settings);
        }
      } catch (err) {
        if (version === loadVersion.current) setError(err instanceof Error ? err.message : 'Could not load photo');
      } finally { if (version === loadVersion.current) setLoading(false); }
    })();
    return () => { loadVersion.current++; };
  }, [selectedUrl, place?.id]);

  useEffect(() => {
    if (!source) { setPreview(''); return; }
    const controller = new AbortController();
    let objectUrl = '';
    setRendering(true);
    const timer = window.setTimeout(() => {
      void processPhoto(source.image, settings, true, controller.signal)
        .then(canvasPng)
        .then((blob) => {
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(blob);
          setPreview(objectUrl);
          setRendering(false);
        })
        .catch((err: Error) => {
          if (controller.signal.aborted) return;
          setError(err.message); setRendering(false);
        });
    }, 120);
    return () => { clearTimeout(timer); controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [source, settings]);

  useEffect(() => () => { if (source?.file) URL.revokeObjectURL(source.url); }, [source]);

  async function chooseFile(file?: File) {
    if (!file) return;
    const version = ++loadVersion.current;
    setError(''); setNotice('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_PHOTO_BYTES) {
      setError('Choose a JPEG, PNG, or WebP image under 10 MB'); return;
    }
    setLoading(true);
    const url = URL.createObjectURL(file);
    try {
      const image = await loadPhoto(url);
      if (version !== loadVersion.current) { URL.revokeObjectURL(url); return; }
      setSource({ image, url, file });
    } catch (err) {
      URL.revokeObjectURL(url);
      if (version === loadVersion.current) setError(err instanceof Error ? err.message : 'File is damaged');
    } finally { if (version === loadVersion.current) setLoading(false); }
  }

  function change<K extends keyof HalftoneSettings>(key: K, value: HalftoneSettings[K]) {
    setSettings((previous) => ({ ...previous, [key]: value })); setNotice(''); setError('');
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not save'); }
    finally { setBusy(false); }
  }
  async function exportPng() {
    if (!source) return;
    const canvas = await processPhoto(source.image, settings, false, operation.current.signal);
    const blob = await canvasPng(canvas);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'paper-halftone.png'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setNotice(`PNG ready: ${canvas.width} × ${canvas.height} px`);
  }
  async function apply() {
    if (!source || !place) return;
    const sourceUrl = source.file ? (await api.uploadPhoto(source.file)).source_url : source.url;
    const rendered = await api.renderPhoto(sourceUrl, settings);
    const photos = [...place.photos];
    photos[photoIndex] = rendered.photo_url;
    onSaved?.(await api.updatePlace(place.id, { photos }));
    onClose();
  }

  const sliders = [
    ['cellSize', 'Cell size', 3, 24, 1, 'px'],
    ['dotScale', 'Dot size', 0.3, 1.5, 0.05, '×'],
    ['contrast', 'Contrast', -50, 50, 1, ''],
    ['brightness', 'Brightness', -50, 50, 1, ''],
  ] as const;

  return (
    <div className="sheet photo-editor" role="dialog" aria-modal="true" aria-label="Halftone"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); }
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([hidden]), select:not(:disabled)'))
          .filter((element) => element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <div className="sheet__head">
        <Button iconOnly size="small" ref={closeButton} className="sheet__close" type="button" aria-label="Close editor" disabled={busy} onClick={onClose}>←</Button>
        <span className="sheet__title">Halftone</span>
      </div>
      <div className="sheet__body photo-editor__body">
        <section className="photo-editor__image">
          <div className="photo-editor__preview" aria-busy={loading || rendering}>
            {source && (original || preview) ? <img src={original ? source.url : preview} alt={original ? 'Original photo' : 'Halftone photo'} /> : <p>{loading ? 'Loading…' : 'Choose a photo to preview'}</p>}
          </div>
          <div className="photo-editor__caption">
            <span>{source ? `${source.image.naturalWidth} × ${source.image.naturalHeight} px` : 'JPEG, PNG, WebP · up to 10 MB'}</span>
            <span role="status">{rendering && source ? 'Processing…' : 'Soft halftone on paper'}</span>
          </div>
          <div className="photo-editor__actions">
            <Button type="button" className="btn" disabled={busy || loading} onClick={() => fileInput.current?.click()}>Upload photo</Button>
            <Button type="button" className="btn" disabled={!source} aria-pressed={original} onClick={() => setOriginal(!original)}>{original ? 'Show halftone' : 'Show original'}</Button>
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload photo" hidden onChange={(event) => { void chooseFile(event.target.files?.[0]); event.target.value = ''; }} />
          {place && place.photos.length > 1 && <label className="photo-editor__select">Photo<select disabled={busy || loading} value={photoIndex} onChange={(event) => setPhotoIndex(Number(event.target.value))}>{place.photos.map((_, i) => <option key={i} value={i}>Photo {i + 1}</option>)}</select></label>}
        </section>
        <section className="photo-editor__controls" aria-label="Halftone settings">
          <fieldset disabled={busy || loading}>
            <legend>Halftone</legend>
            <div className="photo-editor__modes">
              <Button type="button" aria-pressed={settings.rasterStyle === 'grid'} onClick={() => change('rasterStyle', 'grid')}>Even grid</Button>
              <Button type="button" aria-pressed={settings.rasterStyle === 'scatter'} onClick={() => change('rasterStyle', 'scatter')}>Scattered</Button>
            </div>
            {sliders.map(([key, label, min, max, step, suffix]) => <label className="photo-editor__slider" key={key}><span>{label}<output>{settings[key]}{suffix}</output></span><input type="range" min={min} max={max} step={step} value={settings[key]} onChange={(event) => change(key, Number(event.target.value))} /></label>)}
            <div className="photo-editor__colors">
              <label>Background<input type="color" value={settings.paperColor} onChange={(event) => change('paperColor', event.target.value)} /></label>
              <label>Dots<input type="color" value={settings.dotColor} onChange={(event) => change('dotColor', event.target.value)} /></label>
            </div>
            <label className="photo-editor__toggle"><input type="checkbox" checked={settings.paperGrain} onChange={(event) => change('paperGrain', event.target.checked)} />Paper texture</label>
            {settings.paperGrain && <label className="photo-editor__slider"><span>Texture intensity<output>{settings.grainOpacity}</output></span><input type="range" min="0" max="40" value={settings.grainOpacity} onChange={(event) => change('grainOpacity', Number(event.target.value))} /></label>}
            <Button type="button" className="btn btn--ghost" onClick={() => { setSettings({ ...DEFAULT_HALFTONE }); setNotice(''); }}>Reset settings</Button>
          </fieldset>
          <p className="hint">New photos from the bot are processed automatically. Originals are preserved.</p>
          <Button className="btn" type="button" disabled={busy || loading} onClick={() => void run(async () => { await api.savePhotoStyle(settings); setNotice('Style saved for all new photos'); })}>Use for new photos</Button>
          {error && <p className="error" role="alert">{error}</p>}
          {notice && <p className="photo-editor__notice" role="status">{notice}</p>}
        </section>
      </div>
      <div className="sheet__foot">
        <Button className="btn" type="button" disabled={!source || busy || loading || rendering} onClick={() => void run(exportPng)}>{busy ? 'Saving…' : 'Download PNG'}</Button>
        {place && <Button className="btn btn--primary" type="button" disabled={!source || busy || loading || rendering} onClick={() => void run(apply)}>Apply to place</Button>}
      </div>
    </div>
  );
}
