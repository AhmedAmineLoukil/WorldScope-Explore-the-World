import { destinations } from '../data/countries';
import type { Country } from '../data/countries';

export interface Message { role: 'user' | 'assistant'; content: string; suggestions?: string[] }
export function previewRecommendation(messages: Message[], countries: Country[] = []): Message {
  const latest = messages.filter(m => m.role === 'user').at(-1)?.content.toLowerCase() || '';
  const greeting = latest.trim().replace(/[.!?,]+/g, '').replace(/\s+/g, ' ');
  if (/^(hi|hello|hey|hiya|howdy|good morning|good afternoon|good evening)( there| atlas| bot)?$/.test(greeting)) {
    return { role: 'assistant', content: 'Hi! I\u2019m Atlas, your travel companion. What kind of trip are you dreaming of\u2014a relaxing coast, a city to explore, or an adventure in nature? If you already have a destination in mind, tell me about it.' };
  }
  const context = messages.filter(m => m.role === 'user').slice(-4).map(m => m.content).join(' ').toLowerCase();
  const named = destinations.find(c => latest.includes(c.name.toLowerCase()));
  if (named) return { role: 'assistant', content: `${named.name} could be a wonderful next chapter. ${named.description}\n\nA good seasonal starting point is ${named.season}. What matters most for your trip: culture, time in nature, or a relaxed pace?`, suggestions: [named.name] };
  const other = [...countries].sort((a,b) => b.name.length - a.name.length).find(c => latest.includes(c.name.toLowerCase()));
  if (other) return { role: 'assistant', content: `Let’s get to know ${other.name}. It’s in ${other.region}, with ${other.capital} as its capital. Its official languages include ${other.language}, and its currency is ${other.currency}.\n\nThis preview guide has detailed travel inspiration for six destinations. You can explore country facts on the globe, or tell me whether you’re drawn to nature, culture, food, or a slower pace.`, suggestions: [other.name] };
  let names = ['Japan', 'Italy', 'Portugal'];
  let reason = 'For a mix of culture, memorable food, and beautiful places to wander';
  if (/nature|hike|hiking|mountain|adventure|outdoor|aurora|waterfall/.test(context)) { names = ['Iceland', 'New Zealand', 'Japan']; reason = 'For wide-open landscapes and a little adventure'; }
  else if (/beach|coast|sea|sun|relax|slow/.test(context)) { names = ['Portugal', 'Italy', 'Morocco']; reason = 'For a slower pace, coastal scenery, and a little sunshine'; }
  else if (/budget|affordable|cheap|inexpensive/.test(context)) { names = ['Morocco', 'Portugal', 'Italy']; reason = 'For a trip where local food, neighbourhood walks, and flexible travel can go a long way'; }
  else if (/food|culture|city|art|history|temple/.test(context)) { names = ['Japan', 'Italy', 'Morocco']; reason = 'For rich culture, local flavours, and streets full of stories'; }
  const text = `${reason}, I’d start with ${names.slice(0, -1).join(', ')} or ${names.at(-1)}.\n\n${names.map(name => { const c = destinations.find(d => d.name === name)!; return `${name}: ${c.headline}`; }).join('\n')}\n\n${/week|day|month|june|july|august|winter|summer/.test(latest) ? 'Would you prefer an active itinerary or more room to slow down?' : 'When are you thinking of travelling, and for how long?'}`;
  return { role: 'assistant', content: text, suggestions: names };
}
