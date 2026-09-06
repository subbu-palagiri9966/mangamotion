# MangaMotion Project Handoff

**Repository:** https://github.com/subbu-palagiri9966/mangamotion  
**Local folder:** `/Users/subramanyampalagiri/Documents/Codex/2026-07-13/browser-plugin-browser-openai-bundled`  
**Prepared:** 6 September 2026
**Current branch:** `feature/panel-selection`
**Remote main branch:** up to date through pull request #9 (`bdb6db1`)

## Status update — 6 September 2026

- Local OCR for images and scanned PDF pages was fixed, tested with `Ghosts Book 1 Excerpt.pdf`, merged as PR #8, and its completed feature branch was deleted.
- PR #9 added a visible **Show page** control. A creator can enter a PDF page number, confirm the preview shows the intended comic panels, and only then run local OCR.
- The current in-progress branch, `feature/panel-selection`, adds a manual drag-to-select area for a chosen PDF page. OCR will read only that selected panel or speech area; choosing no area keeps whole-page OCR available.
- This remains a browser-only prototype. It does not upload selected comics, call a paid AI model, or generate/export real video yet.

## Project title and short description

**Title:** MangaMotion - AI Comic-to-Animation Studio

**Short description:** MangaMotion is an anime-inspired creator tool for turning an original comic image or PDF into a short, directed animated scene. The current version is a polished browser-only prototype: it previews files locally, suggests a scene structure, lets a creator adjust the result, and demonstrates a motion preview. It does not yet generate an actual video.

## 1. Project goal

MangaMotion is an anime-inspired web experience for creators who want to start with an **original comic image or PDF**, choose creative direction, and eventually create a short animated manga-style video.

The long-term journey is:

1. Upload a comic page or chapter.
2. Detect panels, characters, speech bubbles, and dialogue.
3. Suggest a scene plan.
4. Let the creator adjust important creative choices.
5. Generate and export an animated, voiced scene.

The current website is a polished **front-end prototype**, not a production AI video generator yet. It demonstrates the workflow and keeps all selected files and saved drafts on the user's device.

## 2. What the user originally wanted

- A good-looking, user-friendly anime website.
- Smooth loading/progress animations.
- A real-world GitHub learning experience: branches, commits, pushes, pull requests, merges, and branch cleanup.
- A future tool that turns uploaded comics into animated manga motion videos.
- Creative controls only where they improve the final output, rather than making the creator fill in unnecessary forms.

## 3. Current product experience

### Implemented and working locally

- Responsive anime-inspired landing page.
- File picker and drag-and-drop upload for PNG, JPG, and PDF files.
- Local image/PDF preview. The selected source file remains in the browser; it is not uploaded to a server.
- Three-step animated upload/processing feedback.
- A demo scene plan with character notes, panel sequence, scene direction, and dialogue direction.
- Scene editor:
  - title
  - scene direction
  - mood
  - camera treatment
  - voice direction
  - duration
  - focus panel
- Dialogue editor:
  - speaker name
  - dialogue line
  - delivery style
- Browser-only scene preview with simple camera-style motion and a progress bar.
- Local project library: save, reopen, and delete scene-setting snapshots using browser storage.

### Local OCR — complete and tested

Free, browser-only dialogue extraction is now available on `main`.

- For regular image uploads, it enlarges and contrast-adjusts the image, then uses Tesseract.js locally in the browser.
- For scanned PDFs, it now renders comic pages locally and runs OCR on them. This is important because the supplied `Ghosts Book 1 Excerpt.pdf` is artwork/scanned pages rather than a PDF with an embedded text layer.
- The supplied `Ghosts Book 1 Excerpt.pdf` is the current test file. It has artwork/scanned pages, including pages with speech/text bubbles, so normal PDF text extraction alone is not sufficient.
- OCR is a suggestion only. Comic lettering, stylized fonts, and text inside a phone can be misread, so the creator should review it before saving.

The `Ghosts Book 1 Excerpt.pdf` test successfully placed detected dialogue into the editor after choosing a comic-story page. OCR is still a suggestion only: comic lettering, stylized fonts, and text inside a phone can be misread, so the creator should review it before saving.

## 4. What is deliberately not implemented yet

The current site does **not** perform these production actions:

- AI panel detection.
- Reliable speech-bubble detection or OCR across a whole book.
- Character identification and consistency tracking.
- AI image-to-video generation.
- Text-to-speech voice generation.
- Lip sync, audio mixing, rendering, downloadable video files, or video export.
- Login, accounts, cloud sync, payment, or hosted project storage.

