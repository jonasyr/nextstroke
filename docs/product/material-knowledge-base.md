# Material Knowledge Base Design

**Status:** Approved MVP subsystem

**Initial scope:** Fineliners and relevant paper properties

**Later scope:** Colored pencil after a separate evidence gate; watercolor after field research

## Purpose

The knowledge base constrains recommendations to actions that are plausible with the user's actual tool and surface. It is not a shopping catalog and it is not an LLM memory store.

Example: rather than suggesting “add a soft white highlight” to a user who owns only a black fineliner, NextStroke suggests a feasible negative-space or surrounding-hatching technique.

## MVP experience

The user may:

1. select one of 10–20 curated black fineliners;
2. choose a generic unknown-fineliner profile;
3. select or describe paper type;
4. optionally complete a two-minute calibration card on the actual paper;
5. see which facts and tests informed an instruction.

Barcode/photo recognition is later convenience work. It must never be the only way to identify a tool.

## Evidence levels

| Level | Source | Permitted use |
| --- | --- | --- |
| A | Standard, certification, official technical document | Product property with direct citation and exact scope |
| B | Official manufacturer product page or catalog | Attributed manufacturer claim; not treated as an independent measurement |
| C | Controlled NextStroke test with recorded method and sample | Observed behavior for the tested pen, paper, environment, and revision |
| D | Reputable independent comparison with disclosed method | Supporting evidence or hypothesis; never the only safety basis |
| E | Community report | Failure discovery and research lead only |

Conflicting evidence remains visible. Newer manufacturer text does not silently overwrite a controlled test, and one paper result does not generalize to every paper.

### Maximum confidence per evidence level

| Level | Maximum confidence | Note |
| --- | --- | --- |
| A | high | Only within the scope the document states |
| B | medium | Attributed as the manufacturer's claim |
| C | high | Only for the tested pen, paper, environment, and revision; otherwise medium |
| D | medium | Never the only basis for a safety-relevant instruction |
| E | low | Not shown to users as a fact |

Build-time validation rejects a claim whose confidence exceeds its level's maximum.

## Minimum data model

```ts
type EvidenceLevel = "A" | "B" | "C" | "D" | "E";

interface MaterialClaim {
  id: string;
  subjectId: string;
  predicate: string;
  value: string | number | boolean;
  unit?: string;
  conditions?: Record<string, string | number>;
  sourceId: string;
  evidenceLevel: EvidenceLevel;
  confidence: "high" | "medium" | "low";
  verifiedAt: string; // date a curator last checked the claim against its source
  supersedesClaimId?: string;
}

interface SourceRecord {
  id: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: "standard" | "certification" | "manufacturer" | "nextstroke-test" | "independent-test" | "community";
  retrievedAt: string;
  licenseNote: string;
}

interface FinelinerProfile {
  id: string;
  brand?: string;
  productLine?: string;
  variant?: string;
  gtin?: string;
  nominalTipMm?: number;
  inkFamily?: "pigment" | "dye" | "unknown";
  colorFamily: string;
  generic: boolean;
}
```

Paper, calibration sample, technique rule, and compatibility assertion are separate entities. Never flatten context-dependent observations into universal pen facts.

## Recommendation rules

- Deterministic rules filter impossible or unverified actions before an LLM sees them.
- The LLM receives only selected claims, their conditions, and citations.
- Every instruction identifies required tool, motion, approximate spacing/pressure, order, and a reversible practice step.
- If tool or paper is unknown, recommendations become more conservative.
- A generated image never upgrades the confidence of a physical material claim.

## Calibration card

The optional card contains:

- single horizontal and vertical strokes;
- three spacing densities of parallel hatching;
- one cross-hatching cell;
- one stippling cell;
- one two-pass overdraw sample;
- a timestamped dry/smudge check when relevant;
- a blank paper patch for camera white-balance comparison.

The MVP may use the photograph to estimate relative line width, darkness, local paper texture, and camera exposure. It must not claim absolute colorimetry from an uncalibrated iPhone image.

## Seed sources

- Sakura Pigma Micron official product information: `https://www.sakuraofamerica.com/product/pigma-micron/`
- Royal Talens Sakura Pigma collection: `https://www.royaltalens.com/collections/sakura-pigma`
- STAEDTLER pigment liner 308: `https://www.staedtler.com/intl/en/products/products-for-colouring/fineliners/pigment-liner-308-fineliner-m308/`
- Faber-Castell fineliner FAQ: `https://www.faber-castell.com/service/frequently-asked-questions/faq-fineliner-felt-tip-pens-markers`
- ACMI certified-product search: `https://www.acmiart.org/certified-products-search-tool`
- ASTM D6901 colored-pencil standard, later-phase reference: `https://www.astm.org/d6901-15r21.html`
- Strathmore 500 Series Bristol paper guidance: `https://www.strathmoreartist.com/draw-bristol/500-series-bristol`
- Wikidata REST API for generic entity identifiers only: `https://www.wikidata.org/wiki/Wikidata:REST_API`
- GS1 product identifiers: `https://www.gs1.org/standards/get-barcodes`
- Open color-science datasets for later calibration research: `https://github.com/colour-science/colour-datasets`

## Copyright and data-use rule

Store normalized facts, identifiers, short original paraphrases, provenance, and links. Do not copy manufacturer product descriptions, photographs, charts, or paid standards into the repository. Confirm API and dataset terms before automated ingestion. GS1 identifies products but does not supply all artistic properties for unrestricted reuse.

## MVP acceptance

- every non-generic product property has a source;
- every source has retrieval date and usage note;
- rules work without network access after the curated dataset ships;
- an unknown pen remains usable through a conservative generic profile;
- calibration is skippable and its confidence limits are explained;
- no model can introduce an unsourced fact into a user-facing instruction.

## Phase 0 material sheet

Phase 0 uses a short throwaway sheet covering only the pens in the corpus and study plus the generic profile. It follows the same source, evidence-level, and retrieval-date rules but is not the shipped dataset.

## Open items before Phase 3

- Paper, calibration sample, technique rule, and compatibility assertion schemas.
- License for the curated dataset as distributed (facts and paraphrases), separate from the AGPL code license.
