import { Button } from './components/Button.js';
import { useCallback, useEffect, useState } from 'react';
import type { EnvelopeSummary, PlacesResponse, PlaceWithCandidates } from '@invite/shared';
import { api, ApiError } from './api.js';
import { PlacesFeed } from './screens/PlacesFeed.js';
import { PlaceDetail } from './screens/PlaceDetail.js';
import { EnvelopePreview } from './screens/EnvelopePreview.js';
import { Envelopes } from './screens/Envelopes.js';
import { Home } from './screens/Home.js';
import { PhotoEditor } from './screens/PhotoEditor.js';
import { AddPlace } from './screens/AddPlace.js';
import { togglePlace } from './lib/places.js';
import { haptic } from './telegram.js';

type View = 'home' | 'envelopes';
type FeedEntry = 'create' | 'library';

function withPlaces(current: PlacesResponse, places: PlaceWithCandidates[]): PlacesResponse {
  return {
    ...current,
    places,
    facets: {
      districts: [...new Set(places.flatMap((place) => place.district ? [place.district] : []))].sort(),
      categories: [...new Set(places.flatMap((place) => place.category ? [place.category] : []))].sort(),
      tags: [...new Set(places.flatMap((place) => place.tags))].sort(),
      needs_confirmation_count: places.filter((place) => place.enrichment_status === 'needs_confirmation').length,
    },
  };
}

export function App() {
  const [view, setView] = useState<View>('home');
  const [feedEntry, setFeedEntry] = useState<FeedEntry | null>(null);
  const [places, setPlaces] = useState<PlacesResponse | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeSummary[]>([]);
  const [openPlace, setOpenPlace] = useState<PlaceWithCandidates | null>(null);
  const [addingPlace, setAddingPlace] = useState(false);
  const [composing, setComposing] = useState(false);
  const [editingPhotoStyle, setEditingPhotoStyle] = useState(false);
  const [envelopesError, setEnvelopesError] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [hostNote, setHostNote] = useState('');
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlaces = useCallback(async () => {
    const [data, library] = await Promise.all([api.places(), api.tags()]);
    setPlaces(data);
    setTags(library.tags);
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
            ? 'Open the library through the bot so Telegram can verify your identity.'
            : err instanceof ApiError
              ? err.message
              : 'Could not load the library',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [loadPlaces, loadEnvelopes]);

  const openFeed = (entry: FeedEntry) => {
    setFeedEntry(entry);
    setNotes({});
    setCaptions({});
    setHostNote('');
    setComposing(false);
    setSelection([]);
  };

  const closeFeed = useCallback(() => {
    setFeedEntry(null);
    setComposing(false);
    setSelection([]);
  }, []);

  const openEnvelopes = () => {
    setView('envelopes');
    setEnvelopesError(null);
    void loadEnvelopes().catch(() => setEnvelopesError('Could not refresh envelopes. Please try again.'));
  };

  const continueCompose = () => {
    if (selection.length === 0) return;
    setComposing(true);
  };

  const cancelCompose = () => {
    setComposing(false);
  };

  // В режиме выбора фото отмечается одним нажатием; повторное нажатие снимает выбор.
  const pickPlace = (place: PlaceWithCandidates) => {
    haptic('tap');
    setSelection((current) => togglePlace(current, place));
  };

  if (loading) {
    return <div className="boot">Loading library…</div>;
  }

  if (error || !places) {
    return (
      <div className="boot boot--error">
        <p>{error ?? 'Library unavailable'}</p>
      </div>
    );
  }

  return (
    <div className={`app${composing ? ' app--composing' : ''}`}>
      {view === 'home' && (
        <div inert={Boolean(feedEntry) || composing || editingPhotoStyle}>
          <Home
            latestPlace={places.places[0] ?? null}
            previousPlace={places.places[1] ?? null}
            onCreateEnvelope={() => openFeed('create')}
            onOpenLibrary={() => openFeed('library')}
          />
        </div>
      )}

      {view === 'envelopes' && (
        <div className="screen">
          <Button type="button" className="btn" onClick={() => setView('home')}>
            ← Home
          </Button>
        </div>
      )}

      {view === 'envelopes' && <>
        {envelopesError && <div className="screen" role="alert"><p>{envelopesError}</p>
          <Button className="btn" onClick={openEnvelopes}>Retry</Button></div>}
        <Envelopes envelopes={envelopes} />
      </>}

      {view === 'home' && feedEntry && (
        <PlacesFeed
          entry={feedEntry}
          places={places.places}
          suspended={Boolean(openPlace) || addingPlace || composing}
          selection={selection}
          onClose={closeFeed}
          onNext={continueCompose}
          onAddPlace={() => setAddingPlace(true)}
          onOpenPlace={setOpenPlace}
          onPickPlace={pickPlace}
        />
      )}

      {composing && (
        <EnvelopePreview
          chosen={selection
            .map((id) => places.places.find((place) => place.id === id))
            .filter((place): place is PlaceWithCandidates => Boolean(place))}
          notes={notes} hostNote={hostNote} captions={captions}
          onCaptionChange={(id, caption) => setCaptions(current => ({ ...current, [id]: caption }))}
          onCancel={cancelCompose}
          onDone={() => {
            closeFeed();
            openEnvelopes();
          }}
        />
      )}

      {addingPlace && (
        <AddPlace
          availableTags={tags}
          onClose={() => setAddingPlace(false)}
          onCreated={(created) => {
            setTags((current) => [...new Set([...current, ...created.tags])]);
            setPlaces((current) => current && withPlaces(current, [created, ...current.places]));
          }}
        />
      )}

      {editingPhotoStyle && <PhotoEditor
        sampleUrl={places.places.find((place) => place.photo_url)?.photo_url}
        onClose={() => setEditingPhotoStyle(false)} />}

      {openPlace && (
        <PlaceDetail
          key={openPlace.id}
          place={openPlace}
          availableTags={tags}
          onClose={() => setOpenPlace(null)}
          onSaved={(updated) => {
            setTags((current) => [...new Set([...current, ...updated.tags])]);
            setOpenPlace(updated);
            setPlaces((current) => current && withPlaces(current,
              current.places.map((place) => place.id === updated.id ? updated : place)));
          }}
          onDeleted={(id) => {
            setSelection((current) => current.filter((item) => item !== id));
            setPlaces((current) => current && withPlaces(current,
              current.places.filter((place) => place.id !== id)));
          }}
        />
      )}
    </div>
  );
}
