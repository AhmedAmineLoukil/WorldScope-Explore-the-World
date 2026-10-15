export interface JourneyPhoto { id: string; name: string; src: string }
export const MAX_JOURNEY_PHOTOS = 12;

let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('worldscope-photos', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Photo storage is unavailable. Please try again.'));
    }).catch(error => { database = undefined; throw error; });
  }
  return database;
}

export async function readJourneyPhotos(ids: string[]): Promise<JourneyPhoto[]> {
  if (!ids.length) return [];
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', 'readonly');
    const requests = ids.map(id => transaction.objectStore('photos').get(id));
    transaction.oncomplete = () => resolve(requests.flatMap(request => request.result ? [request.result as JourneyPhoto] : []));
    transaction.onerror = () => reject(new Error('Your photos could not be loaded. Please try again.'));
    transaction.onabort = transaction.onerror;
  });
}

export async function saveJourneyPhotos(photos: JourneyPhoto[]): Promise<void> {
  if (!photos.length) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', 'readwrite');
    photos.forEach(photo => transaction.objectStore('photos').put(photo));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('There is not enough space to save these photos. Remove a few and try again.'));
    transaction.onabort = transaction.onerror;
  });
}

export async function prepareJourneyPhoto(file: File): Promise<JourneyPhoto> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Please choose JPG, PNG, or WebP photos.');
  }
  if (file.size > 15 * 1024 * 1024) throw new Error('Each photo must be smaller than 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error(`“${file.name}” could not be opened. Try another photo.`); });
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo processing is unavailable in this browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { id: crypto.randomUUID(), name: file.name, src: canvas.toDataURL('image/jpeg', 0.84) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
