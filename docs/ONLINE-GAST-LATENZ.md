# Vorgezogene Online-Wuerfe – Pruefstand vom 15.09.2026

Branch: `online-guest-latency`, V28.12.34. Nicht nach `main` gemergt.
Basis: `main` bei `9cbdcae`, darauf Schritt 0 bei `472f995`.
Produktionsaenderung: `2f22cc6`.

## Umsetzung

- `js/13-battle-actions.js`: `animateIndices` zieht jeden Wert genau einmal
  vor dem Timer. Beim Aufdecken endet rolling; Twelve-Heilung und Log bleiben
  dort. `renderAll` und der bisherige Finalizer laufen anschliessend.
- `js/12-battle-ui.js`: waehrend rolling bleiben die bisherigen angezeigten
  Augen und die Summe stehen. Auch DOM-Werte, Beschriftung und flacher
  Kompatibilitaetsrenderer geben den vorgezogenen Wert nicht preis.
- `js/17-online-bridge.js`: Hauptwuerfe mit gueltigen vorgezogenen Augen
  werden beim Gast festgeschrieben. Pending und dessen Timer werden erst
  durch den Endstand aufgehoben; Pakete bleiben nach seq geordnet.
- Die fuenf Aufrufer bleiben unveraendert. Die eigene Finalfunktion des
  Glueckswurf-Rerolls (`rollTrackedD6Excluding`) und die Optionssignatur bleiben
  erhalten. Snake Eyes und die beiden Angriffspfade verwenden weiterhin
  ihre bisherigen Finalizer.
- `tickSpecialDie`, Gambling, High Stakes und Gegenangriff verwenden ihre
  eigenen Ziehungs-/Animationspfade und wurden nicht umgestellt. Deren
  Zwischenstand behaelt die Vorschau. Fuer diese Pfade wird keine
  Latenzverbesserung behauptet.
- Bestehende nachtraegliche Spielregeln bleiben im Finalizer: zum Beispiel
  kann First Strike L2 beim Aufdecken noch einen garantierten Treffer setzen.
  Solche Korrekturen kommen mit dem Endstand; fruehe Augen sind kein Recht
  auf eine weitere Aktion.
- Versionsmarker per `bump-version.mjs`, DE/EN-Changelog und Handover
  aktualisiert. Keine Bildassets oder CSS-Quellen geaendert;
  `css/app.css` nur mit dem Buildskript erzeugt und ohne eigenen Diff.

## Lokale Nachweise

- `node scripts/qa/wurf-vorab.mjs`: bestanden. Werte vor Timer, genau eine
  Ziehung, eigene Finalfunktion, leere Auswahl, 430/250 ms, Heilungszeitpunkt,
  fruehe Snapshot-Anwendung und unveraenderte Pending-/Timer-Sperre.
- Gegenprobe mit demselben Skript und `WD_SOURCE_ROOT` auf `472f995`:
  faellt wie gefordert an „Wert muss vor dem ersten Timer feststehen“
  (`1 !== 6`). Das Skript wurde vor der Produktionsaenderung erstellt und
  zuerst gegen den alten Stand ausgefuehrt.
- `node scripts/qa/online-protokoll.mjs`: bestanden. Zwei echte Browser,
  kontrollierter Transport, fruehe echte Augen bei weiterhin gesperrtem
  Gast, spaete/doppelte Pakete, serielle Publish-Warteschlange, einmalige
  Schadens-/Combat-FX, unveraenderter 8000-ms-Abbruch. DE/EN bei
  320/360/390/412/1280 px; keine JS-Fehler oder HTTP-Fehler.
- Klassischer Wuerfel, Artwork und flache Darstellung: der Host verbirgt
  Augen und Summe bis zum Aufdecken. Im Test werden Darstellungsmodus,
  HTML-Klasse und frische Nodes zusammen gesetzt.
- `npm run build:styles`, `npm run check`: bestanden auf V28.12.34.

Lokale Transportzeiten sind ausdruecklich keine Live-Latenzmessungen.

## Live-Aufbau

