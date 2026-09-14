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
| Version | **28.12.17** |
| Branch | `main` |
| Letzte Schritte | CSS-Stapel auf 10 Dateien zusammengelegt · Changelog englisch vervollständigt · Hauptmenü, Statistik, Profile, Achievements, Spielvorbereitung und Trophy Shop überarbeitet · Fähigkeits- und Shopflächen auf proportional gekachelte Bildrahmen umgestellt · alle Bild-URLs auf einen gemeinsamen Cache-Schlüssel · Trophy-Shop-Reste bereinigt und Aufklapppfeile angeglichen · Duo- und Trio-Boss-Rush mit Pfadwahl, gespeicherten Runs und 32 Perks einschließlich temporärer Ability-Mastery · Boss-XP-Umtausch 300:100 · Zweitfund gedeckelt · Trio-Rush 15 Stufen, ab 10 ultraschwer · Boss-Rush-HUD auf die Weltregel reduziert · Zweitfund-Kopien ablehnbar und weitergebbar · Ultra-Stufen treffen härter statt länger zu dauern · Heilung gedeckelt, Maximum wächst je Stufe · Regelleiste als Kachelgitter, wächst mit dem Text · gespeicherte Runs überleben Balanceänderungen |

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
(`meta wd-build`, `<title>`, `.version-footer`), `js/01-config.js`
(`GAME_VERSION`), `sw.js` (`CACHE_VERSION`) und `version.json` — in einem
Zug mit `node scripts/bump-version.mjs <version>`. Sonst liefern
HTTP-Cache und Service Worker einmal alte Dateien, genau den
„Mischbuild", vor dem `js/19-build-integrity.js` warnt.

**Die Bildrevision gehört NICHT dazu.** Dieser Absatz behauptete das bis
zum 14.09. und widersprach damit `docs/PROJEKTREGELN.md`. Nachgesehen:
`ASSET_REV` steht auf 28.11.28, `GAME_VERSION` auf 28.12.15, und
`npm run check` ist grün — die beiden laufen absichtlich getrennt.
`bump-version.mjs` hat dafür einen eigenen Modus (`--assets <rev>`), der
`ASSET_REV` und alle `?v=` zusammen setzt. Die Regel gilt, der Satz hier
war falsch.

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
(`js/08-profiles-stats.js`), `decorateSetupAbilityResults`
(`js/28-v28-ui-rework.js`) und seit V28.12.11 in `bossBarArtwork`
(`js/06-campaign.js`) — dort erstmals **in beide Richtungen**, mit je zwei
Dehnbändern waagerecht und senkrecht.

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

## Duo-Boss-Rush seit 28.12.0

- `js/37-duo-boss-rush.js`: neun Stufen mit je drei Angeboten (leicht,
  normal, schwer), danach fest `duo_bloodmoon_empress`. Die 80 erreichbaren
  vorhandenen Duo-Encounter sind auf getrennte Stufenvorräte verteilt;
  gezogene Encounter und zufällige Loadouts bleiben beim Fortsetzen gleich.
- Die HP werden nach einem steigenden Druckbudget skaliert:
  Gesamt-HP × (1 + 0,25 je zusätzlichem Gegner). Das ist ein prüfbares
  Schwierigkeitsmaß, keine vollständige Bewertung sämtlicher Fähigkeiten.
  `validate-endgame.mjs` prüft alle Pfade, Existenz, Gegnerzahl und Anstieg.
- `saveData.bossRushRuns` ist ein neuer bereinigter Zweig für genau zwei
  Profile (sortiertes Profilpaar als Schlüssel). Gesichert werden Pfade,
  Helden, Perkzähler und Belohnungsschritte. Ein Kampf-Reload beginnt am
  gespeicherten Stufenanfang; Sieg/Niederlage löschen den offenen Run.
  Boss-XP und Kampfabschluss werden gemeinsam gespeichert.
- 32 stapelbare Perks: 6 bisherige + 19 vorgegebene + Wechselspiel,
  Proviantteilung, Kartograph, Auslese und Plünderer sowie Feinschliff und
  Meisterschaft (seit 28.12.2). Neuausrichtung sichert
  auch den zweiten Schritt mit belegten Slots; Zweitfund kopiert ohne
  rekursive Verdopplung. Der Endboss bietet keine weitere Belohnungswahl.
- Die drei Verteidigungsperks verwenden ausdrücklich alle `shield.svg`;
  zwei weitere spezifische Icons fehlen. Bildrevision bleibt 28.11.28.
