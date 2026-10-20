/* Jreebs app shell: sign-in, boot, navigation, live updates, presence, theme. */
// "BOARDS" expands to one menu item per board (each kind of work the company tracks).
const NAV_BASE = [
  { g: "Work", items: [["home", "Home", "home", 0], "BOARDS", ["inbox", "Inbox", "inbox", 1], ["email", "Email", "mail", 1], ["customers", "Customers", "contact", 1], ["calendar", "Calendar", "cal", 1]] },
  { g: "Team", items: [["approvals", "Approvals", "check", 0], ["team", "Team & shifts", "team", 2], ["quality", "Quality (QA)", "star", 1]] },
  { g: "Company", items: [["company", "Company profile", "building", 1], ["systems", "Systems & tools", "grid", 1], ["access", "People & access", "key", 4], ["sops", "SOPs", "book", 0]] },
  { g: "Insights", items: [["reports", "Reports", "chart", 1]] },
  { g: "Setup", items: [["automations", "Automations", "bolt", 2], ["templates", "Message templates", "msg", 1], ["integrations", "Integrations", "plug", 4], ["data", "Import & export", "swap", 4]] },
  { g: "Admin", items: [["settings", "Settings", "gear", 0], ["audit", "Audit log", "shield", 4]] }
];
const ADMIN_NAV = [{ g: "Jreebs", items: [["clients", "Clients", "building", 0], ["quote", "Quotes", "chart", 0], ["tickets", "Support tickets", "inbox", 0], ["pv_test", "Test logins", "key", 0], ["pv_usage", "Assistant usage", "spark", 0]] }];
function navGroups() {
  if (ADMIN) return ADMIN_NAV;
  return NAV_BASE.map(g => ({ g: g.g, items: g.items.flatMap(it => it === "BOARDS" ? liveBoards().map(b => ["orders", b.items, b.icon, 1, b.id]) : [it]).filter(it => it[0] === "orders" || ["home", "settings", "audit"].includes(it[0]) || modOn(it[0])) })).filter(g => g.items.length);
}
const TITLES = { pv_home: "Overview", quote: "Quotes", pv_usage: "Assistant usage", pv_test: "Test logins", email: "Email", search: "Search", calendar: "Calendar", approvals: "Approvals", home: "Home", inbox: "Inbox", customers: "Customers", team: "Team & shifts", quality: "Quality (QA)", company: "Company profile", systems: "Systems & tools", access: "People & access", sops: "SOPs", reports: "Reports", automations: "Automations", templates: "Message templates", integrations: "Integrations", data: "Import & export", settings: "Settings", audit: "Audit log", clients: "Clients", tickets: "Support tickets" };
const VIEWS = {}; // filled by the view files
let view = "home", ADMIN = false;
const ui = { board: "main", boardView: "list", apf: "mine", calWeek: 0, calBoard: "all", rboard: null, emf: "open", emBox: "all", emSel: null, emq: "", pvf: "all", sort: null, page: {}, orderTab: "active", q: "", area: "all", saved: null, mine: true, sel: new Set(), cfilter: "open", convo: null, report: null, range: 14, teamTab: "members", setTab: "company", intCat: "All", imp: null, cq: "", ctag: "All", auditUser: "All", sopCat: "All", sopMine: false, sopq: "", accq: "", dept: "All", week: 0 };
const navMin = id => { for (const g of navGroups()) for (const it of g.items) if (it[0] === id) return it[3]; return 0; };
let NAVC = new Set(); try { NAVC = new Set(JSON.parse(localStorage.getItem("jreebs-nav-closed") || "[]")); } catch (e) {}

