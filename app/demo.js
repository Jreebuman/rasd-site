/* Demo mode (?demo): the same app on an in-memory copy of the database, filled with a sample delivery company. */
const clone = o => JSON.parse(JSON.stringify(o));
function makeDemoDB(mem) {
  const now = () => new Date().toISOString();
  const defaults = t => ({ activity: { at: now(), kind: "" }, items: { created: now(), data: {}, hist: [], updated_at: now() }, customers: { tags: [], notes: "", created_at: now() }, cases: { status: "open", created_at: now(), updated_at: now(), kind: "Question", channel: "WhatsApp" }, case_messages: { created_at: now() }, people: { tools: [], active: true, emp_type: "Full-time", phone: "", email: "", job: "", dept: "Operations" }, sops: { roles: [], tools: [], steps: [], reviewed_on: isoDay(new Date()), created_at: now(), format: "Checklist" }, rules: { enabled: true }, qa_reviews: { created_at: now() }, tickets: { status: "Open", created_at: now() }, templates: {}, links: { sso: false, health: "Healthy", description: "" }, platforms: {}, documents: { created_at: now() }, shifts: {}, sop_reads: { read_at: now() }, clients: { created_at: now() } }[t] || {});
  const match = (r, o) => Object.entries(o.eq || {}).every(([k, v]) => r[k] === v) && Object.entries(o.gte || {}).every(([k, v]) => String(r[k] ?? "") >= String(v)) && Object.entries(o.notIn || {}).every(([k, v]) => !v.includes(r[k]));
  const linkCustomer = r => { if (r.customer_id || !r.phone) return; let c = mem.customers.find(x => x.client_id === r.client_id && x.phone === r.phone); if (!c) { c = { id: uid(), client_id: r.client_id, name: r.name, phone: r.phone, area: r.area, ...defaults("customers") }; mem.customers.push(c); } r.customer_id = c.id; };
  return {
    async list(t, o = {}) { let rows = (mem[t] || []).filter(r => match(r, o)); if (o.order) { const [k, asc] = o.order; rows = rows.slice().sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)); } if (o.limit) rows = rows.slice(0, o.limit); return clone(rows); },
    async insert(t, rows) { rows = (Array.isArray(rows) ? rows : [rows]).map(r => ({ id: uid(), ...defaults(t), ...clone(r) })); if (t === "items") rows.forEach(linkCustomer); mem[t] = [...(mem[t] || []), ...rows]; return clone(rows); },
    async update(t, id, patch, col = "id") { const r = (mem[t] || []).find(x => x[col] === id); if (!r) throw new Error("Not found"); Object.assign(r, clone(patch)); return clone(r); },
    async upsert(t, rows, onConflict) { const keys = onConflict.split(","), out = []; for (const row of (Array.isArray(rows) ? rows : [rows])) { const ex = (mem[t] || []).find(x => keys.every(k => x[k] === row[k])); if (ex) { Object.assign(ex, clone(row)); out.push(clone(ex)); } else out.push(...await this.insert(t, row)); } return out; },
    async remove(t, id, col = "id") { mem[t] = (mem[t] || []).filter(x => x[col] !== id); },
    async rpc(n, a) {
      if (n === "client_team") return clone(mem.team);
      if (n === "update_client_config") { CLIENT.config = { ...(CLIENT.config || {}), ...a.p_patch }; return clone(CLIENT.config); }
      if (n === "client_invite_user") { const ex = mem.team.find(m => m.email.toLowerCase() === a.p_email.toLowerCase()); if (ex) { if (ex.role === "owner") throw new Error("The owner's role can't be changed."); ex.role = a.p_role; } else mem.team.push({ auth_user_id: "u-" + uid(), email: a.p_email, role: a.p_role }); return null; }
      if (n === "client_remove_user") { mem.team = mem.team.filter(m => m.auth_user_id !== a.p_user_id); return null; }
      return null;
    }
  };
}

