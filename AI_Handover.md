# AI_Handover

Übergabe zwischen KI-Sitzungen an diesem Repo.

**Nach jedem Push prüfen, ob diese Datei noch stimmt.** Die Tabelle unter
„Stand" wird jedes Mal nachgezogen; alles andere nur, wenn sich wirklich
etwas geändert hat — eine Entscheidung, ein offener Punkt, eine neue
Falle. Kein Eintrag für jede Version, sonst verwildert die Datei.

Kurz halten. Was hier steht, muss stimmen — lieber „unklar" schreiben als
raten. Ein veralteter Absatz ist schlimmer als ein fehlender: er wird
geglaubt.

Die **Regeln** stehen nicht hier, sondern in `docs/PROJEKTREGELN.md` —
Bauweg, Rahmenkonventionen, Sprachpaket, feste Entscheidungen. Diese
Datei hier beschreibt den **Zustand**: wo der Umbau steht, was offen ist,
welche Fallen schon Zeit gekostet haben.

---

## Stand

| | |
|---|---|
| Version | **28.11.31** |
| Branch | `main` |
| Letzte Schritte | CSS-Stapel auf 10 Dateien zusammengelegt · Changelog englisch vervollständigt · Hauptmenü, Statistik, Profile, Achievements, Spielvorbereitung und Trophy Shop überarbeitet · Fähigkeits- und Shopflächen auf proportional gekachelte Bildrahmen umgestellt · alle Bild-URLs auf einen gemeinsamen Cache-Schlüssel · Trophy-Shop-Reste bereinigt und Aufklapppfeile angeglichen |

**Die Arbeitsteilung hat sich geändert.** Bis V28.11.28 liefen zwei
Sitzungen parallel: Codex hat umgesetzt, diese Sitzung geprüft. Ab jetzt
läuft die laufende Arbeit in **einer** Sitzung — Umsetzung und Prüfung
zusammen. Codex bleibt als Reserve für drei Fälle: wenn dieselbe Sache
zweimal misslingt, wenn eine zweite unabhängige Umsetzung den Fehler
billiger macht (Kandidat: host-autoritatives Online), oder wenn ein
frischer Blick auf einen Bildschirm nötig ist.

**Damit fällt die zweite Instanz als Gegenprüfung weg.** Ersatz ist
Pflicht: **das Messskript vor der Änderung schreiben, gegen die
Anforderung — nicht gegen die eigene Umsetzung.** Wer seinen eigenen Code
prüft, sieht seinen eigenen blinden Fleck nicht. Die Skripte in
`scripts/qa/` sind genau dafür da.

Läuft doch einmal eine zweite Sitzung mit: vor jedem Push
`git pull --rebase`.

**Achtung, die Dateinamen haben sich geändert.** Aus 40 CSS-Dateien sind
seit V28.11.14 zehn geworden. Zusammengelegt wurden immer nur in
`styleOrder` benachbarte Dateien, die Kaskade ist deshalb Regel für Regel
dieselbe. Im Text steht über jedem Abschnitt, aus welcher Datei er stammt:

```
01-grundlage        06-version-27       09-labore
11-mastery-und-konto  13-v28-grundlage  16-v28-phasen
29-v28-korrekturen  32-nachtraege       36-v28-hierarchie
37-abschluss
```

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

**Erledigt:** der Bauweg (CSS-Quellen gesammelt, ein Bündel, Prüfskript,
CI-Check), die Vorrangmarkierungen und das Zusammenlegen der Schichten.

**Nicht erledigt:** die Schichten in `js/`. Dort ist nichts angetastet,
und keine der Grenzen aus `ARCHITECTURE.md` (Engine, Persistenz, Firebase
hinter einer Schnittstelle, Plattform-Adapter) existiert.

**Vier Aufräumschritte am CSS** (Einzelheiten und Nachweise in
`docs/CSS-Schichten.md`): `#quitConfirmBtn`, die doppelten
Würfel-Themes, 84 vollständig überdeckte Regeln, 509 einzeln
überschriebene Deklarationen. Zusammen 777 tote Deklarationen.

| | 28.9.4 | 28.11.2 | 28.11.28 |
|---|---|---|---|
| Dateien | 40 | 25 | **10** |
| Zeilen | 12.803 | 11.447 | **12.271** |
| `!important` | 4.680 | 4.597 | **334** |
| überschrieben | 2.998 (21 %) | 2.087 (15 %) | — |
| `css/app.css` | 510 KB | 491 KB | **476 KB** |

