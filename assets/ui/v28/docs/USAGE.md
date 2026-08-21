# Einbauhinweise

## Hintergründe

```css
.screen-main-menu {
  background: #f7f0df url("../png/backgrounds/main-menu.png") center / cover no-repeat;
}

.screen-lobby {
  background: #071526 url("../png/backgrounds/navy-lobby-profile.png") center / cover no-repeat;
}

.screen-boss {
  background: #050712 url("../png/backgrounds/boss-finale.png") center / cover no-repeat;
}
```

## 9-Slice mit `border-image`

```css
.navy-action {
  border: 44px solid transparent;
  border-image-source: url("../png/frames/navy-button-horizontal.png");
  border-image-slice: 92 170 92 170 fill;
  border-image-width: 30px 58px;
  color: #fff8e8;
}

.ability-choice {
  border: 38px solid transparent;
  border-image-source: url("../png/frames/ability-choice-card.png");
  border-image-slice: 84 165 84 230 fill;
  border-image-width: 28px 52px 28px 72px;
  color: #092b59;
}
```

Die Insets beziehen sich auf die Originalpixel im PNG. Wenn die Engine eigene 9-Slice-Metadaten
verwendet, die Werte direkt aus `asset-manifest.json` übernehmen. Die ornamental starken Randzonen
nicht kleiner als angegeben skalieren.

## Ability-Zeile: nur Icon · Nummer · Name

```html
<button class="ability-choice">
  <img src="assets/svg/abilities/03-glueckswurf.svg" alt="">
  <span class="ability-number">3</span>
  <span class="ability-name">Glückswurf</span>
</button>
```

```css
.ability-choice {
  display: grid;
  grid-template-columns: 52px 3ch 1fr;
  align-items: center;
  gap: 10px;
}

.ability-choice img {
  width: 48px;
  height: 48px;
}
```

Beschreibungstext wird bewusst nicht in dieser Zeile gerendert. Nummer, Name und Sprache bleiben
vollständig dynamisch. Das Mapping aller 24 Dateien steht in `ability-icons.json`.

## Campaign-Node und grüner Encounter-Button

`campaign-node-farm-frame.png` enthält absichtlich weder Nummer noch Bezeichnung. Dadurch bleiben
Levelnummer und FARM/BOSS/CHALLENGE vollständig dynamisch und übersetzbar.

```html
<article class="campaign-node farm-node">
  <img src="assets/png/components/campaign-node-farm-frame.png" alt="">
  <strong class="node-number">15</strong>
  <span class="node-name">Farm</span>
</article>
```

```css
.encounter-button {
  border: 42px solid transparent;
  border-image-source: url("../png/components/encounter-button-green.png");
  border-image-slice: 130 260 130 260 fill;
  border-image-width: 30px 68px;
  color: #fff8e8;
}
```

Crossed-Swords-Icon und lokalisierter Buttontext werden als eigene Layer gesetzt.

## Gerenderte Medaillons

`hp-heart-medallion.png`, `completed-check-medallion.png` und `back-button.png` immer proportional
mit `object-fit: contain` skalieren; niemals 9-Slice verwenden. Der neue breite Goldpfeil liegt auch
als `svg/navigation/back.svg` und `svg/navigation/back-arrow.svg` vor.

## Active Player

```css
.player-card {
  position: relative;
  border-image: url("../png/frames/player-card-combat.png") 96 122 fill / 34px 44px;
}

.player-card.is-active::after {
  content: "";
  position: absolute;
  inset: -8px;
  pointer-events: none;
  background: url("../png/frames/active-player-glow.png") center / 100% 100% no-repeat;
  mix-blend-mode: screen;
}
```

## Normales SVG

```html
<img class="game-icon" src="assets/svg/gameplay/heart-hp.svg" alt="HP">
```

```css
.game-icon { width: 48px; height: 48px; }
```

## SVG-Sprite v2

```html
<svg class="game-icon" viewBox="0 0 64 64" aria-label="Glückswurf">
  <use href="assets/svg/icon-sprite-v2.svg#ability-03-glueckswurf"></use>
</svg>
```

Sprite-Präfixe: `nav-`, `game-` und `ability-`.

## VFX-Overlay

```css
.reward-glow::before {
  content: "";
  position: absolute;
  inset: -35%;
  pointer-events: none;
  background: url("../png/fx/divine-burst-gold.png") center / contain no-repeat;
  mix-blend-mode: screen;
  opacity: .8;
}
```
