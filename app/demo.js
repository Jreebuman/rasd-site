/* Demo mode (?demo): the same app on an in-memory copy of the database, filled with a sample delivery company. */
const clone = o => JSON.parse(JSON.stringify(o));
function makeDemoDB(mem) {
  const now = () => new Date().toISOString();
  const defaults = t => ({ activity: { at: now(), kind: "" }, items: { created: now(), data: {}, hist: [], updated_at: now() }, customers: { tags: [], notes: "", created_at: now() }, cases: { status: "open", created_at: now(), updated_at: now(), kind: "Question", channel: "WhatsApp" }, case_messages: { created_at: now() }, people: { tools: [], active: true, emp_type: "Full-time", phone: "", email: "", job: "", dept: "Operations" }, sops: { roles: [], tools: [], steps: [], reviewed_on: isoDay(new Date()), created_at: now(), format: "Checklist" }, rules: { enabled: true }, qa_reviews: { created_at: now() }, tickets: { status: "Open", created_at: now() }, templates: {}, links: { sso: false, health: "Healthy", description: "" }, platforms: {}, documents: { created_at: now() }, shifts: {}, sop_reads: { read_at: now() }, clients: { created_at: now(), config: {} }, approvals: { status: "pending", created_at: now() }, emails: { status: "open", labels: [], has_attachments: false, created_at: now(), received_at: now() }, mailboxes: { created_at: now(), min_lvl: 1, inbound_token: (uid() + uid()).replace(/-/g, "") }, client_accounts: { status: "onboarding", checklist: {}, addons: {}, notes: "", users_included: 5, annual_price: 0, setup_fee: 0 }, pending_invites: { created_at: now(), accepted_at: null } }[t] || {});
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
      if (n === "invite_by_email") {
        const email = a.p_email.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("That email address doesn't look right.");
        if (mem.team && a.p_client_id === "demo-client") { const ex = mem.team.find(m => m.email.toLowerCase() === email); if (ex) { if (ex.role === "owner") throw new Error("The owner's role can't be changed."); ex.role = a.p_role; return "linked"; } }
        mem.pending_invites = mem.pending_invites || []; const ex = mem.pending_invites.find(i => i.client_id === a.p_client_id && i.email === email);
        if (ex) ex.role = a.p_role; else mem.pending_invites.unshift({ id: uid(), client_id: a.p_client_id, email, role: a.p_role, created_at: now(), accepted_at: null });
        const o = (mem.over || []).find(x => x.client_id === a.p_client_id); if (o) o.pending = mem.pending_invites.filter(i => i.client_id === a.p_client_id && !i.accepted_at).length; else if (mem.over) mem.over.push({ client_id: a.p_client_id, members: 0, pending: 1, items_7d: 0, open_items: 0, last_activity: null, open_tickets: 0 });
        return "pending";
      }
      if (n === "mailbox_list") { const L = lvl(); return clone((mem.mailboxes || []).filter(m => m.client_id === a.p_client_id && L >= m.min_lvl).map(({ id, address, label, min_lvl }) => ({ id, address, label, min_lvl }))); }
      if (n === "ai_quota") return { used: 37, limit: 6000, deep_used: 2, deep_limit: 100 };
      if (n === "provider_overview") return clone(mem.over || []);
      if (n === "admin_delete_client") { const c = (mem.clients || []).find(x => x.id === a.p_client_id); if (!c) throw new Error("company not found"); if (!c.disabled_at) throw new Error("disable the company before removing it"); if (a.p_confirm.trim().toLowerCase() !== c.name.trim().toLowerCase()) throw new Error("type the company name exactly to confirm"); for (const t of Object.keys(mem)) if (Array.isArray(mem[t])) mem[t] = mem[t].filter(r => !(r && (r.client_id === c.id || (t === "clients" && r.id === c.id)))); return 0; }
      return null;
    }
  };
}

/* Sample companies for the demo. One generator covers every business type: it builds the boards
   from the template, then fills each board with two weeks of believable work. */
