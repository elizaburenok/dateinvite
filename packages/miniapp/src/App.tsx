import { useCallback, useEffect, useState } from 'react';
import { ENVELOPE_MAX_PLACES } from '@invite/shared/constants';
import type { EnvelopeSummary, PlacesResponse, PlaceWithCandidates } from '@invite/shared';
import { api, ApiError } from './api.js';
import { Library } from './screens/Library.js';
import { PlaceDetail } from './screens/PlaceDetail.js';
import { Compose } from './screens/Compose.js';
import { Envelopes } from './screens/Envelopes.js';
import { haptic } from './telegram.js';

type View = 'library' | 'envelopes';

export function App() {
  const [view, setView] = useState<View>('library');
  const [places, setPlaces] = useState<PlacesResponse | null>(null);
  const [envelopes, setEnvelopes] = useState<EnvelopeSummary[]>([]);
  const [openPlace, setOpenPlace] = useState<PlaceWithCandidates | null>(null);
  const [composing, setComposing] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
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

  const toggleSelect = (id: string) => {
    haptic('tap');
    setSelection((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : // Сверх лимита не даём набрать прямо в интерфейсе — не ждём отказа сервера.
          current.length >= ENVELOPE_MAX_PLACES
          ? current
          : [...current, id],
    );
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
          onToggleSelect={toggleSelect}
        />
      ) : (
        <Envelopes envelopes={envelopes} />
      )}

      {view === 'library' && !composing && (
        <button
          type="button"
          className="btn btn--primary fab"
          onClick={() => {
            setComposing(true);
            setSelection([]);
          }}
        >
          Собрать конверт
        </button>
      )}

      {composing && (
        <Compose
          places={places.places}
          selection={selection}
          onCancel={() => {
            setComposing(false);
            setSelection([]);
          }}
          onDone={() => {
            setComposing(false);
            setSelection([]);
            void loadEnvelopes();
            setView('envelopes');
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
