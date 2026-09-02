# AI_Handover

Übergabe zwischen KI-Sitzungen an diesem Repo. **Vor Erreichen eines
Nutzungslimits aktualisieren**, damit die nächste Sitzung (Claude oder
ChatGPT) ohne Rückfragen weiterarbeiten kann.

Kurz halten. Was hier steht, muss stimmen — lieber „unklar" schreiben als
raten.

---

## Stand

| | |
|---|---|
| Version | **28.7.1** |
| Branch | `main`, gespiegelt auf `claude/repo-dateibearbeitung-9wfyhe` |
| Letzter Schritt | CSS-Architektur-Cleanup (ChatGPT) mit V28.7.1 zusammengeführt |

---

## Wie das Repo gebaut wird (seit dem Cleanup)

- CSS-Quellen liegen in **`src/styles/legacy/`**, nicht mehr in `css/`.
- `scripts/build-styles.mjs` fügt sie in der dort definierten Reihenfolge
  zu **`css/app.css`** zusammen. `index.html` bindet nur noch dieses
  Bundle ein.
- **Nach jeder CSS-Änderung `node scripts/build-styles.mjs` ausführen**,
  sonst ist die Änderung wirkungslos. `node scripts/verify-build.mjs`
  prüft das Ergebnis, `.github/workflows/architecture-check.yml` in CI.
- Neue CSS-Datei: in `src/styles/legacy/` ablegen **und** in
  `styleOrder` in `scripts/build-styles.mjs` eintragen. Die Reihenfolge
  bestimmt die Kaskade.

Bei einem Release werden gemeinsam hochgezogen: `index.html`
(`meta wd-build`, `<title>`, `.version-footer`, alle `?v=`),
`js/01-config.js` (`GAME_VERSION`), `sw.js` (`CACHE_VERSION`),
`version.json`. Sonst liefern HTTP-Cache und Service Worker einmal alte
Dateien — genau den „Mischbuild", vor dem `js/19-build-integrity.js`
warnt.

---

## Das Rahmen-System (aktueller Arbeitsschwerpunkt)

Drei Stufen, eingeführt in `src/styles/legacy/36-v28-hierarchie.css`:

| Stufe | Wofür | Artwork |
|---|---|---|
| 1 · Ornament | Screen- und Modal-Rahmen, **eine pro Bildschirm** | `panel-large`, `modal-popup`, `player-card-combat` |
| 2 · Kante | Abschnittskarten, Primärbuttons, Weltentabs, Knoten | `ivory-button`, `navy-*`, `gold-special-button`, `die-button` |
| 3 · Linie | alles, was sich in Listen wiederholt oder in Stufe 2 steckt | `slim-strip`, `slim-card`, `slim-pill` |

Die vier Bilder `slim-strip`, `slim-card`, `slim-pill`, `die-button` kamen
vom Nutzer und liegen verlustfrei als WebP in
`assets/ui/v28/png/frames/`. Innen transparent — die Füllfarbe kommt aus
dem CSS, ein Bild trägt damit helle wie dunkle Flächen.

**Regel:** Zierrat gehört in die Ecken, nie in die Kantenmitte. Bei
9-Slice wird alles zwischen den Ecken gestreckt.

**Anlass:** Der Achievement-Screen zeigte 69 gerahmte Flächen, bis zu drei
ineinander; Setup bei acht Spielern rund 40 Ornamentrahmen untereinander.
Nach dem Durchgang: Achievements 1 Ornament + 48 leise.

---

## Offen

1. **Breite der inneren Rahmen** — Nutzer meldet, sie stehen über den
   Ornamentrahmen hinaus, auf Handy **und** Desktop. Ursache gefunden und
   in V28.7.1 angegangen: `.screen-card` zeichnet mit
   `border-image-width: 22px 17px`, reservierte horizontal aber nur `6px`
   Padding — der Inhalt lag konstruktionsbedingt 11 px je Seite unter dem
   Rahmen. Padding steht jetzt auf 19 px (15 px unter 380 px Breite).
   **Nutzer-Rückmeldung dazu steht noch aus.**

2. **Englisches Sprachpaket** — `lang/en.js` und `js/00-i18n.js` liefern
   Mischformen wie „required-Loadout", „Bonus-Draft je player",
   „reward:" (klein). Nebeneffekt: `js/29-v28-ui-phase1.js` erkennt diese
   Zeilen nicht mehr und fällt bei allen Detailzeilen auf `info.svg`
   zurück statt Schloss und Geschenk zu zeigen. Auf Deutsch stimmt alles.
   Der Nutzer hat freigegeben, das umzuschreiben.

3. **`.setup-dice-readonly`** — im Setup jetzt die einzige dunkle Fläche
   in einer Zeile heller Auswahlfelder. Absicht (Anzeige statt Bedienung)
   oder angleichen? Nutzer wurde gefragt, keine Antwort.

4. **Rundenauswertung** — Ergebniskarten, Stat-Kacheln, Match-Awards und
   Achievement-Toast tragen seit V28.7.0 `slim-card`, sind aber nur
   einzeln geprüft, nicht zusammen im echten Rundenende.

---

## Fallen in diesem Repo

- **`js/01-config.js` bis `js/15-app.js` sind Fragmente eines früher
  zusammenhängenden IIFE.** Sie teilen sich den globalen Lexical Scope
  der klassischen Scripts. Ein doppelter `const`-Name über zwei Dateien
  hinweg killt still das ganze Script.
- **Die `border`-Kurzform nimmt nur eine Breite.** `border:16px 21px
  solid transparent` ist ungültig und wird komplett verworfen — 33 solche
  Zeilen wurden entfernt, sie hatten nie gewirkt. Neue Regeln als
  Langform schreiben (`border-style` / `-width` / `-color` getrennt).
- **`border-image-slice` rechnet in Quellpixeln.** Wer ein Rahmenbild
  skaliert, muss jeden Slice-Wert mitskalieren. Deshalb wurden bei der
  WebP-Umstellung `frames/`, `components/` und `backgrounds/` bewusst
  **nicht** skaliert.
- **`classList.add()` serialisiert das class-Attribut auch dann neu, wenn
  der Token schon da ist**, und erzeugt einen MutationRecord. In
  V28.6.2 hing daran eine Endlosschleife: rund 11.700 DOM-Mutationen pro
  Sekunde im Leerlauf. Bei Arbeit an den Dekorierern
  (`js/26` bis `js/36`) immer gegenprüfen, dass im Leerlauf **0
  Mutationen/s** anliegen.
- **Emoji-Sprites.** `js/36-emoji-sprite-pass.js` wandelt führende Emoji
  in `<img class="dd-emoji-sprite">`. Jede Funktion, die eine führende
  Dekoration entfernt, muss auch dieses Sprite entfernen — sonst steht
  das Symbol doppelt. Betroffen waren `js/27`, `js/28`, `js/29`, `js/30`,
  `js/32`, `js/34`.
- **Testdaten.** Ein Prüflauf mit „alles freigeschaltet" übersieht genau
  die Fehler, die nur im gesperrten Zustand auftreten. Beides testen.

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
- keine JS-Fehler, keine 404
- im Leerlauf 0 DOM-Mutationen pro Sekunde
- bei Layoutänderungen Vorher-Nachher-Vollbilder pixelweise vergleichen

---

## Commits

Deutsch, erklären **warum**, nicht nur was. Ende jeder Nachricht:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Kein Modellname in Code, Kommentaren oder sonstigen Artefakten im Repo.
