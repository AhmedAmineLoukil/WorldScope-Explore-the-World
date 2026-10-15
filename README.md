# Worldscope

A travel discovery platform with three connected sections: Discover, Assistant, and Travel Log. Explore a 3D globe, save destinations, and turn completed journeys into a personal photo journal.

## Run locally

Use Node.js 22.19 or newer and npm.

```sh
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

```sh
npm run build
npm run lint
npm test
npm start
```

`npm start` serves the built application and its assistant endpoint at `http://localhost:3000`. Vite development serves the same assistant endpoint through middleware. `npm run preview` previews static files only; use `npm run dev` or `npm start` for Assistant functionality.

## Features

- **Discover:** WebGL 3D globe with country boundaries, country picking, hover labels, smooth camera transitions, drag rotation, wheel/pinch zoom, zoom/reset controls, optional auto-rotation, country search (`Ctrl/Cmd + K`), country facts, destination photography, and a persistent wishlist. Countries in your completed journeys receive lime pins, with one pin per country. Pins update when journeys are added, edited, or removed.
- **Assistant:** Atlas conversation interface, destination prompts, recommendation cards, microphone-driven orb animation, browser speech recognition, spoken replies, and distinct idle/listening/thinking/speaking states.
- **Travel Log:** add/edit/remove completed journeys with arrival/departure dates, personal notes, and photos; unique country and continent totals; trip-day totals; world and continent progress; wishlist; printable travel journals and photo-inclusive data backups.
- **Journey photos:** upload multiple pictures, choose a cover, and browse a gallery with a larger selected image, thumbnails, previous/next controls, and keyboard navigation.
- **Journal export:** preview your journal, then print it or save it as a PDF with travel statistics, dates, notes, a photo collage for each journey, and wishlist destinations.
- Dark interface with lime accents, responsive layouts, keyboard navigation, focus management, explicit empty/error states, and reduced-motion support.

## Journeys and photos

1. Open **Travel log** and choose **Log a journey**. Select a country, enter completed-trip dates, and optionally add a note.
2. Choose **Add photos** to attach up to **12 photos per journey**. Supported formats are **JPG, PNG, and WebP**, up to **15 MB each**. Images are resized to a maximum of 1,400 pixels on their longest side and saved as compressed JPEGs.
3. Use **Make cover** on a thumbnail to select the picture shown on the journey card. The cover appears to the left of the pencil and trash buttons. Save the journey to keep your changes.
4. Click the card’s cover to open its photo gallery. Choose a thumbnail, use the previous/next buttons or left/right arrow keys to browse, and press **Escape** or the close button to return to the dashboard. Use the pencil button to add or remove photos and edit journey details.

Photos are optional. Existing journeys without photos continue to work, and new photos can be added by editing them.

## Print or save a journal as PDF

1. In **Travel log**, choose **Download journal** to open a preview of your statistics and recent journeys.
2. Choose **Print or save as PDF**. Allow the print window to open if your browser blocks pop-ups.
3. In the browser’s print dialog, select **Save as PDF** to download a copy, or choose a printer.

The full journal includes every journey, even when the preview only shows recent entries. All attached photos appear side by side in a grid under their journey’s country name and dates. The print dialog opens after the images have loaded. Photos may be cropped to fit the collage tiles.

**Download data backup** is a separate JSON export containing journey details, wishlist destinations, and the saved photo images. The app does not currently include a backup import/restore screen.

## Local storage and privacy

Wishlist destinations, journey details, and conversation history are saved in this browser’s local storage. Uploaded journey photos are saved separately in IndexedDB to avoid local storage’s small size limit. Photos remain on your device; they are not uploaded to the application server.

Data is specific to the browser and site address, does not sync between devices, and can be lost when site data is cleared. Download a journal or data backup to keep a separate copy. Development and production addresses have separate browser storage.

## Enable live AI

