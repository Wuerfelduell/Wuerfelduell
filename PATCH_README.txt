DiceDuel V28.1.0 — Bright Arcane Asset System PATCH

Basis:
- Auf V28.0.2 Asset UI Patch installieren.
- Dies ist weiterhin NUR ein Patch, kein komplettes Repository.

Installation:
1. Inhalt dieses Ordners in den Root deines bestehenden DiceDuel-Repositories kopieren.
2. Vorhandene Dateien ersetzen.
3. Wichtig: Der Asset-Ordner heißt exakt assets/ui/v28 (kleines v).
4. Danach Seite/App einmal komplett neu laden.

V28.1.0 Schwerpunkt:
- kompletter offizieller UI-Asset-Pack eingebaut
- echte SVG-Icons im Hauptmenü statt Emojis
- Main Menu mit Crest, Arcane Halo, Ivory-/Gold-Buttons und Navy-Tiles weiter gepolisht
- Campaign/Setup/Utility-Screens bekommen den hellen Campaign-/Mastery-Hintergrund
- große Screens erhalten echte Ivory-Gold-Panelrahmen
- Back-Buttons verwenden das neue SVG-System
- Campaign-Hubs, World Tabs, Nodes, Mastery-Strip und Boss/Prestige-Details neu gestylt
- Modal-/Popup-Rahmen für Campaign Picker, Quit, Ability Drafts, Round-End usw.
- Ability-Picker vor dem Spiel bleibt bewusst kompakt: Nummer + Name, KEINE Beschreibung
- Mastery erhält Navy/Gold-Branches plus echtes Mastery-Frame
- Combat bekommt den dunklen Arena-Hintergrund, Navy/Gold-HUD, aktive Player-Glow und Boss-Banner
- Achievement-Toasts nutzen den Gold-Burst dezent als VFX
- Gameplay-, Save-, Campaign- und Online-Logik unverändert

Technische Sicherheit:
- kein globaler MutationObserver auf Buttons oder Controls
- neue Observer beobachten ausschließlich Top-Level-Screen-Sichtbarkeit bzw. Campaign-Detail-Inhalt
- V28.0.1 Button-Hotfix bleibt erhalten
