# CSS-Schichten: Bestandsaufnahme

Vorarbeit für das Zusammenlegen der Stilschichten. Der Architektur-Cleanup
hat den **Bauweg** vereinheitlicht (`src/styles/legacy/` → `css/app.css`),
die **Schichten selbst** aber unangetastet gelassen. Dieses Dokument misst,
was da liegt, damit das Zusammenlegen nicht auf Vermutungen aufsetzt.

Stand: V28.9.4, 40 Dateien. Die Messwerte unten stammen von V28.7.3 (37
Dateien); auf 28.9.4 sind es 12.803 Zeilen, 14.111 Deklarationen, davon
2.998 (21 %) überschrieben, und 4.680 `!important`.

---

## Warum das überhaupt sein muss

| | |
|---|---|
| Zeilen gesamt | 12.065 |
| Deklarationen gesamt | 13.408 |
| **davon von einer späteren Schicht überschrieben** | **2.745 (20 %)** |
| `!important` | 4.269 |

Jede fünfte Deklaration im Bündel wirkt nie. Sie kostet Übertragung,
Parserzeit und — der eigentliche Preis — Lesbarkeit: wer eine Regel
ändern will, muss erst herausfinden, welche der fünf Fassungen gewinnt.

Die 4.269 `!important` sind Folge, nicht Ursache. Jede Phase konnte die
vorige nur noch mit `!important` überstimmen, also wurde es zur Norm.
Wer heute eine Regel ergänzt, muss `!important` mitschreiben, sonst
passiert nichts.

---

## Die Schichten

Reihenfolge = Kaskade. `rework` zählt Regeln, die auf
`html[data-v28-rework="2"]` eingeschränkt sind.

| # | Datei | Zeilen | !imp | rework |
|---|---|---|---|---|
| 1 | 01-base-ui.css | 111 | 0 | 0 |
| 2 | 02-battle.css | 1092 | 46 | 0 |
| 3 | 03-campaign.css | 165 | 65 | 0 |
| 4 | 04-prestige-polish.css | 196 | 114 | 0 |
| 5 | 05-online.css | 30 | 0 | 0 |
| 6 | 06-v275.css | 40 | 14 | 0 |
| 7 | 07-v2751.css | 93 | 5 | 0 |
| 8 | 08-v276.css | 68 | 2 | 0 |
| 9 | 09-test-lab.css | 107 | 9 | 0 |
| 10 | 10-dice-tray-lab.css | 76 | 6 | 0 |
| 11 | 11-mastery.css | 875 | 122 | 0 |
| 12 | 12-cloud-account.css | 4 | 2 | 0 |
| 13 | 12-ability-mastery-lab.css | 818 | 121 | 0 |
| 14 | 13-v28-bright-arcane.css | 407 | 129 | 0 |
| 15 | 14-v28-asset-system.css | 635 | 326 | 0 |
| 16 | 15-v28-ui-rework.css | 703 | 308 | 164 |
| 17 | 16-v28-ui-phase1.css | 965 | 528 | 173 |
| 18 | 17-v28-ui-phase2.css | 395 | 154 | 114 |
| 19 | 18-v28-ui-phase3.css | 606 | 295 | 120 |
| 20 | 19-v28-ui-phase4.css | 581 | 270 | 132 |
| 21 | 20-v28-ui-phase5.css | 196 | 45 | 39 |
| 22 | 21-v28-ui-phase6.css | 253 | 117 | 56 |
| 23 | 22-v28-ui-phase7.css | 216 | 109 | 39 |
| 24 | 23-v28-ui-phase8.css | 292 | 76 | 61 |
| 25 | 24-v28-ui-phase9.css | 190 | 98 | 26 |
| 26 | 25-v28-ui-phase10.css | 154 | 85 | 20 |
| 27 | 26-v28-ui-phase11.css | 330 | 150 | 49 |
| 28 | 28-v28-ui-phase12.css | 150 | 64 | 22 |
| 29 | 27-v28-dice-designs.css | 253 | 158 | 20 |
| 30 | 29-v28-ui-hotfix.css | 737 | 355 | 132 |
| 31 | 30-v28-combat-lock.css | 284 | 136 | 40 |
| 32 | 31-v28-marked-ui.css | 214 | 121 | 41 |
| 33 | 32-emoji-sprite-pass.css | 76 | 0 | 0 |
| 34 | 33-duo-boss-rush.css | 182 | 23 | 0 |
| 35 | 35-v28-frame-catchup.css | 75 | 14 | 18 |
| 36 | 36-v28-hierarchie.css | 257 | 96 | 60 |
| 37 | 37-v28-feinschliff.css | 239 | 106 | 24 |