Alle Laeufe verwenden das echte konfigurierte Supabase-Projekt und denselben
Messabschnitt mit sechs Aktionen. Die urspruenglichen festen Aufbaupausen
reichten hier mehrfach nicht: Anmeldung und Lobbyaufbau waren noch offen,
beim ersten Kontrollwurf war der Gast nach sieben Sekunden noch nicht fertig.
Der Pruefstand wartet jetzt vor der Messung auf die tatsaechlichen Zustaende
(maximal 45 Sekunden). Definition und Beginn von sichtbar/bestaetigt,
Mess-Timeout und Pending-Timeout wurden nicht verlaengert oder geaendert.

Runtime: Node 24.19.0, Playwright und Chromium 153.0.8010.0;
Supabase-JS 2.114.0. Browser und QA-Abhaengigkeiten liegen ausserhalb des Repo.
Der regulaere Browserdownload scheiterte an Timeouts/502; das Chromium aus
`@sparticuz/chromium` wurde stattdessen verwendet.

## Live-Ergebnisse: Nachweis nicht erbracht

Keiner der folgenden Gesamtlaeufe bestand. Die Mittelwerte fehlgeschlagener
oder unvollstaendiger Laeufe sind Diagnose, kein belastbarer A/B-Vergleich.
Alle Rohberichte stehen in `ONLINE-GAST-LATENZ.json`.

| Fassung / Lauf | Aktionen | mittelSichtbarMs | mittelBestaetigtMs | Ergebnis |
| --- | ---: | ---: | ---: | --- |
| Vorher 1 (`vorher-aktuell-1`) | 6/6 | 1547 | 1547 | Kontrollwurf vor Messung nicht synchron |
| Vorher 2 (`vorher-aktuell-2`) | 0/6 | null | null | Timeout bei erster Messaktion |
| Nachher 1 | 0/6 | null | null | Fixture-Sequenz kommt nicht rechtzeitig |
| Nachher 2 | 0/6 | null | null | Fixture-Sequenz kommt nicht rechtzeitig |
| Nachher Diagnose 1 | 1/6 | 1403 | 2404 | Timeout beim Sichern |
| Nachher Diagnose 2 | 2/6 | 1153 | 1677 | Timeout beim Restwurf |

In den beiden Nachher-Diagnosen war der erste Basiswurf sichtbar nach
1403 bzw. 1263 ms und bestaetigt nach 2404 bzw. 2311 ms. Das sind 1001 bzw.
1048 ms Vorsprung fuer genau diese Einzelaktion. Wegen der folgenden Abbrueche
wird daraus weder ein mittlerer Gewinn noch ein erfolgreicher Live-Nachweis
abgeleitet. Insbesondere werden die Mittel ueber eine oder zwei Aktionen
nicht mit dem Vorher-Mittel ueber sechs verglichen.

Beim letzten Abbruch hatten beide Seiten seq 7 und phase `base_ready`,
der erste Wuerfel war gesichert. Der Gast zeigte nach Ablauf des unveraenderten
Timers „Host antwortet nicht. Aktion abgebrochen.“. Es war keine Abweichung
zwischen den Sequenzen sichtbar. Ob Anfrage, Verarbeitung oder Zustellung
stockte, ist mit diesem Befund nicht abschliessend geklaert. Ein einzelner
separater Auth-Endpunkt-Aufruf brauchte in dieser Umgebung 12926 ms bis zur
HTTP-401-Antwort; das ist ebenfalls keine Spiel-Latenzmessung.

**Offen:** zwei vollstaendige bestandene Live-Laeufe je Fassung unter
vergleichbaren Bedingungen. Die Umsetzung ist lokal geprueft, der Auftrag
mit seinem geforderten Live-Nachweis ist noch nicht abgeschlossen.


Die GitHub-Verbindung veroeffentlicht dieselben Git-Baeume wie lokal geprueft.
Die Commit-IDs unterscheiden sich wegen der ueber die API erzeugten Metadaten;
Basisbaum 6f3e463184852e372445467e8ded5383430312e7 und Produktionsbaum
493addfb641ce0b54788e2e7ac6423a3d799143c stimmen exakt ueberein.
Waehrend der Tests ist main mit weiteren Artwork-Aenderungen auf 260d23a
weitergelaufen; die dokumentierte Vergleichsbasis bleibt 9cbdcae.
