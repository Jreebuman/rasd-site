/* Reports, all computed live from the company's own data. */
const REPORTS = [["mine", "My performance", 1, 1], ["ops", "Daily operations", 3], ["sla", "On-time & SLA", 3], ["team", "Team performance", 2], ["cust", "Customers & complaints", 3], ["areas", "Areas", 3], ["money", "Revenue", 4], ["company", "Company & access", 4]];
let REPORT_ROWS = []; // rows behind the current report, for CSV export
function seriesFor(days) {
  const out = [];
  for (let k = days - 1; k >= 0; k--) {
    const d0 = startOfDay(); d0.setDate(d0.getDate() - k); const a = mins(d0.getTime()), b = a + 1440;
    const list = ITEMS.filter(i => i.created >= a && i.created < b), st = dayStats(list);
    const cases = S.cases.filter(c => { const t = new Date(c.created_at).getTime(); return t >= d0.getTime() && t < d0.getTime() + 864e5; });
    out.push({ d: d0, label: dShort(d0), ...st, complaints: cases.filter(c => c.kind === "Complaint").length, cases: cases.length });
  }
  return out;
}
function reportsInner() {
  const isMine = r => r[0] === "mine";
  const avail = REPORTS.filter(r => lvl() >= r[2] && !(isMine(r) && lvl() >= 2) && !(r[0] === "money" && !WDEF.hasValue) && !(r[0] === "areas" && !WDEF.hasArea));
  if (!ui.report || !avail.find(r => r[0] === ui.report)) ui.report = avail[0][0];
  const S7 = seriesFor(Math.max(7, ui.range)), Sr = seriesFor(ui.range), from = mins(startOfDay().getTime()) - (ui.range - 1) * 1440;
  const inRange = ITEMS.filter(i => i.created >= from), stR = dayStats(inRange);
  let body = ""; REPORT_ROWS = [];
  switch (ui.report) {
    case "mine": {
      const mine = inRange.filter(i => i.assigned_to === ME.id), st = dayStats(mine), myC = S.cases.filter(c => c.assignee === ME.id);
      body = `<section class="kpis">${kpi(`${WDEF.items} handled`, mine.length, `last ${ui.range} days`)}${kpi("On time", st.ontime == null ? "—" : st.ontime + "%", `target ${TARGETS().ontime}%`)}${kpi("Conversations", myC.length, "assigned to you")}${kpi("QA score", myQA().length ? Math.round(myQA().reduce((s, r) => s + qaPct(r), 0) / myQA().length) + "%" : "—", "from your reviews")}</section>
      ${card(`My ${WDEF.items.toLowerCase()} per day`, barChart(Sr.map(d => ITEMS.filter(i => i.assigned_to === ME.id && i.created >= mins(d.d.getTime()) && i.created < mins(d.d.getTime()) + 1440).length), Sr.map(d => d.label), { hi: Sr.length - 1 }))}`;
      REPORT_ROWS = mine.map(i => ({ ref: i.ext_id, customer: i.name, status: stageName(i.status, i), created: new Date(i.created * 60000).toISOString() }));
      break;
    }
    case "ops":
      body = `<section class="kpis">${kpi(WDEF.items, fmtN(stR.n), `last ${ui.range} days`)}${kpi("Per day", Math.round(stR.n / ui.range), "average")}${kpi("On time", stR.ontime == null ? "—" : stR.ontime + "%", `target ${TARGETS().ontime}%`)}${kpi("Avg time", stR.avg == null ? "—" : dur(stR.avg), "created to done")}</section>
      <div class="grid2e">${card(`${WDEF.items} per day`, barChart(Sr.map(d => d.n), Sr.map(d => d.label), { hi: Sr.length - 1 }) + `<p class="small muted">Today is in orange and counts ${WDEF.items.toLowerCase()} so far.</p>`)}${card("Average time", lineChart(S7.map(d => d.avg), S7.map(d => d.label), { label: "Average time" }), false, `<span class="sub">minutes</span>`)}</div>
      ${card("Day by day", `<div class="tw"><table class="t"><thead><tr><th>Day</th><th class="r">${WDEF.items}</th><th class="r">Completed</th><th class="r">On time</th><th class="r">Avg time</th><th class="r">Complaints</th></tr></thead><tbody>${Sr.slice().reverse().map(d => `<tr><td>${d.d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</td><td class="r num">${d.n}</td><td class="r num">${d.done}</td><td class="r num">${d.ontime == null ? "—" : d.ontime + "%"}</td><td class="r num">${d.avg == null ? "—" : d.avg + " min"}</td><td class="r num">${d.complaints}</td></tr>`).join("")}</tbody></table></div>`, true)}`;
      REPORT_ROWS = Sr.map(d => ({ day: isoDay(d.d), [WDEF.items.toLowerCase()]: d.n, completed: d.done, on_time_pct: d.ontime ?? "", avg_minutes: d.avg ?? "", complaints: d.complaints }));
      break;
    case "sla": {
      const done = inRange.filter(i => i.status === WDEF.done && doneAt(i) != null), late = done.filter(i => doneAt(i) > i.due);
      const reasons = {}; inRange.forEach(i => (i.hist || []).forEach(h => { const m = /^Late reason: (.+)$/.exec(h.text); if (m) reasons[m[1]] = (reasons[m[1]] || 0) + 1; }));
      const comp = S.cases.filter(c => c.kind === "Complaint" && new Date(c.created_at).getTime() >= from * 60000);
      const firstOut = c => { const m = S.msgs.find(x => x.case_id === c.id && x.dir === "out"); return m ? (new Date(m.created_at) - new Date(c.created_at)) / 60000 : null; };
      const answered = comp.filter(c => firstOut(c) != null), inTime = answered.filter(c => firstOut(c) <= SLA().firstReply);
      body = `<section class="kpis">${kpi("On time", stR.ontime == null ? "—" : stR.ontime + "%", `${done.length - late.length} of ${done.length} completed`, stR.ontime == null ? "" : stR.ontime >= TARGETS().ontime ? "good" : "warn")}${kpi("Late", late.length, `avg ${late.length ? Math.round(late.reduce((s, i) => s + doneAt(i) - i.due, 0) / late.length) : 0} min over`, late.length ? "warn" : "good")}${kpi("Complaints answered in time", answered.length ? Math.round(inTime.length / answered.length * 100) + "%" : "—", `within ${SLA().firstReply} min`)}</section>
      <div class="grid2e">${card("On-time rate", lineChart(S7.map(d => d.ontime), S7.map(d => d.label), { min: 50, max: 100, target: TARGETS().ontime, unit: "%" }))}${card("Why things ran late", Object.keys(reasons).length ? hbars(Object.entries(reasons).sort((a, b) => b[1] - a[1])) : `<p class="muted small">When something runs late, add a note starting with "Late reason:" (for example "Late reason: Store not ready"). The reasons add up here.</p>`)}</div>`;
      REPORT_ROWS = late.map(i => ({ ref: i.ext_id, customer: i.name, due: new Date(i.due * 60000).toISOString(), done: new Date(doneAt(i) * 60000).toISOString(), minutes_late: Math.round(doneAt(i) - i.due), owner: i.owner || "" }));
      break;
    }
    case "team": {
      const office = S.team.filter(m => m.role !== "driver").map(m => { const its = inRange.filter(i => i.assigned_to === m.auth_user_id), st = dayStats(its), n = memberName(m.auth_user_id), rs = S.qa.filter(r => r.agent_name === n); return { n, role: ROLES[m.role].label, items: its.length, ontime: st.ontime, cases: S.cases.filter(c => c.assignee === m.auth_user_id && new Date(c.created_at).getTime() >= from * 60000).length, qa: rs.length ? Math.round(rs.reduce((s, r) => s + qaPct(r), 0) / rs.length) : null }; });
      const field = fieldPeople().map(p => { const its = inRange.filter(i => i.owner === p.name), st = dayStats(its); return { n: p.name, items: its.length, done: st.done, ontime: st.ontime, avg: st.avg, failed: its.filter(i => WDEF.alt.some(a => a[0] === i.status)).length }; });
      body = `${card("Office team", `<div class="tw"><table class="t"><thead><tr><th>Person</th><th>Role</th><th class="r">${WDEF.items}</th><th class="r">On time</th><th class="r">Conversations</th><th class="r">QA</th></tr></thead><tbody>${office.map(o => `<tr><td><div class="who">${av(o.n)}<b>${esc(o.n)}</b></div></td><td>${esc(o.role)}</td><td class="r num">${o.items}</td><td class="r num">${o.ontime == null ? "—" : o.ontime + "%"}</td><td class="r num">${o.cases}</td><td class="r">${o.qa == null ? "—" : `<span class="score ${scoreCls(o.qa)}">${o.qa}%</span>`}</td></tr>`).join("") || `<tr><td colspan="6">${empty("No office team yet.")}</td></tr>`}</tbody></table></div>`, true)}
      ${card(`${WDEF.ownerLabel}s`, `<div class="tw"><table class="t"><thead><tr><th>Name</th><th class="r">Assigned</th><th class="r">Completed</th><th class="r">On time</th><th class="r">Avg time</th><th class="r">${esc(WDEF.alt[0]?.[1] || "Failed")}</th></tr></thead><tbody>${field.map(o => `<tr><td><div class="who">${av(o.n)}<b>${esc(o.n)}</b></div></td><td class="r num">${o.items}</td><td class="r num">${o.done}</td><td class="r num">${o.ontime == null ? "—" : o.ontime + "%"}</td><td class="r num">${o.avg == null ? "—" : o.avg + " min"}</td><td class="r num">${o.failed}</td></tr>`).join("") || `<tr><td colspan="6">${empty("No " + WDEF.fieldWord + " yet.")}</td></tr>`}</tbody></table></div>`, true)}`;
      REPORT_ROWS = [...office.map(o => ({ name: o.n, group: "office", role: o.role, items: o.items, on_time_pct: o.ontime ?? "", conversations: o.cases, qa_pct: o.qa ?? "" })), ...field.map(o => ({ name: o.n, group: "field", role: WDEF.ownerLabel, items: o.items, on_time_pct: o.ontime ?? "", conversations: "", qa_pct: "" }))];
      break;
    }
    case "cust": {
      const cases = S.cases.filter(c => new Date(c.created_at).getTime() >= from * 60000), kinds = {}; cases.forEach(c => kinds[c.kind] = (kinds[c.kind] || 0) + 1);
      const custIds = new Set(inRange.map(i => i.customer_id).filter(Boolean)), cnt = {}; inRange.forEach(i => { if (i.customer_id) cnt[i.customer_id] = (cnt[i.customer_id] || 0) + 1; });
      const repeat = Object.values(cnt).filter(n => n > 1).length;
      const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => [S.cust.find(c => c.id === id)?.name || "—", n]);
      body = `<section class="kpis">${kpi("Active customers", custIds.size, `in ${ui.range} days`)}${kpi("Came back", custIds.size ? Math.round(repeat / custIds.size * 100) + "%" : "—", "more than once")}${kpi("Complaints", kinds.Complaint || 0, `in ${ui.range} days`, (kinds.Complaint || 0) ? "warn" : "good")}${kpi("Conversations", cases.length, "all types")}</section>
      <div class="grid2e">${card("Conversations by type", hbars(Object.entries(kinds).sort((a, b) => b[1] - a[1])))}${card("Complaints per day", barChart(Sr.map(d => d.complaints), Sr.map(d => d.label)))}</div>${card("Most frequent customers", hbars(top))}`;
      REPORT_ROWS = top.map(([n, c]) => ({ customer: n, [WDEF.items.toLowerCase()]: c }));
      break;
    }
    case "areas": {
      const ar = [...new Set(inRange.map(i => i.area || "No area"))].map(a => { const its = inRange.filter(i => (i.area || "No area") === a), st = dayStats(its); return [a, its.length, st.ontime, st.avg]; }).sort((a, b) => b[1] - a[1]);
      body = `<div class="grid2e">${card(`${WDEF.items} by area`, hbars(ar.map(r => [r[0], r[1]])))}${card("Area performance", `<div class="tw"><table class="t"><thead><tr><th>Area</th><th class="r">${WDEF.items}</th><th class="r">On time</th><th class="r">Avg time</th></tr></thead><tbody>${ar.map(r => `<tr><td><b>${esc(r[0])}</b></td><td class="r num">${r[1]}</td><td class="r">${r[2] == null ? "—" : `<span class="score ${scoreCls(r[2])}">${r[2]}%</span>`}</td><td class="r num">${r[3] == null ? "—" : r[3] + " min"}</td></tr>`).join("")}</tbody></table></div>`, true)}</div>`;
      REPORT_ROWS = ar.map(r => ({ area: r[0], [WDEF.items.toLowerCase()]: r[1], on_time_pct: r[2] ?? "", avg_minutes: r[3] ?? "" }));
      break;
    }
    case "money": {
      const done = inRange.filter(i => i.status === WDEF.done), rev = done.reduce((s, i) => s + (+i.data?.value || 0), 0);
      const gf = WDEF.fields.find(f => f[0] !== "value"), byStore = {}; done.forEach(i => { const k = (gf && i.data?.[gf[0]]) || "Other"; byStore[k] = (byStore[k] || 0) + (+i.data?.value || 0); });
      body = `<section class="kpis">${kpi("Revenue", fmtN(Math.round(rev)) + " JOD", `last ${ui.range} days`)}${kpi("Average value", done.length ? fmtN(Math.round(rev / done.length * 10) / 10) + " JOD" : "—", `per completed ${WDEF.item.toLowerCase()}`)}${kpi("Completed", done.length, "")}</section>
      <div class="grid2e">${card("Revenue per day", barChart(Sr.map(d => Math.round(d.value)), Sr.map(d => d.label), { hi: Sr.length - 1 }), false, `<span class="sub">JOD</span>`)}${card(`Revenue by ${esc((gf ? gf[1] : "type").toLowerCase())}`, hbars(Object.entries(byStore).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1]), " JOD"))}</div>`;
      REPORT_ROWS = Sr.map(d => ({ day: isoDay(d.d), revenue_jod: Math.round(d.value), completed: d.done }));
      break;
    }
    case "company": {
      const ppl = S.people.filter(p => p.active), depts = [...new Set(ppl.map(p => p.dept))].map(d => [d, ppl.filter(p => p.dept === d).length]).sort((a, b) => b[1] - a[1]);
      const spend = S.plats.reduce((s, p) => s + (+p.cost || 0), 0), iss = accessIssues();
      const exp = S.docs.filter(d => { const n = daysUntil(d.expires_on); return n != null && n <= 60; }), ren = S.plats.filter(p => { const n = daysUntil(p.renews_on); return n != null && n <= 60; });
      const cov = ROLE_ORDER.map(r => { const ss = S.sops.filter(s => s.roles.includes(r)), people = S.team.filter(m => m.role === r); const need = ss.length * people.length, got = ss.reduce((a, s) => a + people.filter(m => S.reads.some(x => x.sop_id === s.id && x.auth_user_id === m.auth_user_id)).length, 0); return [ROLES[r].label, ss.length, need ? Math.round(got / need * 100) : null, ss.filter(sopOverdue).length]; });
      body = `<section class="kpis">${kpi("Employees", ppl.length, ppl.filter(p => p.emp_type === "Contractor").length + " contractors")}${kpi("Software spend", fmtN(spend) + " JOD", "per month")}${kpi("Renewals", ren.length, "next 60 days", ren.length ? "warn" : "")}${kpi("Files expiring", exp.length, "next 60 days or expired", exp.some(d => daysUntil(d.expires_on) < 0) ? "crit" : exp.length ? "warn" : "good")}${kpi("Access issues", iss.length, "to review", iss.length ? "warn" : "good")}</section>
      <div class="grid2e">${card("Headcount by department", hbars(depts))}${card("Software spend by platform", hbars(S.plats.filter(p => +p.cost).map(p => [p.name, +p.cost]).sort((a, b) => b[1] - a[1]), " JOD"))}</div>
      <div class="grid2e">${card("SOP coverage by role", `<div class="tw"><table class="t"><thead><tr><th>Role</th><th class="r">SOPs</th><th class="r">Read</th><th class="r">Due review</th></tr></thead><tbody>${cov.map(c => `<tr><td><b>${c[0]}</b></td><td class="r num">${c[1]}</td><td class="r">${c[2] == null ? "—" : `<span class="score ${scoreCls(c[2])}">${c[2]}%</span>`}</td><td class="r num">${c[3]}</td></tr>`).join("")}</tbody></table></div>`, true)}
        ${card("Renewals and expiries", `<div class="tw"><table class="t"><thead><tr><th>What</th><th>Type</th><th>Date</th></tr></thead><tbody>${[...exp.map(d => [d.name, "File", pill(...docState(d))]), ...ren.map(p => [p.name, "Subscription", pill(dShort(p.renews_on), "warn")])].map(r => `<tr><td><b>${esc(r[0])}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("") || `<tr><td colspan="3">${empty("Nothing due in the next 60 days.")}</td></tr>`}</tbody></table></div>`, true)}</div>`;
      REPORT_ROWS = ppl.map(p => ({ name: p.name, department: p.dept, job: p.job, type: p.emp_type, contract_ends: p.ends_on || "", systems: p.tools.join("; ") }));
      break;
    }
  }
  const title = (REPORTS.find(r => r[0] === ui.report) || [])[1];
  return `${head("Reports", "Live from your own data. Export any report as a spreadsheet.", REPORT_ROWS.length ? `<button class="btn" type="button" data-export="report">${ic("down")}Export ${esc(title)}</button>` : "")}
  <div class="setgrid"><nav class="setnav" aria-label="Reports">${REPORTS.filter(r => !(isMine(r) && lvl() >= 2) && !(r[0] === "money" && !WDEF.hasValue) && !(r[0] === "areas" && !WDEF.hasArea)).map(([k, l, min]) => `<button type="button" ${lvl() >= min ? `data-rep="${k}"` : `data-toast="${esc(l)} is for ${NEED[min]}."`} aria-current="${ui.report === k}">${esc(l)}${lvl() >= min ? "" : ic("lock")}</button>`).join("")}</nav>
  <div class="stack"><div class="row"><span class="lbl">Period</span><div class="chips">${[[1, "Today"], [7, "7 days"], [14, "14 days"], [30, "30 days"]].map(([d, l]) => `<button class="chip" type="button" data-range="${d}" aria-pressed="${ui.range === d}">${l}</button>`).join("")}</div></div>${body}</div></div>`;
};
// Reports run on one board at a time; the other pages of the report (team, customers, company) use that board's numbers.
VIEWS.reports = function () {
  const bs = liveBoards();
  if (!ui.rboard || !bs.some(b => b.id === ui.rboard)) ui.rboard = bs.some(b => b.id === ui.board) ? ui.board : bs[0].id;
  const all = ITEMS, keep = WDEF;
  ITEMS = all.filter(i => i.board === ui.rboard); WDEF = BDEF(ui.rboard);
  try {
    const html = reportsInner();
    return bs.length > 1 ? html.replace('<div class="setgrid">', `<div class="chips rboards"><span class="lbl">Board</span>${bs.map(b => `<button class="chip" type="button" data-rboard="${b.id}" aria-pressed="${b.id === ui.rboard}">${esc(b.items)}</button>`).join("")}</div><div class="setgrid">`) : html;
  } finally { ITEMS = all; WDEF = keep; }
};
