/* Setup: automations, message templates, integrations, import & export. */

/* ---------- AUTOMATIONS ---------- */
const flaggingNow = id => ITEMS.filter(i => !isTerm(i) && i.flags.some(f => f.rule === id)).length;
VIEWS.automations = function () {
  const edit = can(4), custom = customRules();
  const describe = d => [`${d.when === "due" ? `${d.mins || 0} min after the ${WDEF.dueLabel.toLowerCase()} time` : d.when === "status" ? `${d.mins || 0} min in "${stageName(d.status)}"` : `${d.mins || 0} min after it's created`}`, d.cond === "area" ? `Area is ${d.val}` : d.cond === "tag" ? `Customer tag is ${d.val}` : d.cond === "value" ? `Value over ${d.val} JOD` : d.cond === "noowner" ? `No ${WDEF.ownerLabel.toLowerCase()} yet` : `Any ${WDEF.item.toLowerCase()}`];
  return `${head("Automations", `Rules that watch every ${WDEF.item.toLowerCase()} and flag what needs attention, with the right message ready.`, edit ? `<button class="btn go" type="button" data-modal="rule">${ic("plus")}New automation</button>` : "")}
  ${edit ? "" : `<div class="note-box">${ic("info")}<span>You can see every automation. Managers and owners switch them on or off and build new ones.</span></div>`}
  <section class="kpis">${kpi("Active", WDEF.rules.filter(r => ruleOn(r.id)).length + custom.filter(r => r.enabled).length, `of ${WDEF.rules.length + custom.length}`)}${kpi("Flagging now", ITEMS.filter(i => !isTerm(i) && attention(i)).length, `open ${WDEF.items.toLowerCase()}`)}</section>
  ${card("Built in", WDEF.rules.map(r => `<div class="rule"><div style="display:grid;gap:6px;min-width:0"><div class="row"><span class="nm">${esc(r.name)}</span>${ruleOn(r.id) ? pill(`flagging ${flaggingNow(r.id)} now`, flaggingNow(r.id) ? "acc" : "") : pill("Off")}</div><span class="small muted">${esc(r.desc)}</span></div><button class="sw" type="button" role="switch" aria-checked="${ruleOn(r.id)}" aria-label="${esc(r.name)}" data-rule="${r.id}" ${edit ? "" : "disabled"}></button></div>`).join(""), true)}
  ${card("Your automations", custom.length ? custom.map(r => { const [w, c] = describe(r.def); return `<div class="rule"><div style="display:grid;gap:8px;min-width:0"><div class="row"><span class="nm">${esc(r.def.name)}</span>${r.enabled ? pill(`flagging ${flaggingNow(r.rule_id)} now`, flaggingNow(r.rule_id) ? "acc" : "") : pill("Off")}</div>
    <div class="flow"><span class="k">WHEN</span><span class="v">${esc(w)}</span><span class="k">IF</span><span class="v">${esc(c)}</span><span class="k">THEN</span><span class="v then">Flag "${esc(r.def.label || r.def.name)}"</span>${r.def.tpl ? `<span class="v then">Ready: ${esc(S.tpls.find(t => t.key === r.def.tpl)?.name || r.def.tpl)}</span>` : ""}</div></div>
    <div class="row">${edit ? `<button class="btn sm ghost danger" type="button" data-delrule="${r.id}" aria-label="Delete">${ic("trash")}</button>` : ""}<button class="sw" type="button" role="switch" aria-checked="${r.enabled}" aria-label="${esc(r.def.name)}" data-crule="${r.id}" ${edit ? "" : "disabled"}></button></div></div>`; }).join("") : `<div class="card-b">${empty(edit ? "Build rules for your own way of working, like flagging VIP orders after 20 minutes." : "None yet.")}</div>`, true)}
  <p class="small muted">Rules run live in the dashboard for everyone who's signed in. Sending WhatsApp messages automatically, with nobody pressing send, needs the WhatsApp Business API (see Integrations).</p>`;
};
function ruleModal() {
  openModal(`${mHead("New automation")}<div class="m-b form">
    <div class="field"><label for="rn">Name</label><input class="in" id="rn" placeholder="e.g. VIP order waiting too long"></div>
    <div class="f3"><div class="field"><label for="rw">When</label><select class="sel" id="rw"><option value="created">It was created</option><option value="due">${esc(WDEF.dueLabel)} time passes</option><option value="status">It sits in a status</option></select></div><div class="field"><label for="rs">Status</label><select class="sel" id="rs">${[...WDEF.stages, ...WDEF.alt].map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div><div class="field"><label for="rm">For at least (min)</label><input class="in" id="rm" type="number" min="0" value="20"></div></div>
    <div class="f2"><div class="field"><label for="rc">Only if</label><select class="sel" id="rc"><option value="any">Any ${WDEF.item.toLowerCase()}</option><option value="tag">Customer has tag</option><option value="area">Area is</option><option value="noowner">No ${WDEF.ownerLabel.toLowerCase()} assigned</option>${WDEF.hasValue ? `<option value="value">Value over (JOD)</option>` : ""}</select></div><div class="field"><label for="rv">Value</label><input class="in" id="rv" placeholder="e.g. VIP or Abdoun"></div></div>
    <div class="f3"><div class="field"><label for="rl">Flag text</label><input class="in" id="rl" placeholder="e.g. VIP waiting"></div><div class="field"><label for="rsev">Urgency</label><select class="sel" id="rsev"><option value="3">Urgent (red)</option><option value="2" selected>Check (amber)</option><option value="1">Info (blue)</option></select></div><div class="field"><label for="rt">Message ready</label><select class="sel" id="rt"><option value="">None</option>${S.tpls.map(t => `<option value="${esc(t.key)}">${esc(t.name)}</option>`).join("")}</select></div></div>
    <div class="note-box">${ic("bolt")}<span id="rprev"></span></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-saverule="1">Create and turn on</button></div>`);
  const upd = () => { const w = $("#rw").value; $("#rs").disabled = w !== "status"; $("#rv").disabled = ["any", "noowner"].includes($("#rc").value); $("#rprev").textContent = `Flags any ${WDEF.item.toLowerCase()} ${w === "created" ? `${$("#rm").value} min after it's created` : w === "due" ? `${$("#rm").value} min past its ${WDEF.dueLabel.toLowerCase()} time` : `in "${stageName($("#rs").value)}" for ${$("#rm").value}+ min`}${$("#rc").value === "any" ? "" : $("#rc").value === "noowner" ? ` with no ${WDEF.ownerLabel.toLowerCase()}` : ` where ${$("#rc").selectedOptions[0].text.toLowerCase()} ${$("#rv").value}`}, as "${$("#rl").value || $("#rn").value || "…"}".`; };
  ["#rw", "#rs", "#rm", "#rc", "#rv", "#rl", "#rn"].forEach(s => $(s).addEventListener("input", upd)); upd();
}

/* ---------- TEMPLATES ---------- */
VIEWS.templates = function () {
  const edit = can(4);
  return `${head("Message templates", "Ready messages in Arabic and English. Names, numbers and times fill in on their own.", edit ? `<button class="btn go" type="button" data-modal="tpl">${ic("plus")}New template</button>` : "")}
  <div class="row small muted">Fills in automatically: ${["{first}", "{name}", "{id}", "{late}", "{due}", "{owner}", "{area}", ...WDEF.fields.map(f => "{" + f[0] + "}")].map(v => `<span class="var">${v}</span>`).join(" ")}</div>
  <div class="tpls">${S.tpls.map(t => `<section class="card tpl"><div class="row"><b class="grow">${esc(t.name)}</b>${pill(t.category)}</div><p>${esc(t.en).replace(/\{(\w+)\}/g, '<span class="var">{$1}</span>')}</p><p class="arx" lang="ar">${esc(t.ar).replace(/\{(\w+)\}/g, '<span class="var">{$1}</span>')}</p>${edit ? `<div class="row"><span class="spacer"></span><button class="btn sm" type="button" data-modal="tpl" data-tid="${t.id}">Edit</button></div>` : ""}</section>`).join("") || empty("No templates yet.")}</div>`;
};
function tplModal(id) {
  const t = S.tpls.find(x => x.id === id) || { key: "", name: "", category: "Updates", en: "Hi {first}, ", ar: "مرحبا {first}، " };
  openModal(`${mHead(id ? "Edit template" : "New template")}<div class="m-b form">
    <div class="f2"><div class="field"><label for="tn">Name</label><input class="in" id="tn" value="${esc(t.name)}"></div><div class="field"><label for="tc">Category</label><select class="sel" id="tc">${["Updates", "Delays", "Complaints", "Customers", "Team"].map(c => `<option ${t.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
    <div class="field"><label for="ten">English</label><textarea class="in" id="ten">${esc(t.en)}</textarea></div>
    <div class="field"><label for="tar">Arabic</label><textarea class="in" id="tar" dir="rtl" style="font-family:var(--ar)">${esc(t.ar)}</textarea></div>
    <div class="row small muted">Insert: ${["{first}", "{id}", "{late}", "{due}", "{owner}", "{area}"].map(v => `<button class="var" type="button" data-ins="${v}">${v}</button>`).join(" ")}</div></div>
    <div class="m-f">${id ? `<button class="btn danger" type="button" data-deltpl="${id}">Delete</button><span class="spacer"></span>` : ""}<button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn primary" type="button" data-savetpl="${id || ""}">Save</button></div>`);
}

/* ---------- INTEGRATIONS ---------- */
const INTEG = [
  ["Messaging", "WhatsApp (click to chat)", "Every message opens in WhatsApp ready to send, from any phone or computer.", "on", "WA"],
  ["Messaging", "WhatsApp Business API", "Send automatically and receive customer replies straight into the Inbox.", "setup", "API"],
  ["Messaging", "SMS", "Text messages for customers without WhatsApp.", "setup", "SMS"],
  ["Messaging", "Instagram messages", "Messages to your Instagram page land in the Inbox.", "setup", "IG"],
  ["Calls", "Phone (click to call)", "Calls open on the device you're using, and outcomes are logged on the order.", "on", "TEL"],
  ["Calls", "Cloud phone system", "Call recordings and logs attached to the order automatically.", "setup", "VOIP"],
  ["Delivery apps", "Talabat", "Talabat orders and complaints in the same queue as your own.", "setup", "TB"],
  ["Delivery apps", "Careem", "Careem orders and complaints in the same queue.", "setup", "CR"],
  ["Online store", "Shopify / WooCommerce", "New store orders become orders here automatically.", "setup", "SHOP"],
  ["Data & reports", "Excel / CSV", "Import and export any data, any time.", "on", "XLS"],
  ["Data & reports", "Google Sheets", "Two-way sync with a sheet your team already uses.", "setup", "GS"],
  ["Data & reports", "Metabase / Power BI", "Use your Jreebs data in your own dashboards.", "setup", "BI"],
  ["Automation", "Webhooks", "Send events (late, done, complaint) to any system you run.", "setup", "{ }"],
  ["Automation", "Zapier / Make", "Connect thousands of apps without code.", "setup", "ZAP"],
  ["Team", "Slack / Microsoft Teams", "Alerts in your team channel.", "setup", "#"],
  ["Maps", "Google Maps", "One-tap directions for drivers and field teams.", "on", "MAP"],
  ["Payments", "CliQ / PayTabs", "Payment links and cash-on-delivery reconciliation.", "setup", "JD"]
];
VIEWS.integrations = function () {
  const cats = ["All", ...new Set(INTEG.map(i => i[0]))], list = INTEG.filter(i => ui.intCat === "All" || i[0] === ui.intCat);
  return `${head("Integrations", "Connect the tools you already use so everything lands in one place.", "")}
  <div class="note-box">${ic("shield")}<span>We never ask for your passwords. Connections use access keys you create and can switch off at any time. Jreebs sets each one up with you.</span></div>
  <div class="chips">${cats.map(c => `<button class="chip" type="button" data-icat="${esc(c)}" aria-pressed="${ui.intCat === c}">${esc(c)}</button>`).join("")}</div>
  <div class="ints">${list.map(([cat, n, d, st, lg]) => { const asked = S.tickets.some(t => t.subject === "Connect " + n); return `<section class="card int"><div class="row"><span class="lg">${esc(lg)}</span><div class="grow"><b>${esc(n)}</b><div class="small muted">${esc(cat)}</div></div></div><p>${esc(d)}</p><div class="row">${st === "on" ? pill("Active", "good") : asked ? pill("Requested", "acc") : pill("Set up with Jreebs", "warn")}<span class="spacer"></span>${st === "on" || asked ? "" : `<button class="btn sm primary" type="button" data-reqint="${esc(n)}">Request</button>`}</div></section>`; }).join("")}</div>`;
};

/* ---------- IMPORT & EXPORT ---------- */
const IMPORTS = {
  items: () => ({ label: WDEF.items, fields: [["ext_id", "Reference number"], ["name", "Customer name"], ["phone", "Phone"], ["area", "Area"], ["owner", WDEF.ownerLabel], ["status", "Status"], ["due", WDEF.dueLabel], ...WDEF.fields] }),
  customers: () => ({ label: "Customers", fields: [["name", "Name"], ["phone", "Phone"], ["area", "Area"], ["tags", "Tags"], ["notes", "Notes"]] }),
  people: () => ({ label: "People", fields: [["name", "Name"], ["job", "Job"], ["dept", "Department"], ["emp_type", "Type"], ["phone", "Phone"], ["email", "Email"], ["ends_on", "Contract ends"]] })
};
function guessCol(h, fields) { const x = h.toLowerCase().replace(/[^a-z]/g, ""); const syn = { ext_id: ["order", "orderno", "ref", "reference", "id", "number", "no"], name: ["customer", "name", "client", "patient"], phone: ["phone", "mobile", "tel", "whatsapp"], area: ["area", "zone", "district", "city"], owner: ["driver", "owner", "team", "agent", "rider"], status: ["status", "stage", "state"], due: ["due", "time", "eta", "promised", "visit", "date"], tags: ["tags", "tag", "segment"], dept: ["department", "dept"], job: ["job", "title", "position"], emp_type: ["type", "contract"], email: ["email", "mail"], ends_on: ["end", "ends", "until"] }; for (const [k] of fields) { if ((syn[k] || [k]).some(s => x === s || x.includes(s))) return k; } const f = fields.find(([k, l]) => x.includes(l.toLowerCase().replace(/[^a-z]/g, ""))); return f ? f[0] : ""; }
VIEWS.data = function () {
  const imp = ui.imp, spec = imp ? IMPORTS[imp.kind]() : null;
  let left;
  if (!imp) left = `<div class="field"><label for="impKind">What are you importing?</label><select class="sel" id="impKind"><option value="items">${esc(WDEF.items)}</option><option value="customers">Customers</option><option value="people">People</option></select></div>
    <label class="drop" id="drop" for="impFile">${ic("up")}<b>Drop a CSV file here</b><span class="small muted">or click to choose one. Save Excel files as CSV first. Your columns don't need to match ours.</span><input type="file" id="impFile" accept=".csv,.txt" hidden></label>`;
  else {
    const used = new Set(imp.map.filter(Boolean));
    const missing = imp.kind === "items" ? ["name"].filter(k => !used.has(k)) : ["name"].filter(k => !used.has(k));
    left = `<div class="steps"><span class="done">1 · File</span><span class="on">2 · Match columns</span><span>3 · Import</span></div>
      <p class="small"><b>${esc(imp.name)}</b> · ${imp.rows.length} rows. We matched your columns. Fix any that look wrong.</p>
      <div class="tw"><table class="t"><thead><tr><th>Your column</th><th>Goes into</th><th>Example</th></tr></thead><tbody>${imp.headers.map((h, i) => `<tr><td><b>${esc(h)}</b></td><td><select class="sel" data-map="${i}" style="height:30px"><option value="">Skip</option>${spec.fields.map(([k, l]) => `<option value="${k}" ${imp.map[i] === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></td><td class="muted">${esc(imp.rows[0]?.[i] || "")}</td></tr>`).join("")}</tbody></table></div>
      ${missing.length ? `<div class="note-box warn">${ic("info")}<span>Match a column to "${esc(spec.fields.find(f => f[0] === missing[0])[1])}" to continue.</span></div>` : ""}
      <div class="row"><button class="btn" type="button" data-impcancel="1">Start over</button><span class="spacer"></span><button class="btn go" type="button" data-impgo="1" ${missing.length ? "disabled" : ""}>Import ${imp.rows.length} rows</button></div>`;
  }
  const hist = S.act.filter(a => a.kind === "import" || a.kind === "export").slice(0, 20);
  return `${head("Import & export", "Bring your existing data in, and take everything out whenever you want. Your data is yours.", "")}
  <div class="grid2e">${card("Import", `<div class="form">${left}</div>`)}
  ${card("Export", `<div class="form"><div class="f2"><div class="field"><label for="exDs">Data</label><select class="sel" id="exDs"><option value="items">${esc(WDEF.items)} (last 30 days)</option><option value="customers">Customers</option><option value="cases">Conversations</option><option value="people">People & access</option><option value="qa">QA reviews</option><option value="activity">Activity log</option></select></div><div class="field"><label for="exFmt">Format</label><select class="sel" id="exFmt"><option value="csv">CSV (opens in Excel)</option><option value="json">JSON</option></select></div></div>
    <div class="row"><button class="btn primary" type="button" data-doexport="1">${ic("down")}Download</button></div>
    <div class="optrow"><div><b>Full backup</b><span>Every table, as one JSON file.</span></div>${can(5) ? `<button class="btn" type="button" data-backup="1">Download everything</button>` : `<span class="small muted">${ic("lock")} Owner</span>`}</div></div>`)}</div>
  ${card("History", hist.length ? `<ul class="feed">${hist.map(a => `<li><time>${dShort(a.at)}</time><span>${esc(a.text)} <small>· ${esc(nameOf(a.actor_email))}</small></span></li>`).join("")}</ul>` : empty("No imports or exports yet."), true)}`;
};
function readImportFile(f) {
  if (!/\.(csv|txt)$/i.test(f.name)) return toast("Please save the file as CSV first (in Excel: File → Save As → CSV).");
  const kind = $("#impKind") ? $("#impKind").value : "items";
  const r = new FileReader();
  r.onload = () => { const p = parseCSV(String(r.result)); if (!p.headers.length || !p.rows.length) return toast("That file looks empty. It needs a header row and at least one data row."); const fields = IMPORTS[kind]().fields; ui.imp = { kind, name: f.name, headers: p.headers, rows: p.rows, map: p.headers.map(h => guessCol(h, fields)) }; render(); };
  r.readAsText(f);
}
async function runImport() {
  const imp = ui.imp, get = (row, k) => { const i = imp.map.indexOf(k); return i > -1 ? (row[i] || "").trim() : ""; };
  const cid = CLIENT.id;
  try {
    if (imp.kind === "items") {
      const nums = S.items.map(i => +String(i.ext_id).replace(/\D/g, "")).filter(n => n > 0); let next = Math.max(1000, ...nums) + 1;
      const prefix = { delivery: "D", lab: "V", kitchen: "C" }[CLIENT.workspace_type] || "J";
      const stages = [...WDEF.stages, ...WDEF.alt];
      const rows = imp.rows.filter(r => get(r, "name")).map(r => { const d = new Date(get(r, "due")); const st = get(r, "status").toLowerCase(); const data = { t: {} }; WDEF.fields.forEach(([k]) => { const v = get(r, k); if (v) data[k] = k === "value" ? +v || 0 : v; }); return { client_id: cid, ext_id: get(r, "ext_id") || `${prefix}-${next++}`, name: get(r, "name"), phone: get(r, "phone"), area: get(r, "area") || null, owner: get(r, "owner") || null, status: (stages.find(s => s[0] === st || s[1].toLowerCase() === st) || WDEF.stages[0])[0], due: (isNaN(d) ? new Date(Date.now() + 3600000) : d).toISOString(), data, hist: [{ at: new Date().toISOString(), text: "Imported from " + imp.name, by: ME.email }] }; });
      for (let i = 0; i < rows.length; i += 500) (await DB.upsert("items", rows.slice(i, i + 500), "client_id,ext_id")).forEach(x => putRow(S.items, x));
      await logAct(`Imported ${rows.length} ${WDEF.items.toLowerCase()} from ${imp.name}`, "import");
      toast(`${rows.length} imported. Customers were created from their phone numbers.`);
      if (!DEMO) S.cust = await DB.list("customers", { eq: { client_id: cid }, limit: 10000 });
    } else if (imp.kind === "customers") {
      const rows = imp.rows.filter(r => get(r, "name")).map(r => ({ client_id: cid, name: get(r, "name"), phone: get(r, "phone"), area: get(r, "area") || null, tags: get(r, "tags") ? get(r, "tags").split(/[;,]/).map(s => s.trim()).filter(Boolean) : [], notes: get(r, "notes") }));
      const fresh = rows.filter(r => !r.phone || !S.cust.some(c => c.phone === r.phone));
      for (let i = 0; i < fresh.length; i += 500) S.cust.push(...await DB.insert("customers", fresh.slice(i, i + 500)));
      await logAct(`Imported ${fresh.length} customers from ${imp.name}${rows.length > fresh.length ? ` (${rows.length - fresh.length} already existed)` : ""}`, "import");
      toast(`${fresh.length} customers added${rows.length > fresh.length ? `, ${rows.length - fresh.length} skipped as duplicates` : ""}.`);
    } else {
      const types = ["Full-time", "Part-time", "Contractor"];
      const rows = imp.rows.filter(r => get(r, "name")).map(r => { const d = new Date(get(r, "ends_on")); return { client_id: cid, name: get(r, "name"), job: get(r, "job"), dept: DEPTS.find(x => x.toLowerCase() === get(r, "dept").toLowerCase()) || "Operations", emp_type: types.find(x => x.toLowerCase() === get(r, "emp_type").toLowerCase()) || "Full-time", phone: get(r, "phone"), email: get(r, "email"), ends_on: isNaN(d) ? null : isoDay(d) }; });
      S.people.push(...await DB.insert("people", rows));
      await logAct(`Imported ${rows.length} people from ${imp.name}`, "import"); toast(`${rows.length} people added.`);
    }
    ui.imp = null; render();
  } catch (e) { toast(errMsg(e)); }
}
function exportData(kind, fmt = "csv") {
  const cname = (CLIENT?.slug || "jreebs") + "-" + isoDay(new Date());
  let rows = [];
  if (kind === "items" || kind === "selected") rows = (kind === "selected" ? ITEMS.filter(i => ui.sel.has(i.id)) : ITEMS).map(i => ({ ref: i.ext_id, customer: i.name, phone: i.phone, area: i.area || "", status: stageName(i.status), [WDEF.ownerLabel.toLowerCase()]: i.owner || "", handled_by: i.assigned_to ? memberName(i.assigned_to) : "", created: new Date(i.created * 60000).toISOString(), due: new Date(i.due * 60000).toISOString(), done: doneAt(i) ? new Date(doneAt(i) * 60000).toISOString() : "", ...Object.fromEntries(WDEF.fields.map(([k]) => [k, i.data?.[k] ?? ""])), flags: i.flags.map(f => f.text).join("; ") }));
  if (kind === "customers") rows = S.cust.map(c => ({ name: c.name, phone: c.phone, area: c.area || "", tags: c.tags.join("; "), notes: c.notes, since: c.created_at }));
  if (kind === "cases") rows = S.cases.map(c => ({ created: c.created_at, customer: S.cust.find(x => x.id === c.customer_id)?.name || "", channel: c.channel, type: c.kind, status: c.status, assigned_to: c.assignee ? memberName(c.assignee) : "", messages: S.msgs.filter(m => m.case_id === c.id).map(m => `[${m.dir}] ${m.body}`).join(" | ") }));
  if (kind === "people") rows = S.people.map(p => ({ name: p.name, department: p.dept, job: p.job, type: p.emp_type, phone: p.phone, email: p.email, contract_ends: p.ends_on || "", active: p.active, systems: p.tools.join("; ") }));
  if (kind === "qa") rows = S.qa.map(r => ({ date: r.created_at, person: r.agent_name, reviewed: r.ref, score_pct: qaPct(r), scores: r.scores.join("/"), note: r.note, reviewer: r.reviewer_email }));
  if (kind === "activity") rows = S.act.map(a => ({ time: a.at, who: a.actor_email || "system", action: a.text, kind: a.kind }));
  if (kind === "report") rows = REPORT_ROWS;
  if (!rows.length) return toast("Nothing to export yet.");
  if (fmt === "json") download(`${cname}-${kind}.json`, JSON.stringify(rows, null, 2), "application/json"); else download(`${cname}-${kind}.csv`, toCSV(rows));
  logAct(`Exported ${rows.length} rows (${kind}, ${fmt.toUpperCase()})`, "export");
  toast(`${rows.length} rows downloaded.`);
}
function backupAll() {
  const out = { exported_at: new Date().toISOString(), company: CLIENT.name, workspace_type: CLIENT.workspace_type, config: CFG, profile: S.profile };
  ["items", "cust", "cases", "msgs", "people", "shifts", "qa", "docs", "plats", "links", "sops", "tpls", "rules", "act"].forEach(k => out[k] = S[k]);
  download(`${CLIENT.slug}-backup-${isoDay(new Date())}.json`, JSON.stringify(out, null, 2), "application/json");
  logAct("Downloaded a full backup", "export"); toast("Backup downloaded.");
}
