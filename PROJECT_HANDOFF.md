# MangaMotion implementation handoff

## Update — 13 September 2026

The uploaded backend foundation has been integrated and extended on `feature/ai-animation-pipeline`. See `AI_SETUP.md` for the current executable workflow and setup. Gemini analysis, validated panel crops, Runway task submission/polling, disk persistence and FFmpeg MP4 assembly are now implemented. Provider tests are simulated; no paid call or actual animation-quality validation has occurred. The older roadmap below is historical and describes the intent behind the original static MVP.

## Product decision

MangaMotion is no longer a dialogue editor or a fake AI scene planner. Its single primary workflow is:

`chapter upload → automatic understanding → generated animation → video export`

The current static application implements the upload and motion-video ends of that workflow honestly. The middle generative layer is the next milestone.

## Current implementation

- Static HTML/CSS/JavaScript; no build step
- One chapter PDF or ordered image pages
- PDF.js page rendering (maximum 60 pages for browser memory safety)
- Automatic page-to-shot sampling based on target runtime
- Canvas renderer with pan, zoom, shot transitions, and three motion strengths
- 16:9, 9:16, and 1:1 output
- Optional licensed music through Web Audio
- MediaRecorder WebM export
- Explicit authorised reference-pack intake for visual, voice, and music assets
- No dialogue fields, local project library, fake character analysis, or pretend generative result

## Required production architecture

### 1. Ingestion service

- Store original chapters in private object storage.
- Virus-scan and validate uploads.
- Render PDFs and preserve page order.
- Detect panels and speech bubbles, but do not require the user to edit dialogue.

### 2. Chapter-understanding service

- Vision-language model produces a structured chapter manifest.
- Track character identity, clothing, location, action, emotion, and continuity per panel.
- Create scene boundaries and a shot list from the whole chapter, not isolated prompts.
- Persist confidence and provenance so uncertain matches can be reviewed.

Suggested manifest shape:

```json
{
  "chapterId": "chapter_001",
  "characters": [{ "id": "char_01", "name": "Lead", "referenceAssetIds": [] }],
  "scenes": [{
    "id": "scene_01",
    "location": "harbour",
    "characters": ["char_01"],
    "shots": [{ "panelId": "page_03_panel_02", "action": "turns toward the ship", "duration": 3.2 }]
  }]
}
```

### 3. Reference service

- Accept only user-owned, public-domain, or licensed assets.
- Record rights declarations and deletion/retention rules.
- Build character appearance embeddings from authorised images/clips.
- Use voice cloning only with the speaker's consent and appropriate rights.
- Use uploaded music only when licensed for the intended output.

### 4. Shot-generation workers

- Generate one short shot at a time from the source panel, action, camera direction, and character reference.
- Pin character/reference adapters across every shot in a scene.
- Reject or regenerate frames that fail identity, clothing, or anatomy checks.
- Keep dialogue generation optional; MangaMotion's core workflow must work without it.

### 5. Assembly service

- Join accepted shots with FFmpeg.
- Add licensed music and, when requested, consented speech.
- Normalise audio, create captions, and export MP4/HLS.
- Allow regeneration of one failed shot without rerendering the chapter.

## Recommended stack for the next milestone

- Frontend: keep this UI or migrate it to Next.js when accounts are added.
- API: Python FastAPI.
- Jobs: Redis queue plus GPU workers.
- Data: PostgreSQL for projects/manifests; S3-compatible storage for assets.
- Media: FFmpeg.
- Models: provider adapters rather than one hard-coded vendor. Start with a hosted image-to-video provider, then add self-hosted workers when usage justifies GPU cost.

## Next build slice

Build one vertical slice for a 3–5 page original/licensed test chapter:

1. Upload to a private backend.
2. Detect panels and create the chapter manifest.
3. Generate only 3–5 consistent silent shots.
4. Assemble an MP4.
5. Return job progress and a downloadable result.

Do not begin with an entire commercial One Piece chapter. Use an original or explicitly licensed test chapter, validate consistency and cost, then scale the same job architecture.
