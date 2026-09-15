# Würfeldesign-Brief

Alles, was ein neuer Satz Würfelflächen mitbringen muss, damit er ohne
Nacharbeit ins Spiel passt. Die Zahlen sind an den vorhandenen Designs
pixelgenau nachgemessen, nicht geschätzt.

---

## Was geliefert wird

Pro Design **acht Dateien** in einem eigenen Ordner, benannt nach dem
Design (Kleinbuchstaben, Bindestrich statt Leerzeichen):

```
<design>/
  <design>-face-1.webp      … Augenzahl 1
  <design>-face-2.webp      … Augenzahl 2
  <design>-face-3.webp      … Augenzahl 3
  <design>-face-4.webp      … Augenzahl 4
  <design>-face-5.webp      … Augenzahl 5
  <design>-face-6.webp      … Augenzahl 6
  <design>-face-question.webp   … Ruhefläche mit Fragezeichen
  <design>-beauty.webp      … der Würfel von drei Seiten (Vorschau)
```

PNG mit Alpha ist als Quelle in Ordnung (1024 × 1024), die Umrechnung auf
das Zielmaß macht das Spiel-Repo. Wer direkt WebP liefert: 512 × 512,
Qualität 88, mit Alpha.

---

## Das Maß

| | |
|---|---|
| Leinwand | **512 × 512** (Quelle gern 1024 × 1024, quadratisch) |
| Würfelfläche | **8,8 % bis 91,2 %** der Kante, auf allen vier Seiten |
| also | **422 × 422 mittig** auf 512 × 512 |
| Hintergrund | vollständig **transparent**, kein Schlagschatten außerhalb |

**Alle sieben Flächendateien eines Designs tragen dasselbe Feld.** Weicht
eine ab, springt der Würfel im Spiel beim Flächenwechsel — das sieht man
sofort. Am besten: ein Rahmen, sechs Augenbilder, nichts an der Geometrie
anfassen.

Die Ecken sind gerundet (rund 12 % der Kante), die Fläche ist eine
Draufsicht — **keine Perspektive, keine Schräglage** auf den sechs
Flächendateien.

---

## Die Augen

Das Raster ist bei allen Designs gleich, gemessen in Prozent der
**Leinwandkante** (512 px):

```
Spalten:  31 %   50 %   67 %
Zeilen:   31 %   50 %   67 %
```

Bezogen auf die Würfelfläche selbst (422 px) sind das 27 %, 50 % und 73 %.

| Augenzahl | Positionen |
|---|---|
| 1 | Mitte (50 / 50) |
| 2 | 31/31 und 67/67 (Diagonale von links oben nach rechts unten) |
| 3 | 31/31, 50/50, 67/67 |
| 4 | 31/31, 67/31, 31/67, 67/67 |
| 5 | wie 4, plus Mitte |
| 6 | zwei Spalten (31 und 67) mit je drei Augen (31, 50, 67) |

**Augendurchmesser: rund 13 % der Leinwandkante** (etwa 67 px bei 512),
gleich groß auf allen sechs Flächen.

Bei der ersten Lieferung der fünf Sätze (V28.12.30) wanderten die Augen je
nach Design um bis zu 5 Prozentpunkte — das war der Anlass für dieses
Dokument. Die Neulieferung nach diesem Brief (V28.12.32) liegt bei
**±0,0 bis ±1,1 Prozentpunkten**, und das Feld stimmt bei allen sieben
Flächendateien auf die Kommastelle. Das Spiel-Repo musste nichts mehr
verschieben, nur skalieren — so soll es sein.

Geprüft wird das maschinell: `scripts/qa/wuerfeldesigns.mjs` misst das
Raster über die Streuung der sechs Flächen und lässt höchstens
2 Prozentpunkte Abweichung durch.

---

## Die Ruhefläche (`-face-question`)

Dieselbe Würfelfläche, aber statt Augen ein **Fragezeichen** in der Mitte:
rund 50 % der Leinwandhöhe hoch, in der Leitfarbe des Designs (meist das
Gold der Fassung), mit genug Kontrast zur Fläche. Das ist der Würfel,
bevor er geworfen wird — er wird oft und lange angesehen.

---

## Die Vorschau (`-beauty`)

**Der Würfel von drei Seiten**, isometrisch: Deckfläche plus zwei
Seitenflächen, gerne mit sichtbar abgerundeten Kanten und echtem Licht —
also ein 3D-Render, keine zusammengesetzten Flachbilder. 512 × 512,
transparent, der Würfel füllt etwa 80 % der Leinwand.

Empfohlene Augenzahlen: oben 1, links 2, rechts 3.

Diese Datei ist die Karte im Profil und im Shop; sie verkauft das Design.
Sie ist die einzige, die eventuell einmal groß gezeigt wird — bei ihr lohnt
die höhere WebP-Qualität, bei den Flächen nicht.

---

## Stil, damit es zum Spiel passt

- Goldene oder metallene Fassung am Rand, Edelstein- oder Perlenaugen —
  die vorhandenen Designs (Ivory Royal, Sapphire Crown, Amethyst Rift,
  Walnut Lodge, Tide Pearl, Azure Storm, Nebula Veil, Solar Relic) sind
  die Messlatte.
- Licht **von oben links**, bei allen sechs Flächen gleich.
- Kein Text, keine Signatur, kein Wasserzeichen, kein Rahmen um die
  Leinwand.
- Die Fläche muss auch **klein** lesbar sein: im Kampf ist der Würfel auf
  dem Telefon rund **56 px** breit, der große Spezialwürfel rund 145 px.
  Feine Muster verschwinden dort — die Augen müssen sich in jeder Größe
  klar von der Fläche abheben.

---

## Einbau im Repo (macht die Spielseite)

1. Ordner nach `assets/ui/v28/png/dice-designs/<design>/`.
2. Eintrag in `DICE_DESIGNS` (`js/05-game-data-state.js`) mit `artKey`,
   `className` (`theme-<design> theme-art-die`) und `previewAsset`.
   Solange es keinen Freischaltweg gibt: `testOnly:true`.
3. Zwei CSS-Zeilen in `src/styles/legacy/37-abschluss.css`: die
   Glut-/Auswahlfarbe (`.die.theme-<design>`) und die D4-Fläche
   (`.special-big-die.d4.theme-<design>`) — für den D4 gibt es kein
   Artwork.
4. `node scripts/build-styles.mjs && npm run check`
5. `WD_CHROMIUM=… node scripts/qa/wuerfeldesigns.mjs` — prüft Vollzähligkeit,
   Maß, Feld, Sichtbarkeit und ob der Würfel die Fläche im Kampf trägt.
