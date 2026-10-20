/* Setup: automations, message templates, integrations, import & export. */

/* ---------- AUTOMATIONS ---------- */
const flaggingNow = id => ITEMS.filter(i => !isTerm(i) && i.flags.some(f => f.rule === id)).length;
VIEWS.automations = function () {
  const edit = can(4), custom = customRules(), bs = liveBoards();
  const describe = (d, B) => [`${d.when === "due" ? `${d.mins || 0} min after the ${B.dueLabel.toLowerCase()} time` : d.when === "status" ? `${d.mins || 0} min in "${stageName(d.status, B)}"` : `${d.mins || 0} min after it's created`}`, d.cond === "area" ? `Area is ${d.val}` : d.cond === "tag" ? `Customer tag is ${d.val}` : d.cond === "value" ? `Value over ${d.val} JOD` : d.cond === "noowner" ? `No ${B.ownerLabel.toLowerCase()} yet` : `Any ${B.item.toLowerCase()}`];
  const builtIn = bs.flatMap(b => b.rules.map(r => [b, r]));
  const rows = (b, r) => { const k = ruleKey(b, r); return `<div class="rule"><div style="display:grid;gap:6px;min-width:0"><div class="row"><span class="nm">${esc(r.name)}</span>${ruleOn(k) ? pill(`flagging ${flaggingNow(k)} now`, flaggingNow(k) ? "acc" : "") : pill("Off")}</div><span class="small muted">${esc(r.desc || "")}</span></div><button class="sw" type="button" role="switch" aria-checked="${ruleOn(k)}" aria-label="${esc(r.name)}" data-rule="${k}" ${edit ? "" : "disabled"}></button></div>`; };
  return `${head("Automations", "Rules that watch your work and flag what needs attention, with the right message ready.", edit ? `<button class="btn go" type="button" data-modal="rule">${ic("plus")}New automation</button>` : "")}
  ${edit ? "" : `<div class="note-box">${ic("info")}<span>You can see every automation. Managers and owners switch them on or off and build new ones.</span></div>`}
  <section class="kpis">${kpi("Active", builtIn.filter(([b, r]) => ruleOn(ruleKey(b, r))).length + custom.filter(r => r.enabled).length, `of ${builtIn.length + custom.length}`)}${kpi("Flagging now", ITEMS.filter(i => !isTerm(i) && attention(i)).length, "open records")}</section>
  ${bs.filter(b => b.rules.length).map(b => card(`${esc(b.items)} · built in`, b.rules.map(r => rows(b, r)).join(""), true)).join("")}
  ${card("Your automations", custom.length ? custom.map(r => { const B = BDEF(r.def.board || "main"), [w, c] = describe(r.def, B); return `<div class="rule"><div style="display:grid;gap:8px;min-width:0"><div class="row"><span class="nm">${esc(r.def.name)}</span>${multi() ? `<span class="bt">${esc(B.items)}</span>` : ""}${r.enabled ? pill(`flagging ${flaggingNow(r.rule_id)} now`, flaggingNow(r.rule_id) ? "acc" : "") : pill("Off")}</div>
    <div class="flow"><span class="k">WHEN</span><span class="v">${esc(w)}</span><span class="k">IF</span><span class="v">${esc(c)}</span><span class="k">THEN</span><span class="v then">Flag "${esc(r.def.label || r.def.name)}"</span>${r.def.tpl ? `<span class="v then">Ready: ${esc(S.tpls.find(t => t.key === r.def.tpl)?.name || r.def.tpl)}</span>` : ""}</div></div>
    <div class="row">${edit ? `<button class="btn sm ghost danger" type="button" data-delrule="${r.id}" aria-label="Delete">${ic("trash")}</button>` : ""}<button class="sw" type="button" role="switch" aria-checked="${r.enabled}" aria-label="${esc(r.def.name)}" data-crule="${r.id}" ${edit ? "" : "disabled"}></button></div></div>`; }).join("") : `<div class="card-b">${empty(edit ? "Build rules for your own way of working, like flagging VIP orders after 20 minutes." : "None yet.")}</div>`, true)}
  <p class="small muted">Rules run live in the dashboard for everyone who's signed in. Sending WhatsApp messages automatically, with nobody pressing send, needs the WhatsApp Business API (see Integrations).</p>`;
};
function ruleModal(boardId) {
  const B = boardId ? BDEF(boardId) : WDEF;
  openModal(`${mHead("New automation")}<div class="m-b form">
    <div class="f2"><div class="field"><label for="rn">Name</label><input class="in" id="rn" placeholder="e.g. VIP order waiting too long"></div><div class="field"><label for="rb">Watches</label><select class="sel" id="rb">${liveBoards().map(b => `<option value="${b.id}" ${b.id === B.id ? "selected" : ""}>${esc(b.items)}</option>`).join("")}</select></div></div>
    <div class="f3"><div class="field"><label for="rw">When</label><select class="sel" id="rw"><option value="created">It was created</option><option value="due">${esc(B.dueLabel)} time passes</option><option value="status">It sits in a status</option></select></div><div class="field"><label for="rs">Status</label><select class="sel" id="rs">${[...B.stages, ...B.alt].map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div><div class="field"><label for="rm">For at least (min)</label><input class="in" id="rm" type="number" min="0" value="20"></div></div>
    <div class="f2"><div class="field"><label for="rc">Only if</label><select class="sel" id="rc"><option value="any">Any ${esc(B.item.toLowerCase())}</option>${B.hasPhone ? `<option value="tag">Customer has tag</option>` : ""}${B.hasArea ? `<option value="area">Area is</option>` : ""}<option value="noowner">No ${esc(B.ownerLabel.toLowerCase())} assigned</option>${B.hasValue ? `<option value="value">Value over (JOD)</option>` : ""}</select></div><div class="field"><label for="rv">Value</label><input class="in" id="rv" placeholder="e.g. VIP or Abdoun"></div></div>
    <div class="f3"><div class="field"><label for="rl">Flag text</label><input class="in" id="rl" placeholder="e.g. VIP waiting"></div><div class="field"><label for="rsev">Urgency</label><select class="sel" id="rsev"><option value="3">Urgent (red)</option><option value="2" selected>Check (amber)</option><option value="1">Info (blue)</option></select></div><div class="field"><label for="rt">Message ready</label><select class="sel" id="rt"><option value="">None</option>${S.tpls.map(t => `<option value="${esc(t.key)}">${esc(t.name)}</option>`).join("")}</select></div></div>
    <div class="note-box">${ic("bolt")}<span id="rprev"></span></div></div>
    <div class="m-f"><button class="btn" type="button" data-act="mclose">Cancel</button><button class="btn go" type="button" data-saverule="1">Create and turn on</button></div>`);
  $("#rb").onchange = e => ruleModal(e.target.value);
  const upd = () => { const w = $("#rw").value; $("#rs").disabled = w !== "status"; $("#rv").disabled = ["any", "noowner"].includes($("#rc").value); $("#rprev").textContent = `Flags any ${B.item.toLowerCase()} ${w === "created" ? `${$("#rm").value} min after it's created` : w === "due" ? `${$("#rm").value} min past its ${B.dueLabel.toLowerCase()} time` : `in "${stageName($("#rs").value, B)}" for ${$("#rm").value}+ min`}${$("#rc").value === "any" ? "" : $("#rc").value === "noowner" ? ` with no ${B.ownerLabel.toLowerCase()}` : ` where ${$("#rc").selectedOptions[0].text.toLowerCase()} ${$("#rv").value}`}, as "${$("#rl").value || $("#rn").value || "…"}".`; };
  ["#rw", "#rs", "#rm", "#rc", "#rv", "#rl", "#rn"].forEach(s => $(s).addEventListener("input", upd)); upd();
}

/* ---------- TEMPLATES ---------- */
VIEWS.templates = function () {
  const edit = can(4);
  return `${head("Message templates", "Ready messages in Arabic and English. Names, numbers and times fill in on their own.", edit ? `<button class="btn go" type="button" data-modal="tpl">${ic("plus")}New template</button>` : "")}
  <div class="row small muted">Fills in automatically: ${[...new Set(["{first}", "{name}", "{id}", "{late}", "{due}", "{owner}", "{area}", ...BOARDS.flatMap(b => b.fields.map(f => "{" + f[0] + "}"))])].map(v => `<span class="var">${v}</span>`).join(" ")}</div>
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
  ["Data & reports", "Google Sheets", "Link a sheet your team already uses. New and changed rows come into Jreebs on their own.", "self", "GS"],
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
  <div class="ints">${list.map(([cat, n, d, st, lg]) => { const asked = S.tickets.some(t => t.subject === "Connect " + n); return `<section class="card int"><div class="row"><span class="lg">${esc(lg)}</span><div class="grow"><b>${esc(n)}</b><div class="small muted">${esc(cat)}</div></div></div><p>${esc(d)}</p><div class="row">${st === "self" ? pill("Ready to use", "good") + `<span class="spacer"></span><button class="btn sm primary" type="button" data-nav="data">Link a sheet</button>` : st === "on" ? pill("Active", "good") : asked ? pill("Requested", "acc") : pill("Set up with Jreebs", "warn")}<span class="spacer"></span>${st === "on" || st === "self" || asked ? "" : `<button class="btn sm primary" type="button" data-reqint="${esc(n)}">Request</button>`}</div></section>`; }).join("")}</div>`;
};

/* ---------- IMPORT & EXPORT, and linked Google Sheets ---------- */
const IMPORTS = {
  items: (b) => { const B = BDEF(b); return { label: B.items, fields: [["ext_id", "Reference number"], ["name", B.nameLabel], ...(B.hasPhone ? [["phone", "Phone"]] : []), ...(B.hasArea ? [["area", "Area"]] : []), ["owner", B.ownerLabel], ["status", "Status"], ["due", B.dueLabel], ...B.fields] }; },
  customers: () => ({ label: "Customers", fields: [["name", "Name"], ["phone", "Phone"], ["email", "Email"], ["area", "Area"], ["tags", "Tags"], ["notes", "Notes"]] }),
  people: () => ({ label: "People", fields: [["name", "Name"], ["job", "Job"], ["dept", "Department"], ["emp_type", "Type"], ["phone", "Phone"], ["email", "Email"], ["ends_on", "Contract ends"]] }),
  qa: () => ({ label: "Quality reviews", fields: [["agent", "Person reviewed"], ["date", "Review date"], ["channel", "Channel"], ["ref", "Customer or reference"], ["score", "Overall score (%)"], ...QA_CRIT().map((c, i) => ["c" + i, `${c} (1–5)`]), ["note", "Coaching note"], ["reviewer", "Reviewed by"]] })
};
const importKinds = () => `${liveBoards().map(b => `<option value="items:${b.id}">${esc(b.items)}</option>`).join("")}<option value="customers">Customers</option><option value="people">People</option>${modOn("quality") ? `<option value="qa">Quality reviews</option>` : ""}`;
function guessCol(h, fields) {
  const x = h.toLowerCase().replace(/[^a-z0-9]/g, "");
  const syn = { ext_id: ["order", "orderno", "ref", "reference", "ticket", "number", "no", "id"], name: ["customer", "name", "client", "patient", "company", "title", "task"], phone: ["phone", "mobile", "tel", "whatsapp"], email: ["email", "mail"], area: ["area", "zone", "district", "city"], owner: ["driver", "owner", "assignee", "assigned", "technician", "salesperson", "rider", "team"], status: ["status", "stage", "state"], due: ["due", "deadline", "eta", "promised", "visit", "close", "time"], tags: ["tags", "tag", "segment"], dept: ["department", "dept"], job: ["job", "position", "jobtitle"], emp_type: ["type", "contract"], ends_on: ["end", "ends", "until"], agent: ["agent", "person", "reviewed", "employee", "staff"], date: ["date", "day", "reviewedon"], channel: ["channel", "source"], score: ["score", "percent", "overall", "total"], note: ["note", "comment", "feedback", "coaching"], reviewer: ["reviewer", "reviewedby", "by"], ref: ["ref", "reference", "ticket", "case", "order", "customer"] };
  const byLabel = fields.find(([k, l]) => { const y = l.toLowerCase().replace(/\(.*\)/, "").replace(/[^a-z0-9]/g, ""); return y && (x === y || x.includes(y)); });
  if (byLabel && /^c\d+$/.test(byLabel[0])) return byLabel[0];
  for (const [k] of fields) if ((syn[k] || [k]).some(s => x === s || x.includes(s))) return k;
  return byLabel ? byLabel[0] : "";
}
VIEWS.data = function () {
  const imp = ui.imp, spec = imp ? IMPORTS[imp.kind](imp.board) : null, sheets = cfg("sheets", []);
  const fileStart = `<div class="field"><label for="impKind">What are you importing?</label><select class="sel" id="impKind">${importKinds()}</select></div>
    <label class="drop" id="drop" for="impFile">${ic("up")}<b>Drop a CSV file here</b><span class="small muted">or click to choose one. Save Excel files as CSV first. Your columns don't need to match ours.</span><input type="file" id="impFile" accept=".csv,.txt" hidden></label>`;
  let mapper = "";
  if (imp) {
    const used = new Set(imp.map.filter(Boolean)), need = imp.kind === "qa" ? "agent" : "name", missing = used.has(need) ? [] : [need];
    mapper = `<div class="steps"><span class="done">1 · ${imp.sheet ? "Sheet" : "File"}</span><span class="on">2 · Match columns</span><span>3 · ${imp.sheet ? "Link" : "Import"}</span></div>
      <p class="small"><b>${esc(imp.name)}</b> · ${imp.rows.length} rows into <b>${esc(spec.label)}</b>. We matched your columns. Fix any that look wrong.</p>
      <div class="tw"><table class="t"><thead><tr><th>Your column</th><th>Goes into</th><th>Example</th></tr></thead><tbody>${imp.headers.map((h, i) => `<tr><td><b>${esc(h)}</b></td><td><select class="sel" data-map="${i}" style="height:30px"><option value="">Skip</option>${spec.fields.map(([k, l]) => `<option value="${k}" ${imp.map[i] === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></td><td class="muted">${esc(imp.rows[0]?.[i] || "")}</td></tr>`).join("")}</tbody></table></div>
      ${missing.length ? `<div class="note-box warn">${ic("info")}<span>Match a column to "${esc(spec.fields.find(f => f[0] === missing[0])[1])}" to continue.</span></div>` : ""}
      ${imp.sheet && imp.kind === "items" && !used.has("ext_id") ? `<div class="note-box">${ic("info")}<span>Tip: match a reference or ID column so each row updates the same record when the sheet changes. Without one, Jreebs recognises rows by name, phone and date.</span></div>` : ""}
      <div class="row"><button class="btn" type="button" data-impcancel="1">Start over</button><span class="spacer"></span><button class="btn go" type="button" data-impgo="1" ${missing.length ? "disabled" : ""}>${imp.sheet ? `Link sheet and import ${imp.rows.length} rows` : `Import ${imp.rows.length} rows`}</button></div>`;
  }
  const hist = S.act.filter(a => a.kind === "import" || a.kind === "export" || a.kind === "sheet").slice(0, 20);
  const kindName = s => s.kind === "items" ? (BDEF(s.board)?.items || "Work") : IMPORTS[s.kind]().label;
  return `${head("Import & export", "Bring your existing data in, keep a Google Sheet in sync, and take everything out whenever you want.", "")}
  ${card("Linked Google Sheets", `<div class="card-b stack" style="gap:12px">
    <p class="small muted">Still running part of the work in a Google Sheet? Link it once and Jreebs pulls the rows in, then keeps them up to date: new rows are added and changed rows are updated. Your team can move over at their own pace.</p>
    ${sheets.length ? `<div class="tw"><table class="t"><thead><tr><th>Sheet</th><th>Fills</th><th class="r">Rows</th><th>Last synced</th><th></th></tr></thead><tbody>${sheets.map(s => `<tr><td><b>${esc(s.name || "Google Sheet")}</b><div class="small muted" style="max-width:320px;overflow:hidden;text-overflow:ellipsis">${esc(s.url)}</div></td><td>${esc(kindName(s))}</td><td class="r num">${s.rows ?? "—"}</td><td class="small">${s.last ? ago(s.last) : "never"}${s.error ? `<div class="crit-t">${esc(s.error)}</div>` : ""}</td><td class="r"><div class="row" style="flex-wrap:nowrap;justify-content:flex-end"><button class="btn sm" type="button" data-sync="${s.id}">${ic("refresh")}Sync now</button><button class="btn sm ghost danger" type="button" data-unlink="${s.id}">Unlink</button></div></td></tr>`).join("")}</tbody></table></div>` : ""}
    ${imp && imp.sheet ? `<div class="form">${mapper}</div>` : imp ? `<p class="small muted">Finish the file import below first, then link a sheet.</p>` : `<div class="f2"><div class="field"><label for="shUrl">Google Sheet link</label><input class="in" id="shUrl" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(ui.shUrl || "")}"></div><div class="field"><label for="shKind">It fills</label><select class="sel" id="shKind">${importKinds()}</select></div></div>
    <div class="row"><button class="btn go" type="button" data-readsheet="1">${ic("plug")}Read the sheet</button>${DEMO ? `<button class="btn" type="button" data-samplesheet="1">Use a sample sheet</button>` : ""}<span class="small muted">In Google Sheets: Share → General access → Anyone with the link → Viewer. Pick the right tab before copying the link.</span></div>`}
    <p class="small muted">Jreebs checks linked sheets each time a manager opens the app, at most once an hour, and whenever you press Sync now. Anyone with a "view" link can read the sheet, so share it only with people you trust.</p></div>`, true)}
  <div class="grid2e">${card("Import a file", `<div class="form">${imp && !imp.sheet ? mapper : fileStart}</div>`)}
  ${card("Export", `<div class="form"><div class="f2"><div class="field"><label for="exDs">Data</label><select class="sel" id="exDs">${liveBoards().map(b => `<option value="items:${b.id}">${esc(b.items)} (last 30 days)</option>`).join("")}<option value="customers">Customers</option><option value="cases">Conversations</option><option value="people">People & access</option><option value="qa">QA reviews</option><option value="activity">Activity log</option></select></div><div class="field"><label for="exFmt">Format</label><select class="sel" id="exFmt"><option value="csv">CSV (opens in Excel)</option><option value="json">JSON</option></select></div></div>
    <div class="row"><button class="btn primary" type="button" data-doexport="1">${ic("down")}Download</button></div>
    <div class="optrow"><div><b>Full backup</b><span>Every table, as one JSON file.</span></div>${can(5) ? `<button class="btn" type="button" data-backup="1">Download everything</button>` : `<span class="small muted">${ic("lock")} Owner</span>`}</div></div>`)}</div>
  ${card("History", hist.length ? `<ul class="feed">${hist.map(a => `<li><time>${dShort(a.at)}</time><span>${esc(a.text)} <small>· ${esc(nameOf(a.actor_email || "system"))}</small></span></li>`).join("")}</ul>` : empty("No imports or exports yet."), true)}`;
};
// Google pads sheets with empty columns and rows; drop them.
const tidyCSV = p => { const keep = p.headers.map((h, i) => h ? i : -1).filter(i => i > -1); return { headers: keep.map(i => p.headers[i]), rows: p.rows.map(r => keep.map(i => r[i] ?? "")).filter(r => r.some(Boolean)) }; };
function startImport(kindSel, name, text, sheet) {
  const [kind, board] = kindSel.split(":"), p = tidyCSV(parseCSV(String(text)));
  if (!p.headers.length || !p.rows.length) return toast("That looks empty. It needs a header row and at least one data row.");
  const fields = IMPORTS[kind](board).fields;
  ui.imp = { kind, board, name, sheet, headers: p.headers, rows: p.rows, map: p.headers.map(h => guessCol(h, fields)) }; render();
}
function readImportFile(f) {
  if (!/\.(csv|txt)$/i.test(f.name)) return toast("Please save the file as CSV first (in Excel: File → Save As → CSV).");
  const sel = $("#impKind") ? $("#impKind").value : "items:" + ui.board;
  const r = new FileReader(); r.onload = () => startImport(sel, f.name, r.result); r.readAsText(f);
}
// Turns any Google Sheets link into its CSV download. Published (“Publish to web”) links and plain CSV links work too.
function sheetCsvUrl(link) {
  const u = String(link || "").trim();
  if (/\/spreadsheets\/d\/e\//.test(u)) return u.replace(/\/pubhtml.*$/, "/pub?output=csv").replace(/output=[a-z]+/, "output=csv");
  const m = u.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) { const gid = (u.match(/[#&?]gid=(\d+)/) || [])[1] || "0"; return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv&gid=${gid}`; }
  return u;
}
async function fetchSheet(link) {
  if (String(link).startsWith("sample:")) { const k = link.slice(7); sampleRuns[k] = (sampleRuns[k] || 0) + 1; return sampleSheet(k); }
  let res; try { res = await fetch(sheetCsvUrl(link), { cache: "no-store" }); } catch (e) { throw new Error("Couldn't open the sheet. Make sure it's shared as \"Anyone with the link can view\"."); }
  const text = await res.text();
  if (!res.ok || /^\s*<(!doctype|html)/i.test(text)) throw new Error("Couldn't read the sheet. Share it as \"Anyone with the link can view\", then try again.");
  return text;
}
// Demo only: a pretend Google Sheet, so linking and syncing can be tried without a real one. Each sync changes a few rows.
const sampleRuns = {};
function sampleSheet(kindSel) {
  const [kind, board] = kindSel.split(":"), r = sampleRuns[kindSel] || 0, names = ["Rania Haddad", "Omar Khalil", "Lina Saleh", "Yousef Nasser", "Dana Qasem", "Hamza Odeh", "Sara Barakat", "Khaled Amro"];
  const day = n => isoDay(Date.now() + n * 864e5), q = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v, csv = rows => rows.map(x => x.map(v => q(String(v))).join(",")).join("\n");
  if (kind === "qa") {
    const ag = S.people.filter(p => p.dept === "Customer care").map(p => p.name).slice(0, 4), who = ag.length ? ag : names.slice(0, 4);
    const rows = who.flatMap((a, i) => [0, 1].map(k => [a, day(-(i + k * 3 + 1)), k ? "Email" : "WhatsApp", `T-${4100 + i * 2 + k}`, 72 + ((i * 7 + k * 11) % 26), k ? "Clear answer, could close faster" : "Friendly. Follow the refund steps in full."]));
    for (let n = 1; n <= r; n++) rows.push([who[n % who.length], day(0), "WhatsApp", `T-${4200 + n}`, 80 + (n * 3) % 18, "New review added in the sheet"]);
    return csv([["Agent", "Date", "Channel", "Ticket", "Score %", "Comment"], ...rows]);
  }
  if (kind === "customers") return csv([["Customer name", "Mobile", "Email", "City"], ...names.slice(0, 6 + r).concat(r ? ["Nour Hijazi"] : []).map((n, i) => [n, "07" + (90000000 + i * 1234567), n.split(" ")[0].toLowerCase() + "@example.com", ["Amman", "Zarqa", "Irbid"][i % 3]])]);
  if (kind === "people") return csv([["Name", "Position", "Department", "Phone"], ...["Tala Shami", "Bilal Kurdi", "Reem Awad"].concat(r ? ["Zaid Hourani"] : []).map((n, i) => [n, ["Coordinator", "Agent", "Supervisor", "Agent"][i], ["Operations", "Customer care", "Customer care", "Customer care"][i], "079" + (5550000 + i * 111)])]);
  const B = BDEF(board), st = B.stages, own = ownerPeople(B).map(p => p.name), who = own.length ? own : names;
  const rows = names.slice(0, 6).map((n, i) => [`GS-${101 + i}`, n, "07" + (95000000 + i * 765431), who[i % who.length], st[Math.min(st.length - 2, (i % 3) + (i < 2 ? r : 0))][1], `${day(i % 3)} ${String(10 + i).padStart(2, "0")}:30`]);
  for (let n = 1; n <= r; n++) rows.push([`GS-${106 + n}`, names[(5 + n) % names.length], "07" + (96000000 + n * 1111), who[n % who.length], st[0][1], `${day(1)} 12:00`]);
  return csv([["Ref", "Customer", "Phone", "Assigned to", "Status", "Due"], ...rows]);
}
const rowKey = (...v) => "G" + (hashN(v.join("|").toLowerCase()) % 900000 + 100000);
// Adds new rows and updates changed ones. Used by file imports and by linked sheets.
async function importRows(imp, source) {
  const get = (row, k) => { const i = imp.map.indexOf(k); return i > -1 ? String(row[i] ?? "").trim() : ""; };
  const cid = CLIENT.id, stamp = new Date().toISOString();
  if (imp.kind === "items") {
    const B = BDEF(imp.board), stages = [...B.stages, ...B.alt];
    const nums = S.items.filter(i => String(i.ext_id).startsWith(B.prefix + "-")).map(i => +String(i.ext_id).replace(/\D/g, "")).filter(n => n > 0); let next = Math.max(1000, ...nums) + 1;
    let added = 0, updated = 0; const fresh = [];
    for (const r of imp.rows.filter(r => get(r, "name"))) {
      const d = new Date(get(r, "due")), st = get(r, "status").toLowerCase(), stage = (stages.find(s => s[0] === st || s[1].toLowerCase() === st) || B.stages[0])[0];
      const ext = get(r, "ext_id") || (imp.sheet ? `${B.prefix}-${rowKey(get(r, "name"), get(r, "phone"), get(r, "due"))}` : `${B.prefix}-${next++}`);
      const data = {}; B.fields.forEach(([k]) => { const v = get(r, k); if (v) data[k] = k === "value" ? +String(v).replace(/[^\d.-]/g, "") || 0 : v; });
      const ex = S.items.find(i => i.ext_id === ext);
      if (ex) {
        const patch = {}; const exData = ex.data || {};
        if (get(r, "name") && get(r, "name") !== ex.name) patch.name = get(r, "name");
        if (get(r, "phone") && get(r, "phone") !== ex.phone) patch.phone = get(r, "phone");
        if (get(r, "owner") && get(r, "owner") !== ex.owner) patch.owner = get(r, "owner");
        if (!isNaN(d) && get(r, "due") && Math.abs(new Date(ex.due) - d) > 60000) patch.due = d.toISOString();
        if (Object.keys(data).some(k => String(exData[k] ?? "") !== String(data[k]))) patch.data = { ...exData, ...data };
        if (get(r, "status") && stage !== ex.status) { patch.status = stage; patch.data = { ...(patch.data || exData), t: { ...(exData.t || {}), [stage]: Date.now() } }; }
        if (Object.keys(patch).length) { patch.hist = [...(ex.hist || []), { at: stamp, text: `Updated from ${source}`, by: ME.email }]; putRow(S.items, await DB.update("items", ex.id, patch)); updated++; }
      } else fresh.push({ client_id: cid, board: B.id, ext_id: ext, name: get(r, "name"), phone: get(r, "phone"), area: get(r, "area") || null, owner: get(r, "owner") || null, status: stage, due: (isNaN(d) ? new Date(Date.now() + (B.promise || 60) * 60000) : d).toISOString(), data: { ...data, t: {} }, hist: [{ at: stamp, text: "Imported from " + source, by: ME.email }] });
    }
    for (let i = 0; i < fresh.length; i += 500) (await DB.upsert("items", fresh.slice(i, i + 500), "client_id,ext_id")).forEach(x => putRow(S.items, x));
    added = fresh.length;
    if (!DEMO && added) S.cust = await DB.list("customers", { eq: { client_id: cid }, limit: 10000 });
    return { added, updated, label: B.items.toLowerCase() };
  }
  if (imp.kind === "customers") {
    const rows = imp.rows.filter(r => get(r, "name")).map(r => ({ client_id: cid, name: get(r, "name"), phone: get(r, "phone"), email: get(r, "email") || null, area: get(r, "area") || null, tags: get(r, "tags") ? get(r, "tags").split(/[;,]/).map(s => s.trim()).filter(Boolean) : [], notes: get(r, "notes") }));
    const fresh = rows.filter(r => r.phone ? !S.cust.some(c => c.phone === r.phone) : !S.cust.some(c => c.name.toLowerCase() === r.name.toLowerCase()));
    for (let i = 0; i < fresh.length; i += 500) S.cust.push(...await DB.insert("customers", fresh.slice(i, i + 500)));
    return { added: fresh.length, updated: 0, skipped: rows.length - fresh.length, label: "customers" };
  }
  if (imp.kind === "people") {
    const types = ["Full-time", "Part-time", "Contractor"];
    const rows = imp.rows.filter(r => get(r, "name") && !S.people.some(p => p.name.toLowerCase() === get(r, "name").toLowerCase())).map(r => { const d = new Date(get(r, "ends_on")); return { client_id: cid, name: get(r, "name"), job: get(r, "job"), dept: DEPTS.find(x => x.toLowerCase() === get(r, "dept").toLowerCase()) || "Operations", emp_type: types.find(x => x.toLowerCase() === get(r, "emp_type").toLowerCase()) || "Full-time", phone: get(r, "phone"), email: get(r, "email"), ends_on: isNaN(d) ? null : isoDay(d) }; });
    if (rows.length) S.people.push(...await DB.insert("people", rows));
    return { added: rows.length, updated: 0, label: "people" };
  }
  // quality reviews: either one score per checklist item (1–5) or one overall percentage
  const crit = QA_CRIT(), rows = [];
  for (const r of imp.rows.filter(r => get(r, "agent"))) {
    const d = new Date(get(r, "date")), when = isNaN(d) ? new Date() : d, ref = get(r, "ref"), agent = get(r, "agent");
    if (S.qa.some(q => q.agent_name.toLowerCase() === agent.toLowerCase() && isoDay(q.created_at) === isoDay(when) && (q.ref || "") === ref)) continue;
    const pct = +String(get(r, "score")).replace(/[^\d.]/g, "") || 0, fill = pct ? Math.round(pct / 20) : 3, clamp = v => Math.max(1, Math.min(5, Math.round(v)));
    const scores = crit.map((_, i) => clamp(+get(r, "c" + i) || fill));
    const p = S.people.find(x => x.name.toLowerCase() === agent.toLowerCase());
    rows.push({ client_id: cid, agent_name: p ? p.name : agent, person_id: p?.id || null, ref, channel: get(r, "channel"), scores, note: get(r, "note"), reviewer_email: get(r, "reviewer") || ME.email, created_at: when.toISOString() });
  }
  if (rows.length) S.qa.unshift(...await DB.insert("qa_reviews", rows));
  return { added: rows.length, updated: 0, label: "quality reviews" };
}
async function runImport() {
  const imp = ui.imp;
  try {
    const res = await importRows(imp, imp.sheet ? "Google Sheet" : imp.name);
    if (imp.sheet) {
      const cols = {}; imp.headers.forEach((h, i) => { if (imp.map[i]) cols[h] = imp.map[i]; });
      const list = [...cfg("sheets", []).filter(s => s.url !== imp.sheet), { id: "sh" + Date.now().toString(36), url: imp.sheet, name: imp.name || "Google Sheet", kind: imp.kind, board: imp.board || null, cols, last: new Date().toISOString(), rows: imp.rows.length }];
      await saveConfig({ sheets: list });
      await logAct(`Google Sheet linked to ${res.label}: ${res.added} added${res.updated ? `, ${res.updated} updated` : ""}`, "sheet");
      toast(`Sheet linked. ${res.added} added${res.updated ? `, ${res.updated} updated` : ""}. It stays in sync from now on.`);
    } else {
      await logAct(`Imported ${res.added} ${res.label} from ${imp.name}${res.updated ? `, ${res.updated} updated` : ""}${res.skipped ? ` (${res.skipped} already existed)` : ""}`, "import");
      toast(`${res.added} ${res.label} added${res.updated ? `, ${res.updated} updated` : ""}${res.skipped ? `, ${res.skipped} skipped as duplicates` : ""}.`);
    }
    ui.imp = null; ui.shUrl = ""; render();
  } catch (e) { toast(errMsg(e)); }
}
async function syncSheet(s, quiet) {
  const list = cfg("sheets", []).slice(), i = list.findIndex(x => x.id === s.id);
  try {
    const p = tidyCSV(parseCSV(await fetchSheet(s.url)));
    const map = p.headers.map(h => s.cols[h] || "");
    const res = await importRows({ kind: s.kind, board: s.board, sheet: s.url, headers: p.headers, rows: p.rows, map }, "Google Sheet");
    list[i] = { ...s, last: new Date().toISOString(), rows: p.rows.length, error: null };
    await saveConfig({ sheets: list });
    if (res.added || res.updated) await logAct(`Google Sheet synced: ${res.added} added, ${res.updated} updated (${res.label})`, "sheet");
    if (!quiet || res.added || res.updated) toast(`${s.name || "Sheet"} synced: ${res.added} added, ${res.updated} updated.`);
  } catch (e) { list[i] = { ...s, error: e.message }; try { await saveConfig({ sheets: list }); } catch (x) {} if (!quiet) toast(e.message); }
  render();
}
let sheetsChecked = false;
async function autoSyncSheets() {
  if (sheetsChecked || !can(4)) return; sheetsChecked = true;
  for (const s of cfg("sheets", [])) if (!s.last || Date.now() - new Date(s.last) > 3600e3) await syncSheet(s, true);
}
function exportData(kind, fmt = "csv") {
  const cname = (CLIENT?.slug || "jreebs") + "-" + isoDay(new Date());
  let rows = [];
  const bk = String(kind).startsWith("items:") ? kind.split(":")[1] : ui.board; if (String(kind).startsWith("items:")) kind = "items";
  if (kind === "items" || kind === "selected") rows = (kind === "selected" ? ITEMS.filter(i => ui.sel.has(i.id)) : ITEMS.filter(i => i.board === bk)).map(i => ({ ref: i.ext_id, board: defOf(i).items, name: i.name, phone: i.phone, area: i.area || "", status: stageName(i.status, i), owner: i.owner || "", handled_by: i.assigned_to ? memberName(i.assigned_to) : "", created: new Date(i.created * 60000).toISOString(), due: new Date(i.due * 60000).toISOString(), done: doneAt(i) ? new Date(doneAt(i) * 60000).toISOString() : "", ...Object.fromEntries(defOf(i).fields.map(([k]) => [k, i.data?.[k] ?? ""])), flags: i.flags.map(f => f.text).join("; ") }));
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
