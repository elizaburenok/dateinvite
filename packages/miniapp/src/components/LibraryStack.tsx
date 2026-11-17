import { useEffect, useState } from 'react';
import { DEFAULT_HALFTONE, type PlaceWithCandidates } from '@invite/shared';
import { loadPhoto, processPhoto, canvasPng } from '../lib/halftone.js';
import { PlaceThumb } from './PlaceThumb.js';
import { LocationsLabel } from './LocationsLabel.js';

type StackPlace = Pick<PlaceWithCandidates, 'id' | 'name' | 'photo_url'>;

/** Reuse the photo editor renderer without changing the saved library photo. */
function PinkThumb({ place }: { place: StackPlace }) {
  const [processed, setProcessed] = useState<{ source: string; url: string } | null>(null);
  useEffect(() => {
    if (!place.photo_url) return;
    const source = place.photo_url;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void (async () => {
      try {
        const image = await loadPhoto(source);
        if (controller.signal.aborted) return;
        const canvas = await processPhoto(image, {
          ...DEFAULT_HALFTONE, paperColor: '#fff6fb', dotColor: '#ea82b5',
        }, true, controller.signal);
        const blob = await canvasPng(canvas);
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setProcessed({ source, url: objectUrl });
      } catch {
        // Keep the tinted photo if its host disallows canvas pixel access.
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [place.photo_url]);
  const ready = processed?.source === place.photo_url;
  return <span className={ready ? 'home__stack-pink' : 'home__stack-pink home__stack-pink--fallback'}>
    <PlaceThumb src={ready ? processed!.url : place.photo_url} name={place.name} seed={place.id} size="lg" />
  </span>;
}

export function LibraryStack({ place, previousPlace = null, animated = false, variant = 'library', label, pinkLabel = false }: {
  place: StackPlace | null;
  previousPlace?: StackPlace | null;
  animated?: boolean;
  variant?: 'library' | 'create';
  label?: string;
  pinkLabel?: boolean;
}) {
  return (
    <span className={`home__library-stack${animated ? ' home__library-stack--fan' : ''}${variant === 'create' ? ' home__library-stack--create' : ''}`} aria-hidden="true">
      <span className="home__library-back">
        {variant === 'create' && previousPlace && <PinkThumb place={previousPlace} />}
      </span>
      {variant === 'library' && <LocationsLabel label={label} pinkText={pinkLabel} />}
      <span className="home__library-front">
        {place && <PlaceThumb src={place.photo_url} name={place.name} seed={place.id} size="lg" />}
      </span>
    </span>
  );
}
