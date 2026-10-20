/* All clicks and form inputs. Each action writes to the database first, then updates the screen. */
function reopenDrawer() { if (!DRAWER) return; const d = DRAWER; if (d.type === "item") itemDrawer(d.id); else if (d.type === "cust") custDrawer(d.id); else if (d.type === "sop") sopDrawer(d.id); else if (d.type === "pvc") clientDrawer(d.id); }

/* Every table can be sorted by clicking a column header, and long tables show 50 rows at a time. */
function enhanceTables() {
  $$("#content table.t").forEach((tb, ti) => {
    const body = tb.tBodies[0]; if (!body || !tb.tHead) return;
    const rows = [...body.rows]; if (rows.length < 2) return;
    const key = view + ":" + ti, s = ui.sort && ui.sort.key === key ? ui.sort : null;
    [...tb.tHead.rows[0].cells].forEach((th, ci) => {
      if (!th.textContent.trim() || th.querySelector("input")) return;
      th.classList.add("sortable"); th.tabIndex = 0;
      if (s && s.col === ci) th.setAttribute("aria-sort", s.dir > 0 ? "ascending" : "descending");
      th.onclick = () => { ui.sort = { key, col: ci, dir: s && s.col === ci ? -s.dir : 1 }; render(); };
      th.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); th.onclick(); } };
    });
    if (s) {
      const v = r => { const t = (r.cells[s.col]?.textContent || "").trim(); const n = parseFloat(t.replace(/[^\d.-]/g, "")); return /^[-+−\d.,%\s$]*(JOD|min|h)?[\s\d/.,%]*$/i.test(t) && !isNaN(n) ? n : t.toLowerCase(); };
      rows.sort((a, b) => { const x = v(a), y = v(b); return (typeof x === typeof y ? (x > y ? 1 : x < y ? -1 : 0) : typeof x === "number" ? -1 : 1) * s.dir; }).forEach(r => body.appendChild(r));
    }
    const per = 50, shown = ui.page[key] || per;
    if (rows.length > shown + 10) {
      [...body.rows].forEach((r, i) => { r.hidden = i >= shown; });
      (tb.closest(".tw") || tb).insertAdjacentHTML("afterend", `<div class="more"><span>Showing ${shown} of ${rows.length}</span><button class="btn sm" type="button" data-more="${key}">Show ${Math.min(per, rows.length - shown)} more</button><button class="btn sm" type="button" data-more="${key}" data-all="${rows.length}">Show all</button></div>`);
    }
  });
}
const val = s => ($(s) ? $(s).value.trim() : "");
async function act(fn) { try { await fn(); } catch (e) { console.error(e); toast(errMsg(e)); } }

function bindView() {
  const refocus = (sel, key) => { const el = $(sel); if (el) el.oninput = e => { ui[key] = e.target.value; const pos = e.target.selectionStart; render(); const n = $(sel); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (err) {} } }; };
  refocus("#oq", "q"); refocus("#cq", "cq"); refocus("#sopq", "sopq"); refocus("#accq", "accq"); refocus("#emq", "emq");
  enhanceTables();
  const on = (sel, fn) => { const el = $(sel); if (el) el.onchange = fn; };
  on("#fArea", e => { ui.area = e.target.value; render(); });
  on("#deptSel", e => { ui.dept = e.target.value; render(); });
  on("#auditUser", e => { ui.auditUser = e.target.value; render(); });
  on("#bulkStage", e => act(async () => { const st = e.target.value; if (!st) return; const ids = [...ui.sel]; for (const id of ids) { const it = itemById(id); if (it && it.status !== st) await setStage(it, st); } ui.sel.clear(); toast(`${ids.length} updated to ${stageName(st)}.`); render(); }));
  on("#cvAssign", e => act(async () => { const c = S.cases.find(x => x.id === ui.convo); putRow(S.cases, await DB.update("cases", c.id, { assignee: e.target.value || null, updated_at: new Date().toISOString() })); await addMsg(c.id, "sys", e.target.value ? `Assigned to ${memberName(e.target.value)} by ${nameOf(ME.email)}` : `Unassigned by ${nameOf(ME.email)}`); render(); }));
  on("#impFile", e => { const f = e.target.files[0]; if (f) readImportFile(f); });
  const dr = $("#drop"); if (dr) { dr.ondragover = e => { e.preventDefault(); dr.classList.add("over"); }; dr.ondragleave = () => dr.classList.remove("over"); dr.ondrop = e => { e.preventDefault(); dr.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) readImportFile(f); }; }
  $$("[data-map]").forEach(s => s.onchange = e => { ui.imp.map[+e.target.dataset.map] = e.target.value; render(); });
  $$("[data-chrole]").forEach(s => s.onchange = e => act(async () => { await DB.rpc("client_invite_user", { p_client_id: CLIENT.id, p_email: e.target.dataset.chrole, p_role: e.target.value }); await logAct(`Changed ${e.target.dataset.chrole} to ${ROLES[e.target.value].label}`, "team"); S.team = await DB.rpc("client_team", { p_client_id: CLIENT.id }); toast("Role changed. It applies the next time they load the app."); render(); }));
  $$("[data-tkstatus]").forEach(s => s.onchange = e => act(async () => { await DB.update("tickets", e.target.dataset.tkstatus, { status: e.target.value }); toast("Ticket updated."); }));
  const msgs = $("#msgs"); if (msgs) msgs.scrollTop = msgs.scrollHeight;
}
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "dAgent" && t.value) act(async () => { const it = itemById(t.dataset.item); await patchItem(it, { assigned_to: t.value }, `Handled by ${memberName(t.value)}`); await logAct(`${it.ext_id} given to ${memberName(t.value)}`, "item"); toast("Updated."); render(); itemDrawer(it.id); });
  if (t.id === "dStage" && t.value) act(async () => { const it = itemById(t.dataset.item); await setStage(it, t.value); toast(`${it.ext_id}: ${stageName(t.value)}`); render(); itemDrawer(it.id); });
  /* email */
  if (t.id === "emBox") { ui.emBox = t.value; return render(); }
  if (t.id === "emCust" || t.id === "emAsg" || t.id === "emItem") act(async () => {
    const e = S.emails.find(x => x.id === t.dataset.id); let patch;
    if (t.id === "emCust") patch = { customer_id: t.value || null };
    if (t.id === "emAsg") patch = { assignee: t.value || null };
    if (t.id === "emItem") { const ref = t.value.trim().toUpperCase(); const it = ref ? ITEMS.find(i => i.ext_id.toUpperCase() === ref) : null; if (ref && !it) return toast(`No ${WDEF.item.toLowerCase()} ${ref} found.`); patch = { item_id: it ? it.id : null, ...(it && !e.customer_id && it.customer_id ? { customer_id: it.customer_id } : {}) }; }
    putRow(S.emails, await DB.update("emails", e.id, patch)); await logAct(`Email "${e.subject.slice(0, 50)}" ${t.id === "emAsg" ? (t.value ? "given to " + memberName(t.value) : "unassigned") : "linked"}`, "email"); toast("Saved."); render();
  });
});
document.addEventListener("input", e => {
  if (!e.target.matches("[data-q]")) return;
  if ($("#qOut")) { ui.qo = readQuote("qq"); $("#qOut").innerHTML = quoteBox(quote(ui.qo)); }
  if ($("#ncQuote")) $("#ncQuote").innerHTML = quoteBox(quote(readQuote("nq")));
});

