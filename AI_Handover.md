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
| Version | **28.14.8** |
| Branch | `main` |
| Aktueller Schritt | V28.14.6: Phase 2, Schritt 3/6 – DOM-freier Reducer für die Angriffsphase mit Zielwahl, Angriffsfähigkeiten, Schaden, Ausscheiden, Counterattack und festem Node-Prüfstand; der Browserkampf bleibt unverändert. High Stakes, Fähigkeitsdrafts und Rundenwechsel folgen in Schritt 4; nach diesem Release auf „Weiter“ warten. |
| Letzte Schritte | V28.14.8: vierter Shop-Reiter „Daily" als Attrappe nach dem Mockup der Lieferung (Panel-Hintergrund `backgrounds/daily-shop.webp`, 20 Effektbilder unter `shop/daily/effects/`, 2×2-Raster mit Tagesrotation, Preisschild, gesperrter Goldknopf; Reiter-Emblem `tabs/tab-daily.webp` fehlt noch, bis dahin das Angriffs-Icon) · V28.14.4, V28.14.5 und V28.14.7: Angriffseffekte „Invasion", „Missile Attack", „Blitzeinschlag" und „Katzenangriff" (viertes und fünftes Drop-in 17.09.) nur in der Testumgebung, damit neun Labor-Effekte; V28.14.7 stellt V28.14.5 wieder her, das ein Rebase von V28.14.6 überschrieben hatte · V28.14.2: Angriffseffekte „Konfettibombe" und „Polygon" (drittes Drop-in 17.09.) nur in der Testumgebung, damit fünf Labor-Effekte · V28.14.1: Angriffseffekte „Solarsplash" und „Trigonbomb" (zweites Drop-in 17.09.) nur in der Testumgebung wie Seelenbruch; Funktionsinventar aus dem Engine-Entwurf nach `docs/SERVER-ENGINE-INVENTAR.md` ausgelagert, damit Codex je Schritt nur die betroffenen Funktionen liest · V28.14.0: Phase 2, Schritt 1/6 – eine gemeinsame Quelle für Fähigkeiten und Modusdaten, serialisierbarer Duell-State mit strikter Validierung; Kampfregeln bleiben im bisherigen Browserpfad. Eigenes Release je Schritt; nach diesem Release auf „Weiter“ warten. V28.13.3: Angriffseffekt „Seelenbruch" (Drop-in-Lieferung 17.09.) nur in der Testumgebung, Stil mit Flag `labor:true` in ATTACK_FX_STYLES, Lab-Renderer in js/21, Kern-Renderer js/18 und Shop unberührt · V28.13.2: Entwurf und Vorarbeit zur gemeinsamen Kampf-Engine; WDRng, RAM-Aktionsprotokoll und Bot-Replay, keine Serverumstellung. V28.13.1: Währungserklärung im Navy-Kachelrahmen mit Luft nach oben; Duellmarken online: private Tische 0 (Farmschutz über Haupt- und Gastprofil), zufälliges Match gegen Fremde 60/20 definiert und als „bald" in der Tabelle, gebucht erst mit dem Modus · V28.13.0 Meilenstein: Shop, Kisten und globale Statistik vollständig; Zwei-Geräte-Spieltest der Online-Statistik am 17.09. vom Nutzer bestätigt · Nachbesserung globale Statistik (V28.12.66): Winrate in ganzen Prozent, Spaltenköpfe entzerrt, Filter in zwei Zeilen (Häkchen, dann Auswahlraster), versteckter nativer Select fest verankert · Globale Statistik fertig: öffentliche Ansicht mit Filtern und Leveln, Quittungen sieben Tage, abgewiesene Meldungen reparierbar; fünfte Migration live (30 Tage/20 Fehler je Match), Browser- und Datenbanktests grün; Zwei-Geräte-Spieltest am 17.09. bestätigt. Statistik-Nacharbeit: Fehler dürfen Rundenstart und Matchende nicht abbrechen; vierte Migration mit privater capture_errors-Tabelle live eingespielt und über Publish-RPC geprüft, Regressionstests und Installationshinweis · CSS-Stapel auf 10 Dateien zusammengelegt · Changelog englisch vervollständigt · Hauptmenü, Statistik, Profile, Achievements, Spielvorbereitung und Trophy Shop überarbeitet · Fähigkeits- und Shopflächen auf proportional gekachelte Bildrahmen umgestellt · alle Bild-URLs auf einen gemeinsamen Cache-Schlüssel · Trophy-Shop-Reste bereinigt und Aufklapppfeile angeglichen · Duo- und Trio-Boss-Rush mit Pfadwahl, gespeicherten Runs und 32 Perks einschließlich temporärer Ability-Mastery · Boss-XP-Umtausch 300:100 · Zweitfund gedeckelt · Trio-Rush 15 Stufen, ab 10 ultraschwer · Boss-Rush-HUD auf die Weltregel reduziert · Zweitfund-Kopien ablehnbar und weitergebbar · Ultra-Stufen treffen härter statt länger zu dauern · Heilung gedeckelt, Maximum wächst je Stufe · Regelleiste als Kachelgitter, wächst mit dem Text · gespeicherte Runs überleben Balanceänderungen · Meldeschichten über den Kampf-Overlays geordnet · großer Spezialwürfel dreht sich als echter 3D-Würfel wie der normale und füllt seinen Rahmen · Kampflog, Infos-Blatt und Weltregel hinter einem Knopf, Knopfleiste gekürzt und beruhigt · Kartentexte aus den gemalten Rahmen geholt · fünf neue Würfeldesigns in der Testumgebung · Matchbar auf schmalen Telefonen wieder einzeilig · fünf Würfeldesigns mit fertigem Artwork und nachgemessenem Augenraster · Live-Online-Prüfstand repariert und um eine Latenzmessung erweitert · Common-Satz mit zehn Würfeldesigns vollständig · Online-Wurfwerte vorgezogen, live nachgemessen · Wurfanimation beim Gast wiederhergestellt · sieben Rare-Würfeldesigns · fünf Würfeleffekte mit Regler in der Testumgebung · Kistentest im Hauptmenü: Kistenöffnung im Stil von Clash Royale ohne Belohnung · Kistenbilder nach `docs/KISTEN-BRIEF.md` eingebaut, zweite Lieferung gemalt im Würfelstil (35 WebP, Bildrevision 28.12.48) · Spieltest 16.09.: Gast kommt nach Host-Ausstieg ins Online-Menü zurück, späte Raumantworten werden verworfen, Erstupload mit Revision 0, dd_touch_room auch für authenticated gesperrt (Migration am 16.09. im Supabase-Projekt eingespielt und geprüft: anon und authenticated ohne Recht, postgres berechtigt), Auth-Listener abbrechbar · Shop mit Reitern Kisten, Trophäen, Währung: Duellmarken (Duell 40/15, Encounter 80/20, Weltboss 250) und Würfelkerne (vorerst nicht sammelbar) im Profil (Schema 10), vier Kisten mit Dropchancen vor dem Kauf, Duplikate geben Marken zurück, Schutz +2 pp Epic je Öffnung ab 10 ohne Epic (max +10, Legendary fix), Pool = 31 Artwork-Designs (11 Common, 8 Rare, 5 Super Rare: Gezeitenkompass, Runenschmiede, Frostsiegel, Nachtfalter, Bernsteinarchiv; 4 Epic: Azure Storm, Dämmerkathedrale, Phönixkern, Weltenwurzel; 3 Legendary: Nebula Veil, Solar Relic, Ereignishorizont – alle fünf Stufen besetzt) · Lieferungen in 1024 lossless werden mit `scripts/wuerfel-webp-konvertieren.mjs` auf 512/q88 gebracht, Kistentest im Trainingsfenster (der Testguthaben-Knopf ist seit V28.12.63 weg, Prüfstände buchen über `WDShop.buche`), Echtgeld nur Vorschau · Shop-Bilder aus Asset-Auftrag V3 Pakete A–C eingebaut (Währungen, Kern-/Marken-Pakete, fünf Seltenheitsplaketten); Pakete D bis F eingebaut (Reiter-Embleme, Bänder für Neu/Doppelt, Preisschild an den Kern-Paketen, gemalter Hintergrund der Kistenbühne) – Asset-Auftrag V3 vollständig · Kisten: genau ein Würfel auch im Kistentest, Kiste bleibt nach dem Öffnen in voller Größe, Kistenkarten im ruhigen Navy-Kachelrahmen (navy-tile als border-image) statt der gedehnten Kosmetikkarte, Chancen hinter einem Info-Knopf rechts oben, Kartenrahmen nach Würfelseltenheit (Super Rare seit V28.12.64 mit eigener Vorderseite `chests/super-rare/`, 512×704 q88; alle Bildassets liegen in Anzeigegröße als WebP vor, nichts mehr zu verkleinern) · Nachbesserung 16.09.: Seltenheitsplakette unter dem Würfel auf der Karte, Glow je Karte, Kaufknöpfe auf Kachelhöhe 56.32px ohne Versatz und einzeilig (Währungswort erst ab 720 px), Kaufknöpfe bei offenem Info ausgeblendet, „Bald verfügbar“ als Goldknopf, Kistenkarten unter 640 px einspaltig und Kicker unter dem Info-Knopf · Online-Icon im Hauptmenü 3 px angehoben, Kern-Pakete 35/200/500/1500 |

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

