/* Work: Home, each board (orders, requests, deals, jobs, tasks…), Inbox, Customers, plus the item drawer and message/call/assign dialogs. */
const todayStart = () => mins(startOfDay().getTime());
const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
const myName = () => (memberName(ME.id) || nameOf(ME.email)).split(" ")[0];
const doneAt = it => it.t[defOf(it).done];
const multi = () => liveBoards().length > 1;
const boardTag = it => multi() ? `<span class="bt">${esc(defOf(it).item)}</span>` : "";
function dayStats(list) {
  const done = list.filter(i => i.status === defOf(i).done && doneAt(i) != null);
  const onTime = done.filter(i => doneAt(i) <= i.due).length;
  return { n: list.length, done: done.length, ontime: done.length ? Math.round(onTime / done.length * 100) : null, avg: done.length ? Math.round(done.reduce((s, i) => s + (doneAt(i) - i.created), 0) / done.length) : null, value: list.filter(i => i.status === defOf(i).done).reduce((s, i) => s + (+i.data?.value || 0), 0) };
}
function attRow(it) {
  const d = defOf(it), top = it.flags.filter(f => f.sev > 0).sort((a, b) => b.sev - a.sev)[0];
  return `<div class="att"><span class="bar s${top ? top.sev : 1}"></span>
    <div style="min-width:0"><div class="t1">${boardTag(it)}${esc(it.ext_id)} · ${esc(it.name)} ${flagPills(it)}</div><div class="t2">${[d.x(it), it.area ? esc(it.area) : "", it.owner ? esc(it.owner) : "no " + esc(d.ownerLabel.toLowerCase()), `${esc(d.dueLabel.toLowerCase())} ${dueText(it)}`].filter(Boolean).join(" · ")}</div></div>
    <div class="acts">${top && top.tpl && it.phone ? `<button class="btn sm wa" type="button" data-msg="${it.id}" data-tpl="${top.tpl}">${ic("wa")}Send</button>` : ""}${!it.owner && can(2) ? `<button class="btn sm" type="button" data-assign="${it.id}">Assign</button>` : ""}<button class="btn sm" type="button" data-oo="${it.id}">Open</button></div></div>`;
}
const newBtn = (label = "New") => can(1) ? (multi() ? `<button class="btn go" type="button" data-modal="newitem">${ic("plus")}${label}</button>` : `<button class="btn go" type="button" data-modal="newitem">${ic("plus")}New ${esc(WDEF.item.toLowerCase())}</button>`) : "";

