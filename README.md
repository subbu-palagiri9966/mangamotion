# MangaMotion

Upload a comic chapter, analyze its story and panels, and generate short animated shots. No manual dialogue writing is required.

## Two workflows

- **Camera-motion preview:** local pan/zoom and WebM export, without AI generation.
- **AI animation:** Gemini story and character analysis → panel crops → Runway image-to-video → FFmpeg MP4 assembly. Requires configured API keys, approved provider calls and FFmpeg. The AI workflow is implemented but has not been tested against paid providers in this workspace.

The first AI cut supports 1–6 chapter pages, up to three visual reference images, and five-second generated shots. The selected target duration sets the maximum shot count; the actual duration and estimate are shown after analysis. Outputs are silent. Appearance descriptions guide consistency but do not guarantee it.

## Run

Use Node.js 22+.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4173** and keep the terminal open. Without API keys the local preview remains available. PDF decoding downloads PDF.js from its CDN.

Read [AI_SETUP.md](AI_SETUP.md) for provider configuration, cost controls, local storage, limitations and verification details.

## Verify

```sh
npm test
```

Tests need FFmpeg and FFprobe on PATH. Provider tests use stubs and never charge credits. The media test runs real FFmpeg.

## Rights and privacy

Use original, appropriately licensed or public-domain material. Keep source credits and licence notices in shared adaptations. API keys belong only in `.env`, never in the browser or repository. Pages remain in the browser for the local preview; AI analysis uploads them to the local server and Gemini, and video generation sends the selected crops to Runway. The server stores jobs in the Git-ignored `.mangamotion/` directory.

This is a single-user local development server, not a public hosting deployment. No accounts, billing system, voice cloning or reference-video extraction is included.
