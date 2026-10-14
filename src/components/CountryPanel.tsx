import { useState } from 'react';
import { ArrowUpRight, Bookmark, Check, MapPin, Users, Languages, Banknote, CalendarDays, Sparkles } from 'lucide-react';
import type { Country } from '../data/countries';
import { photo } from '../data/countries';

interface Props { country: Country; saved: boolean; onSave: () => void; onAsk: () => void }
export default function CountryPanel({ country, saved, onSave, onAsk }: Props) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const image = country.image && country.image !== failedImage ? country.image : undefined;
  return <aside className="country-panel" key={country.name} aria-label={`${country.name} country information`}>
    <div className={`country-hero ${!image ? 'country-hero-fallback' : ''}`}>
      {image && <img src={photo(image)} alt={`Travel photograph from ${country.name}`} style={country.imagePosition ? { objectPosition: country.imagePosition } : undefined} onError={() => setFailedImage(image)} />}
      <span className="country-region"><MapPin size={12} /> {country.region}</span>
      <button className={`save-icon ${saved ? 'is-saved' : ''}`} aria-label={saved ? `Remove ${country.name} from wishlist` : `Save ${country.name} to wishlist`} aria-pressed={saved} onClick={onSave}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button>
      <div className="country-title"><span className="eyebrow">YOUR NEXT CHAPTER</span><h2>{country.name} <span className="flag-code">{country.code}</span></h2></div>
      {image && country.imageAttribution && <span className="photo-credit"><a href={country.imageAttribution.source} target="_blank" rel="noopener noreferrer" title={`Photograph by ${country.imageAttribution.author}`}>Photo: {country.imageAttribution.author}</a><span>·</span>{country.imageAttribution.licenseUrl ? <a href={country.imageAttribution.licenseUrl} target="_blank" rel="noopener noreferrer">{country.imageAttribution.license}</a> : <span>{country.imageAttribution.license}</span>}</span>}
    </div>
    <div className="country-body">
      <h3>{country.headline || 'A new perspective awaits.'}</h3>
      <p className="country-description">{country.description || `Get to know ${country.name}. Explore its culture, landscapes, and the places that make it one of a kind.`}</p>
      <div className="country-tags">{(country.tags || [country.region, 'Discovery']).map(tag => <span key={tag}>{tag}</span>)}</div>
      <div className="country-facts">
        {[{ Icon: MapPin, label: 'Capital', value: country.capital }, { Icon: Users, label: 'Population · est.', value: country.population }, { Icon: Languages, label: 'Language', value: country.language }, { Icon: Banknote, label: 'Currency', value: country.currency }].map(({ Icon, label, value }) => <div className="fact" key={label}><Icon size={15} /><div><span>{label}</span><strong>{value}</strong></div></div>)}
      </div>
      {country.season && <div className="season"><CalendarDays size={16} /><div><span>Best time to explore</span><strong>{country.season}</strong></div></div>}
      {country.fact && <div className="did-you-know"><Sparkles size={14} /><p><strong>A little wonder</strong>{country.fact}</p></div>}
      <button className={`primary-button ${saved ? 'saved-button' : ''}`} onClick={onSave}>{saved ? <Check size={16} /> : <Bookmark size={16} />}{saved ? 'Saved to your wishlist' : 'Add to my wishlist'}<span className="button-end">{saved ? '✓' : '+'}</span></button>
      <button className="text-button panel-ask" onClick={onAsk}>Explore {country.name} with the assistant <ArrowUpRight size={14} /></button>
    </div>
  </aside>;
}
