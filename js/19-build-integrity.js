(() => {
  const EXPECTED = "27.5.3";
  const checks = {
    config: (typeof GAME_VERSION !== "undefined" && GAME_VERSION === EXPECTED),
    saveSchema: (typeof SAVE_SCHEMA_VERSION !== "undefined" && Number(SAVE_SCHEMA_VERSION) >= 8),
    achievements: (typeof ACHIEVEMENTS !== "undefined" &&
      !!ACHIEVEMENTS.straight &&
      !!ACHIEVEMENTS.backstab &&
      !!ACHIEVEMENTS.vampiric_touch &&
      !!ACHIEVEMENTS.perfectly_useless),
    attackFxConfig: (typeof ATTACK_FX_STYLES !== "undefined" &&
      !!ATTACK_FX_STYLES.classic &&
      !!ATTACK_FX_STYLES.flame &&
      !!ATTACK_FX_STYLES.venom &&
      !!ATTACK_FX_STYLES.crown),
    attackFxEngine: !!window.WDAttackFx
  };

  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  window.__WD_BUILD_INTEGRITY__ = { expected: EXPECTED, ok: failed.length === 0, failed };

  if (!failed.length) {
    console.info(`[Würfelduell] Build ${EXPECTED} vollständig geladen.`);
    return;
  }

  console.error(`[Würfelduell] Mischbuild erkannt. Fehlend/alt: ${failed.join(", ")}`);
  const warning = document.createElement("div");
  warning.id = "wdBuildMismatch";
  warning.textContent = `⚠️ UPDATE-MISCHBUILD · ${failed.join(", ")} · Seite komplett neu laden`;
  Object.assign(warning.style, {
    position: "fixed",
    left: "8px",
    right: "8px",
    bottom: "8px",
    zIndex: "999999",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "rgba(115,15,15,.96)",
    color: "#fff",
    fontWeight: "800",
    fontSize: "12px",
    textAlign: "center",
    boxShadow: "0 8px 30px rgba(0,0,0,.45)"
  });
  document.body.appendChild(warning);
})();