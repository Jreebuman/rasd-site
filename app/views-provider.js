/* Provider console (Jreebs admins): clients, contracts, onboarding, quotes, tickets, assistant usage.
   Reads per-company totals only (provider_overview); it never opens a client's customers or orders. */
const PLANS = {
  starter: { name: "Starter", price: 490, users: 5, extra: 60, setup: 150, ai: 1500, deep: 20, channels: 1, inboxes: 1, connectors: 0, support: 1.5, infra: 25 },
  professional: { name: "Professional", price: 1190, users: 15, extra: 50, setup: 350, ai: 6000, deep: 100, channels: 2, inboxes: 3, connectors: 1, support: 3, infra: 40 },
  business: { name: "Business", price: 2490, users: 40, extra: 40, setup: 750, ai: 20000, deep: 400, channels: 3, inboxes: 6, connectors: 3, support: 5, infra: 80 }
};
const ADDON = { connector: 300, connectorSetup: 250, channel: 90, aiPack: 60 };
const COST = { aiUserUSD: 15.6, usdJod: 0.709, hourJod: 10, connectorHoursMonth: 0.5 };
const planKey = p => ({ growth: "professional", pro: "business" }[p] || p || "starter");
const jod = n => fmtN(Math.round(n)) + " JOD";
function quote(o) {
  const P = PLANS[planKey(o.plan)], users = Math.max(1, +o.users || P.users), extraUsers = Math.max(0, users - P.users);
  const conn = Math.max(0, (+o.connectors || 0) - P.connectors), chan = Math.max(0, (+o.channels || 0) - P.channels), packs = Math.max(0, +o.aiPacks || 0);
  const lines = [[`${P.name} plan · ${P.users} users included`, P.price], ...(extraUsers ? [[`${extraUsers} extra users × ${P.extra} JOD`, extraUsers * P.extra]] : []), ...(conn ? [[`${conn} extra direct connection${conn > 1 ? "s" : ""} × ${ADDON.connector} JOD`, conn * ADDON.connector]] : []), ...(chan ? [[`${chan} extra WhatsApp number / inbox × ${ADDON.channel} JOD`, chan * ADDON.channel]] : []), ...(packs ? [[`${packs} assistant pack${packs > 1 ? "s" : ""} (+1,000 questions/month) × ${ADDON.aiPack} JOD`, packs * ADDON.aiPack]] : [])];
  const list = lines.reduce((a, l) => a + l[1], 0), disc = Math.min(30, Math.max(0, +o.discount || 0)), price = Math.round(list * (1 - disc / 100));
  const setup = P.setup + conn * ADDON.connectorSetup;
  const ai = users * COST.aiUserUSD * COST.usdJod * (1 + packs * 0.15), support = (P.support + conn * COST.connectorHoursMonth) * 12 * COST.hourJod, cost = Math.round(ai + P.infra + support);
  return { P, users, lines, list, disc, price, setup, cost, ai: Math.round(ai), support: Math.round(support), infra: P.infra, margin: price - cost, pct: price ? Math.round((price - cost) / price * 100) : 0, aiLimit: P.ai + packs * 1000, deepLimit: P.deep };
}
const STATUS = { trial: ["Trial", "info"], onboarding: ["Onboarding", "warn"], active: ["Active", "good"], paused: ["Paused", "acc"], churned: ["Left", "crit"] };
const CHECK = [["quote", "Quote agreed"], ["contract", "Contract signed"], ["owner", "Owner signed up"], ["profile", "Company profile filled"], ["team", "Team invited"], ["import", "Data imported"], ["rules", "Time limits and rules set"], ["templates", "Message templates checked"], ["sops", "SOPs added"], ["channels", "Mailboxes and channels connected"], ["training", "Team trained"], ["live", "Live"]];

let ADM = { clients: [], accts: [], members: [], invites: [], tickets: [], over: [], ai: [] };
async function loadAdmin() {
  const [clients, accts, members, invites, tickets, over, ai] = await Promise.all([
    DB.list("clients", { order: ["created_at", false] }), DB.list("client_accounts"), DB.list("client_users", { select: "client_id, role, auth_user_id" }), DB.list("pending_invites"),
    DB.list("tickets", { order: ["created_at", false] }), DB.rpc("provider_overview").catch(e => { console.warn(e); return []; }),
    DB.list("ai_log", { gte: { created_at: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() }, select: "client_id, model, cost_usd, deep, question, created_at", limit: 20000 })
  ]);
  ADM = { clients, accts, members, invites, tickets, over: over || [], ai, loaded: true };
}
const acctOf = id => ADM.accts.find(a => a.client_id === id) || { client_id: id, status: "onboarding", users_included: PLANS[planKey(ADM.clients.find(c => c.id === id)?.plan)].users, annual_price: 0, setup_fee: 0, checklist: {}, addons: {} };
const overOf = id => ADM.over.find(o => o.client_id === id) || {};
const doneSteps = a => CHECK.filter(([k]) => a.checklist?.[k]).length;
const inviteLink = email => `${location.origin}${location.pathname}?signup&email=${encodeURIComponent(email)}`;
const inviteText = (name, email) => `Hi ${name || ""}, your Jreebs workspace is ready. Create your account with this email (${email}) here: ${inviteLink(email)}\nYou'll land straight in your company's workspace.`.replace("Hi ,", "Hi,");
function admGuard() { if (!ADM.loaded) { ADM.loaded = true; loadAdmin().then(render).catch(e => { toast(errMsg(e)); }); return `<div class="loading">Loading your clients…</div>`; } return null; }

