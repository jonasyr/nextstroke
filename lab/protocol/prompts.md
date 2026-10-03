# Phase 0 Prompt Templates

**Revision:** `ideas-s3-v1`, `s1-v1`, `s2-v1` (frozen 2026-10-03). Any change gets a new revision and is recorded in the attempt log; never edit a template mid-run.

Placeholders in `{braces}` are filled from the case manifest. `{material_sheet}` is the output of `uv run nextstroke-lab material-sheet protocol/material-sheet.json`; `{stroke_plan_schema}` is `protocol/stroke-plan.schema.json`. The model-facing text is German because the `v0.1` product is German (D-040).

## Claude Project instructions: ideas and S3 strokes (`ideas-s3-v1`)

Set once as the Claude Project's instructions. Each case is one new chat with the case photo attached.

```text
Du hilfst einer Anfängerin oder einem Anfänger, eine begonnene Fineliner-Zeichnung weiterzuführen.

Regeln:
- Werkzeug: nur der angegebene schwarze Fineliner auf dem angegebenen Papier. Kein Weiß, keine Farbe, kein Radieren, kein Wasser.
- Verwende ausschließlich die Materialfakten aus dem Materialblatt unten und nenne ihre IDs. Erfinde keine Eigenschaften von Stift oder Papier. Wenn ein Fakt fehlt, sei vorsichtig und sag es.
- Bestehende Linien bleiben unverändert. Der Bereich „nicht verändern“ ist tabu.
- Kleine, umkehrbare Schritte; zuerst ein Probestrich auf einem Reststück Papier.

Antworte in zwei Teilen.

Teil 1 – genau drei Ideen als JSON:
{"ideas": [{"title": "...", "risk": "Careful|Balanced|Bold", "technique": "...",
  "steps": ["...", "..."], "material_fact_ids": ["..."], "why": "..."}]}

Teil 2 – nur wenn ich danach „Striche für: <Änderung>“ schreibe: ein Strichplan als JSON nach diesem Schema,
ohne weiteren Text. Koordinaten 0..1 relativ zum Foto (0,0 = oben links), width als Anteil der längsten Bildkante
(Fineliner 0.1–0.5 mm entsprechen meist 0.0005–0.003), darkness 0..1, order = Zeichenreihenfolge.
{stroke_plan_schema}

Materialblatt:
{material_sheet}
```

Per case, first message: `Fall {case_id}. Stift: {pen}. Papier: {paper}. Ziel: {intent}. Nicht verändern: {protected_description}.` with the photo.

Second message in the same chat: `Striche für: {desired_change}` (the pre-registered change from the manifest, not the model's own idea).

Save part 1 as `{case_id}-ideas.json` and part 2 as `{case_id}-s3-{attempt}.json`. For attempts 2 and 3, start a new chat (no memory of the failed attempt) unless the attempt log notes otherwise.

## ChatGPT S1 masked edit (`s1-v1`)

Upload the case's 3:2 working photo, select the editable region with the edit brush, then:

```text
Ergänze nur im markierten Bereich: {desired_change}. Schwarzer Fineliner, gleiche Strichstärke und gleicher Stil
wie die vorhandenen Linien. Alles andere bleibt exakt unverändert. Keine neuen Farben, kein Weiß, kein Schatten.
```

## ChatGPT S2 transparent overlay (`s2-v1`)

Upload the case's 3:2 working photo as reference, then:

```text
Erzeuge ein PNG mit transparentem Hintergrund im Seitenverhältnis dieses Fotos ({orientation}, 3:2).
Es enthält NUR die neuen Striche für: {desired_change}, an genau der Stelle, an der sie auf diesem Foto
gezeichnet würden. Schwarze Fineliner-Linien. Kein Papier, keine vorhandenen Linien, kein Schatten,
kein Hintergrund, keine Farbe.
```

## Recording

For every attempt write one line to `private/attempts.jsonl` (see `AttemptRecord`): service, the model label shown in the app, prompt revision, start time, wall-clock seconds from sending to a usable result, output path and SHA-256, or the failure reason (refusal, wrong format, timeout).
