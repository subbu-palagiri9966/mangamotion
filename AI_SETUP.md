# MangaMotion AI animation — local setup

This branch builds on the ZIP supplied on 13 September 2026. It adds an executable AI pipeline, not a pre-generated animation or an assurance of production-quality results.

## What it does

1. Your existing browser upload renders PDF pages or image pages.
2. Select **Analyze story and panels** to upload 1–6 resized pages to the local Node server, then send them to Gemini after approval.
3. Gemini returns the chapter summary, recurring character descriptions, ordered action shots and panel coordinates. Outputs are validated before use.
4. The server crops the panels and shows the actual crops, actions, duration and video estimate for review.
5. **Generate animated shots** sends one five-second request per selected panel to Runway gen4_turbo after approval.
6. The backend polls tasks, downloads completed clips and joins them into an H.264 MP4 using FFmpeg.

Character appearance descriptions are reused across shots. This helps consistency but does not guarantee identity, anatomy, motion quality or story faithfulness. Visual references inform Gemini's descriptions; they are not a trained identity adapter. The current AI export is silent. Voice cloning, reference-video extraction, and audio for the AI export are not implemented. The existing camera-motion preview still supports music.

## Requirements

- Node.js 22 or newer
- FFmpeg on PATH (`ffmpeg -version` should work); or set FFMPEG_PATH to its full path
- A Gemini API key with access to your chosen image-capable structured-output model
- A Runway developer API key and API credits

ChatGPT/Codex subscriptions do not provide these third-party API credits.

## Start

```sh
npm ci
cp .env.example .env
```

Edit `.env` locally. Set `GEMINI_API_KEY`, `GEMINI_MODEL`, and `RUNWAYML_API_SECRET`. Set `ENABLE_PAID_GENERATION=true` only when you want provider requests enabled. Never send keys in chat or commit `.env`.

```sh
npm run dev
```

Open **http://127.0.0.1:4173**. Keep the terminal open. The server binds to the IPv4 loopback address; use that exact address if `localhost` fails. Restart after editing `.env`.

## Charges and retries

Analysis is a separate Gemini API request; its cost depends on your model and account. Approving analysis does not approve Runway video generation. Before video generation the app shows an estimate based on the number of actual selected shots, at five seconds per shot and $0.05 per second for gen4_turbo. A three-shot cut is 15 seconds and approximately $0.75, excluding analysis, taxes and other charges.

There are no automatic retries of billed submissions. Network failure after submission may still leave a billed task on Runway. Check the provider dashboard before creating another job. Task IDs are saved whenever received. Failed or interrupted jobs are not automatically resumed; downloading a completed job after restart does not generate again.

## Local data

Pages, cropped panels, job records and generated clips are saved under `.mangamotion/`. This folder and `.env` are ignored by Git. Only the frontend and specific job media are served over HTTP. Do not expose this development server to the internet: it has no multi-user login or quotas. There is no automatic retention cleanup yet; remove a completed job's directory locally when you no longer need its data.

## Tests and current verification

```sh
npm test
```

Tests use simulated provider responses to exercise upload decoding, crop validation, job state, billing guards, task polling, duplicate submission prevention and persistence. A separate test uses real FFmpeg to assemble and inspect an MP4. No paid API call is made by the tests. Live model access, video output quality and character consistency require a real user-approved run; they have not been verified here.

## Provider references

- https://ai.google.dev/gemini-api/docs/image-understanding
- https://ai.google.dev/gemini-api/docs/structured-output
- https://docs.dev.runwayml.com/guides/using-the-api/
- https://docs.dev.runwayml.com/guides/pricing/

Pricing checked 13 September 2026. Review provider pricing before substantial usage.
