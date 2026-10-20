/* Admin: settings, audit log, and the Jreebs admin panel (clients + support tickets). */
const SET_TABS = [["workspace", "Workspace", 4], ["company", "Company", 4], ["sla", "Time limits & targets", 4], ["qa", "QA checklist", 4], ["roles", "Roles & permissions", 4], ["security", "My security", 0], ["billing", "Plan & billing", 5], ["privacy", "Data & privacy", 5]];
const PERMS = [
  ["Work", [["See and update their own " + "work", [2, 2, 2, 2, 2, 2]], ["See all orders, visits or complaints", [2, 2, 2, 2, 2, 0]], ["Assign work to drivers or teams", [2, 2, 2, 2, 0, 0]], ["Message and call customers", [2, 2, 2, 2, 2, 1]], ["Delete orders, visits or complaints", [2, 2, 0, 0, 0, 0]]]],
  ["Team", [["See the team and live board", [2, 2, 2, 2, 0, 0]], ["Write QA reviews", [2, 2, 2, 2, 0, 0]], ["See their own QA reviews", [2, 2, 2, 2, 2, 0]], ["Edit shifts", [2, 2, 2, 0, 0, 0]], ["Invite and remove people", [2, 1, 0, 0, 0, 0]]]],
  ["Company", [["Company profile", [2, 1, 1, 1, 1, 1]], ["Compliance files", [2, 2, 0, 0, 0, 0]], ["Platforms and costs", [2, 2, 0, 0, 0, 0]], ["People & access", [2, 2, 1, 1, 1, 0]], ["Write SOPs", [2, 2, 2, 0, 0, 0]], ["Read SOPs", [2, 2, 2, 2, 2, 2]]]],
  ["Setup", [["Automations on or off", [2, 2, 1, 1, 0, 0]], ["Message templates", [2, 2, 1, 1, 1, 0]], ["Import and export", [2, 2, 0, 0, 0, 0]], ["Revenue reports", [2, 2, 0, 0, 0, 0]], ["Company settings", [2, 2, 0, 0, 0, 0]], ["Plan, billing and full backup", [2, 0, 0, 0, 0, 0]]]]
];
VIEWS.settings = function () {
  if (!SET_TABS.find(t => t[0] === ui.setTab && can(t[2]))) ui.setTab = can(4) ? "workspace" : "security";
  let body = "";
  switch (ui.setTab) {
    case "workspace": body = workspaceTab(); break;
    case "company": body = card("Company", `<div class="form"><dl class="kv"><dt>Company</dt><dd>${esc(CLIENT.name)}</dd><dt>Started from</dt><dd>${esc((TEMPLATES[CLIENT.workspace_type] || TEMPLATES.general).name)} template</dd><dt>Plan</dt><dd>${pill(CLIENT.plan, "acc")}</dd></dl>
      <div class="f2"><div class="field"><label for="st2">Time zone</label><input class="in" id="st2" value="Asia/Amman" disabled></div><div class="field"><label for="st3">Boards</label><input class="in" id="st3" value="${esc(liveBoards().map(b => b.items).join(", "))}" disabled></div></div>
      <p class="small muted">Legal details, address and brand live in Company profile. Boards, stages, fields and which pages your team sees are in Workspace.</p>
      <div class="row"><button class="btn" type="button" data-nav="company">Company profile</button><button class="btn" type="button" data-modal="ticket" data-subject="Change workspace or plan">Open a ticket</button></div></div>`); break;
    case "sla": { const s = SLA(), t = TARGETS(); body = card("Time limits & targets", `<div class="form">${[["firstReply", "First reply to a complaint", "minutes. Each board's own time limit is set in Workspace."]].map(([k, l, d]) => `<div class="optrow"><div><b>${l}</b><span>${d}</span></div><input class="in num" style="width:90px" type="number" min="1" id="sla-${k}" value="${s[k]}"></div>`).join("")}
      ${[["ontime", "On-time target", "%"], ["perAgent", "Records handled per agent per day", ""], ["qa", "QA score target", "%"]].map(([k, l, u]) => `<div class="optrow"><div><b>${l}</b><span>${u || "count"}</span></div><input class="in num" style="width:90px" type="number" min="1" id="tg-${k}" value="${t[k]}"></div>`).join("")}
      <div class="row"><span class="spacer"></span><button class="btn primary" type="button" data-savesla="1">Save</button></div></div>`); break; }
    case "qa": body = card("QA checklist", `<div class="form"><div class="field"><label for="qacrit">Items reviewers score from 1 to 5, one per line</label><textarea class="in" id="qacrit" rows="6">${esc(QA_CRIT().join("\n"))}</textarea></div><div class="row"><span class="spacer"></span><button class="btn primary" type="button" data-saveqacrit="1">Save</button></div></div>`); break;
    case "roles": body = card("Roles & permissions", `<div class="card-b small muted" style="padding-bottom:0">This is exactly what each role can do. Almost all of it is enforced by the database itself; revenue figures and other people's system access are hidden on screen for lower roles. <span class="pm v2">Full</span> <span class="pm v1">Limited</span> <span class="pm v0">None</span></div>
      <div class="tw"><table class="t"><thead><tr><th>Permission</th>${ROLE_ORDER.map(r => `<th style="text-align:center">${ROLES[r].label}</th>`).join("")}</tr></thead><tbody>${PERMS.map(([g, rows]) => `<tr><td colspan="7" style="background:var(--surface-2)"><b class="small">${g}</b></td></tr>${rows.map(([p, v]) => `<tr><td>${esc(p)}</td>${v.map(x => `<td style="text-align:center"><span class="pm v${x}">${["None", "Limited", "Full"][x]}</span></td>`).join("")}</tr>`).join("")}`).join("")}</tbody></table></div>
      <div class="card-b small muted">"Limited" means view-only, own items only, or with a manager's limits. Need a different setup? Open a ticket and Jreebs will adjust it for your company.</div>`, true); break;
    case "security": body = card("My security", `<div class="form">
      <div class="optrow"><div><b>Two-step sign-in</b><span>A code from an authenticator app (Google Authenticator, Microsoft Authenticator) each time you sign in.</span></div><button class="btn" type="button" data-mfa="1">Set up or manage</button></div>
      <div class="optrow"><div><b>Change my password</b><span>At least 8 characters.</span></div><div class="row"><input class="in" id="newpw" type="password" autocomplete="new-password" placeholder="New password" style="width:180px"><button class="btn" type="button" data-setpw="1">Save</button></div></div>
      <div class="optrow"><div><b>Sign out everywhere</b><span>Ends your sessions on every phone and computer.</span></div><button class="btn danger" type="button" data-signoutall="1">Sign out everywhere</button></div></div>`); break;
    case "billing": { const seats = S.team.filter(m => m.role !== "driver").length, P = PLANS[planKey(CLIENT.plan)], cap = P.users, price = P.price; body = card("Plan & billing", `<div class="form"><div class="row"><div class="grow"><span class="lbl">Current plan</span><div style="font-family:var(--display);font-size:24px;font-weight:600">${esc(P.name)}${price ? ` · ${fmtN(price)} JOD / year` : ""}</div></div><button class="btn go" type="button" data-modal="ticket" data-subject="Change my plan">Change plan</button></div>
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


/* ---------- WORKSPACE: boards and modules, customised per company ---------- */
const BOARD_ICONS = ["box", "inbox", "chart", "truck", "cal", "check", "msg", "contact", "star", "building", "book", "grid"];
const LIB_LABEL = { requests: "Customer requests (helpdesk)", sales: "Sales pipeline (deals)", orders: "Orders", jobs: "Field jobs (installs, maintenance)", appointments: "Appointments", tasks: "Tasks and projects", complaints: "Complaints", visits: "Home visits", delivery: "Fast deliveries" };
function workspaceTab() {
  const counts = id => ITEMS.filter(i => i.board === id).length;
  return `${card("Boards", `<div class="card-b small muted" style="padding-bottom:0">Each board is one kind of work your company tracks, with its own stages, fields, time limit and alerts. Rename anything to match the words your team uses.</div>
    <div class="tw"><table class="t"><thead><tr><th>Board</th><th>Stages</th><th>Fields</th><th class="r">Records</th><th></th></tr></thead><tbody>${BOARDS.map(b => `<tr><td><div class="who">${ic(b.icon)}<div><b>${esc(b.items)}</b><span>${esc(b.item)} · ${esc(b.prefix)}-1001 · ${b.hidden ? "hidden" : "shown"}</span></div></div></td><td class="wrap small">${[...b.stages, ...b.alt].map(s => esc(s[1])).join(" → ")}</td><td class="wrap small">${b.fields.map(f => esc(f[1])).join(", ") || "—"}</td><td class="r num">${counts(b.id)}</td><td class="r"><div class="row" style="flex-wrap:nowrap;justify-content:flex-end"><button class="btn sm" type="button" data-bedit="${b.id}">Edit</button><button class="btn sm" type="button" data-bhide="${b.id}">${b.hidden ? "Show" : "Hide"}</button>${counts(b.id) || BOARDS.length < 2 ? "" : `<button class="btn sm ghost danger" type="button" data-bdel="${b.id}">Remove</button>`}</div></td></tr>`).join("")}</tbody></table></div>
    <div class="card-b row"><button class="btn go" type="button" data-badd="1">${ic("plus")}Add a board</button><span class="small muted">Hiding a board keeps its records but removes it from the menu.</span></div>`, true)}
  ${card("Pages your team sees", `<div class="card-b small muted" style="padding-bottom:4px">Switch off what your company doesn't use. Nothing is deleted; switch it back on any time.</div><div class="mods">${MODULES.map(([k, l]) => `<label class="mod-t"><button class="sw" type="button" role="switch" aria-checked="${modOn(k)}" data-mod="${k}" aria-label="${esc(l)}"></button><span>${esc(l)}</span></label>`).join("")}</div>`, true)}`;
}
function addBoardModal() {
  const have = new Set(BOARDS.map(b => b.lib));
  openModal(`${mHead("Add a board")}<div class="m-b"><p class="small muted">Start from a ready board and change anything afterwards, or start blank.</p><div class="stack" style="gap:8px">${Object.entries(LIB_LABEL).map(([k, l]) => `<button class="btn" style="justify-content:flex-start;height:auto;padding:10px 12px" type="button" data-blib="${k}">${ic(BOARD_LIB[k].icon)}<span class="grow" style="text-align:start"><b>${esc(l)}</b><br><span class="small muted">${BOARD_LIB[k].stages.map(s => s[1]).join(" → ")}</span></span>${have.has(k) ? pill("Already added") : ""}</button>`).join("")}<button class="btn" style="justify-content:flex-start" type="button" data-blib="blank">${ic("plus")}<b>Blank board</b></button></div></div>`);
}
function boardModal(id) {
  const b = BDEF(id), mins = b.promise;
  const [n, u] = mins % 1440 === 0 && mins >= 1440 ? [mins / 1440, "days"] : mins % 60 === 0 && mins >= 60 ? [mins / 60, "hours"] : [mins, "minutes"];
  openModal(`${mHead(`Edit ${esc(b.items)}`)}<div class="m-b form">
    <div class="f3"><div class="field"><label for="bx1">Board name</label><input class="in" id="bx1" value="${esc(b.items)}"></div><div class="field"><label for="bx2">One record is a</label><input class="in" id="bx2" value="${esc(b.item)}"></div><div class="field"><label for="bx3">Reference prefix</label><input class="in" id="bx3" value="${esc(b.prefix)}" maxlength="3"></div></div>
    <div class="f3"><div class="field"><label for="bx4">Who it's for</label><input class="in" id="bx4" value="${esc(b.nameLabel)}" placeholder="Customer"></div><div class="field"><label for="bx5">Person responsible</label><input class="in" id="bx5" value="${esc(b.ownerLabel)}" placeholder="Owner, Driver, Technician"></div><div class="field"><label for="bx6">Deadline is called</label><input class="in" id="bx6" value="${esc(b.dueLabel)}" placeholder="Due"></div></div>
    <div class="f2"><div class="field"><label for="bx7">Stages, in order (one per line; the last one means done)</label><textarea class="in" id="bx7" rows="5">${esc(b.stages.map(s => s[1]).join("\n"))}</textarea></div><div class="field"><label for="bx8">Closed without finishing (one per line)</label><textarea class="in" id="bx8" rows="5" placeholder="Cancelled">${esc(b.alt.map(s => s[1]).join("\n"))}</textarea></div></div>
    <div class="f2"><div class="field"><label for="bx9">Extra fields (one per line; a field called Value is money in JOD)</label><textarea class="in" id="bx9" rows="3">${esc(b.fields.map(f => f[1]).join("\n"))}</textarea></div><div class="field"><label for="bx10">Time limit for each record</label><div class="row"><input class="in num" id="bx10" type="number" min="0" value="${n}" style="width:90px"><select class="sel" id="bx11">${["minutes", "hours", "days"].map(x => `<option ${x === u ? "selected" : ""}>${x}</option>`).join("")}</select></div><span class="small muted">Used for the default deadline and the overdue alert.</span></div></div>
    <div class="row"><label class="row small"><input type="checkbox" id="bx12" ${b.hasPhone ? "checked" : ""}>Has a customer phone</label><label class="row small"><input type="checkbox" id="bx13" ${b.hasArea ? "checked" : ""}>Has an area</label><label class="row small"><input type="checkbox" id="bx14" ${b.fieldOwner ? "checked" : ""}>Done by field staff (they get it on their phone)</label></div>
    <div class="field"><label for="bx15">Icon</label><div class="row">${BOARD_ICONS.map(k => `<label class="ico-pick"><input type="radio" name="bxi" value="${k}" ${k === b.icon ? "checked" : ""}>${ic(k)}</label>`).join("")}</div></div>
    <p class="small muted">Renaming a stage keeps its records. A stage you remove still shows on old records under its old name.</p></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-bsave="${b.id}">Save board</button></div>`, true);
}
function stagesFrom(lines, old) {
  const used = new Set();
  return lines.split("\n").map(s => s.trim()).filter(Boolean).map(l => {
    const ex = old.find(s => s[1].toLowerCase() === l.toLowerCase());
    let k = ex ? ex[0] : l.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "s";
    while (used.has(k)) k += "_"; used.add(k); return [k, l];
  });
}
async function saveBoards(list, msg) {
  await saveConfig({ boards: list.map(serialBoard) });
  BOARDS = buildBoards(CLIENT); setBoard(ui.board);
  await logAct(msg, "settings"); toast(msg + "."); render();
}
