import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { MAX_JOURNEY_PHOTOS, prepareJourneyPhoto } from '../lib/journeyPhotos';
import type { JourneyPhoto } from '../lib/journeyPhotos';

interface Props {
  photos: JourneyPhoto[];
  onChange: (photos: JourneyPhoto[]) => void;
  onBusyChange: (busy: boolean) => void;
  disabled: boolean;
}

export default function JourneyPhotoPicker({ photos, onChange, onBusyChange, disabled }: Props) {
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setError('');
    if (photos.length + files.length > MAX_JOURNEY_PHOTOS) {
      setError(`You can add up to ${MAX_JOURNEY_PHOTOS} photos per journey.`);
      return;
    }
    setProcessing(true);
    onBusyChange(true);
    try {
      // Process one at a time to keep large phone uploads from exhausting memory.
      const additions: JourneyPhoto[] = [];
      for (const file of files) {
        if (!active.current) return;
        additions.push(await prepareJourneyPhoto(file));
      }
      if (active.current) onChange([...photos, ...additions]);
    } catch (failure) {
      if (active.current) setError(failure instanceof Error ? failure.message : 'These photos could not be added. Please try again.');
    } finally {
      if (active.current) { setProcessing(false); onBusyChange(false); }
    }
  }

  return <fieldset className="journey-photo-picker" disabled={disabled || processing}>
    <legend>Journey photos <span>Optional · {photos.length}/{MAX_JOURNEY_PHOTOS}</span></legend>
    <label className="journey-photo-upload" htmlFor="journey-photos"><ImagePlus size={18} /><span>{processing ? 'Preparing your photos…' : 'Add photos'}</span>
      <input id="journey-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} disabled={photos.length >= MAX_JOURNEY_PHOTOS || disabled || processing} />
    </label>
    <p className="journey-photo-hint">JPG, PNG or WebP, up to 15 MB each. The cover appears on your journey card.</p>
    {!!photos.length && <div className="journey-photo-thumbnails">{photos.map((photo, index) => <div className="journey-photo-thumbnail" key={photo.id}>
      <img src={photo.src} alt={photo.name} />
      <button type="button" className="journey-photo-remove" aria-label={`Remove photo ${index + 1}`} onClick={() => onChange(photos.filter(item => item.id !== photo.id))}><X size={13} /></button>
      <button type="button" className={`journey-photo-cover ${index === 0 ? 'is-cover' : ''}`} aria-label={index === 0 ? `Photo ${index + 1} is the cover` : `Use photo ${index + 1} as cover`} aria-pressed={index === 0} onClick={() => onChange([photo, ...photos.filter(item => item.id !== photo.id)])}>{index === 0 ? 'Cover' : 'Make cover'}</button>
    </div>)}</div>}
    {error && <p className="inline-error" role="alert">{error}</p>}
  </fieldset>;
}
