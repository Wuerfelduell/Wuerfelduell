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
    try {
      const stripped = trimmed.replace(/^[^\p{L}\p{N}]+/u, "").trim();
      if (stripped && stripped !== trimmed && Object.prototype.hasOwnProperty.call(pack.exact || {}, stripped)) {
        const idx = raw.indexOf(stripped);
        return raw.slice(0, idx) + pack.exact[stripped] + raw.slice(idx + stripped.length);
      }
    } catch (_e) {}


    // Satzmuster fuer dynamische Texte mit Zahlen oder Namen. Sie leben im
    // Sprachpaket (lang/en.js), damit alle englischen Inhalte an einem Ort
    // stehen und der Uebersetzer selbst sprachfrei bleibt. Jede Funktion
    // bekommt den Treffer und einen Uebersetzer fuer Teilstuecke gereicht.
    const tr = value => translate(value, target);
    for (const [re,fn] of (pack.patterns || [])) {
      const m = trimmed.match(re);
      if (m) {
        const translated = fn(m, tr);
        const lead = raw.slice(0, raw.indexOf(trimmed));
        const tail = raw.slice(raw.indexOf(trimmed) + trimmed.length);
        return lead + translated + tail;
      }
    }

    let out = raw;
    const skipWordReplace = trimmed.length > 24 || /[.!?]/.test(trimmed);
    if (!skipWordReplace) {
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
    }

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
