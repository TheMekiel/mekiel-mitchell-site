# Mekiel Mitchell Website — Deployment Notes

## Ground Truth
This is NOT a design task. The user provided a complete, pre-built single-file site
(`index.html`) plus a testimony video (`about-video.mp4`). Their files are the
ground-truth spec and must be deployed **as-is**, byte-for-byte, with zero design
changes.

## Chosen Approach: Verbatim Static Hosting
- Serve the user's `index.html` at the site root (`/`).
- Serve `about-video.mp4` at the same flat root path (`/about-video.mp4`) because
  index.html references it via the relative path `./about-video.mp4`.
- No build step; the file is plain HTML/CSS/JS with Google Fonts from CDN.
- Do NOT rename either file; do NOT move the video into a subfolder.

## DEV HANDOFF stubs (MUST remain untouched until real credentials arrive)
- Stripe Checkout stub (console.log only) — lines ~1503, ~2619
- PayPal Checkout stub (console.log only) — lines ~1505, ~2628
- Kit.com (ConvertKit) forms x3 with `REPLACE_WITH_FORM_ID` — lines ~1522, ~1824, ~2298
- Never invent placeholder credentials or fake IDs.

## Technical Strategy
The scaffold is a React/Vite template, but the deliverable is the user's static
HTML. Replace the Vite entry `client/index.html` content pipeline: the simplest
robust approach is to place the user's `index.html` as the served root document.
Since Vite processes `client/index.html` as its entry, we will verify whether the
user's plain HTML survives the Vite build unmodified (it has no module scripts, so
Vite should pass it through, only injecting nothing). The video is large (21 MB),
so it must be uploaded via `manus-upload-file --webdev` — BUT the site references
it at `./about-video.mp4`. Options:
1. Host video in `client/public/` — forbidden (deployment timeout risk for large media).
2. Upload video to webdev static storage and patch ONE src attribute in index.html
   to the storage URL — minimal, functional, but changes the file.
3. Keep `./about-video.mp4` and add a redirect — not possible in static hosting.
Decision: upload the video to persistent webdev storage and check whether the
returned URL can live at a root-relative path; if not, ask/inform the user of the
single-line src change (functionality identical). Prefer keeping user requirement:
test if serving from client/public works within size limits first.