- Prüfstände: `node scripts/qa/boss-rush.mjs` für Haken, Stapel, Schwellen,
  Angebote, Historie und Speicherbereinigung; `scripts/qa/boss-rush-browser.mjs`
  für echte UI-/Engine-Übergänge, Reloads und zehn Stufen mit Test-Siegen
  (keine vollständig ausgespielten Zufallskämpfe). Browserlauf in DE/EN
  bei 320/360/390/412/1280 px; keine JS-Fehler/404, im offenen Pfaddialog
  0 DOM-Mutationen/s. `npm run check` grün. Keine zusätzliche App-Abhängigkeit.

---

## Trio-Boss-Rush seit 28.12.1

- `js/44-trio-boss-rush.js` portiert den Duo-Ablauf mit derselben Schnittstelle
  und allen 32 Perks. `window.WDBossRush` in `js/06-campaign.js` verteilt
  die Motorhaken nach Trio-/Duo-Modus; auf den Karten nach Rückkehrziel,
  damit Start und Buttonzustand auch vor dem Kampf funktionieren.
- Seit 28.12.4 haben neue Trio-Runs 15 Stufen. Quelle bleiben alle 60
  vorhandenen Trio-Encounter aus vier Welten mit vollständigen Gegnergruppen.
  Normale Encounter verteilen sich auf zwölf getrennte Stufenvorräte;
  Boss-/Miniboss-Angebote auf Stufe 5 und 10. Stufe 15 ist fest
  `trio_helix_apex` mit seinen drei Seals. Kein Encounter wiederholt sich.
- Stufe 1–9 behalten ihre Druckbudgets (45 bis 177). Ultraschwer ab Stufe 10.
  Die Budgets standen hier bis 14.09. als 280 / 350 / 440 / 550 / 690 / 870 —
  **das war der Stand vor 28.12.8.** Heute gilt `STAGES`
  (`js/44-trio-boss-rush.js:9`): 220 / 255 / 290 / 335 / 385 / 560, dazu die
  Untergrenze `FINAL_MIN_HP` von 100 HP je Gegner auf Stufe 15.
  Phasenheilung 12 / 16 / 20 / 24 / 28 / 32 HP.
  Druck = Gesamt-HP × (1 + 0,25 je zusätzlichem Gegner); auch der leichteste
  Zehner-Pfad liegt mehr als 35 % über dem schwersten Neuner-Pfad.
  Loadouts, Perks, Kopiergrenzen, Preise und die Duo-Kurve bleiben unverändert.
- `stageCount:15` kennzeichnet neue Trio-Runs. Alte Saves ohne Kennzeichen
  werden als `stageCount:10` geladen und behalten alte Pfadpools, HP, Beute
  und Finale. Alle Anzeigen, Speichergrenzen und Zweitfund-Fristen verwenden
  die jeweilige Run-Länge. Neue Runs werden erst auf Stufe 15 abgeschlossen.
- `saveData.trioBossRushRuns` ist separat nach sortierten drei Profil-IDs
  indiziert. Derselbe Bereiniger wie Duo mit Teamgröße 3.
  `profile.campaign.bossRushXp` bleibt für beide Modi gemeinsam. Seit 28.12.2
  ist er auf Nutzerwunsch ein ausgebbares Guthaben statt Lebenszeit-Zähler: Der
  Mastery-Button zieht je Klick 300 ab und schreibt 100 XP im ausgewählten
  Profil/Modus gut (auch `lifetimeXp` +100). Rest bleibt, unter 300 gesperrt.
  Keine separate Verbrauchsbuchung und kein neuer Speicherschlüssel.
  `scripts/qa/boss-xp-conversion.mjs` prüft alle drei Moduskonten, Profilwechsel,
  Reload, Doppelklickschutz, Guthaben 0/299/300/602, unveränderte L2-Daten,
  DE/EN in fünf Breiten und 0 DOM-Mutationen im offenen Mastery-Fenster.
- Feldlazarett heilt alle drei. **Zweitfund, gedeckelt seit 28.12.3, entschärft seit 28.12.6:** er
  läuft zwei Stufen und gibt je Stufe höchstens eine Belohnung an einen
  Mitspieler ab, ein erneuter Fund verlängert um zwei Stufen. Vorher war
  die Menge Stapel × Partnerzahl, und drei Faktoren multiplizierten sich
  ungebremst — im Trio sammelte ein Held so bis zu 52 statt zehn
  Belohnungen (im Spieltest: 68 Schaden auf einen 1er, 150 HP). Gemessen
  am echten Modul liegt es jetzt bei 10 ohne, 12/14/16 bei ein bis drei
  Funden, in beiden Modi gleich. Seit 28.12.6 laeuft er drei statt zwei
  Stufen (gemessen 13/16/16), weil er sich im Spieltest zu schwach anfuehlte,
  und eine Kopie ist ein Angebot statt einer Pflicht: **Ablehnen** gibt es
  immer, **Weitergeben** nur im Trio und nur an den dritten Helden. Nie
  zurueck an den Geber und nie ein zweites Mal - sonst liefe die Belohnung
  im Kreis. Anlass war, dass eine Zweitfund-Kopie dem Partner eine
  Faehigkeit aufzwang, die er nicht wollte. Wer ihn jede Stufe nimmt, bleibt bei 10 —
  es wird ja nie eine andere Belohnung kopiert. Kopien erzeugen weiterhin
  keine Kopien; die zweite fällige Kopie eines Helden rückt eine Stufe nach,
  statt verloren zu gehen. Wechselspiel gilt nach jedem Mitspieler,
  solange alle drei leben; Proviantteilung berücksichtigt beide Empfänger.
  Diese Anpassungen stehen in den deutschen/englischen Perkbeschreibungen.
