# Kisten-Brief

Alles, was der Satz Kistenbilder für die Kistenöffnung (Stil Clash Royale)
mitbringen muss, damit er ohne Nacharbeit in `js/45-kistentest.js` und
`src/styles/legacy/38-kisten.css` läuft. Die Kiste wird im Browser
animiert: Deckel und Körper sind getrennte Bilder, der Deckel wird per CSS
um sein Scharnier nach hinten gekippt, Licht und Strahlen liegen als eigene
Ebenen dazwischen. Deshalb sind Geometrie und Ebenenaufteilung **nicht
verhandelbar** und werden maschinell nachgemessen.

Der Kistentest im Hauptmenü zeigt jede fehlende Datei als Messrahmen an
genau der Stelle, an der das Bild einmal liegen wird, und listet die
fehlenden Dateien auf. Erst wenn die Liste leer ist, ist der Satz
vollständig.

---

## 1. Stil (Messlatte: die vorhandenen Würfeldesigns)

- Gemalter, leicht plastischer Fantasy-Look mit sauberen Kanten. Kein
  Pixel-Art, kein Foto-Realismus, keine schwarzen Cartoon-Outlines.
- Goldene bzw. metallene Beschläge, Edelstein-Akzente, Holz oder Emaille
  als Fläche. Vorbild: Ivory Royal, Sapphire Crown, Amethyst Rift.
- Palette des Spiels, verbindlich für Gold und Blau:
  - Gold-Verlauf: `#fff4bf → #f6d679 → #c98a26 → #ffe59a → #9a5d16`
  - Navy-Verlauf: `#245da9 → #0d3975` (dunkler nach unten)
  - Elfenbein `#f3e9d2` · Amethyst `#7a3fb5` / `#4a2273` · Rubin `#b8202e`
- Licht von **oben links**, auf allen Dateien und Stufen identisch.
- Kein Text, keine Zahlen, keine Signatur, kein Wasserzeichen, kein Rahmen
  um das Bild, kein Hintergrund, kein Boden, kein Schlagschatten außerhalb
  des Objekts.

## 2. Perspektive (für alle Kistendateien identisch)

- **Frontansicht**: die Vorderseite der Kiste liegt parallel zur Bildebene.
- Kamera leicht von oben, etwa 15–20° über der Waagrechten, so dass
  Deckeloberseite und Öffnung des Körpers sichtbar sind.
- Keine Seitendrehung, keine Isometrie, keine Fluchtpunktverzerrung nach
  links oder rechts. Die Kiste ist links/rechts spiegelsymmetrisch.
