# Gemeinsame Kampf-Engine – Funktionsinventar

Ausgelagert aus `docs/SERVER-ENGINE-ENTWURF.md` (17.09.), damit der Entwurf
kurz bleibt und je Schritt nur die betroffenen Zeilen gelesen werden.
Zeilenangaben beziehen sich auf die Phase-1-Fassung (V28.13.2); der
Funktionsname ist maßgeblich.


### Inventar der Zufallsquellen

| Datei/Funktion (Zeile in Phase 1) | Zweck | Behandlung |
|---|---|---|
| `03d-endgame-mechanics.js:105`, `chooseHuntedHero` | Markierten Helden ziehen | WDRng; explizite Testquelle weiterhin möglich |
| `06-campaign.js:1147`, `pickRandomTrioStartAbility` | Trio-Startfähigkeit | WDRng |
| `08-profiles-stats.js:32,88`, `shuffledCopy`, `randomizePlayerOrder` | Sitz-/Gegnerreihenfolge | WDRng |
| `09-battle-stats.js:1,2`, `randAbilityRoll`, `randD4` | W25 und W4 | WDRng |
| `10-bots.js:6,11`, `randDieForPlayer` | W6 einschließlich Lucky-Gewichtung | WDRng |
| `10-bots.js:77,83,478`, `botPickAbility`, `botShouldGambleHighStakes` | Botentscheidungen | WDRng |
| `11-setup.js:4`, `randomUniqueAbilityIds` | Startfähigkeiten mischen | WDRng |
| `12-battle-ui.js:45`, `campaignEnemyAttackTarget` | Zufälliges gültiges Gegnerziel | WDRng; wird derzeit auch von UI/Bot-Bewertungen gelesen, in Phase 2 einmalig als Regelentscheidung festlegen |
| `13-battle-actions.js:230`, `randomSecondAbilityChoices` | Bonusfähigkeitsdraft | WDRng |
| `13-battle-actions.js:31,787` | Animierte W6-/W4-Augen, ohne Regelwirkung | `WDRng.visual`, kein Verbrauch des Replay-Streams |
| `21-test-lab.js:290` | Testwürfel 5 oder 6 | WDRng |
| `37-duo-boss-rush.js:112`, `44-trio-boss-rush.js:141`, `shuffled` | Perks/Loadouts und Rush-Auswahl | WDRng |
| `online/01-online.js:105,334,338` | Online-Sitzreihenfolge und Startfähigkeiten | WDRng; keine Änderung des Transportformats |
| `04-save.js:128,134,137`, `42-supabase-account.js:14`, `online/01-online.js:113,117,343` | IDs, Tags, Raumcode-Fallback | Unverändert, keine Kampfentscheidung |
| `16-audio.js`, `18-attack-fx.js`, übrige `21-test-lab.js`-Ziehungen | Audio/Partikel/FX | Unverändert, separater visueller Zufall |
| `20-v276.js:9`, `randomPick` | Zufällige Kosmetik | Unverändert |
| `45-kistentest.js`, `46-shop-daten.js` | Kisten/Kauf und Partikel | Ausdrücklich außerhalb des Auftrags, unverändert |

Indirekte Ziehungen über `randDie`, `rollTrackedD6`, `rollTrackedD6Excluding`,
`randAbilityRoll`, `randD4` und Shuffle-Helfer laufen damit ebenfalls über den
Adapter. `14-round-flow` und `23-mastery` haben keine eigene Math.random-Stelle.
Weitere Entkopplungsrisiken: `Date.now` in Ereignis-/Statistikmetadaten, Timer,
DOM-Auswahlwerte und implizite `window.WDMastery`-/`WDBossRush`-Aufrufe. Sie sind
keine zusätzlichen Zufallsquellen, aber für State-Vergleiche explizit zu trennen.

### Funktionen

