/* Assistant: answers questions about the company's own data.
   Lookups run here in the browser with the person's own login, so database permissions decide what
   any answer can include. The server function (supabase/functions/assistant) only holds the AI key,
   the fixed instructions and the tool list. In the demo, answers come from the same lookups without AI. */
const AI = { open: false, msgs: [], turns: [], busy: false, deep: false, quota: null };
const AI_URL = SUPABASE_URL + "/functions/v1/assistant";
const iso = m => m == null ? null : new Date(m * 60000).toISOString();

/* ---------- the tables the assistant may read (compact rows, no secrets) ---------- */
const AI_TABLES = {
  items: { rows: () => ITEMS.map(it => ({ id: it.id, ref: it.ext_id, customer: it.name, phone: it.phone, area: it.area || "", status: stageName(it.status), open: !isTerm(it), [WDEF.ownerLabel.toLowerCase()]: it.owner || "", handled_by: it.assigned_to ? memberName(it.assigned_to) : "", created: iso(it.created), due: iso(it.due), late_min: !isTerm(it) && nowM() > it.due ? Math.round(nowM() - it.due) : 0, finished: iso(it.t[WDEF.done] ?? it.t[WDEF.terminal[1]]), on_time: it.t[WDEF.done] != null ? it.t[WDEF.done] <= it.due : null, ...Object.fromEntries(WDEF.fields.map(([k]) => [k, it.data?.[k] ?? ""])), flags: it.flags.map(f => f.text).join(", ") })),
    fields: ["ref", "customer", "area", "status", "handled_by", "due", "late_min", "flags"] },
  customers: { rows: () => S.cust.map(c => ({ id: c.id, name: c.name, phone: c.phone, email: c.email || "", area: c.area || "", tags: (c.tags || []).join(", "), orders: ITEMS.filter(i => i.customer_id === c.id).length, conversations: S.cases.filter(k => k.customer_id === c.id).length, notes: (c.notes || "").slice(0, 200), since: c.created_at })), fields: ["name", "phone", "area", "tags", "orders", "conversations"] },
  conversations: { rows: () => S.cases.map(c => ({ id: c.id, subject: c.subject, channel: c.channel, kind: c.kind, status: c.status, customer: S.cust.find(x => x.id === c.customer_id)?.name || "", assignee: c.assignee ? memberName(c.assignee) : "", order: itemById(c.item_id)?.ext_id || "", created: c.created_at, updated: c.updated_at, reply_by: c.reply_by, last_from: (S.msgs.filter(m => m.case_id === c.id && m.dir !== "sys" && m.dir !== "note").slice(-1)[0] || {}).dir === "in" ? "customer" : "team" })), fields: ["subject", "channel", "status", "customer", "assignee", "updated", "last_from"] },
  messages: { rows: () => S.msgs.filter(m => m.dir !== "sys").map(m => ({ conversation: m.case_id, from: m.dir === "in" ? "customer" : m.dir === "note" ? "internal note" : "team", body: m.body.slice(0, 300), author: m.author_email ? nameOf(m.author_email) : "", at: m.created_at })), fields: ["conversation", "from", "body", "at"] },
  emails: { rows: () => S.emails.filter(canMail).map(e => ({ id: e.id, subject: e.subject, from: e.from_name ? `${e.from_name} <${e.from_addr}>` : e.from_addr, status: e.status, received: e.received_at, customer: S.cust.find(x => x.id === e.customer_id)?.name || "", order: itemById(e.item_id)?.ext_id || "", assignee: e.assignee ? memberName(e.assignee) : "", mailbox: S.mailboxes.find(m => m.id === e.mailbox_id)?.address || "", preview: e.body_text.slice(0, 200) })), fields: ["subject", "from", "status", "received", "customer"] },
  people: { rows: () => S.people.map(p => ({ id: p.id, name: p.name, job: p.job, dept: p.dept, type: p.emp_type, active: p.active, has_login: !!p.auth_user_id, systems: (p.tools || []).join(", "), contract_ends: p.ends_on })), fields: ["name", "job", "dept", "active", "systems"] },
  shifts: { rows: () => S.shifts.map(s => ({ person: S.people.find(p => p.id === s.person_id)?.name || "", day: s.day, shift: s.shift })), fields: ["person", "day", "shift"] },
  qa_reviews: { rows: () => S.qa.map(r => ({ id: r.id, agent: r.agent_name, score: qaPct(r), channel: r.channel, note: r.note, reviewer: nameOf(r.reviewer_email), at: r.created_at })), fields: ["agent", "score", "channel", "at"] },
  sops: { rows: () => S.sops.map(s => { const need = S.team.filter(m => (s.roles || []).includes(m.role)); const read = need.filter(m => S.reads.some(r => r.sop_id === s.id && r.auth_user_id === m.auth_user_id)); return { id: s.id, title: s.title, category: s.category, for_roles: (s.roles || []).join(", "), steps: (s.steps || []).length, reviewed_on: s.reviewed_on, read_by: read.length, should_read: need.length }; }), fields: ["title", "category", "read_by", "should_read", "reviewed_on"] },
  sop_reads: { rows: () => S.reads.map(r => ({ sop: S.sops.find(s => s.id === r.sop_id)?.title || "", person: memberName(r.auth_user_id), at: r.read_at })), fields: ["sop", "person", "at"] },
  files: { rows: () => S.docs.map(d => ({ id: d.id, name: d.name, kind: d.kind, expires_on: d.expires_on, days_left: daysUntil(d.expires_on) })), fields: ["name", "kind", "expires_on", "days_left"] },
  subscriptions: { rows: () => S.plats.map(p => ({ id: p.id, name: p.name, purpose: p.purpose, plan: p.plan, monthly_cost_jod: p.cost, renews_on: p.renews_on, days_left: daysUntil(p.renews_on), owner: p.owner_name })), fields: ["name", "plan", "monthly_cost_jod", "renews_on"] },
  links: { rows: () => S.links.map(l => ({ id: l.id, name: l.name, kind: l.kind, category: l.category, health: l.health })), fields: ["name", "kind", "category", "health"] },
  templates: { rows: () => S.tpls.map(t => ({ id: t.id, name: t.name, category: t.category, english: t.en })), fields: ["name", "category", "english"] },
  activity: { rows: () => S.act.map(a => ({ at: a.at, who: a.actor_email ? nameOf(a.actor_email) : "System", what: a.text })), fields: ["at", "who", "what"] }
};
const AI_DESC = { items: `${WDEF.items} (last 31 days plus every open one)`, customers: "Customers, matched by phone number", conversations: "Customer conversations in the Inbox", messages: "Messages inside conversations (last 31 days)", emails: "Emails received in the company mailboxes", people: "Everyone who works at the company, with the systems they can access", shifts: "This week's shifts", qa_reviews: "Quality reviews (score is %)", sops: "Standard operating procedures and who has read them", sop_reads: "Who confirmed reading which SOP", files: "Company compliance files and expiry dates", subscriptions: "Software subscriptions and renewals", links: "Tools and internal systems", templates: "Message templates", activity: "Audit log of actions (latest 400)" };
const aiRows = t => { const T = AI_TABLES[t]; if (!T) throw new Error("Unknown table: " + t); try { return T.rows(); } catch (e) { return []; } };
const cmp = (a, b) => (a == null) - (b == null) || (a > b ? 1 : a < b ? -1 : 0);
function aiFilter(rows, filters = []) {
  return rows.filter(r => (filters || []).every(f => {
    const v = r[f.field], x = f.value, s = String(v ?? "").toLowerCase(), xs = String(x ?? "").toLowerCase();
    switch (f.op) {
      case "eq": return typeof v === "boolean" ? v === (x === true || xs === "true") : s === xs;
      case "neq": return s !== xs;
      case "gt": return typeof v === "number" ? v > +x : s > xs; case "gte": return typeof v === "number" ? v >= +x : s >= xs;
      case "lt": return typeof v === "number" ? v < +x : s < xs; case "lte": return typeof v === "number" ? v <= +x : s <= xs;
      case "contains": return s.includes(xs);
      case "in": return (Array.isArray(x) ? x : String(x).split(",")).map(y => String(y).trim().toLowerCase()).includes(s);
      case "empty": return v == null || v === "" || v === 0;
      case "not_empty": return !(v == null || v === "" || v === 0);
      default: return true;
    }
  }));
}
const pickF = (rows, fields) => rows.map(r => Object.fromEntries(fields.filter(f => f in r).map(f => [f, r[f]])));

