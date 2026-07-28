# MangaMotion

A friendly, anime-inspired landing page for an AI comic-animation studio. It is the first interface for a product that helps creators turn original comic pages into voiced, animated scenes.

## What works now

- Responsive, polished landing page
- Drag-and-drop or file-picker comic upload interaction
- Local image or PDF preview before processing (the selected file stays on the device)
- Demo Scene Plan screen with example panel sequencing, dialogue direction, and character notes
- Local scene editor for title, direction, mood, camera, voice, timing, and panel focus (saved only in the current browser)
- Browser-only animation preview with simple camera-style motion for the selected scene
- Local project library for saving, reopening, and deleting scene-setting snapshots
- Animated three-step processing state and clear completion feedback after a file is selected
- Product sections explaining the creator workflow and benefits

## Run it locally

This is a simple static website. Open `index.html` in a browser, or run a local server from this folder:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Next milestones

1. Connect a backend for panel detection and OCR.
2. Add user accounts and cloud-based project history.

## GitHub learning path

We will use this repository like a real project: make small changes, create a branch when useful, commit with a clear message, push it to GitHub, then open a pull request for review.

This local repository is connected to GitHub. We use feature branches and pull requests for future improvements.