const DEMO_CO = { general: ["Cedar Trading Co.", "Trading and distribution with a service team"], services: ["Atlas Cooling & Maintenance", "Air-conditioning installs and maintenance"], delivery: ["Swift Delivery", "Same-day delivery for stores"], lab: ["Vita Home Labs", "Home sample collection"], clinic: ["Juniper Clinic", "Outpatient clinic"], kitchen: ["Olive Cloud Kitchen", "Four delivery brands from one kitchen"], retail: ["Basil & Co. Store", "Home goods, online and in store"] };
const GEN = {
  delivery: { per: [32, 46], who: "person", f: (p, ri) => ({ store: p(["Fresh Mart", "Pharma Plus", "Sweet Corner", "Burger Lab", "Green Basket", "Daily Bakery"]), value: ri(6, 48) + (ri(0, 1) ? .5 : 0) }) },
  visits: { per: [10, 16], who: "person", f: p => ({ test: p(["Vitamin D", "CBC", "HbA1c", "Lipid profile", "Thyroid panel", "Iron studies"]) }) },
  complaints: { per: [6, 12], who: "person", f: p => ({ brand: p(["Sushi Box", "Burger Lab", "Green Bowl", "Shawarma House"]), issue: p(["Cold food", "Late", "Missing item", "Wrong order"]) }) },
  requests: { per: [8, 14], who: "person", f: p => ({ category: p(["Billing", "Delivery", "Product question", "Account", "Warranty", "Returns"]), priority: p(["Normal", "Normal", "Normal", "High", "Urgent"]) }) },
  sales: { per: [2, 4], who: "business", f: (p, ri) => ({ value: ri(4, 60) * 250, source: p(["Referral", "Website", "Instagram", "Walk-in", "Cold call", "Exhibition"]) }) },
  orders: { per: [10, 18], who: "mixed", f: (p, ri) => ({ value: ri(18, 420), items: p(["1 item", "2 items", "3 items", "5 items", "Office pack", "Bulk order"]) }) },
  jobs: { per: [6, 10], who: "person", f: (p, ri) => ({ service: p(["AC maintenance", "AC installation", "Water heater repair", "Inspection", "Filter change"]), value: ri(15, 180) }) },
  appointments: { per: [14, 22], who: "person", f: p => ({ service: p(["Consultation", "Follow-up", "Dental cleaning", "Blood test", "Physiotherapy"]), value: p([20, 25, 30, 35, 45]) }) },
  tasks: { per: [2, 4], who: "task", f: p => ({ project: p(["New branch", "Monthly close", "Website", "Hiring", "Supplier review", "Training"]) }), titles: ["Renew the trade licence", "Prepare the monthly report", "Call the supplier about the late shipment", "Update the price list", "Onboard the new agent", "Review overdue invoices", "Tidy the shared drive", "Plan the Ramadan schedule", "Collect quotes for 2 laptops", "Check vehicle service dates", "Write the returns SOP", "Clean up the customer list", "Book the fire safety inspection", "Renew the domain and email"] }
};
function demoData(tplKey = "general") {
  let seed = 20261018; const R = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
  const cid = "demo-client", iso = m => new Date(m * 60000).toISOString(), NOW = nowM(), T0 = mins(startOfDay().getTime());
  const boards = buildBoards({ workspace_type: tplKey, config: {} }), field = boards.some(b => b.fieldOwner);
  const fieldJob = { delivery: "Driver", lab: "Nurse", services: "Technician", general: "Courier", retail: "Courier", kitchen: "Rider", clinic: "Field nurse" }[tplKey] || "Field staff";
  const T = [["owner", "Rana Haddad"], ["manager", "Omar Khalil"], ["team_lead", "Lina Saleh"], ["supervisor", "Yazan Qasem"], ["agent", "Dana Odeh"], ["agent", "Bilal Nasser"], ["agent", "Sara Mansour"], ["agent", "Hamza Ali"], ["driver", "Saif Kurdi"], ["driver", "Majd Abbadi"], ["driver", "Rami Shami"], ["driver", "Fadi Hijazi"], ["driver", "Khaled Masri"]];
  const team = T.map(([role, n], i) => ({ auth_user_id: "u-" + i, email: n.toLowerCase().replace(" ", ".") + "@demo-company.jo", role }));
  const people = T.map(([role, n], i) => ({ id: "p-" + i, client_id: cid, name: n, phone: "07" + ri(7, 9) + " " + ri(100, 999) + " " + ri(1000, 9999), email: team[i].email, dept: DEPT_OF_ROLE[role], job: { owner: "Owner", manager: "Operations manager", team_lead: "Customer care lead", supervisor: "Shift supervisor", agent: "Coordinator", driver: fieldJob }[role], emp_type: role === "driver" && i > 10 ? "Contractor" : "Full-time", auth_user_id: team[i].auth_user_id, ends_on: null, tools: [...(STD_TOOLS[DEPT_OF_ROLE[role]] || [])], active: true }));
  people.find(p => p.name === "Hamza Ali").tools.push("Odoo");
  const ends = new Date(); ends.setDate(ends.getDate() + 9);
  people.push({ id: "p-x1", client_id: cid, name: "Ruba Bitar", phone: "", email: "", dept: "Finance", job: "Accountant", emp_type: "Full-time", auth_user_id: null, ends_on: null, tools: ["Gmail", "Google Sheets", "Odoo", "Bank portal"], active: true },
    { id: "p-x2", client_id: cid, name: "Karam Abbadi", phone: "", email: "", dept: "IT", job: "IT support", emp_type: "Contractor", auth_user_id: null, ends_on: isoDay(ends), tools: ["Gmail", "Google Drive", "Google Workspace admin"], active: true },
    { id: "p-x3", client_id: cid, name: "Hadi Kurdi", phone: "", email: "", dept: "Customer care", job: "Former coordinator", emp_type: "Full-time", auth_user_id: null, ends_on: null, tools: ["Odoo", "Google Drive"], active: false });
  const AREAS = ["Abdoun", "Khalda", "Sweifieh", "Jubaiha", "Marj Al-Hamam", "Tla' Al Ali", "Shmeisani", "Dabouq", "Jabal Amman", "Rabieh"];
  const FIRST = ["Ahmad", "Lina", "Majd", "Reem", "Rania", "Zaid", "Omar", "Sara", "Hala", "Yousef", "Dima", "Fadi", "Noor", "Tala", "Laith", "Rawan", "Khaled", "Jana", "Maya", "Basel", "Leen", "Odai", "Farah", "Nadia"];
  const LAST = ["Haddad", "Khalil", "Rawashdeh", "Masri", "Nasser", "Odeh", "Zoubi", "Qasem", "Mansour", "Hijazi", "Bitar", "Nimri"];
  const BIZ = ["Northgate Pharmacy", "Blue Olive Cafe", "Juniper Dental", "Basalt Gym", "Orchid Salon", "Atlas Print Shop", "Sahara Bakery", "Harbor Real Estate", "Cedarline Hotel", "Lotus Kindergarten", "Summit Engineering", "Palm Supermarket"];
  const persons = FIRST.map((f, i) => ({ id: "c-" + i, client_id: cid, name: f + " " + pick(LAST), phone: "07" + pick(["7", "8", "9"]) + " " + ri(100, 999) + " " + ri(1000, 9999), area: pick(AREAS), tags: i % 9 === 0 ? ["VIP"] : i % 5 === 0 ? ["Repeat"] : [], notes: "", lang: i % 3 === 0 ? "ar" : null, created_at: iso(T0 - ri(20, 400) * 1440) }));
  const firms = BIZ.map((b, i) => ({ id: "cb-" + i, client_id: cid, name: b, phone: "06 5" + ri(10, 99) + " " + ri(1000, 9999), area: pick(AREAS), tags: i % 4 === 0 ? ["VIP"] : [], notes: "", lang: null, created_at: iso(T0 - ri(20, 600) * 1440) }));
  const customers = [...persons, ...firms];
  const agents = team.filter(m => m.role === "agent"), office = team.filter(m => m.role !== "driver"), drivers = T.map(([r, n], i) => ({ r, n, uid: "u-" + i })).filter(x => x.r === "driver");
  const nm = m => T[+m.auth_user_id.slice(2)][1];
  /* work on every board */
  const items = [];
  boards.forEach((b, bi) => {
    const G = GEN[b.lib] || GEN.tasks, P = Math.max(15, b.promise || 60), S = b.stages, A = b.alt;
    let num = 1000;
    for (let day = 13; day >= 0; day--) {
      const base = T0 - day * 1440, count = day === 0 ? Math.max(1, Math.round(ri(...G.per) * .6)) : ri(...G.per);
      for (let k = 0; k < count; k++) {
        const created = day === 0 ? Math.max(T0 + 2, NOW - 540) + Math.round(k * Math.max(30, Math.min(540, NOW - T0 - 2)) / count) : base + 480 + Math.round(k * 720 / count) + ri(-8, 8);
        if (created > NOW) continue;
        const c = G.who === "business" ? pick(firms) : G.who === "mixed" ? pick(R() < .3 ? firms : persons) : G.who === "task" ? null : pick(persons);
        const due = created + Math.round(P * (b.long ? (.6 + R() * .9) : (.8 + R() * .5)));
        const ownerFrom = b.fieldOwner ? pick(drivers) : null, offi = b.fieldOwner ? pick(agents) : pick(b.lib === "sales" ? office.slice(0, 7) : office);
        const it = { id: `i-${bi}-${num}`, client_id: cid, board: b.id, ext_id: `${b.prefix}-${num++}`, name: c ? c.name : pick(G.titles), phone: b.hasPhone && c ? c.phone : "", area: b.hasArea && c ? c.area : null, customer_id: b.hasPhone && c ? c.id : null, status: S[0][0], created: iso(created), due: iso(due), owner: null, owner_user: null, assigned_to: offi.auth_user_id, data: { ...G.f(pick, ri), t: {} }, hist: [{ at: iso(created), text: "Created", by: pick(agents).email }] };
        const late = NOW > due, finish = late ? R() < Math.min(.985, (b.lib === "tasks" ? .6 : .72) + .12 * (NOW - due) / P) : NOW - created > P * 1.4 && R() < .5;
        if (b.fieldOwner) { if (R() < .9 || finish) { it.owner = ownerFrom.n; it.owner_user = ownerFrom.uid; } } else it.owner = nm(offi);
        const reach = finish ? S.length - 1 : Math.min(S.length - 2, Math.floor(Math.min(1, (NOW - created) / Math.max(1, due - created)) * (S.length - 1)));
        const end = finish ? Math.min(NOW - 1, due + Math.round(P * (R() < .85 ? -.2 * R() : .3 * R()))) : NOW;
        for (let s = 1; s <= reach; s++) it.data.t[S[s][0]] = Math.round((created + (end - created) * s / Math.max(1, reach)) * 60000);
        it.status = S[Math.max(0, reach)][0];
        if (finish && A.length && R() < (b.lib === "sales" ? .3 : .07)) { delete it.data.t[S[S.length - 1][0]]; it.status = A[0][0]; it.data.t[A[0][0]] = end * 60000; }
        if (b.fieldOwner && it.status === S[0][0] && !finish) { it.owner = null; it.owner_user = null; }
        items.push(it);
      }
    }
  });
  const main = boards[0], phoneBoard = boards.find(b => b.hasPhone) || main;
  const openOf = b => items.filter(i => i.board === b.id && !b.terminal.includes(i.status));
  const lateOf = b => openOf(b).filter(i => NOW > mins(new Date(i.due).getTime()));
  const L = k => lateOf(phoneBoard)[k] || openOf(phoneBoard)[k] || items.filter(i => i.board === phoneBoard.id)[k];
  /* conversations */
  const cases = [], case_messages = [];
  const addCase = (it, kind, channel, status, assignee, ago, msgs) => { const id = "cv-" + cases.length; const at = NOW - ago; cases.push({ id, client_id: cid, item_id: it?.id || null, customer_id: it?.customer_id || pick(persons).id, subject: msgs[0][1].slice(0, 80), channel, kind, status, assignee, reply_by: kind === "Complaint" && status === "open" && !msgs.some(m => m[0] === "out") ? iso(at + 15) : null, created_at: iso(at), updated_at: iso(at + (msgs.length - 1)) }); msgs.forEach(([dir, body, by], k) => case_messages.push({ id: id + "-" + k, client_id: cid, case_id: id, dir, body, author_email: by || null, created_at: iso(at + k) })); };
  addCase(L(0), "Complaint", "WhatsApp", "open", agents[0].auth_user_id, 6, [["in", `Hi, ${L(0) ? L(0).ext_id : "my order"} was supposed to be done already. Any update?`]]);
  addCase(L(1), "Complaint", "Phone call", "open", agents[2].auth_user_id, 12, [["sys", "Call · 4 min"], ["in", "Customer unhappy with the wait, asked for a call back."], ["note", "Lina: check with the team before calling back.", team[2].email]]);
  addCase(L(2), "Change request", "WhatsApp", "open", null, 3, [["in", "مرحبا، ممكن أغير العنوان؟ أنا هلأ بالمكتب مش بالبيت"]]);
  addCase(null, "Question", "Instagram", "open", agents[1].auth_user_id, 25, [["in", "Do you work on Fridays? And do you cover Dabouq?"]]);
  addCase(L(5), "Complaint", "Email", "pending", agents[1].auth_user_id, 48, [["in", "One item was missing from what I received."], ["out", "Sorry about that. We're checking and will update you within the hour.", agents[1].email]]);
  addCase(L(8), "Feedback", "WhatsApp", "resolved", agents[0].auth_user_id, 210, [["out", "How did we do? Reply 1–5.", agents[0].email], ["in", "5, very fast, thank you"]]);
  /* quality, templates, tools, platforms, files */
  const qa = [["Sara Mansour", [5, 5, 5, 5, 4], "Fast fix, clear wording, offered a solution without being asked."], ["Hamza Ali", [4, 3, 4, 3, 4], "Didn't confirm the details before closing. Coaching session booked."], ["Dana Odeh", [5, 5, 4, 5, 5], "Good use of templates, personalised the opening."], ["Bilal Nasser", [4, 4, 5, 4, 4], "Calm with an upset customer. Log the note before transferring."], ["Hamza Ali", [4, 4, 3, 4, 3], "Promised a refund without approval. Reviewed the policy together."]].map(([n, s, note], i) => ({ id: "qa-" + i, client_id: cid, agent_name: n, person_id: people.find(p => p.name === n)?.id, ref: pick(persons).name, channel: pick(["WhatsApp", "Phone call"]), scores: s, note, reviewer_email: i % 2 ? team[3].email : team[2].email, created_at: iso(NOW - ri(60, 9000)) }));
  const seen = new Set(), tpls = []; [...boards.flatMap(b => b.templates || []), ...GENERAL_TPLS].forEach(t => { if (!seen.has(t[0])) { seen.add(t[0]); tpls.push({ id: "t-" + tpls.length, client_id: cid, key: t[0], name: t[1], category: t[2], en: t[3], ar: t[4] }); } });
  const links = [...DEFAULT_TOOLS.map(([kind, category, name, url], i) => ({ id: "l-" + i, client_id: cid, kind, category, name, url, description: "", sso: false, health: "Healthy" })),
    { id: "l-s1", client_id: cid, kind: "system", category: "Finance", name: "Odoo ERP", url: "https://www.odoo.com/", description: "Accounting, invoices (JoFotara) and stock", sso: true, health: "Healthy" },
    { id: "l-s2", client_id: cid, kind: "system", category: "HR", name: "ZenHR", url: "https://www.zenhr.com/", description: "Payroll, leave balances and social security", sso: false, health: "Healthy" },
    { id: "l-s3", client_id: cid, kind: "system", category: "Operations", name: "Stock sheet", url: "", description: "Shared Google Sheet with stock levels", sso: false, health: "Slow" }];
  const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return isoDay(x); };
  const plats = [["Jreebs", "Operations workspace", "Professional · billed yearly", 99, 140, "Rana Haddad"], ["WhatsApp Business", "Customer messaging", "Pay per conversation", 42, 30, "Omar Khalil"], ["Google Workspace", "Email and files", "Business Starter · 14 users", 59, 86, "Karam Abbadi"], ["Odoo", "Accounting and stock", "Standard · 3 users", 64, 10, "Ruba Bitar"], ["ZenHR", "HR and payroll", "Per employee", 38, 18, "Omar Khalil"]].map(([name, purpose, plan, cost, days, owner], i) => ({ id: "pl-" + i, client_id: cid, name, purpose, plan, cost, renews_on: d(days), owner_name: owner, status: "Operational" }));
  const docs = [["Commercial registration", "Compliance", 160], ["Municipal trade licence", "License", 26], ["Tax registration certificate", "Compliance", null], [field ? "Fleet vehicle insurance" : "Office insurance", "Insurance", -3]].map(([name, kind, days], i) => ({ id: "dc-" + i, client_id: cid, name, kind, expires_on: days == null ? null : d(days), storage_path: null, created_at: iso(NOW - 40000) }));
  const sopList = [...(STARTER_SOPS[tplKey] || STARTER_SOPS.general), SHIFT_SOP, ...(field ? [["Field end-of-shift handover", "Field", ["driver", "supervisor"], ["Jreebs"], ["Mark every stop done or note why it wasn't.", "Hand any cash collected to the shift supervisor; both confirm the amount.", "Report vehicle or equipment problems before you leave."]]] : [])];
  const sops = sopList.map(([title, category, roles, tools, steps], i) => ({ id: "s-" + i, client_id: cid, title, category, roles, tools, steps, format: "Checklist", owner_name: i % 2 ? "Yazan Qasem" : "Lina Saleh", reviewed_on: d(i === 2 ? -120 : -ri(2, 40)), created_at: iso(NOW - 50000) }));
  const sop_reads = []; sops.forEach(s => team.filter(m => s.roles.includes(m.role)).forEach((m, k) => { if (k % 3 !== 2) sop_reads.push({ sop_id: s.id, client_id: cid, auth_user_id: m.auth_user_id, read_at: iso(NOW - 3000) }); }));
  const ws = weekStart(), codes = ["08–16", "12–20", "16–24", "Off"], shifts = [];
  people.filter(p => p.active && p.auth_user_id).forEach((p, i) => { for (let k = 0; k < 7; k++) { const x = new Date(ws); x.setDate(x.getDate() + k); shifts.push({ id: `sh-${i}-${k}`, client_id: cid, person_id: p.id, day: isoDay(x), shift: codes[(k + i) % 7 === 6 ? 3 : (i + Math.floor(k / 3)) % 3] }); } });
  const firstLate = lateOf(phoneBoard)[0] || items[items.length - 1];
  const activity = [[1, `${firstLate.ext_id} flagged overdue`, null], [3, `WhatsApp sent to ${firstLate.name} (${firstLate.ext_id})`, agents[0].email], [9, `${items[items.length - 8].ext_id} marked ${stageName(boards.find(b => b.id === items[items.length - 8].board).done, boards.find(b => b.id === items[items.length - 8].board))}`, null], [12, "Complaint logged from a customer (WhatsApp)", agents[2].email], [24, "Time limits and targets updated", team[1].email], [90, `Imported 38 records from ${main.items.toLowerCase()}_morning.csv`, team[1].email], [400, "Starter content added: message templates, tools, starter SOPs", team[0].email]].map(([ago, text, by], i) => ({ id: "a-" + i, client_id: cid, at: iso(NOW - ago), text, actor_email: by, kind: /Imported/.test(text) ? "import" : "" }));
  const rules = phoneBoard.hasPhone ? [{ id: "r-1", client_id: cid, rule_id: "c-vip", enabled: true, def: { board: phoneBoard.id, name: "VIP customer waiting", when: "created", mins: phoneBoard.long ? 240 : 20, cond: "tag", val: "VIP", label: "VIP waiting", sev: 3, tpl: (phoneBoard.templates[0] || [])[0] || null } }] : [];
  /* approvals: leave, expenses, purchases, access */
  const ap = (k, who, extra, ago, status, by) => ({ id: "ap-" + k + ago, client_id: cid, kind: k, requester: team[who].auth_user_id, requester_name: T[who][1], status, created_at: iso(NOW - ago), ...(status !== "pending" ? { decided_by: team[by].auth_user_id, decided_by_name: T[by][1], decided_at: iso(NOW - ago + 60) } : {}), ...extra });
  const approvals = [ap("leave", 5, { title: "Annual leave", start_date: d(3), end_date: d(5), details: "Family wedding in Irbid." }, 90, "pending"), ap("leave", 9, { title: "Sick leave", start_date: d(0), end_date: d(0), details: "Doctor's note sent on WhatsApp." }, 300, "approved", 3), ap("expense", 4, { title: "Fuel for customer visits", amount: 45, details: "Receipts in the office drawer." }, 200, "pending"), ap("purchase", 2, { title: "2 laptops for new agents", amount: 1200, details: "Quotes from two suppliers attached by email." }, 600, "pending"), ap("access", 7, { title: "Odoo", details: "Needs to check invoice status for customers." }, 1500, "pending"), ap("expense", 8, { title: "Car wash and parking", amount: 12, details: "" }, 4000, "approved", 2), ap("leave", 6, { title: "Half day", start_date: d(-2), end_date: d(-2), details: "" }, 5000, "approved", 2)];
  /* shared mailboxes and email */
  const mailboxes = [["mb-1", "support@demo-company.jo", "Customer support", 1], ["mb-2", "partners@demo-company.jo", "Suppliers and partners", 2], ["mb-3", "finance@demo-company.jo", "Finance", 4]].map(([id, address, label, min_lvl]) => ({ id, client_id: cid, address, label, min_lvl, inbound_token: (id + "7f3a9c2e1b8d4f6a0c5e9b2d7a1f4c8e6b3d9a2f5c7e1b4d8a").slice(0, 64), created_at: iso(NOW - 40000) }));
  persons[3].email = "reem.mail@gmail.com"; persons[7].email = "s.odeh@outlook.com"; persons[11].email = "fadi.nimri@yahoo.com";
  const reemItem = items.filter(i => i.customer_id === persons[3].id).slice(-1)[0] || null;
  const EM = [
    ["mb-1", persons[3].name, persons[3].email, "Refund for my order", `Hi,\n\n${reemItem ? `My order ${reemItem.ext_id}` : "My last order"} arrived with two items missing (about 4.5 JOD). Could you refund the missing items to my card? I've attached the receipt.\n\nThanks,\n${persons[3].name}`, 95, true, persons[3].id, reemItem ? reemItem.id : null],
    ["mb-1", persons[7].name, persons[7].email, "Change of address from next week", `Hello,\n\nFrom next week I'm working from our office in Shmeisani. Can you send everything there on Sundays instead of my home address? Please confirm.\n\nBest regards`, 210, false, persons[7].id, null],
    ["mb-1", "Laith Masri", "laith.masri@gmail.com", "طلب فاتورة", "مرحبا،\n\nممكن ترسلولي فاتورة ضريبية لطلبات شهر أيلول؟ بحتاجها للشركة قبل يوم الخميس.\n\nشكراً", 330, false, null, null],
    ["mb-1", persons[11].name, persons[11].email, "Thank you", `Just wanted to say your team was really helpful today and called before arriving. Thank you!`, 1500, false, persons[11].id, null],
    ["mb-2", "Orient Supplies", "sales@orientsupplies.jo", "Price list update from 1 November", `Hi team,\n\nOur prices change from 1 November (about 4% on most lines). The new list is attached. Can you confirm your November order quantities by Thursday so we can hold the old prices for you?\n\nKarim\nOrient Supplies`, 60, true, null, null],
    ["mb-2", "Orient Supplies", "sales@orientsupplies.jo", "Re: Price list update from 1 November", `Following up on this. Could we also have a call on Wednesday at 11 to go through it?`, 20, false, null, null],
    ["mb-2", firms[8].name, "procurement@cedarlinehotel.jo", "Quote request for monthly supply", `Dear team,\n\nWe're looking for a monthly supplier for our two branches. Could you send us a quote and your payment terms? We'd like to decide by the end of the month.`, 460, false, firms[8].id, null],
    ["mb-3", "Jordan Insurance Broker", "renewals@jib-broker.jo", `${field ? "Fleet" : "Office"} insurance renewal quote`, `Dear Rana,\n\nYour policy expired 3 days ago. Attached is the renewal quote: 2,140 JOD for 12 months, same cover. Please confirm by replying so we can issue the new policy today.\n\nRegards`, 180, true, null, null],
    ["mb-3", "Pharma Plus", "accounts@pharmaplus.jo", "Invoice 2026-118 overdue", `Hello,\n\nInvoice 2026-118 for September (1,860 JOD) is now 12 days overdue. Please let us know the expected payment date.`, 900, true, null, null]
  ];
  const emails = EM.map(([mb, name, addr, subject, body, ago, att, cust, item], i) => ({ id: "em-" + i, client_id: cid, mailbox_id: mb, message_id: "demo-" + i, thread_key: subject.toLowerCase().replace(/^(re|fwd?):\s*/i, ""), from_addr: addr, from_name: name, to_addr: mailboxes.find(m => m.id === mb).address, subject, body_text: body, received_at: iso(NOW - ago), status: i === 3 ? "done" : i === 6 ? "waiting" : "open", assignee: i === 0 ? agents[0].auth_user_id : i === 4 || i === 5 ? team[2].auth_user_id : null, customer_id: cust, item_id: item, labels: [], has_attachments: att, created_at: iso(NOW - ago) }));
  const [coName, coDesc] = DEMO_CO[tplKey] || DEMO_CO.general;
  return { team, emails, mailboxes, approvals, pending_invites: [{ id: "inv-1", client_id: cid, email: "noor.haddad@demo-company.jo", role: "agent", created_at: iso(NOW - 300), accepted_at: null }], clients: [{ id: cid, name: coName + " (demo)", slug: "demo", workspace_type: tplKey, plan: "professional", config: {}, created_at: iso(NOW - 60000) }], items, customers, cases, case_messages, people, shifts, qa_reviews: qa, templates: tpls, links, platforms: plats, documents: docs, sops, sop_reads, activity, rules,
    tickets: [{ id: "tk-1", client_id: cid, subject: "Connect our Odoo invoices", details: "Show unpaid invoices next to each customer", urgency: "Normal", status: "In progress", created_by_email: team[1].email, created_at: iso(NOW - 2880) }],
    company_profile: [{ client_id: cid, legal_name: coName.replace(/\.$/, "") + " LLC", trade_name: coName, reg_no: "200·xxxxx (sample)", tax_id: "018·xxxxx (sample)", address: "Building 12, Wadi Saqra St, Amman", founded: "2021", wa_sender: coName, about: coDesc }] };
}