document.addEventListener("click", e => {
  const t = e.target;
  if (t.matches("[data-sel]")) { t.checked ? ui.sel.add(t.dataset.sel) : ui.sel.delete(t.dataset.sel); return render(); }
  if (t.matches("[data-selall]")) { $$("[data-sel]").forEach(x => t.checked ? ui.sel.add(x.dataset.sel) : ui.sel.delete(x.dataset.sel)); return render(); }
  const b = t.closest("button, a, tr[data-oo], tr[data-cu], tr[data-modal], tr[data-pvc]");
  if (!$("#pop").hidden && !t.closest("#pop") && !(b && b.dataset.act === "notif")) $("#pop").hidden = true;
  if (!b) return;
  const d = b.dataset;
  if (b.tagName === "A") { if (b.id === "waGo") $("#modal [data-logsent]")?.classList.add("go"); return; }
  /* assistant */
  if (d.act === "ask") return toggleAI();
  if (d.aiclose) return toggleAI(false);
  if (d.ainew) { AI.msgs = []; AI.turns = []; return renderAI(); }
  if (d.aiq) return askAI(d.aiq);
  /* provider */
  if (d.pvc) { closeModal(); return clientDrawer(d.pvc); }
  if (d.pvf) { ui.pvf = d.pvf; return render(); }
  if (d.copyquote) return copyText(quoteText(quote(ui.qo)));
  if (d.more) { ui.page[d.more] = d.all ? +d.all : (ui.page[d.more] || 50) + 50; return render(); }
  /* email */
  if (d.em) { ui.emSel = d.em; const e = S.emails.find(x => x.id === d.em); if (e && ui.emf !== "all" && e.status !== ui.emf && ui.emf !== "mine") ui.emf = e.status; closeDrawer(); return view === "email" ? render() : go("email"); }
  if (d.emf) { ui.emf = d.emf; return render(); }
  if (d.mbox) return mailboxModal();
  if (b.tagName === "INPUT" || b.tagName === "SELECT") return;

  /* login */
  if (d.lmode) return showLogin(d.lmode);
  /* shell */
  if (d.nav) { if (d.saved) { ui.saved = d.saved; ui.orderTab = "active"; } if (d.tt) ui.teamTab = d.tt; if (d.rp) ui.report = d.rp; closeModal(); return go(d.nav); }
  if (d.toast) return toast(d.toast);
  switch (d.act) {
    case "close": return closeDrawer();
    case "mclose": return closeModal();
    case "menu": return $("#shell").classList.toggle("nav-open");
    case "theme": return toggleTheme();
    case "notif": return showNotifs();
    case "signout": return signOut();
    case "switchco": return switchCompany();
  }
  if (d.copy) return copyText(d.copy);

  /* open things */
  if (d.oo) return itemDrawer(d.oo);
  if (d.cu) return custDrawer(d.cu);
  if (d.sop) return sopDrawer(d.sop);
  if (d.cv) { ui.convo = d.cv; const c = S.cases.find(x => x.id === d.cv); if (c && ui.cfilter !== "mine") ui.cfilter = c.status === "resolved" ? "resolved" : c.status; closeDrawer(); return view === "inbox" ? render() : go("inbox"); }

  /* lists and filters */
  if (d.otab) { ui.orderTab = d.otab; ui.sel.clear(); return render(); }
  if (d.savedt) { ui.saved = ui.saved === d.savedt ? null : d.savedt; return render(); }
  if (d.mine) { ui.mine = !ui.mine; return render(); }
  if (d.clearsel) { ui.sel.clear(); return render(); }
  if (d.cf) { ui.cfilter = d.cf; ui.convo = null; return render(); }
  if (d.ctag) { ui.ctag = d.ctag; return render(); }
  if (d.tt) { ui.teamTab = d.tt; return render(); }
  if (d.week) { ui.week += +d.week; return act(async () => { S.shifts = await DB.list("shifts", { eq: { client_id: CLIENT.id } }); render(); }); }
  if (d.rep) { ui.report = d.rep; return render(); }
  if (d.range) { ui.range = +d.range; return render(); }
  if (d.icat) { ui.intCat = d.icat; return render(); }
  if (d.st) { ui.setTab = d.st; return render(); }
  if (d.scat) { ui.sopCat = d.scat; return render(); }
  if (d.smine) { ui.sopMine = !ui.sopMine; return render(); }
  if (d.export) return exportData(d.export);
  if (d.doexport) return exportData(val("#exDs"), val("#exFmt"));
  if (d.backup) return backupAll();
  if (d.pin) { const p = pinned(); setPinned(p.includes(d.pin) ? p.filter(x => x !== d.pin) : [...p, d.pin]); return render(); }

  /* dialogs */
  if (d.modal) {
    switch (d.modal) {
      case "newitem": return newItemModal();
      case "invite": return inviteModal();
      case "shiftcodes": return shiftCodesModal();
      case "qa": return qaModal();
      case "profile": return profileModal();
      case "doc": return docModal();
      case "ticket": return ticketModal(d.subject || "");
      case "link": return linkModal(d.kind || "tool", d.lid);
      case "plat": return platModal(d.pid);
      case "person": return personModal(d.pid);
      case "sop": closeDrawer(); return sopModal(d.sid);
      case "rule": return ruleModal();
      case "tpl": return tplModal(d.tid);
      case "newclient": return newClientModal(!!d.fromquote);
    }
  }
  if (d.msg !== undefined) return msgModal(d.msg, d.tpl);
  if (d.call) return callModal(d.call);
  if (d.assign) return assignModal(d.assign);
  if (d.newcase !== undefined) return newCaseModal(d.newcase || null);
  if (d.problem) return openModal(`${mHead("What's the problem?")}<div class="m-b"><div class="stack" style="gap:8px">${["Customer not answering", "Wrong address", "Not ready for pickup", "Vehicle problem", "Customer refused"].map(p => `<button class="btn" style="justify-content:flex-start" type="button" data-prob="${d.problem}" data-why="${esc(p)}">${esc(p)}</button>`).join("")}</div><p class="small muted">Your supervisor sees this straight away.</p></div>`);
  if (d.mfa) return mfaModal();

  /* actions */
  return act(() => action(b, d));
});