function quotaOf(id) { const c = ADM.clients.find(x => x.id === id), a = acctOf(id), P = PLANS[planKey(c?.plan)]; const lim = +(a.addons?.ai_limit || P.ai), used = ADM.ai.filter(r => r.client_id === id && r.question && !r.deep).length; return { used, lim, pct: lim ? Math.round(used / lim * 100) : 0, deep: ADM.ai.filter(r => r.client_id === id && r.deep).length, deepLim: +(a.addons?.deep_limit || P.deep), cost: ADM.ai.filter(r => r.client_id === id).reduce((s, r) => s + +r.cost_usd, 0) }; }

function quoteForm(o, pre) {
  return `<div class="f2"><div class="field"><label for="${pre}p">Plan</label><select class="sel" id="${pre}p" data-q="1">${Object.entries(PLANS).map(([k, p]) => `<option value="${k}" ${planKey(o.plan) === k ? "selected" : ""}>${p.name} · ${p.price} JOD / year</option>`).join("")}</select></div>
    <div class="field"><label for="${pre}u">Users</label><input class="in num" id="${pre}u" type="number" min="1" value="${o.users || PLANS[planKey(o.plan)].users}" data-q="1"></div></div>
    <div class="f3"><div class="field"><label for="${pre}c">Direct connections</label><input class="in num" id="${pre}c" type="number" min="0" value="${o.connectors || 0}" data-q="1"></div>
    <div class="field"><label for="${pre}w">WhatsApp numbers + inboxes</label><input class="in num" id="${pre}w" type="number" min="0" value="${o.channels || 1}" data-q="1"></div>
    <div class="field"><label for="${pre}a">Assistant packs</label><input class="in num" id="${pre}a" type="number" min="0" value="${o.aiPacks || 0}" data-q="1"></div></div>
    <div class="field"><label for="${pre}d">Discount %</label><input class="in num" id="${pre}d" type="number" min="0" max="30" value="${o.discount || 0}" data-q="1"></div>`;
}
const readQuote = pre => ({ plan: val(`#${pre}p`), users: +val(`#${pre}u`), connectors: +val(`#${pre}c`), channels: +val(`#${pre}w`), aiPacks: +val(`#${pre}a`), discount: +val(`#${pre}d`) });
function quoteBox(q) {
  return `<div class="tw"><table class="t"><tbody>${q.lines.map(([l, v]) => `<tr><td>${esc(l)}</td><td class="r num">${jod(v)}</td></tr>`).join("")}${q.disc ? `<tr><td>Discount ${q.disc}%</td><td class="r num">−${jod(q.list - q.price)}</td></tr>` : ""}
    <tr class="tot"><td><b>Per year</b> <span class="small muted">before 16% sales tax</span></td><td class="r num"><b>${jod(q.price)}</b></td></tr><tr><td>One-time setup</td><td class="r num">${jod(q.setup)}</td></tr></tbody></table></div>
    <div class="qcost${q.pct < 40 ? " low" : ""}"><span>Your estimated cost ${jod(q.cost)} a year (AI ${jod(q.ai)}, hosting ${jod(q.infra)}, support ${jod(q.support)})</span><b>Margin ${jod(q.margin)} · ${q.pct}%</b>${q.pct < 40 ? `<span>Below 40%. Raise the price or reduce the discount.</span>` : ""}</div>
    <p class="small muted">Includes ${fmtN(q.aiLimit)} assistant questions and ${q.deepLimit} deep analyses a month, ${q.P.channels} WhatsApp number${q.P.channels > 1 ? "s" : ""}, ${q.P.inboxes} email inbox${q.P.inboxes > 1 ? "es" : ""} and ${q.P.connectors} direct connection${q.P.connectors === 1 ? "" : "s"}.</p>`;
}
const quoteText = (q, company) => `Jreebs quote${company ? " for " + company : ""}\n\n${q.lines.map(([l, v]) => `• ${l}: ${fmtN(v)} JOD`).join("\n")}${q.disc ? `\n• Discount ${q.disc}%: −${fmtN(q.list - q.price)} JOD` : ""}\n\nTotal per year: ${fmtN(q.price)} JOD (before 16% sales tax)\nOne-time setup: ${fmtN(q.setup)} JOD (workspace build, data import, team training)\n\nIncludes ${fmtN(q.aiLimit)} assistant questions a month, support in Arabic and English, and your data exportable at any time.`;