/* ---------- sign-in ---------- */
let loginMode = "signin", loginMsg = null;
function showLogin(mode, msg) {
  if (mode) loginMode = mode; loginMsg = msg || null;
  $("#shell").hidden = true; $("#login").hidden = false;
  const m = loginMode, box = loginMsg ? `<div class="msgbox ${loginMsg[0]}">${esc(loginMsg[1])}</div>` : "";
  const T = { signin: ["Sign in", "Your operations desk"], signup: ["Create your account", "Use the email you were invited with and you'll land in your company's workspace."], forgot: ["Reset your password", "We'll email you a link to set a new one."], reset: ["Set a new password", "Choose a password with at least 8 characters."], mfa: ["Two-step sign-in", "Enter the 6-digit code from your authenticator app."] }[m];
  $("#loginForm").innerHTML = `<div class="lbrand"><i>ج</i><b>Jreebs</b></div><h1>${T[0]}</h1><p class="sub">${T[1]}</p>${box}
    ${["signin", "signup", "forgot"].includes(m) ? `<div class="field"><label for="lEmail">Email</label><input class="in" id="lEmail" type="email" autocomplete="username" required></div>` : ""}
    ${["signin", "signup", "reset"].includes(m) ? `<div class="field"><label for="lPass">${m === "reset" ? "New password" : "Password"}</label><input class="in" id="lPass" type="password" autocomplete="${m === "signin" ? "current-password" : "new-password"}" required minlength="${m === "signin" ? 6 : 8}"></div>` : ""}
    ${m === "mfa" ? `<div class="field"><label for="lCode">6-digit code</label><input class="in num" id="lCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div>` : ""}
    <button class="btn go" type="submit" id="lBtn">${{ signin: "Sign in", signup: "Create account", forgot: "Email me a link", reset: "Save password", mfa: "Verify" }[m]}</button>
    <p class="lfoot">${m === "signin" ? `<button class="linkbtn" type="button" data-lmode="forgot">Forgot password?</button> · New here? <button class="linkbtn" type="button" data-lmode="signup">Create an account</button>` : m === "mfa" ? `<button class="linkbtn" type="button" data-act="signout">Use a different account</button>` : `<button class="linkbtn" type="button" data-lmode="signin">Back to sign in</button>`}</p>
    <p class="lfoot"><a href="?demo" class="linkbtn">Try the demo with sample data</a></p>`;
  const pre = new URLSearchParams(location.search).get("email");
  if (pre && $("#lEmail") && !$("#lEmail").value) $("#lEmail").value = pre;
  const f = $("#loginForm input" + (pre && m === "signup" ? "[type=password]" : "")); if (f) f.focus();
}
async function onLoginSubmit(e) {
  e.preventDefault();
  const btn = $("#lBtn"); btn.disabled = true;
  const v = id => ($(id) ? $(id).value.trim() : "");
  try {
    if (loginMode === "signin") {
      const { error } = await sb.auth.signInWithPassword({ email: v("#lEmail"), password: $("#lPass").value });
      if (error) throw error;
      return await boot();
    }
    if (loginMode === "signup") {
      const { error } = await sb.auth.signUp({ email: v("#lEmail"), password: $("#lPass").value, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      const { data: { session } } = await sb.auth.getSession();
      if (session) return await boot();
      return showLogin("signin", ["ok", "Account created. Check your email if we asked you to confirm it, then sign in."]);
    }
    if (loginMode === "forgot") {
      const { error } = await sb.auth.resetPasswordForEmail(v("#lEmail"), { redirectTo: location.origin + location.pathname });
      if (error) throw error;
      return showLogin("signin", ["ok", "If that email has an account, a reset link is on its way."]);
    }
    if (loginMode === "reset") {
      const { error } = await sb.auth.updateUser({ password: $("#lPass").value });
      if (error) throw error;
      toast("Password saved."); return await boot();
    }
    if (loginMode === "mfa") {
      const { data } = await sb.auth.mfa.listFactors();
      const factor = (data?.totp || []).find(f => f.status === "verified");
      if (!factor) throw new Error("No authenticator is set up on this account.");
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: v("#lCode") });
      if (error) throw error;
      return await boot();
    }
  } catch (err) { showLogin(loginMode, ["err", errMsg(err)]); }
  finally { const b = $("#lBtn"); if (b) b.disabled = false; }
}

/* ---------- boot ---------- */
async function boot() {
  if (DEMO) return demoBoot();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return showLogin("signin");
  try {
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") return showLogin("mfa");
  } catch (e) { /* MFA not enabled on this project */ }
  const { data: adminRow } = await sb.from("admins").select("auth_user_id").maybeSingle();
  const { data: memberships } = await sb.from("client_users").select("client_id, role");
  if (adminRow && !(memberships || []).length) {
    ADMIN = true; ME = { id: user.id, email: user.email, role: "owner", lvl: 5 };
    return startShell("clients");
  }
  if (!memberships || !memberships.length) return showLogin("signin", ["err", "Your account isn't linked to a company yet. If you were invited, confirm your email from the message we sent, then sign in again. Otherwise ask your company's owner or manager to invite you."]);
  let pick = memberships[0];
  try { const saved = localStorage.getItem("jreebs-client"); const m = memberships.find(x => x.client_id === saved); if (m) pick = m; } catch (e) {}
  ME = { id: user.id, email: user.email, role: pick.role, lvl: ROLES[pick.role].lvl, memberships, admin: !!adminRow };
  const { data: client } = await sb.from("clients").select("*").eq("id", pick.client_id).single();
  if (!client) return showLogin("signin", ["err", "Couldn't load your company. Try again in a minute."]);
  await openClient(client);
}
async function openClient(client) {
  CLIENT = client; CFG = client.config || {}; BOARDS = buildBoards(client); setBoard(BOARDS[0].id);
  ADMIN = false;
  $("#login").hidden = true; $("#shell").hidden = false;
  $("#content").innerHTML = `<div class="loading">Loading ${esc(client.name)}…</div>`;
  await loadAll();
  refreshItems();
  startShell(lvl() === 0 ? "home" : "home");
  if (!DEMO) { subscribeLive(); joinPresence(); autoSyncSheets(); }
}
function startShell(v) {
  $("#login").hidden = true; $("#shell").hidden = false;
  $("#wsName").textContent = ADMIN ? "Jreebs admin" : CLIENT.name;
  $("#wsSub").textContent = ADMIN ? "All client companies" : `${(TEMPLATES[CLIENT.workspace_type] || TEMPLATES.general).name} · ${PLANS[planKey(CLIENT.plan)].name} plan`;
  $("#roleSel").parentElement.hidden = !DEMO || ADMIN;
  $("#tplWrap").hidden = !DEMO || ADMIN;
  $("#demoTag").hidden = !DEMO;
  $("#demoTag").textContent = ADMIN ? "Provider demo · sample clients" : "Demo · sample data";
  $("#askBtn").hidden = ADMIN;
  $("#q").closest(".search").hidden = ADMIN;
  view = v; render();
}

/* ---------- navigation + render ---------- */
function navLabel(id, label, b) {
  if (id === "home") return lvl() === 1 ? "My day" : lvl() === 0 ? "My stops" : "Home";
  if (id === "orders") { const d = b ? BDEF(b) : WDEF; return lvl() === 1 ? `My ${d.items.toLowerCase()}` : d.items; }
  return label;
}
function renderNav() {
  const groups = navGroups();
  const mineOk = i => lvl() > 1 || i.assigned_to === ME.id || !i.assigned_to;
  const openCv = ADMIN ? 0 : S.cases.filter(c => c.status === "open" && (lvl() > 1 || c.assignee === ME.id || !c.assignee)).length;
  const waitAp = ADMIN ? 0 : S.approvals.filter(a => a.status === "pending" && (lvl() >= 3 ? a.requester !== ME.id : false)).length;
  const isOn = it => it[0] === "orders" ? view === "orders" && ui.board === it[4] : view === it[0];
  $("#nav").innerHTML = groups.map(g => {
    const items = g.items.filter(it => ADMIN || lvl() > 0 || it[3] === 0);
    if (!items.length) return "";
    const open = !NAVC.has(g.g) || items.some(isOn);
    return `<div><button class="ng-t" type="button" data-ngt="${esc(g.g)}" aria-expanded="${open}">${esc(g.g)}${ic("chev", "chev")}</button>${open ? items.map(it => {
      const [id, label, icon, min, b] = it, lk = !ADMIN && lvl() < min, on = isOn(it);
      const flagged = id === "orders" && !lk ? ITEMS.filter(i => i.board === b && !isTerm(i) && attention(i) && mineOk(i)).length : 0;
      const openEm = id === "email" && !ADMIN ? new Set(S.emails.filter(e => e.status === "open" && canMail(e)).map(e => (e.mailbox_id || "") + "|" + (e.thread_key || e.id))).size : 0;
      const badge = lk ? "" : flagged ? `<span class="ct">${flagged}</span>` : id === "inbox" && openCv ? `<span class="ct q">${openCv}</span>` : openEm ? `<span class="ct q">${openEm}</span>` : id === "approvals" && waitAp ? `<span class="ct">${waitAp}</span>` : "";
      return `<button type="button" class="ni${on ? " on" : ""}${lk ? " locked" : ""}" data-nav="${id}" ${b ? `data-board="${esc(b)}"` : ""} ${lk ? `title="For ${NEED[min]}"` : ""} ${on ? 'aria-current="page"' : ""}>${ic(icon)}<span>${esc(navLabel(id, label, b))}</span>${lk ? ic("lock", "lk") : badge}</button>`;
    }).join("") : ""}</div>`;
  }).join("") + (!ADMIN && can(4) ? `<button type="button" class="ni ni-cust" data-nav="settings" data-st="workspace">${ic("edit")}<span>Customize workspace</span></button>` : "");
  const nm = ADMIN ? nameOf(ME.email) : (memberName(ME.id) || nameOf(ME.email));
  $("#me").innerHTML = `${av(nm)}<div class="grow" style="min-width:0"><b>${esc(nm)}</b><span>${esc(ADMIN ? "Jreebs admin" : ROLES[ME.role].label)}${ME.memberships && ME.memberships.length > 1 ? ` · <button class="linkbtn" style="color:var(--side-muted)" type="button" data-act="switchco">switch</button>` : ""}</span></div><button class="ib" type="button" data-act="signout" aria-label="Sign out" title="Sign out">${ic("out")}</button>`;
}
const lockedView = min => `<div class="locked-v">${ic("lock")}<h2>This area is for ${NEED[min]}.</h2><p>You're signed in as <b>${esc(ROLES[ME.role].label)}</b>. Your company's owner decides who can see what.</p><button class="btn" type="button" data-nav="home">Back to ${navLabel("home")}</button></div>`;
function render() {
  if (!ME) return;
  if (!ADMIN) { setBoard(ui.board); refreshItems(); }
  renderNav();
  const min = ADMIN ? 0 : navMin(view);
  const grp = navGroups().find(g => g.items.some(it => it[0] === view))?.g || "";
  $("#title").innerHTML = `<span class="crumb">${esc(ADMIN ? "Jreebs" : CLIENT.name)}${grp && !ADMIN ? ` <i>/</i> ${esc(grp)}` : ""} <i>/</i></span> ${esc(view === "home" || view === "orders" ? navLabel(view, "", ui.board) : TITLES[view] || "")}`;
  const fn = VIEWS[view];
  try { $("#content").innerHTML = (!ADMIN && (lvl() < min || (lvl() === 0 && min > 0))) ? lockedView(min || 1) : fn ? fn() : ""; }
  catch (e) { console.error(e); $("#content").innerHTML = `<div class="locked-v"><h2>This page hit a problem.</h2><p>${esc(e.message)}</p><button class="btn" type="button" data-nav="home">Back to Home</button></div>`; }
  $("#themeBtn").innerHTML = isDark() ? ic("sun") : ic("moon");
  if (typeof bindView === "function") bindView();
}
function go(v) { view = v; ui.sel.clear(); closeDrawer(); $("#shell").classList.remove("nav-open"); render(); window.scrollTo(0, 0); }
let rTimer = null;
function softRender() {
  clearTimeout(rTimer);
  rTimer = setTimeout(() => {
    const a = document.activeElement;
    if (a && $("#content").contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { a.addEventListener("blur", softRender, { once: true }); return; }
    render();
    if (DRAWER && typeof reopenDrawer === "function") reopenDrawer();
  }, 250);
}

/* ---------- live updates + presence ---------- */
let liveCh = null, presCh = null;
function subscribeLive() {
  if (liveCh) sb.removeChannel(liveCh);
  const f = `client_id=eq.${CLIENT.id}`;
  const apply = (list) => p => { if (p.eventType === "DELETE") { const i = list.findIndex(x => x.id === p.old.id); if (i > -1) list.splice(i, 1); } else putRow(list, p.new); softRender(); };
  liveCh = sb.channel("live-" + CLIENT.id)
    .on("postgres_changes", { event: "*", schema: "public", table: "items", filter: f }, apply(S.items))
    .on("postgres_changes", { event: "*", schema: "public", table: "cases", filter: f }, apply(S.cases))
    .on("postgres_changes", { event: "*", schema: "public", table: "case_messages", filter: f }, p => { if (p.eventType === "INSERT" && !S.msgs.some(m => m.id === p.new.id)) S.msgs.push(p.new); softRender(); })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity", filter: f }, p => { if (!S.act.some(a => a.id === p.new.id)) S.act.unshift(p.new); softRender(); })
    .subscribe(st => { const el = $("#live"); if (el) el.classList.toggle("off", st !== "SUBSCRIBED"); });
}
function joinPresence() {
  if (presCh) sb.removeChannel(presCh);
  presCh = sb.channel("presence-" + CLIENT.id, { config: { presence: { key: ME.id } } });
  presCh.on("presence", { event: "sync" }, () => { ONLINE.clear(); Object.entries(presCh.presenceState()).forEach(([k, v]) => ONLINE.set(k, v[0])); softRender(); })
    .subscribe(async st => { if (st === "SUBSCRIBED") await presCh.track({ email: ME.email, role: ME.role, at: Date.now() }); });
}
async function signOut(scope) {
  if (DEMO) { location.href = location.pathname; return; }
  try { if (liveCh) sb.removeChannel(liveCh); if (presCh) sb.removeChannel(presCh); } catch (e) {}
  await sb.auth.signOut(scope ? { scope } : undefined);
  ME = null; CLIENT = null; ADMIN = false; showLogin("signin");
}

/* ---------- theme ---------- */
const isDark = () => { const a = document.documentElement.getAttribute("data-theme"); return a ? a === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
function toggleTheme() { const n = isDark() ? "light" : "dark"; document.documentElement.setAttribute("data-theme", n); try { localStorage.setItem("jreebs-theme", n); } catch (e) {} render(); }

/* ---------- notifications ---------- */
function showNotifs() {
  const p = $("#pop"); if (!p.hidden) { p.hidden = true; return; }
  const fl = ITEMS.filter(i => !isTerm(i) && i.flags.some(f => f.sev >= 2)).slice(0, 6);
  const acts = S.act.slice(0, 10);
  p.innerHTML = `<div class="card-h"><h3>Notifications</h3></div>
    ${fl.length ? `<div class="card-b small muted" style="padding-bottom:4px">Needs attention now</div>${fl.map(i => `<div class="att"><span class="bar s${topSev(i)}"></span><div style="min-width:0"><div class="t1">${esc(i.ext_id)} · ${esc(i.name)}</div><div class="t2">${esc(i.flags[0].text)}</div></div><div class="acts"><button class="btn sm" type="button" data-oo="${i.id}">Open</button></div></div>`).join("")}` : ""}
    <div class="card-b small muted" style="padding-bottom:4px">Latest activity</div>
    <ul class="feed">${acts.map(a => `<li><time>${hm(mins(new Date(a.at)))}</time><span>${esc(a.text)} <small>· ${esc(nameOf(a.actor_email || "system"))}</small></span></li>`).join("") || `<li><time></time><span class="muted">Nothing yet.</span></li>`}</ul>`;
  p.hidden = false; $("#bellBtn .dot")?.remove();
}
