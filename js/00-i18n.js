(() => {
  const STORAGE_KEY = 'diceduel_language';
  const DEFAULT_LANG = 'de';
  const packs = window.WD_LANG_PACKS || {};
  const supported = ['en', 'de'];
  let lang = localStorage.getItem(STORAGE_KEY);
  if (!supported.includes(lang)) {
    const nav = String(navigator.language || navigator.userLanguage || "de").slice(0, 2).toLowerCase();
    lang = nav === "en" ? "en" : DEFAULT_LANG;
  }

  const germanHints = /[äöüÄÖÜß]|\b(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|und|oder|du|dein|deine|wird|werden|wurde|wurden|ist|sind|hat|haben|mit|ohne|gegen|für|bei|nach|vor|während|wenn|darf|musst|kannst|können|soll|Spieler|Runde|Würfel|Schaden|Fähigkeit|Kampagne|Gegner|Profil|Welt|Zug|Wurf|Heilung|Treffer|Angriff)\b/i;

  function replaceAllLiteral(text, from, to) {
    return text.split(from).join(to);
  }

  function translate(text, target = lang) {
    if (text == null) return text;
    const raw = String(text);
    if (target === 'de') return raw;
    const pack = packs[target];
    if (!pack) return raw;
    if (Object.prototype.hasOwnProperty.call(pack.exact || {}, raw)) return pack.exact[raw];
    const trimmed = raw.trim();
    if (trimmed && Object.prototype.hasOwnProperty.call(pack.exact || {}, trimmed)) {
      const lead = raw.slice(0, raw.indexOf(trimmed));
      const tail = raw.slice(raw.indexOf(trimmed) + trimmed.length);
      return lead + pack.exact[trimmed] + tail;
    }

    // High-frequency dynamic campaign/challenge sentences. These preserve the exact
    // numbers/names instead of relying on word-by-word fallback translation.
    const patterns = [
      [/^Gewinne den Kampf\.$/i, ()=>'Win the battle.'],
      [/^Beende mindestens einen Basiswurf mit mehr als 25(?: und gewinne)?\.$/i, m=>m[0].toLowerCase().includes('und gewinne')?'Finish at least one base roll above 25 and win.':'Finish at least one base roll above 25.'],
      [/^Verursache mindestens (\d+) Schaden in einem eigenen Zug\.$/i, m=>`Deal at least ${m[1]} damage in one of your turns.`],
      [/^(?:Boss-Challenge|Final-Challenge): Verursache mindestens (\d+) Schaden in einem eigenen Zug\.$/i, m=>`Boss challenge: Deal at least ${m[1]} damage in one of your turns.`],
      [/^Gewinne mit mindestens (\d+) HP Restleben\.$/i, m=>`Win with at least ${m[1]} HP remaining.`],
      [/^Besiege (.+) mit mindestens (\d+) HP Restleben\.$/i, m=>`Defeat ${m[1]} with at least ${m[2]} HP remaining.`],
      [/^Gewinne mit höchstens (\d+) selbst verursachtem Schaden\.$/i, m=>`Win with at most ${m[1]} self-damage.`],
      [/^Heile während des Kampfes mindestens (\d+) HP und gewinne\.$/i, m=>`Heal at least ${m[1]} HP during the battle and win.`],
      [/^Heile während des Kampfes insgesamt mindestens (\d+) HP und gewinne\.$/i, m=>`Heal at least ${m[1]} HP total during the battle and win.`],
      [/^Benutze (.+) mindestens einmal und gewinne\.$/i, m=>`Use ${translate(m[1],target)} at least once and win.`],
      [/^Benutze (.+) mindestens (\d+)-mal und gewinne\.$/i, m=>`Use ${translate(m[1],target)} at least ${m[2]} times and win.`],
      [/^Gewinne mindestens einen High-Stakes-Wurf mit 4–6 und besiege den Gegner\.$/i, ()=>`Win at least one High Stakes roll with 4–6 and defeat the opponent.`],
      [/^Wechsle zwischen deinen Angriffen mindestens (\d+)-mal das Angriffsziel\.$/i, m=>`Switch attack targets at least ${m[1]} times between your attacks.`],
      [/^Füge allen (\d+) Gegnern Rohschaden zu, bevor du den ersten Gegner eliminierst\.$/i, m=>`Deal raw damage to all ${m[1]} opponents before eliminating the first opponent.`],
      [/^Jeder Spieler muss im Encounter mindestens (\d+) HP heilen\.$/i, m=>`Each player must heal at least ${m[1]} HP during the encounter.`],
      [/^Jeder Spieler muss mindestens (\d+) HP freiwillig für Fähigkeiten bezahlen\.$/i, m=>`Each player must voluntarily pay at least ${m[1]} HP for abilities.`],
      [/^Jeder Spieler muss mindestens (\d+) selbst verursachten Schaden nehmen und ihr müsst gewinnen\.$/i, m=>`Each player must take at least ${m[1]} self-damage and you must win.`],
      [/^Jeder Spieler muss mindestens einen Gegner selbst eliminieren und ihr müsst gewinnen\.$/i, ()=>`Each player must personally eliminate at least one opponent and you must win.`],
      [/^Jeder Spieler muss (.+) mindestens einmal benutzen und ihr müsst gewinnen\.$/i, m=>`Each player must use ${translate(m[1],target)} at least once and you must win.`],
      [/^Jeder Spieler muss (.+) mindestens (\d+)-mal benutzen(?: und ihr müsst gewinnen)?\.$/i, m=>`Each player must use ${translate(m[1],target)} at least ${m[2]} times${m[0].toLowerCase().includes('gewinnen')?' and you must win':''}.`],
      [/^Jeder Spieler muss (.+) mindestens (\d+)-mal auslösen(?: und ihr müsst gewinnen)?\.$/i, m=>`Each player must trigger ${translate(m[1],target)} at least ${m[2]} times${m[0].toLowerCase().includes('gewinnen')?' and you must win':''}.`],
      [/^Jeder Spieler muss (.+) mindestens (\d+)-mal in einem Angriff aktivieren\.$/i, m=>`Each player must activate ${translate(m[1],target)} in an attack at least ${m[2]} times.`],
      [/^Beide Spieler müssen mit (.+) mindestens einmal den Angriff erhalten\.$/i, m=>`Both players must gain an attack from ${translate(m[1],target)} at least once.`],
      [/^Mindestens (\d+) verschiedene Gegner müssen von BEIDEN Spielern angegriffen werden\.$/i, m=>`At least ${m[1]} different opponents must be attacked by BOTH players.`],
      [/^Die ersten (\d+) Duo-Angriffe müssen strikt zwischen beiden Spielern abwechseln\.$/i, m=>`The first ${m[1]} duo attacks must strictly alternate between both players.`],
      [/^Die ersten (\d+) Gegner-Kills müssen strikt zwischen den beiden Spielern abwechseln\.$/i, m=>`The first ${m[1]} opponent kills must strictly alternate between the two players.`],
      [/^Die ersten (\d+) Kills müssen von Spieler 1 → Spieler 2 → Spieler 2 → Spieler 1 erzielt werden\.$/i, m=>`The first ${m[1]} kills must be scored by Player 1 → Player 2 → Player 2 → Player 1.`],
      [/^Spieler 1 muss (.+) eliminieren UND Spieler 2 muss (.+) eliminieren\.$/i, m=>`Player 1 must eliminate ${m[1]} AND Player 2 must eliminate ${m[2]}.`],
      [/^Beide Spieler müssen (.+) mindestens einmal angreifen UND (.+) muss als letzter Gegner sterben\.$/i, m=>`Both players must attack ${m[1]} at least once AND ${m[2]} must be the last opponent to die.`],
      [/^Jeder Spieler muss mindestens (\d+) High-Stakes-Würfe mit 4–6 gewinnen\.$/i, m=>`Each player must win at least ${m[1]} High Stakes rolls with 4–6.`],
      [/^Jeder Spieler muss mindestens einen High-Stakes-Wurf mit 4–6 gewinnen\.$/i, ()=>`Each player must win at least one High Stakes roll with 4–6.`],
      [/^Jeder Spieler muss Counterattack mindestens (\d+)-mal auslösen\.$/i, m=>`Each player must trigger Counterattack at least ${m[1]} times.`],
      [/^Jeder Spieler muss Counterattack mindestens einmal auslösen und ihr müsst gewinnen\.$/i, ()=>`Each player must trigger Counterattack at least once and you must win.`],
      [/^Jeder Spieler muss Zweite Chance mindestens (\d+)-mal benutzen\.$/i, m=>`Each player must use Second Chance at least ${m[1]} times.`],
      [/^Jeder Spieler muss Zweite Chance mindestens einmal benutzen und ihr müsst gewinnen\.$/i, ()=>`Each player must use Second Chance at least once and you must win.`],
      [/^Jeder Spieler muss Double Tap mindestens (\d+)-mal auslösen\.$/i, m=>`Each player must trigger Double Tap at least ${m[1]} times.`],
      [/^Jeder Spieler muss Snake Eyes mindestens (\d+)-mal benutzen und ihr müsst gewinnen\.$/i, m=>`Each player must use Snake Eyes at least ${m[1]} times and you must win.`],
      [/^Jeder Spieler muss Präzision mindestens (\d+)-mal benutzen\.$/i, m=>`Each player must use Precision at least ${m[1]} times.`],
      [/^Beide Spieler müssen ihren Bonus-Draft auslösen UND die ersten (\d+) Duo-Angriffe müssen alternieren\.$/i, m=>`Both players must trigger their bonus draft AND the first ${m[1]} duo attacks must alternate.`],
      [/^Beide Spieler müssen ihren Bonus-Draft auslösen UND beim Sieg darf exakt 1 Duo-Spieler noch leben\.$/i, ()=>`Both players must trigger their bonus draft AND exactly 1 duo player may still be alive when you win.`],
      [/^Die ersten (\d+) Angriffe müssen (.+) als Ziel wählen\.$/i, m=>`The first ${m[1]} attacks must target ${m[2]}.`],
      [/^(Der|Die) (.+)$/i, m=>`The ${translate(m[2],target)}`],
      [/^Welt (\d+) · (.+)$/i, m=>`World ${m[1]} · ${m[2]}`],
      [/^(\d+) gegen (\d+)(.*)$/i, m=>`${m[1]} vs ${m[2]}${m[3]||''}`],
      [/^Nach (.+)$/i, m=>`After ${translate(m[1],target)}`],
      [/^Profil erforderlich\.?$/i, ()=>`Profile required.`],
      [/^Profile erforderlich\.?$/i, ()=>`Profiles required.`]
    ];
    for (const [re,fn] of patterns) {
      const m = trimmed.match(re);
      if (m) {
        const translated = fn(m);
        const lead = raw.slice(0, raw.indexOf(trimmed));
        const tail = raw.slice(raw.indexOf(trimmed) + trimmed.length);
        return lead + translated + tail;
      }
    }

    let out = raw;
    const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokenChars = 'A-Za-zÄÖÜäöüß0-9_';
    for (const [from,to] of (pack.replacements || [])) {
      if (!out.includes(from)) continue;
      if (/^[A-Za-zÄÖÜäöüß]+$/.test(from)) {
        const re = new RegExp(`(^|[^${tokenChars}])(${escapeRegex(from)})(?=$|[^${tokenChars}])`, 'g');
        out = out.replace(re, (m,prefix)=>prefix+to);
      } else {
        out = replaceAllLiteral(out, from, to);
      }
    }

    // No generic der/die/das rewrite: that produced mixed DE/EN copy.
    out = out.replace(/\s{2,}/g, ' ');

    return out;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentElement;
    if (parent && /^(?:SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/u.test(parent.tagName)) return;
    if (parent?.closest?.(".p8-lock-overlay, .p8-boss-selected-glow")) return;
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    let translated = translate(raw);

    // Campaign descriptions are deliberately authored in German. If a future/new
    // encounter contains vocabulary that is not in the EN pack yet, never expose a
    // mixed German/English paragraph to players. Keep titles/names intact, but use a
    // clean English fallback for narrative-only copy until that sentence gets its
    // dedicated translation in lang/en.js.
    if (lang === 'en' && germanHints.test(translated)) {
      const parent = node.parentElement;
      if (parent?.closest?.('.node-detail-desc')) {
        translated = 'A campaign encounter with a unique enemy setup. Defeat the opposing team and complete the challenge below to progress.';
      } else if (parent?.closest?.('.campaign-world-desc')) {
        translated = 'Campaign world with unique encounters, mechanics and mastery challenges.';
      }
    }

    if (translated !== raw) node.nodeValue = translated;
  }

  const attrNames = ['placeholder','title','aria-label','alt'];
  function translateElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    for (const attr of attrNames) {
      const raw = el.getAttribute(attr);
      if (raw) {
        const translated = translate(raw);
        if (translated !== raw) el.setAttribute(attr, translated);
      }
    }
    if (el.matches('input[type="button"],input[type="submit"],input[type="reset"]')) {
      const raw = el.value;
      if (raw) el.value = translate(raw);
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      else translateElement(node);
    }
  }

  function configureLanguageUi() {
    const select = document.getElementById('languageSetting');
    if (!select) return;
    select.value = lang;
    select.addEventListener('change', () => {
      const next = supported.includes(select.value) ? select.value : DEFAULT_LANG;
      localStorage.setItem(STORAGE_KEY, next);
      location.reload();
    });
  }

  function configureEnglishChangelog() {
    // Keep the real changelog visible in English. walk() translates entries in place.
  }

  // User-facing native dialogs also pass through the language pack.
  const nativeAlert = window.alert.bind(window);
  const nativeConfirm = window.confirm.bind(window);
  const nativePrompt = window.prompt.bind(window);
  window.alert = msg => nativeAlert(translate(msg));
  window.confirm = msg => nativeConfirm(translate(msg));
  window.prompt = (msg, value) => nativePrompt(translate(msg), value);

  window.WDI18n = {
    get language(){ return lang; },
    setLanguage(next){
      if (!supported.includes(next)) return false;
      localStorage.setItem(STORAGE_KEY, next);
      location.reload();
      return true;
    },
    t: translate,
    translate,
    supported: [...supported]
  };
  window.t = translate;

  document.documentElement.lang = lang;
  if (lang === 'en') document.documentElement.classList.add('lang-en');
  else document.documentElement.classList.add('lang-de');

  if (lang === 'en') {
    // The source document is German; English is a view layer on top of it.
    walk(document.documentElement);
    const observer = new MutationObserver(records => {
      for (const rec of records) {
        if (rec.type === 'characterData') translateTextNode(rec.target);
        if (rec.type === 'attributes') translateElement(rec.target);
        for (const node of rec.addedNodes || []) {
          if (node.nodeType === 1 && node.classList?.contains("p8-boss-selected-glow")) continue;
          if (node.nodeType === 1 && node.classList?.contains("p8-lock-overlay")) continue;
          walk(node);
        }
      }
    });
    observer.observe(document.documentElement, {
      subtree:true,
      childList:true,
      characterData:true,
      attributes:true,
      attributeFilter:attrNames
    });
  }

  const boot = () => {
    configureLanguageUi();
    configureEnglishChangelog();
    if (lang === 'en') walk(document.documentElement);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