async function action(b, d) {
  /* items */
  if (d.adv) { const it = itemById(d.adv); await setStage(it, d.to); toast(`${it.ext_id}: ${stageName(d.to)}`); render(); if (DRAWER) itemDrawer(it.id); return; }
  if (d.take) { const it = itemById(d.take); await patchItem(it, { assigned_to: ME.id }, `Taken by ${nameOf(ME.email)}`); toast("It's yours."); render(); return itemDrawer(it.id); }
  if (d.onote) { const v = val("#oNote"); if (!v) return toast("Write the note first."); const it = itemById(d.onote); await patchItem(it, {}, v); render(); return itemDrawer(it.id); }
  if (d.delitem) { const it = itemById(d.delitem); if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Press again to delete"; return; } await DB.remove("items", it.id); S.items = S.items.filter(x => x.id !== it.id); await logAct(`${it.ext_id} deleted`, "item"); closeDrawer(); toast("Deleted."); return render(); }
  if (d.saveitem) return saveNewItem();
  if (d.doassign) {
    const name = d.doassign === "__typed" ? val("#asName") : d.doassign; if (!name) return toast("Pick or type a name.");
    const ids = d.ids.split(",").filter(Boolean);
    for (const id of ids) { const it = itemById(id); if (!it || isTerm(it)) continue; const patch = { owner: name, owner_user: d.uid || null }; const second = WDEF.stages[1][0]; if (it.status === WDEF.stages[0][0] && second) { patch.status = second; patch.data = { ...it.data, t: { ...(it.data.t || {}), [second]: Date.now() } }; } await patchItem(it, patch, `Assigned to ${name}`); }
    await logAct(`${ids.length} ${ids.length > 1 ? WDEF.items.toLowerCase() : WDEF.item.toLowerCase()} assigned to ${name}`, "item");
    ui.sel.clear(); closeModal(); toast(`Assigned to ${name}.`); render(); if (DRAWER) itemDrawer(DRAWER.id); return;
  }
  if (d.copymsg) return copyText(val("#mText"));
  if (d.logsent) { const it = itemById(d.logsent); const text = val("#mText"); await patchItem(it, {}, "WhatsApp sent: " + text.slice(0, 120)); const c = S.cases.find(x => x.item_id === it.id && x.status !== "resolved"); if (c) await addMsg(c.id, "out", text); await logAct(`WhatsApp sent to ${it.name} (${it.ext_id})`, "message"); closeModal(); toast("Logged."); render(); if (DRAWER) itemDrawer(it.id); return; }
  if (d.outcome) { const it = itemById(d.item); await patchItem(it, {}, "Call: " + d.outcome); await logAct(`Called ${it.name} (${it.ext_id}): ${d.outcome}`, "call"); closeModal(); toast("Call logged."); render(); if (DRAWER) itemDrawer(it.id); return; }
  if (d.prob) { const it = itemById(d.prob); await patchItem(it, {}, `Problem reported: ${d.why}`); await logAct(`${it.ext_id}: ${nameOf(ME.email)} reported "${d.why}"`, "problem"); closeModal(); toast("Reported. Your supervisor has it."); return render(); }

  /* inbox */
  if (d.savecase) return saveCase();
  if (d.cvtake) { putRow(S.cases, await DB.update("cases", d.cvtake, { assignee: ME.id, updated_at: new Date().toISOString() })); await addMsg(d.cvtake, "sys", `${nameOf(ME.email)} took this`); return render(); }
  if (d.cvstatus) { const c = S.cases.find(x => x.id === ui.convo); putRow(S.cases, await DB.update("cases", c.id, { status: d.cvstatus, updated_at: new Date().toISOString(), ...(d.cvstatus === "resolved" ? { reply_by: null } : {}) })); await addMsg(c.id, "sys", `${{ open: "Reopened", pending: "Waiting on the customer", resolved: "Resolved" }[d.cvstatus]} by ${nameOf(ME.email)}`); await logAct(`Conversation ${d.cvstatus === "resolved" ? "resolved" : d.cvstatus === "open" ? "reopened" : "set to waiting"}`, "case"); return render(); }
  if (d.rtpl) { const c = S.cases.find(x => x.id === ui.convo), it = itemById(c.item_id), tp = S.tpls.find(x => x.key === d.rtpl); const cu = S.cust.find(x => x.id === c.customer_id); $("#replyBox").value = it ? fill(cu?.lang === "ar" ? tp.ar : tp.en, it) : (cu?.lang === "ar" ? tp.ar : tp.en).replace("{first}", (cu?.name || "").split(" ")[0]); $("#replyDir").value = "out"; return; }
  if (d.send || d.sendwa) {
    const id = d.send || d.sendwa, v = val("#replyBox"), dir = d.sendwa ? "out" : val("#replyDir"); if (!v) return toast("Write something first.");
    const c = S.cases.find(x => x.id === id);
    if (d.sendwa) { const cu = S.cust.find(x => x.id === c.customer_id), it = itemById(c.item_id); window.open(`https://wa.me/${waNum(cu?.phone || it?.phone)}?text=${encodeURIComponent(v)}`, "_blank", "noopener"); }
    await addMsg(id, dir, v); await logAct(dir === "note" ? "Internal note added to a conversation" : dir === "in" ? "Customer message logged" : `Replied to ${S.cust.find(x => x.id === c.customer_id)?.name || "a customer"}`, "case");
    toast(dir === "note" ? "Note saved. Only your team sees it." : dir === "in" ? "Logged." : d.sendwa ? "Opened in WhatsApp and saved here." : "Saved."); return render();
  }
  if (d.savecust) { const tags = val("#cuTags").split(",").map(s => s.trim()).filter(Boolean); putRow(S.cust, await DB.update("customers", d.savecust, { name: val("#cuName"), phone: val("#cuPhone"), area: val("#cuArea") || null, lang: val("#cuLang") || null, tags, notes: val("#cuNotes") })); toast("Customer saved."); render(); return custDrawer(d.savecust); }

  /* team */
  if (d.doinvite) { const email = val("#ie"); if (!email) return toast("Add their email first."); const st = await DB.rpc("invite_by_email", { p_client_id: CLIENT.id, p_email: email, p_role: val("#ir") }); await logAct(`Invited ${email} as ${ROLES[val("#ir")].label}`, "team"); S.team = await DB.rpc("client_team", { p_client_id: CLIENT.id }); if (can(4)) S.invites = await DB.list("pending_invites", { eq: { client_id: CLIENT.id }, order: ["created_at", false] }); await seedStarter(); closeModal(); toast(st === "pending" ? `Invite saved. Send ${email} the sign-up link; they join your company as soon as they create their account.` : `${email} added. They'll see your company next time they sign in.`); return render(); }
  if (d.delinv) { await DB.remove("pending_invites", d.delinv); S.invites = S.invites.filter(i => i.id !== d.delinv); toast("Invite cancelled."); return render(); }

  /* email */
  if (d.emst) { const e = S.emails.find(x => x.id === d.id); putRow(S.emails, await DB.update("emails", e.id, { status: d.emst })); await logAct(`Email "${e.subject.slice(0, 50)}" marked ${EM_ST[d.emst][0].toLowerCase()}`, "email"); return render(); }
  if (d.em2case) { const e = S.emails.find(x => x.id === d.em2case); const c = (await DB.insert("cases", { client_id: CLIENT.id, customer_id: e.customer_id, item_id: e.item_id, subject: e.subject.slice(0, 120) || "Email", channel: "Email", kind: "Question", status: "open", assignee: e.assignee || ME.id }))[0]; S.cases.unshift(c); await addMsg(c.id, "in", `${e.from_name || e.from_addr}: ${e.body_text.slice(0, 3000)}`); putRow(S.emails, await DB.update("emails", e.id, { status: "done" })); await logAct(`Email turned into a conversation: ${e.subject.slice(0, 50)}`, "case"); ui.convo = c.id; ui.cfilter = "open"; toast("Conversation created in the Inbox."); return go("inbox"); }
  if (d.savemb) { const address = val("#mb1"); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) return toast("Enter the mailbox's email address."); const row = (await DB.insert("mailboxes", { client_id: CLIENT.id, address: address.toLowerCase(), label: val("#mb2"), min_lvl: +val("#mb3") }))[0]; if (DEMO) row.inbound_token = row.inbound_token || uid().replace(/-/g, "") + uid().replace(/-/g, ""); S.mbFull.push(row); S.mailboxes = await DB.rpc("mailbox_list", { p_client_id: CLIENT.id }); await logAct(`Mailbox added: ${address}`, "settings"); toast("Mailbox added. Copy its forwarding address."); render(); return mailboxModal(); }
  if (d.delmb) { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.innerHTML = "Sure?"; return; } await DB.remove("mailboxes", d.delmb); S.mbFull = S.mbFull.filter(m => m.id !== d.delmb); S.mailboxes = S.mailboxes.filter(m => m.id !== d.delmb); S.emails = S.emails.filter(e => e.mailbox_id !== d.delmb); render(); return mailboxModal(); }
  if (d.rmuser) { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Press again to remove"; return; } await DB.rpc("client_remove_user", { p_client_id: CLIENT.id, p_user_id: d.rmuser }); await logAct(`Removed ${d.nm}'s login`, "team"); S.team = S.team.filter(m => m.auth_user_id !== d.rmuser); toast(`${d.nm} can no longer sign in to your company.`); return render(); }
  if (d.shift) { const [pid, day] = d.shift.split("|"), codes = SHIFT_CODES(), cur = S.shifts.find(s => s.person_id === pid && s.day === day); const next = cur ? codes[(codes.indexOf(cur.shift) + 1) % (codes.length + 1)] : codes[0];
    if (!next) { await DB.remove("shifts", cur.id); S.shifts = S.shifts.filter(s => s.id !== cur.id); } else if (cur) putRow(S.shifts, await DB.update("shifts", cur.id, { shift: next })); else S.shifts.push(...await DB.insert("shifts", { client_id: CLIENT.id, person_id: pid, day, shift: next }));
    return render(); }
  if (d.saveshiftcodes) { const codes = val("#scx").split("\n").map(s => s.trim()).filter(Boolean).slice(0, 6); if (!codes.length) return toast("Add at least one shift."); await saveConfig({ shift_codes: codes }); closeModal(); toast("Saved."); return render(); }
  if (d.savetargets) { const t = { ...TARGETS() }; $$("[data-target]").forEach(i => { if (+i.value > 0) t[i.dataset.target] = +i.value; }); await saveConfig({ targets: t }); await logAct("Targets updated", "settings"); toast("Targets saved."); return render(); }
  if (d.saveqa) { const crit = QA_CRIT(), n = val("#qa1"); const c = S.cases.find(x => x.id === val("#qa2")); const p = S.people.find(x => x.name === n) || S.people.find(x => x.auth_user_id && memberName(x.auth_user_id) === n);
    const r = await DB.insert("qa_reviews", { client_id: CLIENT.id, agent_name: n, person_id: p?.id || null, ref: c ? (S.cust.find(x => x.id === c.customer_id)?.name || c.subject) : "", channel: c ? c.channel : "", scores: crit.map((_, i) => +val("#qc" + i)), note: val("#qa3"), reviewer_email: ME.email });
    S.qa.unshift(r[0]); await logAct(`QA review for ${n}: ${qaPct(r[0])}%`, "qa"); closeModal(); toast("Review saved. They can see it in their Quality page."); return render(); }

  /* company */
  if (d.saveprofile) { const row = { client_id: CLIENT.id, legal_name: val("#pf1"), trade_name: val("#pf2"), reg_no: val("#pf3"), tax_id: val("#pf4"), address: val("#pf5"), founded: val("#pf6"), wa_sender: val("#pf7"), updated_at: new Date().toISOString() }; S.profile = (await DB.upsert("company_profile", row, "client_id"))[0] || row; await logAct("Company details updated", "settings"); closeModal(); toast("Saved."); return render(); }
  if (d.savedoc) { const name = val("#dc1"); if (!name) return toast("Give the file a name."); const f = $("#dc4").files[0]; let path = null;
    if (f && !DEMO) { if (f.size > 10 * 1024 * 1024) return toast("Files must be under 10 MB."); path = `${CLIENT.id}/${uid()}-${f.name.replace(/[^\w.-]+/g, "_")}`; const { error } = await sb.storage.from("docs").upload(path, f); if (error) throw error; }
    S.docs.push(...await DB.insert("documents", { client_id: CLIENT.id, name, kind: val("#dc2"), expires_on: val("#dc3") || null, storage_path: path })); await logAct(`File added: ${name}`, "company"); closeModal(); toast("Saved."); return render(); }
  if (d.docget) { const doc = S.docs.find(x => x.id === d.docget); if (DEMO) return toast("Downloads work on real accounts."); const { data, error } = await sb.storage.from("docs").createSignedUrl(doc.storage_path, 120); if (error) throw error; window.open(data.signedUrl, "_blank", "noopener"); return; }
  if (d.docdel) { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.innerHTML = "Sure?"; return; } const doc = S.docs.find(x => x.id === d.docdel); if (doc.storage_path && !DEMO) await sb.storage.from("docs").remove([doc.storage_path]); await DB.remove("documents", doc.id); S.docs = S.docs.filter(x => x.id !== doc.id); await logAct(`File deleted: ${doc.name}`, "company"); return render(); }
  if (d.saveticket) { const s = val("#tk1"); if (!s) return toast("Say briefly what you need."); S.tickets.unshift(...await DB.insert("tickets", { client_id: CLIENT.id, subject: s, details: val("#tk2"), urgency: val("#tk3"), created_by_email: ME.email })); closeModal(); toast("Sent to Jreebs. We'll reply on WhatsApp or email."); return render(); }
  if (d.reqint) { S.tickets.unshift(...await DB.insert("tickets", { client_id: CLIENT.id, subject: "Connect " + d.reqint, details: "Requested from the Integrations page.", urgency: "Normal", created_by_email: ME.email })); toast(`Requested. Jreebs will contact you to set up ${d.reqint}.`); return render(); }
  if (d.savelink !== undefined) { const row = { name: val("#lk1"), category: val("#lk2") || "Work", url: val("#lk3") }; if (!row.name) return toast("Add a name."); if (row.url && !/^https?:\/\//i.test(row.url)) row.url = "https://" + row.url; if (d.kind === "system") Object.assign(row, { description: val("#lk4"), health: val("#lk5"), sso: val("#lk6") === "1" });
    if (d.savelink) putRow(S.links, await DB.update("links", d.savelink, row)); else S.links.push(...await DB.insert("links", { client_id: CLIENT.id, kind: d.kind, ...row })); closeModal(); toast("Saved."); return render(); }
  if (d.dellink) { await DB.remove("links", d.dellink); S.links = S.links.filter(x => x.id !== d.dellink); closeModal(); return render(); }
  if (d.saveplat !== undefined) { const row = { name: val("#pl1"), purpose: val("#pl2"), plan: val("#pl3"), cost: +val("#pl4") || 0, renews_on: val("#pl5") || null, owner_name: val("#pl6"), status: val("#pl7") }; if (!row.name) return toast("Add a name."); if (d.saveplat) putRow(S.plats, await DB.update("platforms", d.saveplat, row)); else S.plats.push(...await DB.insert("platforms", { client_id: CLIENT.id, ...row })); closeModal(); toast("Saved."); return render(); }
  if (d.delplat) { await DB.remove("platforms", d.delplat); S.plats = S.plats.filter(x => x.id !== d.delplat); closeModal(); return render(); }
  if (d.syncpeople) { const before = S.people.length; await seedStarter(); toast(S.people.length > before ? `${S.people.length - before} added from your logins.` : "Everyone with a login is already on the list."); return render(); }
  if (d.fixacc) { const i = accessIssues()[+d.fixacc]; if (!i) return; const tools = i.fix === "all" ? [] : i.p.tools.filter(x => x !== i.fix); putRow(S.people, await DB.update("people", i.p.id, { tools })); await logAct(`Access removed for ${i.p.name}: ${i.fix === "all" ? "all systems" : i.fix}`, "access"); toast(i.fix === "all" ? `All access recorded as removed for ${i.p.name}. Remove their logins in those systems too.` : `${i.fix} removed for ${i.p.name}. Remove their login there too.`); return render(); }
  if (d.addtool) { const v = val("#ppNew"); if (!v) return; const grid = $("#modal [data-pxt]")?.parentElement.parentElement; if (grid) grid.insertAdjacentHTML("beforeend", `<label class="row small" style="gap:8px"><input type="checkbox" data-pxt="${esc(v)}" checked>${esc(v)}</label>`); $("#ppNew").value = ""; return; }
  if (d.saveperson !== undefined) { const row = { name: val("#pp1"), job: val("#pp2"), dept: val("#pp3"), emp_type: val("#pp4"), ends_on: val("#pp5") || null, phone: val("#pp6"), email: val("#pp7"), auth_user_id: val("#pp8") || null, tools: $$("#modal [data-pxt]").filter(x => x.checked).map(x => x.dataset.pxt), active: !$("#pp9").checked }; if (!row.name) return toast("Add a name.");
    if (d.saveperson) putRow(S.people, await DB.update("people", d.saveperson, row)); else S.people.push(...await DB.insert("people", { client_id: CLIENT.id, ...row })); await logAct(`${d.saveperson ? "Updated" : "Added"} ${row.name} (${row.tools.length} systems)`, "access"); closeModal(); toast("Saved."); return render(); }
  if (d.delperson) { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Press again to delete"; return; } await DB.remove("people", d.delperson); S.people = S.people.filter(x => x.id !== d.delperson); closeModal(); return render(); }
  if (d.sopread) { S.reads.push(...await DB.insert("sop_reads", { sop_id: d.sopread, client_id: CLIENT.id, auth_user_id: ME.id })); await logAct(`Confirmed reading "${S.sops.find(s => s.id === d.sopread)?.title}"`, "sop"); toast("Thanks. Your confirmation is recorded."); render(); return sopDrawer(d.sopread); }
  if (d.sopreviewed) { putRow(S.sops, await DB.update("sops", d.sopreviewed, { reviewed_on: isoDay(new Date()), owner_name: nameOf(ME.email) })); toast("Marked as reviewed today."); render(); return sopDrawer(d.sopreviewed); }
  if (d.savesop !== undefined) { const row = { title: val("#sp1"), category: val("#sp2") || "Operations", format: val("#sp4"), roles: $$("#modal [data-spr]").filter(x => x.checked).map(x => x.dataset.spr), tools: val("#sp5").split(",").map(s => s.trim()).filter(Boolean), steps: val("#sp3").split("\n").map(s => s.trim()).filter(Boolean), reviewed_on: isoDay(new Date()), owner_name: nameOf(ME.email) }; if (!row.title) return toast("Give it a title."); if (!row.steps.length) return toast("Add at least one step.");
    if (d.savesop) putRow(S.sops, await DB.update("sops", d.savesop, row)); else S.sops.push(...await DB.insert("sops", { client_id: CLIENT.id, ...row })); await logAct(`SOP ${d.savesop ? "updated" : "published"}: ${row.title}`, "sop"); closeModal(); toast("Saved."); return render(); }
  if (d.delsop) { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Press again to delete"; return; } await DB.remove("sops", d.delsop); S.sops = S.sops.filter(x => x.id !== d.delsop); closeModal(); return render(); }

  /* setup */
  if (d.rule) { const cur = ruleOn(d.rule); const r = (await DB.upsert("rules", { client_id: CLIENT.id, rule_id: d.rule, enabled: !cur }, "client_id,rule_id"))[0]; putRow(S.rules, r); await logAct(`Automation "${WDEF.rules.find(x => x.id === d.rule)?.name}" turned ${cur ? "off" : "on"}`, "automation"); return render(); }
  if (d.crule) { const r = S.rules.find(x => x.id === d.crule); putRow(S.rules, await DB.update("rules", r.id, { enabled: !r.enabled })); await logAct(`Automation "${r.def.name}" turned ${r.enabled ? "off" : "on"}`, "automation"); return render(); }
  if (d.delrule) { const r = S.rules.find(x => x.id === d.delrule); await DB.remove("rules", r.id); S.rules = S.rules.filter(x => x.id !== r.id); await logAct(`Automation "${r.def.name}" deleted`, "automation"); return render(); }
  if (d.saverule) { const name = val("#rn"); if (!name) return toast("Give it a name."); const def = { name, when: val("#rw"), status: val("#rs"), mins: +val("#rm") || 0, cond: val("#rc"), val: val("#rv"), label: val("#rl") || name, sev: +val("#rsev"), tpl: val("#rt") || null };
    S.rules.push(...await DB.insert("rules", { client_id: CLIENT.id, rule_id: "c-" + Date.now().toString(36), enabled: true, def })); await logAct(`Automation created: ${name}`, "automation"); closeModal(); toast(`"${name}" is on.`); return render(); }
  if (d.ins) { const a = document.activeElement; const ta = a && a.tagName === "TEXTAREA" ? a : $("#ten"); ta.value += d.ins; ta.focus(); return; }
  if (d.savetpl !== undefined) { const row = { name: val("#tn"), category: val("#tc"), en: val("#ten"), ar: val("#tar") }; if (!row.name) return toast("Give it a name."); if (d.savetpl) putRow(S.tpls, await DB.update("templates", d.savetpl, row)); else S.tpls.push(...await DB.insert("templates", { client_id: CLIENT.id, key: "t-" + Date.now().toString(36), ...row })); await logAct(`Template saved: ${row.name}`, "template"); closeModal(); toast("Saved."); return render(); }
  if (d.deltpl) { await DB.remove("templates", d.deltpl); S.tpls = S.tpls.filter(x => x.id !== d.deltpl); closeModal(); return render(); }
  if (d.impcancel) { ui.imp = null; return render(); }
  if (d.impgo) return runImport();

  /* settings */
  if (d.savesla) { const s = { ...SLA() }, t = { ...TARGETS() }; ["promise", "firstReply", "pickup", "nodriver"].forEach(k => { const v = +val("#sla-" + k); if (v > 0) s[k] = v; }); ["ontime", "perAgent", "qa"].forEach(k => { const v = +val("#tg-" + k); if (v > 0) t[k] = v; }); await saveConfig({ sla: s, targets: t }); await logAct("Time limits and targets updated", "settings"); return toast("Saved."); }
  if (d.saveqacrit) { const c = val("#qacrit").split("\n").map(s => s.trim()).filter(Boolean).slice(0, 8); if (!c.length) return toast("Add at least one item."); await saveConfig({ qa_criteria: c }); toast("Saved."); return render(); }
  if (d.setpw) { const p = $("#newpw").value; if (p.length < 8) return toast("Use at least 8 characters."); if (DEMO) return toast("Not in the demo."); const { error } = await sb.auth.updateUser({ password: p }); if (error) throw error; $("#newpw").value = ""; return toast("Password changed."); }
  if (d.signoutall) return signOut("global");
  if (d.mfaverify) { const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: d.mfaverify, code: val("#mfaCode") }); if (error) throw error; closeModal(); return toast("Two-step sign-in is on."); }
  if (d.mfaoff) { const { error } = await sb.auth.mfa.unenroll({ factorId: d.mfaoff }); if (error) throw error; closeModal(); return toast("Two-step sign-in is off."); }

  /* Jreebs admin */
  if (d.admreload) { ADM.loaded = false; return render(); }
  if (d.saveclient) {
    const name = val("#ncn"), email = val("#nce").toLowerCase(), phone = val("#ncph"), contact = val("#ncc");
    if (!name) return toast("Add the company name."); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("Add the owner's email.");
    const qo = readQuote("nq"), q = quote(qo); let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "client";
    if (ADM.clients.some(c => c.slug === slug)) slug += "-" + Date.now().toString(36).slice(-4);
    const starts = val("#ncs") || isoDay(new Date()), r = new Date(starts + "T12:00:00"); r.setFullYear(r.getFullYear() + 1);
    const c = (await DB.insert("clients", { name, slug, workspace_type: val("#nct"), plan: planKey(qo.plan), config: {} }))[0];
    await DB.insert("client_accounts", { client_id: c.id, status: "onboarding", users_included: q.users, annual_price: q.price, setup_fee: q.setup, starts_on: starts, renews_on: isoDay(r), owner_email: email, contact_name: contact, contact_phone: phone, addons: { connectors: qo.connectors, channels: qo.channels, ai_packs: qo.aiPacks, discount: qo.discount, ai_limit: q.aiLimit, deep_limit: q.deepLimit }, checklist: { quote: true } });
    const st = await DB.rpc("invite_by_email", { p_client_id: c.id, p_email: email, p_role: "owner" });
    await loadAdmin(); render(); return clientCreatedModal(c, email, phone, contact, st);
  }
  if (d.saveacct) {
    const id = d.saveacct, a = acctOf(id), c = ADM.clients.find(x => x.id === id);
    const row = { client_id: id, status: val("#ca1"), users_included: +val("#ca3") || 1, annual_price: +val("#ca4") || 0, setup_fee: +val("#ca5") || 0, starts_on: val("#ca6") || null, renews_on: val("#ca7") || null, contact_name: val("#ca8"), contact_phone: val("#ca9"), owner_email: val("#ca10"), notes: val("#ca13"), addons: { ...(a.addons || {}), ai_limit: +val("#ca11"), deep_limit: +val("#ca12") }, checklist: a.checklist || {}, updated_at: new Date().toISOString() };
    await DB.upsert("client_accounts", row, "client_id");
    if (val("#ca2") !== c.plan) await DB.update("clients", id, { plan: val("#ca2") });
    await loadAdmin(); render(); toast("Contract saved."); return clientDrawer(id);
  }
  if (d.chk) { const a = acctOf(d.id), on = !a.checklist?.[d.chk]; await DB.upsert("client_accounts", { ...a, client_id: d.id, checklist: { ...(a.checklist || {}), [d.chk]: on }, ...(d.chk === "live" && on ? { status: "active" } : {}), updated_at: new Date().toISOString() }, "client_id"); if (d.chk === "live" && on) toast("Marked live and active."); await loadAdmin(); render(); return clientDrawer(d.id); }
  if (d.pvinvite) { const email = val("#pvInv"); if (!email) return toast("Type their email first."); const role = val("#pvRole"); const st = await DB.rpc("invite_by_email", { p_client_id: d.pvinvite, p_email: email, p_role: role }); toast(st === "linked" ? `${email} already had an account and is now linked as ${ROLES[role].label}.` : `Invited. ${email} joins as ${ROLES[role].label} when they sign up. Copy the invite below.`); await loadAdmin(); render(); return clientDrawer(d.pvinvite); }
}

