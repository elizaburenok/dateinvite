import { createRoot } from 'react-dom/client';
import type { PlaceWithCandidates } from '@invite/shared';
import '@invite/shared/styles/tokens.css';
import '@invite/shared/styles/base.css';
import '@invite/shared/styles/theme-dark.css';
import './styles/app.css';
import { Home } from './screens/Home.js';
import { PlacesFeed } from './screens/PlacesFeed.js';
import { AddPlace } from './screens/AddPlace.js';
import { PlaceDetail } from './screens/PlaceDetail.js';
import { EnvelopePreview } from './screens/EnvelopePreview.js';
import { PhotoEditor } from './screens/PhotoEditor.js';
import { Envelopes } from './screens/Envelopes.js';
import { Button } from './components/Button.js';
import firstPhoto from './assets/places-feed/preview-first.jpg';
import secondPhoto from './assets/places-feed/preview-second.png';

const names = ['Kooperative Chorny', 'Atelier de tartelettes', 'Muse', 'Blanc', 'Surf Coffee'];
const places: PlaceWithCandidates[] = names.map((name, index) => ({
  id: `figma-${index}`, name,
  address: index === 0 ? '5 Lyalin Lane, Moscow' : index === 1 ? '12 Bolshaya Nikitskaya, Moscow' : 'Moscow',
  district: null, category: null,
  photos: [index % 2 ? secondPhoto : firstPhoto], photo_url: index % 2 ? secondPhoto : firstPhoto,
  lat: null, lng: null, maps_url: null, rating: null, hours: null, note: null,
  tags: index % 2 ? ['Breakfast'] : ['Cafe'], source: 'manual',
  enrichment_status: 'resolved', created_at: '', candidates: [],
}));
const screen = new URLSearchParams(location.search).get('screen') ?? 'home';
const noop = () => {};

function Screen() {
  return <div className="app">
    {screen === 'envelopes'
      ? <><div className="screen"><Button type="button" className="btn">← Home</Button></div><Envelopes envelopes={[]} /></>
      : <Home latestPlace={places[0]!} previousPlace={places[1]!}
          onCreateEnvelope={noop} onOpenLibrary={noop} />}
    {(screen === 'library' || screen === 'picker' || screen === 'picker-selected') &&
      <PlacesFeed entry={screen === 'library' ? 'library' : 'create'} places={places}
        suspended={false} selection={screen === 'picker-selected' ? [places[0]!.id, places[1]!.id] : []}
        onClose={noop} onNext={noop} onAddPlace={noop} onOpenPlace={noop} onPickPlace={noop} />}
    {screen === 'detail' && <PlaceDetail place={places[0]!} availableTags={['Cafe', 'Breakfast']}
      preview onClose={noop} onSaved={noop} onDeleted={noop} />}
    {screen === 'add' && <AddPlace availableTags={['Cafe', 'Breakfast']}
      preview onClose={noop} onCreated={noop} />}
    {screen === 'preview' && <EnvelopePreview chosen={places.slice(0, 3)} notes={{}}
      hostNote="" captions={{}} onCaptionChange={noop} onCancel={noop} onDone={noop}
      sendingUnavailable="Preview only" />}
    {screen === 'photo-editor' && <PhotoEditor sampleUrl={firstPhoto} onClose={noop} />}
  </div>;
}

createRoot(document.getElementById('root')!).render(<Screen />);
