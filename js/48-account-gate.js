(() => {
  "use strict";

  /* Account-Pflicht: Ohne echten Account (anonyme Online-Gäste zählen nicht)
     liegt dieses Fenster über dem Spiel. Bezahlte Kisten, Cloud-Save und
     Online-Statistik hängen an einem Konto; ein Spielstand ohne Konto wäre
     bei Gerätewechsel oder Neuinstallation verloren.
     Nur aktiv, wenn Supabase konfiguriert ist - mit dem lokalen Test-Backend
     gibt es keine echten Accounts, die man verlangen könnte.
     Ist der Server nicht erreichbar, darf man für diese Sitzung offline
     weiterspielen; beim nächsten Start kommt die Abfrage wieder. */

  const el = id => document.getElementById(id);
  const gate = el("wdAccountGate");
  if (!gate) return;

  const forms = {
    register: gate.querySelector('[data-gate-form="register"]'),
    login: gate.querySelector('[data-gate-form="login"]')
  };
  const tabs = [...gate.querySelectorAll("[data-gate-tab]")];
  const box = el("wdAccountGateMessage");
  const retryBtn = el("wdAccountGateRetry");
  const offlineBtn = el("wdAccountGateOffline");
  const backend = () => window.WDCloudAccount?.backend || null;
  const required = () => backend()?.kind === "supabase";

  let offlineForSession = false;
  let busy = false;
  let watching = null;

  function message(text, type = "") {
    if (!box) return;
    box.textContent = text;
    box.className = `cloud-account-message ${type}`.trim();
  }
  function clearMessage() { box?.classList.add("hidden"); }

  function setTab(name) {
    for (const [key, form] of Object.entries(forms)) form?.classList.toggle("hidden", key !== name);
    for (const tab of tabs) {
      const active = tab.dataset.gateTab === name;
      tab.classList.toggle("good", active);
      tab.classList.toggle("secondary", !active);
      tab.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function setOffline(unreachable) {
    retryBtn?.classList.toggle("hidden", !unreachable);
    offlineBtn?.classList.toggle("hidden", !unreachable);
  }

  function show() {
    if (offlineForSession) return;
    if (gate.classList.contains("hidden")) {
      gate.classList.remove("hidden");
      document.body.classList.add("wd-account-gate-open");
    }
  }

  function hide() {
    if (gate.classList.contains("hidden")) return;
    gate.classList.add("hidden");
    document.body.classList.remove("wd-account-gate-open");
    clearMessage();
  }

  /* Supabase meldet auf Englisch; die häufigen Fälle bekommen einen
     deutschen Satz, der sagt, was zu tun ist. */
  function explain(error) {
    const raw = String(error?.message || error || "");
    if (/invalid login credentials/i.test(raw)) return "E-Mail oder Passwort stimmt nicht.";
    if (/already registered|already exists/i.test(raw)) return "Für diese E-Mail gibt es schon einen Account. Bitte melde dich an.";
    if (/email not confirmed/i.test(raw)) return "Bitte bestätige zuerst deine E-Mail über den Link, den wir dir geschickt haben.";
    if (/rate limit|too many/i.test(raw)) return "Zu viele Versuche. Bitte warte kurz und versuche es dann erneut.";
    if (/failed to fetch|network|load failed|CLIENT_LOAD_FAILED/i.test(raw)) return "Keine Verbindung zum Server. Prüfe deine Internetverbindung.";
    return raw || "Das hat nicht geklappt. Bitte versuche es erneut.";
  }

  function watch() {
    const current = backend();
    if (!current || watching === current || typeof current.onAuthStateChange !== "function") return;
    watching = current;
    // Abmelden im Account-Screen bringt die Abfrage zurück.
    current.onAuthStateChange(session => { if (session) hide(); else show(); });
  }

  async function check() {
    if (!required()) { hide(); return; }
    watch();
    try {
      const session = await backend().getSession();
      setOffline(false);
      clearMessage();
      if (session) hide();
      else show();
    } catch (error) {
      show();
      message(explain(error), "error");
      setOffline(true);
    }
  }

  function field(form, name) { return String(form?.elements?.[name]?.value || ""); }

  async function submit(kind) {
    if (busy) return;
    const form = forms[kind];
    const name = field(form, "name").trim();
    const email = field(form, "email").trim();
    const password = field(form, "password");
    if (kind === "register" && !name) { message("Bitte gib einen Anzeigenamen ein.", "error"); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { message("Bitte gib eine gültige E-Mail ein.", "error"); return; }
    if (kind === "register" && password.length < 8) { message("Das Passwort braucht mindestens 8 Zeichen.", "error"); return; }
    if (kind === "login" && !password) { message("Bitte gib dein Passwort ein.", "error"); return; }

    busy = true;
    form.querySelectorAll("button,input").forEach(node => { node.disabled = true; });
    message(kind === "register" ? "Account wird erstellt …" : "Anmeldung läuft …");
    try {
      if (kind === "register") {
        const result = await backend().register({ name, email, password });
        if (result?.pendingConfirmation) {
          setTab("login");
          if (forms.login?.elements?.email) forms.login.elements.email.value = email;
          message("Account erstellt. Bestätige deine E-Mail über den Link in deinem Postfach und melde dich dann hier an.", "good");
          return;
        }
      } else {
        await backend().login({ email, password });
      }
      form.elements.password.value = "";
      setOffline(false);
      hide();
      window.WDCloudAccount?.refresh?.().catch(() => {});
    } catch (error) {
      message(explain(error), "error");
      if (/failed to fetch|network|load failed|CLIENT_LOAD_FAILED/i.test(String(error?.message || ""))) setOffline(true);
    } finally {
      busy = false;
      form.querySelectorAll("button,input").forEach(node => { node.disabled = false; });
    }
  }

  function wire() {
    setTab("register");
    tabs.forEach(tab => tab.addEventListener("click", () => { clearMessage(); setTab(tab.dataset.gateTab); }));
    for (const [kind, form] of Object.entries(forms)) {
      form?.addEventListener("submit", event => { event.preventDefault(); submit(kind); });
    }
    retryBtn?.addEventListener("click", () => { clearMessage(); check(); });
    offlineBtn?.addEventListener("click", () => { offlineForSession = true; hide(); });
    check();
  }

  window.WDAccountGate = Object.freeze({ check, get open() { return !gate.classList.contains("hidden"); } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire, { once: true });
  else wire();
})();
