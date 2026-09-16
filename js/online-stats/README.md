# Globale Fähigkeitsstatistik – Grundlage

## Stand

Dieses Verzeichnis enthält die separat testbare Grundlage. Die Dateien sind
**noch nicht in index.html eingebunden**. Es gibt noch keine automatische
Erfassung, Hauptkonto-Auswahl, globale Ansicht oder Übernahme alter Summen.
Die Migration ist vorbereitet; das Einspielen gehört zur späteren Aktivierung.
Bestehende Profilstatistiken und das Save-Schema bleiben unverändert.

## Dateien und Ladereihenfolge

1. 01-contract.js: kanonische, validierte Meldung ohne Personendaten.
2. 02-outbox.js: IndexedDB-Warteschlange, fest an das Hauptkonto gebunden.
3. 03-sync.js: quittierter Versand und Supabase-RPC-Adapter.

Die IIFEs stellen ausschließlich window.WDOnlineStats bereit. Beim Laden
werden weder eine Datenbank geöffnet noch Auth-Aufrufe oder Timer gestartet.
Keine neuen Laufzeitpakete im Browser; die npm-Pakete dienen nur den Tests.

## Zählregel

Ein Einsatz ist eine Fähigkeit eines Teilnehmers in einem abgeschlossenen
Kampf. Gastprofile zählen als menschliche Teilnehmer unter dem Hauptkonto.
Bots sind markiert und separat auswertbar. Genau ein Teilnehmer gewinnt;
alle seine erfassten Fähigkeiten erhalten einen Sieg. Reine Bot-Kämpfe und
abgebrochene Kämpfe sind nicht zugelassen.

Die Meldung speichert Sitznummern, keine Namen oder dauerhaften Profil-IDs.
Eine Fähigkeit kommt je Teilnehmer höchstens einmal vor. Level 0/1/2 und
Herkunft start, later oder unknown werden getrennt ausgewertet.
Welche zugeteilten bzw. ausgetauschten Fähigkeiten tatsächlich zu melden sind,
muss der folgende Spieladapter konsistent erfassen; aus Endstands-HTML darf
das nicht geraten werden. Die Kennzahlen belegen Zusammenhänge, keine
isolierte kausale Stärke einer Fähigkeit.

Dimensionen: lokal/online, Modus, Spielversion, Teilnehmerzahl,
Bot-Beteiligung, menschlicher/Bot-Einsatz, Fähigkeit, Level und Herkunft.
Das Ergebnis liefert Einsätze, Siege und Siegquote. Die spätere Anzeige muss
Quoten aus summierten Siegen/Einsätzen berechnen, nicht Prozentwerte mitteln.
Kleine Stichproben kennzeichnen; keine Rangfolge allein aus einem einzelnen
Sieg ableiten. Spielversionen erst nach einer Balance-Zuordnung bündeln.

## Hauptkonto und Offline-Verhalten

Das Hauptkonto ist eine dauerhafte Supabase-Auth-Identität. Ein lokales
Spielerprofil ist kein Auth-Konto und kann nicht dazu umbenannt werden.
Mehrere lokale Profile werden dadurch nicht miteinander verschmolzen.

Vor Kampfbeginn braucht der folgende Adapter eine feste Hauptkonto-ID und eine
stabile Kampfkennung. Ohne diese Zuordnung darf er keine Meldung automatisch
dem später zufällig angemeldeten Konto zuschlagen. Offline kann das zuvor
bestätigte Hauptkonto verwendet werden; übertragen wird erst wieder mit
passender angemeldeter Identität. Gast-Auth-Identitäten sind keine Hauptkonten.

Die Warteschlange speichert mit IndexedDB-Transaktionen pro Ereignis.
Einträge sind vom Cloud-Save getrennt, damit ein alter Save keine Zähler
zurücksetzt. Bestätigungen bleiben als lokale Kennung mit Vergleichsinhalt
erhalten, damit wiederholte Endbildschirme keinen neuen Versand erzeugen.
Auch die Datenbank erzwingt Eindeutigkeit. Die Warteschlange begrenzt ausstehende
Meldungen auf 5000 und meldet Überlauf, statt ältere Einträge zu löschen.
Speicherfehler müssen vom späteren Adapter sichtbar behandelt werden.

IndexedDB ist kein Backup: Löschen der Website-Daten oder Speicherbereinigung
kann noch nicht übertragene Meldungen entfernen. Bestätigte Meldungen bleiben
serverseitig erhalten. Lokale Quittungen werden derzeit nicht automatisch
entfernt; eine spätere Aufbewahrungsregel darf die Serversperre nicht entfernen.

## Online-Duplikate und Raumende

Nur der Host meldet alle Teilnehmer gemeinsam. Zusätzlich zur Ereignis-ID
sichert die Datenbank (room_id, match_id, round_number) global eindeutig ab.
Zwei unterschiedliche Ereignis-IDs für dieselbe Online-Runde zählen deshalb
nicht doppelt. Der Server prüft Host, aktuelles Match, Modus und Version.

