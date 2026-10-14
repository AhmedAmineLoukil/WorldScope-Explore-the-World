# Worldscope

A travel discovery platform with three connected sections: Discover, Assistant, and Travel Log.

## Run locally

```sh
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

```sh
npm run build
npm test
npm start
```

`npm start` serves the built application and its assistant endpoint at `http://localhost:3000`. Vite development serves the same assistant endpoint through middleware. `npm run preview` previews static files only; use `npm run dev` or `npm start` for Assistant functionality.

## Features

- **Discover:** genuine WebGL 3D globe with country boundaries, country picking, hover labels, smooth camera transitions, drag rotation, wheel/pinch zoom, zoom/reset controls, optional auto-rotation, country search (`Ctrl/Cmd + K`), country facts, destination photography, and a persistent wishlist.
- **Assistant:** Atlas conversation interface, destination prompts, recommendation cards, microphone-driven orb animation, browser speech recognition, spoken replies, and distinct idle/listening/thinking/speaking states.
- **Travel Log:** add/edit/remove completed journeys with arrival/departure dates and notes; unique country and continent totals; trip-day totals; world and continent progress; wishlist; JSON export.
- Shared black-and-white visual system, generous country details, responsive layouts, keyboard navigation, focus management, explicit empty/error states, and reduced-motion support.

Wishlist, journal entries, and conversation history are stored in this browser’s local storage. These do not sync between devices. The travel log can be exported as JSON.

## Enable live AI

Copy `.env.example` to `.env`, set `OPENAI_API_KEY`, and optionally set `OPENAI_MODEL` to a model enabled for your account. Restart the server. Credentials are read by the server only and are never sent to the browser. The integration uses the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/text) with `store: false` and the recent conversation history.

Without a key, Atlas is explicitly labelled **Curated preview**. This is a local recommendation guide with six editorial destinations and general country facts; it is not a live language model. The live provider path is covered by mocked adapter tests but was not exercised against a paid API in this workspace.

Voice input depends on browser support, microphone permission, a secure origin (localhost or HTTPS), and the browser’s speech service. Chrome and Edge generally provide the speech recognition interface. Unsupported/denied input produces a readable error, and typed input remains available. The listening orb reads microphone amplitude through Web Audio. Spoken replies use the browser’s speech synthesis; the speaking animation is decorative. Actual microphone hardware and end-to-end transcription were not verified by the automated browser run.

## Design and research

See [DESIGN.md](DESIGN.md) for component references, visual tokens, responsive decisions, and verification details. The requested 21st.dev and shadcn MCP servers were not exposed during implementation; their public documentation and component references were used instead. Accessible tabs and dialogs use Radix primitives.

## Data and assets

- `public/data/countries.json`: [world-atlas](https://github.com/topojson/world-atlas), based on Natural Earth; bundled locally to remove the runtime map-CDN dependency. This low-resolution dataset omits some small countries and islands. Country search still provides access to the full facts catalogue. Geographic boundaries follow this source dataset.
- `public/data/facts.json`: [mledoze/countries](https://github.com/mledoze/countries), distributed under [ODbL 1.0](https://github.com/mledoze/countries/blob/master/LICENSE). Original data is retained.
- `public/data/populations.json`: [samayo/country-json](https://github.com/samayo/country-json), distributed under [MIT](https://github.com/samayo/country-json/blob/master/LICENSE). Population figures are dataset estimates, not live demographic data. Curated destinations have rounded editorial estimates.
- The country photo library covers all 250 countries and territories in the facts catalogue. Photographs are bundled in `public/images/countries/`; `public/data/country-images.json` records each image’s country, source, photographer, licence, and licence URL. Sources are country-specific Wikivoyage travel guides and Wikimedia Commons files. Photo credits appear on the country panel. The six original featured destinations retain their Unsplash photographs. Manrope and DM Sans are loaded from Google Fonts.
- Refresh photographs with `node scripts/sync-country-images.mjs`. Use `--metadata-only` to resolve sources and credits, `--download-only` to resume downloads, and `--fill-gaps` to try alternate guides for missing images. This requires network access; the helper caches progress and respects rate-limit pauses. Country images work without a runtime Wikimedia API request. Missing/failed images retain the neutral visual fallback.

Six assistant adapter tests verify preview signalling, request validation, origin checks, credential isolation, response extraction, and provider errors. Playwright was used to inspect each section on desktop and mobile and exercise the principal interactions. No live account system, cloud journal storage, bookings, or live pricing is included.
