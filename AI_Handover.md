# AI_Handover

Übergabe zwischen KI-Sitzungen an diesem Repo. Der Nutzer sagt Bescheid,
wann diese Datei fortzuschreiben ist — nicht ungefragt anfassen.

Kurz halten. Was hier steht, muss stimmen — lieber „unklar" schreiben als
raten.

---

## Stand

| | |
|---|---|
| Version | **28.11.13** |
| Branch | `main` |
| Letzte Schritte | Vorrangmarkierungen stark reduziert (4647 → 318) · acht Folgefehler daraus zurückgedreht · Rundenvorbereitung und Rundenauswertung überarbeitet · Supabase-Räume laufen bei Untätigkeit ab |

**Zwei Sitzungen arbeiten parallel.** Vor jedem Push `git pull --rebase`.
Die Aufteilung wechselt je Auftrag; sie steht jeweils im Prompt an die
andere Sitzung. Zuletzt: Codex hat die Vorrangmarkierungen (`!important`)
im gesamten Stapel abgeräumt, diese Sitzung hat die Folgefehler gemessen
und zurückgedreht.

**Achtung, die Dateinamen haben sich geändert.** Der V28-Stapel war 19
Dateien und ist seit V28.11.5 auf drei zusammengelegt:
`13-v28-grundlage` (bright-arcane, asset-system, ui-rework),
`16-v28-phasen` (phase1 bis phase12 plus dice-designs) und
`29-v28-korrekturen` (hotfix, combat-lock, marked-ui). Zusammengelegt
wurden nur in `styleOrder` benachbarte Dateien, die Kaskade ist deshalb
Regel für Regel dieselbe. Im Text steht über jedem Abschnitt, aus
welcher Datei er stammt.

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

**Nicht erledigt:** die Schichten selbst. `js/` ist unangetastet, und
keine der Grenzen aus `ARCHITECTURE.md` (Engine, Persistenz, Firebase
hinter einer Schnittstelle, Plattform-Adapter) existiert.

**Der Stapel wächst weiter.** Zahlen aus `docs/CSS-Schichten.md`, neu
gemessen auf 28.9.4:

| | 28.7.3 | 28.9.4 |
|---|---|---|
| Dateien | 37 | **40** |
| Zeilen | 12.065 | **12.803** |
| `!important` | 4.269 | **4.680** |
| von späteren Schichten überschrieben | 2.745 (20 %) | **2.998 (21 %)** |

Dazugekommen sind `38-endgame-mechanics.css`,
`39-v28-campaign-polish.css` und `40-v28-screen-restoration.css`. Die
letzten beiden sind Korrekturschichten: 28.9.3 stellt gerahmte
Utility-Screens wieder her, 28.9.4 behebt Rahmen-Regressionen. Das ist
kein Vorwurf — bei 40 Schichten und 4.680 `!important` ist eine neue
Schicht oft der einzige Weg, der in vertretbarer Zeit funktioniert.
Genau deshalb wird jede Runde teurer.

**Vier Schritte sind gemacht** (Einzelheiten und Nachweise in
`docs/CSS-Schichten.md`): `#quitConfirmBtn`, die doppelten
Würfel-Themes, 84 vollständig überdeckte Regeln, 509 einzeln
überschriebene Deklarationen. Zusammen 777 tote Deklarationen.

| | 28.9.4 | 28.11.2 | 28.11.13 |
|---|---|---|---|
| Zeilen | 12.803 | 11.447 | **11.447** |
| `!important` | 4.680 | 4.597 | **318** |
| überschrieben | 2.998 (21 %) | 2.087 (15 %) | — |
| `css/app.css` | 510 KB | 491 KB | **475 KB** |

**Die Vorrangmarkierungen sind seit V28.11.9 weg** — 4.398 Stück, in
einem Zug von der anderen Sitzung. Das ist der größte Einzelfortschritt
an der Kaskade bisher; die Dateizahl blieb dabei bei 25. Die 318 heute
verbliebenen Markierungen sind kein Rest zum Wegräumen, sondern
größtenteils **notwendig** und mit Begründung im Quelltext versehen. Sie
fallen in zwei Muster:

1. Eine gezielte Zustandsregel in einer frühen Schicht muss eine
   allgemeinere Regel aus einer späteren Schicht schlagen
   (`.hidden`, `.die.attack-hit`, `.campaign-node.current::after`).
2. Eine Regel muss einen **Inline-Stil** aus dem Skript schlagen. Inline
   schlägt jede Spezifität, nur `!important` kommt darüber
   (`#profilesScreen`-Scroll, Höhe des Würfelfensters).

**Was das Zurückdrehen gekostet hat:** acht Regressionen, gefunden erst
nach dem Push. Lehre daraus steht unten unter „So wird hier geprüft":
ein synthetischer Paartest über die Selektoren findet sie **nicht**
zuverlässig, der Vollabzug am echten Baum schon.