Drei Gruppen sind erkennbar:

1. **Fachschichten (1–13, 33–34).** Nach Bildschirm oder Funktion
   geschnitten: Kampf, Kampagne, Mastery, Online, Boss Rush. Sie
   überschreiben einander kaum und sind der gesunde Teil.
2. **Der V28-Stapel (14–32).** 19 Dateien, chronologisch entstanden:
   `bright-arcane`, `asset-system`, `ui-rework`, dann `phase1` bis
   `phase12`, dazwischen `dice-designs`, `hotfix`, `combat-lock`,
   `marked-ui`. Jede ist ein Nachtrag zur vorigen. **Hier steckt fast
   der gesamte Überschreibungs-Überhang.**
3. **Die neue Rangordnung (35–37).** `frame-catchup`, `hierarchie`,
   `feinschliff` aus V28.7.x. Absichtlich zuletzt, weil sie den Stapel
   darüber korrigieren.

---

## Wo sich das Zusammenlegen zuerst lohnt

Am häufigsten neu gesetzte Selektor-/Eigenschaftspaare:

| wie oft | in Dateien | Selektor · Eigenschaft |
|---|---|---|
| 24× | 4 | `.special-big-die` · `background` / `color` / `border-color` |
| 9× | 7 | `.player.active::after` · `inset` |
| 8× | 5 | `#quitConfirmBtn` · `padding` |
| 8× | 4 | `.second-ability-card` · `min-height` |
| 7× | 6 | `.campaign-hub .campaign-node-map` · `padding` |

Das ist kein Zufallsbefund, sondern das Muster des Stapels: ein Element
wird über Monate in jeder Phase erneut angefasst, weil niemand die
frühere Fassung entfernt hat.

---

## Vorgeschlagene Reihenfolge

Der Stapel darf **nicht** in einem Zug zusammengelegt werden — dafür ist
zu viel davon nur durch das Auge zu prüfen. Sinnvoll ist elementweise:

1. Ein Element wählen, das oben in der Tabelle steht.
2. Die berechneten Stile (`getComputedStyle`) aller betroffenen Zustände
   im Browser festhalten — das ist der Sollwert.
3. Alle Fassungen bis auf die letzte entfernen, die letzte in
   `36-v28-hierarchie.css` oder eine neue Sammeldatei ziehen.
4. Berechnete Stile erneut messen und **auf Gleichheit prüfen**, nicht
   auf „sieht gleich aus".
5. Erst wenn die Werte stimmen, Vorher-Nachher-Vollbilder vergleichen.

Ein Element pro Commit. Wer mehrere bündelt, kann bei einer Abweichung
nicht mehr sagen, welche Entfernung sie verursacht hat.

**Vor dem Entfernen prüfen, ob der Selektor allein steht.** Viele Regeln
sind Sammelregeln (`button.blood, .profile-delete, #quitConfirmBtn { … }`).
Wird der ganze Block gelöscht, verlieren die übrigen Selektoren ihre
Deklarationen — und schlimmer: sie hängen sich an die folgende Regel und
erben deren Werte. Genau das ist beim Quit-Knopf passiert; die
Löschen-Knöpfe hätten `opacity:.48` bekommen. Kein Screenshot des
bearbeiteten Elements hätte das gezeigt, der Wertevergleich schon.

---

## Erledigt

| Element | Entfernt aus | Nachweis |
|---|---|---|
| `#quitConfirmBtn` (V28.7.3) | 13-bright-arcane, 15-ui-rework, 18-phase3, 20-phase5 | alle berechneten Eigenschaften von Knopf, `::before`, `::after` und Label bei 360/412/1280 px identisch |

**Nicht anfassen, solange der Stapel steht:** die Reihenfolge in
`styleOrder`. Sie ist die einzige Stelle, an der die Kaskade
festgeschrieben ist; eine Umsortierung ändert unabsehbar viel.

---

## Was danach kommt

Erst wenn der V28-Stapel auf eine handhabbare Zahl geschrumpft ist,
lohnt der Schritt aus `ARCHITECTURE.md`: `legacy/` auflösen und nach
Zuständigkeit neu schneiden. Vorher würde man die Unordnung nur
umbenennen.