**Noch im Umbau:** die Schichten in `js/`. Seit V28.14.0 liegen die
Duell-Definitionen und der serialisierbare Zustand unter `js/engine/`;
die Browserdateien referenzieren diese gemeinsame Datenquelle. Der Reducer
und die Umschaltung der Kampfregeln folgen in getrennten Schritten.
Die übrigen Grenzen aus `ARCHITECTURE.md` sind damit noch nicht umgesetzt.

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

### Würfeldesigns: das Maß

Ein Artwork-Würfel besteht aus **acht** Dateien in
`assets/ui/v28/png/dice-designs/<artKey>/`:
`<artKey>-face-1` bis `-face-6`, `<artKey>-face-question` und
`<artKey>-beauty`. Alle **512 × 512 WebP mit Alpha**.

**Pixelgenau nachgemessen** an den drei Originalen (ivory-royal,
sapphire-crown, amethyst-rift): die Würfelfläche liegt in allen sieben
Flächendateien in genau demselben Feld — **8,8 % bis 91,2 % der Kante**,
also 422 × 422 mittig auf 512 × 512, auf allen vier Seiten identisch. Weicht
eine Datei ab, springt der Würfel beim Flächenwechsel.

Die erste Lieferung der fünf neuen Sätze (V28.12.30) kam als 1024 × 1024
mit nur 3,4 % Rand und musste je Design mit *einer* gemeinsamen
Transformation auf das Zielfeld gerechnet werden. Ihre Augen wanderten
dabei um bis zu **5 Prozentpunkte** — das war der Anlass für
`docs/WUERFELDESIGN-BRIEF.md`.

**Seit V28.12.32 erledigt sich das von selbst.** Die Neulieferung nach dem
Brief sitzt bereits im Zielfeld: alle sieben Flächendateien jedes Designs
messen exakt 8,8 %–91,2 %, waagrecht wie senkrecht. Es wird nur noch von
1024 auf 512 skaliert, keine eigene Transformation mehr. Die Augen liegen
auf dem Raster: Tide Pearl ±0,0 · Walnut Lodge ±0,2 · Azure Storm ±0,2 ·
Solar Relic ±0,6 · Nebula Veil ±1,1 Prozentpunkte. `-face-question` und
`-beauty` sind jetzt echtes Artwork, keine Platzhalter mehr.

**Das Format ist nachgemessen, nicht geraten.** WebP speichert den
Alphakanal auch bei verlustbehafteter Kompression **verlustfrei** —
Alphafehler über alle Qualitätsstufen: 0. Die runden Ecken und die
Silhouette der 3D-Vorschau bleiben exakt. Der Farbfehler bei q88 beträgt
bei 512 px im Mittel 8,3 von 255, bei 145 px (Spezialwürfel) 3,9 und bei
56 px (Würfel im Kampf) **1,4** — er landet also nie auf dem Bildschirm.
Dieselbe Fläche als PNG: 365 statt 61 kB, Faktor sechs. q94 senkt den
Fehler bei 56 px auf 1,2 und kostet 30 % mehr Bytes; das lohnt nur, falls
eine `-beauty` einmal groß gezeigt wird.

**V28.12.33: sieben weitere Designs, alle nach dem Brief gebaut.**
Frost Porcelain, Ashwood, Coppertrail, Midnight Enamel, Ironkeep, Oakbound
und Mossstone. Abweichung vom Augenraster: ±0,1 bis ±0,3 Prozentpunkte,
Feld auf die Kommastelle. Die mitgelieferte `Spezifikation.json` nennt
`face_bounds [90,934]`, `pip_centers 317/512/686` und `pip_diameter 133`
auf 1024 px — umgerechnet exakt die 8,8 %/91,2 %, 31/50/67 % und 13 % aus
`docs/WUERFELDESIGN-BRIEF.md`. Der Brief wird also gelesen und befolgt;
Nacharbeit fällt seither keine mehr an.

**V28.12.37: die ersten vier Rare-Würfel** — Seidenhof, Korsar,
Drachenpanzer, Goldbruch. Feld exakt, Raster ±0,3 bis ±1,1 Prozentpunkte,
Augendurchmesser 9,7–12,3 %. Sie kommen als **WebP 1024 × 1024,
verlustfrei, mit echtem 8-Bit-Alpha**; das Spiel-Repo rechnet daraus wie
bisher 512 × 512 bei Qualität 88 (rund 48 kB je Fläche).

**V28.12.38: Uhrwerk, Dünenrelikt, Dornenhain** — damit 22 Artwork-Designs.

**Die Augengröße ist das, was bei Rare-Designs schiefgehen kann.** Ein
erstes Rare-Paket (Uhrwerk) hatte Augen von 5,0–7,7 % statt 10–13 % —
halb so groß und untereinander ungleich. Bei 56 px hebt sich dort das
schwächste Auge nur mit einem Helligkeitsabstand von **109** von der
Fläche ab; der Common-Satz liegt bei 159–219, das Rare-Paket 2 bei
138–226. Gemessen wird das so: Fläche 6 auf 56 px skalieren, je Auge das
stärkste Bildpunktpaar in einem Fenster von ±3 px gegen die Fläche
zwischen den Augenspalten. **Ein einzelner Bildpunkt genügt nicht** — bei
leicht verschobenen Augen misst man sonst die Lücke und bekommt 12 statt
109 heraus.