**Die erste Meldung muss vor Raumlöschung bzw. Revanche akzeptiert werden.**
Bereits gespeicherte Meldungen können danach erneut quittiert werden.
Der folgende Spieladapter muss den Abschluss deshalb mit dem Raum-Lebenszyklus
verbinden (idealerweise atomar mit dem finalen State). Ein bloßer Aufruf nach
Verlassen wäre unzuverlässig. Bis dieser Anschluss besteht, bleibt die
automatische Erfassung deaktiviert. Der Gast sendet keine zweite Meldung.

Ein bereits erledigter Kampf muss beim Reload dieselbe Kennung behalten.
Eine zufällige neue ID bei jedem Rendern würde die lokale Duplikatsperre
wirkungslos machen. Neue Runden bekommen eigene Kennungen.

## Schnittstellen

- normalizeReport(report): prüft und normalisiert die Meldung.
- createOutbox(): öffnet die separate IndexedDB.
- outbox.enqueue(mainAccountId, report): reiht dauerhaft ein.
- createSync({outbox, getSession, send}): erstellt den Synchronisierer.
- createSupabaseSender(client): erstellt send für den Supabase-Client.
- sync.flush(): versucht die ausstehenden Meldungen des angemeldeten Kontos.

Der vollständige Datenvertrag und ausführbare Beispiele stehen in
scripts/qa/online-stats.mjs. Eine Meldung enthält schema_version=1,
event_id (UUID), source (local/online), game_version, mode_id, round_number,
room_id/match_id (lokal null), und players. Pro Teilnehmer: seat, is_bot,
won und abilities mit id (1–25), level (0–2), acquired (start/later/unknown).

Der Normalisierer sortiert Sitze/Fähigkeiten und entfernt unbekannte Felder.
Der Server lehnt unbekannte Felder ab. Meldungen sind nach Bestätigung
unveränderlich; gleiche Kennung mit anderem Inhalt ist ein Konflikt.

flush arbeitet ohne Hintergrundtimer, mit höchstens einem Lauf pro Instanz.
Netzfehler, falsche Quittung und Serverfehler behalten die Meldung und liefern
retry mit Fehler zurück. Ein dauerhaft ungültiger Eintrag stoppt den Lauf;
die spätere Oberfläche muss eine Reparatur-/Diagnosemöglichkeit anbieten.
Kontowechsel stoppt vor der nächsten Meldung. Der RPC prüft das Konto zusätzlich,
falls die Session zwischen lokaler Prüfung und Versand wechselt.

## Supabase

Migration: supabase/migrations/20260916135541_online_stats_foundation.sql.

- dd_stats_private.reports: unveränderliche Meldungen, kontogebunden.
- dd_stats_private.ability_uses: Einsätze pro Fähigkeit/Teilnehmer.
- dd_submit_stats_report(uuid,jsonb): prüft Hauptkonto und Eingaben,
  schreibt Meldung und Einsätze in einer Transaktion.
- dd_global_ability_stats(): öffentliche Aggregate ohne Konto-,
  Profil-, Raum- oder Ereigniskennungen.

Die privaten Tabellen haben RLS und keine Client-Rechte. Beide öffentlichen
Funktionen sind absichtlich SECURITY DEFINER, mit leerem search_path,
voll qualifizierten Tabellen und gezielt vergebenem EXECUTE-Recht.
Ein entsprechender Advisor-Hinweis ist für genau diese APIs erwartet.
Das Löschen eines Auth-Kontos entfernt derzeit auch dessen Beiträge per
Fremdschlüssel; die Aggregate werden daraus neu berechnet.

Der Server kann Offline-Ergebnisse nicht unabhängig nachspielen. Auch die
Online-Regeln rechnet weiterhin der Host. Die Prüfung schützt vor normalen
Doppelmeldungen und fremden Konto-Zuordnungen, nicht vor erfundenen Ergebnissen
eines manipulierten Clients oder abgesprochenen Spielen. Es gibt noch kein
Rate-Limit und keine automatische Missbrauchserkennung; vor öffentlicher
Aktivierung ergänzen. Keine Belohnungen oder Wettbewerbsränge daran hängen.

## Tests und nächste Schritte

npm ci --ignore-scripts && npm run check:online-stats

Die Tests verwenden Fake-IndexedDB sowie isoliertes PostgreSQL in PGlite.
Sie erzeugen keine echten Konten, Räume oder Statistiken. Sie prüfen nicht
Supabase Auth/PostgREST, echte Netzwerkparallelität oder Browser-Speicherquoten.

Nächster Abschnitt: Hauptkonto-Zuordnung, persistente Rundenschlüssel und
Spielereignis-Adapter einschließlich Online-Abschluss; danach Migration
einspielen und mit zwei Geräten testen. Anschließend globale Ansicht,
Altbestand separat und einmalig importieren, Betriebsgrenzen ergänzen.
