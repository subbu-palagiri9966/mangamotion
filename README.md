# MangaMotion

MangaMotion is a chapter-first comic-to-animation studio. The product is deliberately focused on one journey:

1. Upload one manga/comic chapter as a PDF or ordered page images.
2. Optionally add an authorised series reference pack.
3. Map the chapter into shots.
4. Generate, preview, and export a motion cut.

There are no required dialogue forms or manual scene-planning screens.

## What works in this browser MVP

- One PDF or multiple PNG/JPG/WebP page uploads
- Local PDF rendering for up to 60 pages
- Automatic selection of pages for a 15, 30, or 60-second cut
- Landscape, vertical, and square framing
- Cinematic, energetic, and gentle camera motion
- Cross-shot transitions and a real-time canvas preview
- Optional licensed music in preview/export
- WebM video export in supported Chromium browsers
- Optional visual, voice, and music reference-pack intake with a rights confirmation

Uploaded material stays in the browser. This version animates the existing artwork; it does not yet generate new character poses or movement.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173` in a current Chrome or Edge browser. PDF rendering requires an internet connection to load PDF.js from the CDN.

## Product boundary

Visual references and consented voice samples are collected for the future model pipeline but are not sent anywhere or applied by this static MVP. The product must not scrape anime episodes, clone performers' voices, or reuse commercial soundtracks without permission.

See [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) for the implementation roadmap.
