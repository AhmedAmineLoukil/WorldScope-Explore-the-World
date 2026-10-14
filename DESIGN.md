# Worldscope design system

Worldscope is a calm, editorial travel discovery experience. The world itself is the hero, with a photographic destination panel as its companion. Assistant and Travel Log share the same visual language rather than switching to unrelated dashboard styles.

## Visual decisions

- Monochrome foundation: `#f7f7f7`; white surfaces: `#ffffff`; near-black text: `#151515`; black actions: `#171717`; secondary text: `#666666`. The globe uses grey oceans, white land, and charcoal selection. Photography retains natural colour as editorial imagery; text over photographs stays white.
- Manrope headings provide a modern, open silhouette. DM Sans keeps supporting information readable. Small uppercase labels separate context from primary content.
- Spacing follows an 8px rhythm with larger gaps between sections. Borders are quiet, corners range from 6px for controls to 14px for panels, and glass effects are limited to floating navigation and image overlays.
- Country selection eases the camera to its destination and introduces the country panel with a short transition. Image hover, action feedback, and voice states provide deliberate motion. Reduced-motion preferences remove decorative animations.
- Country-specific travel photographs are bundled locally across the full facts catalogue, with source and photographer credits. Portrait photographs can specify a focal position so a landmark stays visible inside the wide header crop; Tunisia’s Sousse photograph uses this adjustment.
- Desktop places a generous 460px country panel beside the globe (500px on large screens), with larger photography, readable descriptions, and prominent fact values. Mobile stacks the globe, country panel, and inspiration cards. Statistics use two columns on mobile; conversation and journal layouts collapse to one.

## Component research

The requested 21st.dev and shadcn MCP tools were not exposed in this session. Their public references were researched instead; this implementation does not claim to have used those MCP servers or copied their component source.

- [21st globe collection](https://21st.dev/community/components/explore/cobe-globe): useful globe composition, subtle orbit paths, and geographic interaction references. A custom Three.js sphere was chosen because country boundary selection and camera control are essential here.
- [21st voice interface guidance](https://docs.21st.dev/blog/react-voice-orb-components): distinct idle, listening, thinking, and speaking states. The listening orb responds to actual microphone amplitude through Web Audio; thinking and speaking use restrained CSS animation.
- [shadcn Sheet](https://v3.shadcn.com/docs/components/sheet): complementary details rather than a competing full-screen view. Discover uses a nonmodal aside so the globe remains interactive.
- [shadcn Command](https://ui.shadcn.com/docs/components/radix/command): compact country search with a shortcut and explicit empty state. The search dialog uses Radix Dialog for focus trapping, Escape handling, and focus restoration.
- [shadcn Tabs](https://ui.shadcn.com/docs/components/base/tabs): consistent active navigation and accessible keyboard interaction. The app uses Radix Tabs as the underlying primitive with custom styling.

## Quality checks

Playwright reviews cover each section at 1440px desktop and 390px mobile widths, plus populated journal states. Functional checks cover country search, direct globe selection, assistant preview recommendations, wishlist transitions, and journal persistence. API adapter tests cover preview mode, validation, origin checks, response extraction, and provider failures.
