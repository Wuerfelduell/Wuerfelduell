(() => {
  "use strict";

  // DiceDuel Audio Layer · V26.1.7
  // Absichtlich vollständig isoliert vom Spielstand und von der Battle-/Campaign-Logik.
  const AUDIO_KEY = "wuerfelduell_audio_v1";
  const DEFAULTS = { enabled: true, volume: 0.24 };

  const SCENES = {
    menu: {
      bpm: 76,
      root: 48,
      scale: [0, 3, 7, 10, 12, 15, 19],
      arp: [0, 2, 1, 3, 0, 4, 2, 1, 0, 3, 1, 4, 2, 5, 3, 1],
      bass: [0, null, null, null, 0, null, 3, null, 5, null, null, null, 3, null, 2, null],
      chords: [[0, 3, 7], [3, 7, 10], [5, 8, 12], [2, 5, 10]],
      leadType: "triangle",
      bassType: "sine",
      leadGain: 0.035,
      bassGain: 0.045,
      padGain: 0.018,
      percussion: false
    },
    campaign: {
      bpm: 88,
      root: 50,
      scale: [0, 2, 3, 7, 9, 10, 14],
      arp: [0, 1, 3, 4, 2, 3, 5, 4, 0, 2, 4, 5, 3, 6, 5, 2],
      bass: [0, null, 0, null, 3, null, 2, null, 5, null, 3, null, 2, null, 1, null],
      chords: [[0, 3, 7], [2, 5, 9], [3, 7, 10], [0, 5, 9]],
      leadType: "triangle",
      bassType: "sine",
      leadGain: 0.038,
      bassGain: 0.05,
      padGain: 0.018,
      percussion: false
    },
    battle: {
      bpm: 112,
      root: 40,
      scale: [0, 1, 3, 5, 7, 8, 10, 12],
      arp: [0, 2, 4, 2, 5, 3, 4, 1, 0, 3, 5, 4, 6, 5, 3, 2],
      bass: [0, null, 0, 3, 5, null, 3, null, 0, null, 5, 3, 6, null, 5, null],
      chords: [[0, 3, 7], [1, 5, 8], [3, 7, 10], [0, 5, 8]],
      leadType: "triangle",
      bassType: "sine",
      leadGain: 0.021,
      bassGain: 0.043,
      padGain: 0.010,
      percussion: true
    },
    boss: {
      bpm: 126,
      root: 35,
      scale: [0, 1, 3, 6, 7, 8, 10, 12],
      arp: [0, 3, 1, 4, 2, 5, 3, 6, 0, 4, 1, 5, 2, 6, 4, 3],
      bass: [0, 0, null, 3, 6, null, 1, null, 0, null, 6, 3, 7, null, 6, 1],
      chords: [[0, 3, 6], [1, 6, 8], [3, 7, 10], [0, 6, 10]],
      leadType: "triangle",
      bassType: "triangle",
      leadGain: 0.019,
      bassGain: 0.045,
      padGain: 0.009,
      percussion: true,
      heavy: true
    }
  };

  let state = loadState();
  let ctx = null;
  let master = null;
  let compressor = null;
  let masterFilter = null;
  let noiseBuffer = null;
  let scheduler = null;
  let nextNoteTime = 0;
  let step = 0;
  let scene = "menu";
  let unlocked = false;

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(AUDIO_KEY) || "null");
      return {
        enabled: raw?.enabled !== false,
        volume: clamp(Number.isFinite(Number(raw?.volume)) ? Number(raw.volume) : DEFAULTS.volume, 0, 0.6)
      };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  function saveState() {
    try { localStorage.setItem(AUDIO_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function midiToHz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function ensureAudio() {
    if (ctx) return ctx;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;

    try { ctx = new AudioCtor({ latencyHint: "playback" }); }
    catch (_) { ctx = new AudioCtor(); }
    master = ctx.createGain();
    masterFilter = ctx.createBiquadFilter();
    masterFilter.type = "lowpass";
    masterFilter.frequency.value = 5200;
    masterFilter.Q.value = 0.35;
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 24;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.018;
    compressor.release.value = 0.28;
    master.gain.value = 0;
    master.connect(masterFilter);
    masterFilter.connect(compressor);
    compressor.connect(ctx.destination);
    noiseBuffer = createNoiseBuffer();
    applyVolume(true);
    return ctx;
  }

  function createNoiseBuffer() {
    if (!ctx) return null;
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.18));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    return buffer;
  }

  function applyVolume(immediate = false) {
    if (!ctx || !master) return;
    const target = state.enabled ? state.volume : 0;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    if (immediate) master.gain.setValueAtTime(target, now);
    else {
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(target, now + 0.22);
    }
  }

  async function unlockAudio() {
    if (!state.enabled) return;
    const audio = ensureAudio();
    if (!audio) return;
    try {
      if (audio.state !== "running") await audio.resume();
      unlocked = audio.state === "running";
      if (unlocked) {
        scene = detectScene();
        step = 0;
        nextNoteTime = audio.currentTime + 0.06;
        startScheduler();
        applyVolume(false);
      }
    } catch (_) {}
  }

  function startScheduler() {
    if (scheduler) return;
    scheduler = setInterval(tick, 70);
  }

  function stepDuration(sceneName) {
    const bpm = SCENES[sceneName]?.bpm || 90;
    return (60 / bpm) / 2; // Achtelnoten
  }

  function tick() {
    if (!ctx || !unlocked || ctx.state !== "running" || !state.enabled) return;
    const wanted = detectScene();
    if (wanted !== scene) {
      scene = wanted;
      step = 0;
      nextNoteTime = ctx.currentTime + 0.08;
    }

    const lookAhead = ctx.currentTime + 0.24;
    while (nextNoteTime < lookAhead) {
      scheduleStep(scene, step, nextNoteTime);
      nextNoteTime += stepDuration(scene);
      step++;
    }
  }

  function scheduleStep(sceneName, absoluteStep, time) {
    const cfg = SCENES[sceneName] || SCENES.menu;
    const idx = absoluteStep % 16;
    const scaleIndex = cfg.arp[idx] % cfg.scale.length;
    const leadMidi = cfg.root + 12 + cfg.scale[scaleIndex];
    const bassDegree = cfg.bass[idx];
    const dur = stepDuration(sceneName);

    // Lead: bewusst kurz und leise, damit das Würfeln im Vordergrund bleibt.
    if (!(sceneName === "menu" && idx % 2 === 1)) {
      tone(leadMidi, time, dur * 0.72, cfg.leadGain, cfg.leadType, sceneName === "boss" ? -7 : 0);
    }

    if (bassDegree != null) {
      const bassMidi = cfg.root + cfg.scale[bassDegree % cfg.scale.length];
      tone(bassMidi, time, dur * 1.65, cfg.bassGain, cfg.bassType, 0, 950);
    }

    // Sehr dezentes Pad am Beginn jedes 8er-Blocks.
    if (idx % 8 === 0) {
      const chord = cfg.chords[Math.floor(absoluteStep / 8) % cfg.chords.length];
      chord.slice(0,2).forEach((semi, i) => tone(cfg.root + 12 + semi, time, dur * 6.8, cfg.padGain, "sine", (i - 0.5) * 4, 1250));
    }

    if (cfg.percussion) {
      if (idx % 4 === 0) kick(time, cfg.heavy ? 0.040 : 0.032);
      if (idx % 8 === 4) noiseHit(time, cfg.heavy ? 0.012 : 0.009, 0.085, 1800);
    }
  }

  function tone(midi, start, duration, gainValue, type = "triangle", detune = 0, cutoff = 2200) {
    if (!ctx || !master || !state.enabled) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, start);
    filter.Q.value = 0.7;
    osc.type = type;
    osc.frequency.setValueAtTime(midiToHz(midi), start);
    osc.detune.setValueAtTime(detune, start);

    const attack = Math.min(0.045, Math.max(0.012, duration * 0.18));
    const release = Math.min(0.14, Math.max(0.045, duration * 0.38));
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + attack);
    gain.gain.setValueAtTime(Math.max(0.0002, gainValue * 0.78), Math.max(start + attack, start + duration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function kick(start, gainValue) {
    if (!ctx || !master || !state.enabled) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, start);
    osc.frequency.exponentialRampToValueAtTime(48, start + 0.11);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.155);
  }

  function noiseHit(start, gainValue, duration, cutoff) {
    if (!ctx || !master || !noiseBuffer || !state.enabled) return;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    src.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(cutoff, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + Math.min(0.008, duration * 0.22));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(start);
    src.stop(start + duration + 0.01);
  }

  function visible(id) {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains("hidden");
  }

  function detectScene() {
    if (visible("game")) {
      let campaignGame = false;
      try { campaignGame = typeof gameContext !== "undefined" && String(gameContext?.mode || "").includes("campaign"); } catch (_) {}
      if (campaignGame) {
        let boss = false;
        try {
          const r = typeof roundNumber !== "undefined" ? Number(roundNumber) : 0;
          boss = r === 10 || r === 15;
        } catch (_) {}
        try {
          if (!boss && typeof currentEncounterObject === "function" && typeof bossPhaseFor === "function") {
            boss = !!bossPhaseFor(currentEncounterObject());
          }
        } catch (_) {}
        return boss ? "boss" : "battle";
      }
      return "battle";
    }

    if (visible("campaignScreen") || visible("duoCampaignScreen") || visible("trioCampaignScreen")) return "campaign";
    return "menu";
  }

  function setEnabled(enabled) {
    state.enabled = !!enabled;
    saveState();
    syncSettingsUi();
    if (state.enabled) {
      ensureAudio();
      unlockAudio();
      if (ctx) {
        step = 0;
        nextNoteTime = ctx.currentTime + 0.06;
      }
    }
    applyVolume(false);
  }

  function setVolume(value) {
    state.volume = clamp(Number(value) || 0, 0, 0.6);
    saveState();
    syncSettingsUi();
    applyVolume(false);
  }

  function injectSettingsUi() {
    const screen = document.getElementById("settingsScreen");
    if (!screen || document.getElementById("wuerfelAudioSettings")) return;
    const existing = screen.querySelector(".menu-info-card");
    if (!existing) return;

    const card = document.createElement("div");
    card.id = "wuerfelAudioSettings";
    card.className = "menu-info-card";
    card.style.marginTop = "12px";
    card.innerHTML = `
      <div class="setting-row">
        <div><div class="setting-label">Hintergrundmusik</div><div class="setting-desc">Procedural Soundtrack für Menü, Kampagne, Kampf und Bosse.</div></div>
        <select id="musicEnabledSetting" aria-label="Hintergrundmusik">
          <option value="on">An</option><option value="off">Aus</option>
        </select>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">Musik-Lautstärke</div><div class="setting-desc"><span id="musicVolumeValue">24</span> %</div></div>
        <input id="musicVolumeSetting" type="range" min="0" max="60" step="1" value="24" aria-label="Musik-Lautstärke" style="width:132px;max-width:42vw">
      </div>`;
    existing.insertAdjacentElement("afterend", card);

    const enabledEl = document.getElementById("musicEnabledSetting");
    const volumeEl = document.getElementById("musicVolumeSetting");
    enabledEl?.addEventListener("change", () => setEnabled(enabledEl.value === "on"));
    volumeEl?.addEventListener("input", () => setVolume(Number(volumeEl.value) / 100));
    syncSettingsUi();
  }

  function syncSettingsUi() {
    const enabledEl = document.getElementById("musicEnabledSetting");
    const volumeEl = document.getElementById("musicVolumeSetting");
    const valueEl = document.getElementById("musicVolumeValue");
    if (enabledEl) enabledEl.value = state.enabled ? "on" : "off";
    if (volumeEl) volumeEl.value = String(Math.round(state.volume * 100));
    if (valueEl) valueEl.textContent = String(Math.round(state.volume * 100));
  }

  // Mobile Browser erlauben Audio erst nach echter Nutzerinteraktion.
  const firstGesture = () => {
    if (state.enabled) unlockAudio();
  };
  document.addEventListener("pointerdown", firstGesture, { passive: true });
  document.addEventListener("keydown", firstGesture, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) {
      ctx.suspend().catch(() => {});
    } else if (state.enabled) {
      ctx.resume().then(() => {
        unlocked = ctx.state === "running";
        scene = detectScene();
        step = 0;
        nextNoteTime = ctx.currentTime + 0.08;
      }).catch(() => {});
    }
  });

  // Die Navigation arbeitet mit hidden-Klassen. Ein Observer reicht, ohne eine einzige
  // bestehende Navigationsfunktion zu verändern.
  const observer = new MutationObserver(() => {
    if (!ctx || !unlocked || !state.enabled) return;
    const wanted = detectScene();
    if (wanted !== scene) {
      scene = wanted;
      step = 0;
      nextNoteTime = ctx.currentTime + 0.08;
    }
  });

  function init() {
    injectSettingsUi();
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
    // Hilfreich fürs Debuggen, bleibt aber bewusst außerhalb des Save-Systems.
    window.WuerfelAudio = {
      enable: () => setEnabled(true),
      disable: () => setEnabled(false),
      setVolume,
      getState: () => ({ ...state, scene: detectScene(), unlocked })
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
