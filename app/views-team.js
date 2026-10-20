/* Team: members, live board, shifts, targets; Quality (QA). */
VIEWS.team = function () {
  const tabs = [["members", "Members"], ["live", "Live board"], ["shifts", "Shifts"], ["targets", "Targets"]];
  const t = ui.teamTab;
  let body = "";
  if (t === "members") {
    const mgr = can(4);
    body = `<div class="tw"><table class="t"><thead><tr><th>Person</th><th>Role</th><th>Status</th><th class="r">Today</th>${mgr ? "<th></th>" : ""}</tr></thead><tbody>
      ${S.team.slice().sort((a, b) => ROLES[b.role].lvl - ROLES[a.role].lvl).map(m => {
        const n = memberName(m.auth_user_id), on = ONLINE.has(m.auth_user_id);
        const today = m.role === "driver" ? ITEMS.filter(i => (i.owner_user === m.auth_user_id || i.owner === n) && i.created >= todayStart()).length + " stops" : ITEMS.filter(i => i.assigned_to === m.auth_user_id && i.created >= todayStart()).length + " handled";
        const editable = mgr && m.role !== "owner" && m.auth_user_id !== ME.id && !(lvl() < 5 && m.role === "manager");
        return `<tr><td><div class="who">${av(n)}<div><b>${esc(n)}</b><span>${esc(m.email)}</span></div></div></td>
          <td>${editable ? `<select class="sel" data-chrole="${esc(m.email)}" aria-label="Role for ${esc(n)}" style="height:30px">${ROLE_ORDER.filter(r => r !== "owner" && (lvl() >= 5 || r !== "manager")).map(r => `<option value="${r}" ${m.role === r ? "selected" : ""}>${ROLES[r].label}</option>`).join("")}</select>` : pill(ROLES[m.role].label, m.role === "owner" ? "cta" : m.role === "manager" ? "acc" : "")}</td>
          <td><span class="row" style="gap:6px"><span class="dot-s ${on ? "online" : ""}"></span>${on ? "Online" : "Offline"}</span></td><td class="r num">${today}</td>
          ${mgr ? `<td>${editable ? `<button class="btn sm ghost danger" type="button" data-rmuser="${m.auth_user_id}" data-nm="${esc(n)}">Remove</button>` : ""}</td>` : ""}</tr>`;
      }).join("")}${mgr ? S.invites.filter(i => !i.accepted_at).map(i => `<tr><td><div class="who">${av(i.email)}<div><b>${esc(i.email)}</b><span>Invited ${ago(i.created_at)} · hasn't signed up yet</span></div></div></td><td>${pill(ROLES[i.role]?.label || i.role)}</td><td>${pill("Invited", "warn")}</td><td class="r"><button class="btn sm" type="button" data-copy="${esc(location.origin + location.pathname + "?signup&email=" + encodeURIComponent(i.email))}">Copy sign-up link</button></td><td><button class="btn sm ghost danger" type="button" data-delinv="${i.id}">Cancel</button></td></tr>`).join("") : ""}</tbody></table></div>
      <div class="card-b small muted" style="border-top:1px solid var(--line)">Invite anyone by email, even before they have an account. Send them their sign-up link; they join your company as soon as they create their account. Field staff and drivers get the simple "My stops" screen.</div>`;
  } else if (t === "live") {
    const office = S.team.filter(m => m.role !== "driver"), field = fieldPeople();
    body = `<div class="card-b stack"><div><span class="lbl">Office team</span><div class="board" style="margin-top:8px">${office.map(m => { const n = memberName(m.auth_user_id), on = ONLINE.has(m.auth_user_id); return `<div class="card mem"><div class="row">${av(n)}<b class="grow">${esc(n)}</b><span class="dot-s ${on ? "online" : ""}"></span></div><span class="small muted">${esc(ROLES[m.role].label)} · ${on ? "online now" : "offline"}</span><div class="row small"><span class="grow">Open conversations</span><b class="num">${S.cases.filter(c => c.assignee === m.auth_user_id && c.status === "open").length}</b></div><div class="row small"><span class="grow">Handled today</span><b class="num">${ITEMS.filter(i => i.assigned_to === m.auth_user_id && i.created >= todayStart()).length}</b></div></div>`; }).join("") || empty("No office team yet.")}</div></div>
      <div><span class="lbl">Field team</span><div class="board" style="margin-top:8px">${field.map(p => { const cur = ITEMS.filter(i => !isTerm(i) && i.owner === p.name); const on = p.auth_user_id && ONLINE.has(p.auth_user_id); return `<div class="card mem"><div class="row">${av(p.name)}<b class="grow">${esc(p.name)}</b><span class="dot-s ${cur.length ? "busy" : on ? "online" : ""}"></span></div><span class="small ${cur.length ? "" : "muted"}">${cur.length ? `${cur.length} open · next ${esc(cur.sort((a, b) => a.due - b.due)[0].ext_id)}${cur[0].area ? " → " + esc(cur[0].area) : ""}` : "Free"}</span><div class="row small"><span class="grow">Done today</span><b class="num">${ITEMS.filter(i => i.owner === p.name && i.status === defOf(i).done && i.created >= todayStart()).length}</b></div></div>`; }).join("") || empty(`No field staff yet. Add them in People & access with department "Field".`)}</div></div></div>`;
  } else if (t === "shifts") {
    const codes = SHIFT_CODES(), canEdit = can(3);
    const ws = weekStart(); ws.setDate(ws.getDate() + ui.week * 7);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); return d; });
    const ppl = S.people.filter(p => p.active).sort((a, b) => a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
    body = `<div class="card-b row"><button class="btn sm" type="button" data-week="-1">‹ Previous</button><b>Week of ${dShort(days[0])}</b><button class="btn sm" type="button" data-week="1">Next ›</button><span class="spacer"></span><span class="small muted">${canEdit ? "Pick a shift from the list in each cell." : "Team leads and above can edit shifts."}</span></div>
      ${ppl.length ? `<div class="tw"><table class="t"><thead><tr><th>Person</th>${days.map(d => `<th>${d.toLocaleDateString("en-GB", { weekday: "short" })} ${d.getDate()}</th>`).join("")}</tr></thead><tbody>${ppl.map(p => `<tr><td><b>${esc(p.name)}</b><div class="small muted">${esc(p.dept)}</div></td>${days.map(d => { const sh = S.shifts.find(s => s.person_id === p.id && s.day === isoDay(d)); const idx = sh ? codes.indexOf(sh.shift) : -1; const cls = `shift ${sh ? "s" + Math.min(3, Math.max(0, idx)) : "none"}`; return `<td>${canEdit ? `<select class="${cls}" data-shiftsel="${p.id}|${isoDay(d)}" aria-label="Shift for ${esc(p.name)} on ${dShort(d)}"><option value="">—</option>${codes.map(c => `<option ${sh && sh.shift === c ? "selected" : ""}>${esc(c)}</option>`).join("")}${sh && !codes.includes(sh.shift) ? `<option selected>${esc(sh.shift)}</option>` : ""}</select>` : `<span class="${cls}">${sh ? esc(sh.shift) : "—"}</span>`}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>` : `<div class="card-b">${empty("Add people in People & access to build the rota.")}</div>`}
      <div class="card-b small muted">Shift options: ${codes.map(esc).join(" · ")}${can(4) ? ` · <button class="linkbtn" type="button" data-modal="shiftcodes">Edit options</button>` : ""}</div>`;
  } else {
    const T = TARGETS(), t0 = todayStart(), today = ITEMS.filter(i => i.created >= t0), st = dayStats(today);
    const agents = S.team.filter(m => m.role === "agent");
    const perAgent = agents.length ? Math.round(today.filter(i => i.assigned_to).length / agents.length) : 0;
    const replied = S.cases.filter(c => c.kind === "Complaint" && new Date(c.created_at) >= startOfDay());
    const qaAvg = S.qa.length ? Math.round(S.qa.reduce((s, r) => s + r.scores.reduce((a, b) => a + b, 0) / (r.scores.length * 5) * 100, 0) / S.qa.length) : 0;
    const rows = [["ontime", "On time", "Whole team", st.ontime ?? 0, T.ontime, "%"], ["perAgent", "Handled per agent",  "Agents", perAgent, T.perAgent, ""], ["complaints", "Complaints answered in time", "Agents", replied.length ? Math.round(replied.filter(c => !c.reply_by).length / replied.length * 100) : 100, T.complaints, "%"], ["qa", "QA score", "Agents", qaAvg, T.qa, "%"]];
    body = `<div class="tw"><table class="t"><thead><tr><th>Target</th><th>Applies to</th><th class="r">Goal</th><th style="min-width:200px">Today</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${r[1]}</b></td><td>${r[2]}</td><td class="r">${can(4) ? `<input class="in num" style="width:80px;height:30px" type="number" min="0" data-target="${r[0]}" value="${r[4]}">` : `<span class="num">${r[4]}${r[5]}</span>`}</td><td><div style="display:grid;gap:5px"><span class="small num">${r[3]}${r[5]}</span>${prog(r[3], r[4])}</div></td></tr>`).join("")}</tbody></table></div>${can(4) ? `<div class="card-b row"><span class="spacer"></span><button class="btn primary" type="button" data-savetargets="1">Save targets</button></div>` : ""}`;
  }
  return `${head("Team & shifts", `${S.team.length} people with a login · ${S.people.filter(p => p.active).length} in your people list`, can(4) ? `<button class="btn go" type="button" data-modal="invite">${ic("plus")}Invite</button>` : "")}
  <section class="card"><div class="card-h"><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab" role="tab" type="button" data-tt="${k}" aria-selected="${t === k}">${l}</button>`).join("")}</div></div>${body}</section>`;
};
function inviteModal() {
  openModal(`${mHead("Invite a team member")}<div class="m-b form">
    <div class="field"><label for="ie">Their email</label><input class="in" id="ie" type="email" placeholder="name@company.com"></div>
    <div class="field"><label for="ir">Role</label><select class="sel" id="ir">${ROLE_ORDER.filter(r => r !== "owner" && (lvl() >= 5 || r !== "manager")).map(r => `<option value="${r}" ${r === "agent" ? "selected" : ""}>${ROLES[r].label}</option>`).join("")}</select></div>
    <div class="note-box">${ic("info")}<span>If they don't have an account yet, they join your company as soon as they sign up with this email. After inviting, copy their sign-up link from the Members list and send it to them.</span></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-doinvite="1">Invite</button></div>`);
}
function shiftCodesModal() {
  openModal(`${mHead("Shift options")}<div class="m-b"><div class="field"><label for="scx">One per line, up to 6. The last one is usually "Off".</label><textarea class="in" id="scx" rows="6">${esc(SHIFT_CODES().join("\n"))}</textarea></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn primary" type="button" data-saveshiftcodes="1">Save</button></div>`);
}

/* ---------- QUALITY ---------- */
const QA_CRIT = () => cfg("qa_criteria", ["Greeting", "Accuracy", "Empathy", "Resolution", "Policy"]);
const qaPct = r => Math.round(r.scores.reduce((a, b) => a + b, 0) / (r.scores.length * 5) * 100);
// Agents and field staff only ever see reviews about themselves; supervisors and above see the whole team.
const myPerson = () => S.people.find(p => p.auth_user_id === ME.id);
const myQA = () => { const p = myPerson(), n = memberName(ME.id); return S.qa.filter(r => (p && r.person_id === p.id) || (n && r.agent_name === n)); };
const visibleQA = () => lvl() < 2 ? myQA() : S.qa;
VIEWS.quality = function () {
  const crit = QA_CRIT(), mine = lvl() < 2, QA = visibleQA();
  const byAgent = new Map(); QA.forEach(r => { if (!byAgent.has(r.agent_name)) byAgent.set(r.agent_name, []); byAgent.get(r.agent_name).push(r); });
  const week = QA.filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 864e5)).length;
  const avgAll = QA.length ? Math.round(QA.reduce((s, r) => s + qaPct(r), 0) / QA.length) : null;
  return `${head(mine ? "My quality reviews" : "Quality (QA)", mine ? "Reviews of your chats and calls, with notes from your team lead." : "Score real chats and calls against your checklist, then coach on what you find.", can(2) ? `<button class="btn go" type="button" data-modal="qa">${ic("plus")}New review</button>` : "")}
  <section class="kpis">${kpi(mine ? "My score" : "Team score", avgAll == null ? "—" : avgAll + "%", `target ${TARGETS().qa}%`, avgAll == null ? "" : avgAll >= TARGETS().qa ? "good" : "warn")}${kpi("Reviews this week", week, "")}${mine ? "" : kpi("Below target", [...byAgent.values()].filter(rs => rs.reduce((s, r) => s + qaPct(r), 0) / rs.length < TARGETS().qa).length, "people to coach")}${kpi("Checklist", crit.length + " items", can(4) ? "edit in Settings" : "")}</section>
  ${mine && QA.length ? `<section class="card"><div class="card-h"><h3>My scorecard</h3><span class="sub">your average on each item, out of 5</span></div><div class="card-b" style="display:grid;gap:12px">${crit.map((c, i) => tRow(c, Math.round(QA.reduce((s, r) => s + (+r.scores[i] || 0), 0) / QA.length * 10) / 10, 5)).join("")}</div></section>` : ""}
  ${!mine && byAgent.size ? `<section class="card"><div class="card-h"><h3>Scorecards</h3><span class="sub">average per item, out of 5</span></div><div class="tw"><table class="t"><thead><tr><th>Person</th><th class="r">Reviews</th>${crit.map(c => `<th class="r">${esc(c)}</th>`).join("")}<th class="r">Overall</th></tr></thead><tbody>${[...byAgent.entries()].map(([n, rs]) => `<tr><td><div class="who">${av(n)}<b>${esc(n)}</b></div></td><td class="r num">${rs.length}</td>${crit.map((_, i) => `<td class="r num">${(rs.reduce((s, r) => s + (r.scores[i] || 0), 0) / rs.length).toFixed(1)}</td>`).join("")}<td class="r"><span class="score ${scoreCls(Math.round(rs.reduce((s, r) => s + qaPct(r), 0) / rs.length))}">${Math.round(rs.reduce((s, r) => s + qaPct(r), 0) / rs.length)}%</span></td></tr>`).join("")}</tbody></table></div></section>` : ""}
  <section class="card"><div class="card-h"><h3>${mine ? "Your reviews" : "Recent reviews"}</h3></div><ul class="feed">${QA.map(r => `<li style="grid-template-columns:minmax(0,1fr) auto"><span><b>${esc(r.agent_name)}</b> <small>· ${esc(r.channel || "")}${r.ref ? " · " + esc(r.ref) : ""} · by ${esc(nameOf(r.reviewer_email || ""))} · ${dShort(r.created_at)}</small><br>${esc(r.note || "No note.")}</span><span class="score ${scoreCls(qaPct(r))}">${qaPct(r)}%</span></li>`).join("") || `<li><time></time><span class="muted">No reviews yet.</span></li>`}</ul></section>`;
};
function qaModal() {
  const crit = QA_CRIT();
  const ppl = [...new Set([...S.team.filter(m => m.role === "agent" || m.role === "team_lead" || m.role === "supervisor").map(m => memberName(m.auth_user_id)), ...S.people.filter(p => p.dept === "Customer care" && p.active).map(p => p.name)])];
  openModal(`${mHead("New QA review")}<div class="m-b form">
    <div class="f2"><div class="field"><label for="qa1">Person</label><select class="sel" id="qa1">${ppl.map(n => `<option>${esc(n)}</option>`).join("")}</select></div>
    <div class="field"><label for="qa2">What you reviewed</label><select class="sel" id="qa2"><option value="">Something else</option>${S.cases.slice(0, 80).map(c => `<option value="${c.id}">${esc(c.channel)} · ${esc(S.cust.find(x => x.id === c.customer_id)?.name || c.subject)} · ${esc(c.kind)}</option>`).join("")}</select></div></div>
    ${crit.map((c, i) => `<div class="optrow"><div><b>${esc(c)}</b></div><select class="sel" id="qc${i}" aria-label="${esc(c)} score">${[5, 4, 3, 2, 1].map(n => `<option>${n}</option>`).join("")}</select></div>`).join("")}
    <div class="field"><label for="qa3">Coaching note</label><textarea class="in" id="qa3" placeholder="What went well, what to change"></textarea></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn primary" type="button" data-saveqa="1">Save review</button></div>`);
}
