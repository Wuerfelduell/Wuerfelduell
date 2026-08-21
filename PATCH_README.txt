DiceDuel V28.2.0 — Full Bright Arcane UI Rework

PAKET
- Vollständiges Repository auf Basis von Wuerfelduell V28.0.2.
- Kein inkrementeller Patch: index.html im enthaltenen Ordner direkt öffnen oder den
  vollständigen Ordner als Repository verwenden.
- Die bestehende Ordnerstruktur wurde nicht umgeschichtet. Ergänzt wurden nur neue
  Asset-Unterordner sowie css/15-v28-ui-rework.css und js/28-v28-ui-rework.js.

UI-REWORK
- komplettes offizielles DiceDuel UI Asset Pack unter assets/ui/v28 integriert
- Main Menu mit echten Button-, Icon-, Badge-, Crest- und Hintergrund-Assets
- Setup und reguläre Select-Felder mit einem mobilen DiceDuel-Picker statt grauem
  Android-Nativmenü; isolierte Test-Labs bleiben unangetastet
- Campaign-Hubs, World Tabs, Nodes, Detailkarten und Mastery-Leisten neu gestaltet
- Boss-/Finale-Detailrahmen als echte Layoutfläche mit sicherem Innenabstand umgesetzt
- Campaign-Modus-Popup: Titel und Solo/Duo/Trio-Schaltflächen ohne Überlagerung
- Zweitfähigkeits-Popup: Titelplakette, Kartenabstände und 24 echte Ability-Icons
- Profile, Achievements und Trophy Shop auf das neue Navy/Gold/Elfenbein-System gehoben
- Combat mit Player-Card-Assets, Active-Player-Glow, Boss-Flächen und Gameplay-Icons
- mobile Breakpoints für schmale Android-Displays ergänzt

TECHNIK
- Gameplay-, Save-, Campaign- und Online-Logik unverändert
- neue UI-Observer sind auf relevante Screen- und Inhaltsbereiche begrenzt
- V28.0.1 Button-Hotfix bleibt erhalten
- Cache-Key und interne Buildanzeige: 28.2.0