/* ---------- data checks ---------- */
function aiCheck(check) {
  const it = aiRows("items");
  switch (check) {
    case "late_now": return it.filter(r => r.open && r.late_min > 0).sort((a, b) => b.late_min - a.late_min);
    case "unassigned_open": return it.filter(r => r.open && !r[WDEF.ownerLabel.toLowerCase()]);
    case "missing_phone": return aiRows("customers").filter(c => !String(c.phone || "").replace(/\D/g, ""));
    case "duplicate_customers": { const by = {}; aiRows("customers").forEach(c => { const k = waNum(c.phone); if (k) (by[k] = by[k] || []).push(c.name); }); return Object.entries(by).filter(([, v]) => v.length > 1).map(([phone, names]) => ({ phone, names: names.join(" / "), count: names.length })); }
    case "stale_conversations": return aiRows("conversations").filter(c => c.status === "open" && c.last_from === "customer").sort((a, b) => cmp(a.updated, b.updated));
    case "unanswered_emails": return aiRows("emails").filter(e => e.status === "open").sort((a, b) => cmp(a.received, b.received));
    case "sop_unread": return aiRows("sops").filter(s => s.read_by < s.should_read).map(s => ({ ...s, missing: s.should_read - s.read_by }));
    case "expiring_files": return aiRows("files").filter(f => f.days_left != null && f.days_left <= 45).sort((a, b) => a.days_left - b.days_left);
    case "access_issues": return typeof accessIssues === "function" ? accessIssues().map(i => ({ person: i.p.name, issue: i.t, detail: i.d, remove: i.fix || "" })) : [];
    case "renewals_due": return aiRows("subscriptions").filter(s => s.days_left != null && s.days_left <= 30).sort((a, b) => a.days_left - b.days_left);
    default: throw new Error("Unknown check: " + check);
  }
}