Uhrwerk ist trotzdem eingebaut („für die jetzigen ists egal"). Damit die
Regel dadurch nicht aufweicht, prüft `wuerfeldesigns.mjs` die Größe als
**eigene Zusicherung** (Median über alle gefundenen Augen, mindestens 9 %)
und führt Uhrwerk in einer sichtbaren `AUSNAHMEN`-Liste mit Begründung.
Zwei Fallen dabei, beide erlebt: Wer die Fleckengrenze senkt, damit auch
kleine Augen gefunden werden, erwischt bei anderen Designs nur Teile eines
Auges — deshalb **Median statt Minimum oder Mittel**. Und Uhrwerks
Schwerpunkte wandern aus demselben Grund um bis zu 2,2 Prozentpunkte, es
steht deshalb auch beim Raster in der Ausnahmeliste.

Die Werte im Bestand: 9,8 % (Drachenpanzer) bis 12,8 % (Tide Pearl),
Uhrwerk 7,1 %.

**V28.12.34 schließt den Common-Satz ab:** Slatewatch, Sandcarver und Redclay.
Der Satz „Common" umfasst damit **zehn** Designs, alle in einer Bauart.
Sandcarver ist das einzige mit **dunklen Augen auf heller Fläche** — es
liest sich bei 56 px am weitesten und ist der Kandidat, wenn ein Design
freigeschaltet werden soll.

Die Liste der zu prüfenden Designs steht **nicht mehr im Prüfstand**:
`scripts/qa/wuerfeldesigns.mjs` liest sie aus `DICE_DESIGNS` und nimmt
jeden Eintrag mit `theme-art-die` und `testOnly:true`. Ein neues Design
ohne Eintrag im Prüfstand wäre sonst still ungeprüft durchgerutscht.

**Wer Bilder unter gleichem Dateinamen austauscht, hebt ASSET_REV an**
(`node scripts/bump-version.mjs --assets <rev>`). Sonst liefert der
Browser-Cache die alte Datei aus, denn die URL ist unverändert. Bei einer
reinen Versionsanhebung genügt das nicht: `CACHE_VERSION` in `sw.js` leert
nur den Service-Worker-Cache, nicht den HTTP-Cache.

`testOnly:true` in `DICE_DESIGNS` hält ein Design aus der Profilliste
heraus; die Testumgebung listet trotzdem alles. Soll ein Design
freischaltbar werden, fällt das Flag weg und es braucht einen Weg dorthin
(`DICE_UNLOCK_ACHIEVEMENT`, Trophy Shop oder Kampagnenbelohnung) plus einen
`unlockText`.

Gemessen von `scripts/qa/wuerfeldesigns.mjs`: acht Dateien je Design, alle
512 × 512, alle im selben Feld, **die Augen auf dem Raster 31/50/67**,
keines im Profil, alle in der Testumgebung, und der Würfel trägt die
Fläche im Kampf wirklich.

Das Augenraster wird über die **Streuung der sechs Flächen** gemessen: wo
ein Auge mal da und mal weg ist, ändert sich die Farbe stark. Das braucht
kein Wissen über die Farben des jeweiligen Designs und funktioniert
deshalb auch bei Sätzen, die noch niemand gesehen hat. Gegenprobe
gefahren: mit einem Sollraster von 25/50/75 meldet die Zusicherung
8 Prozentpunkte Abweichung und fällt.

### Wuerfeleffekte in der Testumgebung seit 28.12.39

Ein gelber Streifen laeuft von links nach rechts ueber jeden Wuerfel,
je Wuerfel um 110 ms versetzt, sodass er als Welle durch die Reihe geht.
**Nur in der Testumgebung** (`body.test-lab-active`), rein in CSS am Ende
von `37-abschluss.css` — der Block laesst sich am Stueck wieder entfernen.

**Die Falle, in die ich zuerst gelaufen bin:** der naheliegende Weg ist ein
breiter Streifen, der per `transform` durch den Wuerfel wandert und vom
Wuerfel beschnitten wird. Das geht nicht. Die Wuerfel stehen im Spiel
bewusst auf `overflow:visible`
(`body.playing #game .dice .die` in 13-v28-grundlage.css), weil die
Artwork-Flaeche mit `scale(1.24)` **ueber den Rand hinaus** gezeichnet
wird. Wer sie beschneidet, macht jedes Artwork-Design sichtbar kleiner.
Der Schimmer ist deshalb ein **Hintergrundverlauf** in der `::after`-Ebene:
ein Hintergrund verlaesst seine Box nie, ganz ohne `overflow`.

**Zwei Werte, die zusammengehoeren.** Bei `background-size:300%` ist immer
nur ein Drittel des Verlaufs im Bild; der helle Streifen steht darin
waehrend `fenster/(1-fenster)` der Positionsfahrt, bei 300 % also genau der
Haelfte. Fuer 600 ms sichtbaren Durchlauf muss die Fahrt 1200 ms dauern —
43 % von 2,8 s. Und `linear` statt `ease-in-out`: mit Beschleunigung huscht
der Streifen in der Mitte durch und wirkt wie ein Blitz.

**Seit 28.12.40 sind es vier Effekte zum Vergleichen**, umgeschaltet vom
Regler „Würfeleffekt" in der Werkbank (`js/21-test-lab.js` setzt
`#dice[data-lab-dice-fx]`): Schimmer in Gold, Schimmer in der Designfarbe
(`--dice-accent`), Randglühen und Puls. Sie sollen später an die
**Seltenheit** eines Designs gehängt werden — bis dahin frei wählbar,
damit man Effekt gegen Design ansehen kann.

Der Regler steht bewusst **neben** der Würfelauswahl und nicht hinter
einem eigenen Reiter: verglichen wird Effekt gegen Design, dafür müssen
beide Regler nebeneinander liegen.

**Eine Falle bei der Designfarbe:** ein einfaches
`color-mix(var(--dice-accent), #fff)` bleibt **deckend**. Der Schimmer war
dadurch sichtbar kräftiger als die goldene Fassung mit ihren `.70`
Deckkraft, und man verglich Farbe und Stärke auf einmal. Richtig ist die
verschachtelte Mischung: innen mit Weiß aufhellen, außen auf dieselben
`.70` bringen.

**Der Kantenläufer**: ein kleiner violetter Punkt fährt die Würfelkante ab
und zieht einen Nachglow hinter sich her.

**Der erste Ansatz mit `offset-path` ist gescheitert, und zwar
grundsätzlich.** Eine Kapsel wurde per `offset-path:border-box` an der
Kante entlanggeschoben — aus dem Spieltest: „immer wenn er um die Ecke
fährt, steht der Schweif kurz über den Würfel hinaus". Das ist nicht zu
beheben: `offset-path` verschiebt und dreht einen Kasten, es **biegt** ihn
nicht. Ein gerader Schweif von knapp halber Würfelbreite ragt an einer
90-Grad-Ecke zwangsläufig heraus.

