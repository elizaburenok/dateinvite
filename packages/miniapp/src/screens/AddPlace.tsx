import { useMemo, useState } from 'react';
import type { PlaceWithCandidates } from '@invite/shared';
import { api, ApiError } from '../api.js';
import { useSheetClose } from '../hooks/useSheetClose.js';
import { haptic } from '../telegram.js';

interface AddPlaceProps {
  /** Теги, уже живущие в библиотеке — их предлагаем чипами, чтобы не плодить дубли. */
  availableTags: string[];
  onCreated(place: PlaceWithCandidates): void;
  onClose(): void;
}

/**
 * Ручное добавление места (§10.2). Тот же лист-карточка, что и у {@link PlaceDetail},
 * только пустой: хост вводит место, которого нет в постах и на Картах. Бэкенд помечает
 * его source: 'manual' и сразу resolved — подтверждать нечего, это уже правда хоста.
 */
export function AddPlace({ availableTags, onCreated, onClose }: AddPlaceProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  // Выбранные теги. Вводим только через чипы: существующие — тапом, новые — из поля ниже.
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { closing, requestClose, onAnimationEnd } = useSheetClose(onClose);

  const canSave = name.trim().length > 0 && !busy;

  const has = (tag: string) =>
    selectedTags.some((item) => item.toLowerCase() === tag.toLowerCase());

  // Чипы = теги библиотеки плюс только что добавленные вручную, без дублей (по регистру).
  const chips = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const tag of [...availableTags, ...selectedTags]) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(tag);
      }
    }
    return out;
  }, [availableTags, selectedTags]);

  const toggleTag = (tag: string) =>
    setSelectedTags((current) =>
      current.some((item) => item.toLowerCase() === tag.toLowerCase())
        ? current.filter((item) => item.toLowerCase() !== tag.toLowerCase())
        : [...current, tag],
    );

  // Новый тег из поля: добавляем в выбранные (если ещё нет) и чистим поле.
  const addNewTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    if (!has(tag)) setSelectedTags((current) => [...current, tag]);
    setNewTag('');
  };

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      // Незакоммиченный текст в поле нового тега тоже учитываем — без лишнего Enter.
      const pending = newTag.trim();
      const tags = pending && !has(pending) ? [...selectedTags, pending] : selectedTags;
      const created = await api.createPlace({
        name: name.trim(),
        address: address.trim(),
        district: district.trim() || null,
        category: category.trim() || null,
        note: note.trim() || null,
        tags,
        maps_url: mapsUrl.trim() || null,
        // Координаты и фото вручную не вводим — резолвер их не строит для manual-мест.
        lat: null,
        lng: null,
        photos: [],
      });
      haptic('success');
      onCreated(created);
      requestClose();
    } catch (err) {
      haptic('error');
      setError(err instanceof ApiError ? err.message : 'Не получилось сохранить место');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`sheet${closing ? ' sheet--closing' : ''}`}
      role="dialog"
      aria-label="Новое место"
      onAnimationEnd={onAnimationEnd}
    >
      <div className="sheet__head">
        <button type="button" className="sheet__close" onClick={requestClose} aria-label="Закрыть">
          ←
        </button>
        <span className="sheet__title">Новое место</span>
      </div>

      <div className="sheet__body">
        <label className="label" htmlFor="add-name">
          Название
        </label>
        <input
          id="add-name"
          className="field"
          autoFocus
          placeholder="Frangipani"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label className="label" htmlFor="add-address">
          Адрес — по желанию
        </label>
        <input
          id="add-address"
          className="field"
          placeholder="ул. Рубинштейна, 15"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />

        <label className="label" htmlFor="add-district">
          Район — по желанию
        </label>
        <input
          id="add-district"
          className="field"
          placeholder="Центральный"
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
        />

        <label className="label" htmlFor="add-category">
          Категория — по желанию
        </label>
        <input
          id="add-category"
          className="field"
          placeholder="Кофейня"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />

        <label className="label" htmlFor="add-note">
          Почему сюда — по желанию
        </label>
        <textarea
          id="add-note"
          className="field field--area"
          rows={3}
          maxLength={500}
          placeholder="тут сырники топ и тихо по утрам"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <p className="hint">Эту строку увидит гость — она важнее адреса и рейтинга.</p>

        <span className="label">Теги — по желанию</span>
        {chips.length > 0 && (
          <div className="tagpick" role="group" aria-label="Теги">
            {chips.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`chip${has(tag) ? ' chip--on' : ''}`}
                aria-pressed={has(tag)}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <input
          id="add-tags"
          className="field"
          placeholder={chips.length > 0 ? 'Свой тег и Enter' : 'утро, свидание, работа'}
          value={newTag}
          onChange={(event) => setNewTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              addNewTag();
            }
          }}
          onBlur={addNewTag}
        />

        <label className="label" htmlFor="add-maps">
          Ссылка на Карты — по желанию
        </label>
        <input
          id="add-maps"
          className="field"
          type="url"
          inputMode="url"
          placeholder="https://yandex.ru/maps/..."
          value={mapsUrl}
          onChange={(event) => setMapsUrl(event.target.value)}
        />

        {error && <p className="error">{error}</p>}
      </div>

      <div className="sheet__foot">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={requestClose}>
          Отмена
        </button>
        <button type="button" className="btn btn--primary" disabled={!canSave} onClick={save}>
          {busy ? 'Сохраняем…' : 'Добавить место'}
        </button>
      </div>
    </div>
  );
}