/* ---------- tool runner (same code for the live assistant and the demo) ---------- */
function runTool(name, input = {}, turn) {
  const lim = Math.min(200, Math.max(1, +input.limit || 50));
  switch (name) {
    case "workspace_overview": return {
      company: CLIENT.name, business_type: CLIENT.workspace_type, your_role: ROLES[ME.role].label, today: isoDay(new Date()), now: new Date().toISOString(),
      item_word: WDEF.item, stages: [...WDEF.stages, ...WDEF.alt].map(s => s[1]), finished_stage: stageName(WDEF.done), owner_field: WDEF.ownerLabel.toLowerCase(),
      targets: TARGETS(), time_limits_minutes: SLA(),
      tables: Object.fromEntries(Object.keys(AI_TABLES).map(t => { const rows = aiRows(t); return [t, { holds: AI_DESC[t], rows: rows.length, fields: Object.keys(rows[0] || {}) }]; }).filter(([, v]) => v.rows))
    };
    case "find_records": {
      let rows = aiFilter(aiRows(input.table), input.filters);
      if (input.sort?.field) rows.sort((a, b) => cmp(a[input.sort.field], b[input.sort.field]) * (input.sort.dir === "desc" ? -1 : 1));
      const total = rows.length; rows = rows.slice(0, lim);
      return { table: input.table, total, returned: rows.length, rows: pickF(rows, input.fields?.length ? input.fields : AI_TABLES[input.table].fields.concat("id")) };
    }
    case "summarize": {
      let rows = aiFilter(aiRows(input.table), input.filters);
      if (input.date_field) rows = rows.filter(r => { const d = String(r[input.date_field] || ""); return d && (!input.from || d >= input.from) && (!input.to || d <= input.to + (input.to.length === 10 ? "T23:59:59" : "")); });
      const groups = {};
      rows.forEach(r => { const k = input.group_by ? String(r[input.group_by] ?? "—") || "—" : "all"; (groups[k] = groups[k] || []).push(r); });
      const val = g => input.metric === "count" ? g.length : (() => { const nums = g.map(r => +r[input.metric_field]).filter(n => !isNaN(n)); const sum = nums.reduce((a, b) => a + b, 0); return input.metric === "sum" ? +sum.toFixed(2) : nums.length ? +(sum / nums.length).toFixed(2) : null; })();
      const out = Object.entries(groups).map(([k, g]) => ({ group: k, value: val(g), records: g.length })).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
      return { table: input.table, metric: input.metric, metric_field: input.metric_field || null, group_by: input.group_by || null, total_records: rows.length, groups: out.slice(0, 60) };
    }
    case "search": return { query: input.query, results: localSearch(input.query).slice(0, 30).map(r => ({ type: r.kind, title: r.title, detail: r.sub, ref: r.ref || r.id })) };
    case "get_record": {
      const rows = aiRows(input.table), q = String(input.ref || "").toLowerCase();
      const r = rows.find(x => String(x.id).toLowerCase() === q || String(x.ref || "").toLowerCase() === q) || rows.find(x => String(x.name || x.subject || x.title || x.customer || "").toLowerCase() === q) || rows.find(x => String(x.name || x.subject || x.title || "").toLowerCase().includes(q));
      if (!r) return { found: false };
      const extra = {};
      if (input.table === "items") { const it = itemById(r.id); extra.history = (it.hist || []).slice(-15).map(h => ({ at: h.at, note: h.text, by: nameOf(h.by) })); extra.conversations = aiRows("conversations").filter(c => c.order === r.ref); }
      if (input.table === "customers") { extra.recent_orders = aiRows("items").filter(i => ITEMS.find(x => x.id === i.id)?.customer_id === r.id).slice(0, 10).map(i => ({ ref: i.ref, status: i.status, created: i.created })); extra.conversations = aiRows("conversations").filter(c => c.customer === r.name).slice(0, 10); }
      if (input.table === "conversations") extra.messages = aiRows("messages").filter(m => m.conversation === r.id);
      if (input.table === "emails") { const e = S.emails.find(x => x.id === r.id); extra.body = e.body_text.slice(0, 6000); extra.thread = S.emails.filter(x => x.thread_key && x.thread_key === e.thread_key && x.id !== e.id).map(x => ({ from: x.from_addr, received: x.received_at, body: x.body_text.slice(0, 2000) })); }
      if (input.table === "sops") extra.steps = S.sops.find(s => s.id === r.id)?.steps || [];
      return { found: true, record: r, ...extra };
    }
    case "data_checks": { const rows = aiCheck(input.check); return { check: input.check, count: rows.length, rows: rows.slice(0, lim) }; }
    case "propose_action": { if (turn) turn.actions.push(input); return { shown_to_person: true }; }
    default: throw new Error("Unknown tool: " + name);
  }
}

