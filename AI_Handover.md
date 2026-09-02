# AI_Handover

Übergabe zwischen KI-Sitzungen an diesem Repo. Der Nutzer sagt Bescheid,
wann diese Datei fortzuschreiben ist — nicht ungefragt anfassen.

Kurz halten. Was hier steht, muss stimmen — lieber „unklar" schreiben als
raten.

---

## Stand

| | |
|---|---|
| Version | **28.7.3** |
| Branch | `main`, gespiegelt auf `claude/repo-dateibearbeitung-9wfyhe` |
| Letzte Schritte | V28.7.2 fehlende Rahmen · V28.7.3 englisches Sprachpaket · Bestandsaufnahme der CSS-Schichten |

---

## Wie das Repo gebaut wird

- CSS-Quellen liegen in **`src/styles/legacy/`**, nicht in `css/`.
- `scripts/build-styles.mjs` fügt sie in der dort definierten Reihenfolge
  zu **`css/app.css`** zusammen. `index.html` bindet nur dieses Bündel ein.
- **Nach jeder CSS-Änderung `node scripts/build-styles.mjs` ausführen**,
  sonst ist die Änderung wirkungslos. `node scripts/verify-build.mjs`
  prüft das Ergebnis, `.github/workflows/architecture-check.yml` in CI.
- Neue CSS-Datei: in `src/styles/legacy/` ablegen **und** in `styleOrder`
  in `scripts/build-styles.mjs` eintragen. Die Reihenfolge bestimmt die
  Kaskade.

Bei einem Release werden gemeinsam hochgezogen: `index.html`
(`meta wd-build`, `<title>`, `.version-footer`, alle `?v=`),
`js/01-config.js` (`GAME_VERSION`), `sw.js` (`CACHE_VERSION`),
`version.json`, dazu die Bild-URLs in `src/styles/legacy/36-v28-hierarchie.css`.
Sonst liefern HTTP-Cache und Service Worker einmal alte Dateien — genau
den „Mischbuild", vor dem `js/19-build-integrity.js` warnt.

---

## Umbau: wo er steht

**Erledigt (ChatGPT-Cleanup):** der Bauweg. CSS-Quellen gesammelt, ein
Bündel, Prüfskript, CI-Check.

**Nicht erledigt:** die Schichten selbst. Es sind weiterhin 37 Dateien,
nur an einem Ort — der Ordner heißt nicht umsonst `legacy`. `js/` ist
unangetastet, und keine der Grenzen aus `ARCHITECTURE.md` (Engine,
Persistenz, Firebase hinter einer Schnittstelle, Plattform-Adapter)
existiert.

**Gemessen und aufgeschrieben in `docs/CSS-Schichten.md`:** 12.065
Zeilen, 13.408 Deklarationen, davon **2.745 (20 %) von einer späteren
Schicht überschrieben**, 4.269 `!important`. Dort steht auch, welche
Elemente am häufigsten neu gesetzt werden und in welcher Reihenfolge das
Zusammenlegen sinnvoll ist. **Das ist der nächste Arbeitsschritt** — die
Bestandsaufnahme liegt, das Zusammenlegen selbst hat noch nicht begonnen.

Wichtig dabei: Prüfung über `getComputedStyle` auf **Wertgleichheit**,
nicht über den Augenschein, und ein Element je Commit.

---

## Das Rahmen-System

Drei Stufen, definiert in `src/styles/legacy/36-v28-hierarchie.css`:

| Stufe | Wofür | Artwork |
|---|---|---|
| 1 · Ornament | Screen- und Modal-Rahmen, **eine Fläche je Bildschirm** | `panel-large`, `modal-popup`, `player-card-combat` |
| 2 · Kante | Abschnittskarten, Primärbuttons, Weltentabs, Knoten | `ivory-button`, `navy-*`, `gold-special-button`, `die-button` |
| 3 · Linie | alles, was sich in Listen wiederholt oder in Stufe 2 steckt | `slim-strip`, `slim-card`, `slim-pill` |

Die vier Bilder `slim-strip`, `slim-card`, `slim-pill`, `die-button` kamen
vom Nutzer und liegen verlustfrei als WebP in
`assets/ui/v28/png/frames/`. Innen transparent — die Füllfarbe kommt aus
dem CSS, ein Bild trägt damit helle wie dunkle Flächen.

