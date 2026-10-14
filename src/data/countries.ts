export interface Country {
  name: string; code: string; region: string; capital: string; population: string;
  language: string; currency: string; lat: number; lng: number; image?: string;
  headline?: string; description?: string; season?: string; tags?: string[]; fact?: string;
  imageAttribution?: { author: string; source: string; license: string; licenseUrl: string };
  imagePosition?: string;
}

export const destinations: Country[] = [
  { name: 'Japan', code: 'JP', region: 'Asia', capital: 'Tokyo', population: '124 million', language: 'Japanese', currency: 'Japanese yen · JPY', lat: 36, lng: 138,
    image: 'photo-1493976040374-85c8e12f0c0e', headline: 'A world of beautiful contrasts.',
    description: 'Ancient temples and neon-lit streets. Quiet mountain trails and cities that never stop moving. Find your own rhythm in Japan.',
    season: 'March – May · October – November', tags: ['Culture', 'Nature', 'Food'], fact: 'Japan’s first high-speed rail line opened in 1964, connecting Tokyo and Osaka.' },
  { name: 'Italy', code: 'IT', region: 'Europe', capital: 'Rome', population: '59 million', language: 'Italian', currency: 'Euro · EUR', lat: 42, lng: 12,
    image: 'photo-1516483638261-f4dbaf036963', headline: 'The art of living beautifully.', description: 'Slow mornings, sun-washed coastlines, and a little history around every corner. Italy is a place to savour, one moment at a time.', season: 'April – June · September – October', tags: ['Culture', 'Coast', 'Food'], fact: 'Italy has more UNESCO World Heritage sites than any other country.' },
  { name: 'Iceland', code: 'IS', region: 'Europe', capital: 'Reykjavík', population: '390,000', language: 'Icelandic', currency: 'Icelandic króna · ISK', lat: 65, lng: -19,
    image: 'photo-1476610182048-b716b8518aae', headline: 'Somewhere beyond the ordinary.', description: 'Waterfalls tumbling into wild valleys, volcanic landscapes, and skies painted by the northern lights. Let nature lead the way.', season: 'June – August · Winter for auroras', tags: ['Nature', 'Adventure', 'Slow travel'], fact: 'Iceland sits on two tectonic plates. You can walk between Europe and North America at Þingvellir.' },
  { name: 'Morocco', code: 'MA', region: 'Africa', capital: 'Rabat', population: '37 million', language: 'Arabic · Amazigh', currency: 'Moroccan dirham · MAD', lat: 32, lng: -6,
    image: 'photo-1489749798305-4fea3ae63d43', headline: 'Follow your sense of wonder.', description: 'Wander through colourful medinas, share mint tea beneath the Atlas Mountains, and watch the Sahara turn gold at sunset.', season: 'March – May · September – November', tags: ['Culture', 'Adventure', 'Food'], fact: 'The University of al-Qarawiyyin in Fez, founded in 859, is one of the world’s oldest centres of learning.' },
  { name: 'New Zealand', code: 'NZ', region: 'Oceania', capital: 'Wellington', population: '5.3 million', language: 'English · Māori', currency: 'New Zealand dollar · NZD', lat: -41, lng: 174,
    image: 'photo-1469521669194-babb45599def', headline: 'Take the scenic route.', description: 'Alpine peaks, tranquil fjords, and wide-open roads. There’s room to breathe, explore, and get a little lost in New Zealand.', season: 'December – March', tags: ['Nature', 'Adventure', 'Road trips'], fact: 'New Zealand was the first country to grant women the right to vote, in 1893.' },
  { name: 'Portugal', code: 'PT', region: 'Europe', capital: 'Lisbon', population: '10.6 million', language: 'Portuguese', currency: 'Euro · EUR', lat: 39.5, lng: -8,
    image: 'photo-1555881400-74d7acaacd8b', headline: 'A little sunshine for the soul.', description: 'Tiled streets, Atlantic sunsets, and long lunches by the sea. Discover the gentle pace and warm welcome of Portugal.', season: 'April – June · September – October', tags: ['Coast', 'Culture', 'Slow travel'], fact: 'Portugal’s borders have remained largely unchanged since the 13th century.' },
];

export const photo = (id: string, width = 900) => id.startsWith('/') || id.startsWith('https://') ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
export const aliases: Record<string, string> = { 'United States of America': 'United States', 'S. Sudan': 'South Sudan', 'Dem. Rep. Congo': 'DR Congo', 'Dominican Rep.': 'Dominican Republic', 'Central African Rep.': 'Central African Republic', 'Eq. Guinea': 'Equatorial Guinea', 'Bosnia and Herz.': 'Bosnia and Herzegovina', 'Czechia': 'Czech Republic', 'eSwatini': 'Eswatini', 'W. Sahara': 'Western Sahara', 'Falkland Is.': 'Falkland Islands', 'Fr. S. Antarctic Lands': 'French Southern and Antarctic Lands', "Côte d'Ivoire": 'Ivory Coast', 'Turkey': 'Türkiye', 'Solomon Is.': 'Solomon Islands', 'Macedonia': 'North Macedonia', 'N. Cyprus': 'Northern Cyprus' };
export const countryName = (name: string) => aliases[name] || name;