/* ---------- search shared by the assistant and the search page ---------- */
function localSearch(q) {
  const words = String(q || "").toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return [];
  const hit = s => { const t = String(s || "").toLowerCase(); return words.every(w => t.includes(w) || t.replace(/\D/g, "").includes(w.replace(/\D/g, "") || "\u0000")); };
  const out = [];
  ITEMS.forEach(i => { if (hit([i.ext_id, i.name, i.phone, i.area, i.owner, Object.values(i.data || {}).filter(v => typeof v !== "object").join(" ")].join(" "))) out.push({ kind: "item", id: i.id, ref: i.ext_id, title: `${i.ext_id} · ${i.name}`, sub: `${i.area || ""} · ${stageName(i.status)}`, at: iso(i.created) }); });
  S.cust.forEach(c => { if (hit([c.name, c.phone, c.email, c.area, c.notes].join(" "))) out.push({ kind: "customer", id: c.id, title: c.name, sub: [c.phone, c.area].filter(Boolean).join(" · "), at: c.created_at }); });
  S.cases.forEach(c => { const body = S.msgs.filter(m => m.case_id === c.id).map(m => m.body).join(" "); if (hit(c.subject + " " + c.channel + " " + body)) out.push({ kind: "conversation", id: c.id, title: c.subject, sub: `${c.channel} · ${c.status}`, at: c.created_at }); });
  S.emails.forEach(e => { if (hit([e.subject, e.from_name, e.from_addr, e.body_text].join(" "))) out.push({ kind: "email", id: e.id, title: e.subject, sub: e.from_name || e.from_addr, at: e.received_at }); });
  S.sops.forEach(s => { if (hit(s.title + " " + s.category + " " + (s.steps || []).join(" "))) out.push({ kind: "sop", id: s.id, title: s.title, sub: s.category }); });
  S.links.forEach(l => { if (hit(l.name + " " + l.category + " " + (l.description || ""))) out.push({ kind: "link", id: l.id, title: l.name, sub: l.category, url: l.url }); });
  S.people.forEach(p => { if (lvl() >= 1 && hit(p.name + " " + p.job + " " + p.dept)) out.push({ kind: "person", id: p.id, title: p.name, sub: [p.job, p.dept].filter(Boolean).join(" · ") }); });
  return out;
}

/* ---------- the live assistant ---------- */
async function callAssistant(deep) {
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch(AI_URL, { method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: "Bearer " + (session?.access_token || "") }, body: JSON.stringify({ client_id: CLIENT.id, messages: AI.msgs, deep }) });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const err = new Error(j.error || (r.status === 404 ? "The assistant isn't switched on for this workspace yet." : "The assistant couldn't answer right now.")); err.code = j.code || r.status; throw err; }
  return j;
}
async function aiAsk(q) {
  q = String(q || "").trim(); if (!q || AI.busy) return;
  const turn = { q, text: "", trace: [], actions: [], deep: AI.deep, at: Date.now() };
  AI.turns.push(turn); AI.busy = true; renderAI();
  try {
    if (DEMO) { await new Promise(r => setTimeout(r, 450)); Object.assign(turn, demoBrain(q, turn)); }
    else {
      if (AI.msgs.length > 24) AI.msgs = []; // keep conversations short so each question stays cheap
      AI.msgs.push({ role: "user", content: q });
      for (let round = 0; round < 8; round++) {
        const res = await callAssistant(turn.deep);
        AI.msgs.push({ role: "assistant", content: res.content });
        turn.text += res.content.filter(b => b.type === "text").map(b => b.text).join("\n");
        if (res.stop_reason !== "tool_use") break;
        const results = res.content.filter(b => b.type === "tool_use").map(b => {
          let out; try { out = runTool(b.name, b.input, turn); turn.trace.push({ tool: b.name, input: b.input, n: out.total ?? out.count ?? out.rows?.length ?? out.groups?.length ?? out.results?.length }); }
          catch (e) { out = { error: e.message }; turn.trace.push({ tool: b.name, input: b.input, error: e.message }); }
          let s = JSON.stringify(out); if (s.length > 40000) s = s.slice(0, 40000) + "… (cut to fit)";
          return { type: "tool_result", tool_use_id: b.id, content: s, ...(out.error ? { is_error: true } : {}) };
        });
        AI.msgs.push({ role: "user", content: results });
      }
      loadQuota();
    }
  } catch (e) { turn.text = ""; turn.error = e.code === "not_configured" || /switched on/.test(e.message) ? "The assistant isn't switched on for this workspace yet. Jreebs turns it on during setup." : e.message; if (AI.msgs.length && AI.msgs[AI.msgs.length - 1].role === "user") AI.msgs.pop(); }
  AI.busy = false; renderAI();
}
async function loadQuota() { if (DEMO) { AI.quota = { used: 37, limit: 6000, deep_used: 2, deep_limit: 100 }; return; } try { AI.quota = await DB.rpc("ai_quota", { p_client_id: CLIENT.id }); renderAI(); } catch (e) {} }