**Das wichtigste Werkzeug ist der Vollabzug** (`snapshot.mjs`-Muster in
`docs/CSS-Schichten.md` beschrieben): er liest von jedem Element jedes
Bildschirms 45 berechnete Eigenschaften samt Pseudoelementen bei drei
Breiten — rund 472.000 Werte — und vergleicht vor/nach der Änderung.
Er hält dafür Animationen an und wurde gegen sich selbst geprüft. Ohne
ihn ist keine dieser Entfernungen zu verantworten.

Was noch liegt: Kurz- gegen Langform. Setzt eine spätere Regel
`background` und die frühere `background-color`, wird das bisher nicht
als Deckung gezählt, obwohl die Kurzform sie zurücksetzt. Bewusst
untererkannt — in dieser Richtung liegt der Fehler richtig.

Wichtig bei allem: Prüfung über `getComputedStyle` auf
**Wertgleichheit**, nicht über den Augenschein, und vorher prüfen, ob
der Selektor allein steht oder Teil einer Sammelregel ist.

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

### Weltassets seit 28.11.4

- Die gemalten `world-*-frame-rect.webp` bleiben unzerschnittene
  Hintergründe (`background-size: 100% 100%`) und ausdrücklich **kein**
  9-Slice. Auf Nutzerentscheidung tragen Weltbanner, alle Welt-Tabs sowie
  Boss-Rush-Gegner jeweils das vollständige Bild ihrer zugeordneten Welt.
- Welt-Tabs zeigen damit in jedem Zustand den eigenen Weltrahmen. Weltfarbe
  und Wappen bleiben auch inaktiv sichtbar; gesperrt wird zusätzlich über
  eine Schlossplakette statt über eine schmutzige Graufilterung gezeigt.
- Weltbanner und Boss-Detailkopf halten 3:1, solange der Inhalt hineinpasst,
  und wachsen sonst mit dem Inhalt. Der Rift-Rahmen beschneidet nur seine
  zwei übermalten Klingenspitzen.
- `js/29-v28-ui-phase1.js` schreibt den Zustand einer Detailplakette einmal
  als `data-campaign-state`; Iconwahl und CSS hängen nicht mehr am sichtbaren
  Wort „GESCHAFFT“. Lange Titel behalten dadurch die ganze Zeilenbreite.
- Boss Rush weist über `BOSS_RUSH_WORLD_THEME_KEYS` zehn Weltidentitäten
  deterministisch nach Stufenindex zu. Nur Gegner übernehmen den vollständigen
  Rechteckrahmen und die Palette; Spielerrahmen bleiben unverändert. Der
  Live-Status besteht aus vier Feldern: Stufe, Boss, Phase, XP.
- Browsermessung: 320, 360, 390, 412 und 1280 px. Banner-Contentbox liegt
  jeweils in der Artwork-Öffnung, Welt- und Gegnerrahmen liegen bei `inset: 0`,
  Client- und Scrollhöhe sind gleich, Encounter- und Bossnamen vollständig.
- Seit 28.11.5 ist der Welt-Kicker ausgeblendet und reserviert keine Höhe mehr:
  mobil sind Tabs `112 × 124 px`, ab 541 px `120 × 133 px`. Das doppelte Wappen
  im Weltbanner ist ausgeblendet; die Textspalte belegt dessen bisherigen Platz.
- Boss-Rush-Gegner reservieren unten 60 px für das gemalte Ornament. Die vier
  Statusfelder haben keinen eigenen Border; die dunkle Füllung bleibt wegen des
  deutlich besseren Kontrasts zum roten Außenornament erhalten.

---

## Offen

1. **Zusammenlegen der CSS-Schichten** — 25 Dateien, siehe oben und
   `docs/CSS-Schichten.md`. Der größte offene Posten am Stapel. Die
   Vorrangmarkierungen sind dagegen erledigt (4.647 → 318).

2. **Changelog auf Englisch** — 138 Versionsblöcke mit zusammen 733
   Punkten in `index.html` (Zeilen 487 bis 624) bleiben deutsch. Sie
   liegen in einem eigenen Bildschirm, sind reine Versionsgeschichte und
   werden im Spiel nicht gebraucht. Die Übersetzungsschicht in `lang/`
   fasst sie bewusst nicht an: sie arbeitet über Textknoten, und 733
   Einzeleinträge dort einzutragen würde jede Sprachprüfung sprengen.