**Seit 28.12.42 wird der Schweif auf die Umrandung GEMALT** statt an ihr
entlanggeschoben: ein Kegelverlauf liefert Punkt und Nachglow in einem,
eine Maske (`mask-composite:exclude`) schneidet daraus einen Ring in der
Form des Würfels. Damit folgt der Schweif der Rundung exakt und kann gar
nicht mehr überstehen. Zwei Eigenheiten gehören dazu: der Kegelverlauf
dreht um den **Mittelpunkt**, der Punkt ist an den Ecken deshalb etwas
schneller als in der Mitte einer Kante (fällt auf einem fast quadratischen
Würfel nicht auf). Und die Winkelvariable muss per `@property` als
`<angle>` angemeldet sein, sonst springt sie statt zu animieren.

**Seit 28.12.43 ist der Punkt ein eigenes Element** (`::before`): ein
echter kleiner Kreis mit zwei Höfen, der per `offset-path:border-box`
mitläuft. Rund und klein darf er das — überstehen konnte nur der lange
gerade Schweif.

**Ring und Punkt werden verschieden parametrisiert**, der Ring nach Winkel
um den Mittelpunkt, der Punkt nach Strecke auf der Kante. Eine **feste**
Verschiebung reicht dafür nicht — aus dem Spieltest: „bei der Geraden
wirkt es, als wäre er etwas schneller als der Schweif". Genau so ist es:
auf einer Geraden läuft der Winkel ungleichmäßig, die Strecke gleichmäßig.

`@keyframes wuerfelKante` fährt deshalb seit 28.12.44 eine **ausgemessene
Kurve** mit 21 Stützstellen ab. Gemessen wurde nicht am Bild, sondern am
Layout: ein unsichtbares Messelement mit demselben `offset-path` wurde in
40 Schritten über die Runde geschoben und je Schritt sein Winkel zur
Würfelmitte bestimmt (`scripts/qa/`-Machart, das Skript liegt nicht im
Repo). Die Runde schließt auf exakt 360,0 Grad.

Die Kurve gilt für die **Form** des Kampfwürfels. `border-radius` steht bei
17 px fest, die Rundung ist als Anteil der Breite also nicht bei jeder
Fensterbreite gleich; auf sehr schmalen Telefonen bleibt ein kleiner Rest.

`offset-rotate:auto` ist nötig, damit `offset-anchor` quer zur
Fahrtrichtung zieht. **31 %** holt den Punkt von der Außenkante auf die
Mitte des Rings — der liegt wegen `padding:4.5%` rund 1,3 px weiter innen,
und das war der seitliche Versatz, den man zwischen Kreis und Schweif sah.

**Wandernd gegen atmend — der Unterschied, den ein Spieltest gefunden
hat.** Randglühen und Puls wirkten „zu erzwungen, machen einmal einen
kurzen Tick und sind dann weg". Ursache war der **Versatz je Würfel**: bei
einem atmenden Effekt blitzt die Reihe dadurch innerhalb von 440 ms durch
und ruht danach zwei Sekunden. Der Versatz gehört nur zu den **wandernden**
Effekten. Dazu: kürzerer Takt (1,6 statt 2,4 s) und ein höherer Boden —
ein Effekt, der zwischendurch ganz ausgeht, liest sich immer als Tick.

Gemessen von `scripts/qa/wuerfelschimmer.mjs` (17 Zusicherungen): Schimmer
auf jedem Wuerfel, ueber der Artwork-Flaeche, steigender Versatz,
sichtbarer Durchlauf 500-700 ms, gleichmaessig, **Wuerfel unbeschnitten**,
waehrend des Wurfs aus, im normalen Spiel gar nicht, und der Regler
schaltet wirklich um (gemessen am Animationsnamen des Wuerfels, nicht am
Wert im Auswahlfeld - ein Regler ohne Wirkung waere sonst gruen). Gegenprobe gefahren:
mit `overflow:hidden!important` faellt die Zusicherung zur Beschneidung.

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

**Globale Fähigkeitsstatistik – Erfassung eingebunden:** eigener Ordner `js/online-stats/` mit Hauptkonto-Zuordnung, Offline-Journal, IndexedDB und quittiertem Versand. Lokale Gastprofile und Kampagnen-/Boss-Rush-Teams zählen mit. Online-Ergebnisse werden atomar mit dem finalen State gespeichert. Migrationen foundation, capture und unarmed_bots am 16.09. live eingespielt; SQL-Raumablauf einschließlich Abschluss, Duplikat und Raumlöschung geprüft und Testdaten zurückgerollt. Globale Ansicht, Altbestand-Import und Test mit zwei echten angemeldeten Geräten bleiben offen. Details: `js/online-stats/README.md`.

Zwei Punkte. Alles andere aus dem Codex-Durchgang vom 14.09. ist
abgearbeitet und steht unten als Chronik — dort nur noch das, was man
wissen muss, nicht mehr die volle Beweisführung.