/* ---------- demo answers: the same lookups, written up without AI ---------- */
const AR = s => /[؀-ۿ]/.test(s);
function mdTable(rows, cols, labels) { if (!rows.length) return "_Nothing found._"; return `| ${(labels || cols).join(" | ")} |\n| ${cols.map(() => "---").join(" | ")} |\n` + rows.map(r => "| " + cols.map(c => String(r[c] ?? "").replace(/\|/g, "/")).join(" | ") + " |").join("\n"); }
function demoBrain(q, turn) {
  const s = q.toLowerCase(), ar = AR(q), T = (tool, input) => { const out = runTool(tool, input, turn); turn.trace.push({ tool, input, n: out.total ?? out.count ?? out.rows?.length ?? out.groups?.length ?? out.results?.length }); return out; };
  const today = isoDay(new Date()), own = WDEF.ownerLabel.toLowerCase();
  const has = (...w) => w.some(x => s.includes(x));
  if (has("summar", "لخص", "ملخص الايميل") && has("email", "mail", "ايميل", "thread")) {
    const e = S.emails.find(x => s.includes(x.subject.toLowerCase())) || S.emails.find(x => x.id === ui.emSel) || S.emails[0];
    T("get_record", { table: "emails", ref: e.id });
    const msgs = threadOf(e), first = msgs[0];
    const sentences = msgs.map(m => m.body_text.replace(/^\s*(hi|hello|dear|مرحبا)[^,\n،]*[,،]?\s*/i, "")).join(" ").replace(/\s+/g, " ").split(/(?<=[.!?؟])\s+/).filter(x => x.length > 12 && !/^(thanks|thank you|regards|best|شكرا)/i.test(x));
    const asks = sentences.filter(x => /\?|please|could|can you|need|by |before|deadline|invoice|confirm|يرجى|ممكن|بدنا|لازم/i.test(x)).slice(0, 4);
    if (asks.length) turn.actions.push({ action: "draft_message", ref: e.id, label: "Reply in your mail app", value: "" });
    return { text: `**${first.subject}** from ${first.from_name || first.from_addr}${msgs.length > 1 ? ` · ${msgs.length} messages` : ""}.\n\n${sentences.slice(0, 2).join(" ")}\n\n**Action items**\n${asks.length ? asks.map(a => "- " + a).join("\n") : "- No direct request found. File it or mark it done."}` };
  }
  if (has("first", "priorit", "what should i", "شو اعمل", "أولوية", "my day")) {
    const mine = aiRows("items").filter(r => r.open && (lvl() > 1 || ITEMS.find(i => i.id === r.id)?.assigned_to === ME.id || !ITEMS.find(i => i.id === r.id)?.assigned_to));
    T("find_records", { table: "items", filters: [{ field: "open", op: "eq", value: true }] });
    const late = mine.filter(r => r.late_min > 0).sort((a, b) => b.late_min - a.late_min), conv = T("data_checks", { check: "stale_conversations" }).rows, em = T("data_checks", { check: "unanswered_emails" }).rows;
    late.slice(0, 2).forEach(r => turn.actions.push({ action: "open_record", ref: r.ref, label: `Open ${r.ref}` }));
    return { text: `${ar ? "ابدأ بهدول:" : "Start with these, in this order:"}\n\n1. **${late.length} late ${WDEF.items.toLowerCase()}**${late.length ? ": " + late.slice(0, 3).map(r => `${r.ref} (${r.late_min} min)`).join(", ") : ""}\n2. **${conv.length} conversations** where the customer wrote last${conv.length ? ": " + conv.slice(0, 3).map(c => c.customer || c.subject).join(", ") : ""}\n3. **${em.length} open emails**${em.length ? ", oldest from " + em[0].from : ""}` };
  }
  if (has("late", "delay", "متأخر", "تأخير", "at risk")) {
    const r = T("data_checks", { check: "late_now" });
    r.rows.slice(0, 2).forEach(x => turn.actions.push({ action: "open_record", ref: x.ref, label: `Open ${x.ref}` }));
    if (r.rows[0]) turn.actions.push({ action: "draft_message", ref: r.rows[0].ref, label: `Send apology to ${r.rows[0].customer.split(" ")[0]}` });
    return { text: `${r.count ? (ar ? `في **${r.count}** متأخرين هلأ.` : `**${r.count} ${r.count === 1 ? WDEF.item.toLowerCase() + " is" : WDEF.items.toLowerCase() + " are"} late right now.**`) : (ar ? "ما في ولا واحد متأخر هلأ." : "Nothing is late right now.")}\n\n${r.count ? mdTable(r.rows.slice(0, 10), ["ref", "customer", "late_min", own, "area"], ["Ref", "Customer", "Late (min)", WDEF.ownerLabel, "Area"]) : ""}` };
  }
  if (has("unassigned", "no driver", "without", "بدون")) {
    const r = T("data_checks", { check: "unassigned_open" });
    return { text: `**${r.count}** open ${WDEF.items.toLowerCase()} have no ${own}.\n\n${mdTable(r.rows.slice(0, 10), ["ref", "customer", "area", "status"], ["Ref", "Customer", "Area", "Status"])}` };
  }
  if (has("on time", "on-time", "ontime", "نسبة", "الالتزام")) {
    const from = isoDay(Date.now() - 6 * 864e5);
    const g = T("summarize", { table: "items", group_by: own, metric: "count", filters: [{ field: "on_time", op: "not_empty" }], date_field: "created", from });
    const rows = aiRows("items").filter(r => r.on_time !== null && r.created >= from);
    const by = {}; rows.forEach(r => { const k = r[own] || "—"; by[k] = by[k] || { n: 0, ok: 0 }; by[k].n++; if (r.on_time) by[k].ok++; });
    const tbl = Object.entries(by).map(([k, v]) => ({ who: k, done: v.n, on_time: Math.round(v.ok / v.n * 100) + "%" })).sort((a, b) => parseInt(b.on_time) - parseInt(a.on_time));
    const all = rows.length ? Math.round(rows.filter(r => r.on_time).length / rows.length * 100) : 0;
    void g;
    return { text: `**${all}% on time** over the last 7 days (${rows.length} finished, target ${TARGETS().ontime}%).\n\n${mdTable(tbl, ["who", "done", "on_time"], [WDEF.ownerLabel, "Finished", "On time"])}` };
  }
  if (has("area", "منطقة", "مناطق")) {
    const g = T("summarize", { table: "items", group_by: "area", metric: "count", date_field: "created", from: today });
    return { text: `${WDEF.items} today by area (${g.total_records} in total):\n\n${mdTable(g.groups.slice(0, 12), ["group", "value"], ["Area", WDEF.items])}` };
  }
  if (has("driver", "busiest", "most open", "who has", "سائق", "مين عنده") || s.includes(own)) {
    const g = T("summarize", { table: "items", group_by: own, metric: "count", filters: [{ field: "open", op: "eq", value: true }] });
    return { text: `Open ${WDEF.items.toLowerCase()} by ${own} right now:\n\n${mdTable(g.groups.filter(x => x.group !== "—" && x.group !== "").slice(0, 12), ["group", "value"], [WDEF.ownerLabel, "Open"])}${g.groups.find(x => x.group === "" || x.group === "—") ? `\n\n${g.groups.find(x => x.group === "" || x.group === "—").value} still have no ${own}.` : ""}` };
  }
  if (has("conversation", "inbox", "complain", "waiting", "reply", "شكاوى", "محادث", "رد")) {
    const r = T("data_checks", { check: "stale_conversations" });
    r.rows.slice(0, 1).forEach(c => turn.actions.push({ action: "open_record", ref: c.id, label: `Open "${c.subject.slice(0, 30)}"` }));
    return { text: `**${r.count}** open conversations are waiting on your team (the customer wrote last).\n\n${mdTable(r.rows.slice(0, 10), ["customer", "channel", "subject", "assignee"], ["Customer", "Channel", "Subject", "Assigned to"])}` };
  }
  if (has("email", "mail", "ايميل", "بريد")) {
    const r = T("data_checks", { check: "unanswered_emails" });
    return { text: `**${r.count}** emails are still open.\n\n${mdTable(r.rows.slice(0, 10), ["from", "subject", "received"], ["From", "Subject", "Received"])}`.replace(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})[^ |]*/g, "$1 $2") };
  }
  if (has("duplicate", "missing", "data problem", "data quality", "clean", "fix", "بيانات", "مكرر")) {
    const d = T("data_checks", { check: "duplicate_customers" }), m = T("data_checks", { check: "missing_phone" }), a = T("data_checks", { check: "access_issues" });
    return { text: `I checked three things:\n\n- **${d.count}** phone numbers belong to more than one customer record${d.count ? ": " + d.rows.slice(0, 3).map(x => x.names).join("; ") : ""}.\n- **${m.count}** customers have no phone number.\n- **${a.count}** access problems, such as people who left but still have logins${a.count ? ": " + a.rows.slice(0, 3).map(x => x.person).join(", ") : ""}.` };
  }
  if (has("sop", "procedure", "read", "إجراء")) {
    const r = T("data_checks", { check: "sop_unread" });
    return { text: `**${r.count}** SOPs haven't been read by everyone who should.\n\n${mdTable(r.rows, ["title", "read_by", "should_read"], ["SOP", "Read", "Should read"])}` };
  }
  if (has("file", "licen", "expir", "insurance", "ترخيص", "وثيق", "renew", "subscription", "اشتراك")) {
    const f = T("data_checks", { check: "expiring_files" }), r = T("data_checks", { check: "renewals_due" });
    return { text: `**Files expiring in the next 45 days:** ${f.count}\n\n${mdTable(f.rows, ["name", "expires_on", "days_left"], ["File", "Expires", "Days left"])}\n\n**Subscriptions renewing in 30 days:** ${r.count}\n\n${mdTable(r.rows, ["name", "monthly_cost_jod", "renews_on"], ["Service", "JOD / month", "Renews"])}` };
  }
  if (has("qa", "quality", "coach", "score", "جودة")) {
    const g = T("summarize", { table: "qa_reviews", group_by: "agent", metric: "avg", metric_field: "score" });
    return { text: `Average quality score by agent (target ${TARGETS().qa}%):\n\n${mdTable(g.groups.map(x => ({ ...x, value: x.value + "%" })), ["group", "value", "records"], ["Agent", "Average", "Reviews"])}` };
  }
  if (has("today", "doing", "overview", "summary", "اليوم", "ملخص", "وضعنا")) {
    const items = aiRows("items").filter(r => r.created >= today), done = items.filter(r => r.status === stageName(WDEF.done)), late = T("data_checks", { check: "late_now" }), conv = T("data_checks", { check: "stale_conversations" }), em = T("data_checks", { check: "unanswered_emails" });
    T("summarize", { table: "items", metric: "count", date_field: "created", from: today });
    const ok = done.filter(r => r.on_time).length;
    return { text: ar ? `**اليوم لحد هلأ:** ${items.length} ${WDEF.items}، ${done.length} خلصوا (${done.length ? Math.round(ok / done.length * 100) : 0}% بالوقت).\n\n- ${late.count} متأخرين هلأ\n- ${conv.count} محادثات بتستنى رد\n- ${em.count} ايميلات مفتوحة` : `**Today so far:** ${items.length} ${WDEF.items.toLowerCase()}, ${done.length} finished, ${done.length ? Math.round(ok / done.length * 100) : 0}% on time.\n\n- ${late.count} late right now${late.count ? " (" + late.rows.slice(0, 3).map(x => x.ref).join(", ") + ")" : ""}\n- ${conv.count} conversations waiting for a reply\n- ${em.count} open emails` };
  }
  const r = T("search", { query: q.replace(/^(find|show|search|where is|who is|ابحث عن|وين)\s+/i, "") });
  if (r.results.length) return { text: `I found **${r.results.length}** matches:\n\n${mdTable(r.results.slice(0, 10), ["type", "title", "detail"], ["Type", "Match", "Detail"])}` };
  return { text: `In the demo the assistant answers questions like the suggestions below. With your own account it answers any question about your data.` };
}

