import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { PlaceWithCandidates } from '@invite/shared';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import '@invite/shared/styles/theme-dark.css';
import './styles/app.css';
import { togglePlace } from './lib/places.js';
import { Home } from './screens/Home.js';
import { PlacesFeed } from './screens/PlacesFeed.js';
import { AddPlace } from './screens/AddPlace.js';
import { PlaceDetail } from './screens/PlaceDetail.js';
import { EnvelopePreview } from './screens/EnvelopePreview.js';
import firstPhoto from './assets/places-feed/preview-first.jpg';
import secondPhoto from './assets/places-feed/preview-second.png';
import { api, ApiError } from './api.js';

const demoTags = [
  ['Cafe', 'Breakfast'], ['Cafe'], ['Bar'], ['Breakfast'], ['Bar', 'Breakfast'],
  ['Cafe'], ['Bar'], ['Breakfast'], [], [],
];
const samplePlaces: PlaceWithCandidates[] = Array.from({ length: 10 }, (_, index) => {
  const photo = index === 0 ? firstPhoto : index === 1 ? secondPhoto : null;
  return {
    id: `preview-${index + 1}`,
    name: index === 0 ? 'Kooperative Chorny' : index === 1 ? 'Atelier de tartelettes' : `Place ${index + 1}`,
    address: index < 2 ? '5 Lyalin Lane, Moscow' : '',
    district: null,
    category: null,
    photos: photo ? [photo] : [],
    photo_url: photo,
    lat: null,
    lng: null,
    maps_url: null,
    rating: null,
    hours: null,
    note: null,
    tags: demoTags[index] ?? [],
    source: 'manual',
    enrichment_status: 'resolved',
    created_at: '',
    candidates: [],
  };
});

// The downloadable single-file preview runs without the Telegram API.
if (window.location.pathname.endsWith('/invite-offline.html')) {
  api.createPlace = async (body) => ({
    ...samplePlaces[0]!, ...body, id: crypto.randomUUID(),
    photo_url: body.photos[0] ?? null, created_at: new Date().toISOString(), candidates: [],
  });
  api.uploadPhoto = async (file) => ({ source_url: URL.createObjectURL(file) });
  api.createEnvelope = async () => {
    throw new ApiError('This is a local preview. The app server is required to send an envelope.', 'offline');
  };
}

function FeedPreview() {
  const [entry, setEntry] = useState<'create' | 'library' | null>(
    window.location.pathname.endsWith('/home-preview.html') || window.location.pathname.endsWith('/invite-offline.html') ? null : 'create',
  );
  const [composing, setComposing] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [hostNote, setHostNote] = useState('');
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<string[]>([]);
  const [openPlace, setOpenPlace] = useState<PlaceWithCandidates | null>(null);
  const [addingPlace, setAddingPlace] = useState(false);
  const [places, setPlaces] = useState(samplePlaces);
  const offline = window.location.pathname.endsWith('/invite-offline.html');
  const [loadingPlaces, setLoadingPlaces] = useState(!offline);
  const [demoPlaces, setDemoPlaces] = useState(true);

  useEffect(() => {
    if (offline) return;
    let active = true;
    void api.places().then(result => {
      if (!active) return;
      setPlaces(result.places);
      setDemoPlaces(false);
    }).catch(() => {
      // Keep the visual demo available when the local API is unavailable.
    }).finally(() => { if (active) setLoadingPlaces(false); });
    return () => { active = false; };
  }, [offline]);

  const open = (next: 'create' | 'library') => {
    setEntry(next);
    setNotes({});
    setCaptions({});
    setHostNote('');
    setComposing(false);
    setSelection([]);
  };

  const close = () => {
    setEntry(null);
    setComposing(false);
    setSelection([]);
  };

  const pick = (place: PlaceWithCandidates) => {
    setSelection((current) => togglePlace(current, place));
  };

  if (loadingPlaces) return <div className="boot">Loading library…</div>;

  return (
    <div className={`app${composing ? ' app--composing' : ''}`}>
      <div inert={Boolean(entry)}>
        <Home latestPlace={places[0] ?? null} previousPlace={places[1] ?? null} onCreateEnvelope={() => open('create')} onOpenLibrary={() => open('library')} />
      </div>
      {entry && (
        <PlacesFeed
          entry={entry}
          places={places}
          suspended={Boolean(openPlace) || addingPlace || composing}
          selection={selection}
          onClose={close}
          onNext={() => { if (selection.length > 0) setComposing(true); }}
          onAddPlace={() => setAddingPlace(true)}
          onOpenPlace={setOpenPlace}
          onPickPlace={pick}
        />
      )}
      {composing && <EnvelopePreview
        chosen={selection.map((id) => places.find((place) => place.id === id)).filter((place): place is PlaceWithCandidates => Boolean(place))}
        notes={notes} hostNote={hostNote} captions={captions}
          onCaptionChange={(id, caption) => setCaptions(current => ({ ...current, [id]: caption }))} onCancel={() => setComposing(false)} onDone={close}
        sendingUnavailable={demoPlaces ? 'These are demo places. Open the app with your library to send an envelope.' : undefined} />}
      {addingPlace && (
        <AddPlace availableTags={[...new Set(places.flatMap((place) => place.tags))]}
          preview={demoPlaces} onClose={() => setAddingPlace(false)}
          onCreated={(created) => setPlaces((current) => [created, ...current])} />
      )}
      {openPlace && (
        <PlaceDetail key={openPlace.id} preview={demoPlaces} place={openPlace}
          availableTags={[...new Set(places.flatMap((place) => place.tags))]}
          onClose={() => setOpenPlace(null)}
          onSaved={(updated) => {
            setOpenPlace(updated);
            setPlaces((current) => current.map((place) => place.id === updated.id ? updated : place));
          }}
          onDeleted={(id) => setPlaces((current) => current.filter((place) => place.id !== id))} />
      )}
    </div>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
createRoot(root).render(<FeedPreview />);