Copy `.env.example` to `.env`, set `GEMINI_API_KEY`, and optionally set `GEMINI_MODEL` to a model enabled for your account. Restart the server. Credentials are read by the server only and are never sent to the browser. The integration uses the [Gemini generateContent API](https://ai.google.dev/api/generate-content) and sends the recent conversation history.

Without a key, Atlas is explicitly labelled **Curated preview**. This is a local recommendation guide with six editorial destinations and general country facts; it is not a live language model. The live provider path is covered by mocked adapter tests but was not exercised against a paid API in this workspace.

Voice input depends on browser support, microphone permission, a secure origin (localhost or HTTPS), and the browser’s speech service. Chrome and Edge generally provide the speech recognition interface. Unsupported/denied input produces a readable error, and typed input remains available. The listening orb reads microphone amplitude through Web Audio. Spoken replies use Piper TTS entirely in the browser with the British female `en_GB-alba-medium` voice. Its local ONNX model loads in a worker only after voice mode or playback is activated and is then cached in the browser's origin-private file system. Browser speech synthesis remains the fallback. The Piper runtime and model repository are MIT licensed; Alba's model card identifies its source dataset as CC BY 4.0. The speaking animation is decorative. Actual microphone hardware and end-to-end transcription were not verified by the automated browser run.

## Design and research

The app uses React, TypeScript, and Vite; Three.js for the globe; D3 Geo and TopoJSON for geographic rendering; Radix primitives for accessible tabs and dialogs; and Lucide icons. See [DESIGN.md](DESIGN.md) for the original design references, visual tokens, and responsive decisions. The current interface uses a dark theme with lime accents.

## Data and assets

- `public/data/countries.json`: [world-atlas](https://github.com/topojson/world-atlas), based on Natural Earth; bundled locally to remove the runtime map-CDN dependency. This low-resolution dataset omits some small countries and islands. Country search still provides access to the full facts catalogue. Geographic boundaries follow this source dataset.
- `public/data/facts.json`: [mledoze/countries](https://github.com/mledoze/countries), distributed under [ODbL 1.0](https://github.com/mledoze/countries/blob/master/LICENSE). Original data is retained.
- `public/data/populations.json`: [samayo/country-json](https://github.com/samayo/country-json), distributed under [MIT](https://github.com/samayo/country-json/blob/master/LICENSE). Population figures are dataset estimates, not live demographic data. Curated destinations have rounded editorial estimates.
- The country photo library covers all 250 countries and territories in the facts catalogue. Photographs are bundled in `public/images/countries/`; `public/data/country-images.json` records each image’s country, source, photographer, licence, and licence URL. Sources are country-specific Wikivoyage travel guides and Wikimedia Commons files. Photo credits appear on the country panel. The six original featured destinations retain their Unsplash photographs. Manrope and DM Sans are loaded from Google Fonts.
- Refresh photographs with `node scripts/sync-country-images.mjs`. Use `--metadata-only` to resolve sources and credits, `--download-only` to resume downloads, and `--fill-gaps` to try alternate guides for missing images. This requires network access; the helper caches progress and respects rate-limit pauses. Country images work without a runtime Wikimedia API request. Missing/failed images retain the neutral visual fallback.

## Verification and limitations

`npm test` runs assistant adapter tests, journal export tests, and a bundled Piper asset integrity check. Journal tests verify that every photo stays with the correct journey in cover order, legacy entries export without photos, and user text is escaped in the generated print document. `npm run build` checks TypeScript and creates the production bundle; `npm run lint` runs Oxlint.

The original sections were inspected on desktop and mobile using Playwright. The recent photo upload, gallery, and card layout changes have not been visually verified in an automated browser session. To check them manually, create a journey with several photos, change its cover, save and reload, browse the gallery, and export a PDF with all photos.

No live account system, cloud journal storage, bookings, or live pricing is included. Country coordinates determine globe pin placement; a pin marks the country rather than the exact location of a trip.
