# ChatGPT Sites Deployment Probe: First iPhone Run

- **Date:** 2026-10-03
- **Plan:** Phase 0 Task 6 deployment probe (`lab/probe/`, commit `8d0b8b6`)
- **Host:** private ChatGPT Sites deployment, static mode, served by Cloudflare (FRA edge)
- **Device:** iPhone with a 375×812 pt screen at 3× (iPhone 11 Pro, 12 mini, or 13 mini class; exact model to be confirmed), iOS 26.5.2 Safari, run as a Home Screen web app
- **Raw result:** shared JSON kept privately; no images were uploaded by the probe

## Results

| Criterion | Result | Detail |
| --- | --- | --- |
| Injected provider scripts | pass | none found |
| Response headers | info | `cache-control: public, max-age=0, must-revalidate`, gzip, Cloudflare; no CSP |
| COOP/COEP | absent | `crossOriginIsolated` false, no `SharedArrayBuffer`: WASM stays single-threaded, as D-038 assumed |
| `.wasm` MIME | pass | `application/wasm`; `instantiateStreaming` and fallback both work |
| Manifest | pass | 200, `application/manifest+json` |
| Home Screen install | pass | ran in standalone mode |
| Service worker | pass | registered and controlling |
| Offline start | pass | loaded from the Home Screen while offline |
| Hash-route reload | pass | |
| Storage | info | quota about 41 GB; `persisted` false; `persist()` not yet requested |
| Canvas limits | pass | 4096², 4097², and 5000×4000 all usable, larger than the 4096² MDN states for iOS |
| opencv.js 5.0.0 (13 MB, single-threaded, worker) | pass | load 843 ms; homography + 2048×1536 warp 163 ms |
| Ten decode → downscale → composite → export cycles | pass | 3024×4032 JPEG (12 MP); 133–320 ms per cycle; no crash or reload |
| Main-thread blocking | note | worst block 285 ms; 3 blocks over 100 ms (main-thread `createImageBitmap` + `drawImage`) |

## Interpretation

- Every hosting criterion that D-038 listed as undocumented passed on a real device. ChatGPT Sites static mode fits the planned PWA: offline service worker, Home Screen install, hash routing, and single-threaded opencv.js.
- The device-cycle evidence for the Phase 0 GO criterion ("no crash or reload in the ten-cycle real-device run") is positive for this device, pending the background/resume step below.
- Main-thread blocks above 100 ms come from decoding and drawing a 12 MP photo on the main thread. They are not a GO criterion, but production imaging should decode and downscale in a worker with `OffscreenCanvas` (Safari 16.4+).
- The spec keeps its 4096 × 4096 canvas cap as a conservative policy even though this device accepted 20 MP.

## Still open

1. Repeat the ten cycles while sending the app to the background once (`backgrounds` was 0).
2. Tap the persistent-storage button and record the answer.
3. Repeat with a 24 MP or 48 MP photo and with a HEIC file (this run decoded a 12 MP JPEG).
4. Confirm the exact iPhone model. If it is an iPhone 11 Pro (A13, same class as iPhone 11), the iPhone 11-class risk in D-034 is largely covered.
