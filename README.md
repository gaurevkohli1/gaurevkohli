# Gaurev Kohli — Cinematic Scroll Portfolio

Award-style personal portfolio with a scroll-scrubbed 3D orbit hero (193-frame canvas
sequence generated with Seedance 2.0 on Higgsfield), kinetic display typography,
pinned cinematic scenes, and Lenis smooth scroll.

## Stack

- Vite + vanilla JS
- GSAP ScrollTrigger (scroll choreography, frame scrub, count-ups)
- Lenis (smooth scroll)
- Anton + Space Grotesk (self-hosted)

## Run

```bash
npm install
npx vite          # http://localhost:5173
```

## Verify

```bash
npx vite &
node scripts/verify.mjs   # screenshots to /tmp/claude-0/verify + scrub FPS report
```

## Media pipeline

The three background clips were generated on Higgsfield (Seedance 2.0, std, 1080p,
16:9, 8s, identity-referenced). `media-urls.json` + `.github/workflows/fetch-media.yml`
relay generated clip URLs into `public/media/` via GitHub Actions. The hero orbit is
extracted to JPEG frames with:

```bash
ffmpeg -i public/media/orbit.mp4 -vf "scale=1600:-2" -q:v 3 public/media/frames/orbit_%04d.jpg
```

`public/media/frames/manifest.json` tells the site how many frames to preload.
