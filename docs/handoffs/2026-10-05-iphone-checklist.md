# iPhone-Checkliste: Phase 2 Quick Compare

**Stand:** 2026-10-05 · **Entscheidung:** D-063 · **Dauer:** etwa 15 Minuten

Alles, was ein Browser zeigen kann, prüft jetzt Playwright in Chromium und WebKit (Safaris Engine) bei jedem Push: zehn Durchgänge ohne Absturz und ohne Neuladen, ein 48-MP-Foto, Verstecken während der automatischen Ausrichtung, Ausrichten von Hand nach einer gescheiterten automatischen Ausrichtung, Tippen und Halten, offline nach dem ersten Besuch (`apps/web/e2e/`). Diese Liste enthält nur, was allein ein echtes iPhone zeigen kann: Home-Bildschirm, Kamera, echtes Hintergrund-Verhalten, iOS-Speichergrenzen und echte Finger.

Vorher: neueste Version deployen, die App einmal mit Netz öffnen und bei „Neu laden“ tippen (oder den Tab ganz schließen und neu öffnen).

Notiere: iPhone-Modell, iOS-Version, Datum.

| # | Prüfung | So geht's | Bestanden, wenn |
|---|---|---|---|
| 1 | Offline vom Home-Bildschirm | Seite in Safari → Teilen → „Zum Home-Bildschirm“. App vom Home-Bildschirm einmal mit Netz öffnen. Flugmodus an. App ganz schließen, wieder öffnen. „Beispiel ansehen“, dann ein eigenes Bildpaar laden, „Ausrichten“ → „Automatisch“. | Die App öffnet, beide Paare laden, die automatische Ausrichtung antwortet. |
| 2 | Foto direkt mit der Kamera | Auf „Foto wählen“ tippen → „Foto aufnehmen“ → Zeichnung fotografieren. Auf einem Pro-Modell mit 48-MP-Modus einmal mit 48 MP. | Das Foto lädt, die Seite lädt nicht neu. |
| 3 | App-Wechsel während des Rechnens | „Ausrichten“ → „Automatisch“, sofort zu einer anderen App wechseln, 10 Sekunden warten, zurück. | Ein Ergebnis kommt oder „Automatisch“ ist wieder tippbar; deine Bilder sind noch da. |
| 4 | Dauerlauf mit eigenen Fotos | Fünf Bildpaare nacheinander: jeweils laden, „Automatisch“, „Ecken ändern“ → „Fertig“, zurück zu den Bildern. | Kein Neuladen, kein Absturz, keine leere Seite. |
| 5 | Mit dem Finger | Einen Ring nah an eine Blattecke ziehen und loslassen; mit zwei Fingern zoomen; im Vergleich einmal tippen und einmal gedrückt halten. | Der Ring rastet ein (oder bleibt, wo du ihn hinziehst), das Zoomen ist flüssig, Tippen und Halten zeigen „Nur Zeichnung“. |
| 6 | Ältestes iPhone (falls vorhanden) | Punkte 1 und 4 einmal auf dem ältesten iPhone, das unterstützt werden soll. | Wie oben. |

Wenn etwas scheitert: Nummer, Modell, iOS-Version und was du gesehen hast (am besten ein Screenshot oder eine Bildschirmaufnahme) an Claude geben. Bei einem Neuladen: kam vorher eine Meldung, und war es beim ersten oder einem späteren Bild?
