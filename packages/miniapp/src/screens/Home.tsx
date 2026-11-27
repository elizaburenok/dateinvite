import type { PlaceWithCandidates } from '@invite/shared';
import { LibraryStack } from '../components/LibraryStack.js';
import { PlaceThumb } from '../components/PlaceThumb.js';
import { GlassButton } from '../components/GlassButton.js';
import fallbackPhoto from '../assets/places-feed/preview-first.jpg';
import '../styles/home.css';

interface HomeProps {
  latestPlace: PlaceWithCandidates | null;
  previousPlace?: PlaceWithCandidates | null;
  onCreateEnvelope(): void;
  onOpenLibrary(): void;
}

/** Live saved-place photo and the existing library/invitation entry points. */
export function Home({ latestPlace, previousPlace = null, onCreateEnvelope, onOpenLibrary }: HomeProps) {
  return (
    <main className="home">
      <section className="home__photo-card" aria-label="Places and invitations">
        <div className="home__photo" aria-hidden="true">
          <PlaceThumb src={latestPlace?.photo_url ?? previousPlace?.photo_url ?? fallbackPhoto}
            name={latestPlace?.name ?? ''} seed={latestPlace?.id ?? 'home'} size="lg" />
        </div>
        <button className="home__saved-places home__library-sheet glass-button glass-button--frost" type="button"
          onClick={onOpenLibrary} aria-label="Open place library" aria-haspopup="dialog">
          <span className="home__saved-stack">
            <LibraryStack place={latestPlace} previousPlace={previousPlace} label="Café" pinkLabel />
          </span>
          <span className="glass-button__label">My places</span>
        </button>
        <GlassButton className="home__invitation-action glass-button--frost" onClick={onCreateEnvelope}>
          Create envelope
        </GlassButton>
      </section>
    </main>
  );
}