/* ---------- rendering ---------- */
function mdLite(src) {
  const lines = esc(src).split("\n"), out = []; let i = 0;
  const inline = s => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|\s)_([^_]+)_(?=\s|$)/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\b([A-Z]-\d{3,6})\b/g, (m) => { const it = ITEMS.find(x => x.ext_id === m); return it ? `<button class="ref" type="button" data-oo="${it.id}">${m}</button>` : m; });
  while (i < lines.length) {
    const l = lines[i];
    if (/^\|.*\|\s*$/.test(l) && /^\|\s*-/.test(lines[i + 1] || "")) {
      const head = l.split("|").slice(1, -1).map(c => c.trim()); i += 2; const body = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) { body.push(lines[i].split("|").slice(1, -1).map(c => c.trim())); i++; }
      out.push(`<div class="tw"><table class="t compact"><thead><tr>${head.map(h => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`); continue;
    }
    if (/^\s*[-*] /.test(l)) { const items = []; while (i < lines.length && /^\s*[-*] /.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*] /, "")); out.push(`<ul>${items.map(x => `<li>${inline(x)}</li>`).join("")}</ul>`); continue; }
    if (/^\s*\d+\. /.test(l)) { const items = []; while (i < lines.length && /^\s*\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\. /, "")); out.push(`<ol>${items.map(x => `<li>${inline(x)}</li>`).join("")}</ol>`); continue; }
    if (/^#{1,4} /.test(l)) { out.push(`<p><b>${inline(l.replace(/^#+ /, ""))}</b></p>`); i++; continue; }
    if (l.trim()) out.push(`<p>${inline(l)}</p>`); i++;
  }
  return out.join("");
}
const AI_SUGGEST = () => lvl() === 0 ? ["What should I do first?", "Which of my stops are late?"]
  : lvl() === 1 ? ["What should I do first?", "Which orders are late right now?", "Conversations waiting for a reply", "Open emails"]
  : lvl() <= 3 ? ["How are we doing today?", "Which orders are late right now?", "Who has the most open orders?", "Quality scores by agent", "Conversations waiting for a reply"]
  : ["How are we doing today?", "On-time rate by driver this week", "Any data problems I should fix?", "Files or subscriptions renewing soon", "SOPs people haven't read", "كيف وضعنا اليوم؟"];
