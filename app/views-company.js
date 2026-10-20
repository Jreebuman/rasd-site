/* Company: profile, files, headcount, Jreebs contacts, tickets; systems & tools; people & access; SOPs. */
const docState = d => { const n = daysUntil(d.expires_on); if (n == null) return ["No expiry", "good"]; if (n < 0) return [`Expired ${-n} days ago`, "crit"]; if (n <= 30) return [`Expires in ${n} days`, "warn"]; return [`Valid to ${dLong(d.expires_on)}`, "good"]; };
const DEPTS = ["Management", "Operations", "Customer care", "Field", "Finance", "HR & admin", "Marketing", "IT"];
const STD_TOOLS = { "Management": ["Jreebs", "WhatsApp Web", "Gmail", "Google Drive", "Google Sheets"], "Operations": ["Jreebs", "WhatsApp Web", "Gmail", "Google Maps"], "Customer care": ["Jreebs", "WhatsApp Web", "Gmail"], "Field": ["Jreebs", "Google Maps"], "Finance": ["Gmail", "Google Sheets"], "HR & admin": ["Gmail", "Google Drive"], "Marketing": ["Gmail", "Google Drive"], "IT": ["Gmail", "Google Drive"] };
const stdFor = dept => cfg("dept_tools", {})[dept] || STD_TOOLS[dept] || [];
const allToolNames = () => [...new Set(["Jreebs", ...S.links.map(l => l.name), ...S.plats.map(p => p.name), ...S.people.flatMap(p => p.tools)])].sort();
const sopOverdue = s => (Date.now() - new Date(s.reviewed_on)) / 864e5 > 90;
const pinned = () => { try { return JSON.parse(localStorage.getItem("jreebs-pins-" + (CLIENT && CLIENT.id)) || "[]"); } catch (e) { return []; } };
const setPinned = a => { try { localStorage.setItem("jreebs-pins-" + CLIENT.id, JSON.stringify(a)); } catch (e) {} };