async function switchCompany() {
  const opts = await Promise.all(ME.memberships.map(async m => { const { data } = await sb.from("clients").select("id,name").eq("id", m.client_id).single(); return [m.client_id, data?.name || "Company", m.role]; }));
  openModal(`${mHead("Switch company")}<div class="m-b"><div class="stack" style="gap:8px">${opts.map(([id, n, r]) => `<button class="btn" style="justify-content:flex-start" type="button" data-goco="${id}">${esc(n)} <span class="small muted">· ${esc(ROLES[r].label)}</span></button>`).join("")}</div></div>`);
  $$("[data-goco]").forEach(b => b.onclick = () => { try { localStorage.setItem("jreebs-client", b.dataset.goco); } catch (e) {} location.reload(); });
}

/* ---------- start ---------- */
$("#loginForm").addEventListener("submit", onLoginSubmit);
$("#mscrim").onclick = closeModal;
$("#scrim").onclick = closeDrawer;
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if (!$("#modal").hidden) closeModal(); else if (!$("#drawer").hidden) closeDrawer(); else if (AI.open) toggleAI(false); else $("#pop").hidden = true; }
  if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "") && ME && !ADMIN) { e.preventDefault(); $("#q").focus(); }
});
$("#q").addEventListener("keydown", e => { if (e.key === "Enter" && !ADMIN && ME) { const q = e.target.value.trim(); if (!q) return; runSearch(q); go("search"); } });
$("#qIcon").innerHTML = ic("search");
$("#menuBtn").innerHTML = ic("menu");
$("#bellBtn").innerHTML = ic("bell") + '<span class="dot"></span>';
$("#askBtn").innerHTML = ic("spark") + "<span>Ask</span>";
$("#q").placeholder = "Search everything";
setInterval(() => { if (ME && !ADMIN && !document.hidden) softRender(); }, 60000);
(async () => {
  if (DEMO) return boot();
  sb.auth.onAuthStateChange(ev => { if (ev === "PASSWORD_RECOVERY") showLogin("reset"); });
  const { data: { session } } = await sb.auth.getSession();
  if (location.hash.includes("type=recovery")) return showLogin("reset");
  if (session) await boot(); else showLogin(new URLSearchParams(location.search).has("signup") ? "signup" : "signin");
})();
