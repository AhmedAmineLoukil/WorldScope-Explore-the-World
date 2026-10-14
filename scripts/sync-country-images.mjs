import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';

const agent = 'Worldscope/1.0 (local travel image catalogue; Wikimedia photo attribution preserved)';
async function query(endpoint, params) {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let response;
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetch(url, { headers: { 'User-Agent': agent }, signal: AbortSignal.timeout(30000) });
    if (response.status !== 429) break;
    if (attempt === 3) break;
    const seconds = Math.max(30, Math.min(60, Number(response.headers.get('retry-after')) || 45));
    console.log(`${url.hostname} requested a pause; retrying in ${seconds}s.`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
  if (!response.ok) throw new Error(`${response.status} from ${url.hostname}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.info);
  return data;
}

const voyage = 'https://en.wikivoyage.org/w/api.php';
if (process.argv.includes('--probe')) {
  const data = await query(voyage, { action: 'query', prop: 'revisions|pageprops', rvprop: 'content', rvslots: 'main', titles: 'Tunisia|France|Brazil|Canada', redirects: '1', format: 'json', formatversion: '2' });
  console.log(JSON.stringify(data.query.pages.map(page => ({ title: page.title, beginning: page.revisions?.[0]?.slots?.main?.content?.slice(0, 1000), pageprops: page.pageprops })), null, 2));
} else {
  await mkdir('public/images/countries', { recursive: true });
  const countries = JSON.parse(await readFile('public/data/facts.json', 'utf8'));
  const manifestPath = 'public/data/country-images.json';
  let manifest = {};
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch {}
  const overrides = { TN: 'Ribat, Sousse, Tunisia.JPG', DE: 'Berlin-Reichstags-building.jpg' };
  const aliases = { 'Türkiye': 'Turkey', 'Czechia': 'Czech Republic', 'United States': 'United States of America', 'United States Minor Outlying Islands': 'United States Minor Outlying Islands', 'Cocos (Keeling) Islands': 'Cocos Islands', 'Saint Helena, Ascension and Tristan da Cunha': 'Saint Helena', 'South Georgia': 'South Georgia and the South Sandwich Islands', 'Bonaire, Sint Eustatius and Saba': 'Caribbean Netherlands' };
  const titles = new Map(countries.map(c => [aliases[c.name.common] || c.name.common, c]));
  if (process.argv.includes('--fill-gaps')) {
    const alternativeGuides = { DE: 'Berlin', ET: 'Lalibela', TZ: 'Zanzibar', MQ: 'Fort-de-France', NF: 'Norfolk Island', SJ: 'Svalbard', UM: 'Midway Islands' };
    titles.clear();
    for (const [code, title] of Object.entries(alternativeGuides)) if (!manifest[code]?.image) titles.set(title, countries.find(c => c.cca2 === code));
  }
  const photoFile = value => value && /\.(jpe?g|png|webp)$/i.test(value) && !/flag|coat.?of.?arms|locator|location|default.?banner|blank|logo|(?:^|[ _-])map(?:[ _.-]|$)|map\.(?:png|jpg)|regions|orthographic|projection/i.test(value);
  let candidates = [];
  let nextGuide = 0;
  await mkdir('.image-cache', { recursive: true });
  try { candidates = JSON.parse(await readFile('.image-cache/candidates.json', 'utf8')); } catch {}
  try { nextGuide = Number(await readFile('.image-cache/next-guide.txt', 'utf8')); } catch {}
  const names = [...titles.keys()];
  if (process.argv.includes('--fill-gaps')) { candidates = []; nextGuide = 0; }
  if (!process.argv.includes('--download-only')) {
    console.log(`Researching ${countries.length} countries and territories.`);
    for (let start = nextGuide; start < names.length; start += 15) {
      const batch = names.slice(start, start + 15);
      const data = await query(voyage, { action: 'query', prop: 'revisions|pageprops', rvprop: 'content', rvslots: 'main', titles: batch.join('|'), redirects: '1', format: 'json', formatversion: '2' });
      const redirects = new Map((data.query.redirects || []).map(r => [r.from, r.to]));
      const normalized = new Map((data.query.normalized || []).map(r => [r.from, r.to]));
      for (const name of batch) {
        const country = titles.get(name);
        let resolved = normalized.get(name) || name;
        for (let i = 0; i < 5 && redirects.has(resolved); i++) resolved = redirects.get(resolved);
        const page = data.query.pages.find(p => p.title === resolved);
        if (!page || page.missing) continue;
        const content = page.revisions?.[0]?.slots?.main?.content || '';
        const banner = content.match(/\{\{\s*pagebanner\s*\|\s*([^|}\n]+)/i)?.[1]?.trim().replace(/^(?:File|Image):\s*/i, '');
        const inArticle = [...content.matchAll(/\[\[(?:File|Image):\s*([^|\]\n]+)/gi)].map(m => m[1].trim()).find(photoFile);
        const selected = overrides[country.cca2] || (photoFile(banner) ? banner : null) || (photoFile(page.pageprops?.page_image_free) ? page.pageprops.page_image_free : null) || inArticle;
        if (selected) candidates.push({ code: country.cca2, country: country.name.common, file: selected, guide: `https://en.wikivoyage.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}` });
      }
      console.log(`Guides checked: ${Math.min(start + 15, names.length)}/${names.length}; photo candidates: ${candidates.length}`);
      if (!process.argv.includes('--fill-gaps')) {
        await writeFile('.image-cache/candidates.json', JSON.stringify(candidates, null, 2));
        await writeFile('.image-cache/next-guide.txt', String(Math.min(start + 15, names.length)));
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if (!process.argv.includes('--fill-gaps')) await writeFile('.image-cache/candidates.json', JSON.stringify(candidates, null, 2));
    const clean = value => (value || '').replace(/<[^>]*>/g, '').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&(?:amp|quot|lt|gt|nbsp);/g, entity => ({ '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' })[entity]).replace(/\s+/g, ' ').trim();
    for (let start = 0; start < candidates.length; start += 25) {
      const batch = candidates.slice(start, start + 25);
      const data = await query(voyage, { action: 'query', prop: 'imageinfo', titles: batch.map(c => 'File:' + c.file).join('|'), iiprop: 'url|extmetadata|size', iiurlwidth: '1600', format: 'json', formatversion: '2', redirects: '1' });
      for (const candidate of batch) {
        const canonical = 'File:' + candidate.file.replaceAll('_', ' ');
        const page = data.query.pages.find(p => p.title.toLowerCase() === canonical.toLowerCase());
        const info = page?.imageinfo?.[0];
        if (!info) continue;
        const meta = info.extmetadata || {};
        const license = clean(meta.LicenseShortName?.value);
        if (!/CC BY|CC0|Public domain|PDM/i.test(license)) continue;
        const existingImage = manifest[candidate.code]?.file === candidate.file ? manifest[candidate.code]?.image : undefined;
        manifest[candidate.code] = { ...candidate, image: existingImage, position: candidate.code === 'TN' ? 'center 20%' : undefined, remote: info.thumburl || info.url, source: info.descriptionurl, author: clean(meta.Artist?.value) || 'Wikimedia Commons contributor', license, licenseUrl: clean(meta.LicenseUrl?.value), description: clean(meta.ImageDescription?.value).slice(0, 500), width: info.thumbwidth || info.width, height: info.thumbheight || info.height };
      }
      console.log(`Licensed photographs resolved: ${Object.keys(manifest).length}`);
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  if (process.argv.includes('--metadata-only')) {
    console.log(`Metadata ready: ${Object.keys(manifest).length} licensed country photographs.`);
  } else {
    const priority = ['TN', 'FR', 'BR', 'DE', 'ES', 'GB', 'IN', 'CN', 'US', 'CA'];
    const entries = Object.entries(manifest).sort(([a], [b]) => (priority.includes(a) ? priority.indexOf(a) : 100) - (priority.includes(b) ? priority.indexOf(b) : 100));
    let completed = 0;
    for (const [code, image] of entries) {
      if (image.image) { try { await stat('public' + image.image); completed++; continue; } catch {} }
      try {
        let response;
        for (let attempt = 0; attempt < 4; attempt++) {
          response = await fetch(image.remote, { headers: { 'User-Agent': agent }, signal: AbortSignal.timeout(20000) });
          if (response.status !== 429 || attempt === 3) break;
          const seconds = Math.max(30, Math.min(60, Number(response.headers.get('retry-after')) || 30));
          console.log(`Image service requested a pause; retrying ${image.country} in ${seconds}s.`);
          await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const mime = response.headers.get('content-type') || '';
        const extension = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('jpeg') ? 'jpg' : null;
        if (!extension) throw new Error(`Unsupported image type: ${mime}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length < 1000) throw new Error('Empty image');
        const path = `/images/countries/${code.toLowerCase()}.${extension}`;
        await writeFile('public' + path, bytes);
        image.image = path; completed++;
      } catch (error) { console.log(`Download unavailable for ${image.country}: ${error.message}`); }
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      if (completed % 10 === 0) console.log(`Local photographs: ${completed}/${entries.length}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    console.log(`Finished: ${completed} bundled images. Missing countries: ${countries.filter(c => !manifest[c.cca2]?.image).map(c => c.name.common).join(', ')}`);
  }
}
