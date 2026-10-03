# NextStroke

NextStroke is an iPhone-first physical-art coach in planning and feasibility validation. The repository also preserves the working **Fineliner Lupe** comparison prototype that started the project.

## Existing prototype

The current browser app lives in `legacy/fineliner-lupe/dist/` and supports:

- original and reference image upload;
- image and PDF input;
- automatic and manual alignment;
- opacity comparison and original reveal;
- pan, pinch zoom, fit, and immersive comparison;
- PNG export/share;
- iPhone-oriented Safari controls.

Run it locally from the repository root:

```bash
./legacy/fineliner-lupe/prepare-vendor.sh
python3 -m http.server 4173 --directory legacy/fineliner-lupe/dist
```

Then open `http://localhost:4173`.

The prototype is preserved as a behavioral reference. It is a static built application rather than the planned production architecture. Do not overwrite it while implementing the evidence-backed phases.

## Project status

Read in this order:

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/README.md`](docs/README.md)
3. [`docs/project-state.md`](docs/project-state.md)
4. [`docs/superpowers/plans/2026-10-03-nextstroke-phase-0-proof-of-feasibility.md`](docs/superpowers/plans/2026-10-03-nextstroke-phase-0-proof-of-feasibility.md)

No production rewrite has started. Phase 0 must validate the core preview assumptions before the new architecture is implemented.
