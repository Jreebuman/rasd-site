/* Admin: settings, audit log, and the Jreebs admin panel (clients + support tickets). */
const SET_TABS = [["company", "Company", 4], ["sla", "Time limits & targets", 4], ["qa", "QA checklist", 4], ["roles", "Roles & permissions", 4], ["security", "My security", 0], ["billing", "Plan & billing", 5], ["privacy", "Data & privacy", 5]];
const PERMS = [
  ["Work", [["See and update their own " + "work", [2, 2, 2, 2, 2, 2]], ["See all orders, visits or complaints", [2, 2, 2, 2, 2, 0]], ["Assign work to drivers or teams", [2, 2, 2, 2, 0, 0]], ["Message and call customers", [2, 2, 2, 2, 2, 1]], ["Delete orders, visits or complaints", [2, 2, 0, 0, 0, 0]]]],
  ["Team", [["See the team and live board", [2, 2, 2, 2, 0, 0]], ["Write QA reviews", [2, 2, 2, 2, 0, 0]], ["See their own QA reviews", [2, 2, 2, 2, 2, 0]], ["Edit shifts", [2, 2, 2, 0, 0, 0]], ["Invite and remove people", [2, 1, 0, 0, 0, 0]]]],
  ["Company", [["Company profile", [2, 1, 1, 1, 1, 1]], ["Compliance files", [2, 2, 0, 0, 0, 0]], ["Platforms and costs", [2, 2, 0, 0, 0, 0]], ["People & access", [2, 2, 1, 1, 1, 0]], ["Write SOPs", [2, 2, 2, 0, 0, 0]], ["Read SOPs", [2, 2, 2, 2, 2, 2]]]],
  ["Setup", [["Automations on or off", [2, 2, 1, 1, 0, 0]], ["Message templates", [2, 2, 1, 1, 1, 0]], ["Import and export", [2, 2, 0, 0, 0, 0]], ["Revenue reports", [2, 2, 0, 0, 0, 0]], ["Company settings", [2, 2, 0, 0, 0, 0]], ["Plan, billing and full backup", [2, 0, 0, 0, 0, 0]]]]
];
VIEWS.settings = function () {
  if (!SET_TABS.find(t => t[0] === ui.setTab && can(t[2]))) ui.setTab = can(4) ? "company" : "security";
  let body = "";
  switch (ui.setTab) {
    case "company": body = card("Company", `<div class="form"><dl class="kv"><dt>Company</dt><dd>${esc(CLIENT.name)}</dd><dt>Workspace type</dt><dd>${esc(WDEF.items)} desk</dd><dt>Plan</dt><dd>${pill(CLIENT.plan, "acc")}</dd></dl>
      <div class="f2"><div class="field"><label for="st1">${esc(WDEF.ownerLabel)} label</label><input class="in" id="st1" value="${esc(WDEF.ownerLabel)}" disabled></div><div class="field"><label for="st2">Time zone</label><input class="in" id="st2" value="Asia/Amman" disabled></div></div>
      <p class="small muted">Legal details, address and brand live in Company profile. To change the workspace type or plan, open a ticket with Jreebs.</p>
      <div class="row"><button class="btn" type="button" data-nav="company">Company profile</button><button class="btn" type="button" data-modal="ticket" data-subject="Change workspace or plan">Open a ticket</button></div></div>`); break;
    case "sla": { const s = SLA(), t = TARGETS(); body = card("Time limits & targets", `<div class="form">${[["promise", "Promise time", `minutes from creation to done (used when ${WDEF.items.toLowerCase()} are created here)`], ["firstReply", "First reply to a complaint", "minutes"], ["pickup", "Pickup after assigning", "minutes"], ["nodriver", `${WDEF.ownerLabel} assigned within`, "minutes"]].map(([k, l, d]) => `<div class="optrow"><div><b>${l}</b><span>${d}</span></div><input class="in num" style="width:90px" type="number" min="1" id="sla-${k}" value="${s[k]}"></div>`).join("")}
      ${[["ontime", "On-time target", "%"], ["perAgent", `${WDEF.items} per agent per day`, ""], ["qa", "QA score target", "%"]].map(([k, l, u]) => `<div class="optrow"><div><b>${l}</b><span>${u || "count"}</span></div><input class="in num" style="width:90px" type="number" min="1" id="tg-${k}" value="${t[k]}"></div>`).join("")}
      <div class="row"><span class="spacer"></span><button class="btn primary" type="button" data-savesla="1">Save</button></div></div>`); break; }
    case "qa": body = card("QA checklist", `<div class="form"><div class="field"><label for="qacrit">Items reviewers score from 1 to 5, one per line</label><textarea class="in" id="qacrit" rows="6">${esc(QA_CRIT().join("\n"))}</textarea></div><div class="row"><span class="spacer"></span><button class="btn primary" type="button" data-saveqacrit="1">Save</button></div></div>`); break;
    case "roles": body = card("Roles & permissions", `<div class="card-b small muted" style="padding-bottom:0">This is exactly what each role can do. Almost all of it is enforced by the database itself; revenue figures and other people's system access are hidden on screen for lower roles. <span class="pm v2">Full</span> <span class="pm v1">Limited</span> <span class="pm v0">None</span></div>
      <div class="tw"><table class="t"><thead><tr><th>Permission</th>${ROLE_ORDER.map(r => `<th style="text-align:center">${ROLES[r].label}</th>`).join("")}</tr></thead><tbody>${PERMS.map(([g, rows]) => `<tr><td colspan="7" style="background:var(--surface-2)"><b class="small">${g}</b></td></tr>${rows.map(([p, v]) => `<tr><td>${esc(p)}</td>${v.map(x => `<td style="text-align:center"><span class="pm v${x}">${["None", "Limited", "Full"][x]}</span></td>`).join("")}</tr>`).join("")}`).join("")}</tbody></table></div>
      <div class="card-b small muted">"Limited" means view-only, own items only, or with a manager's limits. Need a different setup? Open a ticket and Jreebs will adjust it for your company.</div>`, true); break;
    case "security": body = card("My security", `<div class="form">
      <div class="optrow"><div><b>Two-step sign-in</b><span>A code from an authenticator app (Google Authenticator, Microsoft Authenticator) each time you sign in.</span></div><button class="btn" type="button" data-mfa="1">Set up or manage</button></div>
      <div class="optrow"><div><b>Change my password</b><span>At least 8 characters.</span></div><div class="row"><input class="in" id="newpw" type="password" autocomplete="new-password" placeholder="New password" style="width:180px"><button class="btn" type="button" data-setpw="1">Save</button></div></div>
      <div class="optrow"><div><b>Sign out everywhere</b><span>Ends your sessions on every phone and computer.</span></div><button class="btn danger" type="button" data-signoutall="1">Sign out everywhere</button></div></div>`); break;
    case "billing": { const seats = S.team.filter(m => m.role !== "driver").length, cap = { starter: 3, growth: 10, pro: 999 }[CLIENT.plan] || 10, price = { starter: 49, growth: 99, pro: 199 }[CLIENT.plan]; body = card("Plan & billing", `<div class="form"><div class="row"><div class="grow"><span class="lbl">Current plan</span><div style="font-family:var(--display);font-size:24px;font-weight:600">${esc(CLIENT.plan[0].toUpperCase() + CLIENT.plan.slice(1))}${price ? ` · ${CLIENT.plan === "pro" ? "from " : ""}${price} JOD / month` : ""}</div></div><button class="btn go" type="button" data-modal="ticket" data-subject="Change my plan">Change plan</button></div>
      <div style="display:grid;gap:6px"><div class="row small"><span class="grow">Office logins</span><span class="num">${seats}${cap < 100 ? " of " + cap : ""}</span></div>${cap < 100 ? prog(seats, cap) : ""}<span class="small muted">Drivers and field staff don't count.</span></div>
      <p class="small muted">Invoices are sent by Jreebs each month. Questions about a bill? Open a ticket.</p></div>`); break; }
    case "privacy": body = card("Data & privacy", `<div class="form">
      <div class="optrow"><div><b>Download all your data</b><span>Every table, as one file, any time.</span></div><button class="btn" type="button" data-backup="1">Download</button></div>
      <div class="optrow"><div><b>Who can see your data</b><span>Only people you invite. Jreebs staff only look when you ask for support.</span></div></div>
      <div class="optrow"><div><b style="color:var(--crit)">Close this workspace</b><span>We export everything for you first, then delete it within 30 days.</span></div><button class="btn danger" type="button" data-modal="ticket" data-subject="Close our workspace">Request</button></div></div>`); break;
  }
  return `${head("Settings", can(4) ? "How your company runs in Jreebs." : "Your own account security.", "")}
  <div class="setgrid"><nav class="setnav" aria-label="Settings">${SET_TABS.map(([k, l, min]) => `<button type="button" ${can(min) ? `data-st="${k}"` : `data-toast="${esc(l)} is for ${NEED[min]}."`} aria-current="${ui.setTab === k}">${esc(l)}${can(min) ? "" : ic("lock")}</button>`).join("")}</nav><div class="stack">${body}</div></div>`;
};
async function mfaModal() {
  if (DEMO) return toast("Two-step sign-in works on real accounts, not in the demo.");
  const { data } = await sb.auth.mfa.listFactors();
  const done = (data?.totp || []).filter(f => f.status === "verified");
  if (done.length) {
    return openModal(`${mHead("Two-step sign-in is on")}<div class="m-b"><p>You'll be asked for a code from your authenticator app each time you sign in.</p></div><div class="m-f"><button class="btn danger" type="button" data-mfaoff="${done[0].id}">Turn off</button><button class="btn primary" type="button" data-act="mclose">Done</button></div>`);
  }
  (data?.totp || []).filter(f => f.status !== "verified").forEach(f => sb.auth.mfa.unenroll({ factorId: f.id }));
  const { data: en, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Jreebs " + Date.now() });
  if (error) return toast(errMsg(error));
  openModal(`${mHead("Set up two-step sign-in")}<div class="m-b"><p class="small">1. Open your authenticator app and scan this code.</p><div class="qr"><img src="${esc(en.totp.qr_code)}" alt="QR code for your authenticator app"></div>
    <p class="small muted">Can't scan? Enter this key: <span class="num">${esc(en.totp.secret)}</span></p>
    <div class="field"><label for="mfaCode">2. Type the 6-digit code it shows</label><input class="in num" id="mfaCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-mfaverify="${en.id}">Turn on</button></div>`);
}

/* ---------- AUDIT ---------- */
VIEWS.audit = function () {
  const users = ["All", ...new Set(S.act.map(a => a.actor_email || "system"))];
  const list = S.act.filter(a => ui.auditUser === "All" || (a.actor_email || "system") === ui.auditUser);
  return `${head("Audit log", "Every change, message, import and export, with who did it and when. Nobody can edit this log.", `<button class="btn" type="button" data-export="activity">${ic("down")}Export</button>`)}
  <section class="card"><div class="card-h"><span class="lbl">Person</span><select class="sel" id="auditUser">${users.map(u => `<option value="${esc(u)}" ${ui.auditUser === u ? "selected" : ""}>${esc(u === "All" ? "Everyone" : nameOf(u) + (u.includes("@") ? " · " + u : ""))}</option>`).join("")}</select><span class="spacer"></span><span class="small muted">Latest ${S.act.length} entries</span></div>
  <div class="tw"><table class="t"><thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead><tbody>${list.map(a => `<tr><td class="num">${dShort(a.at)} ${hm(mins(new Date(a.at)))}</td><td><div class="who">${av(nameOf(a.actor_email || "System"))}<b>${esc(nameOf(a.actor_email || "System"))}</b></div></td><td class="wrap">${esc(a.text)}</td></tr>`).join("") || `<tr><td colspan="3">${empty("Nothing yet.")}</td></tr>`}</tbody></table></div></section>`;
};

/* ---------- JREEBS ADMIN ---------- */
let ADM = { clients: [], members: [], tickets: [], counts: {} };
async function loadAdmin() {
  const [clients, members, tickets, items] = await Promise.all([DB.list("clients", { order: ["created_at", false] }), DB.list("client_users"), DB.list("tickets", { order: ["created_at", false] }), DB.list("items", { select: "client_id", limit: 20000 })]);
  ADM = { clients, members, tickets, counts: {} };
  items.forEach(i => ADM.counts[i.client_id] = (ADM.counts[i.client_id] || 0) + 1);
}
VIEWS.clients = function () {
  if (!ADM.loaded) { ADM.loaded = true; loadAdmin().then(render); return `<div class="loading">Loading clients…</div>`; }
  return `${head("Clients", `${ADM.clients.length} companies on Jreebs`, `<button class="btn" type="button" data-admreload="1">${ic("refresh")}Refresh</button><button class="btn go" type="button" data-modal="newclient">${ic("plus")}New client</button>`)}
  <section class="card"><div class="tw"><table class="t"><thead><tr><th>Company</th><th>Type</th><th>Plan</th><th class="r">Logins</th><th class="r">Items</th><th>Link a login</th></tr></thead><tbody>${ADM.clients.map(c => `<tr><td><b>${esc(c.name)}</b><div class="small muted">${esc(c.slug)} · since ${dShort(c.created_at)}</div></td><td>${esc(c.workspace_type)}</td><td>${pill(c.plan, "acc")}</td><td class="r num">${ADM.members.filter(m => m.client_id === c.id).length}</td><td class="r num">${ADM.counts[c.id] || 0}</td>
    <td><div class="row" style="flex-wrap:nowrap"><input class="in" type="email" placeholder="their@email.com" data-linkemail="${c.id}" style="width:170px;height:30px"><select class="sel" data-linkrole="${c.id}" style="height:30px">${ROLE_ORDER.map(r => `<option value="${r}">${ROLES[r].label}</option>`).join("")}</select><button class="btn sm" type="button" data-link="${c.id}">Link</button></div></td></tr>`).join("") || `<tr><td colspan="6">${empty("No clients yet.")}</td></tr>`}</tbody></table></div></section>
  <div class="note-box">${ic("info")}<span>To onboard a company: 1) New client. 2) Ask the owner to create an account at ${esc(location.origin + location.pathname)}. 3) Link their email as Owner. They can then invite the rest of their team themselves.</span></div>`;
};
VIEWS.tickets = function () {
  if (!ADM.loaded) { ADM.loaded = true; loadAdmin().then(render); return `<div class="loading">Loading tickets…</div>`; }
  const name = id => ADM.clients.find(c => c.id === id)?.name || "—";
  return `${head("Support tickets", "Requests from your clients.", `<button class="btn" type="button" data-admreload="1">${ic("refresh")}Refresh</button>`)}
  <section class="card"><div class="tw"><table class="t"><thead><tr><th>When</th><th>Company</th><th>Request</th><th>From</th><th>Status</th></tr></thead><tbody>${ADM.tickets.map(t => `<tr><td>${ago(t.created_at)}</td><td><b>${esc(name(t.client_id))}</b></td><td class="wrap"><b>${esc(t.subject)}</b>${t.details ? `<div class="small muted">${esc(t.details)}</div>` : ""}${t.urgency === "Urgent" ? " " + pill("Urgent", "crit") : ""}</td><td>${esc(t.created_by_email || "")}</td><td><select class="sel" data-tkstatus="${t.id}" style="height:30px">${["Open", "In progress", "Done"].map(s => `<option ${t.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("") || `<tr><td colspan="5">${empty("No tickets yet.")}</td></tr>`}</tbody></table></div></section>`;
};
function newClientModal() {
  openModal(`${mHead("New client")}<div class="m-b form"><div class="f2"><div class="field"><label for="nc1">Company name</label><input class="in" id="ncn" placeholder="e.g. Swift Delivery"></div><div class="field"><label for="ncs">Short name (no spaces)</label><input class="in" id="ncs" placeholder="swift-delivery"></div></div>
    <div class="f2"><div class="field"><label for="nct">Workspace type</label><select class="sel" id="nct"><option value="delivery">Delivery</option><option value="lab">Home-visit lab</option><option value="kitchen">Cloud kitchen / complaints</option></select></div><div class="field"><label for="ncp">Plan</label><select class="sel" id="ncp"><option value="starter">Starter</option><option value="growth" selected>Growth</option><option value="pro">Pro</option></select></div></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-saveclient="1">Create</button></div>`);
}