The current “animation preview” is an in-browser mockup. It helps decide pacing/camera direction but does not create a video.

## 5. Recommended creator workflow

The manual controls are useful, but should be optional and should appear after the AI makes a first suggestion.

Recommended final product flow:

1. Upload a comic page or PDF.
2. AI detects panels and speech bubbles, then proposes a scene plan.
3. Creator reviews a small number of important choices:
   - which panel or moment to animate;
   - scene pace/mood;
   - camera movement;
   - dialogue corrections;
   - preferred voice and delivery.
4. Creator clicks **Generate preview**.
5. The system creates a short draft video.
6. Creator edits, regenerates specific scenes, then exports the finished clip.

The existing editor is therefore useful as a prototype of the **review and override** stage, not as a requirement that every user must fill every field from scratch.

## 6. Technology and costs

### Currently used

- Plain HTML, CSS, and JavaScript.
- Browser storage (`localStorage`) for local drafts/project cards.
- Tesseract.js loaded from a CDN for free browser-side OCR.
- PDF.js loaded from a CDN to render scanned PDF pages locally.

There is currently no paid AI API, no backend, no database, and no user payment required to run the prototype.

### Future production choices

For a real video-generation service, paid infrastructure is usually unavoidable because video models need expensive GPU compute. A sensible approach is:

- Keep browser-only preview/OCR free or low-cost.
- Use a hosted vision/OCR service or self-hosted open-source model for panel understanding.
- Use an image-to-video model only after the creator approves the scene, to control cost.
- Add usage credits/subscriptions only once real video rendering exists.

Do not put paid API keys in this static website or commit them to GitHub. A future backend must keep keys private.

## 7. GitHub history and learning timeline

The project has followed a healthy small-feature workflow: create a branch, make a focused change, commit it, push it, open a pull request, review/merge, then delete the finished branch.

| Date | Feature branch | Commit | Pull request / result |
| --- | --- | --- | --- |
| 13 Jul 2026 | `main` | `3acb6b0` Create MangaMotion landing page | Initial project |
| 13 Jul 2026 | `feature/upload-feedback` | `c721d07` Improve comic upload feedback | Merged as PR #1 (`13f6aee`) |
| 16 Jul 2026 | `feature/file-preview` | `db7ae34` Add local file preview | Merged as PR #2 (`ac446b3`) |
| 25 Jul 2026 | `feature/scene-plan` | `e18d66d` Add demo scene plan | Merged as PR #3 (`92300f6`) |
| 28 Jul 2026 | `feature/scene-editor` | `2f87c0f` Add editable scene controls | Merged as PR #4 (`42ce7ee`) |
| 28 Jul 2026 | `feature/animation-preview` | `ce32049` Add local animation preview | Merged as PR #5 (`da71ef0`) |
| 28 Jul 2026 | `feature/project-library` | `2f25d8e` Add local project library | Merged as PR #6 (`b93ec86`) |
| 01 Aug 2026 | `feature/dialogue-editor` | `1f8d409` Add local dialogue editor | Merged as PR #7 (`07383b6`) |
| 6 Sep 2026 | `feature/local-ocr` | `25a907f` Add local OCR for scanned comic PDFs | Merged as PR #8 (`2757feb`) |
| 6 Sep 2026 | `feature/page-selector` | `73297f8` Add PDF page selector for OCR | Merged as PR #9 (`bdb6db1`) |

Some old branches were restored/deleted while learning GitHub. That is normal and did not damage the main branch. The current remote `main` contains the completed OCR and page-selector work through PR #9.

## 8. Current repository state

- Current branch: `feature/panel-selection`.
- Remote: `origin` points to `https://github.com/subbu-palagiri9966/mangamotion.git`.
- The active panel-selection change has uncommitted modifications in:
  - `app.js`
  - `index.html`
  - `styles.css`
  - `README.md`
  - `PROJECT_HANDOFF.md`
- A local server has been used successfully at `http://localhost:4173`.
- The landing page, local server, and local OCR behaviour load and have been tested with the Ghosts PDF. The panel-selection feature should be tested, committed, pushed, reviewed, and merged next.

## 9. File guide

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, upload section, scene plan, editor, preview, and project library UI. |
| `styles.css` | Visual design, responsive layout, animations, and editor/preview styling. |
| `app.js` | Upload behaviour, local preview, scene state, local storage, animation mockup, and OCR logic. |
| `README.md` | Short project overview and local running instructions. |
| `PROJECT_HANDOFF.md` | This detailed continuation guide. |

## 10. How to run and test now

