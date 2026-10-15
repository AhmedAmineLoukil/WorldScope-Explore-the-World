import type { Visit } from '../components/TravelLog';
import type { JourneyPhoto } from './journeyPhotos';

interface JournalData {
  visits: Visit[];
  photos: JourneyPhoto[];
  wishlist: string[];
  countryCount: number;
  continentCount: number;
  totalDays: number;
  createdOn: string;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[character] || character);
const dateLabel = (date: string) => new Intl.DateTimeFormat('en', { month:'short', day:'numeric', year:'numeric' }).format(new Date(date + 'T12:00:00'));

export function travelJournalHtml(data: JournalData) {
  const photos = new Map(data.photos.map(photo => [photo.id, photo]));
  const journeys = data.visits.map(visit => {
    const duration = Math.max(1, Math.round((Date.parse(visit.departure + 'T00:00:00Z') - Date.parse(visit.arrival + 'T00:00:00Z')) / 86400000) + 1);
    const pictures = (visit.photos || []).flatMap(id => {
      const photo = photos.get(id);
      // Only embed images prepared by the photo uploader, never arbitrary URLs or HTML.
      return photo && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo.src)
        ? [`<figure><img src="${photo.src}" alt="${escapeHtml(photo.name)}" /></figure>`] : [];
    });
    return `<article><div class="journey-heading"><h2>${escapeHtml(visit.country)}</h2><span>${escapeHtml(dateLabel(visit.arrival))} – ${escapeHtml(dateLabel(visit.departure))} · ${duration} ${duration === 1 ? 'day' : 'days'}</span></div>${pictures.length ? `<div class="photo-collage ${pictures.length === 1 ? 'single-photo' : ''}">${pictures.join('')}</div>` : ''}${visit.note ? `<p class="journey-note">${escapeHtml(visit.note)}</p>` : ''}</article>`;
  }).join('') || '<p class="empty">No journeys logged yet.</p>';
  const wishlist = data.wishlist.length ? `<section class="wishlist"><h2>Places I want to explore</h2><p>${data.wishlist.map(escapeHtml).join(' · ')}</p></section>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>My Worldscope Travel Journal</title><style>
    @page { size:A4; margin:16mm; }
    * { box-sizing:border-box; }
    body { font-family:Arial,sans-serif; color:#17211b; max-width:760px; margin:0 auto; line-height:1.55; }
    header { border-bottom:3px solid #9ee53b; padding:18px 0 24px; margin-bottom:28px; }
    header small { font-size:10px; letter-spacing:2px; color:#65716a; }
    h1 { font-size:34px; margin:8px 0 5px; }
    header p { margin:0; color:#647067; }
    .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:28px; }
    .stat { border:1px solid #dfe4e0; border-radius:8px; padding:12px; }
    .stat strong { font-size:23px; display:block; }
    .stat span { font-size:10px; color:#69736d; }
    article { border-bottom:1px solid #dfe4e0; padding:16px 0; }
    .journey-heading { break-inside:avoid; break-after:avoid; margin-bottom:12px; }
    .journey-heading h2 { font-size:22px; margin:0 0 3px; overflow-wrap:anywhere; }
    .journey-heading span { font-size:11px; color:#647067; }
    .journey-note { font-size:13px; margin:12px 0 0; white-space:pre-wrap; overflow-wrap:anywhere; }
    .photo-collage { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
    .photo-collage figure { margin:0; height:145px; break-inside:avoid; border-radius:6px; overflow:hidden; }
    .photo-collage img { display:block; width:100%; height:100%; object-fit:cover; }
    .photo-collage.single-photo { grid-template-columns:minmax(0,1fr); }
    .photo-collage.single-photo figure { height:240px; }
    .wishlist { break-inside:avoid; background:#f3f8ed; border:1px solid #dfe4e0; border-radius:8px; padding:18px; margin-top:28px; }
    .wishlist h2 { font-size:16px; margin:0 0 6px; }
    .wishlist p { font-size:12px; margin:0; }
    .empty { color:#647067; }
    footer { font-size:9px; color:#818a85; margin-top:36px; text-align:center; }
    @media screen and (max-width:600px) { .stats { grid-template-columns:1fr 1fr; } .photo-collage { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  </style></head><body><header><small>WORLDSCOPE · PERSONAL TRAVEL JOURNAL</small><h1>My life around the world</h1><p>Every journey is a part of the story.</p></header><section class="stats">${[[data.countryCount,'COUNTRIES VISITED'],[data.continentCount,'CONTINENTS EXPLORED'],[data.totalDays,'DAYS OF DISCOVERY'],[data.wishlist.length,'PLACES ON MY WISHLIST']].map(([value,label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('')}</section><main>${journeys}</main>${wishlist}<footer>Created with Worldscope · ${escapeHtml(data.createdOn)}</footer></body></html>`;
}