function demoData() {
  let seed = 20261018; const R = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
  const cid = "demo-client", iso = m => new Date(m * 60000).toISOString(), NOW = nowM(), T0 = mins(startOfDay().getTime());
  const T = [["owner", "Rana Haddad"], ["manager", "Omar Khalil"], ["team_lead", "Lina Saleh"], ["supervisor", "Yazan Qasem"], ["agent", "Dana Odeh"], ["agent", "Bilal Nasser"], ["agent", "Sara Mansour"], ["agent", "Hamza Ali"], ["driver", "Saif Kurdi"], ["driver", "Majd Abbadi"], ["driver", "Rami Shami"], ["driver", "Fadi Hijazi"], ["driver", "Khaled Masri"]];
  const team = T.map(([role, n], i) => ({ auth_user_id: "u-" + i, email: n.toLowerCase().replace(" ", ".") + "@swift-delivery.jo", role }));
  const people = T.map(([role, n], i) => ({ id: "p-" + i, client_id: cid, name: n, phone: "07" + ri(7, 9) + " " + ri(100, 999) + " " + ri(1000, 9999), email: team[i].email, dept: DEPT_OF_ROLE[role], job: { owner: "Owner", manager: "Operations manager", team_lead: "Customer care lead", supervisor: "Shift supervisor", agent: "Coordinator", driver: "Driver" }[role], emp_type: role === "driver" && i > 10 ? "Contractor" : "Full-time", auth_user_id: team[i].auth_user_id, ends_on: null, tools: [...(STD_TOOLS[DEPT_OF_ROLE[role]] || [])], active: true }));
  people.find(p => p.name === "Hamza Ali").tools.push("Odoo");
  const ends = new Date(); ends.setDate(ends.getDate() + 9);
  people.push({ id: "p-x1", client_id: cid, name: "Ruba Bitar", phone: "", email: "", dept: "Finance", job: "Accountant", emp_type: "Full-time", auth_user_id: null, ends_on: null, tools: ["Gmail", "Google Sheets", "Odoo", "Bank portal"], active: true },
    { id: "p-x2", client_id: cid, name: "Karam Abbadi", phone: "", email: "", dept: "IT", job: "IT support", emp_type: "Contractor", auth_user_id: null, ends_on: isoDay(ends), tools: ["Gmail", "Google Drive", "Google Workspace admin"], active: true },
    { id: "p-x3", client_id: cid, name: "Hadi Kurdi", phone: "", email: "", dept: "Customer care", job: "Former coordinator", emp_type: "Full-time", auth_user_id: null, ends_on: null, tools: ["Talabat Partner Hub"], active: false });
  const AREAS = ["Abdoun", "Khalda", "Sweifieh", "Jubaiha", "Marj Al-Hamam", "Tla' Al Ali", "Shmeisani", "Dabouq", "Jabal Amman", "Rabieh"];
  const STORES = ["Fresh Mart", "Pharma Plus", "Sweet Corner", "Burger Lab", "Green Basket", "Daily Bakery"];
  const FIRST = ["Ahmad", "Lina", "Majd", "Reem", "Rania", "Zaid", "Omar", "Sara", "Hala", "Yousef", "Dima", "Fadi", "Noor", "Tala", "Laith", "Rawan", "Khaled", "Jana", "Maya", "Basel", "Leen", "Odai", "Farah", "Nadia", "Sami", "Ruba", "Tamer", "Aseel", "Karam", "Dana"];
  const LAST = ["Haddad", "Khalil", "Rawashdeh", "Masri", "Nasser", "Odeh", "Zoubi", "Qasem", "Mansour", "Hijazi", "Bitar", "Nimri"];
  const customers = FIRST.map((f, i) => ({ id: "c-" + i, client_id: cid, name: f + " " + pick(LAST), phone: "07" + pick(["7", "8", "9"]) + " " + ri(100, 999) + " " + ri(1000, 9999), area: pick(AREAS), tags: i % 9 === 0 ? ["VIP"] : i % 5 === 0 ? ["Repeat"] : [], notes: "", lang: i % 3 === 0 ? "ar" : null, created_at: iso(T0 - ri(20, 400) * 1440) }));
  const agents = team.filter(m => m.role === "agent"), drivers = T.filter(([r]) => r === "driver").map(([, n], i) => ({ n, uid: team.find(m => m.email.startsWith(n.toLowerCase().split(" ")[0]))?.auth_user_id }));
  const items = []; let num = 1000;
  for (let day = 13; day >= 0; day--) {
    const base = T0 - day * 1440, count = day === 0 ? 0 : ri(32, 46);
    const mk = (created, status) => { const c = pick(customers), dr = pick(drivers), it = { id: "i-" + num, client_id: cid, ext_id: "D-" + num++, name: c.name, phone: c.phone, area: c.area, customer_id: c.id, status, created: iso(created), due: iso(created + 40), owner: null, owner_user: null, assigned_to: pick(agents).auth_user_id, data: { store: pick(STORES), value: ri(6, 48) + (R() < .5 ? .5 : 0), t: {} }, hist: [{ at: iso(created), text: "Created", by: pick(agents).email }] };
      if (status !== "new") { const a = created + ri(2, 7); it.owner = dr.n; it.owner_user = dr.uid; it.data.t.assigned = a * 60000; if (status !== "assigned") { const p = a + ri(8, 22); it.data.t.picked = p * 60000; if (status === "delivered") it.data.t.delivered = Math.min(created + ri(20, 46), NOW - 1) * 60000; if (status === "failed") it.data.t.failed = (p + ri(10, 25)) * 60000; } }
      items.push(it); };
    if (day > 0) for (let k = 0; k < count; k++) mk(base + 480 + Math.round(k * 840 / count) + ri(-5, 5), R() < .04 ? "failed" : "delivered");
    else { const start = Math.max(T0 + 2, NOW - 480), span = Math.max(20, NOW - start - 1); for (let k = 0; k < 34; k++) { const created = start + Math.round(k * span / 34); const age = NOW - created; mk(created, age > 90 ? (k % 13 === 5 ? "failed" : "delivered") : age > 50 ? (R() < .5 ? "picked" : "delivered") : age > 22 ? (R() < .6 ? "assigned" : "picked") : age > 8 ? (R() < .5 ? "new" : "assigned") : "new"); } }
  }
  const open = items.filter(i => !["delivered", "failed"].includes(i.status)), late = open.filter(i => NOW > mins(new Date(i.due).getTime()));
  const L = k => late[k] || open[k] || items[items.length - 1 - k];
  const cases = [], case_messages = [];
  const addCase = (it, kind, channel, status, assignee, ago, msgs) => { const id = "cv-" + cases.length; const at = NOW - ago; cases.push({ id, client_id: cid, item_id: it?.id || null, customer_id: it?.customer_id || pick(customers).id, subject: msgs[0][1].slice(0, 80), channel, kind, status, assignee, reply_by: kind === "Complaint" && status === "open" && !msgs.some(m => m[0] === "out") ? iso(at + 15) : null, created_at: iso(at), updated_at: iso(at + (msgs.length - 1)) }); msgs.forEach(([dir, body, by], k) => case_messages.push({ id: id + "-" + k, client_id: cid, case_id: id, dir, body, author_email: by || null, created_at: iso(at + k) })); };
  addCase(L(0), "Complaint", "WhatsApp", "open", agents[0].auth_user_id, 6, [["in", "Hi, my order was supposed to arrive 20 minutes ago. Where is it?"]]);
  addCase(L(1), "Complaint", "Talabat", "open", agents[2].auth_user_id, 12, [["in", "Talabat complaint: the order arrived cold."], ["note", "Lina: check prep time with Burger Lab, third one this week.", team[2].email]]);
  addCase(open[3] || items[5], "Change request", "WhatsApp", "open", null, 3, [["in", "مرحبا، ممكن أغير العنوان؟ أنا هلأ بالمكتب مش بالبيت"]]);
  addCase(null, "Question", "Instagram", "open", agents[1].auth_user_id, 25, [["in", "Do you deliver to Dabouq after 10pm?"]]);
  addCase(items[items.length - 20], "Complaint", "Phone call", "pending", agents[1].auth_user_id, 48, [["sys", "Call · 3 min"], ["in", "One item missing (bread)."], ["out", "We're checking with the store and will update you within 15 minutes.", agents[1].email]]);
  addCase(items[items.length - 40], "Feedback", "WhatsApp", "resolved", agents[0].auth_user_id, 210, [["out", "How did we do? Reply 1–5.", agents[0].email], ["in", "5, fast as always"]]);
  const qa = [["Sara Mansour", [5, 5, 5, 5, 4], "Fast fix, clear wording, offered a replacement without being asked."], ["Hamza Ali", [4, 3, 4, 3, 4], "Didn't confirm the address before closing. Coaching session booked."], ["Dana Odeh", [5, 5, 4, 5, 5], "Good use of the late-order template, personalised the opening."], ["Bilal Nasser", [4, 4, 5, 4, 4], "Calm with an upset customer. Log the note before transferring."], ["Hamza Ali", [4, 4, 3, 4, 3], "Promised a refund without approval. Reviewed the policy together."]].map(([n, s, note], i) => ({ id: "qa-" + i, client_id: cid, agent_name: n, person_id: people.find(p => p.name === n)?.id, ref: pick(customers).name, channel: pick(["WhatsApp", "Phone call"]), scores: s, note, reviewer_email: i % 2 ? team[3].email : team[2].email, created_at: iso(NOW - ri(60, 9000)) }));
  const tpls = WDEF.templates.map(([key, name, category, en, ar], i) => ({ id: "t-" + i, client_id: cid, key, name, category, en, ar }));
  const links = [...DEFAULT_TOOLS.map(([kind, category, name, url], i) => ({ id: "l-" + i, client_id: cid, kind, category, name, url, description: "", sso: false, health: "Healthy" })),
    { id: "l-s1", client_id: cid, kind: "system", category: "Finance", name: "Odoo ERP", url: "https://www.odoo.com/", description: "Accounting, invoices and stock", sso: true, health: "Healthy" },
    { id: "l-s2", client_id: cid, kind: "system", category: "Management", name: "Metabase dashboards", url: "", description: "Management reporting", sso: true, health: "Healthy" },
    { id: "l-s3", client_id: cid, kind: "system", category: "Operations", name: "Store stock database", url: "", description: "Live stock at partner stores", sso: false, health: "Slow" }];
  const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return isoDay(x); };
  const plats = [["Jreebs", "Operations desk", "Growth", 99, 14, "Rana Haddad"], ["WhatsApp Business", "Customer messaging", "Pay per conversation", 42, 30, "Omar Khalil"], ["Google Workspace", "Email and files", "Business Starter · 14 users", 59, 86, "Karam Abbadi"], ["Odoo", "Accounting and stock", "Standard · 3 users", 64, 10, "Ruba Bitar"], ["Shopify", "Online store", "Basic", 28, 18, "Omar Khalil"]].map(([name, purpose, plan, cost, days, owner], i) => ({ id: "pl-" + i, client_id: cid, name, purpose, plan, cost, renews_on: d(days), owner_name: owner, status: "Operational" }));
  const docs = [["Commercial registration", "Compliance", 160], ["Municipal trade license", "License", 26], ["Tax registration certificate", "Compliance", null], ["Fleet vehicle insurance", "Insurance", -3]].map(([name, kind, days], i) => ({ id: "dc-" + i, client_id: cid, name, kind, expires_on: days == null ? null : d(days), storage_path: null, created_at: iso(NOW - 40000) }));
  const sops = [...STARTER_SOPS.delivery, SHIFT_SOP, ["Driver end-of-shift cash handover", "Field", ["driver", "supervisor"], ["Jreebs"], ["Count cash-on-delivery money against your list in the app.", "Hand it to the shift supervisor; both confirm the amount.", "Any difference over 1 JOD gets a note with the order numbers."]]].map(([title, category, roles, tools, steps], i) => ({ id: "s-" + i, client_id: cid, title, category, roles, tools, steps, format: "Checklist", owner_name: i % 2 ? "Yazan Qasem" : "Lina Saleh", reviewed_on: d(i === 3 ? -120 : -ri(2, 40)), created_at: iso(NOW - 50000) }));
  const sop_reads = []; sops.forEach(s => team.filter(m => s.roles.includes(m.role)).forEach((m, k) => { if (k % 3 !== 2) sop_reads.push({ sop_id: s.id, client_id: cid, auth_user_id: m.auth_user_id, read_at: iso(NOW - 3000) }); }));
  const ws = weekStart(), codes = ["08–16", "12–20", "16–24", "Off"], shifts = [];
  people.filter(p => p.active && p.auth_user_id).forEach((p, i) => { for (let k = 0; k < 7; k++) { const x = new Date(ws); x.setDate(x.getDate() + k); shifts.push({ id: `sh-${i}-${k}`, client_id: cid, person_id: p.id, day: isoDay(x), shift: codes[(k + i) % 7 === 6 ? 3 : (i + Math.floor(k / 3)) % 3] }); } });
  const activity = [[1, `${L(0).ext_id} flagged late`, null], [3, `WhatsApp sent to ${L(1).name} (${L(1).ext_id})`, agents[0].email], [9, `${items[items.length - 8].ext_id} marked Delivered`, null], [12, "Complaint logged from a customer (Talabat)", agents[2].email], [24, "Time limits and targets updated", team[1].email], [90, "Imported 38 orders from orders_morning.csv", team[1].email], [400, "Starter content added: message templates, tools, starter SOPs", team[0].email]].map(([ago, text, by], i) => ({ id: "a-" + i, client_id: cid, at: iso(NOW - ago), text, actor_email: by, kind: /Imported/.test(text) ? "import" : "" }));
  const rules = [{ id: "r-1", client_id: cid, rule_id: "c-vip", enabled: true, def: { name: "VIP order waiting", when: "created", mins: 20, cond: "tag", val: "VIP", label: "VIP waiting 20+ min", sev: 3, tpl: "late" } }];
  return { team, clients: [{ id: cid, name: "Swift Delivery (demo)", slug: "swift-demo", workspace_type: "delivery", plan: "growth", config: {}, created_at: iso(NOW - 60000) }], items, customers, cases, case_messages, people, shifts, qa_reviews: qa, templates: tpls, links, platforms: plats, documents: docs, sops, sop_reads, activity, rules, tickets: [{ id: "tk-1", client_id: cid, subject: "Connect Talabat", details: "Bring Talabat complaints into the Inbox", urgency: "Normal", status: "In progress", created_by_email: team[1].email, created_at: iso(NOW - 2880) }],
    company_profile: [{ client_id: cid, legal_name: "Swift Delivery Services LLC", trade_name: "Swift Delivery", reg_no: "200·xxxxx (sample)", tax_id: "018·xxxxx (sample)", address: "Building 12, Wadi Saqra St, Amman", founded: "2021", wa_sender: "Swift Delivery" }] };
}