- Die Trennlinie zwischen Deckel und Körper („Naht") verläuft waagrecht
  und gerade über die gesamte Vorderseite.

Warum: nur so lässt sich der Deckel per `rotateX` um eine waagrechte Achse
glaubwürdig aufklappen. Eine isometrische Kiste bräuchte stattdessen eine
Bildfolge mit 8 bis 12 Deckelstellungen.

## 3. Geometrie auf der 512×512-Leinwand (Toleranz ±6 px)

Alle Kistendateien einer Stufe und **aller** Stufen teilen dieselbe
Leinwand und dieselbe Silhouette. Es gibt eine Kistenform als Vorlage; die
Stufen unterscheiden sich nur in Material, Beschlägen und Verzierung.

| | |
|---|---|
| Leinwand | 512 × 512 px |
| Kiste horizontal | x = 56 … 456 (breiteste Stelle, inkl. Beschläge) |
| Unterkante Kiste/Füße | y = 452 |
| Oberkante Deckel (zu) | y = 92 |
| Naht Deckel/Körper | y = 240 (vordere Kante, waagrecht, ±4 px) |
| Deckelscharnier | hintere Oberkante des Körpers, auf dem Bild bei y ≈ 205 |
| Schloss | mittig, x = 256, auf der Naht sitzend |

Die Silhouette von `closed` darf zwischen den Stufen in der Bounding-Box um
höchstens 8 px abweichen. Ornamente ragen nicht über die Bounding-Box
hinaus.

## 4. Ebenenlogik (das Wichtigste)

Die Animation setzt `body` + `light` + `lid` übereinander. Deshalb:

- **`body`**: die Kiste ohne Deckel, gemalt als **offene** Kiste. Die
  Öffnung ist von oben sichtbar, das Innere dunkel (fast schwarz, leicht
  warm), innere Rückwand und vorderer Innenrand sind gemalt. Alles, was der
  geschlossene Deckel verdecken würde, ist trotzdem vollständig gemalt.
  Oberste deckende Zeile (innere Rückwand) bei y ≈ 200 (±10). Keine
  Deckelpixel.
- **`lid`**: nur der Deckel in geschlossener Position, exakt an der
  Stelle, an der er auf dem Körper sitzt. Unterste deckende Zeile bei
  y ≈ 252 (±6), damit er die Öffnung vollständig abdeckt. Keine
  Körperpixel. Sichtbare vordere Stirnfläche mit Schlossklappe.
- **`lid-inner`**: die **Unterseite** desselben Deckels (Innenfutter, etwa
  Samt oder dunkles Holz mit Metallrand). Gleiche Silhouette und gleiche
  Position wie `lid`, **in derselben Lage gemalt**: Schlosskante unten,
  Scharnierkante oben, nicht gespiegelt. Das Spiel spiegelt sie selbst um
  das Scharnier (`rotateX(180deg)`); so erscheint sie, sobald der Deckel
  über 90° offen steht. Silhouetten-Differenz zu `lid` ≤ 3 px.
- **`closed`**: Kontrollbild und Menüansicht, Kiste geschlossen. Muss dem
  Ergebnis „`body` unter `lid`" pixelgleich entsprechen (mittlere
  Abweichung < 3/255 im deckenden Bereich). Aus genau diesen zwei Ebenen
  zusammensetzen.
- **`open`**: Kontrollbild und Ersatz bei reduzierter Bewegung: Deckel
  etwa 105° nach hinten gekippt, Innenraum leuchtend in Stufenfarbe.
  Silhouette darf nach oben über y = 92 hinausgehen, nicht über y = 24.
- **`light`**: weicher radialer Lichtschein in der Stufenfarbe,
  Mittelpunkt x = 256 / y = 230, sichtbarer Durchmesser ca. 360 px, am
  Rand vollständig transparent (Alpha 0 ab Radius 240). Keine harte Kante,
  keine Kiste, nur Licht.
- **`rays`**: 1024 × 1024 px, 16–24 Lichtstrahlen aus dem Mittelpunkt,
  Stufenfarbe mit Goldanteil. Alpha nimmt nach außen ab und ist auf den
  äußersten 5 % der Leinwand 0. Mittelpunkt (Radius < 80 px) weitgehend
  transparent. Wird per CSS gedreht: rotationssymmetrisch, kein Oben/Unten.

Keine Glüh- oder Halo-Effekte auf `body`, `lid`, `lid-inner`, `closed`.
Leuchten gehört ausschließlich in `light`, `rays` und `open`.

## 5. Die vier Stufen

| Schlüssel | Material |
|---|---|
| `common` | dunkles Eichenholz, Eisenbänder (matt, leicht angerostet), Eisenschloss, keine Edelsteine |
| `rare` | navyblau gebeiztes Holz / Navy-Paneele, Silberbeschläge, ein kleiner Saphir im Schloss |
| `epic` | Amethyst-Emaille-Paneele, Goldbeschläge (Gold-Verlauf), je ein Amethyst an den vier vorderen Ecken |
| `legendary` | Goldkörper mit Elfenbein-Emaille-Einlagen, Kronenmotiv mittig auf dem Deckel, Rubin im Schloss, Saphire an den Ecken |