Innerhalb der Stufe 3 gibt es noch ein Gefälle: `slim-card` trägt
Eckornamente und ist deutlich lauter als `slim-strip`. Faustregel aus
V28.7.2: **Fließtext bekommt `slim-card`, wiederholte Datenzeilen
`slim-strip`.**

**Regel:** Zierrat gehört in die Ecken, nie in die Kantenmitte. Bei
9-Slice wird alles zwischen den Ecken gestreckt.

---

## Offen

1. **Zusammenlegen der CSS-Schichten** — siehe oben und
   `docs/CSS-Schichten.md`. Der größte offene Posten.

2. **Changelog auf Englisch** — 622 Einträge in `index.html` bleiben
   deutsch. Bewusst so: Versionsgeschichte, wächst bei jedem Release,
   wird im Spiel nicht gebraucht. Der Nutzer weiß davon; er hat weder
   zu- noch abgesagt.

3. **`.setup-dice-readonly`** — im Setup die einzige dunkle Fläche in
   einer Zeile heller Auswahlfelder. Absicht (Anzeige statt Bedienung)
   oder angleichen? Nutzer wurde gefragt, keine Antwort.

4. **Rundenauswertung** — Ergebniskarten, Stat-Kacheln, Match-Awards und
   Achievement-Toast tragen seit V28.7.0 `slim-card`, sind aber nur
   einzeln geprüft, nicht zusammen im echten Rundenende.

5. **Encounter-Titel werden abgeschnitten** — `.node-detail-title` zeigt
   „5 · Threefold Ver…" statt des vollen Titels. Fiel beim Prüfen von
   V28.7.2 auf, ist älter als der Rahmen-Durchgang, wurde nicht
   angefasst.

---

## Fallen in diesem Repo

- **`js/01-config.js` bis `js/15-app.js` sind Fragmente eines früher
  zusammenhängenden IIFE.** Sie teilen sich den globalen Lexical Scope
  der klassischen Scripts. Ein doppelter `const`-Name über zwei Dateien
  hinweg killt still das ganze Script. Nebenwirkung beim Testen: die
  Daten (`CAMPAIGN_ENCOUNTERS`, `ABILITIES`, …) hängen **nicht** an
  `window`; im Browsertest nur über `(0,eval)("NAME")` erreichbar.
- **Die `border`-Kurzform nimmt nur eine Breite.** `border:16px 21px
  solid transparent` ist ungültig und wird komplett verworfen — 33 solche
  Zeilen wurden entfernt, sie hatten nie gewirkt. Neue Regeln als
  Langform schreiben (`border-style` / `-width` / `-color` getrennt).
- **`border-image-slice` rechnet in Quellpixeln.** Wer ein Rahmenbild
  skaliert, muss jeden Slice-Wert mitskalieren. Deshalb wurden bei der
  WebP-Umstellung `frames/`, `components/` und `backgrounds/` bewusst
  **nicht** skaliert.
- **`border-image` ignoriert `border-radius`, der Hintergrund nicht.**
  Bei runden Rahmen (`slim-pill`, `die-button`) stehen sonst die eckigen
  Füllecken über. Gegenmittel: `border-radius` passend zur gezeichneten
  Rundung setzen — er beschneidet nur den Hintergrund.
- **Verläufe auf gerahmten Knöpfen brauchen
  `background-origin:border-box`.** Sonst malt der Verlauf nur die
  Innenbox aus und wiederholt seine Randfarbe im Rahmenbereich —
  sichtbar als hellerer Streifen an der rechten Kante.
- **`classList.add()` serialisiert das class-Attribut auch dann neu,
  wenn der Token schon da ist**, und erzeugt einen MutationRecord. In
  V28.6.2 hing daran eine Endlosschleife: rund 11.700 DOM-Mutationen pro
  Sekunde im Leerlauf. Bei Arbeit an den Dekorierern (`js/26` bis
  `js/36`) immer gegenprüfen, dass im Leerlauf **0 Mutationen/s**
  anliegen.
- **Emoji-Sprites.** `js/36-emoji-sprite-pass.js` wandelt führende Emoji
  in `<img class="dd-emoji-sprite">`. Jede Funktion, die eine führende
  Dekoration entfernt, muss auch dieses Sprite entfernen — sonst steht
  das Symbol doppelt. Betroffen waren `js/27`, `js/28`, `js/29`, `js/30`,
  `js/32`, `js/34`.