const TOOL_LABEL = { workspace_overview: "Looked at the workspace", find_records: "Listed records", summarize: "Counted", search: "Searched", get_record: "Opened a record", data_checks: "Ran a check", propose_action: "Suggested an action" };
function actionBtn(a) {
  const it = ITEMS.find(x => x.ext_id === a.ref || x.id === a.ref), cv = S.cases.find(x => x.id === a.ref), em = S.emails.find(x => x.id === a.ref);
  if (a.action === "draft_message" && em) return `<a class="btn sm" href="mailto:${esc(em.from_addr)}?subject=${encodeURIComponent("Re: " + em.subject)}">${ic("msg")}${esc(a.label)}</a>`;
  if (a.action === "draft_message" && it) return `<button class="btn sm" type="button" data-msg="${it.id}" data-tpl="${esc(WDEF.templates[0][0])}">${ic("wa")}${esc(a.label)}</button>`;
  if (a.action === "assign" && it) return `<button class="btn sm" type="button" data-assign="${it.id}">${ic("truck")}${esc(a.label)}</button>`;
  if (it) return `<button class="btn sm" type="button" data-oo="${it.id}">${esc(a.label)}</button>`;
  if (cv) return `<button class="btn sm" type="button" data-cv="${cv.id}">${esc(a.label)}</button>`;
  if (em) return `<button class="btn sm" type="button" data-em="${em.id}">${esc(a.label)}</button>`;
  return "";
}
function renderAI() {
  const p = $("#ai"); if (!p) return;
  p.hidden = !AI.open; document.body.classList.toggle("ai-on", AI.open);
  if (!AI.open) return;
  const q = AI.quota;
  p.innerHTML = `<div class="ai-h"><div class="grow"><b>Assistant</b><span class="small muted">Answers from ${esc(CLIENT?.name || "your")} data, with your access</span></div>
      ${lvl() >= 2 ? `<label class="row small ai-deep" title="Uses a stronger model. Counts toward the monthly deep-analysis allowance."><input type="checkbox" id="aiDeep" ${AI.deep ? "checked" : ""}>Deep analysis</label>` : ""}
      ${AI.turns.length ? `<button class="ib" type="button" data-ainew="1" title="New conversation" aria-label="New conversation">${ic("refresh")}</button>` : ""}
      <button class="ib" type="button" data-aiclose="1" aria-label="Close assistant">${ic("x")}</button></div>
    <div class="ai-b" id="aiBody">${AI.turns.length ? AI.turns.map(t => `<div class="ai-q">${esc(t.q)}</div>
      <div class="ai-a">${t.error ? `<div class="note-box warn">${ic("info")}<span>${esc(t.error)}</span></div>` : t.text ? mdLite(t.text) : `<div class="ai-wait"><span></span><span></span><span></span></div>`}
        ${t.actions.length ? `<div class="row ai-acts">${t.actions.map(actionBtn).join("")}</div>` : ""}
        ${t.trace.length ? `<details class="ai-trace"><summary>How I got this · ${t.trace.length} lookup${t.trace.length > 1 ? "s" : ""}${t.deep ? " · deep analysis" : ""}</summary><ul>${t.trace.map(x => `<li>${esc(TOOL_LABEL[x.tool] || x.tool)}${x.input?.table ? ` in <b>${esc(x.input.table)}</b>` : ""}${x.input?.check ? `: ${esc(x.input.check.replace(/_/g, " "))}` : ""}${x.input?.query ? `: “${esc(x.input.query)}”` : ""}${x.input?.group_by ? ` by ${esc(x.input.group_by)}` : ""}${x.error ? ` · <span class="crit-t">${esc(x.error)}</span>` : x.n != null ? ` · ${x.n} found` : ""}</li>`).join("")}</ul></details>` : ""}</div>`).join("")
      : `<div class="ai-empty"><p>Ask about orders, customers, conversations, emails, your team, SOPs or reports. Answers use only what your role can see, and every answer shows how it was found.</p>${DEMO ? `<p class="small muted">Demo: answers are built from the sample company's data without AI. With your own account, the assistant answers any question about your data.</p>` : ""}</div>`}</div>
    <div class="ai-f">
      <div class="chips ai-sugg">${AI_SUGGEST().map(s => `<button class="chip" type="button" data-aiq="${esc(s)}">${esc(s)}</button>`).join("")}</div>
      <form class="ai-in" id="aiForm"><textarea class="in" id="aiText" rows="2" placeholder="Ask a question… (Enter to send)" ${AI.busy ? "disabled" : ""}></textarea><button class="btn go" type="submit" ${AI.busy ? "disabled" : ""}>${AI.busy ? "Working…" : "Ask"}</button></form>
      ${q ? `<div class="small muted">${fmtN(q.used)} of ${fmtN(q.limit)} questions this month${lvl() >= 2 ? ` · ${q.deep_used} of ${q.deep_limit} deep analyses` : ""}</div>` : ""}
    </div>`;
  const b = $("#aiBody"); if (b) b.scrollTop = b.scrollHeight;
  const ta = $("#aiText"); if (ta && !AI.busy) { ta.focus(); ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); aiAsk(ta.value); } }; }
  $("#aiForm").onsubmit = e => { e.preventDefault(); aiAsk($("#aiText").value); };
  const dp = $("#aiDeep"); if (dp) dp.onchange = e => { AI.deep = e.target.checked; };
}
function toggleAI(force) { AI.open = force ?? !AI.open; if (AI.open && !AI.quota) loadQuota(); renderAI(); }
function askAI(q) { toggleAI(true); aiAsk(q); }