1. **Online-Gast: Wurfergebnis vorgezogen — live belegt, seit V28.12.35
   auf `main`.** Schritt 0 bleibt: Zwischenstand und Endstand mit eigener
   Sequenz, Pending bis zum Endstand.

   Seit 28.12.34 zieht `animateIndices` die Werte vor dem Timer. Der Host
   verbirgt sie ueber rolling auch im DOM, im flachen Renderer und in der
   Summe; Twelve-Heilung und Log bleiben beim Aufdecken. Der Gast schreibt
   Hauptwuerfe mit gueltigen vorgezogenen Augen sofort fest, ohne Pending
   oder dessen Timer zu loeschen. Spezialwuerfe und Gegenangriff ziehen
   weiterhin in ihren eigenen Pfaden und behalten ihre Vorschau.

   `scripts/qa/wurf-vorab.mjs` besteht lokal und faellt gegen 472f995 an
   der erwarteten Zusicherung (Wert vor Timer). Es prueft 430/250 ms,
   eigene Finalfunktion, einmalige Ziehung, Heilungszeitpunkt und die
   Snapshot-Anwendung samt Pending/Timer. `online-protokoll.mjs` prueft
   jetzt fruehe echte Augen statt einer weiterlaufenden Gastvorschau.
   Der lokale Zwei-Browser-Test besteht samt Pending, 8000-ms-Abbruch,
   Paketfolge, einmaligen FX und DE/EN bei 320/360/390/412/1280 px.
   Der Renderer-Test setzt beim kuenstlichen Wechsel in den flachen Modus
   auch dessen HTML-Klasse und beginnt mit frischen Wuerfel-Nodes.
   **Der Live-Nachweis ist am 16.09. erbracht**, in dieser Sitzung gegen
   das echte Projekt, mit demselben Prüfstand für beide Fassungen und
   `WD_SOURCE_ROOT` auf einen zweiten Checkout. Zwei vollständig
   bestandene Läufe je Fassung, je sechs Aktionen:

   | Fassung | mittel sichtbar | mittel bestätigt |
   |---|---|---|
   | `main` 260d23a | 1561 ms / 1411 ms | 1561 ms / 1411 ms |
   | Branch | **1180 ms / 1178 ms** | 1458 ms / 1403 ms |

   Das sind rund **307 ms** im Mittel über alle sechs Aktionen. Bei den
   drei Wurfaktionen einzeln liegt „sichtbar" **363 bis 685 ms** vor
   „bestätigt" — die Animationsdauer, wie vorhergesagt. „Bestätigt"
   bleibt unverändert; die Freigabe wartet weiter auf den Endstand. Die
   zwölf bestehenden Zusicherungen waren in **jedem** Lauf grün.

   Zum Vergleich der Stand vom 15.09., als nur Schritt 0 existierte:
   1511/1474 gegen 1511/1356 ms, und „sichtbar" war in allen 24 Aktionen
   gleich „bestätigt". Genau daran sieht man, was die Vorziehung bringt.

   Dass Codex' eigene Live-Läufe scheiterten, lag an seiner Umgebung: ein
   einzelner Auth-Aufruf brauchte dort 12.926 ms. `docs/ONLINE-GAST-LATENZ.md`
   und `.json` halten diese Läufe als Diagnose fest.

   **Nachtrag V28.12.36: der erste Spieltest fand den Haken.** „Der Gast
   sieht keine Animation, wenn der Host rollt." Der Grund ist das
   Gegenstück zum Gewinn: beim **eigenen** Wurf wartet der Gast den ganzen
   Netzweg, seine Vorschau läuft rund eine Sekunde, und das Ergebnis darf
   zu Recht sofort stehen. Beim Wurf des **Hosts** trifft derselbe
   Zwischenstand aber schon nach rund **30 ms** ein — sofort aufzudecken
   ließ die Würfel dort gar nicht erst drehen.

   `applyStateNow` deckt vorgezogene Augen deshalb nicht mehr sofort auf,
   sondern erst, wenn die Vorschau so lange lief wie ein Wurf
   (`ROLL_ANIM_MS`, 430 bzw. 250 ms schnell). Dafür merkt sich
   `beginActionPreview` in `onlineSession.previewStart`, wann die Vorschau
   begann; die Restdauer läuft als `onlineSession.revealTimer`, den der
   Endstand und `clearPendingAction` abräumen. Ist die Wurfdauer beim
   Eintreffen schon um — der Normalfall beim eigenen Wurf — wird wie
   bisher sofort aufgedeckt.

   **Der Gewinn bleibt dadurch unangetastet:** live gemessen 1174 ms
   mittel sichtbar gegen 1180/1178 ms vor dieser Korrektur. Der Aufschub
   trifft nur den Fall, in dem der Gast ohnehin nichts zu warten hatte.
   `wurf-vorab.mjs` prüft alle drei Fälle (lange Vorschau, frische
   Vorschau, halb abgelaufen) und fiel vorher an genau der neuen
   Zusicherung.

   **Und der Rest ist nicht die Animation.** „Rest sichern" hat gar keine
   Animation und kostet trotzdem 1051–1290 ms. Die Wartezeit ist zum
   größten Teil der Weg Gast → RPC → Realtime → Host → RPC → Realtime →
   Gast. Die Messungen laufen hier durch den Sandbox-Proxy und eine
   WebSocket-Brücke, sind also absolut zu hoch; das Verhältnis stimmt
   trotzdem. Wer die Wartezeit wirklich halbieren will, muss an die Zahl
   der Netzwege, nicht an die Animation.

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

   **Der Live-Prüfstand war 40 Versionen lang kaputt und ist repariert.**
   `online-durchspielen.mjs` füllte `#newProfileName` direkt; seit die
   Profilfelder hinter dem Knopf „Neues Profil" (`#profileCreateToggle`)
   liegen, ist das Feld zwar vorhanden, aber unsichtbar, und `fill()` lief
   in den 30-Sekunden-Timeout. Damit lief der **einzige** Test, der Online
   gegen das echte Projekt prüft, seit V28.11.x nicht mehr durch. Er kann
   jetzt außerdem messen: sechs reproduzierbare Gastaktionen mit
   festgelegter Würfelfolge, getrennt nach „sichtbar" und „bestätigt",
   und über `WD_SOURCE_ROOT` gegen einen zweiten Checkout, damit Vorher
   und Nachher denselben Prüfstand benutzen.

   **Der sporadische `HTTP 400` ist geklärt und war nie einer.** Der Gast
   meldete unregelmäßig `dd_get_battle_snapshot` mit 400, was den ganzen
   Lauf auf „nicht bestanden" setzte. Der Antwortkörper ist
   `DD_NOT_ROOM_MEMBER`, und er kommt bei **t=32,7 s** — nach der letzten
   Messung, während der Prüfstand beide Seiten aus dem Raum nimmt. Der
   Gast geht zuerst; in der Sekunde bis der Host folgt, zieht sein
   Realtime-Abo noch einen Schnappschuss nach, auf den er keinen Anspruch
   mehr hat. Eigene Bereinigung, kein Befund über das Spiel, und er trat
   mit **und** ohne die Protokolländerung auf. HTTP-Fehler ab dem
   Verlassen des Raums zählen seither nicht mehr.

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

2. **`dd_touch_room` ist auf der Datenbank — erledigt am 14.09.**
   Die Migration `20260903120000_dd_room_idle_expiry.sql` wurde vom Nutzer
   im Supabase-SQL-Editor eingespielt. Gegengeprüft mit dem neuen
   `scripts/qa/supabase-funktionen.mjs`, das jede Funktion anonym über
   PostgREST anspricht: `dd_touch_room` und die vier Wrapper antworten mit
   **42501 permission denied**, sind also vorhanden und geschützt. Räume
   laufen damit nach 45 Minuten Untätigkeit in der Lobby bzw. 2 Stunden im
   laufenden Match ab statt nach festen 6 Stunden mitten im Spiel.

   **Der Client ruft `dd_touch_room` nie selbst.** Die Funktion ist von
   `anon` entzogen und wird nur aus `dd_join_battle_room`,
   `dd_set_battle_ready`, `dd_submit_battle_action` und
   `dd_publish_battle_state` heraus ausgeführt — alle vier ruft
   `js/43-supabase-battle.js`. Sie läuft also bei jedem Beitritt,
   Bereitmelden, Zug und Veröffentlichen mit.

3. **Serverautoritativ: Phase 2 freigegeben, Schritt 1 von 6 geliefert.**
   `js/engine/02-definitions.js` ist die gemeinsame Datenquelle für Browser
   und Engine; `03-state.js` enthält `createState`/`validateState` ohne DOM,
   Zufallsverbrauch oder Profilwerte. Der Browser verwendet die Definitionen,
   aber noch keinen Reducer. Umfang: ausschließlich Duell, vier Modi, zwei
   bis sechs Spieler, Level 0 außer erzwungenem Mayhem-Level 2.
   Kampagne/Encounter/Weltregeln/Boss Rush/Tutorial/Testumgebung bleiben Browser.
   Reihenfolge ab hier: 2 Basisphase, 3 Angriff, 4 Spezialwürfel/Drafts/Runden,
   5 Browseradapter mit Matchparität, 6 Deno-Parität und Schatten. Schritte
   2–4 liefern nur Engine-Dateien und Node-Tests. **Je Schritt eigenes Release
   auf main, danach melden und auf „Weiter“ warten.** Kein Deployment.
   Zwei offene Punkte: Der Bestand hat 24 echte Fähigkeiten (W25=6 ist freie
   Wahl); die 25er-Auslösematrix ist vor Schritt 5 zu klären. Ein bestätigter
   Mayhem-Timerkonflikt lässt Wildcard nach HP-Draft abhängig von der
   Auswahlgeschwindigkeit im Folgeangriff wirken; vor Schritt 4 ausdrücklich
   klären, keine stille Regelkorrektur. Details, Schema und Abgrenzung:
   [docs/SERVER-ENGINE-ENTWURF.md](docs/SERVER-ENGINE-ENTWURF.md).
   Online bleibt hostautoritativ mit unverändertem Protokoll; Schatten nur
   Classic 1:1, nur RAM. Hostvorschau und Serverautorität kommen in Phase 3.