- **Überheilung im Rush — gedeckelt, aber nicht überall.** *Diese Aussage
  stand bis 14.09. als „verschwunden" hier und war zu weit gegriffen; der
  Codex-Durchgang hat zwei offene Wege gefunden, siehe Offen 7.* Der Spieltest
  zeigte Helden mit 347–370 HP bei einem Maximum von 27–39, also dem Neun-
  bis Zwölffachen. Zwei Ursachen: `applyHealingToPlayer`
  (`js/12-battle-ui.js`) lässt Kampagnenhelden seit V24.2 unbegrenzt
  überheilen — **und die Rush-Perks liefen gar nicht dort durch.** `healHero`
  schrieb direkt auf `hero.hp`, ebenso die Sofortheilungen in `grant`
  (Verschnaufpause, Regeneration, Blutpakt) und die Proviantteilung. Jetzt
  gehen alle über `heroCap(hero)` und enden am Maximum; der Motor-Deckel
  greift zusätzlich, aber nur im Rush — die normale Kampagne behält ihren
  Overheal. Als Ausgleich wächst `hero.maxHp` je Stufe um
  `MAX_HP_PER_STAGE` (5), im Trio also von 25 auf 95. Der Zuwachs addiert
  auf das vorhandene Maximum, ein Mastery-HP-Bonus trägt also mit.
  **Achtung: diesen Ausgleich gibt es nur im Trio.** Im Duo wurde der
  Deckel mitgespiegelt, das Wachstum nicht — siehe Offen 8.
  **Nebenwirkung, die damit verschwindet:** Aufopferung und
  Ausweichinstinkt vergleichen HP gegen Maximum und waren bei einem
  Verhältnis von 11 dauerhaft tot.

- **Gefallene Helden kehren mit 1 HP zurück** (28.12.9), Zweiter Atem gibt
  weiterhin 15. Ohne das wäre ein Held seit dem Heilungsdeckel für den
  restlichen Lauf verloren.

- **Ultra-Stufen treffen seit 28.12.7 härter.** Nach fünf Stunden Spieltest:
  ab Stufe 10 war es „nur noch Grind ohne Gefahr" — ein Held endete mit über
  200 HP. Grund war strukturell: `optionFor` skaliert nur Gegner-**HP**, und
  `campaignOutgoingDamageModifier` kennt die Stufe gar nicht. Heldenschaden
  und Heilung wachsen mit jeder Belohnung, die Bedrohung blieb konstant.
  Jetzt gibt `enemyHitBonus` je Ultra-Stufe +1 Schaden **pro Würfeltreffer**,
  gehakt in `damagePerAttackHit` (`js/12-battle-ui.js:494`) — der Bonus
  wächst also mit der Trefferzahl mit. Seit 28.12.9 sind es **+2 je Stufe ab Stufe 11**, gemessen mit Auge 4:
  je Treffer 4 bis Stufe 10, 14 auf Stufe 15; bei drei Treffern 12 gegen 42.
  Dazu ist in den Ultra-Stufen die vorhandene **Eskalation** immer aktiv
  (`updateEncounterEscalation`, +1 nach vier und +2 nach sieben
  Gegnerzügen). Das **Finale** hat seit 28.12.9 eine Untergrenze von 100 HP
  je Gegner (`FINAL_MIN_HP`): Helix Apex 145, jedes Seal 100 statt 46,
  Druck 779 statt 445. Die Untergrenze gilt ausdrücklich nur für das
  15-Stufen-Finale — sonst werden gespeicherte Zehner-Läufe ungültig, was
  der Prüfstand mit dem echten Spielstand-Fixture auch gefangen hat. Heldenschaden
  bleibt unverändert. Der Duo-Rush hat keine Ultra-Phase, sein
  `enemyHitBonus` gibt immer 0 und existiert nur für die gleiche
  Schnittstelle. **Im Gegenzug sank die HP-Kurve** (28.12.8): die
  Ultra-Stufen steigen mit 1,15× statt 1,25× und beginnen mit 1,25× statt
  1,58×, Stufe 15 hat 445 statt 870 Druckbudget (seit 28.12.9 560, plus Untergrenze). Lang *und* gefährlich wäre
  zu viel gewesen. Der Prüfstand verlangte bis dahin einen HP-Sprung von
  mindestens 1,35× ab Stufe 10 — diese Zusicherung kodierte die alte
  Annahme „Ultra heißt mehr HP" und ist durch eine ersetzt, die den
  Schadensaufschlag prüft und die HP-Kurve nach oben deckelt.

