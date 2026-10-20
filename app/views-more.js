/* Approvals (leave, expenses, purchases, access) and the Calendar across every board. */
const AP_KINDS = { leave: ["Leave", "cal"], expense: ["Expense claim", "box"], purchase: ["Purchase request", "box"], access: ["System access", "key"], other: ["Other request", "info"] };
const AP_ST = { pending: ["Waiting", "warn"], approved: ["Approved", "good"], rejected: ["Rejected", "crit"], cancelled: ["Cancelled", ""] };
const apLimit = () => +cfg("approval_limit", 100);
const apDays = a => a.start_date ? Math.round((new Date(a.end_date || a.start_date) - new Date(a.start_date)) / 864e5) + 1 : 0;
const apTitle = a => [AP_KINDS[a.kind]?.[0] || a.kind, a.kind === "leave" && a.start_date ? `${dShort(a.start_date)}${a.end_date && a.end_date !== a.start_date ? "–" + dShort(a.end_date) : ""} (${apDays(a)} day${apDays(a) > 1 ? "s" : ""})` : "", a.amount ? fmtN(a.amount) + " JOD" : "", a.title || ""].filter(Boolean).join(" · ");
// Team leads approve leave, access and amounts up to the limit; managers and owners approve everything. Nobody approves their own.
const canDecide = a => a.status === "pending" && a.requester !== ME.id && (lvl() >= 4 || (lvl() >= 3 && !(["expense", "purchase"].includes(a.kind) && +a.amount > apLimit())));
VIEWS.approvals = function () {
  const lead = can(3);
  const tabs = [...(lead ? [["todo", "Waiting for me", S.approvals.filter(canDecide).length]] : []), ["mine", "My requests", S.approvals.filter(a => a.requester === ME.id && a.status === "pending").length], ...(lead ? [["all", "All", null]] : [])];
  if (!tabs.some(t => t[0] === ui.apf)) ui.apf = tabs[0][0];
  const list = S.approvals.filter(a => ui.apf === "todo" ? canDecide(a) : ui.apf === "mine" ? a.requester === ME.id : true).sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || cmp(b.created_at, a.created_at));
  const onLeave = S.approvals.filter(a => a.kind === "leave" && a.status === "approved" && a.start_date <= isoDay(new Date()) && (a.end_date || a.start_date) >= isoDay(new Date()));
  return `${head("Approvals", lead ? `Leave, expenses, purchases and access requests. Team leads approve up to ${apLimit()} JOD; managers approve anything above.` : "Ask for leave, claim an expense or request a purchase. Your team lead or manager approves it here.", `<button class="btn go" type="button" data-modal="approval">${ic("plus")}New request</button>`)}
  ${lead ? `<section class="kpis">${kpi("Waiting for you", S.approvals.filter(canDecide).length, "to decide", S.approvals.filter(canDecide).length ? "warn" : "good")}${kpi("On leave today", onLeave.length, onLeave.map(a => (a.requester_name || "").split(" ")[0]).join(", ") || "nobody")}${kpi("Approved this month", S.approvals.filter(a => a.status === "approved" && (a.decided_at || "") >= isoDay(new Date()).slice(0, 8) + "01").length, "")}${kpi("Expenses approved", fmtN(S.approvals.filter(a => a.status === "approved" && a.kind === "expense" && (a.decided_at || "") >= isoDay(new Date()).slice(0, 8) + "01").reduce((s, a) => s + (+a.amount || 0), 0)) + " JOD", "this month")}</section>` : ""}
  <div class="tabs">${tabs.map(([k, l, c]) => `<button class="tab" type="button" data-apf="${k}" aria-selected="${ui.apf === k}">${l}${c ? ` <span class="ct">${c}</span>` : ""}</button>`).join("")}</div>
  <section class="card"><div class="tw"><table class="t"><thead><tr><th>Request</th><th>From</th><th>Details</th><th>Sent</th><th>Status</th><th></th></tr></thead><tbody>${list.map(a => `<tr><td><div class="who">${ic(AP_KINDS[a.kind]?.[1] || "info")}<b>${esc(apTitle(a))}</b></div></td><td>${esc(a.requester_name || "")}</td><td class="wrap small">${esc(a.details || "")}${a.decision_note ? `<div class="muted">${esc(a.decided_by_name || "")}: ${esc(a.decision_note)}</div>` : ""}</td><td class="small">${ago(a.created_at)}</td><td>${pill(...(AP_ST[a.status] || [a.status, ""]))}</td>
    <td class="r">${canDecide(a) ? `<div class="row" style="flex-wrap:nowrap;justify-content:flex-end"><button class="btn sm" type="button" data-apdo="rejected" data-id="${a.id}">Reject</button><button class="btn sm go" type="button" data-apdo="approved" data-id="${a.id}">Approve</button></div>` : a.requester === ME.id && a.status === "pending" ? `<button class="btn sm ghost" type="button" data-apdo="cancelled" data-id="${a.id}">Cancel</button>` : ["expense", "purchase"].includes(a.kind) && a.status === "pending" && lvl() === 3 && +a.amount > apLimit() ? `<span class="small muted">Needs a manager</span>` : ""}</td></tr>`).join("") || `<tr><td colspan="6">${empty(ui.apf === "todo" ? "Nothing waiting for you." : "No requests yet.")}</td></tr>`}</tbody></table></div></section>`;
};
function approvalModal(kind = "leave") {
  const today = isoDay(new Date());
  openModal(`${mHead("New request")}<div class="m-b form">
    <div class="chips">${Object.entries(AP_KINDS).map(([k, [l]]) => `<button class="chip" type="button" data-apk="${k}" aria-pressed="${k === kind}">${l}</button>`).join("")}</div>
    ${kind === "leave" ? `<div class="f3"><div class="field"><label for="ap1">Type</label><select class="sel" id="ap1">${["Annual leave", "Sick leave", "Unpaid leave", "Half day"].map(x => `<option>${x}</option>`).join("")}</select></div><div class="field"><label for="ap2">From</label><input class="in" id="ap2" type="date" value="${today}"></div><div class="field"><label for="ap3">To</label><input class="in" id="ap3" type="date" value="${today}"></div></div>`
      : kind === "access" ? `<div class="field"><label for="ap1">Which system?</label><input class="in" id="ap1" list="sysList" placeholder="e.g. Odoo, Google Drive"><datalist id="sysList">${allToolNames().map(n => `<option value="${esc(n)}">`).join("")}</datalist></div>`
      : `<div class="f2"><div class="field"><label for="ap1">What for?</label><input class="in" id="ap1" placeholder="${kind === "expense" ? "e.g. Fuel for deliveries" : kind === "purchase" ? "e.g. 2 laptops for new agents" : "Short title"}"></div>${kind === "other" ? "" : `<div class="field"><label for="ap4">Amount (JOD)</label><input class="in num" id="ap4" type="number" min="0" step="0.5"></div>`}</div>`}
    <div class="field"><label for="ap5">Details</label><textarea class="in" id="ap5" placeholder="Anything the approver should know"></textarea></div>
    ${["expense", "purchase"].includes(kind) ? `<p class="small muted">Up to ${apLimit()} JOD a team lead can approve; above that it goes to a manager.</p>` : ""}</div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-apsave="${kind}">Send request</button></div>`);
}