Stufenfarbe für `light` und `rays` (und für den Glow im Spiel):
`common #e8d9b0` · `rare #4a8ff0` · `epic #b06cff` · `legendary #ffd45a`

## 6. Zusatzdateien (stufenunabhängig)

- `chest-shadow.webp` 512 × 256: weiche schwarze Ellipse als Bodenschatten,
  Mittelpunkt 256/128, maximale Deckkraft 55 %, Rand transparent.
- `chest-sparkle.webp` 128 × 128: ein vierstrahliger Funken, weiß-gold,
  mittig, Rand transparent. Partikel-Sprite für die Canvas.
- `chest-card-back.webp` 512 × 704: Kartenrückseite, Navy-Fläche mit
  Goldornament-Rahmen und mittigem stilisiertem Würfelsymbol, kein Text.
  Ecken auf Radius 40 px gerundet, außerhalb transparent.
- `chest-card-front-<stufe>.webp` 512 × 704, je Stufe: Kartenvorderseite
  mit Goldrahmen in Stufenmaterial. Innen ein **leeres** quadratisches Feld
  x = 64 … 448 / y = 64 … 448 (dort setzt das Spiel das Würfelbild ein) und
  darunter ein leeres Band y = 520 … 640 für den Namen (Text kommt aus dem
  Spiel). Gleiche Eckrundung wie die Rückseite.

## 7. Dateiformat und Ablage

- Zielformat WebP, verlustbehaftet, Qualität 88, **mit Alphakanal**
  (VP8X mit ALPH-Chunk). Zusätzlich jede Datei als PNG-24 mit Alpha in
  doppelter Kantenlänge als Quelle unter `src/`.
- Hintergrund überall Alpha 0. Kein weißer oder dunkler Saum an den Kanten,
  Kanten 1–2 px weich.
- Dateinamen nur `a–z`, `0–9`, Bindestrich.

```
assets/ui/v28/png/chests/
  common/    chest-common-body.webp   chest-common-lid.webp
             chest-common-lid-inner.webp   chest-common-closed.webp
             chest-common-open.webp   chest-common-light.webp
             chest-common-rays.webp   chest-card-front-common.webp
  rare/      … gleiches Muster
  epic/      … gleiches Muster
  legendary/ … gleiches Muster
  shared/    chest-shadow.webp   chest-sparkle.webp   chest-card-back.webp
  src/       PNG-Quellen, gleiche Unterordner
```

32 Stufen-Dateien plus 3 gemeinsame. Nach dem Ablegen: Bildrevision
anheben mit `node scripts/bump-version.mjs --assets <rev>`.

## 8. Maschinelle Prüfung (Pflicht bei Lieferung)

1. Exakte Pixelmaße laut Abschnitt 3, 4 und 6.
2. Alphakanal vorhanden; alle vier Ecken (16 × 16 px) Alpha 0.
3. Bounding-Box der deckenden Pixel (Alpha > 8) in den Toleranzen:
   body/lid/closed x 50 … 462; closed y 86 … 458; body oberste Zeile
   190 … 210, unterste 446 … 458; lid oberste Zeile 86 … 98, unterste
   246 … 258; lid-inner = lid ±3 px; light nichts deckend außerhalb Radius
   240 um 256/230; rays äußerste 5 % Alpha 0.
4. `body` unter `lid` gegen `closed`: mittlere absolute RGB-Abweichung im
   deckenden Bereich < 3/255.
5. Bounding-Box von `closed` je Stufe gegen `common`: ≤ 8 px.
6. Kein Pixel mit 0 < Alpha < 255 weiter als 3 px von der Silhouette
   entfernt bei body, lid, lid-inner, closed.
7. Silhouette symmetrisch: Bounding-Box-Mitte bei x = 256 ±4.

Fällt eine Prüfung durch: korrigieren und erneut messen, nicht die
Toleranz anpassen.
