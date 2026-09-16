# Globale Fähigkeitsstatistik

## Stand und Aufbau

Neue abgeschlossene Kämpfe werden erfasst. Die sechs Dateien sind in index.html
in dieser Reihenfolge eingebunden:

1. 01-contract.js: Datenvertrag, Normalisierung und Eingabeprüfung.
2. 02-outbox.js: transaktionale IndexedDB-Warteschlange und Quittungen.
3. 03-sync.js: kontogebundener Versand über Supabase-RPC.
4. 04-collector.js: Rundenschlüssel, Fähigkeiten und synchrones Offline-Journal.
5. 05-game.js: Spielereignisse, Hauptkonto und Wiederholungsversuche.
6. 06-view.js: öffentliche Ansicht mit Filtern, Level-Aufteilung und Speicher-Cache.

Keine neuen Browser-Laufzeitpakete. Bestehende Profilstatistik und Cloud-Save
bleiben getrennt. Alte lokale Summen werden nicht importiert: Level und Herkunft
fehlen, die Zahlen sind nicht verifiziert.

## Globale Ansicht

Unter der lokalen Profilstatistik, nur bei aktivem Supabase-Backend, auch ohne
Anmeldung. Erst das Öffnen lädt dd_global_ability_stats() und dd_global_stats_count().
Die Antworten bleiben zehn Minuten im Speicher; Aktualisieren lädt erneut.
Die Kampfzahl zählt alle archivierten Reports unabhängig von den Ansichtsfiltern,
nicht die mehrfachen Fähigkeitseinsätze. Ladezeit und Fehlerzustände sind sichtbar.

Standard: menschliche Teilnehmer und dieselbe major.minor-Balanceversion wie
GAME_VERSION. Filter erlauben alle Versionen, Bots, lokale/Online-Quelle sowie
Duell, Kampagne und Boss Rush. Einsätze und Siege werden je Fähigkeit summiert;
Siegquoten werden aus diesen Summen berechnet. Unter 30 Einsätzen steht „kleine
Stichprobe“; bei Winrate-Sortierung stehen diese Zeilen zuletzt. Aufklappen zeigt
Level 0/1/2. Fähigkeitsnamen bleiben in beiden Sprachen englisch.

## Zählregel

Ein Einsatz ist eine am Kampfende ausgerüstete Fähigkeit eines Teilnehmers,
kein einzelner Tastendruck. Frühere, ausgewechselte Fähigkeiten zählen nicht.
Pro Teilnehmer zählt jede Fähigkeit höchstens einmal. Alle Fähigkeiten des
Siegers erhalten einen Sieg. In Kampagne und Boss Rush zählt das gesamte
siegreiche Team, einschließlich bereits ausgeschiedener Teammitglieder.
Tutorial, Testumgebung, abgebrochene Kämpfe und reine Bot-Runden zählen nicht.

Gespeichert werden Fähigkeit, Level 0/1/2, Herkunft start/later, menschlicher
oder Bot-Teilnehmer, lokale/Online-Quelle, Modus, Version, Teilnehmerzahl und
Bot-Beteiligung. Die globale RPC liefert Einsätze, Siege und Siegquote, keine
Namen, Konto-, Profil-, Raum- oder Ereigniskennungen. Quoten in der späteren
Anzeige aus summierten Siegen/Einsätzen berechnen. Kleine Stichproben sichtbar
kennzeichnen; verschiedene Balanceversionen nicht unbesehen zusammenwerfen.

## Hauptkonto und Offline

Das angemeldete dauerhafte Supabase-Konto ist automatisch das Hauptkonto.
Lokale Profile sind Teilnehmer darunter; sie werden nicht verschmolzen.
Die Zuordnung wird beim Rundenstart festgehalten. Ohne Hauptkonto begonnene
lokale Runden werden keinem später angemeldeten Konto zugeschlagen.
Offline gilt die zuletzt bestätigte Zuordnung. Abmelden entfernt sie für
neue Runden, aber löscht keine ausstehenden Beiträge des bisherigen Kontos.

Am lokalen Kampfende schreibt der Collector synchron ein eigenes
localStorage-Journal pro Ereignis. Danach übernimmt IndexedDB die Meldung.
Nur eine passende Anmeldung darf sie übertragen. Wiederverbindung, Anmeldung,
Kampfende und der Knopf im Account-Bereich lösen den Versand aus. Bei Fehlern
folgen Wiederholungen mit 5 bis 60 Sekunden Abstand. Speicherung und Versand
zeigen Fehler im Account-Bereich an; der laufende Kampf wird nicht abgebrochen.

IndexedDB begrenzt ausstehende Meldungen auf 5000; das Journal bleibt bei
Überlauf erhalten. Quittungen und serverseitige Eindeutigkeit verhindern
Doppelzählung. Website-Daten löschen kann ungesendete Beiträge verlieren.
Der Browser-Speicher ist kein Backup. Beim Sync-Start werden höchstens 500
Quittungen älter als sieben Tage samt zugehörigem Journal entfernt. Alte
Quittungen ohne Zeitstempel erhalten einmalig den aktuellen Fristbeginn.
Server-Einträge mit DD_STATS_INVALID_REPORT, DD_STATS_OWNER_CONFLICT oder
DD_STATS_REPORT_CONFLICT werden als rejected gespeichert und übersprungen;
Netzwerk- und RATE_LIMIT-Fehler bleiben zur Wiederholung stehen. Der Account
zeigt nur die Anzahl abgewiesener Meldungen und „Abgewiesene verwerfen“.
Verwerfen löscht ausschließlich abgewiesene Einträge des angemeldeten Kontos.