Zeilen beziehen sich auf diese Phase-1-Fassung. Die 311 benannten Funktionsdeklarationen
der sieben Dateien sind aufgeführt, einschließlich verschachtelter Helfer;
die benannte Pfeilfunktion und die Debug-Methode stehen ergänzend am Tabellenende.
Anonyme Listener/Wrapper sind der umgebenden Funktion bzw. dem IIFE zugeordnet.
R = reine Berechnung aus Parametern/statischen Definitionen; G = Regellogik ohne
eigene DOM-Ausgabe, aber mit globalem Zustand/Zufall (noch nicht rein);
U = Darstellung/DOM/Animation/Audio; M = vermischte Regel-, Darstellungs- oder
Persistenzverantwortung, auch über aufgerufene Helfer. Konservative Einstufung:
M ist ein Trennauftrag, keine Behauptung, dass jede Ausführung DOM verändert.

| Datei | Funktion | Zeilen | Einstufung |
|---|---|---:|---|
| `js/03d-endgame-mechanics.js` | `inferEnemyRole` | 37–42 | R |
| `js/03d-endgame-mechanics.js` | `defaultAiForRole` | 43–43 | R |
| `js/03d-endgame-mechanics.js` | `bossPhaseThresholdsCrossed` | 44–49 | R |
| `js/03d-endgame-mechanics.js` | `endgameEncounterKind` | 50–50 | R |
| `js/03d-endgame-mechanics.js` | `applyEndgameMechanics` | 51–72 | G |
| `js/03d-endgame-mechanics.js` | `setEndgameBossPhases` | 79–79 | G |
| `js/03d-endgame-mechanics.js` | `campaignMechanicSummary` | 87–94 | U |
| `js/03d-endgame-mechanics.js` | `campaignWorldDescription` | 95–95 | U |
| `js/03d-endgame-mechanics.js` | `campaignMechanicDetailHtml` | 96–96 | U |
| `js/03d-endgame-mechanics.js` | `buildCampaignEnemyPlayer` | 97–102 | G |
| `js/03d-endgame-mechanics.js` | `getActiveWorldRule` | 103–103 | G |
| `js/03d-endgame-mechanics.js` | `chooseValidMarkedHero` | 104–104 | G |
| `js/03d-endgame-mechanics.js` | `chooseHuntedHero` | 105–105 | G |
| `js/03d-endgame-mechanics.js` | `applyWorldRuleOnEncounterStart` | 106–106 | G |
| `js/03d-endgame-mechanics.js` | `queueOneShotDamageBonus` | 107–107 | G |
| `js/03d-endgame-mechanics.js` | `commitOneShotDamageBonuses` | 108–108 | G |
| `js/03d-endgame-mechanics.js` | `worldRuleDamageBonus` | 109–109 | G |
| `js/03d-endgame-mechanics.js` | `applyWorldRuleAfterAttack` | 110–110 | G |
| `js/03d-endgame-mechanics.js` | `applyWorldRuleOnEnemyTurn` | 111–111 | M |
| `js/03d-endgame-mechanics.js` | `campaignOutgoingDamageModifier` | 115–115 | G |
| `js/03d-endgame-mechanics.js` | `campaignIncomingDamageModifier` | 116–116 | G |
| `js/03d-endgame-mechanics.js` | `initializeEncounterMechanics` | 117–117 | M |
| `js/03d-endgame-mechanics.js` | `updateEncounterEscalation` | 118–118 | M |
| `js/03d-endgame-mechanics.js` | `campaignAfterSuccessfulAttack` | 119–119 | M |
| `js/03d-endgame-mechanics.js` | `campaignHandleDeathReaction` | 120–120 | M |
| `js/03d-endgame-mechanics.js` | `awardEndgameEncounterAchievements` | 130–130 | M |
| `js/09-battle-stats.js` | `randAbilityRoll` | 1–1 | G |
| `js/09-battle-stats.js` | `randD4` | 2–2 | G |
| `js/09-battle-stats.js` | `resetRoundStats` | 4–23 | M |
| `js/09-battle-stats.js` | `recordD6` | 25–32 | M |
| `js/09-battle-stats.js` | `recordSelfDamage` | 34–39 | M |
| `js/09-battle-stats.js` | `rollTrackedD6` | 41–46 | M |
| `js/09-battle-stats.js` | `rollTrackedD6Excluding` | 48–54 | M |
| `js/09-battle-stats.js` | `applyTwelveHeal` | 56–82 | M |
| `js/09-battle-stats.js` | `isUniqueUnderdog` | 84–94 | G |
| `js/09-battle-stats.js` | `prepareBloodRushForTurn` | 96–115 | M |
| `js/09-battle-stats.js` | `activateBloodRushForMainAttack` | 117–129 | M |
| `js/09-battle-stats.js` | `activateBloodRushMidAttackIfEligible` | 131–147 | M |
| `js/09-battle-stats.js` | `consumeBloodRushForCounter` | 149–159 | G |
| `js/09-battle-stats.js` | `recordDamageDealt` | 161–172 | G |
| `js/09-battle-stats.js` | `noteCampaignHeroAttack` | 174–180 | G |
| `js/09-battle-stats.js` | `campaignLastHeroAttacker` | 182–197 | G |
| `js/09-battle-stats.js` | `recordCampaignRawDamage` | 199–211 | G |
| `js/09-battle-stats.js` | `recordCampaignAttackResult` | 212–217 | G |
| `js/09-battle-stats.js` | `recordCampaignEnemyElimination` | 218–225 | G |
| `js/09-battle-stats.js` | `recordCampaignKill` | 226–231 | M |
| `js/09-battle-stats.js` | `recordHealing` | 233–238 | M |
| `js/09-battle-stats.js` | `statLeader` | 240–248 | G |
| `js/09-battle-stats.js` | `statZeilen` | 256–259 | U |
| `js/09-battle-stats.js` | `renderRoundStats` | 261–295 | U |
| `js/10-bots.js` | `randDieForPlayer` | 1–12 | G |
| `js/10-bots.js` | `randDie` | 14–16 | G |
| `js/10-bots.js` | `freshDice` | 18–20 | G |
| `js/10-bots.js` | `escapeHtml` | 21–23 | R |
| `js/10-bots.js` | `defaultSeatFor` | 25–27 | R |
| `js/10-bots.js` | `isBotPlayer` | 30–32 | G |
| `js/10-bots.js` | `setupBotLevel` | 34–36 | U |
| `js/10-bots.js` | `botLevelLabel` | 38–40 | G |
| `js/10-bots.js` | `botAbilitySynergyScore` | 42–65 | G |
| `js/10-bots.js` | `botPickAbility` | 67–89 | G |
| `js/10-bots.js` | `syncSetupBotChoice` | 91–120 | U |
| `js/10-bots.js` | `clearBotAutomation` | 122–129 | U |
| `js/10-bots.js` | `botActionOwner` | 131–150 | M |
| `js/10-bots.js` | `scheduleBotAction` | 152–168 | M |
| `js/10-bots.js` | `botBaseFinalUtility` | 170–208 | G |
| `js/10-bots.js` | `botDieProb` | 210–216 | G |
| `js/10-bots.js` | `botPopCount` | 218–225 | R |
| `js/10-bots.js` | `botHardBestLocks` | 227–326 | G |
| `js/10-bots.js` | `futureValue` | 237–282 | G |
| `js/10-bots.js` | `enumerate` | 246–277 | G |
| `js/10-bots.js` | `botChooseBaseLocks` | 328–369 | G |
| `js/10-bots.js` | `botShouldUseLoaded` | 371–421 | G |
| `js/10-bots.js` | `botShouldUseBloodPrice` | 423–463 | G |
| `js/10-bots.js` | `botShouldUseSecondChance` | 465–468 | G |
| `js/10-bots.js` | `botShouldGambleHighStakes` | 470–496 | G |
| `js/10-bots.js` | `snakeEyesGroup` | 498–512 | G |
| `js/10-bots.js` | `botHandleBaseSelect` | 514–542 | M |
| `js/10-bots.js` | `botHandleAttackReady` | 544–552 | M |
| `js/10-bots.js` | `botPickSecondAbility` | 554–557 | G |
| `js/10-bots.js` | `performBotAction` | 559–620 | M |
| `js/12-battle-ui.js` | `aliveCount` | 1–1 | G |
| `js/12-battle-ui.js` | `nextAlive` | 2–7 | G |
| `js/12-battle-ui.js` | `campaignTeamIndices` | 9–13 | G |
| `js/12-battle-ui.js` | `campaignEnemyUsesRotatingTarget` | 15–26 | G |
| `js/12-battle-ui.js` | `campaignEnemyAttackTarget` | 28–62 | G |
| `js/12-battle-ui.js` | `commitCampaignEnemyAttackTarget` | 64–77 | M |
| `js/12-battle-ui.js` | `nextAttackTarget` | 79–88 | G |
| `js/12-battle-ui.js` | `combatLogText` | 94–100 | U |
| `js/12-battle-ui.js` | `addLog` | 101–105 | U |
| `js/12-battle-ui.js` | `battleSheetCopy` | 115–129 | U |
| `js/12-battle-ui.js` | `battleSheetHasContent` | 130–132 | U |
| `js/12-battle-ui.js` | `renderBattleSheetInfo` | 133–158 | U |
| `js/12-battle-ui.js` | `renderBattleSheetLog` | 159–178 | U |
| `js/12-battle-ui.js` | `openBattleSheet` | 179–187 | U |
| `js/12-battle-ui.js` | `closeBattleSheet` | 188–188 | U |
| `js/12-battle-ui.js` | `refreshBattleInfoButton` | 191–199 | U |
| `js/12-battle-ui.js` | `maxHpForPlayer` | 200–204 | G |
| `js/12-battle-ui.js` | `applyHealingToPlayer` | 208–228 | M |
| `js/12-battle-ui.js` | `playerAbilities` | 230–234 | G |
| `js/12-battle-ui.js` | `hasAbility` | 236–239 | G |
| `js/12-battle-ui.js` | `currentAbility` | 241–243 | G |
| `js/12-battle-ui.js` | `renderPlayers` | 245–283 | U |
| `js/12-battle-ui.js` | `applySeatRotation` | 285–319 | U |
| `js/12-battle-ui.js` | `testLabDieSymbol` | 324–324 | U |
| `js/12-battle-ui.js` | `diceArtworkAsset` | 327–332 | U |
| `js/12-battle-ui.js` | `clearDiceArtwork` | 333–337 | U |
| `js/12-battle-ui.js` | `applyDiceArtwork` | 338–347 | U |
| `js/12-battle-ui.js` | `galaxyA50CompatibilityMode` | 352–360 | U |
| `js/12-battle-ui.js` | `ensureSpecialPipDieStructure` | 375–394 | U |
| `js/12-battle-ui.js` | `renderSpecialPipDie` | 396–409 | U |
| `js/12-battle-ui.js` | `ensure3DDieStructure` | 411–436 | U |
| `js/12-battle-ui.js` | `stampArtFaces` | 438–455 | U |
| `js/12-battle-ui.js` | `ensureArtSprite` | 457–469 | U |
| `js/12-battle-ui.js` | `applyArtCube` | 471–484 | U |
| `js/12-battle-ui.js` | `renderSpecialDieFace` | 486–520 | U |
| `js/12-battle-ui.js` | `sizeSpecialCube` | 547–553 | U |
| `js/12-battle-ui.js` | `messeSpecialCube` | 555–568 | U |
| `js/12-battle-ui.js` | `render3DDieNode` | 570–596 | U |
| `js/12-battle-ui.js` | `ensureFlatDieStructure` | 598–617 | U |
| `js/12-battle-ui.js` | `renderFlatDieNode` | 619–627 | U |
| `js/12-battle-ui.js` | `currentSum` | 629–629 | G |
| `js/12-battle-ui.js` | `stackingDamageBonus` | 630–637 | G |
| `js/12-battle-ui.js` | `isNormalAttackHitValue` | 639–642 | G |
| `js/12-battle-ui.js` | `damagePerAttackHit` | 644–651 | G |
| `js/12-battle-ui.js` | `precisionHitDamage` | 653–655 | G |
| `js/12-battle-ui.js` | `totalAttackDamage` | 656–656 | G |
| `js/12-battle-ui.js` | `ensureKantenlaeufer` | 668–682 | U |
| `js/12-battle-ui.js` | `renderDice` | 684–718 | U |
| `js/12-battle-ui.js` | `updateHeader` | 720–806 | U |
| `js/12-battle-ui.js` | `campaignEnemyTargets` | 808–812 | G |
| `js/12-battle-ui.js` | `renderCampaignTargetChoices` | 813–819 | U |
| `js/12-battle-ui.js` | `chooseCampaignAttackTarget` | 820–826 | M |
| `js/12-battle-ui.js` | `battleAction` | 828–837 | U |
| `js/12-battle-ui.js` | `hideAllControls` | 838–843 | U |
| `js/12-battle-ui.js` | `updateButtons` | 844–947 | U |
| `js/12-battle-ui.js` | `queueEventPopup` | 950–953 | U |
| `js/12-battle-ui.js` | `runEventPopupQueue` | 955–973 | U |
| `js/12-battle-ui.js` | `cardValuePop` | 982–992 | U |
| `js/12-battle-ui.js` | `playDamageAnimation` | 994–1016 | U |
| `js/12-battle-ui.js` | `playHealAnimation` | 1018–1040 | U |
| `js/12-battle-ui.js` | `flushPendingFx` | 1042–1071 | U |
| `js/12-battle-ui.js` | `renderAll` | 1073–1085 | M |
| `js/13-battle-actions.js` | `animateIndices` | 1–21 | M |
| `js/13-battle-actions.js` | `tickSpecialDie` | 29–32 | U |
| `js/13-battle-actions.js` | `isStraightFive` | 34–37 | R |
| `js/13-battle-actions.js` | `isFullHouseFive` | 39–44 | R |
| `js/13-battle-actions.js` | `resetFirstClassStreak` | 46–48 | G |
| `js/13-battle-actions.js` | `recordAttackDamageForAchievements` | 50–62 | M |
| `js/13-battle-actions.js` | `rollBase` | 64–82 | M |
| `js/13-battle-actions.js` | `useBaseReroll` | 84–115 | M |
| `js/13-battle-actions.js` | `useLoadedDice` | 118–159 | M |
| `js/13-battle-actions.js` | `useSnakeEyes` | 161–194 | M |
| `js/13-battle-actions.js` | `lockSelected` | 196–217 | M |
| `js/13-battle-actions.js` | `randomSecondAbilityChoices` | 220–234 | G |
| `js/13-battle-actions.js` | `campaignBonusDraftSlot` | 236–245 | G |
| `js/13-battle-actions.js` | `maybeTriggerCampaignStandardBonusDraft` | 247–264 | M |
| `js/13-battle-actions.js` | `bonusAbilityRuleFor` | 266–278 | G |
| `js/13-battle-actions.js` | `maybeTriggerLocalBonusDraft` | 280–301 | M |
| `js/13-battle-actions.js` | `maybeTriggerSecondAbility` | 303–321 | M |
| `js/13-battle-actions.js` | `openAbilityDraftForSlot` | 323–357 | M |
| `js/13-battle-actions.js` | `openSecondAbilityDraft` | 359–365 | M |
| `js/13-battle-actions.js` | `maybeTriggerCampaignKillAbilityDraft` | 371–391 | M |
| `js/13-battle-actions.js` | `maybeTriggerKillBonusDraft` | 393–397 | M |
| `js/13-battle-actions.js` | `chooseSecondAbility` | 399–462 | M |
| `js/13-battle-actions.js` | `applyDamageToPlayer` | 464–493 | M |
| `js/13-battle-actions.js` | `nextRicochetTarget` | 495–505 | G |
| `js/13-battle-actions.js` | `nextRicochetTargetExcluding` | 507–516 | G |
| `js/13-battle-actions.js` | `triggerToxicBomb` | 518–551 | M |
| `js/13-battle-actions.js` | `markEliminated` | 553–559 | M |
| `js/13-battle-actions.js` | `beginAttackWithFace` | 562–577 | M |
| `js/13-battle-actions.js` | `initializeAttackAfterTarget` | 579–625 | M |
| `js/13-battle-actions.js` | `openGamblingMan` | 627–642 | M |
| `js/13-battle-actions.js` | `rollGamblingMan` | 644–677 | M |
| `js/13-battle-actions.js` | `offerGamblingRetry` | 680–685 | M |
| `js/13-battle-actions.js` | `startGamblingRetry` | 686–689 | M |
| `js/13-battle-actions.js` | `declineGamblingRetry` | 690–692 | M |
| `js/13-battle-actions.js` | `openPerfect25` | 694–707 | M |
| `js/13-battle-actions.js` | `queuePerfect25` | 709–715 | M |
| `js/13-battle-actions.js` | `rollPerfect25` | 717–763 | M |
| `js/13-battle-actions.js` | `openPerfect25D4` | 765–776 | M |
| `js/13-battle-actions.js` | `rollPerfect25D4` | 778–808 | M |
| `js/13-battle-actions.js` | `openHighStakes` | 810–823 | M |
| `js/13-battle-actions.js` | `skipHighStakes` | 825–829 | M |
| `js/13-battle-actions.js` | `rollHighStakes` | 831–880 | M |
| `js/13-battle-actions.js` | `openInsurance` | 883–897 | M |
| `js/13-battle-actions.js` | `resolveBaseSelfDamage` | 899–905 | M |
| `js/13-battle-actions.js` | `applyBaseSelfDamage` | 907–948 | M |
| `js/13-battle-actions.js` | `rollInsurance` | 950–991 | M |
| `js/13-battle-actions.js` | `masteryMomentumFail` | 993–997 | G |
| `js/13-battle-actions.js` | `resolveBase` | 999–1054 | M |
| `js/13-battle-actions.js` | `useBloodPrice` | 1056–1100 | M |
| `js/13-battle-actions.js` | `useBloodRushSelfHarm` | 1102–1115 | M |
| `js/13-battle-actions.js` | `rollAttack` | 1117–1182 | M |
| `js/13-battle-actions.js` | `useAttackPower` | 1184–1213 | M |
| `js/13-battle-actions.js` | `retireWildcardAfterRoll` | 1215–1217 | G |
| `js/13-battle-actions.js` | `continueDoubleTapAttack` | 1219–1229 | M |
| `js/13-battle-actions.js` | `resolveCurrentAttackRoll` | 1231–1301 | M |
| `js/13-battle-actions.js` | `dealAttackDamage` | 1303–1345 | M |
| `js/13-battle-actions.js` | `counterattackDamagePerHit` | 1349–1359 | G |
| `js/13-battle-actions.js` | `queueCounterattack` | 1361–1371 | M |
| `js/13-battle-actions.js` | `renderCounterDice` | 1373–1393 | U |
| `js/13-battle-actions.js` | `openCounterattack` | 1395–1429 | M |
| `js/13-battle-actions.js` | `finishCounterattackDamage` | 1431–1552 | M |
| `js/13-battle-actions.js` | `rollCounterattack` | 1554–1620 | M |
| `js/13-battle-actions.js` | `finishAttackAfterCounter` | 1622–1632 | M |
| `js/13-battle-actions.js` | `finalizeAttackDamage` | 1634–1789 | M |
| `js/13-battle-actions.js` | `finishBaseTurn` | 1791–1808 | M |
| `js/13-battle-actions.js` | `endTurn` | 1810–1817 | M |
| `js/13-battle-actions.js` | `applyMasteryPoisonTurnStart` | 1819–1823 | M |
| `js/13-battle-actions.js` | `advanceTurn` | 1825–1860 | M |
| `js/13-battle-actions.js` | `checkWinner` | 1862–1957 | M |
| `js/14-round-flow.js` | `makeAbilityChoiceSelect` | 1–12 | U |
| `js/14-round-flow.js` | `makeSpecialAbilityChoiceSelect` | 14–19 | U |
| `js/14-round-flow.js` | `prepareNextRound` | 21–91 | M |
| `js/14-round-flow.js` | `startNextRound` | 93–165 | M |
| `js/23-mastery.js` | `normalizeAbilityLevels` | 73–82 | R |
| `js/23-mastery.js` | `defaults` | 84–86 | R |
| `js/23-mastery.js` | `normalize` | 88–104 | R |
| `js/23-mastery.js` | `normalizeInPlace` | 106–111 | G |
| `js/23-mastery.js` | `ensureModes` | 113–133 | G |
| `js/23-mastery.js` | `ensure` | 135–138 | G |
| `js/23-mastery.js` | `perkCost` | 140–140 | R |
| `js/23-mastery.js` | `branchSpent` | 141–141 | R |
| `js/23-mastery.js` | `abilitySpent` | 142–144 | R |
| `js/23-mastery.js` | `totalSpent` | 145–148 | G |
| `js/23-mastery.js` | `modeLabel` | 150–150 | R |
| `js/23-mastery.js` | `soloWorldIndex` | 151–151 | G |
| `js/23-mastery.js` | `duoWorldIndex` | 152–152 | G |
| `js/23-mastery.js` | `trioWorldIndex` | 153–153 | G |
| `js/23-mastery.js` | `encounterLevelInWorld` | 154–162 | G |
| `js/23-mastery.js` | `encounterEligible` | 165–177 | G |
| `js/23-mastery.js` | `standardEligible` | 180–191 | G |
| `js/23-mastery.js` | `completedSetForMode` | 193–203 | G |
| `js/23-mastery.js` | `modeUnlocked` | 205–219 | G |
| `js/23-mastery.js` | `hpBonus` | 221–221 | G |
| `js/23-mastery.js` | `damageBonus` | 222–222 | G |
| `js/23-mastery.js` | `abilityThreshold` | 223–223 | G |
| `js/23-mastery.js` | `currentBattleMode` | 225–229 | G |
| `js/23-mastery.js` | `isJuergenProfile` | 232–235 | R |
| `js/23-mastery.js` | `abilityLevel` | 236–238 | G |
| `js/23-mastery.js` | `l2Unlocked` | 240–242 | G |
| `js/23-mastery.js` | `l2Progress` | 243–245 | G |
| `js/23-mastery.js` | `l2ChallengeEligible` | 246–252 | G |
| `js/23-mastery.js` | `playerProfileAndMode` | 254–265 | G |
| `js/23-mastery.js` | `l2TrackingContext` | 278–283 | G |
| `js/23-mastery.js` | `unlockL2ForPlayer` | 284–293 | M |
| `js/23-mastery.js` | `addL2Progress` | 294–301 | M |
| `js/23-mastery.js` | `runState` | 302–313 | G |
| `js/23-mastery.js` | `noteAbilityUse` | 314–319 | G |
| `js/23-mastery.js` | `noteSelfDamage` | 320–332 | M |
| `js/23-mastery.js` | `noteHealing` | 333–341 | M |
| `js/23-mastery.js` | `noteKill` | 342–349 | M |
| `js/23-mastery.js` | `noteAttackRoll` | 350–361 | M |
| `js/23-mastery.js` | `noteRerolledSixes` | 362–364 | M |
| `js/23-mastery.js` | `noteAnyD6` | 365–367 | M |
| `js/23-mastery.js` | `noteAttackStart` | 368–381 | M |
| `js/23-mastery.js` | `noteAttackResolved` | 382–390 | M |
| `js/23-mastery.js` | `notePoison` | 391–396 | M |
| `js/23-mastery.js` | `noteInsurance` | 397–402 | M |
| `js/23-mastery.js` | `noteCounterDamage` | 403–408 | M |
| `js/23-mastery.js` | `noteTurnStart` | 409–420 | M |
| `js/23-mastery.js` | `notePerfect25Base` | 421–426 | M |
| `js/23-mastery.js` | `notePerfect25Break` | 427–430 | G |
| `js/23-mastery.js` | `notePerfect25Permit` | 431–436 | M |
| `js/23-mastery.js` | `notePerfect25D4` | 437–441 | M |
| `js/23-mastery.js` | `noteMatchEnd` | 442–446 | M |
| `js/23-mastery.js` | `abilityLevelForPlayer` | 448–459 | G |
| `js/23-mastery.js` | `hasAbilityUpgrade` | 460–460 | G |
| `js/23-mastery.js` | `damageBonusForPlayer` | 462–469 | G |
| `js/23-mastery.js` | `abilityThresholdForPlayer` | 470–477 | G |
| `js/23-mastery.js` | `isBossMasteryEncounter` | 479–488 | R |
| `js/23-mastery.js` | `xpReward` | 490–494 | R |
| `js/23-mastery.js` | `awardXp` | 496–502 | G |
| `js/23-mastery.js` | `profileIdsForMode` | 504–508 | U |
| `js/23-mastery.js` | `profilesForMode` | 509–509 | U |
| `js/23-mastery.js` | `selectedMasteryProfile` | 510–513 | U |
| `js/23-mastery.js` | `branchData` | 515–522 | G |
| `js/23-mastery.js` | `standardNode` | 523–526 | U |
| `js/23-mastery.js` | `closePurchaseConfirm` | 527–532 | U |
| `js/23-mastery.js` | `resolveMasteryProfile` | 534–544 | G |
| `js/23-mastery.js` | `executeMasteryPurchase` | 546–618 | M |
| `js/23-mastery.js` | `ensurePurchaseConfirm` | 620–642 | U |
| `js/23-mastery.js` | `showPurchaseConfirm` | 644–659 | U |
| `js/23-mastery.js` | `bossXpBalance` | 662–665 | G |
| `js/23-mastery.js` | `renderBossXpConversion` | 667–689 | U |
| `js/23-mastery.js` | `renderStandard` | 691–718 | U |
| `js/23-mastery.js` | `abilityUnlockSequence` | 720–732 | G |
| `js/23-mastery.js` | `abilityGate` | 733–736 | G |
| `js/23-mastery.js` | `abilityGateLabel` | 737–741 | U |
| `js/23-mastery.js` | `abilityGateReached` | 742–746 | G |
| `js/23-mastery.js` | `abilityNode` | 748–763 | U |
| `js/23-mastery.js` | `abilityBranch` | 764–766 | U |
| `js/23-mastery.js` | `abilityPair` | 767–769 | U |
| `js/23-mastery.js` | `standaloneCard` | 770–773 | U |
| `js/23-mastery.js` | `showAbilityInfo` | 775–780 | U |
| `js/23-mastery.js` | `renderAbilitySheet` | 781–825 | U |
| `js/23-mastery.js` | `renderProfilePicker` | 827–830 | U |
| `js/23-mastery.js` | `renderModal` | 831–834 | U |
| `js/23-mastery.js` | `open` | 835–837 | U |
| `js/23-mastery.js` | `close` | 838–838 | U |
| `js/23-mastery.js` | `summaryFor` | 839–839 | U |
| `js/23-mastery.js` | `refreshMode` | 840–843 | U |
| `js/23-mastery.js` | `refreshAll` | 844–844 | U |
| `js/23-mastery.js` | `refreshCampaignUi` | 845–845 | U |
| `js/23-mastery.js` | `retroCompletedEncountersForProfile` | 847–869 | G |
| `js/23-mastery.js` | `applyRetroBackfill` | 871–913 | M |
| `js/23-mastery.js` | `findProfileByNames` | 915–918 | G |
| `js/23-mastery.js` | `stripJuergenPrecisionOnce` | 919–934 | M |
| `js/23-mastery.js` | `applyTrioThreefoldVerdictRetro` | 935–957 | M |
| `js/23-mastery.js` | `init` | 959–1014 | M |
| `js/23-mastery.js` | `abilityUpgrade` | 1017–1021 | G |
| `js/03d-endgame-mechanics.js` | `WDEndgameDebug.inspect` | 132 | G |
| `js/23-mastery.js` | `tr` (in `showAbilityInfo`) | 776 | U |