1. Open Terminal in the repository folder.
2. Run `python3 -m http.server 4173`.
3. Visit `http://localhost:4173`.
4. Upload `/Users/subramanyampalagiri/Downloads/Ghosts Book 1 Excerpt.pdf`.
5. Wait for the regular three-step upload sequence.
6. In **Comic page to read**, enter a comic-story page such as `10`; do not use the cover or credits pages.
7. Click **Show page** and visually confirm the preview contains the intended panels.
8. Click **Find comic dialogue** once.
9. Watch the status text. The app first tries the PDF's own text, then reads only the chosen page locally if it is a scan.
10. Wait roughly 30-90 seconds on the first run because the free OCR library must download and analyse the page. Later attempts should be faster.
11. Check that the detected text appears in **Dialogue line** in the scene editor. The Ghosts PDF was verified to return real dialogue from page 10.
12. Correct OCR mistakes manually, then save the scene draft.

If OCR still does not fill the dialogue field, open browser Developer Tools and copy the Console error, plus capture a screenshot that includes the small OCR status message directly below the PDF preview. That evidence is needed to diagnose the issue accurately.

## 11. Next work, in priority order

### A. Finish and commit the current manual panel-selection feature

1. Test with the Ghosts PDF while viewing the status message.
2. Enter page `10`, click **Show page**, and confirm the preview updates to that page.
3. Drag over a panel or the speech bubbles you want to read, then choose **Find comic dialogue**.
4. Confirm only the selected region is sent to browser-local OCR and that **Read whole page** resets the choice.
5. Commit, push, open PR, merge, then delete `feature/panel-selection`.

Suggested commit title: `Add manual panel selection for OCR`
Suggested PR title: `Add manual panel selection for OCR`
Suggested PR description: `Adds a drag-to-select panel area for a chosen PDF page, so browser-local OCR can read only the intended speech bubbles or comic panel.`

### B. Automatic panel and speech-bubble selection

After the manual workflow is reliable, add optional AI-assisted panel and speech-bubble detection. The creator must still be able to correct the suggested area before analysis.

### C. Real AI analysis backend

Build a secure backend that accepts only consented uploads, performs panel/speech-bubble detection, stores temporary processing jobs, and protects all API keys.

### D. Video generation prototype

Start with a 3-5 second clip for one selected panel. Do not attempt a whole comic book at first. Add generation status, retry/error handling, and cost controls.

### E. Creator accounts and projects

Only after generation works: add login, cloud projects, source-file storage permissions, history, exports, usage limits, and billing.

## 12. GitHub workflow for every future feature

1. Start on `main` and fetch/pull the latest version.
2. Create one clear feature branch, for example `feature/panel-selector`.
3. Make and test a focused change.
4. In GitHub Desktop, inspect the changed files.
5. Write a short **Summary**: what changed.
6. Write an optional **Description**: why it changed or how it was tested.
7. Commit: save the current change into the local branch history.
8. Push/Publish: upload that branch to GitHub.
9. Preview/Create pull request: ask to merge the branch into `main`.
10. Review the changed files, then merge when correct.
11. Switch to `main`, pull changes, test the merged site, then delete the finished feature branch locally and on GitHub.

Key idea: a **branch** is a safe work lane, a **commit** is a saved checkpoint, a **push** sends that checkpoint to GitHub, and a **pull request** is the review/merge request.

## 13. Prompt for a new Codex account

Copy and paste the following message into a new Codex chat after opening the repository folder:

> I am continuing the MangaMotion project in `/Users/subramanyampalagiri/Documents/Codex/2026-07-13/browser-plugin-browser-openai-bundled`. Read `PROJECT_HANDOFF.md` and `README.md` first. The goal is an anime-inspired creator tool that will eventually turn original comic pages/PDFs into short animated, voiced scenes. This is currently a static HTML/CSS/JavaScript prototype. PR #8 completed browser-only OCR for images and scanned PDFs, and PR #9 added an explicit PDF-page selector. The Ghosts PDF at `/Users/subramanyampalagiri/Downloads/Ghosts Book 1 Excerpt.pdf` was verified to return dialogue from page 10. The active branch is `feature/panel-selection`, with uncommitted changes adding a manual drag-to-select panel area before OCR. Test at `http://localhost:4173`, then continue from the "Finish and commit the current manual panel-selection feature" section. Explain each GitHub action before asking me to do it, because I am learning GitHub.

## 14. Safety and product principles

- Work only with comics the creator owns or has permission to use.
- Tell users clearly whether a file stays local or is uploaded.
- Make AI suggestions editable and never present OCR as perfectly accurate.
- Keep paid model keys and user data off the static front end.
- Start small: one page, one panel, one short generated clip.
