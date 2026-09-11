# Würfelduell / DiceDuel — Projektregeln

Diese Datei ist die Kurzfassung für jede neue KI-Sitzung, egal welches
Werkzeug. Sie beschreibt die **Regeln**, nicht den Zustand. Der Zustand
steht in `version.json` und `AI_Handover.md` — vor größeren Aufgaben dort
nachlesen.

Antworte auf Deutsch.

---

## Was das ist

Vanilla-JS-PWA, Würfelspiel. Kein Framework, kein Bundler für JavaScript.
Repo: `Wuerfelduell/Wuerfelduell`. Direkte Commits auf `main` sind erlaubt.

## Aufbau

- `js/00-*.js` … `js/43-*.js` — in dieser Reihenfolge in `index.html`
  eingebunden, jede Datei eine IIFE. Keine Module, kein Import.
- `src/styles/legacy/*.css` — **10 Quelldateien**, das sind die zu
  bearbeitenden. `css/app.css` ist erzeugt und wird nie von Hand editiert.
- `lang/de.js`, `lang/en.js`, `lang/en-campaign.js`, `lang/en-changelog.js`
- `assets/ui/v28/png/…` (webp) und `…/svg/…`
- `supabase/migrations/`, `supabase/tests/`
- `scripts/` Build und Validierung, `scripts/qa/` Prüfstände

## Vor jedem Push — ohne Ausnahme

1. `npm run build:styles` — erzeugt `css/app.css` aus den 10 Quellen
2. `node scripts/bump-version.mjs <major.minor.patch>` — setzt die
   Versionsmarker in `index.html`, `js/01-config.js`, `package.json`,
   `sw.js`, `version.json`. **Den Changelog fasst das Skript nicht an.**
3. Changelogeintrag **von Hand** in `index.html` als neuer
   `changelog-entry`-Block ganz oben, plus für **jede** `<li>`-Zeile ein
   wortgleiches Paar in `lang/en-changelog.js` unter `pack.exact`. Fehlt
   das Paar, bleibt die Zeile im Englischen deutsch.
4. `npm run check` muss grün sein — prüft Bündelstand, Versionsmarker,
   Endgame-Daten und Supabase-Struktur.
5. `AI_Handover.md` prüfen: Tabelle unter „Stand" nachziehen, alles
   andere nur bei echter Änderung.

## Bilder und Rahmen

- **Nur vorhandene Assets verwenden.** Keine neu gezeichneten Rahmen,
  keine CSS-Nachbauten eines Bildrahmens.
- **Fehlt ein passendes Asset, danach fragen** — mit Zweck, Format und
  ungefährer Größe. Nicht ersatzweise irgendein anderes Bild nehmen und
  nicht in CSS nachbauen. Der Nutzer liefert schnell; ein Notbehelf
  kostet später mehr. Dasselbe, wenn ein Auftrag nur mit einem hässlichen
  Kompromiss ginge: erst sagen, dann bauen.
- Jede Bild-URL trägt den gemeinsamen Cache-Schlüssel `ASSET_REV` aus
  `js/01-config.js`. JavaScript verwendet die Konstante; HTML, Manifest und
  die CSS-Quellen tragen denselben Wert als Literal, weil CSS keine
  JS-Konstante lesen kann. **Nie ohne `?v=` und keine eigenen Phasen- oder
  Bildrevisionen** — sonst lädt und dekodiert der Browser dasselbe Bild ein
  zweites Mal.
- **Ein Bild ausgetauscht? Revision anheben:**
  `node scripts/bump-version.mjs --assets <major.minor.patch>`, danach
  `npm run build:styles`. Das setzt alle Stellen in einem Zug und bricht
  ab, wenn irgendwo der alte Schlüssel stehen bleibt. Nie von Hand — genau
  diese Handarbeit hat die zwölf auseinandergelaufenen Phasenkonstanten
  erzeugt.
- Die Bildrevision ist **unabhängig von der App-Version**. Ein Release
  ändert den Bild-Cache nicht, und ein Bildwechsel ändert die App-Version
  nicht. `npm run check` schlägt Alarm, sobald eine Bild-URL abweicht oder
  den Schlüssel ganz verliert.
- Rahmen mit Eckornamenten oder Edelsteinen dürfen nicht mit der Boxform
  mitgedehnt werden. Zwei zulässige Techniken:
  - `border-image` mit `border-image-slice` und `border-image-width` im
    **gleichen Verhältnis auf beiden Achsen** — sonst verzerren die Ecken.
  - Kachelgitter aus `<svg viewBox>`-Ausschnitten, wenn das Bild mittige
    Ornamente hat, die aus dem Dehnbereich herausgehalten werden müssen.
    Vorbild: `buttonArtwork` in `js/08-profiles-stats.js`. Bedingung:
    feste Spaltenbreite ÷ Quellbreite = Kachelhöhe ÷ Quellhöhe.
