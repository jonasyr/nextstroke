# Independent Feasibility Review: NextStroke

- **Status:** Independent review
- **Datum:** 2026-10-03
- **Scope:** Product, technical feasibility, MVP, cost and delivery plan
- **Hinweis:** No repository changes were made during the review

## A. Executive Verdict

**GO, ABER PLAN ÄNDERN.**

1. Quick Compare, Import, manuelle Perspektivkorrektur, lokale Projekte und eine strukturierte KI-Analyse sind mit vertretbarem Aufwand baubar.
2. Das zentrale Preview-Versprechen ist in der geplanten Form nicht belegt: OpenAI dokumentiert ausdrücklich, dass GPT-Image-Masken nur promptbasierte Führung sind und die Maskenkontur nicht exakt eingehalten werden muss; die API liefert ein neu gerendertes Gesamtbild, keinen verlässlichen transparenten Änderungs-Layer.
3. Die nachträgliche Extraktion eines „echten“ RGBA-Layers aus Original und neu gerendertem Composite ist mathematisch nicht eindeutig und bei Farb-, Papier-, Licht-, Kompressions- oder Registrierungsänderungen praktisch instabil.
4. Ein Pixelvalidator kann unerlaubte Pixeländerungen erkennen, aber weder semantische Konturtreue beweisen noch Modellschäden innerhalb der erlaubten Maske zuverlässig erkennen.
5. Die 99%-Maskentreue und „kein verändertes geschütztes Pixel“ erzeugen Scheinsicherheit: Je nach Nenner, Resampling und Farbmanagement sind sie entweder zu lax oder bei normalen Fotos unerreichbar.
6. iPhone-first ist machbar, aber nur mit strikt begrenzten Arbeitsauflösungen, expliziter Speicherfreigabe, CSS- statt echter Element-Fullscreen-UX und realen Gerätetests; der Plan unterschätzt Canvas-/PDF-/WASM-Speicherfehler und IndexedDB-Ausfälle nach Backgrounding.
7. Die vier Phasen und 19 Tasks bauen zu viel Governance, Sync, Auth und Provider-Abstraktion, bevor die riskanteste Hypothese geprüft wird.
8. Drei Materialien sind für das erste Qualitätsversprechen zu breit; Aquarell ist wegen Pigmentfluss, Papiernässe und irreversibler Ausführung der schlechteste Startpunkt.
9. Die verantwortbare Produktposition ist zunächst „künstlerische Planungshilfe mit begrenzter, sichtbar unsicherer Visualisierung“, nicht „nur diese Änderung, sicher bewahrt“.
10. Investierbar ist NextStroke erst nach einem 1–2-wöchigen PoF, der auf normalen iPhone-Fotos eine vorab definierte Erfolgsquote für Konturerhalt, brauchbare Overlays und Anfänger-Ausführbarkeit erreicht.

Die drei Hauptgründe sind: **nicht deterministische Bildbearbeitung**, **nicht robuste Layer-/Änderungsextraktion**, **falsche Umsetzungsreihenfolge vor dem Kernexperiment**.

## B. Machbarkeitsmatrix

| Funktion | Machbarkeit | Reifegrad | Größtes Risiko | Benötigter Proof | Empfehlung |
|---|---|---:|---|---|---|
| Quick Compare | hoch | technisch bewiesen | Safari-Gesten/Export/Speicher | Zwei große Fotos, 30-Minuten-iPhone-Session, Export/Reload/offline | sofort bauen; eigenständiger MVP |
| JPEG/PNG-Import | hoch | bewiesen | EXIF, Farbprofile, riesige Decode-Größe | echte iPhone-Fotos mit Rotation, Display-P3, 12–48 MP | normalisieren und auf Arbeitsauflösung downsamplen |
| HEIC/HEIF | mittel | anbieter-/OS-abhängig | Browserdecode und MIME-Verhalten variieren | aktuelle + vorige iOS-Version, Kamera/Files/AirDrop-Fälle | expliziter Capability-Test; notfalls server-/clientseitige Konvertierung |
| PDF-Seitenauswahl | mittel-hoch | wahrscheinlich | PDF.js/Canvas-Speicher auf iOS | 1-, 20-, 100-Seiten-PDF; sofortige Freigabe jeder Seite | nur Thumbnail + eine Seite rendern; harte Limits |
| Manuelle Perspektive | hoch | bewiesen | UX mit Touchgriffen | 20 Fotos, <30 s median, keine Selbstüberschneidung | enthalten |
| Automatische vier Ecken | mittel | wahrscheinlich | Bilder ohne sichtbaren Papierrand, Schatten/Glanz | 100 reale Fotos; Recall/Precision plus „keine sichere Ecke“ | nur Vorschlag, nie still anwenden |
| Auto-Alignment gleicher/ähnlicher Aufnahme | mittel | experimentell | Beleuchtung, neue Striche, Perspektive, wenig Features | 50 Vorher/Nachher-Paare, Landmarkenfehler | Homografie + Confidence; manueller Fallback |
| Auto-Alignment beliebiger Fotos | niedrig-mittel | unzuverlässig | nicht-planare Papierverformung, Linse, Schatten | reale Wiederaufnahme-Serie | nicht als zuverlässig versprechen |
| KI-Analyse: drei Ideen | mittel-hoch | wahrscheinlich | Halluzinationen, Material-/Skill-Mismatch | Blindbewertung durch Künstler/Anfänger | PoF; genau drei ist UX-, nicht Qualitätsbeweis |
| Fineliner-Vorschau | mittel | experimentell | Linien werden neu interpretiert | 30 Bilder × mehrere Seeds/Modelle | erstes Material |
| Buntstift-Vorschau | mittel-niedrig | experimentell | Textur, Deckkraft, Papierkorn | gleiche kontrollierte Matrix | erst nach Fineliner |
| Aquarell-Vorschau | niedrig | praktisch nicht verlässlich simulierbar | Wasserfluss/Papier/Pigment irreversibel | echte physische Ausführung | aus MVP streichen |
| Materialnahe Vorschau allgemein | mittel-niedrig | anbieterabhängig | überzeugende Demo ≠ reproduzierbare Qualität | ≥100 normale Nutzerfotos, feste Rubrik | als experimentell kennzeichnen |
| Eng maskiertes Inpainting | mittel für visuelle Lokalisierung, niedrig für Pixelgarantie | anbieterabhängig | Maskenleckage, globale Neuberechnung | Modellmatrix mit Outside-Mask-Diff | niemals als harte Sicherheitsgrenze verwenden |
| Echte transparente Änderungsebene | niedrig mit geplanter Pipeline | nicht bewiesen | API liefert Composite; Alpha-Dekomposition unterbestimmt | direkte RGBA-Overlay-Ausgabe testen | Pipeline ändern |
| Schutzbereiche | mittel | wahrscheinlich | Nutzer markiert nicht alle wichtigen Konturen; Semantik innerhalb Maske | Kontur-Benchmark + Edge/Line-Check | harte Compositing-Sperre statt Modellvertrauen |
| Pixelvalidierung | hoch als technischer Detektor, niedrig als Semantikbeweis | bewiesen/begrenzt | False Positives/Negatives | registrierte synthetische + reale Paare | nur als Guardrail, nicht „sicher“-Siegel |
| Physische Anleitung | mittel-hoch | wahrscheinlich | falsche Reihenfolge, nicht vorhandene Werkzeuge, Skill-Level | Anfänger führt ohne Hilfe aus | früh testen; oft wertvoller als Preview |
| Offline-PWA-Shell | hoch | bewiesen | Cache-Update/Blank-Screen-Fälle | Install/update/offline auf Geräten | enthalten |
| IndexedDB-Projekte | mittel | wahrscheinlich, nicht dauerhaft garantiert | Eviction, Background-Wakeup, Quota | Kill/background/storage-pressure/migration | Export/Backup und „lokal nicht garantiert“ |
| Sync | mittel-hoch | Standardtechnik | Konflikte, Tombstones, Teiluploads | adversariale Integrationstests | nach PoF/MVP |
| Cloudflare Worker/D1/R2 | hoch | bewiesen | 128 MB Isolate, Buffering/Base64, Löschjobs | Streaming-/Abbruchtest | brauchbar, aber SDK nicht blind puffern lassen |
| Cloudflare Access | hoch für Private Beta | bewiesen | kein Ersatz für Public-Account-System | Invite/Revocation/JWT-Test | Beta ja; spätere Auth separat planen |
| Safari Touch UX | mittel-hoch | wahrscheinlich | Pointercancel, Long-Press, Page Zoom | reale Geräte, lange Session | enthalten, real-device gate |
| Safari Fullscreen | niedrig für Element-Fullscreen auf iPhone | Plattformabweichung | iPhone unterstützt es weiterhin nicht allgemein | Feature Detection | CSS-Immersive-Modus als eigentliche Lösung |
| Share Sheet/Download | mittel-hoch | wahrscheinlich | Dateifreigabe/Transient Activation | `canShare`, große Dateien, Fallback | progressive enhancement |