- Gleiche Bildrahmen wie Duo, vorhandenes `trio.svg` für Team-Perks;
  die drei Verteidigungsperks bleiben bei `shield.svg`.
- Prüfung: `scripts/qa/trio-boss-rush.mjs` und
  `scripts/qa/trio-boss-rush-browser.mjs`; zusätzlich die bestehenden
  Duo-Prüfstände. 15 Trio-Stufen mit Test-Siegen, Reloads auf Stufe 10/15,
  ein Zehner-Save aus 28.12.3, alle drei Helden,
  Moduswechsel, normale Trio-Kampagne und DE/EN bei fünf Bildschirmbreiten.
  `validate-endgame.mjs` prüft beide Module und vollständige Trio-Gruppen.
  Alle Prüfläufe grün, keine JS-Fehler/404; im Pfaddialog 0 DOM-Mutationen/s.
- **Seit 14.09. dazu `scripts/qa/rush-run-haltbarkeit.mjs`**: ein Run unter
  einer verschobenen Kurve muss den Start überleben, ein manipulierter
  weiterhin abgelehnt werden. Neun Zusicherungen, Duo und Trio.
  **Zweimal am eigenen Messfehler vorbeigelaufen** — die Lehre steht unter
  „Fallen".
  50 vollständige Pfadziehungen ohne Wiederholung; Ultra-Angebote zusätzlich
  bei allen fünf Breiten auf DE/EN geprüft. Keine vollständige Balance-Simulation:
  Kämpfe werden im Browser-Prüfstand durch Test-Siege abgeschlossen.
  Der folgende mobile Altfehler ist davon ausdrücklich nicht abgedeckt.


- Lauf-Mastery seit 28.12.2 gilt identisch in Duo/Trio: `refinement` (selten,
  `xp-star.svg`) auf L1, `mastery` (episch, `prestige.svg`) auf L2, auch 0→2.
  Angebote und Slotlisten berücksichtigen max(Profilstufe, Lauf-Override).
  Die Zielwahl zeigt die vorhandenen Upgrade-Namen und -Texte, bei 0→2 beide.
  `WDMastery.abilityUpgrade(id,level)` liefert eingefrorene Lesekopien aus
  ABILITY_SHEET bzw. den beiden Standalone-Einträgen (7/22).
- `run.abilityLevelOverrides[profileId][abilityId]` wird mit dem Run bereinigt
  gespeichert. Der zweite Auswahl-Schritt bleibt über Reload gesperrt;
  Neuausrichtung lässt alte Einträge liegen, unequippt/bei Laufende wirken
  sie nicht. Wirkungslose Zweitfund-Kopien werden übersprungen, veraltete
  reguläre Angebote unter Beibehaltung der Seltenheitsgarantie neu gezogen.
- Einziger zusätzlicher Motorzugriff: `abilityLevelForPlayer` nimmt das
  Maximum aus Profil und `WDBossRush.abilityLevelOverride`. L2-Tracking und
  Mastery-Laden bleiben profilbasiert; Offen 5 (HP/Schaden) ist unverändert.
- Alle vier Rush-Prüfstände nutzen ergänzende Mastery-Verträge unter
  `scripts/qa/rush-mastery*-contract.mjs`: 32 identische Perks, wirkungslose
  Angebote, Speicherbereinigung, Reload vor/nach Zielwahl, Doppelklickschutz,
  0→2, weggetauschte Fähigkeiten, Profil/L2 vor und nach Run unverändert.
  Alle 48 Upgrade-Texte haben exakte englische Paare. Browser: DE/EN bei
  320/360/390/412/1280 px, vorhandenes Prestige-Symbol vollständig sichtbar.

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

   **Offen ist davon nur noch der große Hebel:** direkt nach
   `executeOnlineAction` einen vorläufigen Stand senden, damit der Gast
   *parallel* zum Host animiert, danach den gesetzten Stand. Das nimmt
   die Animationsdauer aus der Wartezeit. Echter Eingriff ins
   Synchronisationsprotokoll — `seq`-Reihenfolge und `actionPending`
   müssen mit.

   Die zwei kleinen Hebel sind seit V28.11.32 erledigt: der Gast
   überspringt Realtime-Meldungen zu seiner **eigenen** Aktionszeile, und
   ein Ereignis, das während eines laufenden Abrufs eintrifft, wird direkt
   nachgeholt statt noch einmal über den 45-ms-Debounce zu gehen. Gemessen
   mit `scripts/qa/raum-abo-zeiten.mjs` bei 180 ms Abfragedauer: der
   Verlust gegenüber dem Idealfall fiel von durchschnittlich 41 ms
   (Spitze 167 ms) auf 1 ms, und je Gastzug wird ein Schnappschuss statt
   zwei geholt. Der Gewinn liegt genau im Fenster 45–180 ms nach der
   Gasteingabe — also dort, wohin der große Hebel die Antwortzeiten
   verschiebt. Die beiden Änderungen werden dadurch **wertvoller**, nicht
   überflüssig.

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