## Online-Abschluss

Der Host übermittelt alle Teilnehmer zusammen im finalen Spielzustand.
Der Snapshot enthält Rundenschlüssel und Anfangsfähigkeiten auch für Reloads.
Der Datenbank-Trigger archiviert das Ergebnis in derselben Transaktion wie
den finalen State. Raumlöschung und Revanche entfernen die Statistik nicht.
Gäste senden keine zweite Meldung. Ereignis-ID sowie Raum/Match/Runde sind
eindeutig. Widersprüchliche Statistikmeldungen werden abgewiesen, der Spielzustand
wird trotzdem gespeichert. Der Trigger fängt Statistikfehler ab und protokolliert
Raum, Match, Rundennummer aus dem Spielzustand (sonst null), SQLSTATE, Fehlermeldung
und Zeitpunkt in der privaten Tabelle capture_errors. Schlägt auch deren Insert
fehl, bleibt ein PostgreSQL-Logeintrag; der Kampfabschluss bleibt erhalten.
Nach jedem Fehler-Insert werden Einträge älter als 30 Tage entfernt und je
Raum/Match die jüngsten 20 behalten (Zeitpunkt, dann ID als Gleichstandsregel).
Die Bereinigung läuft in derselben inneren Fehlerbehandlung: schlägt sie fehl,
werden Insert und Bereinigung zurückgerollt, der Spielzustand bleibt gespeichert.
Ohne neue Erfassungsfehler findet keine zeitgesteuerte Bereinigung statt.

Host, Match, Modus, Version, Rundennummer, Gewinner und Teilnehmerzahl werden
geprüft. Ältere Clients ohne Meldung und Hosts mit anonymer Auth bleiben
spielbar, tragen aber nicht bei. Bereits laufende Runden alter Versionen
werden nicht rückwirkend ergänzt.

## Supabase

Migrationen:
- 20260916135541_online_stats_foundation.sql
- 20260916141907_online_stats_capture.sql
- 20260916143946_online_stats_unarmed_bots.sql
- 20260916160029_online_stats_capture_fail_open.sql
- 20260916164750_online_stats_retention.sql

Alle fünf Migrationen wurden am 16.09.2026 live eingespielt und geprüft. Die vierte wurde über die echte Match-Publish-RPC geprüft. Für die fünfte wurden 25 Fehler, die 31-/29-Tage-Grenze, ein absichtlich fehlschlagender DELETE und öffentliche Zählrechte live geprüft; sämtliche Testdaten und Testfunktionen wurden zurückgerollt. Die vier vorherigen Migrationen bleiben unverändert.

Private Tabellen dd_stats_private.reports und ability_uses besitzen RLS und
keine Client-Rechte. dd_submit_stats_report(uuid,jsonb) ist nur angemeldet
aufrufbar, dd_global_ability_stats() und dd_global_stats_count() öffentlich.
SECURITY DEFINER ist für diese APIs beabsichtigt, mit leerem search_path und qualifizierten Tabellen.
Der private Trigger ist nicht durch Clients aufrufbar.

Maximal 10000 neue Meldungen pro Konto in 24 Stunden; parallele Uploads werden
pro Konto serialisiert. Konto-Löschung entfernt dessen Beiträge per FK.
Offline-Ergebnisse und vom Host berechnete Online-Ergebnisse sind keine
unabhängig verifizierten Spielnachweise. Keine Belohnungen daraus ableiten.

## Prüfung

npm ci
npx playwright install chromium
npm run check

Tests für Vertrag, Speicher, Wiederholung, Kontowechsel, Offline-Nachlieferung,
Gastprofile, Team-Siege, SQL-Rechte und atomaren Online-Abschluss laufen mit
Fake-IndexedDB und isoliertem PostgreSQL/PGlite. online-stats-view.mjs läuft
ebenfalls in npm run check: feste RPC-Antworten, Filter, Quoten, Cache und
Zustände; 320/360/390/412/1280 px jeweils DE/EN, ohne JS-Fehler, 404, Überlauf
oder Leerlaufmutationen. Chromium: /opt/pw-browsers/chromium, falls vorhanden,
sonst Playwright-Installation; WD_CHROMIUM kann den Pfad überschreiben.
Offen bleibt der Spieltest durch den Nutzer mit zwei real angemeldeten Geräten;
die isolierten Tests ersetzen weder Auth-Netzwerk noch Browser-Speicherquoten.
First Blood: Gegner ohne Fähigkeit erzeugen keine Fähigkeitszeile, der Heldeneinsatz zählt.

Advisor: Private Tabellen haben absichtlich keine Client-Policies (deny all).
Die öffentliche Aggregat-RPC ist absichtlich SECURITY DEFINER:
https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