/* ---------- HOME ---------- */
VIEWS.home = function () {
  if (lvl() === 0) return vStops();
  if (lvl() === 1) return vMyDay();
  if (multi()) return homeMulti();
  const t0 = todayStart(), mine = ITEMS.filter(i => i.board === WDEF.id), today = mine.filter(i => i.created >= t0), st = dayStats(today);
  const yest = mine.filter(i => i.created >= t0 - 1440 && i.created < t0).length;
  const now = nowM(), lateN = mine.filter(i => !isTerm(i) && now > i.due).length;
  const fl = ITEMS.filter(i => !isTerm(i) && attention(i)).sort((a, b) => topSev(b) - topSev(a) || a.due - b.due);
  const openC = S.cases.filter(c => c.status !== "resolved" && c.kind === "Complaint").length;
  const hours = Array.from({ length: 16 }, (_, k) => 7 + k), hv = hours.map(h => today.filter(i => new Date(i.created * 60000).getHours() === h).length);
  return `${head(`${greet()}, ${esc(myName())}`, `${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · <span class="livedot" id="live"><i></i><span>live</span></span>`, `${modOn("reports") ? `<button class="btn" type="button" data-nav="reports">${ic("chart")}Reports</button>` : ""}${newBtn()}`)}
  <section class="kpis">
    ${kpi(`${WDEF.items} today`, st.n, `${yest} yesterday`)}
    ${kpi("On time", st.ontime == null ? "—" : st.ontime + "%", `target ${TARGETS().ontime}%`, st.ontime == null ? "" : st.ontime >= TARGETS().ontime ? "good" : "warn")}
    ${kpi("Late now", lateN, lateN ? "need attention" : "all on track", lateN ? "crit" : "good")}
    ${kpi("Avg time", st.avg == null ? "—" : dur(st.avg), "created to done")}
    ${kpi("Open complaints", openC, `reply within ${SLA().firstReply} min`, openC ? "warn" : "")}
    ${WDEF.hasValue ? (can(4) ? kpi("Revenue today", fmtN(Math.round(st.value)) + " JOD", `${st.done} completed`) : `<div class="kpi lockd"><span class="l">Revenue today</span><span class="v">${ic("lock")} Hidden</span><span class="s">Visible to managers and owners</span></div>`) : kpi("Completed today", st.done, "")}
  </section>
  <div class="grid2"><div class="stack">
    <section class="card"><div class="card-h"><h3>Needs attention</h3><span class="sub">${fl.length} flagged by your automations</span><span class="spacer"></span><button class="btn sm" type="button" data-nav="orders" data-board="${WDEF.id}" data-saved="flagged">See all</button></div><div>${fl.slice(0, 7).map(attRow).join("") || empty("Nothing needs attention right now.")}</div></section>
    <section class="card"><div class="card-h"><h3>${esc(WDEF.items)} by hour</h3><span class="sub">today</span></div><div class="card-b">${barChart(hv, hours.map(h => String(h).padStart(2, "0")), { hi: hours.indexOf(new Date().getHours()), ticks: 16, label: `${WDEF.items} by hour` })}</div></section>
  </div>${homeSide()}</div>`;
};
function homeSide() {
  const online = S.team.filter(m => ONLINE.has(m.auth_user_id)), health = companyHealth();
  const waiting = S.approvals.filter(a => a.status === "pending" && a.requester !== ME.id);
  return `<div class="stack">
    <section class="card"><div class="card-h"><h3>Online now</h3><span class="sub">${online.length} of ${S.team.length}</span><span class="spacer"></span>${modOn("team") ? `<button class="btn sm" type="button" data-nav="team" data-tt="live">Live board</button>` : ""}</div>
      <div class="card-b" style="display:grid;gap:9px">${online.map(m => `<div class="row"><span class="dot-s online"></span><span class="grow">${esc(memberName(m.auth_user_id))}</span><span class="small muted">${esc(ROLES[m.role]?.label || m.role)}</span></div>`).join("") || `<span class="muted small">Nobody else is signed in right now.</span>`}</div></section>
    ${modOn("approvals") && can(3) && waiting.length ? `<section class="card"><div class="card-h"><h3>Waiting for approval</h3><span class="sub">${waiting.length}</span><span class="spacer"></span><button class="btn sm" type="button" data-nav="approvals" data-apf="todo">Review</button></div>${waiting.slice(0, 4).map(a => `<div class="att"><span class="bar s2"></span><div style="min-width:0"><div class="t1">${esc(apTitle(a))}</div><div class="t2">${esc(a.requester_name || "")} · ${ago(a.created_at)}</div></div><div class="acts"><button class="btn sm" type="button" data-nav="approvals" data-apf="todo">Open</button></div></div>`).join("")}</section>` : ""}
    ${can(4) && health.length ? `<section class="card"><div class="card-h"><h3>Company health</h3><span class="spacer"></span>${modOn("reports") ? `<button class="btn sm" type="button" data-nav="reports" data-rp="company">Report</button>` : ""}</div>${health.map(([s, t, d, v]) => `<div class="att"><span class="bar s${s}"></span><div style="min-width:0"><div class="t1">${esc(t)}</div><div class="t2">${esc(d)}</div></div><div class="acts"><button class="btn sm" type="button" data-nav="${v}">Open</button></div></div>`).join("")}</section>` : ""}
    <section class="card"><div class="card-h"><h3>Live activity</h3></div><ul class="feed">${S.act.slice(0, 8).map(a => `<li><time>${hm(mins(new Date(a.at)))}</time><span>${esc(a.text)} <small>· ${esc(nameOf(a.actor_email || "system"))}</small></span></li>`).join("") || `<li><time></time><span class="muted">No activity yet.</span></li>`}</ul></section>
  </div>`;
}
function homeMulti() {
  const t0 = todayStart(), now = nowM(), bs = liveBoards();
  const fl = ITEMS.filter(i => !isTerm(i) && attention(i)).sort((a, b) => topSev(b) - topSev(a) || a.due - b.due);
  const per = bs.map(b => { const its = ITEMS.filter(i => i.board === b.id), open = its.filter(i => !isTerm(i)), today = its.filter(i => i.created >= t0); return { b, open: open.length, late: open.filter(i => now > i.due).length, today: today.length, done: its.filter(i => i.status === b.done && (doneAt(i) ?? 0) >= t0).length, st: dayStats(its.filter(i => i.created >= t0 - 6 * 1440)), value: b.hasValue ? open.reduce((s, i) => s + (+i.data?.value || 0), 0) : null }; });
  const openC = S.cases.filter(c => c.status === "open").length, waiting = S.approvals.filter(a => a.status === "pending").length;
  return `${head(`${greet()}, ${esc(myName())}`, `${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · <span class="livedot" id="live"><i></i><span>live</span></span>`, `${modOn("reports") ? `<button class="btn" type="button" data-nav="reports">${ic("chart")}Reports</button>` : ""}${newBtn()}`)}
  <section class="kpis">${per.map(p => kpi(`Open ${p.b.items.toLowerCase()}`, p.open, p.late ? `${p.late} overdue` : "none overdue", p.late ? "crit" : "")).join("")}${modOn("inbox") ? kpi("Open conversations", openC, "in the inbox", openC ? "warn" : "") : ""}${modOn("approvals") ? kpi("Approvals waiting", waiting, "leave, expenses, purchases", waiting ? "warn" : "") : ""}</section>
  <div class="grid2"><div class="stack">
    <section class="card"><div class="card-h"><h3>Needs attention</h3><span class="sub">${fl.length} flagged across ${bs.length} boards</span></div><div>${fl.slice(0, 8).map(attRow).join("") || empty("Nothing needs attention right now.")}</div></section>
    <section class="card"><div class="card-h"><h3>Across the company</h3><span class="sub">today · on-time over 7 days</span></div><div class="tw"><table class="t"><thead><tr><th>Board</th><th class="r">Open</th><th class="r">Overdue</th><th class="r">New today</th><th class="r">Done today</th><th class="r">On time</th>${can(4) ? `<th class="r">Open value</th>` : ""}</tr></thead><tbody>${per.map(p => `<tr class="click" data-nav="orders" data-board="${p.b.id}"><td><div class="who">${ic(p.b.icon)}<b>${esc(p.b.items)}</b></div></td><td class="r num">${p.open}</td><td class="r num">${p.late ? `<span class="crit-t">${p.late}</span>` : 0}</td><td class="r num">${p.today}</td><td class="r num">${p.done}</td><td class="r">${p.st.ontime == null ? "—" : `<span class="score ${scoreCls(p.st.ontime)}">${p.st.ontime}%</span>`}</td>${can(4) ? `<td class="r num">${p.value == null ? "—" : fmtN(Math.round(p.value)) + " JOD"}</td>` : ""}</tr>`).join("")}</tbody></table></div></section>
  </div>${homeSide()}</div>`;
}
function companyHealth() {
  const out = [];
  if (modOn("company")) S.docs.forEach(d => { const n = daysUntil(d.expires_on); if (n != null && n < 0) out.push([3, `${d.name} expired ${-n} days ago`, "Legal & compliance files", "company"]); else if (n != null && n <= 30) out.push([2, `${d.name} expires in ${n} days`, "Legal & compliance files", "company"]); });
  const iss = modOn("access") ? accessIssues().length : 0; if (iss) out.push([2, `${iss} access issue${iss > 1 ? "s" : ""} to fix`, "People & access", "access"]);
  const ren = modOn("systems") ? S.plats.filter(p => { const n = daysUntil(p.renews_on); return n != null && n >= 0 && n <= 30; }) : []; if (ren.length) out.push([1, ren.map(p => `${p.name} renews ${dShort(p.renews_on)}`).join(" · "), "Systems & tools", "systems"]);
  const od = modOn("sops") ? S.sops.filter(sopOverdue).length : 0; if (od) out.push([1, `${od} SOP${od > 1 ? "s" : ""} due for review`, "SOPs", "sops"]);
  return out;
}

function vMyDay() {
  const W = multi() ? "work" : WDEF.items.toLowerCase();
  const mine = ITEMS.filter(i => i.assigned_to === ME.id), open = ITEMS.filter(i => !isTerm(i) && (i.assigned_to === ME.id || !i.assigned_to));
  const myC = S.cases.filter(c => c.status === "open" && (c.assignee === ME.id || !c.assignee));
  const today = mine.filter(i => i.created >= todayStart()), st = dayStats(today);
  const mq = myQA(), myQAs = mq.length ? Math.round(mq.reduce((s, r) => s + qaPct(r), 0) / mq.length) : null;
  const myAp = S.approvals.filter(a => a.requester === ME.id && a.status === "pending").length;
  const todo = [...open.filter(attention).map(it => ({ k: "o", it, s: topSev(it) })), ...myC.map(c => ({ k: "c", c, s: c.reply_by && new Date(c.reply_by) < new Date() ? 3 : 2 }))].sort((a, b) => b.s - a.s);
  return `${head(`${greet()}, ${esc(myName())}`, `Your ${W} and conversations, most urgent first.`, `${modOn("inbox") ? `<button class="btn" type="button" data-nav="inbox">${ic("inbox")}Inbox</button>` : ""}${newBtn()}`)}
  <section class="kpis">${kpi(`Open ${W}`, open.length, "yours + unclaimed")}${modOn("inbox") ? kpi("Need a reply", myC.length, "in the inbox", myC.length ? "warn" : "good") : ""}${kpi("Handled today", today.length, `target ${TARGETS().perAgent}`)}${kpi("On time", st.ontime == null ? "—" : st.ontime + "%", `target ${TARGETS().ontime}%`)}${modOn("quality") ? kpi("My QA score", myQAs == null ? "—" : myQAs + "%", `${mq.length} review${mq.length === 1 ? "" : "s"}`, myQAs == null ? "" : myQAs >= TARGETS().qa ? "good" : "warn") : ""}${modOn("approvals") ? kpi("My requests", myAp, "waiting for approval") : ""}</section>
  <div class="grid2"><section class="card"><div class="card-h"><h3>Do next</h3></div><div>${todo.slice(0, 12).map(t => t.k === "o" ? attRow(t.it) : caseRow(t.c)).join("") || empty("You're all caught up.")}</div></section>
  <div class="stack"><section class="card"><div class="card-h"><h3>My targets today</h3></div><div class="card-b" style="display:grid;gap:14px">${tRow(`Handled`, today.length, TARGETS().perAgent)}${tRow("On time", st.ontime ?? 0, TARGETS().ontime, "%")}</div></section>
  ${modOn("quality") && mq.length ? `<section class="card"><div class="card-h"><h3>My quality</h3><span class="spacer"></span><button class="btn sm" type="button" data-nav="quality">All my reviews</button></div><ul class="feed">${mq.slice(0, 3).map(r => `<li><time>${qaPct(r)}%</time><span>${esc(r.note || "No note.")} <small>· ${esc(nameOf(r.reviewer_email || ""))} · ${dShort(r.created_at)}</small></span></li>`).join("")}</ul></section>` : ""}
  ${modOn("sops") ? `<section class="card"><div class="card-h"><h3>SOPs for you</h3><span class="spacer"></span><button class="btn sm" type="button" data-nav="sops">All</button></div><div>${S.sops.filter(s => s.roles.includes(ME.role) && !S.reads.some(r => r.sop_id === s.id && r.auth_user_id === ME.id)).slice(0, 4).map(s => `<div class="att"><span class="bar s1"></span><div style="min-width:0"><div class="t1">${esc(s.title)}</div><div class="t2">Not read yet</div></div><div class="acts"><button class="btn sm" type="button" data-sop="${s.id}">Read</button></div></div>`).join("") || empty("You've read every SOP for your role.")}</div></section>` : ""}</div></div>`;
}
const tRow = (l, v, t, u = "") => `<div style="display:grid;gap:6px"><div class="row small"><span class="grow">${esc(l)}</span><span class="num">${v}${u} / ${t}${u}</span></div>${prog(v, t)}</div>`;
const caseRow = c => { const cu = S.cust.find(x => x.id === c.customer_id); const last = [...S.msgs].reverse().find(m => m.case_id === c.id && m.dir === "in"); return `<div class="att"><span class="bar s${c.kind === "Complaint" ? 3 : 2}"></span><div style="min-width:0"><div class="t1"><span class="ch ${chCode(c.channel)}">${chCode(c.channel)}</span> ${esc(cu?.name || c.subject || "Conversation")} ${pill(c.kind, c.kind === "Complaint" ? "crit" : "info")} ${slaPill(c)}</div><div class="t2">${esc(last?.body || c.subject || "")}</div></div><div class="acts"><button class="btn sm primary" type="button" data-cv="${c.id}">Reply</button></div></div>`; };

function vStops() {
  const mine = ITEMS.filter(i => i.owner_user === ME.id || i.owner === memberName(ME.id));
  const act = mine.filter(i => !isTerm(i)).sort((a, b) => a.due - b.due), done = mine.filter(i => i.status === defOf(i).done && i.created >= todayStart());
  return `${head(`Hi ${esc(myName())}`, `Your stops for today, in order.`, `${modOn("approvals") ? `<button class="btn" type="button" data-nav="approvals">${ic("check")}Requests</button>` : ""}${modOn("sops") ? `<button class="btn" type="button" data-nav="sops">${ic("book")}SOPs</button>` : ""}`)}
  <section class="kpis">${kpi("Stops left", act.length, "assigned to you")}${kpi("Done today", done.length, "keep going", "good")}</section>
  <div class="stack" style="max-width:600px">${act.map((it, i) => { const nx = nextStage(it), d = defOf(it); return `<section class="card drv-card">
    <div class="row"><span class="pill ${i === 0 ? "cta" : ""}">${i === 0 ? "Next stop" : "Stop " + (i + 1)}</span>${boardTag(it)}${flagPills(it)}<span class="spacer"></span>${statusPill(it)}</div>
    <div class="big">${esc(it.name)}${it.area ? " · " + esc(it.area) : ""}</div>
    <div class="small muted">${[esc(it.ext_id), d.x(it), `${esc(d.dueLabel.toLowerCase())} ${dueText(it)}`].filter(Boolean).join(" · ")}</div>
    <div class="row"><a class="btn" href="https://www.google.com/maps/search/${encodeURIComponent((it.data?.address || it.area || "") + ", Amman")}" target="_blank" rel="noopener">${ic("map")}Directions</a>
      ${it.phone ? `<a class="btn" href="tel:${esc(it.phone.replace(/\s/g, ""))}">${ic("phone")}Call</a>` : ""}
      ${nx ? `<button class="btn go" type="button" data-adv="${it.id}" data-to="${nx[0]}">${esc(nx[1])}</button>` : ""}
      <button class="btn ghost danger" type="button" data-problem="${it.id}">Problem</button></div></section>`; }).join("") || `<section class="card">${empty("No stops right now. New ones appear here the moment you're assigned.")}</section>`}</div>`;
}

/* ---------- A BOARD (list or kanban) ---------- */
VIEWS.orders = function () {
  const D = WDEF, isAgent = lvl() === 1;
  let base = ITEMS.filter(i => i.board === D.id);
  if (isAgent && ui.mine) base = base.filter(i => i.assigned_to === ME.id || !i.assigned_to);
  const tabs = [["active", "Active", i => !isTerm(i)], ...[...D.stages, ...D.alt].map(([k, l]) => [k, l, i => i.status === k]), ["all", "Last 30 days", () => true]];
  const tf = tabs.find(t => t[0] === ui.orderTab) || tabs[0];
  let list = ui.boardView === "kanban" ? base.slice() : base.filter(tf[2]);
  if (ui.saved === "flagged") list = list.filter(attention);
  if (ui.saved === "late") list = list.filter(i => !isTerm(i) && nowM() > i.due);
  if (ui.saved === "noowner") list = list.filter(i => !i.owner && !isTerm(i));
  if (ui.saved === "vip") list = list.filter(i => (custOf(i)?.tags || []).includes("VIP"));
  if (ui.area !== "all") list = list.filter(i => i.area === ui.area);
  if (ui.q) { const q = ui.q.toLowerCase(); list = list.filter(i => [i.ext_id, i.name, i.phone, i.area, i.owner, JSON.stringify(i.data)].join(" ").toLowerCase().includes(q)); }
  list.sort((a, b) => topSev(b) - topSev(a) || (isTerm(a) - isTerm(b)) || a.due - b.due);
  const areas = D.hasArea ? [...new Set(base.map(i => i.area).filter(Boolean))].sort() : [];
  const bulk = can(2), allSel = list.length && list.every(i => ui.sel.has(i.id)), kan = ui.boardView === "kanban";
  const viewSw = `<div class="seg" role="group" aria-label="View"><button type="button" data-bview="list" aria-pressed="${!kan}">${ic("menu")}List</button><button type="button" data-bview="kanban" aria-pressed="${kan}">${ic("grid")}Board</button></div>`;
  return `${head(isAgent ? `My ${esc(D.items.toLowerCase())}` : esc(D.items), `${base.filter(i => !isTerm(i)).length} open · ${base.filter(i => i.created >= todayStart()).length} new today`, `${viewSw}${can(4) && modOn("data") ? `<button class="btn" type="button" data-nav="data">${ic("up")}Import</button>` : ""}${can(2) ? `<button class="btn" type="button" data-export="items">${ic("down")}Export</button>` : ""}<button class="btn go" type="button" data-modal="newitem" data-b="${D.id}">${ic("plus")}New ${esc(D.item.toLowerCase())}</button>`)}
  <section class="card">
    ${kan ? "" : `<div class="card-h"><div class="tabs" role="tablist">${tabs.map(([k, l, f]) => `<button class="tab" role="tab" type="button" data-otab="${k}" aria-selected="${ui.orderTab === k}">${esc(l)} <span class="c">${base.filter(f).length}</span></button>`).join("")}</div></div>`}
    <div class="card-h" style="gap:8px"><div class="chips">${[["flagged", "Needs attention"], ["late", "Overdue"], ["noowner", "No " + D.ownerLabel.toLowerCase()], ...(D.hasPhone ? [["vip", "VIP customers"]] : [])].map(([k, l]) => `<button class="chip" type="button" data-savedt="${k}" aria-pressed="${ui.saved === k}">${esc(l)}</button>`).join("")}${isAgent ? `<button class="chip" type="button" data-mine="1" aria-pressed="${ui.mine}">Mine + unclaimed</button>` : ""}</div><span class="spacer"></span>
      <input class="in" id="oq" type="search" placeholder="Search" value="${esc(ui.q)}" style="width:200px">
      ${areas.length ? `<select class="sel" id="fArea" aria-label="Area"><option value="all">All areas</option>${areas.map(a => `<option ${ui.area === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>` : ""}</div>
    ${!kan && ui.sel.size && bulk ? `<div class="card-h" style="background:var(--accent-soft)"><b>${ui.sel.size} selected</b><button class="btn sm" type="button" data-assign="__sel">Assign ${esc(D.ownerLabel.toLowerCase())}</button><select class="sel" id="bulkStage" aria-label="Change status" style="height:30px"><option value="">Change status…</option>${[...D.stages, ...D.alt].map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select><button class="btn sm" type="button" data-export="selected">${ic("down")}Export</button><span class="spacer"></span><button class="btn sm ghost" type="button" data-clearsel="1">Clear</button></div>` : ""}
    ${kan ? kanban(D, list) : boardTable(D, list, bulk, allSel)}
  </section>`;
};
function boardTable(D, list, bulk, allSel) {
  const cols = 4 + (bulk ? 1 : 0) + (D.hasArea ? 1 : 0) + (D.fieldOwner ? 1 : 0) + 1;
  return `<div class="tw"><table class="t"><thead><tr>${bulk ? `<th><input type="checkbox" data-selall="1" aria-label="Select all" ${allSel ? "checked" : ""}></th>` : ""}<th>${esc(D.item)}</th><th>${esc(D.nameLabel)}</th><th>Details</th>${D.hasArea ? "<th>Area</th>" : ""}<th>${esc(D.ownerLabel)}</th>${D.fieldOwner ? "<th>Handled by</th>" : ""}<th>${esc(D.dueLabel)}</th><th>Status</th></tr></thead>
    <tbody>${list.slice(0, 400).map(i => `<tr class="click ${ui.sel.has(i.id) ? "selr" : ""}" data-oo="${i.id}">${bulk ? `<td><input type="checkbox" data-sel="${i.id}" aria-label="Select ${esc(i.ext_id)}" ${ui.sel.has(i.id) ? "checked" : ""}></td>` : ""}
      <td class="num"><b>${esc(i.ext_id)}</b></td><td><div class="who"><div><b>${esc(i.name)}</b>${D.hasPhone && i.phone ? `<span class="num">${esc(i.phone)}</span>` : ""}</div></div></td><td>${D.x(i) || `<span class="muted">—</span>`}</td>${D.hasArea ? `<td>${esc(i.area || "")}</td>` : ""}
      <td>${i.owner ? esc(i.owner) : `<span class="muted">—</span>`}</td>${D.fieldOwner ? `<td>${i.assigned_to ? esc(memberName(i.assigned_to).split(" ")[0]) : `<span class="muted">—</span>`}</td>` : ""}<td class="num">${dueText(i)}</td><td><div class="flags">${statusPill(i)}${flagPills(i)}</div></td></tr>`).join("") || `<tr><td colspan="${cols}">${empty(ITEMS.some(i => i.board === D.id) ? "Nothing matches these filters." : `No ${D.items.toLowerCase()} yet. Add one, or import a spreadsheet.`)}</td></tr>`}</tbody></table></div>
    ${list.length > 400 ? `<div class="card-b small muted">Showing the first 400. Narrow the filters to see the rest.</div>` : ""}`;
}
function kanban(D, list) {
  const cols = [...D.stages, ...D.alt], recent = nowM() - 7 * 1440;
  return `<div class="kan">${cols.map(([k, l]) => { const its = list.filter(i => i.status === k && (!D.terminal.includes(k) || (doneAt(i) ?? i.t[k] ?? i.created) >= recent)); return `<div class="kcol" data-drop="${k}"><div class="kcol-h"><b>${esc(l)}</b><span class="num muted">${its.length}</span></div>
    ${its.slice(0, 60).map(i => `<button class="kcard${attention(i) ? " flag" : ""}" type="button" data-oo="${i.id}" draggable="${can(1)}" data-drag="${i.id}"><span class="num small muted">${esc(i.ext_id)}</span><b>${esc(i.name)}</b>${D.x(i) ? `<span class="small muted">${D.x(i)}</span>` : ""}<span class="row small" style="gap:6px">${i.owner ? av(i.owner) : ""}<span class="muted">${dueText(i)}</span>${flagPills(i)}</span></button>`).join("")}${its.length > 60 ? `<span class="small muted">+${its.length - 60} more</span>` : ""}${D.terminal.includes(k) ? `<span class="small muted kfoot">Last 7 days</span>` : ""}</div>`; }).join("")}</div>`;
}

function itemDrawer(id) {
  const it = itemById(id); if (!it) return closeDrawer();
  DRAWER = { type: "item", id };
  const D = defOf(it), c = custOf(it), nx = nextStage(it);
  const steps = [[D.stages[0][1], it.created], ...D.stages.slice(1).map(([k, l]) => [l, it.t[k]]), ...D.alt.filter(([k]) => it.status === k).map(([k, l]) => [l, it.t[k]])];
  const cases = S.cases.filter(x => x.item_id === it.id);
  const people = ownerPeople(D);
  openDrawer(`${dHead(esc(it.ext_id) + " · " + esc(it.name), (multi() ? `<span class="bt">${esc(D.item)}</span>` : "") + statusPill(it) + flagPills(it))}
  <div class="d-b">
    <div class="row">${it.phone ? `<button class="btn wa" type="button" data-msg="${it.id}" data-tpl="${it.flags.find(f => f.tpl)?.tpl || ""}">${ic("wa")}WhatsApp</button><button class="btn" type="button" data-call="${it.id}">${ic("phone")}Call</button>` : ""}
      ${nx ? `<button class="btn go" type="button" data-adv="${it.id}" data-to="${nx[0]}">${esc(nx[1])}</button>` : ""}
      ${!it.assigned_to && can(1) ? `<button class="btn" type="button" data-take="${it.id}">Take it</button>` : ""}</div>
    <div class="blk"><h4>${esc(D.nameLabel)}</h4><dl class="kv"><dt>Name</dt><dd>${c ? `<button class="linkbtn" type="button" data-cu="${c.id}">${esc(c.name)}</button> ${c.tags.map(t => pill(t, t === "VIP" ? "cta" : "")).join(" ")}` : esc(it.name)}</dd>${D.hasPhone ? `<dt>Phone</dt><dd class="num">${esc(it.phone || "—")}</dd>` : ""}${D.hasArea ? `<dt>Area</dt><dd>${esc(it.area || "—")}</dd>` : ""}${c ? `<dt>History</dt><dd>${ITEMS.filter(x => x.customer_id === c.id).length} records in 30 days</dd>` : ""}</dl></div>
    <div class="blk"><h4>Details</h4><dl class="kv">${D.fields.map(([k, l]) => `<dt>${esc(l)}</dt><dd>${k === "value" && it.data?.[k] != null ? fmtN(it.data[k]) + " JOD" : esc(it.data?.[k] ?? "—")}</dd>`).join("")}<dt>${esc(D.ownerLabel)}</dt><dd>${esc(it.owner || "Not assigned")} ${can(2) && !isTerm(it) ? `<button class="btn sm" type="button" data-assign="${it.id}">${it.owner ? "Change" : "Assign"}</button>` : ""}</dd>${D.fieldOwner ? `<dt>Handled by</dt><dd>${it.assigned_to ? esc(memberName(it.assigned_to)) : "Nobody yet"} ${can(2) ? `<select class="sel" id="dAgent" data-item="${it.id}" style="height:30px"><option value="">Change…</option>${officePeople().map(m => `<option value="${m.auth_user_id}">${esc(m.name)}</option>`).join("")}</select>` : ""}</dd>` : ""}<dt>${esc(D.dueLabel)}</dt><dd class="num">${hm(it.due)} · ${dShort(it.due * 60000)}</dd></dl></div>
    <div class="blk"><h4>Progress</h4><ol class="tl">${steps.map(([l, t], i) => `<li><span class="k ${t != null ? "done" : i === steps.findIndex(s => s[1] == null) ? "now" : ""}">${t != null ? "✓" : i + 1}</span><span>${esc(l)}${t != null && i > 0 && steps[i - 1][1] != null ? ` <span class="small muted">· ${dur(t - steps[i - 1][1])}</span>` : ""}</span><time>${t != null ? (D.long ? dShort(t * 60000) : hm(t)) : "—"}</time></li>`).join("")}</ol>
      ${!isTerm(it) ? `<div class="row"><span class="small muted">Set status:</span><select class="sel" id="dStage" data-item="${it.id}" style="height:30px"><option value="">Choose…</option>${[...D.stages, ...D.alt].filter(([k]) => k !== it.status).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>` : ""}</div>
    ${modOn("inbox") && D.hasPhone ? `<div class="blk"><h4>Conversations</h4>${cases.map(x => `<button class="btn sm" type="button" data-cv="${x.id}" style="justify-content:flex-start"><span class="ch ${chCode(x.channel)}">${chCode(x.channel)}</span>${esc(x.kind)} · ${x.status}</button>`).join(" ") || `<span class="small muted">None yet.</span>`} <button class="btn sm" type="button" data-newcase="${it.id}">${ic("plus")}Log a conversation</button></div>` : ""}
    <div class="blk"><h4>Notes and history</h4><textarea class="in" id="oNote" placeholder="Visible to your team only"></textarea><div class="row"><button class="btn sm" type="button" data-onote="${it.id}">Add note</button>${can(4) ? `<span class="spacer"></span><button class="btn sm ghost danger" type="button" data-delitem="${it.id}">Delete</button>` : ""}</div>
      <ul class="feed">${[...it.hist].reverse().map(h => `<li><time>${hm(mins(new Date(h.at)))}</time><span>${esc(h.text)}${h.by ? ` <small>· ${esc(nameOf(h.by))}</small>` : ""}</span></li>`).join("") || `<li><time></time><span class="muted">No history yet.</span></li>`}</ul></div>
  </div>`);
  void people;
}

function msgModal(id, tplKey) {
  const it = itemById(id); if (!it) return;
  const tpls = S.tpls.length ? S.tpls : allTemplates().map(([key, name, category, en, ar]) => ({ key, name, category, en, ar }));
  const t = tpls.find(x => x.key === tplKey) || tpls[0];
  let lang = (custOf(it)?.lang === "ar") ? "ar" : "en";
  const draw = () => {
    const txt = t ? fill(lang === "ar" ? t.ar : t.en, it) : "";
    openModal(`${mHead(`WhatsApp ${esc(it.name)}`)}<div class="m-b">
      <div class="chips">${tpls.map(x => `<button class="chip" type="button" data-mt="${esc(x.key)}" aria-pressed="${t && x.key === t.key}">${esc(x.name)}</button>`).join("")}</div>
      <div class="chips"><button class="chip" type="button" data-ml="en" aria-pressed="${lang === "en"}">English</button><button class="chip" type="button" data-ml="ar" aria-pressed="${lang === "ar"}">عربي</button></div>
      <textarea class="in" id="mText" rows="5" ${lang === "ar" ? 'dir="rtl" style="font-family:var(--ar)"' : ""}>${esc(txt)}</textarea>
      <p class="small muted">To ${esc(it.phone)}. WhatsApp opens with the message ready. Press send there, then come back and press "Log as sent".</p></div>
      <div class="m-f"><button class="btn" type="button" data-copymsg="1">Copy</button><a class="btn wa" id="waGo" href="#" target="_blank" rel="noopener">${ic("wa")}Open WhatsApp</a><button class="btn primary" type="button" data-logsent="${it.id}">Log as sent</button></div>`);
    const upd = () => { $("#waGo").href = `https://wa.me/${waNum(it.phone)}?text=${encodeURIComponent($("#mText").value)}`; };
    $("#mText").oninput = upd; upd();
    $$("#modal [data-mt]").forEach(b => b.onclick = () => { const n = tpls.find(x => x.key === b.dataset.mt); if (n) { tplKey = n.key; msgModal(id, n.key); } });
    $$("#modal [data-ml]").forEach(b => b.onclick = () => { lang = b.dataset.ml; draw(); });
  };
  draw();
}
function callModal(id) {
  const it = itemById(id); if (!it) return;
  openModal(`${mHead(`Call ${esc(it.name)}`)}<div class="m-b">
    <div class="row"><span class="num" style="font-size:20px;font-weight:600">${esc(it.phone)}</span><span class="spacer"></span><button class="btn sm" type="button" data-copy="${esc(it.phone)}">Copy</button><a class="btn primary" href="tel:${esc(String(it.phone).replace(/\s/g, ""))}">${ic("phone")}Dial</a></div>
    <span class="lbl">After the call, log what happened</span>
    <div class="stack" style="gap:8px">${["Reached, all good", "Reached, issue logged", "No answer", "Wrong number"].map(o => `<button class="btn" style="justify-content:flex-start" type="button" data-outcome="${esc(o)}" data-item="${it.id}">${esc(o)}</button>`).join("")}</div></div>`);
}
function assignModal(target) {
  const ids = target === "__sel" ? [...ui.sel].filter(i => { const x = itemById(i); return x && !isTerm(x); }) : [target];
  const D = defOf(itemById(ids[0])) || WDEF;
  const busy = name => ITEMS.filter(i => !isTerm(i) && i.owner === name).length;
  const ppl = ownerPeople(D);
  openModal(`${mHead(ids.length > 1 ? `Assign ${ids.length} ${esc(D.items.toLowerCase())}` : `Assign ${esc(D.ownerLabel.toLowerCase())}`)}<div class="m-b">
    ${ppl.length ? `<div class="stack" style="gap:8px">${ppl.sort((a, b) => busy(a.name) - busy(b.name)).map(p => `<button class="btn" style="justify-content:flex-start;height:auto;padding:10px 12px" type="button" data-doassign="${esc(p.name)}" data-uid="${p.auth_user_id || ""}" data-ids="${ids.join(",")}">${av(p.name)}<span class="grow" style="text-align:start"><b>${esc(p.name)}</b><br><span class="small muted">${busy(p.name) ? busy(p.name) + " open now" : "Free now"}${p.auth_user_id ? (ONLINE.has(p.auth_user_id) ? " · online" : " · has the app") : ""}</span></span></button>`).join("")}</div>` : `<p class="muted">No ${esc(D.fieldWord)} added yet. Add them in People & access${D.fieldOwner ? ' (department "Field")' : ""}, or type a name below.</p>`}
    <div class="row"><input class="in grow" id="asName" placeholder="Or type a name"><button class="btn" type="button" data-doassign="__typed" data-ids="${ids.join(",")}">Assign</button></div></div>`);
}
function newItemModal(boardId) {
  const D = boardId ? BDEF(boardId) : WDEF, bs = liveBoards();
  const now = new Date(Date.now() + (D.promise || 60) * 60000);
  openModal(`${mHead(`New ${esc(D.item.toLowerCase())}`)}<div class="m-b form">
    ${bs.length > 1 ? `<div class="field"><label for="niB">What are you adding?</label><select class="sel" id="niB">${bs.map(b => `<option value="${b.id}" ${b.id === D.id ? "selected" : ""}>${esc(b.item)} · ${esc(b.items)}</option>`).join("")}</select></div>` : ""}
    <div class="f2"><div class="field"><label for="ni1">${esc(D.nameLabel)}</label><input class="in" id="ni1" required ${D.hasPhone ? 'list="custNames"' : ""}>${D.hasPhone ? `<datalist id="custNames">${S.cust.slice(0, 400).map(c => `<option value="${esc(c.name)}">`).join("")}</datalist>` : ""}</div>${D.hasPhone ? `<div class="field"><label for="ni2">Phone</label><input class="in" id="ni2" placeholder="07X XXX XXXX"></div>` : `<div class="field"><label for="niO">${esc(D.ownerLabel)}</label><select class="sel" id="niO"><option value="">Nobody yet</option>${ownerPeople(D).map(p => `<option value="${esc(p.name)}" data-uid="${p.auth_user_id || ""}" ${p.auth_user_id === ME.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>`}</div>
    <div class="f2">${D.hasArea ? `<div class="field"><label for="ni3">Area</label><input class="in" id="ni3" list="areaList"><datalist id="areaList">${[...new Set(ITEMS.map(i => i.area).filter(Boolean))].map(a => `<option value="${esc(a)}">`).join("")}</datalist></div>` : ""}<div class="field"><label for="ni4">${esc(D.dueLabel)}</label><input class="in" id="ni4" type="datetime-local" value="${isoDay(now)}T${now.toTimeString().slice(0, 5)}"></div></div>
    ${D.fields.length ? `<div class="f2">${D.fields.map(([k, l], i) => `<div class="field"><label for="nf${i}">${esc(l)}</label><input class="in" id="nf${i}" ${k === "value" ? 'type="number" step="0.5" min="0"' : ""}></div>`).join("")}</div>` : ""}
    <div class="field"><label for="ni5">Reference number (optional)</label><input class="in" id="ni5" placeholder="Leave empty to number it automatically"></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-saveitem="${D.id}">Create</button></div>`);
  const sel = $("#niB"); if (sel) sel.onchange = () => newItemModal(sel.value);
}
async function saveNewItem(boardId) {
  const D = BDEF(boardId), name = $("#ni1").value.trim(); if (!name) return toast(`Add the ${D.nameLabel.toLowerCase()} first.`);
  const nums = S.items.filter(i => String(i.ext_id).startsWith(D.prefix + "-")).map(i => +String(i.ext_id).replace(/\D/g, "")).filter(n => n > 0);
  const ext = $("#ni5").value.trim() || `${D.prefix}-${Math.max(1000, ...nums) + 1}`;
  const data = {}; D.fields.forEach(([k], i) => { const v = $("#nf" + i).value.trim(); if (v) data[k] = k === "value" ? +v : v; }); data.t = {};
  const due = new Date($("#ni4").value), oSel = $("#niO"), owner = oSel ? oSel.value || null : null, ownerUid = oSel && oSel.value ? oSel.selectedOptions[0].dataset.uid || null : null;
  try {
    const r = await DB.insert("items", { client_id: CLIENT.id, board: D.id, ext_id: ext, name, phone: $("#ni2") ? $("#ni2").value.trim() : "", area: $("#ni3") ? $("#ni3").value.trim() || null : null, owner, status: D.stages[0][0], due: (isNaN(due) ? new Date(Date.now() + 3600000) : due).toISOString(), data, hist: [{ at: new Date().toISOString(), text: "Created", by: ME.email }], assigned_to: !D.fieldOwner && ownerUid ? ownerUid : lvl() === 1 ? ME.id : null });
    putRow(S.items, r[0]);
    if (r[0].customer_id && !S.cust.some(c => c.id === r[0].customer_id)) S.cust.push(...await DB.list("customers", { eq: { id: r[0].customer_id } }));
    await logAct(`${ext} created (${D.item.toLowerCase()})`, "item"); closeModal(); toast(`${ext} created.`); render();
  } catch (e) { toast(errMsg(e)); }
}

/* ---------- INBOX ---------- */
const CHANNELS = ["WhatsApp", "Phone call", "Instagram", "Email", "Talabat", "Careem", "In person"];
const chCode = c => ({ WhatsApp: "WA", "Phone call": "CL", Instagram: "IG", Email: "EM", Talabat: "TB", Careem: "CR" }[c] || "··");
const slaPill = c => { if (!c.reply_by || c.status !== "open") return ""; const m = Math.round((new Date(c.reply_by) - Date.now()) / 60000); return m < 0 ? pill(`Reply overdue ${-m} min`, "crit") : pill(`${m} min to reply`, m <= 5 ? "warn" : ""); };
VIEWS.inbox = function () {
  const filters = [["open", "Open"], ["pending", "Waiting"], ["resolved", "Resolved"], ["mine", "Mine"], ["complaints", "Complaints"]];
  let list = S.cases.slice();
  if (lvl() === 1) list = list.filter(c => c.assignee === ME.id || !c.assignee);
  const f = ui.cfilter;
  list = list.filter(c => f === "mine" ? c.assignee === ME.id : f === "complaints" ? c.kind === "Complaint" && c.status !== "resolved" : c.status === f);
  list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const cur = S.cases.find(c => c.id === ui.convo) || list[0];
  if (cur) ui.convo = cur.id;
  const msgs = cur ? S.msgs.filter(m => m.case_id === cur.id) : [];
  const cu = cur ? S.cust.find(x => x.id === cur.customer_id) : null, it = cur ? itemById(cur.item_id) : null;
  const phone = cu?.phone || it?.phone || "";
  return `${head("Inbox", "Every customer conversation in one queue, linked to its customer and order.", `<button class="btn go" type="button" data-newcase="">${ic("plus")}Log a conversation</button>`)}
  <div class="note-box">${ic("info")}<span>Your team logs calls and messages here, and replies open in WhatsApp ready to send. To have incoming WhatsApp messages land here on their own, connect the WhatsApp Business API in Integrations.</span></div>
  <section class="card pad0"><div class="inbox">
    <div class="ilist"><div class="chips">${filters.map(([k, l]) => `<button class="chip" type="button" data-cf="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
      ${list.map(c => { const cc = S.cust.find(x => x.id === c.customer_id); const last = [...S.msgs].reverse().find(m => m.case_id === c.id && m.dir !== "sys"); return `<button class="cv ${cur && c.id === cur.id ? "on" : ""}" type="button" data-cv="${c.id}"><span class="l1"><span class="ch ${chCode(c.channel)}">${chCode(c.channel)}</span><b>${esc(cc?.name || c.subject || "Conversation")}</b><time>${hm(mins(new Date(c.updated_at)))}</time></span><span class="l2">${esc(last?.body || c.subject || "")}</span><span class="row" style="gap:5px">${pill(c.kind, c.kind === "Complaint" ? "crit" : "info")}${c.status === "open" ? slaPill(c) : pill(c.status === "pending" ? "Waiting" : "Resolved", c.status === "resolved" ? "good" : "")}${c.assignee ? `<span class="small muted">· ${esc(memberName(c.assignee).split(" ")[0])}</span>` : ""}</span></button>`; }).join("") || empty("Nothing here.")}</div>
    ${cur ? `<div class="thread"><div class="th-h">${av(cu?.name || "?")}<div class="grow"><b>${esc(cu?.name || cur.subject || "Conversation")}</b><div class="small muted">${esc(cur.channel)}${phone ? " · " + esc(phone) : ""}${it ? ` · <button class="linkbtn" type="button" data-oo="${it.id}">${esc(it.ext_id)} · ${esc(stageName(it.status, it))}</button>` : ""}</div></div>
        ${can(2) ? `<select class="sel" id="cvAssign" aria-label="Assign to"><option value="">Unassigned</option>${S.team.filter(m => m.role !== "driver").map(m => `<option value="${m.auth_user_id}" ${m.auth_user_id === cur.assignee ? "selected" : ""}>${esc(memberName(m.auth_user_id))}</option>`).join("")}</select>` : (!cur.assignee ? `<button class="btn sm" type="button" data-cvtake="${cur.id}">Take it</button>` : "")}
        ${cur.status !== "resolved" ? `<button class="btn sm" type="button" data-cvstatus="pending">Waiting</button><button class="btn sm" type="button" data-cvstatus="resolved">${ic("check")}Resolve</button>` : `<button class="btn sm" type="button" data-cvstatus="open">Reopen</button>`}</div>
      <div class="msgs" id="msgs">${msgs.map(m => `<div class="mb ${m.dir === "out" ? "out" : m.dir === "note" ? "note" : m.dir === "sys" ? "sys" : ""}" ${/[؀-ۿ]/.test(m.body) ? 'dir="auto" style="font-family:var(--ar)"' : ""}>${esc(m.body)}<small>${hm(mins(new Date(m.created_at)))}${m.author_email && m.dir !== "in" ? " · " + esc(nameOf(m.author_email)) : ""}</small></div>`).join("") || `<div class="mb sys">No messages yet.</div>`}</div>
      <div class="reply"><div class="chips">${S.tpls.slice(0, 6).map(t => `<button class="chip" type="button" data-rtpl="${esc(t.key)}">${esc(t.name)}</button>`).join("")}</div>
        <textarea class="in" id="replyBox" placeholder="Write a reply, log what the customer said, or pick a template"></textarea>
        <div class="row"><select class="sel" id="replyDir" aria-label="Message type" style="height:32px"><option value="out">Reply to customer</option><option value="in">Customer said</option><option value="note">Internal note</option></select><span class="spacer"></span>${phone && cur.channel === "WhatsApp" ? `<button class="btn wa" type="button" data-sendwa="${cur.id}">${ic("wa")}Send on WhatsApp</button>` : ""}<button class="btn primary" type="button" data-send="${cur.id}">Save</button></div></div></div>` : `<div class="card-b">${empty("Select or log a conversation.")}</div>`}
  </div></section>`;
};
function newCaseModal(itemId) {
  const it = itemId ? itemById(itemId) : null;
  openModal(`${mHead("Log a conversation")}<div class="m-b form">
    <div class="f2"><div class="field"><label for="nc1">Customer</label><input class="in" id="nc1" list="custList" value="${esc(it ? it.name : "")}" placeholder="Name or phone"><datalist id="custList">${S.cust.slice(0, 500).map(c => `<option value="${esc(c.name)} · ${esc(c.phone)}">`).join("")}</datalist></div>
      <div class="field"><label for="nc2">Linked record (optional)</label><select class="sel" id="nc2"><option value="">None</option>${ITEMS.slice(0, 300).map(i => `<option value="${i.id}" ${it && it.id === i.id ? "selected" : ""}>${esc(i.ext_id)} · ${esc(i.name)}</option>`).join("")}</select></div></div>
    <div class="f2"><div class="field"><label for="nc3">Type</label><select class="sel" id="nc3">${["Complaint", "Question", "Change request", "Feedback", "Invoice"].map(k => `<option>${k}</option>`).join("")}</select></div><div class="field"><label for="nc4">Channel</label><select class="sel" id="nc4">${CHANNELS.map(c => `<option>${c}</option>`).join("")}</select></div></div>
    <div class="field"><label for="nc5">What did the customer say?</label><textarea class="in" id="nc5"></textarea></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-savecase="1">Save</button></div>`);
}
async function saveCase() {
  const who = $("#nc1").value.trim(), itemId = $("#nc2").value || null, kind = $("#nc3").value, channel = $("#nc4").value, body = $("#nc5").value.trim();
  const it = itemId ? itemById(itemId) : null;
  let cu = it ? custOf(it) : null;
  if (!cu && who) { const ph = (who.split("·")[1] || "").trim(); cu = S.cust.find(c => (ph && c.phone === ph) || c.name === who.split("·")[0].trim()); }
  if (!cu && who) { try { const r = await DB.insert("customers", { client_id: CLIENT.id, name: who.split("·")[0].trim(), phone: (who.split("·")[1] || "").trim() }); cu = r[0]; S.cust.push(cu); } catch (e) { return toast(errMsg(e)); } }
  try {
    const reply_by = kind === "Complaint" ? new Date(Date.now() + SLA().firstReply * 60000).toISOString() : null;
    const r = await DB.insert("cases", { client_id: CLIENT.id, item_id: itemId, customer_id: cu?.id || null, subject: body.slice(0, 80), channel, kind, assignee: lvl() <= 1 ? ME.id : null, reply_by });
    const c = r[0]; S.cases.unshift(c);
    if (body) { const m = await DB.insert("case_messages", { client_id: CLIENT.id, case_id: c.id, dir: "in", body, author_email: ME.email }); S.msgs.push(m[0]); }
    await logAct(`${kind} logged from ${cu?.name || "a customer"} (${channel})`, "case");
    ui.convo = c.id; ui.cfilter = "open"; closeModal(); closeDrawer(); go("inbox");
  } catch (e) { toast(errMsg(e)); }
}
async function addMsg(caseId, dir, body) {
  const c = S.cases.find(x => x.id === caseId);
  const m = await DB.insert("case_messages", { client_id: CLIENT.id, case_id: caseId, dir, body, author_email: ME.email });
  S.msgs.push(m[0]);
  const patch = { updated_at: new Date().toISOString() };
  if (dir === "out") { patch.reply_by = null; if (!c.assignee) patch.assignee = ME.id; }
  putRow(S.cases, await DB.update("cases", caseId, patch));
}

/* ---------- CUSTOMERS ---------- */
VIEWS.customers = function () {
  const count = new Map(), last = new Map(), spend = new Map();
  ITEMS.forEach(i => { if (!i.customer_id) return; count.set(i.customer_id, (count.get(i.customer_id) || 0) + 1); last.set(i.customer_id, Math.max(last.get(i.customer_id) || 0, i.created)); spend.set(i.customer_id, (spend.get(i.customer_id) || 0) + (+i.data?.value || 0)); });
  let list = S.cust.slice();
  if (ui.ctag !== "All") list = list.filter(c => c.tags.includes(ui.ctag));
  if (ui.cq) { const q = ui.cq.toLowerCase(); list = list.filter(c => (c.name + " " + c.phone + " " + (c.area || "")).toLowerCase().includes(q)); }
  list.sort((a, b) => (count.get(b.id) || 0) - (count.get(a.id) || 0) || a.name.localeCompare(b.name));
  const tags = ["All", ...new Set(["VIP", "Repeat", ...S.cust.flatMap(c => c.tags)])];
  return `${head("Customers", `${S.cust.length} customers. New ones are added automatically from phone numbers on your work.`, `${can(4) ? `<button class="btn" type="button" data-nav="data">${ic("up")}Import</button>` : ""}${can(2) ? `<button class="btn" type="button" data-export="customers">${ic("down")}Export</button>` : ""}`)}
  <section class="card"><div class="card-h"><input class="in grow" id="cq" type="search" placeholder="Search name, phone or area" value="${esc(ui.cq)}" style="max-width:320px"><div class="chips">${tags.map(t => `<button class="chip" type="button" data-ctag="${esc(t)}" aria-pressed="${ui.ctag === t}">${esc(t)}</button>`).join("")}</div></div>
  <div class="tw"><table class="t"><thead><tr><th>Customer</th><th>Phone</th><th>Area</th><th class="r">Records (30 days)</th>${BOARDS.some(b => b.hasValue) ? `<th class="r">Spend (30 days)</th>` : ""}<th>Last</th><th>Tags</th></tr></thead>
  <tbody>${list.slice(0, 500).map(c => `<tr class="click" data-cu="${c.id}"><td><div class="who">${av(c.name)}<div><b>${esc(c.name)}</b><span>since ${dShort(c.created_at)}</span></div></div></td><td class="num">${esc(c.phone)}</td><td>${esc(c.area || "")}</td><td class="r num">${count.get(c.id) || 0}</td>${BOARDS.some(b => b.hasValue) ? `<td class="r num">${can(4) ? fmtN(spend.get(c.id) || 0) + " JOD" : ic("lock")}</td>` : ""}<td>${last.get(c.id) ? dShort(last.get(c.id) * 60000) : "—"}</td><td><div class="flags">${c.tags.map(t => pill(t, t === "VIP" ? "cta" : "")).join("")}</div></td></tr>`).join("") || `<tr><td colspan="7">${empty("No customers yet.")}</td></tr>`}</tbody></table></div></section>`;
};
function custDrawer(id) {
  const c = S.cust.find(x => x.id === id); if (!c) return closeDrawer();
  DRAWER = { type: "cust", id };
  const its = ITEMS.filter(i => i.customer_id === c.id).sort((a, b) => b.created - a.created), cs = S.cases.filter(x => x.customer_id === c.id);
  openDrawer(`${dHead(esc(c.name), c.tags.map(t => pill(t, t === "VIP" ? "cta" : "")).join("") || `<span class="small muted">No tags</span>`)}
  <div class="d-b">
    <div class="row">${c.phone ? `<a class="btn wa" href="https://wa.me/${waNum(c.phone)}" target="_blank" rel="noopener">${ic("wa")}WhatsApp</a><a class="btn" href="tel:${esc(c.phone.replace(/\s/g, ""))}">${ic("phone")}Call</a>` : ""}<button class="btn" type="button" data-newcase="">${ic("plus")}Log a conversation</button></div>
    <section class="kpis">${kpi("Records", its.length, "last 30 days")}${kpi("Conversations", cs.length, "all time")}${BOARDS.some(b => b.hasValue) && can(4) ? kpi("Spend", fmtN(its.reduce((s, i) => s + (+i.data?.value || 0), 0)) + " JOD", "last 30 days") : ""}</section>
    <div class="blk"><h4>Details</h4><div class="f2"><div class="field"><label for="cuName">Name</label><input class="in" id="cuName" value="${esc(c.name)}"></div><div class="field"><label for="cuPhone">Phone</label><input class="in" id="cuPhone" value="${esc(c.phone)}"></div></div>
      <div class="f2"><div class="field"><label for="cuArea">Area</label><input class="in" id="cuArea" value="${esc(c.area || "")}"></div><div class="field"><label for="cuLang">Messages in</label><select class="sel" id="cuLang"><option value="">English</option><option value="ar" ${c.lang === "ar" ? "selected" : ""}>Arabic</option></select></div></div>
      <div class="field"><label for="cuTags">Tags (comma separated)</label><input class="in" id="cuTags" value="${esc(c.tags.join(", "))}" placeholder="VIP, Repeat"></div>
      <div class="field"><label for="cuNotes">Notes</label><textarea class="in" id="cuNotes">${esc(c.notes || "")}</textarea></div>
      <div class="row"><button class="btn primary" type="button" data-savecust="${c.id}">Save</button></div></div>
    <div class="blk"><h4>Work for this customer</h4>${its.length ? `<div class="tw"><table class="t"><tbody>${its.map(i => `<tr class="click" data-oo="${i.id}"><td class="num"><b>${esc(i.ext_id)}</b></td><td>${boardTag(i)}${defOf(i).x(i)}</td><td>${dShort(i.created * 60000)}</td><td>${statusPill(i)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small muted">None in the last 30 days.</p>`}</div>
    <div class="blk"><h4>Conversations</h4>${cs.map(x => `<button class="btn sm" type="button" data-cv="${x.id}" style="justify-content:flex-start"><span class="ch ${chCode(x.channel)}">${chCode(x.channel)}</span>${esc(x.kind)} · ${x.status} · ${dShort(x.created_at)}</button>`).join(" ") || `<p class="small muted">None yet.</p>`}</div>
  </div>`);
}
