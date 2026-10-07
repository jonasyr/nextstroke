# Open pen-and-ink drawings for inspiration (research note)

**Date:** 2026-10-07 · **Status:** evidence for a later decision; nothing is built, collected or committed · **Question (owner):** Are there large public sets of human drawings, ideally fineliner, to show users similar work as inspiration?

## Short answer

There is no large, freely licensed set of modern fineliner drawings. Social-media drawings (Inktober, Instagram, Pinterest) are copyrighted and excluded (AGENTS rule 9, D-042). Sketch research sets (Quick, Draw!, TU-Berlin, Sketchy, DomainNet) are quick outline doodles or carry research-only or unclear licences. Museum open-access collections hold thousands of public-domain pen-and-ink drawings with CC0 images and metadata that can be filtered by medium: historical, but real ink line work with hatching and stippling.

## Counts measured on 2026-10-07 (public APIs, no key)

| Source | Query | Result |
|---|---|---|
| Art Institute of Chicago (`api.artic.edu`) | public domain, image present, medium contains "pen" and "ink", no wash or watercolor | 1,196 |
| same | … and "black ink" | 589 |
| Metropolitan Museum (`collectionapi.metmuseum.org/public/collection/v1.1/search`) | "pen and black ink", has images, public domain | 27,359 matches |
| same | random sample of 25: medium has pen and ink, no wash or watercolor | 6 of 25 (rough estimate 3,000–10,000 pure line drawings) |
| Cleveland Museum of Art (`openaccess-api.clevelandart.org`) | type Drawing, CC0, "pen and ink" | 606 |

Not queried yet: Rijksmuseum, National Gallery of Art (CSV on GitHub), Smithsonian Open Access, Wikimedia Commons.

Note: the Met retired `/public/collection/v1/search` on 2026-10-01; use `v1.1/search` (paginated; deep offsets return no IDs, so enumerate with `/v1/objects` or the Open Access CSV).

## How a curated set could be built

1. Metadata filter: public domain or CC0, image present, classification Drawing, medium with pen and black ink, without wash, watercolor, gouache or chalk.
2. Image filter: mostly two-tone (bimodal histogram), enough line contrast, sheet fills the image.
3. Technique tags (hatching, cross-hatching, stippling, contour) proposed by line analysis similar to the test card, confirmed by hand; motif tags from titles and subjects.
4. A few hundred reviewed images, stored with source, object id, licence and retrieval date (same provenance rule as material claims).
5. Showing them: "So haben es andere gelöst" next to the three ideas, matched by intent and technique; later, similarity to the user's photo through image embeddings (Phase 4 or later).

## Limits

Historical master drawings in brown or black ink are a model, not "looks like mine" for a beginner with a 0.3 mm pen. Many modern-looking sheets in these collections are still under copyright and excluded by the public-domain filter. A large set of modern fineliner work would need an opt-in user gallery, which needs accounts and moderation (later per the master plan).
