import { useCallback, useEffect, useState } from 'react';
import { ENVELOPE_MAX_PLACES } from '@invite/shared/constants';
import type { EnvelopeSummary, PlacesResponse, PlaceWithCandidates } from '@invite/shared';
import { api, ApiError } from './api.js';
import { Library } from './screens/Library.js';
import { PlaceDetail } from './screens/PlaceDetail.js';
import { AddPlace } from './screens/AddPlace.js';
import { ComposeDrawer, PlaceNoteEditor } from './screens/Compose.js';
import { Envelopes } from './screens/Envelopes.js';
import { haptic } from './telegram.js';

type View = 'library' | 'envelopes';

export function App() {
  const [view, setView] = useState<View>('library');
  const [places, setPlaces] = useState<PlacesResponse | null>(null);
  const [envelopes, setEnvelopes] = useState<EnvelopeSummary[]>([]);
  const [openPlace, setOpenPlace] = useState<PlaceWithCandidates | null>(null);
  // Открыт лист ручного добавления места.
  const [adding, setAdding] = useState(false);
  const [composing, setComposing] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  // Заметки к местам этого конверта по id места. Набираются на фазе выбора,
  // в библиотеку (place.note) не пишутся — снимок делает бэкенд при сборке.
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Место, чей лист заметки открыт поверх выбора. null — лист закрыт.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlaces = useCallback(async () => {
    const data = await api.places();
    setPlaces(data);
    return data;
  }, []);

  const loadEnvelopes = useCallback(async () => {
    const data = await api.envelopes();
    setEnvelopes(data.envelopes);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadPlaces(), loadEnvelopes()]);
      } catch (err) {
        setError(
          err instanceof ApiError && err.code === 'unauthorized'
            ? 'Откройте библиотеку через бота — так Telegram подтвердит, что это вы.'
            : err instanceof ApiError
              ? err.message
              : 'Не удалось загрузить библиотеку',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [loadPlaces, loadEnvelopes]);

  const startCompose = () => {
    setComposing(true);
    setSelection([]);
    setNotes({});
    setEditingId(null);
  };

  const cancelCompose = () => {
    setComposing(false);
    setSelection([]);
    setNotes({});
    setEditingId(null);
  };

  // Тап по месту в режиме сборки — открыть его лист заметки (добавить/поправить),
  // а не молча переключить выбор: заметку пишем в момент выбора места.
  const pickPlace = (place: PlaceWithCandidates) => {
    haptic('tap');
    setEditingId(place.id);
  };

  const editingPlace = editingId
    ? (places?.places.find((place) => place.id === editingId) ?? null)
    : null;

  const saveNote = (id: string, note: string) => {
    setNotes((prev) => ({ ...prev, [id]: note }));
    setSelection((current) =>
      current.includes(id)
        ? current
        : // Сверх лимита не набираем — но кнопка «Добавить» там уже заблокирована.
          current.length >= ENVELOPE_MAX_PLACES
          ? current
          : [...current, id],
    );
    haptic('success');
    setEditingId(null);
  };

  const removeFromEnvelope = (id: string) => {
    setSelection((current) => current.filter((item) => item !== id));
    setNotes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEditingId(null);
  };

  if (loading) {
    return <div className="boot">Загружаем библиотеку…</div>;
  }

  if (error || !places) {
    return (
      <div className="boot boot--error">
        <p>{error ?? 'Библиотека недоступна'}</p>
      </div>
    );
  }

  return (
    <div className={`app${composing ? ' app--composing' : ''}`}>
      <header className="top">
        <nav className="top__nav">
          <button
            type="button"
            className={`top__tab${view === 'library' ? ' top__tab--on' : ''}`}
            onClick={() => setView('library')}
          >
            Места
          </button>
          <button
            type="button"
            className={`top__tab${view === 'envelopes' ? ' top__tab--on' : ''}`}
            onClick={() => {
              setView('envelopes');
              void loadEnvelopes();
            }}
          >
            Конверты
          </button>
        </nav>
      </header>

      {view === 'library' ? (
        <Library
          data={places}
          selection={selection}
          composing={composing}
          onOpenPlace={setOpenPlace}
          onPickPlace={pickPlace}
          onAddPlace={() => setAdding(true)}
        />
      ) : (
        <Envelopes envelopes={envelopes} />
      )}

      {view === 'library' && !composing && (
        <button type="button" className="btn btn--primary fab" onClick={startCompose}>
          Собрать конверт
        </button>
      )}

      {composing && !editingPlace && (
        <ComposeDrawer
          chosen={selection
            .map((id) => places.places.find((place) => place.id === id))
            .filter((place): place is PlaceWithCandidates => Boolean(place))}
          notes={notes}
          onCancel={cancelCompose}
          onDone={() => {
            cancelCompose();
            void loadEnvelopes();
            setView('envelopes');
          }}
        />
      )}

      {composing && editingPlace && (
        <PlaceNoteEditor
          key={editingPlace.id}
          place={editingPlace}
          initialNote={notes[editingPlace.id] ?? editingPlace.note ?? ''}
          picked={selection.includes(editingPlace.id)}
          atCapacity={selection.length >= ENVELOPE_MAX_PLACES}
          onSave={(note) => saveNote(editingPlace.id, note)}
          onRemove={() => removeFromEnvelope(editingPlace.id)}
          onClose={() => setEditingId(null)}
        />
      )}

      {adding && (
        <AddPlace
          availableTags={places.facets.tags}
          onClose={() => setAdding(false)}
          onCreated={() => {
            void loadPlaces();
          }}
        />
      )}

      {openPlace && (
        <PlaceDetail
          place={openPlace}
          onClose={() => setOpenPlace(null)}
          onSaved={(updated) => {
            setOpenPlace(updated);
            void loadPlaces();
          }}
          onDeleted={(id) => {
            setSelection((current) => current.filter((item) => item !== id));
            void loadPlaces();
          }}
        />
      )}
    </div>
  );
}
