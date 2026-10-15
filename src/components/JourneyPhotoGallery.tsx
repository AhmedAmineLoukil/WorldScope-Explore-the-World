import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { readJourneyPhotos } from '../lib/journeyPhotos';
import type { JourneyPhoto } from '../lib/journeyPhotos';

interface Props {
  country: string;
  photoIds: string[];
  photoLibrary: Record<string, JourneyPhoto>;
}

export default function JourneyPhotoGallery({ country, photoIds, photoLibrary }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [loadedPhotos, setLoadedPhotos] = useState<Record<string, JourneyPhoto>>({});
  const [error, setError] = useState('');
  const photos = photoIds.flatMap(id => {
    const photo = photoLibrary[id] || loadedPhotos[id];
    return photo ? [photo] : [];
  });
  const activeIndex = Math.min(selected, Math.max(0, photos.length - 1));
  const current = photos[activeIndex];
  const cover = photoLibrary[photoIds[0]];

  useEffect(() => {
    if (!open || photoIds.every(id => photoLibrary[id])) return;
    let active = true;
    readJourneyPhotos(photoIds).then(items => {
      if (!active) return;
      setLoadedPhotos(Object.fromEntries(items.map(photo => [photo.id, photo])));
      if (items.length !== photoIds.length) setError('Some photos are unavailable on this device.');
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Your photos could not be loaded.');
    });
    return () => { active = false; };
  }, [open, photoIds, photoLibrary]);

  function move(direction: number) {
    setSelected(index => (Math.min(index, photos.length - 1) + direction + photos.length) % photos.length);
  }

  return <Dialog.Root open={open} onOpenChange={value => { setOpen(value); if (value) { setSelected(0); setError(''); } }}>
    <Dialog.Trigger asChild>
      <button type="button" className="journey-memory-cover" aria-label={`View photos from ${country}`}>
        {cover ? <img src={cover.src} alt={`Your memories from ${country}`} /> : <span>Loading photo…</span>}
        <span className="journey-memory-count">{photoIds.length} {photoIds.length === 1 ? 'photo' : 'photos'}</span>
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay journey-gallery-overlay" />
      <Dialog.Content className="journey-gallery" onKeyDown={event => {
        if (photos.length < 2 || event.altKey || event.ctrlKey || event.metaKey) return;
        // Thumbnail buttons retain their normal keyboard focus; arrows browse the photos.
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}>
        <header className="journey-gallery-heading">
          <div><Dialog.Title>{country}, in memories</Dialog.Title><Dialog.Description>{photoIds.length} {photoIds.length === 1 ? 'photo' : 'photos'} from your journey. Choose a thumbnail to take a closer look.</Dialog.Description></div>
          <Dialog.Close className="icon-button" aria-label="Close photo gallery"><X size={20} /></Dialog.Close>
        </header>
        {error && <p className="journey-gallery-error" role="alert">{error}</p>}
        <div className="journey-gallery-stage">
          {current ? <img src={current.src} alt={`Photo ${activeIndex + 1} from ${country}: ${current.name}`} /> : <p role="status">{error ? 'No photos are available.' : 'Loading your photos…'}</p>}
          {photos.length > 1 && <>
            <button type="button" className="journey-gallery-previous" aria-label="Previous photo" onClick={() => move(-1)}><ChevronLeft size={24} /></button>
            <button type="button" className="journey-gallery-next" aria-label="Next photo" onClick={() => move(1)}><ChevronRight size={24} /></button>
          </>}
        </div>
        {!!photos.length && <>
          <p className="journey-gallery-counter" aria-live="polite" aria-atomic="true">Photo {activeIndex + 1} of {photos.length}</p>
          <div className="journey-gallery-thumbnails" role="group" aria-label="Journey photos">
            {photos.map((photo, index) => <button type="button" key={photo.id} aria-label={`View photo ${index + 1} from ${country}`} aria-pressed={index === activeIndex} onClick={() => setSelected(index)}>
              <img src={photo.src} alt="" loading="lazy" />
            </button>)}
          </div>
        </>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
