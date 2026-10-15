import test from 'node:test';
import assert from 'node:assert/strict';
import { travelJournalHtml } from '../src/lib/travelJournal.ts';

const picture = 'data:image/jpeg;base64,/9j/2Q==';
const journey = (country, photos) => ({ id:country, country, arrival:'2026-06-01', departure:'2026-06-03', note:'A memory', photos });
const journal = (visits, photos = []) => travelJournalHtml({ visits, photos, wishlist:['Japan'], countryCount:visits.length, continentCount:1, totalDays:3, createdOn:'Oct 16, 2026' });

test('prints every photo under its own country, in the chosen cover order', () => {
  const photos = ['one', 'two', 'three', 'four'].map(id => ({ id, name:`${id}.jpg`, src:picture }));
  const html = journal([journey('Italy', ['two', 'one', 'three']), journey('France', ['four'])], photos);
  const articles = html.match(/<article>[\s\S]*?<\/article>/g);
  assert.equal(articles.length, 2);
  assert.equal((articles[0].match(/<img /g) || []).length, 3);
  assert.equal((articles[1].match(/<img /g) || []).length, 1);
  assert.ok(articles[0].indexOf('<h2>Italy</h2>') < articles[0].indexOf('<img '));
  assert.ok(articles[0].indexOf('two.jpg') < articles[0].indexOf('one.jpg'));
  assert.ok(!articles[0].includes('four.jpg'));
  assert.ok(articles[1].includes('single-photo'));
});

test('exports legacy journeys and an empty travel log without requiring photos', () => {
  const html = journal([journey('Japan')]);
  assert.ok(html.includes('<h2>Japan</h2>'));
  assert.ok(html.includes('3 days'));
  assert.ok(!html.includes('<img '));
  assert.ok(journal([]).includes('No journeys logged yet.'));
});

test('escapes journal text and only embeds prepared image data', () => {
  const visit = { ...journey('<Italy>', ['safe', 'unsafe']), note:'<script>alert("hi")</script>\nAnother memory' };
  const html = journal([visit], [
    { id:'safe', name:'" onerror="bad.jpg', src:picture },
    { id:'unsafe', name:'bad', src:'https://example.com/tracker.jpg' },
  ]);
  assert.ok(html.includes('&lt;Italy&gt;'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('alt="&quot; onerror=&quot;bad.jpg"'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('https://example.com'));
  assert.equal((html.match(/<img /g) || []).length, 1);
});