Die Zeilen sind seit 28.11.2 wieder gewachsen — das sind die
UI-Durchgänge von V28.11.14 bis .28, nicht neue Schichten.

**Die Vorrangmarkierungen sind seit V28.11.9 weg** — 4.398 Stück in
einem Zug. Das ist der größte Einzelfortschritt an der Kaskade. Die 334
heute
verbliebenen Markierungen sind kein Rest zum Wegräumen, sondern
größtenteils **notwendig** und mit Begründung im Quelltext versehen. Sie
fallen in zwei Muster:

1. Eine gezielte Zustandsregel in einer frühen Schicht muss eine
   allgemeinere Regel aus einer späteren Schicht schlagen
   (`.hidden`, `.die.attack-hit`, `.campaign-node.current::after`).
2. Eine Regel muss einen **Inline-Stil** aus dem Skript schlagen. Inline
   schlägt jede Spezifität, nur `!important` kommt darüber
   (`#profilesScreen`-Scroll, Höhe des Würfelfensters).

**Was das Zurückdrehen gekostet hat:** neun Regressionen, gefunden erst
nach dem Push. Lehre daraus steht unten unter „So wird hier geprüft":
ein synthetischer Paartest über die Selektoren findet sie **nicht**
zuverlässig, der Vollabzug am echten Baum schon.

Die neunte fand der Prüfstand selbst nicht — sie lag im Bossdetail einer
**durchgespielten** Welt, und der A/B-Abzug kam nie dorthin. Er sät jetzt
vor dem ersten Laden einen fertigen Spielstand in `localStorage` und hat
Stationen für Boss und aufgeklapptes Profil. **Ein Prüfstand ist nur so
gut wie der Zustand, den er erreicht** — vor dem Vertrauen darauf immer
fragen, welchen Bildschirm er nie sieht.

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

### Kachelgitter für Bilder mit Mittelornament

Mehrere Buttonbilder haben mittig oben und unten einen Edelstein — ein
normales `border-image` würde ihn mitdehnen. Seit V28.11.25 gibt es dafür
ein Gitter aus `<svg viewBox>`-Ausschnitten: feste Spalten für Ecken und
Edelstein, dehnbare `1fr` dazwischen. Umgesetzt in `buttonArtwork`
(`js/08-profiles-stats.js`) und `decorateSetupAbilityResults`
(`js/28-v28-ui-rework.js`).

**Die Bedingung, an der alles hängt:** feste Spaltenbreite geteilt durch
Quellbreite muss denselben Faktor ergeben wie Kachelhöhe geteilt durch
Quellhöhe. Sonst sind die Ornamente verzerrt. Beispiel Trophy Shop:
`navy-button-horizontal` ist 1536 × 512, Ecke 128 px, Edelstein 160 px,
gerendert 14,08 / 17,60 px bei 56,32 px Höhe — überall Faktor 0,11.
Wächst das Feld auch in der Höhe, braucht es drei Zeilen statt einer
(15,84 / `1fr` / 15,84).

Vorsicht bei der Randstärke: `border-image-slice` ist **nicht** die
sichtbare Goldschiene. Bei `navy-button-horizontal` ist der Slice 144 px,
die Schiene aber nur 90 px. Wer Abstände gegen den Slice rechnet, meldet
Kollisionen, die es nicht gibt — am Bild messen.

### Gestreckte Rahmen bleiben

22 Stellen zeigen ein Rahmenbild als `background-size:100% 100%` mit über
15 % Abweichung vom Seitenverhältnis der Quelle, bis Faktor 2,0
(Statistik-Überschriften, Hauptmenüknöpfe, Profilkopf, `prestige-wallet`).
**Nutzerentscheidung: das bleibt so.** Etwas Streckung ist akzeptiert und
wird nur auf ausdrückliche Ansage geändert. Nicht ungefragt „reparieren".

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