/* ---------- CALENDAR ---------- */
VIEWS.calendar = function () {
  const ws = weekStart(); ws.setDate(ws.getDate() + ui.calWeek * 7);
  const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(ws); d.setDate(d.getDate() + k); return d; });
  const bs = liveBoards(), today = isoDay(new Date());
  const items = ITEMS.filter(i => (ui.calBoard === "all" || i.board === ui.calBoard) && (lvl() > 1 || i.assigned_to === ME.id || !i.assigned_to || i.owner_user === ME.id));
  const leave = S.approvals.filter(a => a.kind === "leave" && a.status === "approved");
  const span = `${dShort(days[0])} – ${dShort(days[6])}`;
  return `${head("Calendar", "Everything with a date across your boards, plus who's on leave.", `<div class="row"><button class="btn" type="button" data-calw="-1" aria-label="Previous week">‹</button><button class="btn" type="button" data-calw="0">This week</button><button class="btn" type="button" data-calw="1" aria-label="Next week">›</button></div>`)}
  <div class="row"><b>${span}</b><span class="spacer"></span>${bs.length > 1 ? `<div class="chips"><button class="chip" type="button" data-calb="all" aria-pressed="${ui.calBoard === "all"}">All boards</button>${bs.map(b => `<button class="chip" type="button" data-calb="${b.id}" aria-pressed="${ui.calBoard === b.id}">${esc(b.items)}</button>`).join("")}</div>` : ""}</div>
  <div class="cal">${days.map(d => { const k = isoDay(d), its = items.filter(i => isoDay(i.due * 60000) === k).sort((a, b) => a.due - b.due), lv = leave.filter(a => a.start_date <= k && (a.end_date || a.start_date) >= k);
    return `<div class="cday${k === today ? " today" : ""}"><div class="cday-h"><b>${d.toLocaleDateString("en-GB", { weekday: "short" })}</b><span class="num">${d.getDate()}</span>${its.length ? `<span class="small muted">${its.length}</span>` : ""}</div>
      ${lv.map(a => `<div class="cev leave">${ic("cal")}${esc((a.requester_name || "").split(" ")[0])} on leave</div>`).join("")}
      ${its.slice(0, 14).map(i => `<button class="cev${isTerm(i) ? " done" : attention(i) ? " flag" : ""}" type="button" data-oo="${i.id}"><span class="num">${defOf(i).long ? "" : hm(i.due)}</span> ${esc(i.ext_id)} · ${esc(i.name)}</button>`).join("")}${its.length > 14 ? `<span class="small muted">+${its.length - 14} more</span>` : ""}</div>`; }).join("")}</div>`;
};
