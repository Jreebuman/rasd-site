/* Email: a read-only workspace for the company's shared mailboxes. Mail arrives by forwarding;
   replies are written in the company's own mail app. */
const EM_ST = { open: ["Open", "warn"], waiting: ["Waiting on them", "info"], done: ["Done", "good"] };
const canMail = e => { const m = S.mailboxes.find(x => x.id === e.mailbox_id) || S.mbFull.find(x => x.id === e.mailbox_id); return !m || lvl() >= m.min_lvl; };
const myBoxes = () => S.mailboxes.filter(m => lvl() >= m.min_lvl);
const threadOf = e => S.emails.filter(x => (e.thread_key && x.thread_key === e.thread_key && x.mailbox_id === e.mailbox_id) || x.id === e.id).sort((a, b) => cmp(a.received_at, b.received_at));
function emailList(f = ui.emf) {
  const q = (ui.emq || "").toLowerCase();
  // one row per thread, newest message first
  const latest = new Map();
  S.emails.filter(canMail).forEach(e => { const k = (e.mailbox_id || "") + "|" + (e.thread_key || e.id); const cur = latest.get(k); if (!cur || e.received_at > cur.received_at) latest.set(k, e); });
  return [...latest.values()].filter(e => (f === "all" || e.status === f || (f === "mine" && e.assignee === ME.id && e.status !== "done")) && (ui.emBox === "all" || e.mailbox_id === ui.emBox) && (!q || [e.subject, e.from_name, e.from_addr, e.body_text].join(" ").toLowerCase().includes(q))).sort((a, b) => cmp(b.received_at, a.received_at));
}
VIEWS.email = function () {
  const list = emailList(), sel = S.emails.find(e => e.id === ui.emSel) || null;
  const n = k => emailList(k).length;
  const tabs = [["open", "Open", n("open")], ["waiting", "Waiting on them", n("waiting")], ["mine", "Assigned to me", S.emails.filter(e => canMail(e) && e.assignee === ME.id && e.status !== "done").length], ["done", "Done", null], ["all", "All", null]];
  const boxes = myBoxes();
  return `${head("Email", boxes.length ? `${boxes.length} shared mailbox${boxes.length > 1 ? "es" : ""} · ${n("open")} open` : "Shared mailboxes for your team, in one place.", `${can(4) ? `<button class="btn" type="button" data-mbox="1">${ic("gear")}Mailboxes</button>` : ""}`)}
  ${!boxes.length ? `<section class="card"><div class="card-b stack">${empty("No mailboxes connected yet.")}${can(4) ? `<div class="row" style="justify-content:center"><button class="btn go" type="button" data-mbox="1">${ic("plus")}Connect a mailbox</button></div>` : `<p class="small muted" style="text-align:center">Ask your manager to connect your team's mailbox.</p>`}</div></section>` : `
  <div class="tabs">${tabs.map(([k, l, c]) => `<button class="tab" type="button" data-emf="${k}" aria-selected="${ui.emf === k}">${l}${c ? ` <span class="ct">${c}</span>` : ""}</button>`).join("")}</div>
  <div class="mail">
    <section class="card mail-list"><div class="card-h"><label class="search in-card" for="emq">${ic("search")}<input id="emq" type="search" placeholder="Search mail" value="${esc(ui.emq || "")}"></label>${boxes.length > 1 ? `<select class="sel" id="emBox"><option value="all">All mailboxes</option>${boxes.map(b => `<option value="${b.id}" ${ui.emBox === b.id ? "selected" : ""}>${esc(b.label || b.address)}</option>`).join("")}</select>` : ""}</div>
      <div class="ml">${list.map(e => { const th = threadOf(e).length, cu = S.cust.find(c => c.id === e.customer_id); return `<button class="ml-r${sel && threadOf(sel).some(x => x.id === e.id) ? " on" : ""}${e.status === "open" ? " unread" : ""}" type="button" data-em="${e.id}">
        <span class="ml-1"><b>${esc(e.from_name || e.from_addr)}</b>${th > 1 ? `<span class="muted"> · ${th}</span>` : ""}<span class="spacer"></span><time>${emTime(e.received_at)}</time></span>
        <span class="ml-2">${esc(e.subject || "(no subject)")}${e.has_attachments ? ic("box", "attico") : ""}</span>
        <span class="ml-3">${esc(e.body_text.replace(/\s+/g, " ").slice(0, 110))}</span>
        <span class="ml-4">${pill(...EM_ST[e.status])}${cu ? pill(cu.name, "acc") : ""}${e.assignee ? `<span class="small muted">${esc(memberName(e.assignee))}</span>` : ""}</span></button>`; }).join("") || `<div class="card-b">${empty("Nothing here.")}</div>`}</div></section>
    <section class="card mail-read">${sel ? emailReader(sel) : `<div class="card-b">${empty("Pick an email to read it.")}</div>`}</section>
  </div>`}`;
};
const emTime = d => { const x = new Date(d); return startOfDay(x).getTime() === startOfDay().getTime() ? hm(mins(x.getTime())) : dShort(d); };
function emailReader(e) {
  const thread = threadOf(e), cu = S.cust.find(c => c.id === e.customer_id), it = itemById(e.item_id), box = S.mailboxes.find(m => m.id === e.mailbox_id);
  return `<div class="card-h mail-h"><div class="grow" style="min-width:0"><h3>${esc(e.subject || "(no subject)")}</h3><div class="small muted">${esc(box ? box.label || box.address : "")} · ${thread.length} message${thread.length > 1 ? "s" : ""}</div></div>
    <div class="row">${["open", "waiting", "done"].map(s => `<button class="btn sm${e.status === s ? " primary" : ""}" type="button" data-emst="${s}" data-id="${e.id}">${EM_ST[s][0]}</button>`).join("")}</div></div>
  <div class="mail-meta">
    <div class="field"><label for="emCust">Customer</label><select class="sel" id="emCust" data-id="${e.id}"><option value="">Not linked</option>${S.cust.slice().sort((a, b) => cmp(a.name, b.name)).map(c => `<option value="${c.id}" ${c.id === e.customer_id ? "selected" : ""}>${esc(c.name)}${c.phone ? " · " + esc(c.phone) : ""}</option>`).join("")}</select></div>
    <div class="field"><label for="emItem">Linked record</label><input class="in" id="emItem" data-id="${e.id}" placeholder="e.g. ${esc(ITEMS[0]?.ext_id || "D-1001")}" value="${esc(it?.ext_id || "")}"></div>
    <div class="field"><label for="emAsg">Handled by</label><select class="sel" id="emAsg" data-id="${e.id}"><option value="">Nobody yet</option>${S.team.filter(m => m.role !== "driver").map(m => `<option value="${m.auth_user_id}" ${m.auth_user_id === e.assignee ? "selected" : ""}>${esc(memberName(m.auth_user_id))}</option>`).join("")}</select></div>
  </div>
  <div class="row mail-acts">
    <button class="btn" type="button" data-aiq="${esc(`Summarize the email thread "${e.subject}" from ${e.from_name || e.from_addr} and list the action items.`)}">${ic("spark")}Summarize</button>
    <a class="btn" href="mailto:${esc(e.from_addr)}?subject=${encodeURIComponent("Re: " + e.subject)}">${ic("msg")}Reply in your mail app</a>
    <button class="btn" type="button" data-em2case="${e.id}">${ic("inbox")}Make it a conversation</button>
    ${cu ? `<button class="btn" type="button" data-cu="${cu.id}">${ic("contact")}${esc(cu.name)}</button>` : ""}${it ? `<button class="btn" type="button" data-oo="${it.id}">${esc(it.ext_id)}</button>` : ""}
  </div>
  <div class="emthread">${thread.map(m => `<article class="em"><header><b>${esc(m.from_name || m.from_addr)}</b> <span class="muted small">&lt;${esc(m.from_addr)}&gt;</span><span class="spacer"></span><time class="small muted">${dShort(m.received_at)} ${hm(mins(new Date(m.received_at).getTime()))}</time></header><div class="em-b">${esc(m.body_text).replace(/\n/g, "<br>")}</div>${m.has_attachments ? `<div class="small muted">${ic("box")} Has attachments. Open the original in your mail app to see them.</div>` : ""}</article>`).join("")}</div>`;
}
function mailboxModal() {
  const boxes = DEMO ? S.mailboxes : (S.mbFull || []);
  openModal(`${mHead("Mailboxes")}<div class="m-b form">
    <p class="small">Forward a shared inbox (for example support@ or orders@) to its Jreebs address. New mail then shows up in Email for the people you choose. Jreebs only reads; replies still go out from your own mail app.</p>
    ${boxes.length ? `<div class="tw"><table class="t"><thead><tr><th>Mailbox</th><th>Who can read it</th><th>Forward to</th><th></th></tr></thead><tbody>${boxes.map(b => `<tr><td><b>${esc(b.label || b.address)}</b><div class="small muted">${esc(b.address)}</div></td><td>${esc(NEED[b.min_lvl] || "")}</td><td>${b.inbound_token ? `<button class="btn sm" type="button" data-copy="${esc(b.inbound_token + "@in.jreebs.com")}">Copy address</button>` : ""}</td><td class="r"><button class="ib" type="button" data-delmb="${b.id}" aria-label="Remove mailbox">${ic("trash")}</button></td></tr>`).join("")}</tbody></table></div>` : ""}
    <h4>Add a mailbox</h4>
    <div class="f2"><div class="field"><label for="mb1">Address</label><input class="in" id="mb1" type="email" placeholder="support@yourcompany.com"></div><div class="field"><label for="mb2">Name</label><input class="in" id="mb2" placeholder="Customer support"></div></div>
    <div class="field"><label for="mb3">Who can read it</label><select class="sel" id="mb3">${[1, 2, 3, 4].map(n => `<option value="${n}">${NEED[n][0].toUpperCase() + NEED[n].slice(1)}</option>`).join("")}</select></div>
    <div class="note-box">${ic("info")}<span>Forwarding starts working once Jreebs switches on email receiving for your account. Until then new mail won't arrive.</span></div>
  </div><div class="m-f"><button class="btn" type="button" data-act="mclose">Close</button><button class="btn go" type="button" data-savemb="1">Add mailbox</button></div>`, true);
}
