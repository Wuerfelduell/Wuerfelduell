(() => {
  const STORAGE_KEY = 'diceduel_language';
  const DEFAULT_LANG = 'en';
  const packs = window.WD_LANG_PACKS || {};
  const supported = ['en', 'de'];
  let lang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  if (!supported.includes(lang)) lang = DEFAULT_LANG;

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

    // Common dynamic grammar / status patterns.
    out = out
      .replace(/zurück/gi, 'back')
      .replace(/Zurück/g, 'Back')
      .replace(/\bUND\b/g, 'AND')
      .replace(/\bund\b/gi, 'and')
      .replace(/\boder\b/gi, 'or')
      .replace(/\bmit\b/gi, 'with')
      .replace(/\bohne\b/gi, 'without')
      .replace(/\bgegen\b/gi, 'against')
      .replace(/\bwährend\b/gi, 'during')
      .replace(/\bnach\b/gi, 'after')
      .replace(/\bvor\b/gi, 'before')
      .replace(/\bpro\b/gi, 'per')
      .replace(/\bdu\b/gi, 'you')
      .replace(/\bdein\b/gi, 'your')
      .replace(/\bdeine\b/gi, 'your')
      .replace(/\bdeinen\b/gi, 'your')
      .replace(/\bdeinem\b/gi, 'your')
      .replace(/\bdeiner\b/gi, 'your')
      .replace(/\b(\d+)er\b/g, '$1s')
      .replace(/\b(\d+) Einser\b/g, '$1 ones')
      .replace(/\b(\d+) Sechser\b/g, '$1 sixes')
      .replace(/\b(\d+) neue hit\b/gi, '$1 new hit')
      .replace(/\b(\d+) neue hits\b/gi, '$1 new hits')
      .replace(/\b(\d+) playern\b/gi, '$1 players')
      .replace(/\b(\d+) player\b/gi, '$1 player')
      .replace(/\bist dran\b/gi, 'is up')
      .replace(/\bführt die Counterattack aus\b/gi, 'is resolving the Counterattack')
      .replace(/\bwählt eine ability\b/gi, 'is choosing an ability')
      .replace(/\bverliert ([0-9]+) HP\b/gi, 'loses $1 HP')
      .replace(/\bverliert ([0-9]+) damage\b/gi, 'takes $1 damage')
      .replace(/\berhält ([0-9]+) damage\b/gi, 'takes $1 damage')
      .replace(/\bheilt ([0-9]+) HP\b/gi, 'heals $1 HP')
      .replace(/\bheilt ([0-9]+) HP\b/gi, 'heals $1 HP')
      .replace(/\bstartet\b/gi, 'starts')
      .replace(/\bstarten\b/gi, 'start')
      .replace(/\bwird zufällig bestimmt\b/gi, 'is determined randomly')
      .replace(/\bwerden zufällig bestimmt\b/gi, 'are determined randomly')
      .replace(/\bbleibt aktiv\b/gi, 'stays active')
      .replace(/\bbleiben aktiv\b/gi, 'stay active')
      .replace(/\bsteht noch nicht zur Verfügung\b/gi, 'is not available yet')
      .replace(/\bnoch nicht verfügbar\b/gi, 'not available yet')
      .replace(/\bbenutzen\b/gi, 'use')
      .replace(/\bBenutze\b/g, 'Use')
      .replace(/\bbenutzt\b/gi, 'uses')
      .replace(/\bTriggere\b/g, 'Trigger')
      .replace(/\btriggern\b/gi, 'trigger')
      .replace(/\btriggert\b/gi, 'triggers')
      .replace(/\bwürfeln\b/gi, 'roll')
      .replace(/\bWürfle\b/g, 'Roll')
      .replace(/\bwürfelt\b/gi, 'rolls')
      .replace(/\blocke\b/gi, 'lock')
      .replace(/\bLocke\b/g, 'Lock')
      .replace(/\bgelockt\b/gi, 'locked')
      .replace(/\beingeloggten\b/gi, 'locked')
      .replace(/\bungelockten\b/gi, 'unlocked')
      .replace(/\bbezahle\b/gi, 'pay')
      .replace(/\bBezahle\b/g, 'Pay')
      .replace(/\bbezahlt\b/gi, 'paid')
      .replace(/\bverursache\b/gi, 'deal')
      .replace(/\bVerursache\b/g, 'Deal')
      .replace(/\bverursacht\b/gi, 'deals')
      .replace(/\bverursachen\b/gi, 'deal')
      .replace(/\bnimm\b/gi, 'take')
      .replace(/\bNimm\b/g, 'Take')
      .replace(/\bnimmt\b/gi, 'takes')
      .replace(/\berhalte\b/gi, 'gain')
      .replace(/\bErhalte\b/g, 'Gain')
      .replace(/\berhält\b/gi, 'gains')
      .replace(/\bbleibe\b/gi, 'stay')
      .replace(/\bBleibe\b/g, 'Stay')
      .replace(/\bbleibt\b/gi, 'stays')
      .replace(/\bspiele\b/gi, 'play')
      .replace(/\bSpiele\b/g, 'Play')
      .replace(/\bspielt\b/gi, 'plays')
      .replace(/\baktiv\b/gi, 'active')
      .replace(/\bzufällig\b/gi, 'randomly')
      .replace(/\bzufälligen\b/gi, 'random')
      .replace(/\bzufällige\b/gi, 'random')
      .replace(/\bkostenlos\b/gi, 'for free')
      .replace(/\bgratis\b/gi, 'for free')
      .replace(/\bgleich\b/gi, 'same')
      .replace(/\bverschiedenen\b/gi, 'different')
      .replace(/\bverschiedene\b/gi, 'different')
      .replace(/\bvorhandenen\b/gi, 'available')
      .replace(/\baktuell\b/gi, 'currently')
      .replace(/\bAktuell\b/g, 'Currently')
      .replace(/\bspäter\b/gi, 'later')
      .replace(/\bmehr\b/gi, 'more')
      .replace(/\bweniger\b/gi, 'less')
      .replace(/\bhöher\b/gi, 'higher')
      .replace(/\bniedriger\b/gi, 'lower')
      .replace(/\bnur\b/gi, 'only')
      .replace(/\bNur\b/g, 'Only')
      .replace(/\bimmer\b/gi, 'always')
      .replace(/\bjetzt\b/gi, 'now')
      .replace(/\bnoch\b/gi, 'still')
      .replace(/\bselbst\b/gi, 'yourself')
      .replace(/\beigene\b/gi, 'own')
      .replace(/\beigenen\b/gi, 'own')
      .replace(/\beinem\b/gi, 'a')
      .replace(/\beinen\b/gi, 'a')
      .replace(/\beiner\b/gi, 'a')
      .replace(/\beine\b/gi, 'a')
      .replace(/\bein\b/gi, 'a')
      .replace(/\bder\b/gi, 'the')
      .replace(/\bdie\b/gi, 'the')
      .replace(/\bdas\b/gi, 'the')
      .replace(/\bden\b/gi, 'the')
      .replace(/\bdem\b/gi, 'the')
      .replace(/\bdes\b/gi, 'the')
      .replace(/\bzum\b/gi, 'to the')
      .replace(/\bzur\b/gi, 'to the')
      .replace(/\bim\b/gi, 'in the')
      .replace(/\bins\b/gi, 'into the')
      .replace(/\bam\b/gi, 'at the')
      .replace(/\bauf\b/gi, 'on')
      .replace(/\baus\b/gi, 'from')
      .replace(/\bvon\b/gi, 'from')
      .replace(/\bfür\b/gi, 'for')
      .replace(/\bbei\b/gi, 'at')
      .replace(/\bals\b/gi, 'as')
      .replace(/\bbis\b/gi, 'until')
      .replace(/\bdurch\b/gi, 'through')
      .replace(/\bdamit\b/gi, 'with it')
      .replace(/\bdiesem\b/gi, 'this')
      .replace(/\bdieser\b/gi, 'this')
      .replace(/\bdiese\b/gi, 'this')
      .replace(/\bdieses\b/gi, 'this')
      .replace(/\bwenn\b/gi, 'if')
      .replace(/\bWenn\b/g, 'If')
      .replace(/\bfalls\b/gi, 'if')
      .replace(/\bdarfst\b/gi, 'may')
      .replace(/\bkannst\b/gi, 'can')
      .replace(/\bmusst\b/gi, 'must')
      .replace(/\bsollst\b/gi, 'should')
      .replace(/\bwird\b/gi, 'is')
      .replace(/\bwerden\b/gi, 'are')
      .replace(/\bwurde\b/gi, 'was')
      .replace(/\bwurden\b/gi, 'were')
      .replace(/\bist\b/gi, 'is')
      .replace(/\bsind\b/gi, 'are')
      .replace(/\bhat\b/gi, 'has')
      .replace(/\bhaben\b/gi, 'have')
      .replace(/\bbleiben\b/gi, 'stay')
      .replace(/\bgenug\b/gi, 'enough')
      .replace(/\bsehr\b/gi, 'very')
      .replace(/\bwirklich\b/gi, 'really')
      .replace(/\bautomatisch\b/gi, 'automatically')
      .replace(/\bdirekt\b/gi, 'directly')
      .replace(/\bzusätzlich\b/gi, 'additionally')
      .replace(/\bzusätzlichen\b/gi, 'additional')
      .replace(/\bzusätzliche\b/gi, 'additional')
      .replace(/\bweiter\b/gi, 'continue')
      .replace(/\bweiteren\b/gi, 'additional')
      .replace(/\bweitere\b/gi, 'additional')
      .replace(/\bvorhanden\b/gi, 'available')
      .replace(/\babschließen\b/gi, 'complete')
      .replace(/\babgeschlossen\b/gi, 'completed')
      .replace(/\bgeschafft\b/gi, 'completed')
      .replace(/\bgespeichert\b/gi, 'saved')
      .replace(/\bangezeigt\b/gi, 'shown')
      .replace(/\bgeändert\b/gi, 'changed')
      .replace(/\bdeaktiviert\b/gi, 'disabled')
      .replace(/\baktiviert\b/gi, 'enabled')
      .replace(/\bvorbereiten\b/gi, 'prepare')
      .replace(/\bvorbereitet\b/gi, 'prepared');

    // Clean common artifacts created by the conservative fallback pass.
    out = out
      .replace(/\bthe your\b/gi, 'your')
      .replace(/\byour the\b/gi, 'your')
      .replace(/\ba the\b/gi, 'a')
      .replace(/\bthe a\b/gi, 'a')
      .replace(/\bwith the it\b/gi, 'with it')
      .replace(/\s{2,}/g, ' ');
    return out;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
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
    if (lang !== 'en') return;
    const screen = document.getElementById('changelogScreen');
    if (!screen) return;
    const entries = Array.from(screen.querySelectorAll('.changelog-entry'));
    entries.forEach(e => e.classList.add('i18n-old-changelog'));
    if (!screen.querySelector('.i18n-changelog-summary')) {
      const summary = document.createElement('div');
      summary.className = 'changelog-entry i18n-changelog-summary';
      summary.innerHTML = '<div class="changelog-version">V27.12.0</div><ul><li>Added full English/German language system with an in-game language switch.</li><li>English is now the default interface language.</li><li>German keeps the original wording and existing English ability/enemy names where appropriate.</li><li>Updated official branding from DiceDuel to DiceDuel.</li></ul>';
      const subtitle = screen.querySelector('.screen-subtitle');
      subtitle?.insertAdjacentElement('afterend', summary);
    }
    const style = document.createElement('style');
    style.id = 'i18n-changelog-style';
    style.textContent = '.i18n-old-changelog{display:none!important;}';
    document.head.appendChild(style);
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
        for (const node of rec.addedNodes || []) walk(node);
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