VIEWS.quote = function () {
  ui.qo = ui.qo || { plan: "professional", users: 15, connectors: 1, channels: 2, aiPacks: 0, discount: 0 };
  const q = quote(ui.qo);
  return `${head("Quote calculator", "Price a company by plan, users and add-ons. Your cost and margin are shown so a quote never goes below cost.", "")}
  <div class="grid2e"><section class="card"><div class="card-h"><h3>What they need</h3></div><div class="card-b form" id="qForm">${quoteForm(ui.qo, "qq")}</div></section>
  <section class="card"><div class="card-h"><h3>Quote</h3><span class="spacer"></span><button class="btn sm" type="button" data-copyquote="1">Copy quote text</button><button class="btn sm go" type="button" data-modal="newclient" data-fromquote="1">Start onboarding</button></div><div class="card-b" id="qOut">${quoteBox(q)}</div></section></div>
  ${card("Plans", `<div class="tw"><table class="t"><thead><tr><th>Plan</th><th class="r">Per year</th><th class="r">Users</th><th class="r">Extra user</th><th class="r">Questions / month</th><th class="r">Deep / month</th><th class="r">Setup</th></tr></thead><tbody>${Object.values(PLANS).map(p => `<tr><td><b>${p.name}</b></td><td class="r num">${jod(p.price)}</td><td class="r num">${p.users}</td><td class="r num">${p.extra} JOD</td><td class="r num">${fmtN(p.ai)}</td><td class="r num">${p.deep}</td><td class="r num">${jod(p.setup)}</td></tr>`).join("")}</tbody></table></div>`, true)}`;
};

VIEWS.pv_usage = function () {
  const g = admGuard(); if (g) return g;
  const rows = ADM.clients.map(c => ({ c, q: quotaOf(c.id) })).sort((a, b) => b.q.cost - a.q.cost);
  const tot = rows.reduce((a, r) => a + r.q.cost, 0);
  return `${head("Assistant usage", `This month · $${tot.toFixed(2)} in AI costs across all clients`, "")}
  <section class="card"><div class="tw"><table class="t"><thead><tr><th>Company</th><th class="r">Questions</th><th>Allowance used</th><th class="r">Deep analyses</th><th class="r">Cost (USD)</th><th class="r">Cost (JOD)</th></tr></thead><tbody>${rows.map(({ c, q }) => `<tr data-pvc="${c.id}" class="click"><td><b>${esc(c.name)}</b></td><td class="r num">${q.used}</td><td style="min-width:150px">${prog(q.used, q.lim)}<span class="small muted">${q.pct}% of ${fmtN(q.lim)}</span></td><td class="r num">${q.deep} / ${q.deepLim}</td><td class="r num">$${q.cost.toFixed(2)}</td><td class="r num">${(q.cost * COST.usdJod).toFixed(2)}</td></tr>`).join("")}</tbody></table></div></section>
  <div class="note-box">${ic("info")}<span>Each company is stopped at its monthly allowance. Raise a limit in the client's contract, or sell an assistant pack.</span></div>`;
};

