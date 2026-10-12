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
    operation.current = new AbortController();
    return () => { operation.current.abort(); loadVersion.current++; };
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
        if (version === loadVersion.current) setError(err instanceof Error ? err.message : 'Не удалось загрузить фотографию');
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
      setError('Выберите JPEG, PNG или WebP до 10 МБ'); return;
    }
    setLoading(true);
    const url = URL.createObjectURL(file);
    try {
      const image = await loadPhoto(url);
      if (version !== loadVersion.current) { URL.revokeObjectURL(url); return; }
      setSource({ image, url, file });
    } catch (err) {
      URL.revokeObjectURL(url);
      if (version === loadVersion.current) setError(err instanceof Error ? err.message : 'Файл повреждён');
    } finally { if (version === loadVersion.current) setLoading(false); }
  }

  function change<K extends keyof HalftoneSettings>(key: K, value: HalftoneSettings[K]) {
    setSettings((previous) => ({ ...previous, [key]: value })); setNotice(''); setError('');
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Не получилось сохранить'); }
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
    setNotice(`PNG готов: ${canvas.width} × ${canvas.height} px`);
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
    ['cellSize', 'Размер ячейки', 3, 24, 1, 'px'],
    ['dotScale', 'Размер точек', 0.3, 1.5, 0.05, '×'],
    ['contrast', 'Контраст', -50, 50, 1, ''],
    ['brightness', 'Яркость', -50, 50, 1, ''],
  ] as const;

  return (
    <div className="sheet photo-editor" role="dialog" aria-modal="true" aria-label="Точечная графика"
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
        <button ref={closeButton} className="sheet__close" type="button" aria-label="Закрыть редактор" disabled={busy} onClick={onClose}>←</button>
        <span className="sheet__title">Точечная графика</span>
      </div>
      <div className="sheet__body photo-editor__body">
        <section className="photo-editor__image">
          <div className="photo-editor__preview" aria-busy={loading || rendering}>
            {source && (original || preview) ? <img src={original ? source.url : preview} alt={original ? 'Исходная фотография' : 'Фотография в точечной графике'} /> : <p>{loading ? 'Загружаем…' : 'Выберите фотографию для предпросмотра'}</p>}
          </div>
          <div className="photo-editor__caption">
            <span>{source ? `${source.image.naturalWidth} × ${source.image.naturalHeight} px` : 'JPEG, PNG, WebP · до 10 МБ'}</span>
            <span role="status">{rendering && source ? 'Обрабатываем…' : 'Мягкий растр на бумаге'}</span>
          </div>
          <div className="photo-editor__actions">
            <button type="button" className="btn" disabled={busy || loading} onClick={() => fileInput.current?.click()}>Загрузить фото</button>
            <button type="button" className="btn" disabled={!source} aria-pressed={original} onClick={() => setOriginal(!original)}>{original ? 'Показать растр' : 'Показать оригинал'}</button>
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Загрузить фотографию" hidden onChange={(event) => { void chooseFile(event.target.files?.[0]); event.target.value = ''; }} />
          {place && place.photos.length > 1 && <label className="photo-editor__select">Фотография<select disabled={busy || loading} value={photoIndex} onChange={(event) => setPhotoIndex(Number(event.target.value))}>{place.photos.map((_, i) => <option key={i} value={i}>Фото {i + 1}</option>)}</select></label>}
        </section>
        <section className="photo-editor__controls" aria-label="Настройки растра">
          <fieldset disabled={busy || loading}>
            <legend>Растр</legend>
            <div className="photo-editor__modes">
              <button type="button" aria-pressed={settings.rasterStyle === 'grid'} onClick={() => change('rasterStyle', 'grid')}>Ровная сетка</button>
              <button type="button" aria-pressed={settings.rasterStyle === 'scatter'} onClick={() => change('rasterStyle', 'scatter')}>Рассеянный</button>
            </div>
            {sliders.map(([key, label, min, max, step, suffix]) => <label className="photo-editor__slider" key={key}><span>{label}<output>{settings[key]}{suffix}</output></span><input type="range" min={min} max={max} step={step} value={settings[key]} onChange={(event) => change(key, Number(event.target.value))} /></label>)}
            <div className="photo-editor__colors">
              <label>Фон<input type="color" value={settings.paperColor} onChange={(event) => change('paperColor', event.target.value)} /></label>
              <label>Точки<input type="color" value={settings.dotColor} onChange={(event) => change('dotColor', event.target.value)} /></label>
            </div>
            <label className="photo-editor__toggle"><input type="checkbox" checked={settings.paperGrain} onChange={(event) => change('paperGrain', event.target.checked)} />Бумажная текстура</label>
            {settings.paperGrain && <label className="photo-editor__slider"><span>Интенсивность текстуры<output>{settings.grainOpacity}</output></span><input type="range" min="0" max="40" value={settings.grainOpacity} onChange={(event) => change('grainOpacity', Number(event.target.value))} /></label>}
            <button type="button" className="btn btn--ghost" onClick={() => { setSettings({ ...DEFAULT_HALFTONE }); setNotice(''); }}>Сбросить настройки</button>
          </fieldset>
          <p className="hint">Новые фотографии из бота обрабатываются автоматически. Оригиналы сохраняются.</p>
          <button className="btn" type="button" disabled={busy || loading} onClick={() => void run(async () => { await api.savePhotoStyle(settings); setNotice('Стиль сохранён для всех новых фотографий'); })}>Использовать для новых фото</button>
          {error && <p className="error" role="alert">{error}</p>}
          {notice && <p className="photo-editor__notice" role="status">{notice}</p>}
        </section>
      </div>
      <div className="sheet__foot">
        <button className="btn" type="button" disabled={!source || busy || loading || rendering} onClick={() => void run(exportPng)}>{busy ? 'Сохраняем…' : 'Скачать PNG'}</button>
        {place && <button className="btn btn--primary" type="button" disabled={!source || busy || loading || rendering} onClick={() => void run(apply)}>Применить к месту</button>}
      </div>
    </div>
  );
}