- Füllfarbe reicht bis an die innere Goldkante. Keine hellen
  Zwischenstreifen, keine rechteckigen Unterlagen, keine doppelten
  Umrandungen.
- `border-image-slice` ist **nicht** die sichtbare Rahmenstärke. Abstände
  am Bild messen, nicht am Slice-Wert.

## Sprache

- Quelltext und UI sind deutsch. `lang/en.js` übersetzt über einen
  DOM-Walker: erst `exact`, dann `patterns`, dann Wort für Wort (nur bei
  Texten ≤ 24 Zeichen ohne `.!?`).
- **Fähigkeitsnamen bleiben englisch.** Snake Eyes, Loaded Dice, High
  Stakes und so weiter werden nicht eingedeutscht.
- Jeder neue sichtbare Text braucht seinen `exact`-Eintrag in `lang/en.js`.
  Alles in `<strong>` oder auf einer Plakette **muss** exakt eingetragen
  sein — Wort-für-Wort erzeugt dort Mischformen.

## Online / Supabase

- Alle Schreibzugriffe laufen über `SECURITY DEFINER`-RPCs, die Tabellen
  haben nur SELECT-Regeln. Nie direkt in Tabellen schreiben.
- Im Browser liegt ausschließlich der publishable key.
- **Keine Tokens, Keys oder Zugangsdaten ins Repo oder in den Chat.**

## Feste Entscheidungen — nicht neu aufmachen

- Das Würfeldesign-Feld in der Spielvorbereitung ist reine Anzeige.
- Rahmen, die heute gedehnt dargestellt werden, bleiben so. Leichte
  Streckung ist akzeptiert und wird nur auf ausdrückliche Ansage geändert.
- Die doppelten Changelog-Bezeichnungen vor V28 bleiben unangetastet.
- `.git` ist rund 100 MB. Wird nicht aufgeräumt.
- Kein Modellname in Commits, Pull Requests, Codekommentaren oder
  sonstigen Inhalten im Repo.

## Arbeitsweise

- Kauflogik, Preise, Besitzstände, Spielregeln und Speicherformat
  (`wuerfelduell_save_v1`, `schemaVersion` 8) bleiben unverändert, außer
  die Aufgabe sagt ausdrücklich etwas anderes.
- Änderungen bleiben auf den beauftragten Bildschirm beschränkt. Als
  Vorlage genannte andere Ansichten werden nicht angefasst.
- **Das Messskript vor der Änderung schreiben, gegen die Anforderung —
  nicht gegen die eigene Umsetzung.** Wer seinen eigenen Code prüft,
  sieht seinen eigenen blinden Fleck nicht.
- Geprüft wird im Browser bei 320, 360, 390, 412 und 1280 px, auf Deutsch
  und Englisch. Keine JS-Fehler, keine 404, im Leerlauf 0 DOM-Mutationen
  pro Sekunde.
- Ein Prüfstand ist nur so gut wie der Zustand, den er erreicht. Vor dem
  Vertrauen darauf fragen: welchen Bildschirm sieht er nie?
- **Keine Auswahlfenster.** Rückfragen kommen als normaler Text im Chat.
  Das eingebaute Frage-Werkzeug mit Antwortkacheln (`AskUserQuestion`) wird
  nicht benutzt — der Nutzer antwortet ohnehin frei und genauer, als die
  Kacheln es vorgeben, und die Fenster sind in der App schon einmal
  hängengeblieben. Wo eine naheliegende Wahl existiert: entscheiden,
  umsetzen, und im Abschluss sagen, was gewählt wurde und wie man es
  zurückdreht.
- Commitnachrichten auf Deutsch, sie erklären **warum**, nicht nur was.
- Im Abschluss nennen: geänderte Dateien, tatsächlich verwendete
  Bildassets, durchgeführte Prüfungen.

## Fallen, die hier schon Zeit gekostet haben

Ausführlich in `AI_Handover.md` unter „Fallen in diesem Repo". Die drei
teuersten:

- `js/01-config.js` bis `js/15-app.js` teilen sich einen Scope. Ein
  doppelter `const`-Name über zwei Dateien killt still das ganze Script.
- Die `border`-Kurzform nimmt nur **eine** Breite. `border:16px 21px solid
  transparent` ist ungültig und wirkungslos. Langform schreiben.
- `classList.add()` erzeugt auch dann einen MutationRecord, wenn der Token
  schon da ist — daran hing einmal eine Endlosschleife.