/* ---------- global search page ---------- */
let GS = { q: "", res: [], busy: false };
async function runSearch(q) {
  GS = { q, res: localSearch(q), busy: !DEMO };
  if (!DEMO && q.trim().length >= 2) {
    try {
      const rows = await DB.rpc("search_all", { p_client_id: CLIENT.id, p_q: q, p_limit: 30 });
      const seen = new Set(GS.res.map(r => r.kind + r.id));
      (rows || []).forEach(r => { const kind = r.kind === "message" ? "conversation" : r.kind; if (!seen.has(kind + r.id)) { seen.add(kind + r.id); GS.res.push({ kind, id: r.id, title: r.title, sub: r.sub, at: r.at, older: true }); } });
    } catch (e) { console.warn("search", e); }
  }
  GS.busy = false; if (view === "search") render();
}
const KIND = { item: () => WDEF.items, customer: () => "Customers", conversation: () => "Conversations", email: () => "Emails", sop: () => "SOPs", link: () => "Tools & systems", person: () => "People" };
VIEWS.search = function () {
  const groups = {}; GS.res.forEach(r => (groups[r.kind] = groups[r.kind] || []).push(r));
  const open = r => r.kind === "item" ? (ITEMS.some(i => i.id === r.id) ? `data-oo="${r.id}"` : "") : r.kind === "customer" ? `data-cu="${r.id}"` : r.kind === "conversation" ? `data-cv="${r.id}"` : r.kind === "email" ? `data-em="${r.id}"` : r.kind === "sop" ? `data-sop="${r.id}"` : r.kind === "person" && lvl() >= 4 ? `data-modal="person" data-pid="${r.id}"` : "";
  return `${head("Search", GS.q ? `${GS.res.length} result${GS.res.length === 1 ? "" : "s"} for “${esc(GS.q)}”` : "Search every record you can open: orders, customers, conversations, emails, SOPs, tools and people.", `<button class="btn" type="button" data-aiq="${esc("Find " + GS.q)}">${ic("spark")}Ask the assistant</button>`)}
  ${GS.busy ? `<div class="loading">Searching older records…</div>` : ""}
  ${GS.q && !GS.res.length && !GS.busy ? `<section class="card"><div class="card-b">${empty("Nothing matches. Try a phone number, an order number or part of a name.")}</div></section>` : ""}
  ${Object.entries(groups).map(([k, rows]) => `<section class="card"><div class="card-h"><h3>${esc(KIND[k] ? KIND[k]() : k)}</h3><span class="small muted">${rows.length}</span></div><div class="tw"><table class="t"><tbody>${rows.slice(0, 25).map(r => `<tr ${r.kind === "link" && r.url ? "" : ""}><td><b>${r.kind === "link" && r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : `<button class="linkbtn" type="button" ${open(r)}>${esc(r.title)}</button>`}</b></td><td class="muted">${esc(r.sub || "")}</td><td class="r muted small">${r.at ? dShort(r.at) : ""}</td></tr>`).join("")}</tbody></table></div></section>`).join("")}`;
};
