import { useEffect, useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, BookOpen, Check, Compass, Globe2, MapPin, Search, Shuffle, Sparkles, X } from 'lucide-react';
import WorldMap from './components/WorldMap';
import CountryPanel from './components/CountryPanel';
import Assistant from './components/Assistant';
import TravelLog from './components/TravelLog';
import type { Visit } from './components/TravelLog';
import { useStoredState } from './lib/storage';
import { countryName, destinations, photo } from './data/countries';
import type { Country } from './data/countries';

interface ApiCountry { name: { common: string }; cca2: string; region: string; capital: string[]; population: number; languages: Record<string, string>; currencies: Record<string, { name: string }>; latlng: [number, number] }
type CountryImage = NonNullable<Country['imageAttribution']> & { image?: string; position?: string };

function App() {
  const [section, setSection] = useState('discover');
  const [selected, setSelected] = useState('Japan');
  const [allNames, setAllNames] = useState(destinations.map(c => c.name));
  const [facts, setFacts] = useState<Country[]>([]);
  const [wishlist, setWishlist] = useStoredState<string[]>('worldscope-wishlist', []);
  const [visits, setVisits] = useStoredState<Visit[]>('worldscope-visits', []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetch('/data/facts.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }), fetch('/data/populations.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }), fetch('/data/country-images.json', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).catch(() => ({}))]).then(([data, populations, images]: [ApiCountry[], { country: string; population: number }[], Record<string, CountryImage>]) => {
      setFacts(data.map(c => { const population = populations.find(p => countryName(p.country) === countryName(c.name.common))?.population; const image = images[c.cca2]; return { name: countryName(c.name.common), code: c.cca2, region: c.region, capital: c.capital?.join(', ') || 'Not listed', population: population ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(population) : 'Not listed', language: Object.values(c.languages || {}).join(' · ') || 'Not listed', currency: Object.entries(c.currencies || {}).map(([code, currency]) => `${currency.name} · ${code}`).join(', ') || 'Not listed', lat: c.latlng?.[0] || 0, lng: c.latlng?.[1] || 0, image: image?.image, imagePosition: image?.position, imageAttribution: image?.image ? { author: image.author, source: image.source, license: image.license, licenseUrl: image.licenseUrl } : undefined }; }));
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(v => !v); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  useEffect(() => { if (toast) { const timeout = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timeout); } }, [toast]);
  const country = destinations.find(c => c.name === selected) || facts.find(c => c.name === selected || (selected === 'Czech Republic' && c.name === 'Czechia')) || { name: selected, code: '', region: 'Country explorer', capital: 'Not available', population: 'Not available', language: 'Not available', currency: 'Not available', lat: 0, lng: 0 };
  const coordinates = useMemo<[number, number]>(() => [country.lat, country.lng], [country.lat, country.lng]);
  const searchNames = Array.from(new Set([...allNames, ...facts.map(c => c.name)])).filter(name => name.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => {
    const term = query.trim().toLowerCase();
    const rank = (name: string) => name.toLowerCase() === term ? 0 : name.toLowerCase().startsWith(term) ? 1 : 2;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  const selectCountry = (name: string) => { setSelected(name); setSearchOpen(false); setQuery(''); setSection('discover'); };
  const toggleSave = () => { const exists = wishlist.includes(selected); setWishlist(exists ? wishlist.filter(c => c !== selected) : [...wishlist, selected]); setToast(exists ? `${selected} removed from wishlist` : `${selected} added to your wishlist`); };
  return <Tabs.Root className="app-shell" value={section} onValueChange={setSection}>
    <header className="site-header">
      <a className="brand" href="#discover" onClick={e => { e.preventDefault(); setSection('discover'); }} aria-label="Worldscope home"><span className="brand-mark"><Globe2 size={25} strokeWidth={1.5} /></span>worldscope<span className="brand-period">.</span></a>
      <Tabs.List className="floating-nav" aria-label="Main sections">
        <Tabs.Trigger value="discover"><Compass size={17} /><span>Discover</span></Tabs.Trigger>
        <Tabs.Trigger value="assistant"><Sparkles size={17} /><span>Assistant</span><span className="ai-badge">AI</span></Tabs.Trigger>
        <Tabs.Trigger value="log"><BookOpen size={17} /><span>Travel log</span></Tabs.Trigger>
      </Tabs.List>
      <div className="header-right"><span className="header-motto">Stay curious. Go somewhere.</span><button className="avatar" onClick={() => setSection('log')} aria-label="Open your travel log">You<span /></button></div>
    </header>
    <main>
      <Tabs.Content value="discover" className="discover-page section-page">
        <div className="page-heading"><div><div className="eyebrow"><span className="tiny-line" /> THE WORLD IS YOURS</div><h1>Where will curiosity take you<span>?</span></h1><p>Spin the globe. Find your somewhere.</p></div>
          <button className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Find a country</span><kbd>Ctrl K</kbd></button>
        </div>
        <div className="discover-layout"><div className="globe-column">
          <div className="explorer-topline"><span><span className="live-dot" /> EXPLORER MODE</span><button className="text-button" onClick={() => { const options = destinations.filter(c => c.name !== selected); setSelected(options[Math.floor(Math.random() * options.length)].name); }}><Shuffle size={13} /> Surprise me <ArrowUpRight size={13} /></button></div>
          <WorldMap selectedCountry={selected} coordinates={coordinates} onSelectCountry={setSelected} onCountries={setAllNames} />
          <div className="explorer-bottomline"><span><Globe2 size={14} /> One planet. Endless stories.</span><span>EXPLORE AT YOUR OWN PACE <ArrowUpRight size={12} /></span></div>
        </div><CountryPanel country={country} saved={wishlist.includes(selected)} onSave={toggleSave} onAsk={() => { setAssistantPrompt(`Tell me about travelling to ${selected}.`); setSection('assistant'); }} /></div>
        <section className="inspiration-section" aria-label="Destination inspiration"><div className="inspiration-heading"><div><span className="eyebrow">A LITTLE INSPIRATION</span><h2>Places to spark your wanderlust</h2></div><span className="curated-label">Handpicked for the curious <Sparkles size={13} /></span></div>
          <div className="destination-grid">{destinations.filter(c => c.name !== selected).slice(0, 4).map(c => <button className="destination-card" key={c.name} onClick={() => setSelected(c.name)}><img src={photo(c.image!, 500)} alt={`Discover ${c.name}`} loading="lazy" /><div><span>{c.region}</span><h3>{c.name}</h3></div><span className="destination-arrow"><ArrowUpRight size={18} /></span></button>)}</div>
        </section>
      </Tabs.Content>
      <Tabs.Content value="assistant"><Assistant onExplore={selectCountry} initialPrompt={assistantPrompt} onPromptConsumed={() => setAssistantPrompt('')} countries={facts} /></Tabs.Content>
      <Tabs.Content value="log"><TravelLog visits={visits} onVisitsChange={setVisits} wishlist={wishlist} onWishlistChange={setWishlist} countries={facts} onExplore={selectCountry} /></Tabs.Content>
    </main>
    <footer className="site-footer"><span>Made for a world worth exploring.</span><span>WORLDWIDE WONDER <span className="live-dot" /></span></footer>
    <Dialog.Root open={searchOpen} onOpenChange={open => { setSearchOpen(open); if (!open) setQuery(''); }}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="search-dialog"><Dialog.Title>Find your somewhere</Dialog.Title><Dialog.Description>Search for a country to explore on the globe.</Dialog.Description><Dialog.Close className="dialog-close icon-button" aria-label="Close country search"><X size={19} /></Dialog.Close><div className="search-field"><Search size={18} /><input aria-label="Search countries" placeholder="Where are you curious about?" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && searchNames[0]) selectCountry(searchNames[0]); }} autoComplete="off" /></div><div className="search-results">{searchNames.length ? searchNames.map(name => <button key={name} onClick={() => selectCountry(name)}><MapPin size={15} />{name}<ArrowUpRight size={14} /></button>) : <p>No countries found. Try another name.</p>}</div><div className="search-footer">Type to search <span>ESC to close</span></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
  </Tabs.Root>;
}
export default App;