2. **`dd_touch_room` ist eingespielt.** Erledigt am 14.09.: der Nutzer hat
   `20260903120000_dd_room_idle_expiry.sql` im Supabase-SQL-Editor
   ausgeführt („Success. No rows returned"). Damit laufen Räume nach 45
   Minuten Untätigkeit in der Lobby bzw. 2 Stunden im laufenden Match ab
   statt nach festen 6 Stunden mitten im Spiel, und der Spielstand wird
   nicht mehr doppelt geschrieben. **Noch nicht gegengeprüft**, ob die
   Funktion aus dem Spiel heraus wie erwartet antwortet — beim nächsten
   Online-Durchlauf mitprüfen.

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

4. **Die Regelleiste trägt jetzt beliebig viele Textzeilen.** Erledigt in
   V28.12.11. Der Rahmen kommt nicht mehr als gedehnter Hintergrund,
   sondern als Kachelgitter aus 5 × 5 `<svg viewBox>`-Ausschnitten —
   `bossBarArtwork` in `js/06-campaign.js`, Raster in
   `src/styles/legacy/37-abschluss.css`.

   **Am Bild gemessen, nicht geschätzt:** Motiv liegt bei y 37..130 von
   171 — das obere und untere Drittel der Datei ist leer, deshalb wirkte
   die Leiste als `100% 100%` so flach. Schnitte in ruhigen Spalten
   (x 0/88/190/322/424/512: Endornamente 88 px, Mittelkrone 132 px) und
   ruhigen Zeilen (y 37/70/78/96/102/130). Die beiden Dehnbänder
   (y 70..78 und 96..102) liegen bewusst **über und unter** den seitlichen
   Edelsteinen (y 78..96), sonst würden die verschmieren; dadurch wächst
   die Leiste symmetrisch. Alle Maße hängen an `--dd-boss-bar-scale`
   (0,62), damit die Proportionsbedingung von oben eingehalten bleibt.

   **Die Falle dabei:** fünf Rasterzeilen im CSS brauchen *sechs* Grenzen
   im JS. Mit fünf Grenzen blieb die letzte Zeile leer und die untere
   Rahmenleiste rutschte in den Text — im Messskript sofort sichtbar
   (20 statt 25 Kacheln), mit bloßem Auge kaum.

   Gemessen mit einem Wegwerfskript gegen den echten Duo-Rush bei
   320/390/430 px: Leiste wächst 57,7 → 94,7 px, kein waagerechter
   Überlauf, keine Seitenfehler. `renderAll()` ruft die Leiste bei jedem
   Wurf auf, deshalb bleibt das Gitter stehen und nur der Text wird
   ersetzt.

5. **Mastery greift im Boss Rush weiter, als hier stand.** Korrigiert am
   14.09. — der alte Absatz behauptete, Mastery sei durch die
   Kampagnenkartenregel „erst ab Welt 2" halb stumm. **Für Trio ist das
   falsch:** `standardEligible` (`js/23-mastery.js:190`) endet mit
   `return mode==="trio"`, gibt Standard-Mastery also immer frei. Auf
   Stufe 1 reproduziert: HP-Level 3 ergibt +6 HP, der Schadensbonus
   wartet auf nichts. Für **Duo** gilt die Einschränkung weiter
   (`:186`, Welt 1 ab Level 10). Offen bleibt allein die
   Gestaltungsfrage: soll der Boss Rush Mastery ganz, gar nicht oder
   wie heute je Modus verschieden tragen?

   **Eine Teilfrage ist am 14.09. entschieden und steht jetzt in
   `docs/PROJEKTREGELN.md`:** geliehene Mastery aus den Rush-Perks
   „Feinschliff" und „Meisterschaft" schaltet **nichts Dauerhaftes** frei.
   `l2TrackingContext` liest deshalb `abilityLevel` und nicht
   `abilityLevelForPlayer` — kein Versehen, nicht angleichen. Anlass war
   ein gemeldeter Fehler, der keiner war.

6. **Alte Runs überleben eine Balanceänderung — erledigt in V28.12.12.**
   `validStored` verglich jedes gespeicherte Angebot per `JSON.stringify`
   mit einem frisch gerechneten `optionFor`, also mit der **heutigen**
   Kurve; bei Abweichung löschte `start()` den Run ohne Rückfrage.
   V28.12.9 hatte das ausgelöst (`STAGES[14]` 445 → 560, dazu
   `FINAL_MIN_HP`).

   Ersetzt durch `plausibleOption` in beiden Modulen: geprüft wird das
   **Kurvenunabhängige** — Encounter, Schwierigkeit, Aufstellung samt
   Namen und Reihenfolge, `abilityCount`, `phaseAbilityCount`, das Label
   und die Stimmigkeit von `pressure` zur HP-Summe. Für die HP bleibt ein
   Band von einem Drittel bis zum Dreifachen des heutigen Erwartungswerts.

   **Das ist bewusst schwächer als Gleichheit, und das gehört gesagt:**
   wer die Gegner auf die Hälfte setzt, kommt jetzt durch. Der
   Vollvergleich war aber nie eine Sperre gegen Schummeln — `saveData`
   liegt im Klartext im `localStorage`, und zur Laufzeit lässt sich
   ohnehin alles ändern —, sondern nur eine gegen kaputte Daten. Kommt
   einmal eine öffentliche Bestenliste (Offen 3), braucht es Signaturen,
   kein engeres Band.

   **Noch offen daran:** ein Run, der die Prüfung wirklich nicht besteht,
   wird weiterhin **ohne Rückfrage** gelöscht (`js/44:899`, `js/37:839`).
   Das ist jetzt ein seltener Fall, aber immer noch die falsche Geste.

7. **Ablehnen, Weitergeben und der Speicher — erledigt in V28.12.13.**
   Fünf Lücken, alle aus eigenen Änderungen V28.12.7 bis .9, alle mit
   `scripts/qa/rush-regeln.mjs` vorher rot und nachher grün:
   `passCopy` prüft jetzt, ob das Ziel in dieser Stufe schon eine Kopie hat,
   und schiebt sonst nach `deferredRewards` (auf der letzten Stufe verfällt
   sie, wie bei jeder überzähligen Kopie); der neue Helfer `restWasTaken`
   zählt nur genommene Belohnungen, nicht abgelehnte oder weitergegebene;
   `copyPartner` zählt ebenso nur behaltene Kopien; `startingVitals` deckelt
   `hero.hp` auf `hero.maxHp`, und Zweiter Atem liegt unter demselben Deckel;
   `js/04-save.js` kappt beim Laden ebenfalls.

8. **Duo-Maximum wächst je Stufe — erledigt in V28.12.13.**
   `MAX_HP_PER_STAGE` gibt es jetzt auch im Duo-Modul, mit demselben Schritt
   im `startStage` wie im Trio. End-to-end gemessen, nicht am Dateitext:
   ein erster Entwurf des Prüfstands suchte die Zuwachszeile per Regex in der
   Quelle — das prüft die Schreibweise, nicht das Verhalten.

9. **Der Deutsch-Erkenner — erledigt in V28.12.16.** `germanHints`
   (`js/00-i18n.js`) listete `die` als deutschen Hinweis, in einem
   Würfelspiel. Am Sprachpaket nachgemessen mit
   `scripts/qa/deutsch-erkenner.mjs`: **14** fertig übersetzte englische
   Texte schlugen an und wurden durch den generischen Ersatztext
   überschrieben, und **kein einziger** deutscher Text hängt allein an
   diesem Wort. Streichen kostete also nichts und nahm alle 14 mit.

   **Erst messen, dann streichen:** ein erster Durchgang meldete 135
   Fehlalarme. Der Sammler lief blind über `Object.values` — `exact` ist
   ein Objekt deutsch→englisch, `replacements` aber eine **Liste von
   Paaren**, wodurch die deutschen Quellwörter als englische Zieltexte
   mitgezählt wurden. Wer hier ein Wort ergänzt, lässt das Skript laufen.

10. **Verschachteltes `tr` — erledigt in V28.12.16.** `tr(\`… ${tr("Basis-Boss-XP")}\`)`
    übersetzte das innere Stück zuerst; danach passte die zusammengesetzte
    Zeile auf kein Muster mehr, und Wortersetzung greift bei der Länge
    nicht. Dazu erwarteten die Muster in `lang/en-campaign.js` noch
    „Boss XP je Profil", während der Code „Basis-Boss-XP" baut — zwei
    Fehler übereinander. Beides behoben, geprüft mit
    `scripts/qa/rush-abschluss-sprache.mjs`.

    **Die Bauart-Regel dahinter:** ein `tr` innerhalb eines Textes, der
    selbst per Muster übersetzt wird, zerstört immer den Mustertreffer.
    Entweder die ganze Zeile durch ein `tr`, oder alle Teile einzeln —
    nie gemischt.

    **Und eine Falle bei der Prüfung:** `germanHints` taugt hier *nicht*
    als Kriterium. „Besiegt: 0 / 10 · +0 Base boss XP behalten" enthält
    weder ein Wort aus der Liste noch einen Umlaut. Der erste Entwurf des
    Prüfstands war deshalb grün, obwohl der Fehler offen dastand. Geprüft
    wird jetzt positiv gegen den erwarteten englischen Satz.

11. **Toter Code — erledigt in V28.12.16.** `livePhaseValue` und
    `choiceIcon` waren in beiden Rush-Modulen definiert und nirgends
    aufgerufen; die Modulvariable `rewardTurn` wurde nur beschrieben.
    Alles entfernt. Das feste `/10` im Trio-Kampflog
    (`js/06-campaign.js`) liest jetzt `window.WDBossRush.stageCount()` —
    dafür exportieren beide Module neu ein `stageCount`.

12. **Der Regelwiderspruch — aufgelöst am 14.09.** `docs/PROJEKTREGELN.md`
    hatte recht: Bildrevision und App-Version laufen getrennt. Nachweis:
    `ASSET_REV` steht auf 28.11.28, `GAME_VERSION` auf 28.12.16, und
    `npm run check` ist grün. Der Absatz oben in dieser Datei behauptete
    das Gegenteil und ist korrigiert.

13. **Bonus-Fähigkeitsknöpfe — erledigt in V28.12.17.** Sobald ein
    Bonusknopf erschien, brach sein Text um und das Knopffeld sprang.
    Bei 360/390/430 px nachgemessen, und die Ursache war nicht die Textlänge
    allein: ab 390 px kippt `.controls` durch `flex:1 1 140px` auf **zwei
    Spalten**, jeder Knopf ist dann rund 152 px breit — bei 42 px Polsterung
    je Seite bleiben **76 px** für den Text. Selbst „Blutpreis" braucht
    100 px. Basis jetzt 200 px (auf dem Telefon also einspaltig),
    Seitenpolster 12 px, Texte auf den reinen Fähigkeitsnamen gekürzt.

    **Das Symbol kommt nicht aus dem Text.** `js/36-emoji-sprite-pass.js`
    hängt es über `ID_ICONS` an die **Element-ID** — ohne Emoji im Text.
    Ein erster Versuch setzte zusätzlich ein eigenes Icon über
    `battleAction`; die Duplikatsperre dort prüft nur
    `:scope > .dd-emoji-sprite` und sah es nicht, also standen zwei Symbole
    im Knopf. Wer einen Knopf mit Symbol braucht: ID in `ID_ICONS`
    eintragen, Text ohne Emoji lassen.

    **`white-space:nowrap` ist hier keine Lösung** — es unterdrückt nur den
    Umbruch, der Text läuft dann aus dem Knopf. Im Prüfstand deshalb Umbruch
    *und* Überlauf messen (Textbreite gegen Innenbreite).

14. **Kleinigkeiten** — die Liste ist leer.

   **Die Rahmenbilder wurden am 14.09. gemessen und bleiben, wie sie
   sind.** Der Punkt nahm an, die 22 Dateien (1,52 MB) seien zu groß. Im
   Browser bei 412 und 1280 px nachgemessen, gegen den Bedarf für eine
   scharfe Darstellung auf 2×-Displays:

   | Bild | Quelle | gezeichnet | für 2× nötig | Reserve breit |
   |---|---|---|---|---|
   | `player-card-combat` | 1200×704 | 826×102 | 1652×204 | 0,73× |
   | `navy-tile` | 768×768 | 728×539 | 1456×1078 | 0,53× |
   | `panel-large` | 768×1024 | 728×1785 | 1456×3570 | 0,53× |
   | `modal-popup` | 768×960 | 520×445 | 1040×890 | 0,74× |
   | `slim-card` | 1024×512 | 872×62 | 1744×124 | 0,59× |

   **Kein einziges Bild hat in beiden Achsen Reserve.** Werte unter 1,0
   heißen: die Quelle ist bereits kleiner als nötig. Runterskalieren würde
   die Rahmen weicher machen. Überschuss gibt es nur in der Höhe (bis
   4,1× bei `slim-card`), und der ließe sich nur durch neu gezeichnete,
   flachere Bilder ernten — verboten nach Projektregel und würde jede
   Slice-Rechnung umwerfen.

   Wer es doch angehen will: der einzige saubere Hebel wären **kleinere
   Varianten für schmale Fenster** über `image-set()` oder Media Queries.
   Das kostet 22 zusätzliche Dateien in der Pflege und bringt nur auf
   Telefonen etwas.

   **Zwei davon sind am 14.09. geschlossen worden**, beide nach Prüfung
   gegenstandslos: Der Schlüssel `"von"` ist ungefährlich, weil die
   Übersetzung nur ganze Textknoten trifft (`js/00-i18n.js:24-35`) und
   nicht als Teilzeichenkette greift. Und die Anzahl der Startfähigkeiten
   **steht** in allen vier lokalen Modi sichtbar in `localModeInfo`, im
   Browser geprüft.

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

- **Es gibt nur einen Meldekanal, und der ist schmal.** `#log` steht in
  `index.html:810` fest auf `class="hidden"` — der Kampflog ist dauerhaft
  unsichtbar, `addLog` schreibt ins Leere. Alles, was der Spieler mitbekommen
  soll, muss über `queueEventPopup` oder den Achievement-Toast gehen. Wer
  eine Meldung nur loggt, hat sie nicht gemeldet. Am 14.09. kam dazu, dass
  der Popup selbst auf z-index 10020 lag und damit unter allen sieben
  Kampf-Overlays (10040–10055): eine L2-Freischaltung verschwand hinter dem
  Counterattack-Overlay, und der Spieler suchte den Fehler in der Mastery.
  Seit V28.12.14 liegt er auf 11900, unter dem Achievement-Toast (12000).
  Dasselbe galt für Schadens- und Heilzahlen (`#damageFx`, `#healFx`) und
  die beiden Vollbild-Blitze (`#damageTint`, `#healTint`), die auf 9996 bis
  9999 lagen — verdeckt also ausgerechnet dann, wenn Counterattack oder
  Insurance den Schaden gerade verändern. Seit V28.12.15 im Band 11890 bis
  11893. **Die Rangfolge ist jetzt eine Entscheidung, kein Zufall:**
  Zahlen < Popup (11900) < Achievement-Toast (12000), alle mit
  `pointer-events:none`. Wer eine neue Meldeschicht einzieht, ordnet sie
  dort ein. Nicht gehoben wurde `.heal-pop` in der Spielerkarte — sie steckt
  im Stapelkontext der Karte; `#healFx` trägt dieselbe Zahl.
  Geprüft mit `scripts/qa/popup-schichten.mjs` (23 Zusicherungen).

- **Zufällige Belohnungen machen Messungen unzuverlässig.** Der Prüfstand
  `rush-regeln.mjs` maß den Max-HP-Zuwachs je Stufe über einen ganzen
  Stufenwechsel hinweg — und die Belohnungsrunde dazwischen bietet
  `constitution` (+10 Max-HP) und `gamble` (−5). Je nach Zufallsangebot kam
  +5, +15 oder 0 heraus, der Test meldete sporadisch rot bei korrektem Code.
  Gemessen wird jetzt **eng um den Auslöser herum** (der Zuwachs passiert in
  `startStage`, also beim Pfadklick), nicht über eine Phase mit Zufall darin.

- **Ein Prüffall, der grün wird, obwohl er rot sein müsste, ist kaputt —
  nicht bestanden.** Am 14.09. zweimal im selben Skript passiert:
  (a) der Testfall mutierte `run.paths[10..14]`, aber `ensurePaths` legt nur
  den Vorrat der **aktuellen** Stufe an — `run.paths` hatte genau einen
  Eintrag, die Mutation ging ins Leere und der Fehlerfall lief grün durch;
  (b) „der Run liegt noch im Speicher" war grün, weil `newRun()` nach dem
  Löschen sofort einen **anderen** Run unter demselben Schlüssel anlegt.
  Beides fiel nur auf, weil das Ergebnis unplausibel war. Gegenmittel: jeder
  Fall, der scheitern soll, wird **einmal gegen den ungepatchten Stand
  laufen gelassen** und muss dort scheitern; und ein Testfall zählt, was er
  verändert hat (`assert(beruehrt>0)`), statt es anzunehmen.

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

**Falle, die am 14.09. Zeit gekostet hat:** `abilityName` in beiden
Rush-Modulen griff fest ins **englische** Paket
(`window.WD_LANG_PACKS?.en?.exact?.[name]`), unabhängig von der
eingestellten Sprache. Im deutschen Spiel stand dadurch „Head Start" statt
„Angriffsvorsprung" — in der Slotauswahl von Neuausrichtung, Feinschliff
und Meisterschaft, bei den Fähigkeitsangeboten und beim Kundschafter.
Jetzt über `tr()`. **Wer einen Namen aus einer Datentabelle anzeigt, muss
ihn übersetzen, nicht nachschlagen.**

Ebenfalls dort gelernt: der Übersetzer überspringt die Wortersetzung bei
Texten über 24 Zeichen oder mit Satzzeichen (`js/00-i18n.js`). Das war
**nicht** die Ursache des obigen Fehlers — im Browser geprüft und
widerlegt —, ist aber eine echte Grenze für zusammengesetzte Zeilen.

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