let DEMO_MEM = null;
async function demoBoot() {
  WDEF = WS.delivery;
  DEMO_MEM = demoData();
  DB = makeDemoDB(DEMO_MEM);
  const role = $("#roleSel").value || "owner";
  setDemoRole(role, true);
  await openClient(clone(DEMO_MEM.clients[0]));
  DEMO_MEM.team.slice(0, 9).forEach((m, i) => { if (i % 4 !== 3) ONLINE.set(m.auth_user_id, { email: m.email }); });
  render();
}
function setDemoRole(role, quiet) {
  const m = DEMO_MEM.team.find(x => x.role === role) || DEMO_MEM.team[0];
  ME = { id: m.auth_user_id, email: m.email, role: m.role, lvl: ROLES[m.role].lvl, memberships: [{ client_id: "demo-client", role: m.role }] };
  ONLINE.set(m.auth_user_id, { email: m.email });
  if (!quiet) { ui.sel.clear(); ui.report = null; ui.convo = null; closeDrawer(); closeModal(); if (lvl() < navMin(view) || (lvl() === 0 && navMin(view) > 0)) view = "home"; render(); toast(`Now viewing as ${ROLES[role].label}. Locked items show what this role can't open.`); }
}
document.getElementById("roleSel").addEventListener("change", e => { if (DEMO) setDemoRole(e.target.value); });