/* ---------- COMPANY PROFILE ---------- */
VIEWS.company = function () {
  const P = S.profile || {}, mgr = can(4), own = can(5);
  const ppl = S.people.filter(p => p.active), tot = ppl.length;
  const byType = ["Full-time", "Part-time", "Contractor"].map(t => [t, ppl.filter(p => p.emp_type === t).length]);
  const depts = [...new Set(ppl.map(p => p.dept))].map(d => [d, ppl.filter(p => p.dept === d).length]).sort((a, b) => b[1] - a[1]);
  const seats = S.team.filter(m => m.role !== "driver").length, seatCap = PLANS[planKey(CLIENT.plan)].users;
  return `${head("Company profile", "Who you are, who works here, and who to call at Jreebs.", own ? `<button class="btn" type="button" data-modal="profile">${ic("edit")}Edit details</button>` : "")}
  <div class="grid2e">
    ${card("Company information", P.legal_name || P.trade_name ? `<dl class="kv"><dt>Legal name</dt><dd>${esc(P.legal_name || "—")}</dd><dt>Trading as</dt><dd>${esc(P.trade_name || CLIENT.name)}</dd><dt>Registration no.</dt><dd class="num">${esc(P.reg_no || "—")}</dd><dt>Tax ID</dt><dd class="num">${esc(P.tax_id || "—")}</dd><dt>Address</dt><dd>${esc(P.address || "—")}</dd><dt>Founded</dt><dd>${esc(P.founded || "—")}</dd><dt>WhatsApp name</dt><dd>${esc(P.wa_sender || CLIENT.name)}</dd><dt>Jreebs plan</dt><dd>${pill(CLIENT.plan, "acc")}</dd></dl>` : `<p class="muted">${own ? "Add your legal name, registration and tax numbers, and address." : "The owner hasn't added company details yet."}</p>${own ? `<div class="row" style="margin-top:10px"><button class="btn primary" type="button" data-modal="profile">Add details</button></div>` : ""}`)}
    ${mgr ? card("Legal & compliance files", `${S.docs.length ? `<ul class="feed">${S.docs.map(d => { const [t, k] = docState(d); return `<li style="grid-template-columns:minmax(0,1fr) auto auto auto;align-items:center"><span><b>${esc(d.name)}</b> <small>· ${esc(d.kind)}</small></span>${pill(t, k)}${d.storage_path ? `<button class="btn sm" type="button" data-docget="${d.id}" aria-label="Download ${esc(d.name)}">${ic("down")}</button>` : `<span></span>`}<button class="btn sm ghost danger" type="button" data-docdel="${d.id}" aria-label="Delete ${esc(d.name)}">${ic("trash")}</button></li>`; }).join("")}</ul>` : empty("No files yet. Add your commercial registration, licenses and insurance so you're reminded before they expire.")}<div class="card-b row" style="border-top:1px solid var(--line)"><span class="small muted grow">You'll see a warning 30 days before anything expires.</span><button class="btn sm primary" type="button" data-modal="doc">${ic("up")}Add a file</button></div>`, true) : card("Legal & compliance files", `<p class="muted small">${ic("lock")} Visible to managers and owners.</p>`)}
  </div>
  <section class="card"><div class="card-h"><h3>People</h3><span class="sub">${tot} active, with or without a Jreebs login</span><span class="spacer"></span>${mgr ? `<button class="btn sm" type="button" data-nav="access">People & access</button>` : ""}</div>
    <div class="card-b stack"><section class="kpis">${kpi("Employees", tot, "active")}${byType.map(([t, n]) => kpi(t, n, tot ? Math.round(n / tot * 100) + "% of staff" : "")).join("")}${kpi("Office logins", seatCap > 100 ? seats : `${seats} / ${seatCap}`, "drivers don't use a seat", seats >= seatCap ? "warn" : "")}</section>
    <div><span class="lbl">By department</span><div style="margin-top:10px">${hbars(depts)}</div></div></div></section>
  <div class="grid2e">
    ${card("Your Jreebs team", `<div style="display:grid;gap:10px"><div class="row">${av("Mohammad Al-Khateeb")}<div class="grow"><b>Mohammad Al-Khateeb</b><div class="small muted">Your account manager: setup, training and new workflows</div></div></div>
      <div class="row"><a class="btn sm wa" href="https://wa.me/${JREEBS_WA}" target="_blank" rel="noopener">${ic("wa")}WhatsApp</a><button class="btn sm" type="button" data-copy="${JREEBS_EMAIL}">Copy email · ${JREEBS_EMAIL}</button><button class="btn sm primary" type="button" data-modal="ticket">Open a ticket</button></div></div>`)}
    ${card("Support tickets", `<ul class="feed">${S.tickets.map(t => `<li style="grid-template-columns:minmax(0,1fr) auto;align-items:center"><span><b>${esc(t.subject)}</b> <small>· ${esc(t.urgency)} · ${ago(t.created_at)}</small></span>${pill(t.status, t.status === "Done" ? "good" : t.status === "Open" ? "warn" : "acc")}</li>`).join("") || `<li><time></time><span class="muted">No tickets yet.</span></li>`}</ul>`, true)}
  </div>`;
};
function profileModal() {
  const P = S.profile || {};
  const f = (id, l, v) => `<div class="field"><label for="${id}">${l}</label><input class="in" id="${id}" value="${esc(v || "")}"></div>`;
  openModal(`${mHead("Company details")}<div class="m-b form"><div class="f2">${f("pf1", "Legal name", P.legal_name)}${f("pf2", "Trading as", P.trade_name || CLIENT.name)}</div><div class="f2">${f("pf3", "Registration no.", P.reg_no)}${f("pf4", "Tax ID", P.tax_id)}</div>${f("pf5", "Address", P.address)}<div class="f2">${f("pf6", "Founded", P.founded)}${f("pf7", "WhatsApp sender name", P.wa_sender)}</div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn primary" type="button" data-saveprofile="1">Save</button></div>`);
}
function docModal() {
  openModal(`${mHead("Add a file")}<div class="m-b form"><div class="f2"><div class="field"><label for="dc1">Name</label><input class="in" id="dc1" placeholder="e.g. Commercial registration"></div><div class="field"><label for="dc2">Type</label><select class="sel" id="dc2"><option>Compliance</option><option>License</option><option>Insurance</option><option>Contract</option><option>Other</option></select></div></div>
    <div class="f2"><div class="field"><label for="dc3">Expires on (optional)</label><input class="in" id="dc3" type="date"></div><div class="field"><label for="dc4">File (PDF or image, optional)</label><input class="in" id="dc4" type="file" accept=".pdf,image/*" style="padding-top:6px"></div></div>
    <p class="small muted">Files are private to managers and owners of your company.</p></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn primary" type="button" data-savedoc="1">Save</button></div>`);
}
function ticketModal(subject = "") {
  openModal(`${mHead("Open a ticket with Jreebs")}<div class="m-b form"><div class="field"><label for="tk1">What do you need?</label><input class="in" id="tk1" value="${esc(subject)}" placeholder="e.g. Add a branch, connect Talabat, something isn't working"></div>
    <div class="field"><label for="tk2">Details</label><textarea class="in" id="tk2" placeholder="Which page, which order, what you expected"></textarea></div>
    <div class="field"><label for="tk3">How urgent?</label><select class="sel" id="tk3"><option>Normal</option><option>Urgent</option></select></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-saveticket="1">Send</button></div>`);
}