1. **Online läuft — aber der Gast wartet.** Der Nutzer hat am 10.09. mit
   zwei echten Geräten durchgespielt: Lobby, Beitritt und Matchstart
   funktionieren. Übrig bleibt eine deutliche Verzögerung **nur beim
   Gast**. Das ist kein Netzproblem, sondern die Reihenfolge im Code:

   `hostExecuteAction` (`js/17-online-bridge.js:731`) führt die Aktion
   aus und wartet dann mit `waitForEngineSettled` bis die **Animation des
   Hosts vollständig abgelaufen** ist — erst danach veröffentlicht es den
   Stand. Der Host sieht seine Animation also live, der Gast bekommt sie
   erst hinterher als fertigen Zustand geschickt.

   Größenordnungen, aus dem Quelltext: ein Wurf ist 250 ms (schnell) bzw.
   430 ms; eine Schadenskette läuft über `650 + i*520` ms, also bis rund
   1.700 ms; `waitForEngineSettled` deckelt bei 3.600 ms. Dazu kommen
   zwei Netzwege (Gast → DB → Host, Host → DB → Gast).

   Kleinerer Zusatzposten: der Gast ist auf `dd_battle_actions` ohne
   Akteursfilter abonniert und holt deshalb einen **vollen Schnappschuss
   für seine eigene Aktionszeile** — nutzlos, und weil `refreshAgain` in
   `subscribeRoom` (`js/43-supabase-battle.js:188`) erneut über den 45-ms-
   Debounce geht, schiebt sich dieser Abruf vor den nützlichen. Modell der
   zwölf Zeilen bei 180 ms Abfragedauer: 451 ms statt 376 ms.

   Drei Hebel, nach Wirkung sortiert:
   - **Zwei Veröffentlichungen statt einer.** Direkt nach
     `executeOnlineAction` einen vorläufigen Stand senden, damit der Gast
     *parallel* zum Host animiert, danach den gesetzten Stand. Nimmt die
     Animationsdauer aus der Wartezeit des Gastes. Echter Eingriff ins
     Synchronisationsprotokoll — `seq`-Reihenfolge und `actionPending`
     müssen mit.
   - Gast ignoriert Realtime-Ereignisse zu seinen **eigenen** Aktionen.
   - `refreshAgain` sofort statt über den Debounce (45 ms).

   Der ältere Verdacht auf tote Realtime-Verbindung ist damit erledigt.
   Das Prüfskript bleibt gültig: `scripts/qa/online-durchspielen.mjs` fährt
   zwei getrennte Browser gegen das echte Projekt, und alle zwölf
   Zusicherungen sind grün: Anmeldung, Raumcode, Beitritt, der Host sieht
   den Gast ohne Neuladen, die Bereitmeldung kommt an, beide landen im
   Match, und der erste Wurf steht auf beiden Seiten mit denselben Augen.
   Ebenso grün ist die Serverseite, lokal abgesichert in
   `supabase/tests/20-matchstart.sql` **als Rolle `authenticated` mit
   aktiven Zeilenregeln** — der ältere Test lief als Eigentümer und
   umging sie.

2. **`dd_touch_room` fehlt auf der Datenbank.** Die zweite Migration
   (`20260903120000_dd_room_idle_expiry.sql`, Räume laufen bei
   Untätigkeit nach 45 Minuten bzw. 2 Stunden ab) ist im Repo, aber nicht
   eingespielt. Nachweis: die Funktion antwortet mit „nicht gefunden",
   alle Funktionen der ersten Migration antworten mit „permission
   denied". Einspielen mit `supabase db push`. **Nutzerseite.**

3. **Serverautoritativ — vertagt, mit klarer Bedingung.** Heute kommt der
   Spielstand vom Gerät des Hosts und niemand prüft ihn nach.

   **Angefasst wird das erst, wenn es eine öffentliche Bestenliste gibt
   oder gegen Fremde gespielt wird.** Solange man gegen Leute spielt, die
   neben einem sitzen, schützt der Umbau vor nichts.

   Am 10.09. bewusst gegen einen sofortigen Umbau entschieden, aus drei
   Gründen:
   - Er löst die Gastverzögerung **nicht besser** als das frühe
     Veröffentlichen (Punkt 1) und macht den **Host langsamer**: der
     spielt heute mit 0 ms und wartete danach auf denselben Roundtrip.
   - Umfang: rund 5.000 Zeilen Spiellogik in `js/09`, `10`, `12`, `13`,
     `14`, `03d`, `23`, dazu 25 Fähigkeiten, 90 Encounter, 8 Mutatoren,
     7 Modifikatoren, 6 Weltregeln, 10 Boss-Rush-Stufen. Die vorhandenen
     902 Zeilen SQL sind reine Raumverwaltung, **null Spiellogik**.
   - Solo, Kampagne, Tutorial und lokales Spiel brauchen die JS-Engine
     weiter. Es blieben also dieselben Regeln in zwei Sprachen, und jede
     Balanceänderung müsste zweimal gemacht und zweimal geprüft werden.
     Das ist die eigentliche Dauerlast, nicht der Port.

   Wenn es soweit ist: erst ein Entwurf, was serverseitig liegen muss und
   was im Browser bleibt — kein Auftrag über ein paar Stunden. Ebenfalls
   offen und dann fällig: die Zuordnung von `Profiles` zu `auth.users`.