- **Testdaten.** Ein Prüflauf mit „alles freigeschaltet" übersieht genau
  die Fehler, die nur im gesperrten Zustand auftreten. Beides testen.

---

## Das Sprachpaket

Englisch ist **keine zweite Textquelle**, sondern eine Schicht über dem
deutschen DOM: `js/00-i18n.js` übersetzt Textknoten einzeln, in der
Reihenfolge **exact → patterns → Wort-für-Wort**. Die letzte Stufe läuft
nur bei Texten ≤ 24 Zeichen ohne `.!?`.

Genau daraus entstanden die Mischformen: eine Detailzeile ist
`<strong>Pflicht-Loadout:</strong> P1 Zweite Chance`. Die Beschriftung
ist ein eigener kurzer Textknoten, „Pflicht" wurde einzeln ersetzt →
„required-Loadout". Der Wert daneben ist zu lang, wurde gar nicht
angefasst und blieb deutsch.

Das schlägt bis in die Symbole durch: `js/29-v28-ui-phase1.js` wählt das
Icon einer Detailzeile über ihren Text. Trifft der Text weder das
deutsche noch das englische Muster, steht dort `navigation/info.svg`.

**Aufbau seit V28.7.3:**

- `lang/en.js` — Oberfläche: `exact`, `patterns`, `replacements`.
  Die 76 Satzmuster lagen bis dahin fest verdrahtet in `js/00-i18n.js`;
  sie stehen jetzt als `pack.patterns` im Paket. Jede Musterfunktion
  bekommt `(m, tr)` — `tr()` übersetzt Teilstücke wie Fähigkeitsnamen.
- `lang/en-campaign.js` — Erzähltexte der Kampagne. Neue Encounter:
  Untertitel, Beschreibung und Challenge **hier** nachtragen.
- Reihenfolge in `index.html`: `de.js`, `en.js`, `en-campaign.js`,
  `js/00-i18n.js`. Beide Pakete müssen vor dem Übersetzer laufen.

**Regel:** alles, was in einem `<strong>` oder einer Plakette steht,
gehört als **exakter Eintrag** ins Paket. Wort-für-Wort ist nur der
Notnagel und erzeugt bei Komposita Mischformen.

Fehlt eine Encounter-Beschreibung, ersetzt der Notbehelf in
`js/00-i18n.js` sie durch einen neutralen englischen Satz — sichtbar,
aber nie halbdeutsch. Stand V28.7.3 greift er nirgends mehr.

---

## So wird hier geprüft

Lokal ausliefern und im Browser messen, nicht raten:

```
npx http-server -p 8099 -c-1 --silent .
```

Playwright liegt unter `/opt/node22/lib/node_modules/playwright`.
Externe Hosts (Firebase, three, cannon) sind im Sandbox-Proxy nicht
erreichbar — im Test mit `page.route` auf eine leere Antwort umlenken,
sonst hängt `waitUntil: "load"`.

Sinnvolle Prüfungen vor einem Commit:

- `node scripts/build-styles.mjs && node scripts/verify-build.mjs`
- Build-Integrity (`window.__WD_BUILD_INTEGRITY__`) muss `ok: true` sein
- keine JS-Fehler, keine 404 — **in beiden Sprachen**
- im Leerlauf 0 DOM-Mutationen pro Sekunde
- bei Layoutänderungen Vorher-Nachher-Vollbilder vergleichen
- bei Breiten-/Rasteränderungen bei 320, 360, 390, 412 und 1280 px messen

**Bei Sprachänderungen:** einen Referenzstand aller Spieltexte vor der
Änderung aufnehmen (jeden Quelltext durch `window.t()` schicken), danach
erneut und **beide vergleichen**. Interessant sind die Einträge, deren
Vorher-Wert schon englisch aussah — dort entstehen Verschlechterungen.
So wurden bei V28.7.3 355 Änderungen geprüft, 19 davon von Hand.

**Vorsicht bei automatischen Deutsch-Prüfern:** „die" ist auch das
englische Wort für Würfel. Ein naiver Wörtertest meldet korrekt
übersetzte Sätze als deutsch.

---

## Commits

Deutsch, erklären **warum**, nicht nur was. Ende jeder Nachricht:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Kein Modellname in Code, Kommentaren oder sonstigen Artefakten im Repo.