Wichtigste offizielle Gegenbelege:

- OpenAI: „Masking with GPT Image is entirely prompt-based … may not follow its exact shape with complete precision.“ [Offizielle Primärquelle](https://developers.openai.com/api/docs/guides/image-generation)
- OpenAI gibt beim Edit-Endpunkt Base64 eines **Gesamtbildes** zurück, nicht eine semantische Delta-Ebene; Transparenz ist nur eine Ausgabeeigenschaft des generierten Bildes. [Offizielle API-Dokumentation](https://developers.openai.com/api/docs/guides/image-generation)
- iOS hat Canvas-Dimensions-/Flächenlimits; Überschreitung macht den Canvas unbrauchbar. [MDN/Standards-nahe Referenz](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)
- WebKit-Speicher ist standardmäßig best effort und kann bei Druck/Quota/Inaktivität originweise evicted werden. [WebKit-Primärquelle](https://webkit.org/blog/14403/updates-to-storage-policy/)
- Playwright-WebKit stammt aus WebKit Main und ist nicht die ausgelieferte iPhone-Safari-Runtime. [Maintainer-Dokumentation](https://playwright.dev/docs/browsers)

## C. Blocker

| Severity | Planabschnitt | Scheiternsgrund | Beleg | Minimale Änderung |
|---|---|---|---|---|
| **BLOCKER** | Spec §7; Phase 4 Task 4 | Maske wird als harte Änderungsgrenze behandelt, obwohl Anbieter sie als ungenaue Promptführung definiert | [OpenAI-Doku](https://developers.openai.com/api/docs/guides/image-generation); reproduzierte Entwicklerberichte: [Masking issue](https://community.openai.com/t/gpt-image-2-masking-issue/1379510), [whole-image recreation](https://community.openai.com/t/image-editing-inpainting-with-a-mask-for-gpt-image-1-replaces-the-entire-image/1244275) | PoF vor Phase 1; Anbieteroutput als untrusted full composite behandeln |
| **BLOCKER** | Spec §7 Schritt 4; Phase 4 Task 4 „Compute the difference layer“ | Aus zwei RGB-Bildern lässt sich kein eindeutiges Alpha-Foreground rekonstruieren: `C = alpha * F + (1 - alpha) * B` hat pro Pixel mehrere Unbekannte | mathematische Eigenschaft; kein Providervertrag garantiert Layer-Ausgabe | direktes transparentes Overlay generieren oder Composite strikt aus Original + eigener Layer-Pipeline erzeugen |
| **BLOCKER** | Spec §7; Phase 3 Task 4; Erfolgsgates | Pixelvergleich wird als Schutz semantischer Details benutzt | Literatur zeigt Background-/Identity-Preservation als eigenständiges ungelöstes Problem: [KV-Edit](https://arxiv.org/abs/2502.17363), [MAG-Edit](https://arxiv.org/abs/2312.11396), [ASUKA](https://arxiv.org/abs/2312.04831) | separate geometrische, photometrische und semantische Checks; menschliche Bestätigung |
| **HIGH** | Master-Plan Phasenfolge | 3 große Phasen vor Live-Providerexperiment | alle 19 Tasks; Live-Staging erst Phase 4 Task 5 Step 7 | Phase 0 PoF vor Monorepo-/Sync-Aufwand |
| **HIGH** | Phase 2 Task 4; Check-Stage | Similarity-Transform (x/y/scale/rotation) reicht für neu fotografiertes Papier nicht | OpenCV: Homografie benötigt korrespondierende Punkte und behandelt Perspektive; Matchingfehler brauchen RANSAC. [OpenCV](https://docs.opencv.org/4.13.0/d1/de0/tutorial_py_feature_homography.html) | Homografie + ECC-Refinement + Confidence + manuelle Punkte |
| **HIGH** | Phase 3 Task 4 | `maxProtectedChangedPixels: 0` ist bei Resampling/Color-Management/Antialiasing zu fragil | Bildtransformationen resamplen Pixel; OpenCV dokumentiert inverse Mapping-/Sampling-Artefakte. [OpenCV](https://docs.opencv.org/4.13.0/da/d54/group__imgproc__transform.html) | Schutzmaske im finalen Composite hart aus Original kopieren; Toleranzband nur zur Diagnose |
| **HIGH** | Phase 3/4 | Schäden an unmarkierten Konturen innerhalb der erlaubten Region bleiben akzeptierbar | Maskenvalidierung prüft Ort, nicht Bedeutung | automatische Kontur-/Edge-Maske plus explizite Preview-Freigabe |
| **HIGH** | Phase 2 Task 1/5; Phase 3 Imaging | große iPhone-Fotos, PDF.js, mehrere Canvases/Bitmaps/WASM-Mats können Safari töten | [WebKit Canvas memory bug 195325](https://bugs.webkit.org/show_bug.cgi?id=195325), [createImageBitmap leak 229825](https://bugs.webkit.org/show_bug.cgi?id=229825), [PDF.js #11297](https://github.com/mozilla/pdf.js/issues/11297) | Decode früh downsamplen; Arbeitskante z. B. 2048 px; ein Hauptcanvas; strikte Dispose-Policy |
| **HIGH** | Phase 3 Task 1; Spec §10 | „IndexedDB primary“ klingt dauerhafter als Plattformgarantie | WebKit: best-effort, QuotaExceeded, originweise Eviction; Persistenz heuristisch. [WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/) | `navigator.storage.persist()`/`estimate()`, Export/Backup, sichtbare Persistenzwarnung |
| **HIGH** | Phase 2/3 Tests | Playwright-WebKit-Gate wird leicht als Safari-Gate missverstanden | [Playwright-Doku](https://playwright.dev/docs/browsers) | reale iPhones zwingend und vor jedem Release |
| **HIGH** | Spec §15 | 99% Mask Adherence ist unklar und nicht safety-valid | Nenner/Delta/Edgeband/Registration nicht definiert | metric spec: ROI, ignore band, color space, registration confidence; Semantik getrennt |
| **HIGH** | Scope/D-005 | drei Materialien im MVP | Materialqualität muss je Medium separat evaluiert werden; Aquarell ist physisch stark zustandsabhängig | Fineliner zuerst; Buntstift später; Aquarell nach Feldstudie |
| **MEDIUM** | Phase 3 Task 2 | OpenCV.js wird „pin exactly“ genannt, aber Speicher-/Workerstrategie fehlt | OpenCV verlangt manuelles `Mat.delete()`. [OpenCV](https://docs.opencv.org/4.13.0/de/d06/tutorial_js_basic_ops.html); [Issue #15060](https://github.com/opencv/opencv/issues/15060) | isolierter Worker, Einmalinitialisierung, Mat-Ownership-Regeln, Heap-Telemetrie |
| **MEDIUM** | Phase 4 Worker | OpenAI SDK + Base64-Output kann Worker-Speicher stark aufblähen | Workers: 128 MB/Isolate; OpenAI Images API Base64. [Cloudflare](https://developers.cloudflare.com/workers/platform/limits/), [OpenAI](https://developers.openai.com/api/docs/guides/image-generation) | direkte Fetch-/Streaming-Pipeline prüfen; keine mehrfachen Buffer/Base64-Kopien |
| **MEDIUM** | Phase 2 Fullscreen | iPhone hat keinen allgemeinen Element-Fullscreen-Support | offener/duplizierter WebKit-Bug [206854](https://bugs.webkit.org/show_bug.cgi?id=206854) und aktueller Duplikatbericht [310661](https://www2.webkit.org/show_bug.cgi?id=310661) | CSS immersive mode als Standard; „Fullscreen“ umbenennen |
| **MEDIUM** | Phase 3 fixture consent | lokaler Fixture-Call zeigt Übertragungsbestätigung, obwohl nichts übertragen wird | Phase 3 Task 3 | „Was später gesendet würde“ klar als Demo markieren oder erst bei echter Remote-Aktion zeigen |
| **MEDIUM** | Phase 4 Access/Auth | Cloudflare Access ist Beta-Zugang, aber keine belastbare Grundlage für account-optionales v1 | D-010 + Phase 4 | Identität-Port beibehalten, aber v1-Auth nicht als kleine Migration darstellen |
| **LOW** | Spec-Status | Index nennt Design „approved“, Datei selbst „Proposed for final review“ | `docs/README.md`; Spec-Kopf | Status vor Umsetzung eindeutig machen |

## D. Gefährliche Annahmen

| Annahme | Evidenzlage | Kleinstes Experiment | Erfolgskriterium | Max. Zeitbox |
|---|---|---|---|---:|
| Modell ändert nur Maske | offiziell widerlegt als Garantie | 30 Fotos × 3 Prompts × 3 Seeds × 2 Modelle | ≥90% ohne sichtbare Outside-Mask-Abweichung nach hartem Re-Compositing | 2 Tage |
| Aus Composite entsteht brauchbare transparente Ebene | unbelegt/mathematisch unterbestimmt | drei Verfahren: RGB-Diff, Chroma/Alpha-Schätzung, transparentes Direkt-Overlay | ≥80% der Layer ohne Papier-/Lichthalo und als „changes only“ verständlich | 1 Tag |
| Protected pixels können exakt null bleiben | ohne hartes Copyback unrealistisch | Pixelidentität nach Provider-Roundtrip und nach Re-Compositing | bitgenau nur durch Copyback; sonst Annahme verwerfen | 0,5 Tag |
| Schutzmaske schützt Semantik | schwach | wichtige Konturen innerhalb/nahe ROI markieren; Expertenreview | ≥95% kritische Konturen erhalten | 1 Tag |
| Materiallook ist wiederholbar | experimentell | je Material 10 Werke, 3 Seeds, Blindrating | ≥70% „materialplausibel“ und ≥70% „physisch machbar“ | 2 Tage |
| Anfänger kann Preview umsetzen | unbelegt | fünf Anfänger mit Werkzeugen, keine Entwicklerhilfe | ≥4/5 verstehen; ≥3/5 führen sicher annähernd aus | 2 Tage |
| Pixel-Diff trennt echte Änderung von Fotoeffekten | falsch ohne starke Normalisierung/Registrierung | gleiche Zeichnung 10-mal neu fotografieren | False-positive-Fläche <5% nach Alignment/Photometric normalization | 1 Tag |
| Similarity-Alignment reicht | wahrscheinlich falsch | Handheld Vorher/Nachher mit Winkel-/Distanzvariation | Median <2 px auf Konturlandmarks | 1 Tag |
| 2048px-Arbeitsbilder genügen | plausibel | Detailmarken in Fineliner 0,1–0,3 mm | keine für Nutzer relevante Linie verschwindet | 0,5 Tag |
| iPhone hält Pipeline aus | unbewiesen | ältestes unterstütztes iPhone: import→CV→mask→diff→export, 10 Zyklen | kein Reload/Crash, Peak-Workset im definierten Budget, UI <100 ms blockiert | 1 Tag |
| IndexedDB ist „lokal-first sicher“ | offiziell nur best effort | background/kill/quota/migration/low-storage | recoverable failure; Nutzer kann exportieren; keine stille Korruption | 1 Tag |
| Providerwechsel ist einfach | übertrieben | zwei Provider auf gleicher Eval-Matrix | gleiche Domain-Metriken, aber adapterspezifische Mask-/Outputpfade akzeptiert | erst nach erstem validen Provider |

## E. Proof-of-Feasibility-Plan, maximal 1–2 Wochen

Keine Monorepo-Perfektion, D1, R2, Access, Sync, CI-Matrix oder Providerabstraktion. Wegwerf-UI, ein lokaler Testkorpus, ein dünner Server-Endpunkt.

### Tag 1: Eval-Korpus und Bewertungsrubrik

- 30 normale iPhone-Fotos: 15 Fineliner, 10 Buntstift, 5 Aquarell; verschiedene Beleuchtung, Papierfarben, Schatten, Perspektiven.
- Pro Bild: manuell bestätigte erlaubte Maske, kritische Konturen, vorgeschlagene kleine Änderung.
- Rubrik: Ortstreue, Konturerhalt, Papier-/Lichterhalt, Materialplausibilität, physische Ausführbarkeit, Anfänger-Verständlichkeit.
- Ground truth ist keine perfekte Zielgrafik, sondern menschliche Akzeptanz plus messbare Konturen.

### Tage 2–3: Drei Preview-Strategien gegeneinander

1. Maskiertes Full-Composite-Inpainting.
2. Direkt generiertes transparentes Overlay auf leerem/transparentem Canvas, Original nur als visuelle Referenz.
3. Strukturierte Stroke-/SVG-Anweisung: Polylinien, Farbe, Breite, Deckkraft, Härte; lokaler deterministischer Renderer.

Je Strategie mehrere Seeds. Kein „best cherry pick“: alle Resultate speichern und blind bewerten.

### Tag 4: Harte Compositing-Sicherheit

- Original außerhalb Allowed Mask bitgenau kopieren.
- Protected Mask hat absolute Priorität und wird aus Original kopiert.
- 3–8 px weiches Randband separat messen.
- Konturen in der Maske mittels Edge/line similarity vergleichen.
- Ergebnis darf „uncertain“ sein; kein automatisches Gütesiegel.

### Tag 5: Layer-Test

- „Changes only“ auf transparentem, weißem und kariertem Hintergrund.
- Ablehnung, wenn Layer Papiertextur, globale Farbstiche, Schatten oder große opaque Blöcke enthält.
- Prüfen, ob Overlay-Generation der Composite-Differenz klar überlegen ist.

### Tage 6–7: iPhone-Pipeline

- Original sofort auf definierte Arbeitsauflösung downsamplen; Originalblob separat behalten.
- Ein Canvas, ein Offscreen-Arbeitspuffer, ein OpenCV-WASM-Worker.
- Reale Geräte: ältestes unterstütztes iPhone plus aktuelles Modell.
- 10 vollständige Zyklen, Background/Resume, Speicherwarnung, Export.
- PDF nur: Seite wählen, eine Seite rendern, Ressourcen sofort freigeben.

### Tage 8–9: Anfänger-Ausführung

- 5–8 Anfänger, nur Fineliner.
- Jeder wählt eine von drei Ideen, betrachtet Preview/Overlay und führt eine kleine Änderung aus.
- Erfassen: verstanden, ausgeführt, bereut, Abweichung, Dauer, „würde ich nutzen“.

### Tag 10: Entscheidung

**GO nur wenn alle gelten:**

- ≥70% der Fineliner-Fälle liefern mindestens eine akzeptable, begrenzte Vorschau.
- 0 kritische Konturzerstörungen in als „sicher“ akzeptierten Ergebnissen.
- ≥80% der akzeptierten Overlays sind isoliert verständlich.
- ≥70% der Anfänger verstehen die Anweisung ohne Hilfestellung.
- ≥60% können sie praktisch umsetzen, ohne das Werk zu verschlechtern.
- Kein Crash/Reload in der Geräte-Testserie.
- Median Preview-Latenz und Kosten passen zum Ziel; vorgeschlagen: <60 s und <$0,30 inklusive realistischer Retry-Rate.

**NO-GO/Pivot wenn eines gilt:**

- Mehr als 10% akzeptierte Previews enthalten unbemerkte Kontur-/Papieränderungen.
- Mehr als die Hälfte der Bilder braucht manuelle Maskenreparatur oder mehrere Generierungsversuche.
- Nur durch Cherry-Picking entsteht überzeugende Qualität.
- Direktes Overlay ist nicht brauchbar und Full-Composite-Diff bleibt der einzige Weg.
- Anfänger finden Textanleitung nützlich, Preview aber irreführend: dann auf Analyse + Stroke-Plan + Quick Compare pivotieren.
- Aquarell bleibt stark inkonsistent: aus Produktversprechen entfernen.

## F. Empfohlener echter MVP

### Unbedingt enthalten

- Quick Compare mit zwei Bildern, manueller Ausrichtung, Opazität, Tap/hold original, Export.
- JPEG/PNG und genau eine PDF-Seite mit harten Größen-/Pixelgrenzen.
- Manuelles Crop/Perspektiv-Quad; automatische Ecken nur als Vorschlag.
- Lokales Projekt mit einem Original und Checkpoint; sichtbarer Export/Backup.
- **Fineliner only**.
- Strukturierte KI-Analyse mit drei kleinen Ideen.
- Nutzer bestätigt Zielregion und wichtige Konturen.
- Konkrete Stroke-Anleitung: Position, Reihenfolge, Stiftbreite, Richtung, Druck, Dauer.
- Experimentelle Preview entweder als transparentes Overlay oder deterministischer SVG/Stroke-Plan.
- Harte Original-Compositing-Grenze und „unsicher“-Status.
- Reale iPhone-Smoke-Tests.

### Später

- Buntstift nach separater Qualitätsmatrix.
- Aquarell erst nach physischer Nutzerstudie.
- automatische Homografie für Checkpoints.
- Cloud-Sync, Konfliktkopien, Gerätemigration.
- Konten für Public Release.
- mehrere Previewvarianten.
- verbesserte automatische Kontur-/Schutzmasken.
- Instruction-sheet PDF.

### Streichen

- „Echte Änderungsebene“ durch Differenz eines generierten Full-Composite.
- 99%-Metrik als Sicherheitsversprechen.
- Element-Fullscreen als iPhone-Invariante; CSS immersive reicht.
- „kompletter“ PDF-Support im Guided Flow.
- drei Materialien im v0.1.
- Providerneutralität als große Vorabarchitektur.
- sofortige D1/R2-Synchronisation für jedes Datenobjekt.

### Experimentell markieren

- materialnahe Bildmodell-Vorschau.
- automatische Maskenableitung.
- semantischer Konturerhalt.
- Foto-zu-Foto-Änderungsdetektion.
- Aquarellsimulation.
- Pixel-Diff als Qualitäts-, nicht nur Ortsprüfung.

**Quick Compare ist allein ein valides MVP**, wenn Nutzer damit schon reale Entscheidungen treffen. Die kleinste differenzierende Erweiterung ist: Quick Compare + drei Fineliner-Ideen + ausführbare Stroke-Anleitung; Preview darf zunächst nur SVG/Overlay-Prototyp sein.

## G. Empfohlene Entwicklungsreihenfolge

| Phase | Ziel | Überprüfbares Ergebnis | Dauer solo mit Agent | Go/No-Go |
|---|---|---|---:|---|
| 0 | Kernrisiko widerlegen | obiger PoF-Datensatz und Blindbewertung | 1–2 Wochen | harte PoF-Kriterien |
| 1 | Quick Compare Nutzen | reale iPhone-Nutzung, Export, Offline | 2–4 Wochen | ≥80% Task completion; keine Device-Crashes |
| 2 | Fineliner-Coach ohne Bildgenerierung | drei Ideen + Stroke-Anleitung + Nutzerregion | 1–2 Wochen | ≥70% nützlich; ≥60% ausführbar |
| 3 | kontrollierte Preview | Overlay/SVG gegen Composite testen | 2–4 Wochen | ≥70% mindestens eine akzeptable Preview; 0 unerkannte kritische Schäden |
| 4 | lokales Projekt/Checkpoints | Reload, Export, manuelle Ausrichtung | 2–3 Wochen | keine stille Datenverluste; Recovery getestet |
| 5 | private Beta minimal | Access, Rate Limit, Telemetrie, kein Sync | 1–2 Wochen | 10 Nutzer/30 Projekte |
| 6 | Sync nur bei belegtem Bedarf | opt-in Upload, Conflict Copy, Delete | 3–5 Wochen | Nachfrage + Lösch-/Konflikttests |
| 7 | Material 2 | Buntstift-Eval und Kalibrierung | 2–4 Wochen | gleiche Gates separat |
| 8 | v1-Härtung | Accessibility, Geräte-/Versionenmatrix, Kostenkontrolle | 4–8 Wochen | Release-SLOs aus realer Beta |

## H. Architekturkorrekturen

### Client/Server

- Client bleibt Autorität für Original, Masken und finales Composite.
- Server erhält nur explizit freigegebene, normalisierte Arbeitskopien.
- Provideroutput ist immer `untrustedGeneratedAsset`, niemals `PreviewLayer`.
- Worker soll Upload-/Provider-/Download-Daten streamen; keine mehrfachen `ArrayBuffer`-/Base64-Kopien. Workers haben 128 MB Isolate-Speicher; HTTP-Walltime ist zwar bei verbundener Gegenstelle unbegrenzt, aber Client-Abbruch kann Arbeit beenden. [Cloudflare Limits](https://developers.cloudflare.com/workers/platform/limits/)
- Lange Previewjobs besser als Job mit Idempotency-Key/Status oder Workflow/Queue modellieren, nicht als fragile Browser-Verbindung.

### Bildpipeline

1. Immutable source blob.
2. EXIF/Farbprofil orientieren.
3. definierte sRGB-Arbeitskopie, max. Kante/Pixels.
4. geometrische Normalisierung.
5. Provider erhält Crop + Kontext + Maske.
6. Ergebnis wird registriert, aber nie als identisch angenommen.
7. außerhalb Allowed und innerhalb Protected wird **Original bitgenau zurückkopiert**.
8. semantischer Konturcheck innerhalb ROI.
9. Preview bleibt „uncertain“, bis Nutzer bestätigt.
10. Exporte verwenden gekachelte/limitierte Canvas-Größen.

### Masken

- Drei getrennte Masken: `editableRegion`, `protectedGeometry`, `featherBand`.
- Source-/transform-/mask-revision in jedem Artefakt.
- Protected Geometry aus manueller Markierung plus automatischen Linienkandidaten.
- Masken im source-normalized coordinate space, nicht Viewport-Pixeln.
- Erlaubte Region ist keine Behauptung über semantische Sicherheit.

### Anbieter-Abstraktion

- Vor PoF nur ein sehr dünnes Interface; keine „provider-neutral“ Illusion.
- Adapter-Capabilities explizit: exact-mask-contract, returns-composite, returns-alpha, max dimensions, input fidelity, latency, retention.
- Anbieterwechsel erfordert neue Qualitätsfreigabe; gleiche TypeScript-Schnittstelle bedeutet nicht gleiche Semantik.
- Modell-ID, Prompt, API-Version und Eval-Suite versionieren.

### Datenmodell

- `GeneratedComposite` strikt von `AcceptedPreviewLayer` trennen.
- `ValidationResult` enthält Geometrie-, Photometrie-, Kontur- und Human-Approval-Teil.
- `originalAssetHash`, `workingAssetHash`, Farbprofil, Orientierung, Transformkette und Algorithmusversion speichern.
- Keine Behauptung, aus Composite extrahierter Layer sei „echt“; Name z. B. `DerivedDifferenceOverlay`.
- Löschung mit Tombstone/Jobstatus, nicht sofortige physische Löschgarantie.

### Sync/Auth

- Sync nach Beta-Lernen.
- Assetupload direkt/resumable zu R2 oder gestreamt; R2 Multipart ist für Resumability gedacht. [R2 Upload-Doku](https://developers.cloudflare.com/r2/objects/upload-objects/)
- Cloudflare Access nur Beta-Gate; App-Identität als Port.
- Conflict-Modell pro Projektzustand klar definieren: Fork statt Feldmerge ist für Binärassets sinnvoll.
- DSGVO: Zweck, Rechtsgrundlage, Providerstandort, DPA, Retention, Betroffenenrechte und tatsächliche Backup-Löschung vor Beta dokumentieren; diese Punkte sind im aktuellen Repo noch nicht entscheidungsreif.

### Offline/IndexedDB

- `navigator.storage.estimate()`, `persisted()` und `persist()` nutzen.
- lokale Backups/Projektpaket-Export früh.
- Background Resume öffnet DB neu und retryt idempotent.
- Dexie dokumentiert weiterhin Safari-Instabilität nach Background-Wakeup; aktuelles Issue: [Dexie #2296](https://github.com/dexie/Dexie.js/issues/2296), älteres verbreitetes Wakeup-Problem: [#2008](https://github.com/dexie/Dexie.js/issues/2008).
- Kein „lokal gespeichert = dauerhaft sicher“.

### Tests/Telemetrie

- Pixel-Fixtures bleiben sinnvoll, beweisen aber keine Modellqualität.
- Live-Modell-Eval außerhalb PR-CI, versioniertes Golden Dataset, alle Samples statt Best-of.
- Reale iPhones, nicht nur Playwright.
- Peak memory, decode failures, page reloads, background resumes, DB reopen, provider retry count messen.
- Keine Bildinhalte loggen, aber grobe Größe, Arbeitspixel, Pipelinephase und technische Fehlercodes sind nötig.
- Qualitätsfeedback nach Material und Modellversion segmentieren.

## I. Zeit und Kosten

Annahmen: ein erfahrener Solo-Entwickler, gute Coding-Agent-Unterstützung, 30–35 produktive Stunden/Woche; keine bestehende belastbare Produktionspipeline; echte Gerätetests und Nutzerstudien zählen mit.

| Stufe | Optimistisch | Realistisch | Pessimistisch | Einmalige/variable Kosten | Laufend |
|---|---:|---:|---:|---|---|
| PoF | 1 Woche | 2 Wochen | 3–4 Wochen | $50–500 Modelltests; 5–8 Testpersonen ggf. Vergütung | keine/gering |
| Reduzierter MVP | 5–7 Wochen | 9–13 Wochen | 16–24 Wochen | $500–3.000 für Geräte/Test/Design/Nutzer | $10–100/Monat + AI |
| Geplanter Beta-MVP laut Repo | 12–16 Wochen | 22–32 Wochen | 40–60 Wochen | $2.000–10.000 inkl. UX, Testgeräte, Beta, Datenschutzberatung | $50–500/Monat bei kleiner Beta |
| Stabiles v1.0 | 24–32 Wochen | 40–60 Wochen | 70–100+ Wochen | $5.000–25.000, besonders Accessibility, Legal, QA | $100–2.000+/Monat je Nutzung |

Modellkosten sind aktuell stark qualitäts- und größenabhängig. OpenAI nennt für GPT Image 2 bei 1024² nur den **Outputanteil** ungefähr mit $0,006 low, $0,053 medium und $0,211 high; Inputbild- und Texttokens kommen hinzu. [Offizielle Preistabelle](https://developers.openai.com/api/docs/guides/image-generation) Ein realistischer Previewversuch liegt deshalb grob bei **$0,03–$0,30**, mit zwei bis drei Retries **$0,10–$0,90** pro akzeptiertem Ergebnis. Analyse kostet typischerweise deutlich weniger, muss aber mit dem konkret gewählten Visionmodell gemessen werden. Eine Produktkalkulation vor dem PoF wäre Scheingenauigkeit.

Cloudflare selbst ist wahrscheinlich nicht der Hauptkostentreiber: Workers Paid beginnt typischerweise niedrig, R2-Speicherung kleiner Betas ist gering; entscheidend sind Bildmodellaufrufe, Fehlversuche, Nutzer-Support, reale iPhone-QA und Wartung bei Safari-/Provideränderungen. Wartung realistisch: **1–3 Entwicklertage/Monat** für kleine Beta, **0,2–0,5 FTE** bei öffentlichem v1 mit Support und Qualitätsregressionen.

## J. Dokumentations- und Planfehler

1. `docs/README.md` nennt die Spec „Approved“, die Spec selbst hat Status „Proposed for final review“. Vor Codebeginn klären.
2. D-015 behauptet, der gewählte MVP beweise den differenzierten Loop; tatsächlich verschiebt der Plan den ersten Live-Previewtest bis Phase 4 Task 5 Step 7.
3. Phase 1 friert umfangreiche Domainverträge ein, bevor bekannt ist, ob `PreviewLayer` überhaupt ein vom Provider sinnvoll erzeugbares Artefakt ist.
4. Spec §7 und Phase 4 Task 4 vermischen „Provider-Composite“, „extrahierter transparenter Layer“ und „akzeptierte Vorschau“, obwohl diese grundverschiedene Vertrauensstufen haben.
5. Kein Algorithmus oder Vertrag für Alpha-Rekonstruktion; „extracts or reconstructs“ ist die kritischste unimplementierte Zeile im gesamten Plan.
6. Keine Definition, ob Modelloutput exakt gleiche Dimension, Crop, Farbprofil, Gamma, Orientierung und Registrierung besitzt.
7. `deltaThreshold: 24` ist ohne Farbraum, Delta-Metrik, Alpha-Verhalten, Premultiplication und Edgeband nicht reproduzierbar.
8. `maxOutsideChangedRatio: 0.01` definiert den Nenner nicht klar. Ein Prozent der Gesamtfläche, der geänderten Pixel oder der Außenfläche sind völlig verschiedene Aussagen.
9. „99% of material preview changes fall within allowed mask“ kann bei wenigen gewünschten Pixeln eine geringe Zahl, bei großen Bildern aber tausende falsche Pixel erlauben.
10. „No accepted preview exceeds tolerance inside protected region“ prüft nur manuell bekannte Regionen; fehlende Schutzmarkierungen bleiben unsichtbar.
11. Ein verändertes geschütztes Pixel als harte Ablehnung widerspricht jeder resamplingbasierten Registrierung, sofern nicht das Original nachträglich hart zurückkopiert wird.
12. Der Plan erkennt an, dass Pixelthresholds keine künstlerische Äquivalenz beweisen, verwendet sie aber operativ wie einen Preview-Sicherheitsbeweis.
13. Phase 2 Auto-Alignment modelliert nur Translation/Scale/Rotation, obwohl der Produktflow neu fotografierte Werke und Perspektivkorrektur verlangt.
14. Capture-Qualitätsheuristiken haben keine empirische Kalibrierungsstrategie und keine geräteabhängigen Grenzwerte.
15. HEIC wird als Importakzeptanz genannt, aber kein Fallback/Transcodingpfad oder konkrete Browser-Supportmatrix festgelegt.
16. PDF-Limit 70 MB bezieht sich auf Datei-, nicht Decode-/Render-Speicher; einzelne Seiten können riesige Canvasflächen erzeugen.
17. OpenCV.js wird eingeführt, ohne Bundlegröße, Initialisierungslatenz, Worker-Isolation, WASM-Heap oder Mat-Lebenszyklen zu planen.
18. „close bitmap/PDF handles“ reicht auf Safari nicht als Speicherstrategie; Canvases müssen verkleinert/neu benutzt und Referenzen kontrolliert werden.
19. CSS-Fallback ist richtig, aber der Text behandelt native Fullscreen-Unterstützung weiter als Testfall; auf iPhone ist CSS immersive der Hauptpfad.
20. Playwright-WebKit ist kein Ersatz für Safari/iOS-Build, Hardwaredecoder, Memory-Jetsam, Kamera, Share Sheet oder Home-Screen-Lifecycle.
21. IndexedDB-Recovery „continue in memory/export-current“ ist sinnvoll, aber Export kann bei genau derselben Speicherknappheit ebenfalls scheitern.
22. Service-Worker-Update-, Version-Skew- und Datenbankschema-Kompatibilität fehlen.
23. Phase 3 zeigt eine Übertragungsbestätigung für einen lokalen Fixtureclient; Consent-UI darf keine nicht stattfindende Übertragung suggerieren.
24. Optionaler Reference-Upload plus Original plus Maske kann beim Worker/SDK mehrfach gepuffert werden; Speicherbudget fehlt.
25. Workers können streamen, aber der geplante OpenAI-SDK-Pfad und Base64-Rückgabepfad sind nicht als streaming-sicher belegt.
26. „interrupted uploads resumable“ steht in der Spec, Task 2 beschreibt jedoch temp-object promotion; echte clientseitige Fortsetzung verlangt Multipart-State.
27. Sync-Konflikt „preserves both versions“ definiert nicht, wie Assetreferenzen, Checkpoints, Suggestions und Tombstones geforkt werden.
28. Cloudflare Access löst Invite-Only, aber nicht den Übergang zu optionalen Konten in v1; Auth-Migration ist unterschätzt.
29. Retention und Backup-Erasure sind als später zu dokumentieren formuliert, obwohl sie vor echter Bildübertragung feststehen müssen.
30. AGPL-3.0 ist für ein öffentliches eigenes SaaS handhabbar, aber Dependency-Kompatibilität, vollständiger Corresponding Source und Provider-SDK-Lizenzen brauchen tatsächliche Prüfung; ein automatischer Scan allein ist keine Rechtsprüfung.
31. Missbrauchsschutz fokussiert Rate Limits, aber nicht Denial-of-wallet durch gültige eingeladene Nutzer, Prompt-/Bildmoderation, Replay und Retry-Stürme.
32. Erfolgsgates von 10 Personen/30 Projekten sind gut für qualitative Signale, aber zu klein für Aussagen wie 99% Crash-free oder 98% Operation Success.
33. Drei Materialien multiplizieren Prompt-, Eval-, Safety- und Anleitungsmatrizen, werden aber im Taskaufwand fast wie ein Enum behandelt.
34. 19 Tasks sind keine sinnvolle Aufwandsschätzung; mehrere Tasks enthalten jeweils Wochenprojekte wie PDF-Import, Gestenengine, Auto-Alignment, Sync oder generative Preview.
35. Es fehlt ein explizites Produktverhalten für „keine sichere Vorschau möglich“. Das muss ein legitimer Erfolgspfad mit reiner Text-/Stroke-Anleitung sein.

## K. Abschließende Empfehlung

**Würde ich eigenes Geld/Zeit investieren?** Ja, aber nur in einen zeitlich harten PoF und Quick Compare; nicht in den vorliegenden Beta-Plan als Ganzes.

**Was zuerst bauen?** Ein hässliches, wegwerfbares Fineliner-Labor: Foto, manuelle Maske, drei konkrete kleine Ergänzungen, drei konkurrierende Previewverfahren, harte Original-Compositing-Grenze und Blindbewertung auf echten iPhone-Fotos. Parallel nur so viel Quick Compare, dass derselbe Datensatz ausgerichtet und beurteilt werden kann.

**Was keinesfalls vor PoF?** D1/R2-Sync, Public-Auth-Migration, vollständige Monorepo-Paketlandschaft, drei Materialien, PDF im Guided Flow, umfangreiche Providerneutralität, v1-Telemetriearchitektur und vermeintlich finale Preview-Datenverträge.

**Drei notwendige Planänderungen:**

1. Neue Phase 0 mit objektiven Modell-/iPhone-/Anfänger-Abbruchkriterien vor Foundation.
2. Previewarchitektur von „Full Composite → Differenzlayer“ auf „direktes Overlay/SVG/Stroke-Plan → deterministisches Composite“ umstellen; Full-Composite-Inpainting nur experimentell.
3. v0.1 auf Fineliner, Quick Compare, strukturierte Ideen und physische Anleitung reduzieren; Sync und Aquarell verschieben.

**Objektives Abbruch-/Pivot-Signal:** Wenn nach zwei Wochen und mindestens 30 normalen iPhone-Fotos nicht bei ≥70% der Fineliner-Werke mindestens eine nicht gecherrypickte, physisch ausführbare Ergänzung entsteht, ohne unerkannte kritische Konturänderung, dann Bildgenerierung als Kernversprechen stoppen. Das Produkt pivotiert zu **Quick Compare + KI-Kritik + manuell bestätigtem Stroke-/SVG-Plan + Checkpoint-Vergleich**. Wenn auch Anfänger die textlich/vektoriell geplanten Schritte in weniger als 60% der Tests nicht sicher umsetzen, NextStroke als Guided Coach stoppen und Quick Compare als eigenständiges Produkt fortführen.

## Quellenmethodik

- **Offizielle Spezifikation/Primärquelle:** OpenAI-, Cloudflare-, WebKit-, MDN-, OpenCV- und Playwright-Dokumentation bilden die Grundlage für harte Plattform- und API-Aussagen.
- **Wissenschaftliche Evidenz:** Paper/Preprints werden benutzt, um offene Forschungsprobleme und bekannte Failure Modes zu belegen, nicht um konkrete Anbieterqualität zu garantieren.
- **Reproduzierter GitHub-/WebKit-Bug:** Nur mit Versions-/Statuskontext; alte gelöste Bugs werden nicht als aktueller Blocker dargestellt. Offene oder wiederkehrende Muster dienen als reale Risikobelege.
- **Maintainer Statement:** Library-Dokumentation und Issue-Antworten zeigen erforderliche Workarounds und Supportgrenzen.
- **Anekdotischer Erfahrungsbericht:** OpenAI Community, Apple Forums, Reddit u. Ä. werden nur als Gegenbeispiel-/Risikohinweis verwendet, nie allein als Machbarkeitsurteil.
- Stand der Prüfung: **3. Oktober 2026**. Anbieterpreise und Modellnamen sind zeitabhängig.

## Wichtigste geprüfte Quellen nach Kategorie

### Offizielle Primärquellen

- [OpenAI Image Generation – Masken, Output, Limits, Kosten](https://developers.openai.com/api/docs/guides/image-generation)
- [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare R2 Uploads und Multipart](https://developers.cloudflare.com/r2/objects/upload-objects/)
- [Cloudflare D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)
- [WebKit Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [WebKit Tracking Prevention](https://webkit.org/tracking-prevention/)
- [MDN Canvas Limits](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)
- [OpenCV Homography](https://docs.opencv.org/4.13.0/d1/de0/tutorial_py_feature_homography.html)
- [OpenCV geometrische Transformationen](https://docs.opencv.org/4.13.0/da/d54/group__imgproc__transform.html)
- [OpenCV.js Memory Ownership](https://docs.opencv.org/4.13.0/de/d06/tutorial_js_basic_ops.html)
- [Playwright Browser Builds](https://playwright.dev/docs/browsers)

### Wissenschaftliche Evidenz

- [ASUKA: unwanted insertion and color inconsistency in inpainting](https://arxiv.org/abs/2312.04831)
- [MAG-Edit: editing leakage and structure preservation](https://arxiv.org/abs/2312.11396)
- [KV-Edit: precise background preservation as a separate method/problem](https://arxiv.org/abs/2502.17363)
- [BrushNet](https://arxiv.org/html/2403.06976)
- [Change Detection Review: registration, illumination, noise](https://arxiv.org/abs/2305.05813)
- [Homography limitations and hybrid alignment](https://arxiv.org/abs/2202.09716)

### Reproduzierte/konkrete Bugs und Maintainerhinweise

- [WebKit #195325: total canvas memory](https://bugs.webkit.org/show_bug.cgi?id=195325)
- [WebKit #229825: createImageBitmap memory leak](https://bugs.webkit.org/show_bug.cgi?id=229825)
- [WebKit #284281: Canvas/GPU resources retained on iPhone](https://bugs.webkit.org/show_bug.cgi?id=284281)
- [WebKit #273827: iOS 17.4 IndexedDB lost connection](https://bugs.webkit.org/show_bug.cgi?id=273827)
- [Dexie #2008: PWA background/wakeup DB errors](https://github.com/dexie/Dexie.js/issues/2008)
- [Dexie #2296: Safari key injection/wakeup issue](https://github.com/dexie/Dexie.js/issues/2296)
- [PDF.js #11297: Safari canvas memory](https://github.com/mozilla/pdf.js/issues/11297)
- [PDF.js discussion #17976: iOS canvas limitations](https://github.com/mozilla/pdf.js/discussions/17976)
- [OpenCV #15060: WASM Mat memory not GC-managed](https://github.com/opencv/opencv/issues/15060)
- [WebKit #206854: Fullscreen API on iPhone](https://bugs.webkit.org/show_bug.cgi?id=206854)

### Anekdotische/Community-Gegenbelege

- [OpenAI mask ignored / whole-image recreation](https://community.openai.com/t/image-editing-inpainting-with-a-mask-for-gpt-image-1-replaces-the-entire-image/1244275)
- [OpenAI GPT Image masking issue](https://community.openai.com/t/gpt-image-2-masking-issue/1379510)
- [Apple Forum: IndexedDB data loss conditions](https://developer.apple.com/forums/thread/730023)
- [Apple Forum: PWA persistence uncertainty](https://developer.apple.com/forums/thread/710157)