4. **Kleinigkeiten**, gesammelt und vom Nutzer zurückgestellt:
   - `"von"` als sehr kurzer, generischer `exact`-Schlüssel.
   - In den Nicht-Classic-Modi steht vor dem Wurf nicht mehr, wie viele
     Startfähigkeiten es gibt.
   - Die 22 Rahmenbilder in `frames/` (1,6 MB) sind beim Runterskalieren
     ausgespart — jeder `border-image-slice` müsste neu gerechnet werden.

**Entschieden, nicht mehr offen:** Fähigkeitsnamen mischen absichtlich
Deutsch und Englisch — Eigennamen wie Snake Eyes oder Loaded Dice werden
nicht eingedeutscht. Das Würfeldesign-Feld im Setup bleibt reine
Anzeige, trägt seit V28.11.2 aber den Stil seiner Nachbarn. Die
Rundenvorbereitung und der Fähigkeits-Picker sind seit V28.11.10 bis
28.11.12 überarbeitet. Der englische Changelog ist vollständig: 769 von
770 Zeilen haben ihr Paar in `lang/en-changelog.js`; die eine Ausnahme
trägt ein `<code>`-Tag, das der Exact-Match-Weg nicht greifen kann. Die
doppelten Changelog-Bezeichnungen vor V28 bleiben unangetastet. `.git`
ist rund 100 MB (67 tote PNG-Blobs) — das kostet nur Klonzeit und wird
nicht aufgeräumt. Die 3D-Würfel sind seit V28.11.21 ganz entfernt; das
Testlabor bleibt für spätere Angriffsanimationen.

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
- **Jede Bild-URL braucht den Schlüssel `ASSET_REV`.** Wer im Skript
  `assets/…/bild.webp` ohne Schlüssel schreibt oder eine eigene Revision
  erfindet, erzeugt für den Browser eine zweite Datei: zweiter Download,
  zweite dekodierte Bitmap. Bis V28.11.28 liefen so zwölf Phasenkonstanten
  auseinander, 41 von 110 Bildern kamen unter mehreren Adressen, 890 KB
  umsonst. Seit V28.11.31 hält `verify-build.mjs` die Stellen zusammen und
  `bump-version.mjs --assets <rev>` hebt sie gemeinsam an.
- **`border-image-slice` ist nicht die sichtbare Rahmenstärke.** Der
  Slice enthält oft Füllfläche jenseits der Zierschiene. Abstände am Bild
  messen, nicht am Slice-Wert — sonst meldet man Kollisionen, die es
  nicht gibt.

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

## Wenn ein Asset fehlt

**Nie ersatzweise irgendein vorhandenes Bild nehmen und nie einen Rahmen
in CSS nachbauen.** Sieht etwas schief aus oder passt kein vorhandenes
Asset zur Aufgabe, dann **sagen, dass eines gebraucht wird** — mit Zweck,
gewünschtem Format und ungefährer Größe. Der Nutzer liefert es; das ist
für ihn schnell gemacht. Ein notdürftiger Ersatz kostet später mehr als
die Nachfrage jetzt.

Dasselbe gilt, wenn ein Auftrag nur mit einem hässlichen Kompromiss
umsetzbar wäre: erst sagen, dann bauen.

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

**Zum Online-Match** gibt es `scripts/qa/online-durchspielen.mjs`: zwei
getrennte Browser gegen das echte Projekt, von der Anmeldung bis zum
ersten synchron angezeigten Wurf. Es braucht den lokalen Server auf 8099
und ein Supabase-Bündel unter `/var/tmp/sbtest/` — beides im Kopf der
Datei beschrieben. Der Lauf legt echte Gastkonten und einen echten Raum
an und räumt danach auf.

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
