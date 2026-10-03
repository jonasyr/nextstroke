# Fineliner Lupe Legacy Prototype

This directory is an exact import of the previously hosted static Site source at commit `7473fa2`.

## Run

```bash
./prepare-vendor.sh
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`.

The app has no build step. `dist/` contains the authored HTML, CSS, JavaScript, and current demo images. The complete PDF.js runtime, fonts, CMaps, WASM files, and licenses are stored byte-for-byte in `vendor.tar.gz`; `prepare-vendor.sh` extracts them to the ignored `dist/vendor/` directory.

Archive SHA-256: `2359ac7737a9808291f33b23972db5a7388794673f139f1943160f2dea4bc203`.

## Status

- Preserve this implementation as the product's behavioral reference.
- New production work follows the approved spec and phase plans rather than extending this single static bundle indefinitely.
- Do not treat bundled demo images as a reusable test corpus.
- PDF.js licenses are preserved inside `vendor.tar.gz` and appear under `dist/vendor/` after preparation.