3. **Online-Match** — funktioniert derzeit nicht: die Lobby wird
   gefunden, das Match startet nicht. **Die Serverseite ist als Ursache
   ausgeschlossen** (V28.11.13, gegen das echte Projekt gemessen):

   - Alle Funktionen sind live und richtig gesperrt — anonym gerufen
     antworten sie mit `permission denied`, nicht mit „unbekannt".
   - Der ganze Ablauf läuft durch: Raum anlegen, beitreten, beide
     bereit, starten, Zustand lesen. Beide Seiten bekommen alle
     Realtime-Nachrichten (`dd_battle_members`, `dd_battle_rooms`,
     `dd_battle_states`).
   - `supabase/tests/20-matchstart.sql` sichert dasselbe lokal ab,
     **als Rolle `authenticated` mit aktiven Zeilenregeln** — der ältere
     Test lief als Eigentümer und umging sie.

   Der Fehler liegt also im Browser. Nicht weiter eingegrenzt, weil der
   Sandbox-Proxy `supabase.co` aus dem Browser heraus sperrt (aus Node
   geht es). Was als Nächstes zu prüfen wäre: die Verbindungsanzeige in
   der Lobby (muss „Supabase Live verbunden" zeigen) und die
   Konsolenausgabe während eines echten Versuchs. Ein Verdacht, der beim
   Lesen auffiel und noch nicht widerlegt ist: der Rückruf
   `onAuthStateChange` in `js/online/01-online.js` wirft den Spieler bei
   jeder Sitzungsmeldung **ohne** Nutzer aus der Lobby.

4. **`dd_touch_room` fehlt auf der Datenbank.** Die zweite Migration
   (`20260903120000_dd_room_idle_expiry.sql`, Räume laufen bei
   Untätigkeit nach 45 Minuten bzw. 2 Stunden ab) ist im Repo, aber nicht
   eingespielt. Nachweis: die Funktion antwortet mit „nicht gefunden",
   alle Funktionen der ersten Migration antworten mit „permission
   denied". Einspielen mit `supabase db push`.

5. **Host-autoritativ.** Der Spielstand kommt vom Gerät des Hosts,
   niemand prüft ihn nach. Ohne öffentliche Bestenliste unkritisch, mit
   einer wird es das Hauptproblem. Ebenso offen: die Zuordnung von
   `Profiles` zu `auth.users`.

6. **Reste aus der Rundenauswertung** — Namen und Stat-Werte werden
   unter 412 px noch leicht beschnitten. Zuletzt vor den Korrekturen aus
   V28.11.13 gemessen, müsste neu nachgemessen werden.

**Entschieden, nicht mehr offen:** Fähigkeitsnamen mischen absichtlich
Deutsch und Englisch — Eigennamen wie Snake Eyes oder Loaded Dice werden
nicht eingedeutscht. Das Würfeldesign-Feld im Setup bleibt reine
Anzeige, trägt seit V28.11.2 aber den Stil seiner Nachbarn. Die
Rundenvorbereitung und der Fähigkeits-Picker sind seit V28.11.10 bis
28.11.12 überarbeitet: Erklärtext je Regel umgebrochen, Symbol mit
Kartenabstand, grünes Häkchen in der gemalten Fassung, Kontraste erhöht.

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

**Beim Entfernen von Vorrangmarkierungen** ist der einzige belastbare
Nachweis der A/B-Vollabzug am echten Baum:
`scripts/qa/ab-stylesheet.mjs <alt.css> [neu.css] [breite]`. Er lädt die
Seite einmal, hängt beide Bündel als `<style>` ein, schaltet zwischen
ihnen um und liest an jedem Element 49 Eigenschaften samt
Pseudoelementen — an rund 40 Stationen, vom Hauptmenü über die Kampagne
bis zum ausgespielten Bot-Kampf und der Rundenvorbereitung.

Was **nicht** reicht: ein synthetischer Paartest über die Selektoren
(`scripts/qa/important-diagnose.mjs`). Er baut Elemente, die Regel und
Konkurrent gleichzeitig erfüllen, prüft aber die Vorfahren nicht mit und
meldet dadurch tausende Paare, die es nie gibt. Er hat die acht echten
Regressionen aus V28.11.9 zwar enthalten, aber unter zu vielen
Fehlmeldungen. Er taugt zum Eingrenzen, nicht zum Freigeben.

**Zur Supabase-Seite** gibt es einen eigenen Läufer:
`bash scripts/qa/supabase-raumtest.sh`. Er startet ein eigenes Postgres,
spielt Bootstrap und beide Migrationen ein und prüft 24 Zusicherungen —
Raumablauf, Zustands-Schreibweg und den kompletten Matchstart als Rolle
`authenticated` mit aktiven Zeilenregeln. Er prüft sich selbst mit: eine
absichtlich naive Variante **muss** durchfallen.

---

## Commits

Deutsch, erklären **warum**, nicht nur was. Ende jeder Nachricht:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Kein Modellname in Code, Kommentaren oder sonstigen Artefakten im Repo.