/* ---------- SYSTEMS & TOOLS ---------- */
const toolLink = l => l.url ? `<a class="btn sm" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)} ↗</a>` : `<span class="btn sm dis">${esc(l.name)}</span>`;
VIEWS.systems = function () {
  const mgr = can(4), pins = pinned();
  const tools = S.links.filter(l => l.kind === "tool"), systems = S.links.filter(l => l.kind === "system");
  const cats = [...new Set(tools.map(t => t.category))];
  const spend = S.plats.reduce((s, p) => s + (+p.cost || 0), 0);
  return `${head("Systems & tools", "Every app your team uses, one click away.", mgr ? `<button class="btn" type="button" data-modal="link" data-kind="system">${ic("plus")}Internal system</button><button class="btn go" type="button" data-modal="link" data-kind="tool">${ic("plus")}Tool</button>` : "")}
  <section class="card"><div class="card-h"><h3>Pinned</h3><span class="sub">star a tool to keep it here (saved on this device)</span></div><div class="card-b row">${tools.filter(t => pins.includes(t.id)).map(toolLink).join("") || `<span class="muted small">Nothing pinned yet.</span>`}</div></section>
  <section class="card"><div class="card-h"><h3>Tools</h3></div><div class="card-b stack">${cats.map(c => `<div><span class="lbl">${esc(c)}</span><div class="row" style="margin-top:8px">${tools.filter(t => t.category === c).map(t => `<span class="row" style="gap:3px">${toolLink(t)}<button class="ib" style="width:30px;height:30px" type="button" data-pin="${t.id}" aria-pressed="${pins.includes(t.id)}" aria-label="${pins.includes(t.id) ? "Unpin" : "Pin"} ${esc(t.name)}">${ic(pins.includes(t.id) ? "starf" : "star")}</button>${mgr ? `<button class="ib" style="width:30px;height:30px" type="button" data-modal="link" data-lid="${t.id}" aria-label="Edit ${esc(t.name)}">${ic("edit")}</button>` : ""}</span>`).join("")}</div></div>`).join("") || empty("No tools added yet.")}</div></section>
  <section class="card"><div class="card-h"><h3>Internal systems</h3><span class="sub">your company's own apps</span></div>${systems.length ? `<div class="card-b ints">${systems.map(s => `<div class="card int"><div class="row"><span class="lg">${esc(s.name.slice(0, 3).toUpperCase())}</span><div class="grow"><b>${esc(s.name)}</b><div class="small muted">${esc(s.category)}</div></div></div><p>${esc(s.description || "")}</p><div class="row">${pill(s.health, s.health === "Healthy" ? "good" : s.health === "Down" ? "crit" : "warn")}${s.sso ? pill("Single sign-on", "acc") : pill("Own login")}<span class="spacer"></span>${mgr ? `<button class="btn sm" type="button" data-modal="link" data-lid="${s.id}">Edit</button>` : ""}${s.url ? `<a class="btn sm primary" href="${esc(s.url)}" target="_blank" rel="noopener">Open</a>` : ""}</div></div>`).join("")}</div>` : `<div class="card-b">${empty(mgr ? "Add your ERP, HR system, BI dashboards or any internal app so everyone finds them here." : "None added yet.")}</div>`}</section>
  ${mgr ? `<section class="card"><div class="card-h"><h3>Platforms you pay for</h3><span class="sub">${spend ? `about ${fmtN(spend)} JOD a month` : ""}</span><span class="spacer"></span><button class="btn sm primary" type="button" data-modal="plat">${ic("plus")}Add</button></div>
    ${S.plats.length ? `<div class="tw"><table class="t"><thead><tr><th>Platform</th><th>Used for</th><th>Plan</th><th class="r">JOD / month</th><th>Renews</th><th>Owner</th><th>Status</th><th></th></tr></thead><tbody>${S.plats.map(p => { const n = daysUntil(p.renews_on); return `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.purpose)}</td><td>${esc(p.plan)}</td><td class="r num">${+p.cost ? fmtN(p.cost) : "—"}</td><td>${p.renews_on ? (n != null && n <= 30 && n >= 0 ? pill(dShort(p.renews_on), "warn") : n < 0 ? pill("Overdue " + dShort(p.renews_on), "crit") : dShort(p.renews_on)) : "—"}</td><td>${esc(p.owner_name)}</td><td>${pill(p.status, p.status === "Operational" ? "good" : "warn")}</td><td><button class="btn sm" type="button" data-modal="plat" data-pid="${p.id}">Edit</button></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="card-b">${empty("List the software you subscribe to, so renewals and costs are never a surprise.")}</div>`}</section>` : ""}`;
};
function linkModal(kind, id) {
  const l = S.links.find(x => x.id === id) || { kind, category: kind === "system" ? "Internal" : "Work", name: "", url: "", description: "", sso: false, health: "Healthy" };
  openModal(`${mHead(id ? `Edit ${esc(l.name)}` : kind === "system" ? "Add an internal system" : "Add a tool")}<div class="m-b form">
    <div class="f2"><div class="field"><label for="lk1">Name</label><input class="in" id="lk1" value="${esc(l.name)}"></div><div class="field"><label for="lk2">Category</label><input class="in" id="lk2" value="${esc(l.category)}" list="lkCats"><datalist id="lkCats">${[...new Set(S.links.map(x => x.category))].map(c => `<option value="${esc(c)}">`).join("")}</datalist></div></div>
    <div class="field"><label for="lk3">Web address</label><input class="in" id="lk3" type="url" value="${esc(l.url)}" placeholder="https://"></div>
    ${l.kind === "system" ? `<div class="field"><label for="lk4">What it's for</label><input class="in" id="lk4" value="${esc(l.description)}"></div><div class="f2"><div class="field"><label for="lk5">Status</label><select class="sel" id="lk5">${["Healthy", "Slow", "Down"].map(h => `<option ${l.health === h ? "selected" : ""}>${h}</option>`).join("")}</select></div><div class="field"><label for="lk6">Sign-in</label><select class="sel" id="lk6"><option value="0">Own login</option><option value="1" ${l.sso ? "selected" : ""}>Single sign-on</option></select></div></div>` : ""}</div>
    <div class="m-f">${id ? `<button class="btn danger" type="button" data-dellink="${id}">Delete</button><span class="spacer"></span>` : ""}<button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn primary" type="button" data-savelink="${id || ""}" data-kind="${l.kind}">Save</button></div>`);
}
function platModal(id) {
  const p = S.plats.find(x => x.id === id) || { name: "", purpose: "", plan: "", cost: 0, renews_on: "", owner_name: "", status: "Operational" };
  const f = (i, l, v, t = "text") => `<div class="field"><label for="${i}">${l}</label><input class="in" id="${i}" type="${t}" value="${esc(v ?? "")}"></div>`;
  openModal(`${mHead(id ? `Edit ${esc(p.name)}` : "Add a platform")}<div class="m-b form"><div class="f2">${f("pl1", "Name", p.name)}${f("pl2", "Used for", p.purpose)}</div><div class="f3">${f("pl3", "Plan", p.plan)}${f("pl4", "JOD a month", p.cost, "number")}${f("pl5", "Renews on", p.renews_on, "date")}</div>
    <div class="f2">${f("pl6", "Owner", p.owner_name)}<div class="field"><label for="pl7">Status</label><select class="sel" id="pl7">${["Operational", "Slow", "Down", "Cancelled"].map(s => `<option ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></div></div>
    <div class="m-f">${id ? `<button class="btn danger" type="button" data-delplat="${id}">Delete</button><span class="spacer"></span>` : ""}<button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn primary" type="button" data-saveplat="${id || ""}">Save</button></div>`);
}

/* ---------- PEOPLE & ACCESS ---------- */
function accessIssues() {
  const out = [];
  S.people.forEach(p => {
    const std = stdFor(p.dept), n = daysUntil(p.ends_on);
    if (!p.active && (p.tools.length || p.auth_user_id)) out.push({ sev: 3, p, t: `${p.name} has left but still has access`, d: `${p.tools.length} system${p.tools.length === 1 ? "" : "s"}${p.auth_user_id ? " and a Jreebs login" : ""}. Remove them.`, fix: "all" });
    else if (n != null && n < 0 && p.tools.length) out.push({ sev: 3, p, t: `${p.name}'s contract ended ${-n} days ago`, d: "Their access should be removed.", fix: "all" });
    else if (n != null && n <= 14) out.push({ sev: 2, p, t: `${p.name}'s contract ends ${n === 0 ? "today" : "in " + n + " days"}`, d: "Plan the handover and when their access ends.", fix: null });
    if (p.active && std.length) p.tools.filter(t => !std.includes(t)).forEach(t => out.push({ sev: 2, p, t: `${p.name} has ${t}`, d: `It isn't standard for ${p.dept}. Remove it if they don't need it.`, fix: t }));
  });
  return out;
}
VIEWS.access = function () {
  const own = can(5), mgr = can(4), iss = accessIssues();
  let list = S.people.slice().sort((a, b) => (b.active - a.active) || a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
  if (ui.dept !== "All") list = list.filter(p => p.dept === ui.dept);
  if (ui.accq) { const q = ui.accq.toLowerCase(); list = list.filter(p => (p.name + " " + p.dept + " " + p.job + " " + p.tools.join(" ")).toLowerCase().includes(q)); }
  const roleOf = p => p.auth_user_id ? S.team.find(m => m.auth_user_id === p.auth_user_id)?.role : null;
  return `${head("People & access", "Everyone who works here, what they do, and every system they can open. Review it monthly.", mgr ? `<button class="btn" type="button" data-syncpeople="1">${ic("refresh")}Add missing logins</button><button class="btn go" type="button" data-modal="person">${ic("plus")}Add person</button>` : "")}
  ${iss.length ? `<section class="card"><div class="card-h"><h3>Access review</h3><span class="sub">${iss.length} to look at</span></div>${iss.map((i, k) => `<div class="att"><span class="bar s${i.sev}"></span><div style="min-width:0"><div class="t1">${esc(i.t)}</div><div class="t2">${esc(i.d)}</div></div><div class="acts">${mgr && i.fix ? `<button class="btn sm go" type="button" data-fixacc="${k}">${i.fix === "all" ? "Remove all access" : "Remove " + esc(i.fix)}</button>` : ""}<button class="btn sm" type="button" data-modal="person" data-pid="${i.p.id}">Open</button></div></div>`).join("")}</section>` : `<div class="note-box">${ic("check")}<span>Access review is clear.</span></div>`}
  <section class="card"><div class="card-h"><input class="in grow" id="accq" type="search" placeholder="Search a person, department or system" value="${esc(ui.accq)}" style="max-width:320px"><select class="sel" id="deptSel" aria-label="Department"><option>All</option>${DEPTS.map(d => `<option ${ui.dept === d ? "selected" : ""}>${d}</option>`).join("")}</select></div>
    <div class="tw"><table class="t"><thead><tr><th>Person</th><th>Department</th><th>Job</th><th>Jreebs role</th><th>Systems they can open</th></tr></thead><tbody>${list.map(p => { const r = roleOf(p), std = stdFor(p.dept); return `<tr class="click" data-modal="person" data-pid="${p.id}"><td><div class="who">${av(p.name)}<div><b>${esc(p.name)}</b><span>${esc(p.emp_type)}${p.active ? "" : " · left"}${p.ends_on ? " · ends " + dShort(p.ends_on) : ""}</span></div></div></td><td>${esc(p.dept)}</td><td>${esc(p.job)}</td><td>${r ? pill(ROLES[r].label, r === "owner" ? "cta" : r === "manager" ? "acc" : "") : `<span class="small muted">No login</span>`}</td><td class="wrap"><div class="flags">${p.tools.map(t => pill(t, !p.active || (std.length && !std.includes(t)) ? "crit" : "")).join("") || `<span class="small muted">None</span>`}</div></td></tr>`; }).join("") || `<tr><td colspan="5">${empty("No people yet.")}</td></tr>`}</tbody></table></div></section>`;
};
function personModal(id) {
  const p = S.people.find(x => x.id === id) || { name: "", phone: "", email: "", dept: "Operations", job: "", emp_type: "Full-time", auth_user_id: null, ends_on: "", tools: [], active: true };
  const tools = [...new Set([...allToolNames(), ...p.tools])];
  const linked = new Set(S.people.filter(x => x.id !== id && x.auth_user_id).map(x => x.auth_user_id));
  openModal(`${mHead(id ? esc(p.name) : "Add a person")}<div class="m-b form">
    <div class="f2"><div class="field"><label for="pp1">Name</label><input class="in" id="pp1" value="${esc(p.name)}"></div><div class="field"><label for="pp2">Job</label><input class="in" id="pp2" value="${esc(p.job)}"></div></div>
    <div class="f3"><div class="field"><label for="pp3">Department</label><select class="sel" id="pp3">${DEPTS.map(d => `<option ${p.dept === d ? "selected" : ""}>${d}</option>`).join("")}</select></div><div class="field"><label for="pp4">Type</label><select class="sel" id="pp4">${["Full-time", "Part-time", "Contractor"].map(t => `<option ${p.emp_type === t ? "selected" : ""}>${t}</option>`).join("")}</select></div><div class="field"><label for="pp5">Contract ends</label><input class="in" id="pp5" type="date" value="${esc(p.ends_on || "")}"></div></div>
    <div class="f3"><div class="field"><label for="pp6">Phone</label><input class="in" id="pp6" value="${esc(p.phone)}"></div><div class="field"><label for="pp7">Email</label><input class="in" id="pp7" value="${esc(p.email)}"></div><div class="field"><label for="pp8">Jreebs login</label><select class="sel" id="pp8"><option value="">No login</option>${S.team.filter(m => !linked.has(m.auth_user_id)).map(m => `<option value="${m.auth_user_id}" ${m.auth_user_id === p.auth_user_id ? "selected" : ""}>${esc(m.email)}</option>`).join("")}</select></div></div>
    <span class="lbl">Systems they can open</span><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">${tools.map((t, i) => `<label class="row small" for="px${i}" style="gap:8px"><input type="checkbox" id="px${i}" data-pxt="${esc(t)}" ${p.tools.includes(t) ? "checked" : ""}>${esc(t)}</label>`).join("")}</div>
    <div class="row"><input class="in grow" id="ppNew" placeholder="Another system (type and press Add)"><button class="btn sm" type="button" data-addtool="1">Add</button></div>
    <label class="row small" for="pp9" style="gap:8px"><input type="checkbox" id="pp9" ${p.active ? "" : "checked"}> Has left the company</label></div>
    <div class="m-f">${id && can(4) ? `<button class="btn danger" type="button" data-delperson="${id}">Delete</button><span class="spacer"></span>` : ""}<button class="btn" type="button" data-act="mclose">Cancel</button>${can(4) ? `<button class="btn primary" type="button" data-saveperson="${id || ""}">Save</button>` : ""}</div>`, true);
}

/* ---------- SOPs ---------- */
VIEWS.sops = function () {
  const canEdit = can(3), cats = ["All", ...new Set(S.sops.map(s => s.category))];
  let list = S.sops.slice();
  if (lvl() === 0) list = list.filter(s => s.roles.includes("driver"));
  else if (ui.sopMine) list = list.filter(s => s.roles.includes(ME.role));
  if (ui.sopCat !== "All") list = list.filter(s => s.category === ui.sopCat);
  if (ui.sopq) { const q = ui.sopq.toLowerCase(); list = list.filter(s => (s.title + " " + s.steps.join(" ") + " " + s.tools.join(" ")).toLowerCase().includes(q)); }
  const audience = s => S.team.filter(m => s.roles.includes(m.role)).length;
  const readN = s => new Set(S.reads.filter(r => r.sop_id === s.id).map(r => r.auth_user_id)).size;
  const tot = S.sops.reduce((a, s) => [a[0] + Math.min(readN(s), audience(s)), a[1] + audience(s)], [0, 0]);
  return `${head("SOPs", "How we do things here. Each procedure is linked to the roles that follow it and the tools it uses.", canEdit ? `<button class="btn go" type="button" data-modal="sop">${ic("plus")}New SOP</button>` : "")}
  ${canEdit ? `<section class="kpis">${kpi("Procedures", S.sops.length, "")}${kpi("Read rate", tot[1] ? Math.round(tot[0] / tot[1] * 100) + "%" : "—", "people who confirmed reading")}${kpi("Due for review", S.sops.filter(sopOverdue).length, "not reviewed in 90 days", S.sops.some(sopOverdue) ? "warn" : "good")}</section>` : ""}
  <div class="row"><input class="in" id="sopq" type="search" placeholder="Search procedures" value="${esc(ui.sopq)}" style="flex:1;max-width:320px"><div class="chips">${cats.map(c => `<button class="chip" type="button" data-scat="${esc(c)}" aria-pressed="${ui.sopCat === c}">${esc(c)}</button>`).join("")}${lvl() > 0 ? `<button class="chip" type="button" data-smine="1" aria-pressed="${ui.sopMine}">Only my role</button>` : ""}</div></div>
  <div class="tpls">${list.map(s => { const mine = S.reads.some(r => r.sop_id === s.id && r.auth_user_id === ME.id), a = audience(s), r = Math.min(readN(s), a); return `<section class="card tpl"><div class="row"><b class="grow">${esc(s.title)}</b>${pill(s.format)}</div>
    <div class="flow"><span class="k">FOR</span>${s.roles.map(x => `<span class="v">${esc(ROLES[x]?.label || x)}</span>`).join("")}</div><div class="flow"><span class="k">USES</span>${s.tools.map(t => `<span class="v then">${esc(t)}</span>`).join("")}</div>
    <div class="row small muted"><span class="grow">Reviewed ${dShort(s.reviewed_on)}${s.owner_name ? " by " + esc(s.owner_name) : ""}</span>${sopOverdue(s) ? pill("Review due", "warn") : ""}</div>
    ${canEdit ? `<div style="display:grid;gap:5px"><span class="small muted">${r} of ${a} confirmed reading</span>${prog(r, a || 1)}</div>` : ""}
    <div class="row"><button class="btn sm primary" type="button" data-sop="${s.id}">Open</button>${mine ? pill("You've read this", "good") : ""}</div></section>`; }).join("") || empty("No procedures here yet.")}</div>`;
};
function sopDrawer(id) {
  const s = S.sops.find(x => x.id === id); if (!s) return closeDrawer();
  DRAWER = { type: "sop", id };
  const mine = S.reads.some(r => r.sop_id === s.id && r.auth_user_id === ME.id);
  const who = can(3) ? S.team.filter(m => s.roles.includes(m.role)).map(m => [memberName(m.auth_user_id), S.reads.some(r => r.sop_id === s.id && r.auth_user_id === m.auth_user_id)]) : [];
  openDrawer(`${dHead(esc(s.title), pill(s.category) + pill(s.format, "acc") + (sopOverdue(s) ? pill("Review due", "warn") : ""))}
  <div class="d-b">
    <div class="blk"><h4>Steps</h4><ol class="tl">${s.steps.map((st, i) => `<li><span class="k">${i + 1}</span><span>${esc(st)}</span><span></span></li>`).join("")}</ol></div>
    <div class="blk"><h4>Tools used</h4><div class="row">${s.tools.map(t => { const l = S.links.find(x => x.name === t); return l ? toolLink(l) : pill(t, "acc"); }).join("")}</div></div>
    <div class="blk"><h4>Who follows it</h4><div class="row">${s.roles.map(r => pill(ROLES[r]?.label || r)).join("")}</div></div>
    ${who.length ? `<div class="blk"><h4>Confirmed reading</h4><div class="flags">${who.map(([n, ok]) => pill(n, ok ? "good" : "")).join("")}</div></div>` : ""}
    <div class="row">${mine ? pill("You've confirmed reading this", "good") : `<button class="btn go" type="button" data-sopread="${s.id}">${ic("check")}I've read this</button>`}${can(3) ? `<button class="btn" type="button" data-modal="sop" data-sid="${s.id}">${ic("edit")}Edit</button><button class="btn" type="button" data-sopreviewed="${s.id}">Mark reviewed today</button>` : ""}</div>
  </div>`);
}
function sopModal(id) {
  const s = S.sops.find(x => x.id === id) || { title: "", category: "Operations", roles: ["agent"], tools: ["Jreebs"], format: "Checklist", steps: [] };
  openModal(`${mHead(id ? "Edit SOP" : "New SOP")}<div class="m-b form">
    <div class="f3"><div class="field"><label for="sp1">Title</label><input class="in" id="sp1" value="${esc(s.title)}"></div><div class="field"><label for="sp2">Category</label><input class="in" id="sp2" value="${esc(s.category)}" list="spCats"><datalist id="spCats">${[...new Set(["Customer care", "Operations", "Field", "People", ...S.sops.map(x => x.category)])].map(c => `<option value="${esc(c)}">`).join("")}</datalist></div><div class="field"><label for="sp4">Format</label><select class="sel" id="sp4">${["Checklist", "Document", "Video"].map(f => `<option ${s.format === f ? "selected" : ""}>${f}</option>`).join("")}</select></div></div>
    <span class="lbl">Who follows it</span><div class="row">${ROLE_ORDER.map((r, i) => `<label class="row small" for="spr${i}" style="gap:6px"><input type="checkbox" id="spr${i}" data-spr="${r}" ${s.roles.includes(r) ? "checked" : ""}>${ROLES[r].label}</label>`).join("")}</div>
    <div class="field"><label for="sp5">Tools it uses (comma separated)</label><input class="in" id="sp5" value="${esc(s.tools.join(", "))}"></div>
    <div class="field"><label for="sp3">Steps, one per line</label><textarea class="in" id="sp3" rows="7">${esc(s.steps.join("\n"))}</textarea></div>
    </div>
    <div class="m-f">${id ? `<button class="btn danger" type="button" data-delsop="${id}">Delete</button><span class="spacer"></span>` : ""}<button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn primary" type="button" data-savesop="${id || ""}">Save</button></div>`, true);
}