/* Provider demo (?demo=provider): Jreebs's own console with sample client companies. */
function providerData() {
  const NOW = Date.now(), d = n => isoDay(NOW + n * 864e5), at = n => new Date(NOW - n * 864e5).toISOString();
  const C = [
    ["c1", "Swift Delivery", "delivery", "professional", "active", 15, 1190, 350, -150, 215, "Rana Haddad", "0791234567", { quote: 1, contract: 1, owner: 1, profile: 1, team: 1, import: 1, rules: 1, templates: 1, sops: 1, channels: 1, training: 1, live: 1 }, 13, 1, 286, 0.3, 1, 412, 1.9],
    ["c2", "Dunes Courier", "delivery", "business", "active", 46, 2730, 750, -65, 300, "Yousef Nimri", "0787654321", { quote: 1, contract: 1, owner: 1, profile: 1, team: 1, import: 1, rules: 1, templates: 1, sops: 1, channels: 1, training: 1, live: 1 }, 41, 2, 954, 0.1, 0, 1630, 9.4],
    ["c3", "Olive Cloud Kitchen", "kitchen", "professional", "active", 18, 1340, 350, -341, 24, "Hala Bitar", "0779876543", { quote: 1, contract: 1, owner: 1, profile: 1, team: 1, import: 1, rules: 1, templates: 1, sops: 1, channels: 1, training: 1, live: 1 }, 16, 0, 173, 0.2, 2, 5480, 6.1],
    ["c4", "Atlas Parcel", "delivery", "starter", "active", 5, 490, 150, -120, 245, "Omar Zoubi", "0795551234", { quote: 1, contract: 1, owner: 1, profile: 1, team: 1, import: 1, live: 1 }, 4, 0, 0, 9, 0, 6, 0.02],
    ["c5", "Cedar Home Labs", "lab", "starter", "onboarding", 5, 490, 150, -9, 356, "Dima Khalil", "0782223344", { quote: 1, contract: 1, owner: 1, profile: 1, team: 1 }, 3, 2, 12, 0.5, 0, 22, 0.07],
    ["c6", "Harbor Care Center", "lab", "professional", "onboarding", 15, 1190, 350, -21, 344, "Sami Odeh", "0796667788", { quote: 1, contract: 1, owner: 1, profile: 1 }, 2, 3, 0, 14, 1, 0, 0],
    ["c7", "Basil & Co Kitchens", "kitchen", "starter", "trial", 5, 0, 0, -4, 26, "Leen Masri", "0778889900", { quote: 1, owner: 1 }, 2, 1, 31, 0.2, 0, 41, 0.12],
    ["c8", "Mint Market Express", "delivery", "starter", "churned", 5, 490, 150, -400, -35, "Tamer Qasem", "0791112233", { quote: 1, contract: 1, owner: 1, live: 1 }, 0, 0, 0, 60, 0, 0, 0]
  ];
  const clients = C.map(([id, name, type, plan, , , , , created]) => ({ id, name, slug: name.toLowerCase().replace(/[^a-z]+/g, "-"), workspace_type: type, plan, config: {}, created_at: at(-created) }));
  const client_accounts = C.map(([id, name, , , status, users, price, setup, created, renew, contact, phone, checklist]) => ({ client_id: id, status, users_included: users, annual_price: price, setup_fee: setup, currency: "JOD", starts_on: d(created), renews_on: d(renew), owner_email: contact.toLowerCase().replace(" ", ".") + "@" + name.toLowerCase().replace(/[^a-z]+/g, "") + ".jo", contact_name: contact, contact_phone: phone, addons: {}, checklist: Object.fromEntries(Object.entries(checklist).map(([k, v]) => [k, !!v])), notes: id === "c6" ? "Waiting for their patient list export from the lab system." : "" }));
  const over = C.map(r => ({ client_id: r[0], members: r[13], pending: r[14], items_7d: r[15], open_items: Math.round(r[15] / 9), last_activity: r[13] ? at(r[16]) : null, open_tickets: r[17] }));
  const client_users = []; C.forEach(r => { for (let i = 0; i < r[13]; i++) client_users.push({ client_id: r[0], auth_user_id: r[0] + "-u" + i, role: i === 0 ? "owner" : i === 1 ? "manager" : i < 3 ? "team_lead" : i < 5 ? "supervisor" : i % 3 ? "agent" : "driver" }); });
  const pending_invites = [["c5", "nurse.lead@cedarlabs.jo", "team_lead", 2], ["c5", "dispatch@cedarlabs.jo", "supervisor", 2], ["c6", "ops@harborcare.jo", "manager", 18], ["c6", "agent1@harborcare.jo", "agent", 18], ["c6", "agent2@harborcare.jo", "agent", 18], ["c7", "chef@basilco.jo", "team_lead", 3], ["c1", "noor.haddad@swift-delivery.jo", "agent", 0.2]].map(([cid, email, role, days], i) => ({ id: "pi-" + i, client_id: cid, email, role, created_at: at(days), accepted_at: null }));
  const tickets = [["c3", "Connect Foodics", "We want orders from Foodics to show up automatically.", "Normal", "In progress", 3], ["c2", "Drivers can't see tomorrow's stops", "Two drivers say the list is empty after 11pm.", "Urgent", "Open", 0.1], ["c6", "Import patient list", "Attached the export from our lab system.", "Normal", "Open", 2], ["c1", "Add a second WhatsApp number", "For the new Khalda branch.", "Normal", "Done", 12]].map(([cid, subject, details, urgency, status, days], i) => ({ id: "tk-" + i, client_id: cid, subject, details, urgency, status, created_by_email: "owner@" + cid + ".jo", created_at: at(days) }));
  const ai_log = []; C.forEach(r => { const [id, q, cost] = [r[0], r[18], r[19]]; for (let i = 0; i < q; i++) ai_log.push({ client_id: id, model: i % 40 === 0 ? "claude-opus-5-5" : "claude-haiku-5-5", deep: i % 40 === 0, question: "q", cost_usd: +(cost / q).toFixed(5), created_at: at(i % 18) }); });
  return { clients, client_accounts, over, client_users, pending_invites, tickets, ai_log };
}

let DEMO_MEM = null;
async function demoBoot() {
  if (new URLSearchParams(location.search).get("demo") === "provider") {
    DEMO_MEM = providerData(); DB = makeDemoDB(DEMO_MEM);
    ADMIN = true; ME = { id: "jreebs-admin", email: "hello@jreebs.com", role: "owner", lvl: 5 };
    return startShell("clients");
  }
  const p = new URLSearchParams(location.search).get("demo"), tpl = TEMPLATES[p] ? p : "general";
  const sel = $("#tplSel"); sel.innerHTML = Object.entries(TEMPLATES).map(([k, t]) => `<option value="${k}" ${k === tpl ? "selected" : ""}>${esc(t.name)}</option>`).join("");
  DEMO_MEM = demoData(tpl);
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
document.getElementById("tplSel").addEventListener("change", e => { if (DEMO) location.search = "?demo=" + e.target.value; });
