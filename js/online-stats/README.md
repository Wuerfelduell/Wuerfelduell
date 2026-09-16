# Globale Fähigkeitsstatistik

## Stand und Aufbau

Neue abgeschlossene Kämpfe werden erfasst. Die fünf Dateien sind in index.html
in dieser Reihenfolge eingebunden:

1. 01-contract.js: Datenvertrag, Normalisierung und Eingabeprüfung.
2. 02-outbox.js: transaktionale IndexedDB-Warteschlange und Quittungen.
3. 03-sync.js: kontogebundener Versand über Supabase-RPC.
4. 04-collector.js: Rundenschlüssel, Fähigkeiten und synchrones Offline-Journal.
5. 05-game.js: Spielereignisse, Hauptkonto und Wiederholungsversuche.

Keine neuen Browser-Laufzeitpakete. Bestehende Profilstatistik und Cloud-Save
bleiben getrennt. Globale Ansicht und einmaliger Import alter Summen sind offen.

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
Der Browser-Speicher ist kein Backup. Lokale Quittungen werden noch nicht
aufgeräumt. Ein ungültiger Eintrag stoppt den Versand dieses Kontos; eine
weitergehende Diagnose-/Reparaturansicht bleibt offen.

## Online-Abschluss

Der Host übermittelt alle Teilnehmer zusammen im finalen Spielzustand.
Der Snapshot enthält Rundenschlüssel und Anfangsfähigkeiten auch für Reloads.
Der Datenbank-Trigger archiviert das Ergebnis in derselben Transaktion wie
den finalen State. Raumlöschung und Revanche entfernen die Statistik nicht.
Gäste senden keine zweite Meldung. Ereignis-ID sowie Raum/Match/Runde sind
eindeutig. Widersprüchliche Wiederholungen werden abgewiesen.

Host, Match, Modus, Version, Rundennummer, Gewinner und Teilnehmerzahl werden
geprüft. Ältere Clients ohne Meldung und Hosts mit anonymer Auth bleiben
spielbar, tragen aber nicht bei. Bereits laufende Runden alter Versionen
werden nicht rückwirkend ergänzt.

## Supabase

Migrationen:
- 20260916135541_online_stats_foundation.sql
- 20260916141907_online_stats_capture.sql

Private Tabellen dd_stats_private.reports und ability_uses besitzen RLS und
keine Client-Rechte. dd_submit_stats_report(uuid,jsonb) ist nur angemeldet
aufrufbar, dd_global_ability_stats() öffentlich. SECURITY DEFINER ist für diese
beiden APIs beabsichtigt, mit leerem search_path und qualifizierten Tabellen.
Der private Trigger ist nicht durch Clients aufrufbar.

Maximal 10000 neue Meldungen pro Konto in 24 Stunden; parallele Uploads werden
pro Konto serialisiert. Konto-Löschung entfernt dessen Beiträge per FK.
Offline-Ergebnisse und vom Host berechnete Online-Ergebnisse sind keine
unabhängig verifizierten Spielnachweise. Keine Belohnungen daraus ableiten.

## Prüfung

npm ci --ignore-scripts
npm run check

Tests für Vertrag, Speicher, Wiederholung, Kontowechsel, Offline-Nachlieferung,
Gastprofile, Team-Siege, SQL-Rechte und atomaren Online-Abschluss laufen mit
Fake-IndexedDB und isoliertem PostgreSQL/PGlite. Browser-Ansicht separat prüfen.
Ein kompletter Spieltest mit zwei real angemeldeten Geräten bleibt sinnvoll;
die isolierten Tests ersetzen weder Auth-Netzwerk noch Browser-Speicherquoten.