VIEWS.tickets = function () {
  const g = admGuard(); if (g) return g;
  const name = id => ADM.clients.find(c => c.id === id)?.name || "—";
  return `${head("Support tickets", "Requests from your clients.", `<button class="btn" type="button" data-admreload="1">${ic("refresh")}Refresh</button>`)}
  <section class="card"><div class="tw"><table class="t"><thead><tr><th>When</th><th>Company</th><th>Request</th><th>From</th><th>Status</th></tr></thead><tbody>${ADM.tickets.map(t => `<tr><td>${ago(t.created_at)}</td><td><b>${esc(name(t.client_id))}</b></td><td class="wrap"><b>${esc(t.subject)}</b>${t.details ? `<div class="small muted">${esc(t.details)}</div>` : ""}${t.urgency === "Urgent" ? " " + pill("Urgent", "crit") : ""}</td><td>${esc(t.created_by_email || "")}</td><td><select class="sel" data-tkstatus="${t.id}" style="height:30px">${["Open", "In progress", "Done"].map(s => `<option ${t.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("") || `<tr><td colspan="5">${empty("No tickets yet.")}</td></tr>`}</tbody></table></div></section>`;
};

function clientCreatedModal(c, email, phone, contact, status) {
  const text = inviteText(contact, email);
  openModal(`${mHead(`${esc(c.name)} is set up`)}<div class="m-b stack">
    <p>${status === "linked" ? `<b>${esc(email)}</b> already had an account, so they're linked as Owner now.` : `When <b>${esc(email)}</b> creates an account, they're linked as Owner automatically.`}</p>
    <div class="field"><label for="invTxt">Message to send them</label><textarea class="in" id="invTxt" rows="4">${esc(text)}</textarea></div>
    <div class="row"><button class="btn" type="button" data-copy="${esc(text)}">Copy message</button>${phone ? `<a class="btn go" href="https://wa.me/${waNum(phone)}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${ic("wa")}Open in WhatsApp</a>` : ""}</div>
    <p class="small muted">Next: work through the go-live checklist on the client's page.</p>
  </div><div class="m-f"><button class="btn go" type="button" data-pvc="${c.id}">Open ${esc(c.name)}</button></div>`);
}

/* ---------- CLIENTS: the provider's home ---------- */
const daysSince = iso => iso ? (Date.now() - new Date(iso)) / 864e5 : null;
function healthOf(c) {
  const a = acctOf(c.id), o = overOf(c.id), last = daysSince(o.last_activity), d = daysUntil(a.renews_on);
  if (c.disabled_at) return ["Disabled", ""];
  if (a.status === "churned") return ["Left", ""];
  if (a.status === "paused") return ["Paused", ""];
  if ((d != null && d < 0) || (a.status === "active" && (last == null || last > 7))) return ["Needs attention", "crit"];
  if (["trial", "onboarding"].includes(a.status) || (last != null && last > 3) || (d != null && d <= 30)) return ["Watch", "warn"];
  return ["Healthy", "good"];
}
function needsYou() {
  const out = [];
  ADM.clients.forEach(c => {
    const a = acctOf(c.id), o = overOf(c.id), d = daysUntil(a.renews_on), age = daysSince(c.created_at);
    if (a.status === "churned" || c.disabled_at) return;
    if (d != null && d <= 60) out.push([d < 0 ? 3 : d <= 30 ? 2 : 1, c, a.status === "trial" ? `Trial ${d < 0 ? "ended" : "ends"} ${d < 0 ? -d + " days ago" : d === 0 ? "today" : "in " + d + " days"}: agree a plan` : `Renewal ${d < 0 ? `overdue by ${-d} days` : d === 0 ? "today" : `in ${d} days`} · ${jod(a.annual_price)}`]);
    if (a.status === "onboarding" && age > 14 && doneSteps(a) < CHECK.length / 2) out.push([2, c, `Onboarding for ${Math.round(age)} days, ${doneSteps(a)} of ${CHECK.length} steps done`]);
    if (a.status === "active" && (!o.last_activity || daysSince(o.last_activity) > 7)) out.push([2, c, o.last_activity ? `No activity for ${Math.round(daysSince(o.last_activity))} days` : "No activity yet"]);
    if (o.pending) out.push([1, c, `${o.pending} invite${o.pending > 1 ? "s" : ""} not accepted yet`]);
    const q = quotaOf(c.id); if (q.pct >= 80) out.push([q.pct >= 100 ? 3 : 2, c, `Assistant allowance ${q.pct}% used this month`]);
  });
  ADM.tickets.filter(t => t.status !== "Done" && t.urgency === "Urgent").forEach(t => out.push([3, ADM.clients.find(c => c.id === t.client_id) || { name: "—" }, `Urgent ticket: ${t.subject}`]));
  return out.sort((a, b) => b[0] - a[0]);
}
VIEWS.clients = function () {
  const g = admGuard(); if (g) return g;
  const f = ui.pvf || "all", q = (ui.pvq || "").toLowerCase();
  const act = ADM.clients.filter(c => acctOf(c.id).status === "active"), onb = ADM.clients.filter(c => ["trial", "onboarding"].includes(acctOf(c.id).status));
  const ren = ADM.clients.filter(c => { const d = daysUntil(acctOf(c.id).renews_on); return d != null && d <= 60 && acctOf(c.id).status !== "churned"; });
  const openT = ADM.tickets.filter(t => t.status !== "Done"), attn = needsYou();
  const rows = ADM.clients.filter(c => (f === "all" || acctOf(c.id).status === f) && (!q || (c.name + " " + (acctOf(c.id).contact_name || "")).toLowerCase().includes(q)));
  return `${head("Clients", `${ADM.clients.length} companies on Jreebs`, `<button class="btn" type="button" data-admreload="1">${ic("refresh")}Refresh</button><button class="btn go" type="button" data-modal="newclient">${ic("plus")}New client</button>`)}
  <div class="kpis">${kpi("Active", act.length, `${onb.length} onboarding or on trial`)}${kpi("Yearly revenue", jod(act.reduce((s, c) => s + +acctOf(c.id).annual_price, 0)), "active contracts")}${kpi("Renewals in 60 days", ren.length, ren.length ? jod(ren.reduce((s, c) => s + +acctOf(c.id).annual_price, 0)) : "none", ren.some(c => daysUntil(acctOf(c.id).renews_on) <= 30) ? "warn" : "")}${kpi("Open tickets", openT.length, `${openT.filter(t => t.urgency === "Urgent").length} urgent`, openT.some(t => t.urgency === "Urgent") ? "crit" : "")}${kpi("Users", ADM.over.reduce((s, o) => s + (o.members || 0), 0), "with a login")}</div>
  ${attn.length ? `<section class="card"><div class="card-h"><h3>Needs you</h3><span class="sub">${attn.length}</span></div><div class="tw"><table class="t"><tbody>${attn.slice(0, 6).map(([s, c, t]) => `<tr class="click" data-pvc="${c.id || ""}"><td style="width:6px;padding-right:0"><span class="sev s${s}"></span></td><td><b>${esc(c.name)}</b><div class="small muted">${esc(t)}</div></td></tr>`).join("")}</tbody></table></div>${attn.length > 6 ? `<div class="card-b small muted">+${attn.length - 6} more on the client pages</div>` : ""}</section>` : ""}
  <section class="card"><div class="card-h"><div class="tabs">${[["all", "All"], ...Object.entries(STATUS).map(([k, v]) => [k, v[0]])].map(([k, l]) => `<button class="tab" type="button" data-pvf="${k}" aria-selected="${f === k}">${l} <span class="c">${k === "all" ? ADM.clients.length : ADM.clients.filter(c => acctOf(c.id).status === k).length}</span></button>`).join("")}</div><span class="spacer"></span><input class="in" id="pvq" type="search" placeholder="Find a client" value="${esc(ui.pvq || "")}" style="width:180px"></div>
  <div class="tw"><table class="t"><thead><tr><th>Company</th><th>Health</th><th>Plan</th><th class="r">Users</th><th class="r">Per year</th><th>Renews</th><th>Last active</th><th></th></tr></thead><tbody>${rows.map(c => { const a = acctOf(c.id), o = overOf(c.id), d = daysUntil(a.renews_on), [hl, hk] = healthOf(c); return `<tr class="click" data-pvc="${c.id}">
    <td><b>${esc(c.name)}</b><div class="small muted">${esc((TEMPLATES[c.workspace_type] || TEMPLATES.general).name)}${a.contact_name ? " · " + esc(a.contact_name) : ""}</div></td>
    <td><span class="row" style="gap:6px;flex-wrap:nowrap"><span class="hdot ${hk}"></span>${esc(hl)}</span><div class="small muted">${esc(STATUS[a.status]?.[0] || "")}</div></td><td>${esc(PLANS[planKey(c.plan)].name)}</td>
    <td class="r num">${o.members ?? "—"}<span class="muted"> / ${a.users_included}</span>${o.pending ? `<div class="small muted">+${o.pending} invited</div>` : ""}</td>
    <td class="r num">${a.annual_price ? jod(a.annual_price) : "—"}</td>
    <td>${a.renews_on ? dShort(a.renews_on) + (d != null && d <= 60 ? `<div class="small ${d <= 30 ? "warn-t" : "muted"}">${d < 0 ? "overdue" : "in " + d + " days"}</div>` : "") : "—"}</td>
    <td class="small">${o.last_activity ? ago(o.last_activity) : "—"}</td>
    <td class="r"><button class="btn sm" type="button" data-pvinv="${c.id}">${ic("plus")}Invite</button></td></tr>`; }).join("") || `<tr><td colspan="8">${empty(ADM.clients.length ? "No clients match." : "No clients yet. Press New client to add your first one.")}</td></tr>`}</tbody></table></div></section>`;
};

/* ---------- one client ---------- */
function clientDrawer(id) {
  const c = ADM.clients.find(x => x.id === id); if (!c) return;
  const a = acctOf(id), o = overOf(id), q = quotaOf(id), inv = ADM.invites.filter(i => i.client_id === id), [hl, hk] = healthOf(c);
  const roles = {}; ADM.members.filter(m => m.client_id === id).forEach(m => roles[m.role] = (roles[m.role] || 0) + 1);
  const tab = ui.pvtab || "summary", pendingOwner = inv.find(i => i.role === "owner" && !i.accepted_at);
  DRAWER = { type: "pvc", id };
  const tabs = `<div class="tabs" style="margin-bottom:4px">${[["summary", "Summary"], ["people", "People & invites"], ["contract", "Contract"], ["setup", `Setup ${doneSteps(a)}/${CHECK.length}`]].map(([k, l]) => `<button class="tab" type="button" data-pvtab="${k}" data-id="${id}" aria-selected="${tab === k}">${l}</button>`).join("")}</div>`;
  let body = "";
  if (tab === "summary") body = `<div class="kv"><span>Health</span><b><span class="hdot ${hk}"></span> ${esc(hl)} · ${esc(STATUS[a.status]?.[0] || "")}</b><span>Business type</span><b>${esc((TEMPLATES[c.workspace_type] || TEMPLATES.general).name)}</b><span>Plan</span><b>${esc(PLANS[planKey(c.plan)].name)} · ${a.annual_price ? jod(a.annual_price) + " a year" : "no price yet"}</b><span>Users</span><b>${o.members ?? 0} of ${a.users_included}${o.pending ? ` · ${o.pending} invited` : ""}</b><span>Renews</span><b>${a.renews_on ? dLong(a.renews_on) : "—"}</b><span>Last 7 days</span><b>${o.items_7d ?? 0} records · last active ${o.last_activity ? ago(o.last_activity) : "never"}</b><span>Assistant</span><b>${q.used} of ${fmtN(q.lim)} questions · $${q.cost.toFixed(2)}</b><span>Contact</span><b>${esc(a.contact_name || "—")}${a.contact_phone ? " · " + esc(a.contact_phone) : ""}</b></div>
    <div class="row"><button class="btn go" type="button" data-pvinv="${id}">${ic("plus")}Invite someone</button>${pendingOwner ? `<button class="btn" type="button" data-copy="${esc(inviteText(a.contact_name, pendingOwner.email))}">Copy owner's invite</button>` : ""}${a.contact_phone ? `<a class="btn" href="https://wa.me/${waNum(a.contact_phone)}" target="_blank" rel="noopener">${ic("wa")}WhatsApp ${esc((a.contact_name || "contact").split(" ")[0])}</a>` : ""}${a.status !== "active" && a.status !== "churned" ? `<button class="btn" type="button" data-chk="live" data-id="${id}">${ic("check")}Mark live</button>` : ""}</div>
    <h4>Tickets</h4>${ADM.tickets.filter(t => t.client_id === id).slice(0, 6).map(t => `<div class="kvrow"><span>${esc(t.subject)}${t.urgency === "Urgent" ? " " + pill("Urgent", "crit") : ""}<div class="small muted">${ago(t.created_at)}</div></span>${pill(t.status, t.status === "Done" ? "good" : "warn")}</div>`).join("") || `<p class="small muted">No tickets.</p>`}`;
  if (tab === "summary") body += accessBox(c);
  if (tab === "people") body = `<div class="kv"><span>With a login</span><b>${Object.entries(roles).map(([r, n]) => `${n} ${ROLES[r]?.label.toLowerCase() || r}`).join(", ") || "Nobody yet"}</b></div>
    <div class="row"><input class="in grow" id="pvInv" type="email" placeholder="their@company.com" value="${esc(!o.members && a.owner_email ? a.owner_email : "")}"><select class="sel" id="pvRole">${ROLE_ORDER.map(r => `<option value="${r}" ${r === (o.members ? "manager" : "owner") ? "selected" : ""}>${ROLES[r].label}</option>`).join("")}</select><button class="btn go" type="button" data-pvinvite="${id}">Invite</button></div>
    <p class="small muted">If they don't have an account yet, they're linked the moment they sign up with this email.</p>
    ${inv.length ? `<div class="tw"><table class="t"><tbody>${inv.map(i => `<tr><td>${esc(i.email)}<div class="small muted">${esc(ROLES[i.role]?.label || i.role)} · ${i.accepted_at ? "joined " + dShort(i.accepted_at) : "invited " + ago(i.created_at)}</div></td><td class="r">${i.accepted_at ? pill("Joined", "good") : `<div class="row" style="flex-wrap:nowrap;justify-content:flex-end"><button class="btn sm" type="button" data-copy="${esc(inviteText(a.contact_name, i.email))}">Copy invite</button>${a.contact_phone && i.role === "owner" ? `<a class="btn sm" href="https://wa.me/${waNum(a.contact_phone)}?text=${encodeURIComponent(inviteText(a.contact_name, i.email))}" target="_blank" rel="noopener">${ic("wa")}Send</a>` : ""}</div>`}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small muted">No invites yet.</p>`}`;
  if (tab === "contract") body = `<div class="form">
      <div class="f2"><div class="field"><label for="ca1">Status</label><select class="sel" id="ca1">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${a.status === k ? "selected" : ""}>${v[0]}</option>`).join("")}</select></div>
      <div class="field"><label for="ca2">Plan</label><select class="sel" id="ca2">${Object.entries(PLANS).map(([k, p]) => `<option value="${k}" ${planKey(c.plan) === k ? "selected" : ""}>${p.name}</option>`).join("")}</select></div></div>
      <div class="f3"><div class="field"><label for="ca3">Users included</label><input class="in num" id="ca3" type="number" min="1" value="${a.users_included}"></div><div class="field"><label for="ca4">Price per year (JOD)</label><input class="in num" id="ca4" type="number" min="0" value="${a.annual_price}"></div><div class="field"><label for="ca5">Setup fee (JOD)</label><input class="in num" id="ca5" type="number" min="0" value="${a.setup_fee}"></div></div>
      <div class="f2"><div class="field"><label for="ca6">Starts</label><input class="in" id="ca6" type="date" value="${a.starts_on || ""}"></div><div class="field"><label for="ca7">Renews</label><input class="in" id="ca7" type="date" value="${a.renews_on || ""}"></div></div>
      <div class="f3"><div class="field"><label for="ca8">Contact</label><input class="in" id="ca8" value="${esc(a.contact_name || "")}"></div><div class="field"><label for="ca9">Phone</label><input class="in" id="ca9" value="${esc(a.contact_phone || "")}"></div><div class="field"><label for="ca10">Owner email</label><input class="in" id="ca10" type="email" value="${esc(a.owner_email || "")}"></div></div>
      <div class="f2"><div class="field"><label for="ca11">Assistant questions / month</label><input class="in num" id="ca11" type="number" min="0" value="${q.lim}"></div><div class="field"><label for="ca12">Deep analyses / month</label><input class="in num" id="ca12" type="number" min="0" value="${q.deepLim}"></div></div>
      <div class="field"><label for="ca13">Notes</label><textarea class="in" id="ca13" rows="2">${esc(a.notes || "")}</textarea></div>
      <div class="row"><span class="spacer"></span><button class="btn go" type="button" data-saveacct="${id}">Save contract</button></div></div>`;
  if (tab === "setup") body = `<p class="small muted">Tick each step as you finish it. Marking Live also sets the client to Active.</p><div class="checks">${CHECK.map(([k, l]) => `<button class="chk${a.checklist?.[k] ? " on" : ""}" type="button" data-chk="${k}" data-id="${id}">${ic("check")}<span>${l}</span></button>`).join("")}</div>`;
  openDrawer(`${dHead(esc(c.name), `<span class="hdot ${hk}"></span>` + pill(...(STATUS[a.status] || ["—", ""])) + pill(PLANS[planKey(c.plan)].name, "acc"))}<div class="d-b">${tabs}${body}</div>`);
}
// Turning a client off (data kept) and removing a client for good
const accessBox = c => `<h4>Access</h4>${c.disabled_at
  ? `<div class="note-box warn">${ic("lock")}<span>Dashboard disabled ${dShort(c.disabled_at)}. Nobody at ${esc(c.name)} can get in, and their data is kept.</span></div>
    <div class="row"><button class="btn go" type="button" data-pvon="${c.id}">Turn dashboard back on</button><span class="spacer"></span><button class="btn danger" type="button" data-pvrm="${c.id}">Remove company</button></div>`
  : `<p class="small muted">Disabling blocks everyone at ${esc(c.name)} straight away, for example while a payment is late. Nothing is deleted, and you can turn it back on any time. Removing a company is possible once it's disabled.</p>
    <div class="row"><button class="btn" type="button" data-pvoff="${c.id}">${ic("lock")}Disable dashboard</button></div>`}`;
function disableClientModal(id) {
  const c = ADM.clients.find(x => x.id === id);
  openModal(`${mHead(`Disable ${esc(c.name)}'s dashboard?`)}<div class="m-b stack"><p>Everyone at <b>${esc(c.name)}</b> is blocked straight away and sees a "workspace paused" message when they sign in. Their data stays, and you can turn it back on any time.</p></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-pvoffgo="${id}">Disable</button></div>`);
}
function removeClientModal(id) {
  const c = ADM.clients.find(x => x.id === id), n = ADM.members.filter(m => m.client_id === id).length;
  openModal(`${mHead(`Remove ${esc(c.name)} for good?`)}<div class="m-b stack">
    <div class="note-box warn">${ic("info")}<span>This permanently deletes the company with all its records, customers, people, settings and history, plus the ${n} login${n === 1 ? "" : "s"} that belong only to it. It can't be undone.</span></div>
    <p class="small muted">If they want a copy of their data, turn the dashboard back on for a day and ask their owner to download it: Import & export › Download everything.</p>
    <div class="field"><label for="rmName">Type <b>${esc(c.name)}</b> to confirm</label><input class="in" id="rmName" autocomplete="off"></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn danger" type="button" data-pvrmgo="${id}">Remove permanently</button></div>`);
}
function pvInviteModal(id) {
  const c = ADM.clients.find(x => x.id === id), a = acctOf(id), o = overOf(id);
  openModal(`${mHead(`Invite someone to ${esc(c.name)}`)}<div class="m-b form">
    <div class="f2"><div class="field"><label for="pvInv">Their email</label><input class="in" id="pvInv" type="email" placeholder="name@company.com" value="${esc(!o.members && a.owner_email ? a.owner_email : "")}"></div><div class="field"><label for="pvRole">Role</label><select class="sel" id="pvRole">${ROLE_ORDER.map(r => `<option value="${r}" ${r === (o.members ? "agent" : "owner") ? "selected" : ""}>${ROLES[r].label}</option>`).join("")}</select></div></div>
    <p class="small muted">They get access the moment they sign up with this email. You'll get a message to send them.</p></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-pvinvite="${id}" data-modalinv="1">Invite</button></div>`);
}
function invitedModal(c, email, role, phone, contact, status) {
  const text = inviteText(role === "owner" ? contact : "", email);
  openModal(`${mHead("Invite ready")}<div class="m-b stack">
    <p>${status === "linked" ? `<b>${esc(email)}</b> already had an account, so they're in ${esc(c.name)} as ${esc(ROLES[role].label)} now.` : `<b>${esc(email)}</b> joins ${esc(c.name)} as ${esc(ROLES[role].label)} as soon as they create their account.`}</p>
    <div class="field"><label for="invTxt">Message to send them</label><textarea class="in" id="invTxt" rows="4">${esc(text)}</textarea></div>
    <div class="row"><button class="btn" type="button" data-copy="${esc(text)}">Copy message</button>${phone && role === "owner" ? `<a class="btn go" href="https://wa.me/${waNum(phone)}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${ic("wa")}Open in WhatsApp</a>` : ""}</div></div>
    <div class="m-f"><button class="btn go" type="button" data-pvc="${c.id}">Open ${esc(c.name)}</button></div>`);
}
const quoteLine = q => `<div class="qline"><b>${jod(q.price)} a year</b><span>+ ${jod(q.setup)} setup · your margin ${q.pct}%${q.pct < 40 ? " (low)" : ""}</span></div>`;
function newClientModal(fromQuote) {
  const o = fromQuote && ui.qo ? ui.qo : { plan: "professional", users: 15, connectors: 0, channels: 1, aiPacks: 0, discount: 0 };
  openModal(`${mHead("New client")}<div class="m-b form">
    <div class="f2"><div class="field"><label for="ncn">Company name</label><input class="in" id="ncn" placeholder="e.g. Cedar Trading"></div><div class="field"><label for="nct">Business type</label><select class="sel" id="nct">${Object.entries(TEMPLATES).map(([k, t]) => `<option value="${k}">${esc(t.name)} · ${esc(t.desc)}</option>`).join("")}</select></div></div>
    <div class="f3"><div class="field"><label for="ncc">Owner's name</label><input class="in" id="ncc"></div><div class="field"><label for="nce">Owner's email</label><input class="in" id="nce" type="email" placeholder="owner@company.com"></div><div class="field"><label for="ncph">Owner's WhatsApp</label><input class="in" id="ncph" placeholder="07x xxx xxxx"></div></div>
    <div class="f2"><div class="field"><label for="nqp">Plan</label><select class="sel" id="nqp" data-q="1">${Object.entries(PLANS).map(([k, p]) => `<option value="${k}" ${planKey(o.plan) === k ? "selected" : ""}>${p.name} · ${fmtN(p.price)} JOD a year · ${p.users} users</option>`).join("")}</select></div><div class="field"><label for="nqu">Users</label><input class="in num" id="nqu" type="number" min="1" value="${o.users}" data-q="1"></div></div>
    <details class="more-opt"><summary>Add-ons, discount and start date</summary><div class="form" style="margin-top:10px">
      <div class="f3"><div class="field"><label for="nqc">Direct connections</label><input class="in num" id="nqc" type="number" min="0" value="${o.connectors || 0}" data-q="1"></div><div class="field"><label for="nqw">Mailboxes / channels</label><input class="in num" id="nqw" type="number" min="0" value="${o.channels || 1}" data-q="1"></div><div class="field"><label for="nqa">Assistant packs</label><input class="in num" id="nqa" type="number" min="0" value="${o.aiPacks || 0}" data-q="1"></div></div>
      <div class="f2"><div class="field"><label for="nqd">Discount %</label><input class="in num" id="nqd" type="number" min="0" max="30" value="${o.discount || 0}" data-q="1"></div><div class="field"><label for="ncs">Contract starts</label><input class="in" id="ncs" type="date" value="${isoDay(new Date())}"></div></div></div></details>
    <div id="ncQuote">${quoteLine(quote(o))}</div>
  </div><div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-saveclient="1">Create and invite owner</button></div>`, true);
}

/* ---------- TEST LOGINS: one account per role, to check every view yourself ---------- */
const TEST_SLUG = "jreebs-test";
const testEmail = (base, role) => base.replace("@", "+" + role.replace("_", "") + "@");
VIEWS.pv_test = function () {
  const g = admGuard(); if (g) return g;
  const test = ADM.clients.find(c => c.slug === TEST_SLUG), base = ui.testBase || ME.email;
  const inv = test ? ADM.invites.filter(i => i.client_id === test.id) : [];
  const app = location.origin + location.pathname;
  return `${head("Test logins", "Sign in as each role to check what your clients see.", "")}
  <section class="card"><div class="card-h"><h3>How signing in works</h3></div><div class="card-b stack" style="gap:10px">
    <p>There is one sign-in page for everyone: <b class="num">${esc(app)}</b> <button class="btn sm" type="button" data-copy="${esc(app)}">Copy</button></p>
    <p class="small muted">The email decides where you land. Your Jreebs admin email (${esc(ME.email)}) opens this console. A client's email opens their company with their role. To be two people at once, use a private window or a second browser for the second account.</p>
    <div class="row"><a class="btn" href="${esc(app)}?demo" target="_blank" rel="noopener">${ic("grid")}Client demo, no sign-in</a><a class="btn" href="${esc(app)}?demo=provider" target="_blank" rel="noopener">${ic("building")}Provider demo</a></div></div></section>
  <section class="card"><div class="card-h"><h3>Your test company</h3>${test ? pill(test.name, "acc") : ""}</div><div class="card-b stack" style="gap:12px">
    ${test ? "" : `<p class="small">Creates <b>Jreebs Test Co</b> and one invite per role, all going to your own inbox. Gmail and Google Workspace deliver "+" addresses to the same inbox, so you@domain.com and you+agent@domain.com both reach you.</p>`}
    <div class="f2"><div class="field"><label for="ptB">Your email</label><input class="in" id="ptB" type="email" value="${esc(base)}"></div><div class="field"><label for="ptT">Business type</label><select class="sel" id="ptT" ${test ? "disabled" : ""}>${Object.entries(TEMPLATES).map(([k, t]) => `<option value="${k}" ${(test ? test.workspace_type : "general") === k ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></div></div>
    <div class="row"><button class="btn go" type="button" data-pvtest="1">${test ? "Add any missing logins" : "Create test company and logins"}</button></div>
    ${test ? `<div class="tw"><table class="t"><thead><tr><th>Role</th><th>Sign in with</th><th>Status</th><th></th></tr></thead><tbody>${ROLE_ORDER.map(r => { const e = testEmail(base, r).toLowerCase(), i = inv.find(x => x.email === e); return `<tr><td><b>${ROLES[r].label}</b></td><td class="num small">${esc(e)}</td><td>${i ? (i.accepted_at ? pill("Signed up", "good") : pill("Waiting for sign-up", "warn")) : pill("Not invited")}</td><td class="r">${i && !i.accepted_at ? `<div class="row" style="flex-wrap:nowrap;justify-content:flex-end"><button class="btn sm" type="button" data-copy="${esc(inviteLink(e))}">Copy sign-up link</button><a class="btn sm" href="${esc(inviteLink(e))}" target="_blank" rel="noopener">Open</a></div>` : ""}</td></tr>`; }).join("")}</tbody></table></div>
    <ol class="small muted" style="margin:0;padding-inline-start:18px;display:grid;gap:4px"><li>Open a sign-up link in a private window and create the account with a password you'll remember.</li><li>Confirm the email Supabase sends (it arrives in your inbox).</li><li>Sign in at ${esc(app)}: you land in Jreebs Test Co with that role.</li></ol>` : ""}
  </div></section>`;
};