4. **Platzmanagement im Kampf — erster Schritt steht im Spiel.**
   Seit V28.12.26 im **normalen Kampf**, nicht mehr nur in der
   Testumgebung:

   - **Kampflog** neben dem Hauptmenü. `#log` bleibt dauerhaft unsichtbar
     und `addLog` schreibt weiter hinein; das Blatt liest bei jedem Öffnen
     neu. Zeile 1 ist die **erste** Aktion des Kampfes (`#log` hält sie
     hinten, `addLog` stellt vorne ein — das Blatt dreht um). Sprites sind
     dort ausgeschaltet: `.battle-log-list` steht in `ALWAYS_SKIP` des
     Sprite-Passes, ein Protokoll bleibt Text.
   - **Infos** über den Würfeln zeigt Fähigkeitszeilen und
     Aufgabenfortschritt; beide belegen im Zug keinen Platz mehr. Der
     Knopf verschwindet, wenn es nichts zu zeigen gibt
     (`refreshBattleInfoButton`).
   - Der Wurfknopf heißt in **jeder** Phase nur noch „Würfeln" (englisch
     „Roll"). Welche Zahl gesucht ist, was der Blutpreis mitträgt und was
     ein Treffer kostet, steht vollständig in der Statuszeile darüber.
     Dadurch passt ein Zusatzknopf **neben** ihn: „Würfeln" und
     „Blutpreis" brauchen je 129 px und stehen auf jedem Telefon in einer
     Zeile (vorher zwei Zeilen, 113 px hoch).
   - Die Werkbank der Testumgebung startet eingeklappt.

   **Zwei Maße, die man kennen muss:** die Knöpfe der Kampfleiste stehen
   auf `flex:1 1 auto` — eine feste Basis entscheidet über die Spaltenzahl,
   bevor jemand den Text gesehen hat (mit 140 px brach „Blutpreis" mitten
   im Knopf um, mit 200 px passte nur einer je Zeile). Und die beiden
   Matchbar-Knöpfe tragen `padding-inline:12px` statt 28: zu zweit passten
   sie sonst nicht neben „Runde 1" und stapelten sich auf drei Zeilen.

   Das Blatt zeigt **Kopien**. `#abilityState` und `#campaignTaskProgress`
   hängen weiter an ihrem Platz im Baum und werden nur per CSS
   ausgeblendet — kein Renderpfad schreibt ins Leere, nichts muss
   aufgeräumt werden. Die Kopien tragen keine ids.

   Code: `js/12-battle-ui.js` („Kampflog und Infos"), Markup in
   `index.html`, Verdrahtung in `js/15-app.js`, CSS am Ende von
   `37-abschluss.css`. Gemessen von `scripts/qa/kampf-platz.mjs`
   (24 Zusicherungen, deutsch und englisch).

   **Nachtrag V28.12.27:** „Infos" sitzt jetzt in der Zugkopfzeile neben
   der Augenzahl statt in einer eigenen Reihe über den Würfeln, der
   Hauptmenü-Knopf steht wieder rechts außen, und der Einlock-Knopf heißt
   nur noch „Lock" (188 px → 129 px): der Basiszug braucht damit **zwei**
   Knopfzeilen statt vier.

   Dazu zwei Dinge, die vorher niemandem als Fehler aufgefallen waren,
   weil man sie nur in Bewegung sieht:

   - **Die Zugkarte hüpfte.** `updateButtons` blendet während des Wurfs
     *alle* Knöpfe aus; die Leiste fiel von 59 auf 2 Pixel und der gemalte
     Rahmen um die Würfel wurde sichtbar kleiner (Karte 214 → 157).
     `.controls` hält jetzt die Höhe einer vollen Knopfzeile frei, ob dort
     gerade ein Knopf steht oder keiner.
   - **`button.secondary` hatte nie einen Rahmen.** Die Regel in
     `13-v28-grundlage.css:94` gibt ihm nur einen flachen Verlauf — im
     Kampf standen „Angriff fortsetzen", „Angriff beenden" und „Nächster
     Zug" damit als einzige ohne gemalten Rahmen da, während jeder Knopf
     mit `.gold`, `.purple`, `.blood` oder `battleAction()` einen hat. Wer
     einen neuen Kampfknopf einführt, prüft das mit
     `scripts/qa/kampf-platz.mjs`: der misst in sechs Phasen, ob jeder
     sichtbare Knopf ein Rahmenbild trägt.

   **Nachtrag V28.12.28:** die **Weltregel** steht jetzt ebenfalls im Blatt
   (zuoberst, sie gilt für alles andere) statt als eigene Leiste über den
   Spielerkarten — das waren 58 Pixel, jeden Zug, für einen Satz, den man
   einmal liest. Kopiert wird nur `.encounter-rule-text`: der Rahmen der
   Leiste besteht aus 25 SVG-Kacheln, die auf ihre Proportionen gerechnet
   sind.

   **Im Blatt ist Text Text.** `#battleSheetBody` steht in `ALWAYS_SKIP`
   des Sprite-Passes, und `battleSheetCopy` wirft die Sprites, die die
   Kopie aus dem Kampf mitbringt, heraus — der Pass hat die Quelle dort
   längst dekoriert, `display:none` hält ihn nicht auf (er prüft die
   Klasse `.hidden`, nicht die Sichtbarkeit). Aus demselben Grund steht
   `battleInfoBtn` **nicht** in `ID_ICONS`: sein Symbol erschien erst,
   wenn der Knopf auftauchte — also mitten im Kampf — und schob die
   Kopfzeile.

   Der Knopf sitzt mit `align-self:baseline` auf der Schriftlinie. Zentriert
   saß er 10 px tiefer als die Augenzahl und machte die Zeile 30 statt 20
   Pixel hoch.

   **Nachtrag V28.12.31: die Matchbar stapelte sich auf schmalen
   Telefonen.** Gemessen im laufenden Kampf: bei **320 und 360 px** standen
   „Kampflog" und „Hauptmenü" übereinander statt nebeneinander — die
   Leiste war **104 statt 49 Pixel** hoch. Die 12-px-Polsterung aus
   V28.12.27 reicht erst ab 390 px; bei 360 px fehlten drei Pixel. Jetzt
   in zwei Stufen: unter 390 px 8 px Polsterung (reicht ab 350 px),
   unter 350 px treten zusätzlich die **Symbole** zurück — die
   Beschriftung bleibt, denn ein Knopf ohne Text ist ein Rätsel. Die
   beiden Symbole tragen **zwei verschiedene Klassen**: das des Kampflogs
   kommt aus dem Sprite-Pass (`.dd-emoji-sprite`), das des Hauptmenüs aus
   dem Markup (`.dd-inline-icon`) — die Regel greift deshalb auf `img`.

   Die Höhe der Zugkarte ändert das nicht: die Leiste sitzt in der oberen
   Karte, die gewonnenen 55 Pixel gehen an die **Spielerkarten**.

   Gemessen wird das jetzt in `scripts/qa/kampf-platz.mjs` bei 320, 360,
   390 und 412 px — eine Zeile, beide Knöpfe beschriftet.

   **Nebenbefund, mitbehoben:** der Changelog-Eintrag zu V28.12.29 sagte,
   die Gegnerkarten zeichneten ihren Weltrahmen „als echten Rand statt als
   Bild darüber". Das stimmte nicht — `border-image` wurde von
   `verify-build.mjs` abgelehnt (gemalte 3:1-Weltrahmen dürfen keine
   border-image sein), geblieben ist die seitliche Polsterung von 11 %.
   Der Eintrag sagt das jetzt. Die Einträge V28.12.29 und .30 standen
   außerdem im englischen Spiel **deutsch** — sie hatten nie ein Paar in
   `lang/en-changelog.js` bekommen. Nachgetragen, zusammen mit .31.

   **Offen bleibt die Frage, was noch ins Blatt gehört** — Statuszeile und
   Angriffszielkasten sind die nächsten Kandidaten.

---

### Chronik: am 14.09. geschlossen

Der Codex-Durchgang gegen V28.12.11 meldete zwölf Befunde. Jeder wurde am
Code nachgeprüft, jeder mit eigenem Prüfstand behoben. Was davon dauerhaft
gilt, steht in „Fallen in diesem Repo" und in `docs/PROJEKTREGELN.md`;
hier nur die Zuordnung.

| Befund | Fassung |
|---|---|
| Gespeicherte Runs wurden bei jeder Balanceänderung kommentarlos gelöscht | V28.12.12 |
| Fünf Lücken bei Ablehnen, Weitergeben und Speicher (Überheilung, Kopiengrenze, Achievement, Empfängerwahl, Zweiter Atem) | V28.12.13 |
| Duo fehlte das Max-HP-Wachstum je Stufe | V28.12.13 |
| Ereignis-Popup lag unter allen sieben Kampf-Overlays | V28.12.14 |
| Schadens- und Heilzahlen ebenso | V28.12.15 |
| Deutsch-Erkenner hielt das englische „die" für deutsch | V28.12.16 |
| Verschachteltes `tr` zerlegte die Mustertexte der Abschlusstafel | V28.12.16 |
| Toter Code und festes `/10` im Trio-Log | V28.12.16 |
| Bonus-Fähigkeitsknöpfe brachen um und ließen das Feld springen | V28.12.17 |
| Hauptknopf stand niedriger als die Bonusknöpfe | V28.12.18 |
| Emoji-Bestand: nichts zu bereinigen, Löschen wäre ein Fehler | V28.12.19 |
| Regelleiste hielt keine drei Textzeilen | V28.12.11 |

**Zwei Aussagen in dieser Datei waren falsch und sind korrigiert:**
Mastery greift im Trio-Boss-Rush voll (`standardEligible` endet mit
`return mode==="trio"`), nicht halb; und Bildrevision und App-Version
laufen getrennt, wie `docs/PROJEKTREGELN.md` immer sagte.

**Offen geblieben ist daraus eine Gestaltungsfrage:** soll der Boss Rush
Mastery ganz, gar nicht oder wie heute je Modus verschieden tragen? Die
L1/L2-Upgrades wirken immer, der Schadensbonus hängt an der Welt des
gezogenen Encounters und schaltet sich mitten im Lauf stumm zu, der
HP-Bonus greift nur auf Stufe 1. Kein Fehler, sondern eine geerbte
Kampagnenkartenregel. Entschieden ist nur die Teilfrage: geliehene
Mastery aus den Rush-Perks schaltet nichts Dauerhaftes frei
(`docs/PROJEKTREGELN.md`).

**Kleinigkeiten — für später:**

- [ ] **Sieben Funktionen ohne gefundene Aufrufer prüfen und gegebenenfalls
  entfernen.** Beim Spieltest vom 16.09. wurden im Repository keine Aufrufer
  gefunden. Auf Nutzerwunsch vorerst stehen lassen; kein aktueller
  Reparaturauftrag. Vor dem späteren Entfernen den dann aktuellen Stand
  auf direkte und dynamische Aufrufe sowie externe Debug-Nutzung prüfen,
  danach passende Tests ausführen und in einem eigenen Commit aufräumen.
  - `js/04-save.js`: `isHumanProfilePlayer`
  - `js/06-campaign.js`: `duoCampaignHpBonusThreshold`, `trioCampaignHpBonusThreshold`
  - `js/10-bots.js`: `botLevelLabel`, `botPopCount`
  - `js/12-battle-ui.js`: `currentAbility`, `renderSpecialPipDie`

Drei Emojis stehen noch in der Testumgebung; der Sprite-Pass nimmt diese
Entwicklerfläche über `TEST_SELECTOR` bewusst aus.

## Fallen in diesem Repo

- **`PGRST202` heißt nicht zwingend „Funktion fehlt".** PostgREST löst die
  Funktion über die **Argumentnamen** auf. Fehlt ein Pflichtargument, kommt
  dieselbe Meldung „Could not find the function" wie bei einer nie
  eingespielten Funktion. Am 14.09. meldete eine erste Sonde deshalb
  `dd_submit_battle_action` und `dd_publish_battle_state` als fehlend,
  obwohl beide längst da waren — die Sonde schickte nur `p_room_id`. Wer
  eine RPC anpingt, nimmt die vollständige Signatur aus der Migration.

- **Ein eigener Rahmen verkleinert alles, was absolut darin liegt.** Der
  grosse Spezialwürfel hat seit dem Rahmenumbau `border-width:40px` mit
  `border-image` (`36-v28-hierarchie.css:190`). Bei 168 px Würfel bleibt
  damit eine **Innenbox von 88 px** — und `width:100%` an einem absolut
  positionierten Kind rechnet gegen genau diese Innenbox, nicht gegen die
  Rahmenbox. Das Artwork-Sprite landete deshalb bei 88 px statt 168.
  Wer an diesen Würfeln etwas misst, misst `clientWidth`, nicht
  `getBoundingClientRect()`.

  **Nachtrag V28.12.23:** genau daran hing auch die Meldung „der Würfel ist
  immer weiß". `render3DDieNode` setzt `--die-half` aus der **Rahmenbox**
  (168 px) — der 3D-Körper wurde damit doppelt so groß wie sein Platz und
  füllte den ganzen Knopf als weiße Fläche. `sizeSpecialCube`
  (`js/12-battle-ui.js`) rechnet ihn seither selbst aus.
  Die Kantenlänge kommt dabei aus der **Kubusbox**: `--die-half` allein zu
  vergrößern zieht die sechs Flächen auseinander, der Würfel zerfällt in
  Plättchen. Beides wächst zusammen, über `--die-cube-inset`.

  **Nachtrag V28.12.24, drei Folgefehler aus genau dieser Ecke:**

  1. Der Würfel war danach **unsichtbar**. `.die-face` holt Fläche, Augen
     und Kante aus `--die-bg` / `--die-pip` / `--die-edge` — und die waren
     nur für `.die` definiert. Ein nicht definiertes `var()` ohne Reserve
     macht die Deklaration ungültig: Hintergrund weg, Augenfarbe geerbt,
     also transparent. Die Designtabelle für den Spezialwürfel setzt die
     drei jetzt selbst und malt sich daraus (`background:var(--die-bg)`),
     damit es **eine** Quelle je Design bleibt.
  2. Er saß ein Fünftel zu klein im Rahmen. Vom 40px-Rand sind nur die
     äußeren **8px bemalt** (Band 30 von 640 im Rahmenbild, mit
     `border-image-slice:150` auf `border-width:40px`). Die Öffnung ist
     also Rahmenbox − 16, nicht Innenbox. Die Sprite bekommt denselben
     Wert über `--die-sprite-scale`; ihr fester Faktor 1.24 gleicht nur
     den durchsichtigen Rand der Würfelbilder aus (rund 19%).
  3. **Gemessen wird nur, was auf dem Schirm steht.** `openInsurance` &
     Co. zeichnen den Würfel, während ihr Fenster noch versteckt ist —
     dort ist jede Breite 0, der Würfel blieb bis zum ersten Wurf zu
     klein. Ein `ResizeObserver` holt die Messung nach. Und:
     `getBoundingClientRect` zählt Transformationen mit; der Knopf
     pulsiert beim Wurf, jede Messung wäre eine andere. Für Layoutmaße
     `offsetWidth`/`clientWidth`, für skalierte Bilder das Rechteck.

  Dazu eine Falle, die nichts mit Würfeln zu tun hat: Der Würfel ist nach
  dem Wurf `disabled`, und die allgemeine Regel für Knöpfe
  (`13-v28-grundlage.css`: `opacity:.48` plus `grayscale/saturate`) machte
  ausgerechnet aus dem **Wurfergebnis** ein blasses Bild. Wer ein Element
  als Knopf baut, das eigentlich eine Anzeige ist, erbt dessen
  Zustandsoptik mit.

- **Gleiche Gewichtung schlägt gute Absicht.** Die Regeln für den
  Artwork-Würfel in `16-v28-phasen.css` tragen `.theme-art-die` im Selektor
  und wiegen damit eine Klasse schwerer als eine sonst gleiche Regel ohne.
  Eine spätere Datei gewinnt **nicht** automatisch — bei V28.12.23 blieb der
  Artwork-Würfel deshalb bei `inset:0` und bei `animation:…both`, während
  Classic der neuen Regel folgte: derselbe Würfel, zwei Verhaltensweisen.
  Wer eine solche Regel ablöst, schreibt den Selektor **beide Male** hin,
  einmal allgemein und einmal mit `.theme-art-die`.

- **Ein gemalter Rahmen liegt nicht immer im Rand.** Zwei Bauweisen im
  Spiel malen ihn **in** die Innenfläche, und beide hatten denselben
  Fehler: der Inhalt begann trotzdem am Kartenrand.

  1. `border-image-width` **ohne** `border-width`. Die Spielerkarten
     zeichnen so (19/22 px, Boss 26/32 px), eine echte Randbreite bekamen
     sie aber nur unter 540 px (`16-v28-phasen.css`). Auf dem Desktop lagen
     die Namen deshalb halb unter der Leiste. Seit V28.12.29 hält die
     Polsterung ab 541 px genau das Band frei.
  2. Ein `::after` mit `background-size:100% 100%`. So malen die
     Boss-Rush-Gegner ihren Weltrahmen — und dabei bleibt es: die
     `world-*-frame-rect.webp` sind **ungeschnittene Hintergründe, kein
     9-Slice**, `scripts/verify-build.mjs` weist ein `border-image` mit
     ihnen ausdrücklich zurück. Das Band ist damit ein **Anteil** der
     Karte: an den Bildern gemessen bis 9.8 % der Breite je Seite, 27.9 %
     der Höhe oben, 35.5 % unten. Die Polsterung stand bei 19 px an den
     Seiten — einem Drittel davon; im Trio-Boss-Rush war vom Gegnernamen
     nur das Ende zu lesen („...oreman").

  **Die Seiten lassen sich in Prozent lösen, oben und unten nicht.**
  Waagrechte Polsterung rechnet gegen die Breite, und genau die bestimmt
  auch das Seitenband — `padding-inline:11%` sitzt deshalb exakt. Senkrecht
  rechnet Prozent **ebenfalls gegen die Breite**, das Band hängt aber an der
  Höhe, und jede Erhöhung der Polsterung macht die Karte höher und das Band
  mit. Ein Festwert jagt dem hinterher: die Rechnung endet bei einer
  293 px hohen Karte für 107 px Inhalt. Oben und unten bleibt die
  Überlappung deshalb bewusst stehen; dort steht der Name lesbar.

  Gemessen von `scripts/qa/kartenrahmen.mjs` am laufenden Trio-Boss-Rush
  bei 700/1000/1280/1600 px — gegen das Band, das die Karte sich selbst
  gibt, nicht gegen eine Zahl aus dem Stylesheet.

- **Die Emojis im Markup sind die QUELLE, kein Schmutz.**
  `js/36-emoji-sprite-pass.js` ersetzt sie im DOM durch Sprites — für
  Elemente in `ID_ICONS` anhand der Element-ID, für alle anderen anhand des
  Emojis im Text. Wer sie aus `index.html` löscht, nimmt der Stelle ihr
  Symbol. Am 14.09. nachgemessen (`scripts/qa/emoji-rest.mjs`): im
  sichtbaren Spiel steht **kein** rohes Emoji; übrig bleiben nur drei in der
  Testumgebung, die der Pass über `TEST_SELECTOR` bewusst ausnimmt.
  Der Quelltext zählt über 900 Vorkommen — die stecken fast alle in
  `addLog` (unsichtbar), in den Sprachpaketen als Suchschlüssel und in der
  `ICONS`-Tabelle des Passes selbst. **Die Zahl im Quelltext sagt nichts
  über das Bild.**

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
  dort ein.

  **Nachtrag V28.12.21, und eine Lehre:** `.damage-pop` und `.heal-pop` an
  der Spielerkarte hatte ich zunächst ausgelassen, mit der Begründung
  „`#healFx` trägt dieselbe Zahl". Das war zu bequem — die Zahl an der Karte
  sagt, **wen** es getroffen hat, die große in der Mitte nicht. Im Spiel fiel
  genau das auf: beim Counterattack war die Schadenszahl verdeckt, also
  gerade dann, wenn der Schaden entsteht. Beide hingen per `appendChild` *in*
  der Karte und steckten damit in deren Stapelkontext; dagegen hilft keine
  z-index am Element selbst, sie müssen aus der Karte heraus. `cardValuePop`
  (`js/12-battle-ui.js`) hängt sie an den Körper und positioniert sie über
  die Karte, Band 11894.

  Geprüft mit `scripts/qa/popup-schichten.mjs` (25 Zusicherungen). Der Fall
  prüft **nicht** die z-index am Element, sondern ob ein Vorfahre einen
  Stapelkontext unter dem Overlay aufmacht — sonst hätte er das Problem gar
  nicht sehen können.

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
