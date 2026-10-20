/* Jreebs app core: helpers, icons, charts, workspace types, data layer, state, loading. */
const SUPABASE_URL = "https://gcjigukdiekalhibokhg.supabase.co";
const SUPABASE_KEY = "sb_publishable_zXqWbvDuUCYk4LNyFxVMiA_zGbELxA5";
const DEMO = new URLSearchParams(location.search).has("demo");
const sb = DEMO ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const JREEBS_WA = "962795384541";
const JREEBS_EMAIL = "hello@jreebs.com";

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtN = n => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 1 });
const mins = ms => ms / 60000;
const nowM = () => mins(Date.now());
const hm = m => new Date(m * 60000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const dShort = d => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const dLong = d => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const isoDay = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysUntil = d => d ? Math.round((startOfDay(new Date(d + "T12:00:00")) - startOfDay()) / 864e5) : null;
const ago = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); if (m < 1) return "just now"; if (m < 60) return m + " min ago"; if (m < 1440) return Math.round(m / 60) + " h ago"; return dShort(iso); };
const hashN = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const initials = n => String(n || "?").replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
const nameOf = email => String(email || "").replace(/@.*/, "").split(/[._-]+/).map(w => w ? w[0].toUpperCase() + w.slice(1) : "").join(" ");
const waNum = p => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.length === 10 && d.startsWith("07")) d = "962" + d.slice(1); return d; };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2));

const P = d => `<path d="${d}"/>`;
const ICON = {
  home: P("M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"), box: P("M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"),
  inbox: P("M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"),
  contact: P("M3 5h18v14H3zM9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 16a3.5 3.5 0 0 1 7 0M15 9h3M15 13h3"),
  team: P("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"),
  star: P("M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 16.9 6.1 20.2l1.3-6.6L2.5 9l6.6-.8z"),
  starf: '<path fill="currentColor" d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 16.9 6.1 20.2l1.3-6.6L2.5 9l6.6-.8z"/>',
  chart: P("M3 3v18h18M7 15l4-4 3 3 5-6"), bolt: P("M13 2 3 14h9l-1 8 10-12h-9z"),
  msg: P("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"), plug: P("M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"),
  swap: P("M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4"),
  gear: '<circle cx="12" cy="12" r="3"/>' + P("M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"),
  shield: P("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"), bell: P("M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"),
  search: '<circle cx="11" cy="11" r="7"/>' + P("m21 21-4.3-4.3"),
  sun: '<circle cx="12" cy="12" r="4"/>' + P("M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"),
  moon: P("M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"), menu: P("M3 6h18M3 12h18M3 18h18"), lock: P("M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4"),
  phone: P("M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"),
  x: P("M18 6 6 18M6 6l12 12"), plus: P("M12 5v14M5 12h14"),
  down: P("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"), up: P("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"),
  check: P("m5 12 5 5L20 7"), cal: P("M3 5h18v16H3zM16 3v4M8 3v4M3 10h18"),
  truck: P("M1 4h14v12H1zM15 9h4l3 3v4h-7") + '<circle cx="5.5" cy="18.5" r="1.5"/><circle cx="18.5" cy="18.5" r="1.5"/>',
  map: P("M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"), info: '<circle cx="12" cy="12" r="9"/>' + P("M12 11v6M12 7.5v.5"),
  key: '<circle cx="7.5" cy="15.5" r="4.5"/>' + P("m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"),
  building: P("M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M2 21h20"),
  grid: P("M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"),
  book: P("M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"),
  mail: P("M3 5h18v14H3zM3 6l9 7 9-7"), chev: P("m6 9 6 6 6-6"), spark: P("M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM19 3v4M17 5h4M5 17v4M3 19h4"),
  out: P("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"), trash: P("M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"),
  edit: P("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"), refresh: P("M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"),
  wa: '<path fill="currentColor" stroke="none" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.2-.2-.4-.3Z"/>'
};
const ic = (n, cls = "") => `<svg ${cls ? `class="${cls}" ` : ""}width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ""}</svg>`;
const av = n => `<span class="av a${hashN(n) % 4}">${esc(initials(n))}</span>`;
const pill = (t, k = "") => `<span class="pill ${k}">${esc(t)}</span>`;
const kpi = (l, v, s, k = "") => `<div class="kpi ${k}"><span class="l">${esc(l)}</span><span class="v">${v}</span><span class="s">${esc(s)}</span></div>`;
const head = (t, sub, actions = "") => `<div class="head"><div class="grow"><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ""}</div><div class="row">${actions}</div></div>`;
const card = (t, b, raw, extra = "") => `<section class="card"><div class="card-h"><h3>${t}</h3>${extra}</div>${raw ? b : `<div class="card-b">${b}</div>`}</section>`;
const empty = t => `<div class="empty">${esc(t)}</div>`;
const scoreCls = s => s >= 90 ? "g" : s >= 80 ? "w" : "c";
const prog = (v, max) => { const p = max ? Math.min(100, v / max * 100) : 0; const cls = p >= 90 ? "" : p >= 60 ? "w" : "c"; return `<div class="prog"><i class="${cls}" style="width:${p.toFixed(0)}%"></i></div>`; };
const hbars = (rows, unit = "") => { if (!rows.length) return empty("No data yet."); const max = Math.max(1, ...rows.map(r => r[1])); return `<div class="hb">${rows.map(([l, v]) => `<div class="hb-r"><span>${esc(l)}</span><span class="hb-t"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span><span class="hb-v num">${fmtN(v)}${unit}</span></div>`).join("")}</div>`; };
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function barChart(vals, labels, o = {}) {
  const W = 640, H = o.h || 210, Lp = 40, Rp = 8, T = 14, B = 26, iw = W - Lp - Rp, ih = H - T - B;
  const max = niceMax(Math.max(1, ...vals.filter(v => v != null))), bw = iw / Math.max(1, vals.length); let g = "";
  for (let k = 0; k <= 4; k++) { const y = T + ih - ih * k / 4; g += `<line x1="${Lp}" x2="${W - Rp}" y1="${y}" y2="${y}" class="gl"/><text x="${Lp - 7}" y="${y + 4}" class="ax" text-anchor="end">${fmtN(Math.round(max * k / 4))}</text>`; }
  vals.forEach((v, i) => { if (v == null) return; const h = ih * v / max, x = Lp + i * bw + bw * .17; g += `<rect x="${x.toFixed(1)}" y="${(T + ih - h).toFixed(1)}" width="${(bw * .66).toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="3" class="bar ${o.hi === i ? "hi" : ""}"><title>${esc(labels[i])}: ${fmtN(v)}</title></rect>`; });
  const every = Math.ceil(vals.length / (o.ticks || 8));
  labels.forEach((l, i) => { if (i % every && i !== vals.length - 1) return; g += `<text x="${(Lp + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" class="ax" text-anchor="middle">${esc(l)}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "Bar chart")}">${g}</svg>`;
}
function lineChart(vals, labels, o = {}) {
  const pts0 = vals.map((v, i) => [v, i]).filter(p => p[0] != null);
  if (pts0.length < 2) return empty("Not enough days of data for a trend yet.");
  const W = 640, H = o.h || 210, Lp = 40, Rp = 44, T = 16, B = 26, iw = W - Lp - Rp, ih = H - T - B;
  const lo = o.min ?? 0, hi = o.max ?? niceMax(Math.max(...pts0.map(p => p[0]))), n = vals.length;
  const X = i => Lp + iw * i / Math.max(1, n - 1), Y = v => T + ih - ih * (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1);
  let g = "";
  for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, y = Y(v); g += `<line x1="${Lp}" x2="${W - Rp}" y1="${y}" y2="${y}" class="gl"/><text x="${Lp - 7}" y="${y + 4}" class="ax" text-anchor="end">${fmtN(Math.round(v))}${o.unit || ""}</text>`; }
  if (o.target != null) { const y = Y(o.target); g += `<line x1="${Lp}" x2="${W - Rp}" y1="${y}" y2="${y}" class="tg"/><text x="${W - Rp + 4}" y="${y + 4}" class="tgl">target</text>`; }
  const pts = pts0.map(([v, i]) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
  const f = pts0[0][1], l = pts0[pts0.length - 1];
  g += `<path class="ar" d="M${X(f)},${T + ih} L${pts.join(" L")} L${X(l[1])},${T + ih} Z"/><polyline class="ln" points="${pts.join(" ")}"/>`;
  g += `<circle class="ep" cx="${X(l[1])}" cy="${Y(l[0])}" r="5"/><text class="epl" x="${X(l[1]) + 8}" y="${Y(l[0]) + 4}">${fmtN(l[0])}${o.unit || ""}</text>`;
  const every = Math.ceil(n / (o.ticks || 7));
  labels.forEach((lb, i) => { if (i % every && i !== n - 1) return; g += `<text x="${X(i).toFixed(1)}" y="${H - 8}" class="ax" text-anchor="middle">${esc(lb)}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "Line chart")}">${g}</svg>`;
}

/* ---------- roles ---------- */
const ROLES = {
  owner: { lvl: 5, label: "Owner" }, manager: { lvl: 4, label: "Manager" }, team_lead: { lvl: 3, label: "Team lead" },
  supervisor: { lvl: 2, label: "Supervisor" }, agent: { lvl: 1, label: "Agent" }, driver: { lvl: 0, label: "Field / driver" }
};
const ROLE_ORDER = ["owner", "manager", "team_lead", "supervisor", "agent", "driver"];
const NEED = { 0: "everyone", 1: "agents and above", 2: "supervisors and above", 3: "team leads and above", 4: "managers and owners", 5: "the owner" };
const DEPT_OF_ROLE = { owner: "Management", manager: "Management", team_lead: "Customer care", supervisor: "Operations", agent: "Customer care", driver: "Field" };

/* ---------- boards: each kind of work a company tracks ----------
   A board is plain data (stages, fields, labels, alert rules), so a company can rename it, change its
   stages, add fields or add another board in Settings › Workspace. Templates pick the starting boards. */
const TR = (key, name, cat, en, ar) => [key, name, cat, en, ar];
const BOARD_LIB = {
  delivery: { item: "Order", items: "Orders", icon: "box", prefix: "D", ownerLabel: "Driver", dueLabel: "Promised by", fieldOwner: true, fieldWord: "drivers", promise: 40,
    stages: [["new", "New"], ["assigned", "Assigned"], ["picked", "On the way"], ["delivered", "Delivered"]], alt: [["failed", "Failed delivery"]], done: "delivered",
    fields: [["store", "Store"], ["value", "Value (JOD)"]],
    templates: [
      TR("late", "Late order apology", "Delays", "Hi {first}, sorry, your order {id} is running about {late} minutes late. {owner} is on the way to you.", "مرحبا {first}، نعتذر، طلبك رقم {id} متأخر حوالي {late} دقيقة. {owner} في الطريق إليك."),
      TR("onway", "On the way", "Updates", "Hi {first}, your order {id} is on the way with {owner}.", "مرحبا {first}، طلبك رقم {id} في الطريق مع {owner}."),
      TR("delivered", "Delivered + rating", "Updates", "Hi {first}, your order {id} was delivered. How did we do? Reply 1–5.", "مرحبا {first}، تم توصيل طلبك رقم {id}. كيف كانت تجربتك؟ رد من ١ لـ ٥."),
      TR("failed", "Failed delivery rebook", "Delays", "Hi {first}, we couldn't reach you for order {id}. Would you like us to try again today or tomorrow?", "مرحبا {first}، ما قدرنا نوصلك بطلبك رقم {id}. بتحب نحاول اليوم ولا بكرا؟"),
      TR("driver", "Message driver", "Team", "Hi {owner}, order {id} for {name} in {area} is due at {due}. Where are you now?", "مرحبا {owner}، الطلب {id} لـ {name} في {area} موعده {due}. وينك هلأ؟"),
      TR("complaint", "Complaint first reply", "Complaints", "Hi {first}, thank you for telling us. I'm checking order {id} now and will update you within 15 minutes.", "مرحبا {first}، شكراً إنك حكيتلنا. عم بتابع طلبك رقم {id} هلأ ورح أرد عليك خلال ١٥ دقيقة.")],
    rules: [
      { id: "late", type: "late", name: "Late order alert", desc: "When an order passes its promised time, flag it and prepare an apology.", label: "Late {d}", sev: 3, tpl: "late" },
      { id: "unassigned", type: "stuck", stage: "new", mins: 5, name: "No driver after 5 min", desc: "Flag new orders still waiting for a driver after 5 minutes.", label: "No driver {d}", sev: 2 },
      { id: "pickup", type: "stuck", stage: "assigned", mins: 20, name: "Slow pickup", desc: "Flag orders assigned 20+ minutes ago but not picked up.", label: "Not picked up", sev: 1, tpl: "driver" }] },
  visits: { item: "Visit", items: "Visits", icon: "cal", prefix: "V", ownerLabel: "Team", dueLabel: "Visit at", fieldOwner: true, fieldWord: "visit teams", promise: 180,
    stages: [["booked", "Booked"], ["confirmed", "Confirmed"], ["onway", "Team on the way"], ["collected", "Sample collected"]], alt: [["noshow", "No-show"]], done: "collected",
    fields: [["test", "Test"]],
    templates: [
      TR("confirm", "Confirm visit", "Updates", "Hello {first}, a reminder of your home visit today at {due} in {area}. Reply 1 to confirm or 2 to change the time.", "مرحباً {first}، نذكّرك بموعد الزيارة المنزلية اليوم الساعة {due} في {area}. ردّ بـ 1 للتأكيد أو 2 لتغيير الموعد."),
      TR("onway", "Team on the way", "Updates", "Hello {first}, our team ({owner}) is on the way and will arrive around {due}.", "مرحباً {first}، فريقنا ({owner}) في الطريق ويصل حوالي الساعة {due}."),
      TR("noshow", "Missed visit", "Delays", "Hello {first}, our team couldn't reach you at {due} today. Would you like to book a new time?", "مرحباً {first}، لم يتمكن فريقنا من الوصول إليك الساعة {due} اليوم. هل تودّ حجز موعد جديد؟")],
    rules: [
      { id: "unconfirmed", type: "duesoon", stage: "booked", mins: 180, name: "Unconfirmed visit reminder", desc: "3 hours before a visit, flag it if it isn't confirmed.", label: "Not confirmed · {due}", sev: 2, tpl: "confirm" },
      { id: "dispatch", type: "duesoon", stage: "confirmed", mins: 30, name: "Team not sent out", desc: "Flag confirmed visits starting in 30 minutes with no team on the way.", label: "Team not on the way", sev: 2 },
      { id: "noshow", type: "late", mins: 20, name: "Possible no-show", desc: "Flag visits 20+ minutes past time with nothing done.", label: "Possible no-show", sev: 3, tpl: "noshow" }] },
  complaints: { item: "Complaint", items: "Complaints", icon: "msg", prefix: "C", ownerLabel: "Agent", dueLabel: "Reply by", fieldWord: "agents", promise: 15, hasArea: false,
    stages: [["new", "New"], ["replied", "Replied"], ["escalated", "Escalated"], ["resolved", "Resolved"]], alt: [["closed", "Closed, no action"]], done: "resolved",
    fields: [["brand", "Brand"], ["issue", "Issue"]],
    templates: [
      TR("apology", "Apology + fix", "Complaints", "Hi {first}, we're sorry about your {brand} order. We're sending a replacement now, or we can refund you. Which do you prefer?", "مرحبا {first}، بنعتذر عن مشكلة طلبك من {brand}. رح نبعتلك طلب بديل هلأ أو منرجعلك المبلغ، شو بتفضّل؟"),
      TR("followup", "Follow up", "Updates", "Hi {first}, did your replacement arrive OK? Thank you for your patience.", "مرحبا {first}، وصلك الطلب البديل بشكل سليم؟ شكراً لصبرك.")],
    rules: [
      { id: "overdue", type: "stuck", stage: "new", mins: 15, name: "15-minute reply promise", desc: "Flag complaints with no reply after 15 minutes.", label: "No reply {d}", sev: 3, tpl: "apology" },
      { id: "repeat", type: "tag", tag: "Repeat", name: "Repeat customer", desc: "Flag customers who complained more than once.", label: "Repeat customer", sev: 1 }] },
  requests: { item: "Request", items: "Customer requests", icon: "inbox", prefix: "R", ownerLabel: "Owner", dueLabel: "Resolve by", promise: 480, hasArea: false,
    stages: [["new", "New"], ["progress", "In progress"], ["waiting", "Waiting on customer"], ["resolved", "Resolved"]], alt: [["closed", "Closed, no action"]], done: "resolved",
    fields: [["category", "Category"], ["priority", "Priority"]],
    templates: [
      TR("req_received", "Request received", "Updates", "Hi {first}, we've received your request {id} and {owner} is looking into it. We'll update you today.", "مرحبا {first}، استلمنا طلبك رقم {id} و{owner} عم يتابعه. رح نحدّثك اليوم."),
      TR("req_update", "Still working on it", "Delays", "Hi {first}, an update on request {id}: we're still working on it and will get back to you by {due}.", "مرحبا {first}، تحديث على طلبك رقم {id}: لسا شغالين عليه ورح نرجعلك قبل {due}."),
      TR("req_resolved", "Resolved + rating", "Updates", "Hi {first}, your request {id} is resolved. How did we do? Reply 1–5.", "مرحبا {first}، تم حل طلبك رقم {id}. كيف كانت تجربتك؟ رد من ١ لـ ٥.")],
    rules: [
      { id: "overdue", type: "late", name: "Past resolve-by time", desc: "Flag open requests that passed their resolve-by time.", label: "Overdue {d}", sev: 3, tpl: "req_update" },
      { id: "untouched", type: "stuck", stage: "new", mins: 30, name: "Not started in 30 min", desc: "Flag new requests nobody has started after 30 minutes.", label: "Waiting {d}", sev: 2, tpl: "req_received" }] },
  sales: { item: "Deal", items: "Sales pipeline", icon: "chart", prefix: "S", ownerLabel: "Salesperson", dueLabel: "Expected close", nameLabel: "Company or contact", promise: 14 * 1440, hasArea: false,
    stages: [["lead", "Lead"], ["qualified", "Qualified"], ["proposal", "Proposal sent"], ["negotiation", "Negotiation"], ["won", "Won"]], alt: [["lost", "Lost"]], done: "won",
    fields: [["value", "Value (JOD)"], ["source", "Source"]],
    templates: [TR("deal_followup", "Proposal follow-up", "Customers", "Hi {first}, following up on the proposal we sent for {id}. Any questions I can answer?", "مرحبا {first}، بتابع معك بخصوص العرض اللي بعتناه ({id}). في أي أسئلة؟")],
    rules: [
      { id: "stale", type: "stuck", stage: "proposal", mins: 3 * 1440, name: "Proposal with no answer", desc: "Flag deals sitting in Proposal sent for 3 days or more.", label: "No answer {d}", sev: 2, tpl: "deal_followup" },
      { id: "pastclose", type: "late", name: "Past expected close", desc: "Flag open deals past their expected close date.", label: "Past close date", sev: 1 }] },
  orders: { item: "Order", items: "Orders", icon: "box", prefix: "O", ownerLabel: "Courier", dueLabel: "Deliver by", fieldOwner: true, fieldWord: "couriers", promise: 1440,
    stages: [["new", "New"], ["confirmed", "Confirmed"], ["preparing", "Preparing"], ["shipped", "Out for delivery"], ["delivered", "Delivered"]], alt: [["cancelled", "Cancelled"], ["returned", "Returned"]], done: "delivered",
    fields: [["value", "Value (JOD)"], ["items", "Items"]],
    templates: [
      TR("order_confirmed", "Order confirmed", "Updates", "Hi {first}, your order {id} is confirmed. We'll deliver it by {due}.", "مرحبا {first}، تم تأكيد طلبك رقم {id}. رح يوصلك قبل {due}."),
      TR("order_shipped", "Out for delivery", "Updates", "Hi {first}, your order {id} is on its way with {owner}.", "مرحبا {first}، طلبك رقم {id} طلع مع {owner}."),
      TR("order_delay", "Order delay", "Delays", "Hi {first}, sorry, your order {id} is running late. We'll update you with a new time shortly.", "مرحبا {first}، نعتذر، طلبك رقم {id} متأخر. رح نبلغك بموعد جديد قريباً.")],
    rules: [
      { id: "late", type: "late", name: "Late order", desc: "Flag orders past their deliver-by time.", label: "Late {d}", sev: 3, tpl: "order_delay" },
      { id: "unconfirmed", type: "stuck", stage: "new", mins: 60, name: "Not confirmed in an hour", desc: "Flag new orders nobody confirmed within an hour.", label: "Unconfirmed {d}", sev: 2, tpl: "order_confirmed" }] },
  jobs: { item: "Job", items: "Field jobs", icon: "truck", prefix: "J", ownerLabel: "Technician", dueLabel: "Visit at", fieldOwner: true, fieldWord: "technicians", promise: 1440,
    stages: [["scheduled", "Scheduled"], ["confirmed", "Confirmed"], ["onway", "On the way"], ["done", "Done"]], alt: [["noshow", "Customer not home"]], done: "done",
    fields: [["service", "Service"], ["value", "Value (JOD)"]],
    templates: [
      TR("job_confirm", "Confirm visit", "Updates", "Hello {first}, your {service} visit is booked for {due}. Reply 1 to confirm or 2 to change the time.", "مرحباً {first}، موعد زيارة {service} الساعة {due}. ردّ بـ 1 للتأكيد أو 2 لتغيير الموعد."),
      TR("job_late", "Technician running late", "Delays", "Hello {first}, {owner} is running a little late and will reach you shortly. Sorry for the wait.", "مرحباً {first}، {owner} متأخر شوي ورح يوصلك قريباً. نعتذر على التأخير.")],
    rules: [
      { id: "unconfirmed", type: "duesoon", stage: "scheduled", mins: 180, name: "Unconfirmed visit", desc: "3 hours before a visit, flag it if the customer hasn't confirmed.", label: "Not confirmed · {due}", sev: 2, tpl: "job_confirm" },
      { id: "late", type: "late", mins: 30, name: "Visit running late", desc: "Flag visits 30+ minutes past their time and not done.", label: "Running late {d}", sev: 3, tpl: "job_late" },
      { id: "notech", type: "noowner", mins: 0, name: "No technician", desc: "Flag jobs with no technician assigned.", label: "No technician", sev: 2 }] },
  appointments: { item: "Appointment", items: "Appointments", icon: "cal", prefix: "A", ownerLabel: "With", dueLabel: "Time", promise: 1440, hasArea: false,
    stages: [["booked", "Booked"], ["confirmed", "Confirmed"], ["arrived", "Arrived"], ["completed", "Completed"]], alt: [["noshow", "No-show"], ["cancelled", "Cancelled"]], done: "completed",
    fields: [["service", "Service"], ["value", "Value (JOD)"]],
    templates: [
      TR("appt_reminder", "Appointment reminder", "Updates", "Hello {first}, a reminder of your {service} appointment at {due}. Reply 1 to confirm or 2 to change it.", "مرحباً {first}، نذكّرك بموعد {service} الساعة {due}. ردّ بـ 1 للتأكيد أو 2 للتغيير."),
      TR("appt_missed", "Missed appointment", "Delays", "Hello {first}, we missed you today. Would you like to book a new time?", "مرحباً {first}، ما شفناك اليوم. بتحب نحجزلك موعد جديد؟")],
    rules: [
      { id: "unconfirmed", type: "duesoon", stage: "booked", mins: 1440, name: "Unconfirmed appointment", desc: "A day before, flag appointments that aren't confirmed.", label: "Not confirmed · {due}", sev: 2, tpl: "appt_reminder" },
      { id: "noshow", type: "late", mins: 15, name: "Possible no-show", desc: "Flag appointments 15+ minutes past their time with no arrival.", label: "Possible no-show", sev: 3, tpl: "appt_missed" }] },
  tasks: { item: "Task", items: "Tasks", icon: "check", prefix: "T", ownerLabel: "Owner", dueLabel: "Due", nameLabel: "Task", hasPhone: false, hasArea: false, promise: 3 * 1440,
    stages: [["todo", "To do"], ["doing", "Doing"], ["review", "Review"], ["done", "Done"]], alt: [["cancelled", "Cancelled"]], done: "done",
    fields: [["project", "Project"]], templates: [],
    rules: [{ id: "overdue", type: "late", name: "Overdue task", desc: "Flag tasks past their due date.", label: "Overdue {d}", sev: 2 }] }
};
const TEMPLATES = {
  general: { name: "General business", desc: "Customer requests, sales, orders and tasks", boards: ["requests", "sales", "orders", "tasks"] },
  services: { name: "Field services", desc: "Jobs at customers' sites, requests, sales and tasks", boards: ["jobs", "requests", "sales", "tasks"] },
  delivery: { name: "Delivery", desc: "Fast deliveries with drivers", boards: ["delivery", "tasks"] },
  lab: { name: "Home healthcare / lab", desc: "Home visits with teams", boards: ["visits", "tasks"] },
  clinic: { name: "Clinic / appointments", desc: "Appointments, requests and tasks", boards: ["appointments", "requests", "tasks"] },
  kitchen: { name: "Restaurant / cloud kitchen", desc: "Complaints from every app in one queue", boards: ["complaints", "orders", "tasks"] },
  retail: { name: "Retail / online store", desc: "Orders, returns and customer requests", boards: ["orders", "requests", "tasks"] }
};
const dur = m => { m = Math.max(0, Math.round(m)); return m < 60 ? m + " min" : m < 1440 ? Math.round(m / 60) + " h" : Math.round(m / 1440) + " day" + (Math.round(m / 1440) > 1 ? "s" : ""); };
function ruleCheck(r) {
  const L = (it, n) => String(r.label || r.name).replace("{d}", dur(n)).replace("{n}", Math.round(n)).replace("{due}", dueText(it));
  const m = +r.mins || 0;
  switch (r.type) {
    case "late": return (it, now) => now > it.due + m ? L(it, now - it.due) : null;
    case "stuck": return (it, now) => { if (it.status !== r.stage) return null; const since = it.t[r.stage] ?? it.created; return now - since >= m ? L(it, now - since) : null; };
    case "duesoon": return (it, now) => it.status === r.stage && it.due - now <= m && it.due - now > -20 ? L(it, it.due - now) : null;
    case "noowner": return (it, now) => !it.owner && now - it.created >= m ? L(it, now - it.created) : null;
    case "tag": return it => (custOf(it)?.tags || []).includes(r.tag) || (r.tag === "Repeat" && it.data?.repeat) ? L(it, 0) : null;
    default: return () => null;
  }
}
const BOARD_KEYS = ["id", "lib", "item", "items", "icon", "prefix", "ownerLabel", "dueLabel", "nameLabel", "fieldOwner", "fieldWord", "hasArea", "hasPhone", "promise", "stages", "alt", "done", "fields", "rules", "hidden"];
function normBoard(b) {
  const d = { icon: "box", nameLabel: "Customer", hasPhone: true, hasArea: true, fieldOwner: false, promise: 60, alt: [], fields: [], rules: [], templates: [], ownerLabel: "Owner", dueLabel: "Due", prefix: "J", ...b };
  if (!d.stages || !d.stages.length) d.stages = [["new", "New"], ["done", "Done"]];
  if (!d.done || !d.stages.some(s => s[0] === d.done)) d.done = d.stages[d.stages.length - 1][0];
  d.terminal = [d.done, ...d.alt.map(a => a[0])];
  d.hasValue = d.fields.some(f => f[0] === "value");
  d.fieldWord = b.fieldWord || d.ownerLabel.toLowerCase() + "s";
  d.long = d.promise >= 1440;
  d.x = it => d.fields.map(([k]) => { const v = it.data?.[k]; return v == null || v === "" ? "" : k === "value" ? esc(fmtN(v)) + " JOD" : esc(v); }).filter(Boolean).join(" · ");
  d.rules = (d.rules || []).map(r => ({ ...r, check: ruleCheck(r) }));
  return d;
}
const serialBoard = b => Object.fromEntries(BOARD_KEYS.filter(k => b[k] !== undefined).map(k => [k, k === "rules" ? b.rules.map(({ check, ...r }) => r) : b[k]]));
function buildBoards(client) {
  const own = (client.config || {}).boards;
  if (Array.isArray(own) && own.length) return own.map(normBoard);
  const tpl = TEMPLATES[client.workspace_type] || TEMPLATES.general;
  return tpl.boards.map((k, i) => normBoard({ id: i === 0 ? "main" : k, lib: k, ...JSON.parse(JSON.stringify(BOARD_LIB[k])) }));
}
const BDEF = id => BOARDS.find(b => b.id === id) || BOARDS[0];
const defOf = it => BDEF((it && it.board) || "main");
const ruleKey = (b, r) => b.id === "main" ? r.id : b.id + ":" + r.id;
function setBoard(id) { const b = BDEF(id); if (b) { WDEF = b; ui.board = b.id; } }
const liveBoards = () => BOARDS.filter(b => !b.hidden);
const stageName = (s, x) => { const d = x && x.stages ? x : x ? defOf(x) : WDEF; return [...d.stages, ...d.alt].find(y => y[0] === s)?.[1] || s; };
const isTerm = it => defOf(it).terminal.includes(it.status);
const nextStage = it => { if (isTerm(it)) return null; const d = defOf(it), i = d.stages.findIndex(s => s[0] === it.status); return i > -1 && i < d.stages.length - 1 ? d.stages[i + 1] : null; };
const dueText = it => defOf(it).long ? dShort(it.due * 60000) : hm(it.due);
/* modules a company can switch off in Settings › Workspace (boards are switched on and off there too) */
const MODULES = [["inbox", "Inbox"], ["email", "Email"], ["customers", "Customers"], ["calendar", "Calendar"], ["approvals", "Approvals"], ["team", "Team & shifts"], ["quality", "Quality (QA)"], ["company", "Company profile"], ["systems", "Systems & tools"], ["access", "People & access"], ["sops", "SOPs"], ["reports", "Reports"], ["automations", "Automations"], ["templates", "Message templates"], ["integrations", "Integrations"], ["data", "Import & export"]];
const modOn = k => !(CFG && CFG.modules && CFG.modules[k] === false);

/* ---------- state ---------- */
let ME = null, CLIENT = null, BOARDS = [], WDEF = null, CFG = {};
const S = { items: [], rules: [], act: [], cust: [], cases: [], msgs: [], people: [], shifts: [], qa: [], profile: null, docs: [], plats: [], links: [], sops: [], reads: [], tpls: [], tickets: [], team: [], emails: [], mailboxes: [], mbFull: [], invites: [], approvals: [] };
const ONLINE = new Map();
const lvl = () => ME ? ME.lvl : -1;
const can = n => lvl() >= n;

/* ---------- data layer ---------- */
const realDB = {
  async list(t, o = {}) {
    let q = sb.from(t).select(o.select || "*");
    for (const [k, v] of Object.entries(o.eq || {})) q = q.eq(k, v);
    for (const [k, v] of Object.entries(o.gte || {})) q = q.gte(k, v);
    for (const [k, v] of Object.entries(o.notIn || {})) q = q.not(k, "in", `(${v.join(",")})`);
    if (o.order) q = q.order(o.order[0], { ascending: !!o.order[1] });
    if (o.limit) q = q.limit(o.limit);
    const { data, error } = await q;
    if (error) { console.warn("load", t, error.message); return []; }
    return data || [];
  },
  async insert(t, rows) { const { data, error } = await sb.from(t).insert(rows).select(); if (error) throw error; return data || []; },
  async update(t, id, patch, col = "id") { const { data, error } = await sb.from(t).update(patch).eq(col, id).select(); if (error) throw error; return (data || [])[0]; },
  async upsert(t, rows, onConflict) { const { data, error } = await sb.from(t).upsert(rows, { onConflict }).select(); if (error) throw error; return data || []; },
  async remove(t, id, col = "id") { const { error } = await sb.from(t).delete().eq(col, id); if (error) throw error; },
  async rpc(n, a) { const { data, error } = await sb.rpc(n, a); if (error) throw error; return data; }
};
let DB = realDB; // demo.js swaps this for an in-memory store

/* ---------- loading ---------- */
function weekStart() { const d = startOfDay(); const back = (d.getDay() + 1) % 7; d.setDate(d.getDate() - back); return d; } // weeks start on Saturday
async function loadAll() {
  const cid = CLIENT.id, since = new Date(Date.now() - 31 * 864e5).toISOString(), L = lvl();
  const q = (t, o = {}) => DB.list(t, { ...o, eq: { client_id: cid, ...(o.eq || {}) } });
  const none = Promise.resolve([]);
  const res = await Promise.all([
    q("items", { gte: { created: since }, order: ["created", false], limit: 5000 }),
    q("items", { notIn: { status: [...new Set(BOARDS.flatMap(b => b.terminal))] }, limit: 2000 }),
    q("rules"),
    L >= 1 ? q("activity", { order: ["at", false], limit: 400 }) : none,
    L >= 1 ? q("customers", { limit: 10000 }) : none,
    L >= 1 ? q("cases", { order: ["created_at", false], limit: 600 }) : none,
    L >= 1 ? q("case_messages", { gte: { created_at: since }, order: ["created_at", true], limit: 8000 }) : none,
    L >= 1 ? q("people") : none,
    L >= 1 ? q("shifts", { gte: { day: isoDay(weekStart()) } }) : none,
    q("qa_reviews", { order: ["created_at", false], limit: 400 }),
    q("company_profile"),
    L >= 4 ? q("documents") : none,
    L >= 4 ? q("platforms") : none,
    q("links"),
    q("sops", { order: ["created_at", true] }),
    q("sop_reads"),
    L >= 1 ? q("templates") : none,
    L >= 1 ? q("tickets", { order: ["created_at", false] }) : none,
    DB.rpc("client_team", { p_client_id: cid }).catch(() => []),
    L >= 1 ? q("emails", { order: ["received_at", false], limit: 600 }) : none,
    DB.rpc("mailbox_list", { p_client_id: cid }).catch(() => []),
    L >= 4 ? q("mailboxes") : none,
    L >= 4 ? q("pending_invites", { order: ["created_at", false] }) : none,
    q("approvals", { order: ["created_at", false], limit: 500 })
  ]);
  const seen = new Set(); S.items = [...res[0], ...res[1]].filter(r => !seen.has(r.id) && seen.add(r.id));
  [, , S.rules, S.act, S.cust, S.cases, S.msgs, S.people, S.shifts, S.qa] = res;
  S.profile = res[10][0] || null;
  [S.docs, S.plats, S.links, S.sops, S.reads, S.tpls, S.tickets] = res.slice(11, 18);
  S.team = res[18] || [];
  [S.emails, S.mailboxes, S.mbFull, S.invites, S.approvals] = [res[19] || [], res[20] || [], res[21] || [], res[22] || [], res[23] || []];
  if (L >= 4) await seedStarter();
}

/* ---------- mapping + alerts ---------- */
function mapItem(r) {
  return { ...r, board: r.board || "main", due: mins(new Date(r.due).getTime()), created: mins(new Date(r.created).getTime()), data: r.data || {}, hist: r.hist || [],
    t: Object.fromEntries(Object.entries((r.data || {}).t || {}).map(([k, v]) => [k, mins(v)])) };
}
let ITEMS = [];
const custOf = it => S.cust.find(c => c.id === it.customer_id);
const ruleOn = id => { const r = S.rules.find(x => x.rule_id === id); return r ? r.enabled : true; };
const customRules = () => S.rules.filter(r => r.def);
function customCheck(def, it, now) {
  let base = def.when === "due" ? it.due : def.when === "status" ? (it.t[it.status] ?? it.created) : it.created;
  if ((def.board || "main") !== it.board) return null;
  if (def.when === "status" && def.status && it.status !== def.status) return null;
  if (now - base < (+def.mins || 0)) return null;
  const c = custOf(it);
  if (def.cond === "area" && (it.area || "").toLowerCase() !== String(def.val || "").toLowerCase()) return null;
  if (def.cond === "tag" && !(c?.tags || []).includes(def.val)) return null;
  if (def.cond === "value" && !((+it.data?.value || 0) > (+def.val || 0))) return null;
  if (def.cond === "noowner" && it.owner) return null;
  return def.label || def.name;
}
function refreshItems() {
  const now = nowM();
  ITEMS = S.items.map(mapItem);
  ITEMS.forEach(it => {
    it.flags = [];
    if (isTerm(it)) return;
    const d = defOf(it);
    d.rules.forEach(r => { const k = ruleKey(d, r); if (!ruleOn(k)) return; const f = r.check(it, now); if (f) it.flags.push({ rule: k, text: f, sev: r.sev, tpl: r.tpl }); });
    customRules().forEach(r => { if (!r.enabled) return; const f = customCheck(r.def, it, now); if (f) it.flags.push({ rule: r.rule_id, text: f, sev: +r.def.sev || 2, tpl: r.def.tpl || null }); });
    if ((custOf(it)?.tags || []).includes("VIP")) it.flags.push({ rule: "vip", text: "VIP", sev: 0 });
  });
}
const topSev = it => Math.max(0, ...it.flags.map(f => f.sev));
const attention = it => it.flags.some(f => f.sev > 0);
const statusPill = it => { const d = defOf(it); return pill(stageName(it.status, d), it.status === d.done ? "good" : d.terminal.includes(it.status) ? "crit" : it.status === d.stages[0][0] ? "warn" : "acc"); };
const flagPills = it => it.flags.map(f => pill(f.text, f.sev === 3 ? "crit" : f.sev === 2 ? "warn" : f.sev === 1 ? "info" : "cta")).join("");
const itemById = id => ITEMS.find(i => i.id === id);
const memberName = uidv => { const m = S.team.find(x => x.auth_user_id === uidv); if (!m) return ""; const p = S.people.find(x => x.auth_user_id === uidv); return p ? p.name : nameOf(m.email); };
const fieldPeople = () => { const names = new Map(); S.people.filter(p => p.active && (p.dept === "Field" || p.dept === "Delivery")).forEach(p => names.set(p.name, p)); S.team.filter(m => m.role === "driver").forEach(m => { const n = memberName(m.auth_user_id); if (!names.has(n)) names.set(n, { name: n, auth_user_id: m.auth_user_id }); }); return [...names.values()]; };
const officePeople = () => S.team.filter(m => m.role !== "driver").map(m => ({ name: memberName(m.auth_user_id), auth_user_id: m.auth_user_id }));
const ownerPeople = d => d.fieldOwner ? fieldPeople() : officePeople();
function fill(t, it) {
  const now = nowM();
  return String(t || "").replace(/\{(\w+)\}/g, (_, k) => {
    if (!it) return "{" + k + "}";
    switch (k) {
      case "first": return (it.name || "").split(" ")[0];
      case "name": return it.name || "";
      case "id": case "order": return it.ext_id;
      case "late": return String(Math.max(0, Math.round(now - it.due)));
      case "due": return dueText(it);
      case "owner": case "driver": return (it.owner || "our team").split(" ")[0];
      case "area": return it.area || "";
      default: return String(it.data?.[k] ?? "");
    }
  });
}

/* ---------- writes ---------- */
async function logAct(text, kind = "") {
  const row = { client_id: CLIENT.id, text, actor_email: ME.email, kind };
  try { const r = await DB.insert("activity", row); S.act.unshift(r[0] || { ...row, at: new Date().toISOString() }); } catch (e) { console.warn(e); }
}
function putRow(list, row) { if (!row) return; const i = list.findIndex(x => x.id === row.id); if (i > -1) list[i] = row; else list.unshift(row); }
async function patchItem(it, patch, note) {
  if (note) patch.hist = [...(it.hist || []), { at: new Date().toISOString(), text: note, by: ME.email }];
  const r = await DB.update("items", it.id, patch);
  putRow(S.items, r);
  return r;
}
async function setStage(it, status) {
  const data = { ...it.data, t: { ...(it.data.t || {}), [status]: Date.now() } };
  await patchItem(it, { status, data }, "→ " + stageName(status, it));
  await logAct(`${it.ext_id} marked ${stageName(status, it)}`, "stage");
}
async function saveConfig(patch) {
  const v = await DB.rpc("update_client_config", { p_client_id: CLIENT.id, p_patch: patch });
  CFG = v || { ...CFG, ...patch }; CLIENT.config = CFG;
}
const cfg = (k, d) => (CFG && CFG[k] != null ? CFG[k] : d);
const SLA = () => ({ promise: (WDEF && WDEF.promise) || 40, firstReply: 15, pickup: 20, nodriver: 5, ...(cfg("sla", {})) });
const TARGETS = () => ({ ontime: 90, firstReply: 5, perAgent: 40, complaints: 95, qa: 90, ...(cfg("targets", {})) });
const SHIFT_CODES = () => cfg("shift_codes", ["08–16", "12–20", "16–24", "Off"]);

/* ---------- starter content for a new workspace ---------- */
const DEFAULT_TOOLS = [["tool", "Communication", "WhatsApp Web", "https://web.whatsapp.com/"], ["tool", "Communication", "Gmail", "https://mail.google.com/"], ["tool", "Work", "Google Drive", "https://drive.google.com/"], ["tool", "Work", "Google Sheets", "https://sheets.google.com/"], ["tool", "Field", "Google Maps", "https://maps.google.com/"]];
const STARTER_SOPS = {
  delivery: [["Handling a late order", "Customer care", ["agent", "supervisor"], ["Jreebs", "WhatsApp Web"], ["Open the order from Needs attention as soon as it's flagged.", "Check where the driver is, in the app or with a quick call.", "Send the Late order apology template with a realistic new time.", "If it's 20+ minutes late, offer the delivery fee back (team lead approves).", "Add a note with the reason so it shows in the On-time report."]],
    ["Failed delivery: rebook or return", "Operations", ["supervisor", "driver"], ["Jreebs", "Google Maps"], ["Try the customer twice: one call and one WhatsApp, 3 minutes apart.", "Mark the order Failed delivery and note the reason.", "Send the rebooking template.", "Return chilled items to the store within 30 minutes.", "The supervisor confirms the new slot or the return."]]],
  lab: [["Confirming home visits", "Customer care", ["agent", "supervisor"], ["Jreebs", "WhatsApp Web"], ["Each morning, open Needs attention and filter unconfirmed visits.", "Send the Confirm visit template to each patient.", "Mark the visit Confirmed as soon as they reply 1.", "Call anyone who hasn't replied an hour before the visit."]],
    ["Missed visit (no-show)", "Operations", ["supervisor", "driver"], ["Jreebs"], ["Wait 10 minutes and call the patient once.", "Mark the visit No-show and note what happened.", "Send the Missed visit template to rebook."]]],
  kitchen: [["First reply to a complaint within 15 minutes", "Customer care", ["agent", "team_lead"], ["Jreebs", "WhatsApp Web"], ["Open the complaint as soon as it's flagged.", "Reply with the Apology + fix template.", "Offer a replacement or a refund within your limit.", "Mark it Replied, then Resolved once the customer confirms."]],
    ["Refund or replacement approval", "Customer care", ["team_lead", "manager"], ["Jreebs"], ["Agents approve replacements up to 15 JOD.", "Above that, the team lead checks the history and approves.", "Record the outcome as a note on the complaint."]]],
  general: [["Handling a customer request", "Customer care", ["agent", "supervisor"], ["Jreebs", "WhatsApp Web"], ["Open the request as soon as it lands and set yourself as owner.", "Reply within 30 minutes with the Request received template.", "Move it to In progress, or Waiting on customer if you need something from them.", "Before resolving, confirm with the customer that it's sorted.", "Mark it Resolved and send the rating message."]],
    ["Approving expenses and purchases", "Finance", ["team_lead", "manager"], ["Jreebs"], ["Requests come in through Approvals with the amount and a reason.", "Team leads approve up to 100 JOD; managers approve anything above.", "Check the receipt or quote is attached or described.", "Approve or reject with a short note so the requester knows why."]],
    ["New employee first week", "HR", ["manager", "team_lead"], ["Jreebs"], ["Invite them to Jreebs with the right role on day one.", "Add them in People & access with the systems they need, nothing more.", "Assign the SOPs for their role and check they confirm reading them.", "Book a 15-minute check-in at the end of the week."]]]
};
STARTER_SOPS.services = STARTER_SOPS.general; STARTER_SOPS.clinic = STARTER_SOPS.general; STARTER_SOPS.retail = STARTER_SOPS.general;
const allTemplates = () => { const seen = new Set(), out = []; BOARDS.forEach(b => ((b.templates && b.templates.length) ? b.templates : ((BOARD_LIB[b.lib] || {}).templates || [])).forEach(t => { if (!seen.has(t[0])) { seen.add(t[0]); out.push(t); } })); GENERAL_TPLS.forEach(t => { if (!seen.has(t[0])) { seen.add(t[0]); out.push(t); } }); return out; };
const GENERAL_TPLS = [TR("payment", "Payment reminder", "Customers", "Hi {first}, a friendly reminder that payment for {id} is due. Reply if you have any questions.", "مرحبا {first}، تذكير لطيف إنه موعد دفع {id} صار. إذا عندك أي سؤال رد علينا."), TR("thanks", "Thank you", "Customers", "Hi {first}, thank you for choosing us. We're here if you need anything.", "مرحبا {first}، شكراً لاختيارك إلنا. إحنا موجودين إذا احتجت أي إشي.")];
const SHIFT_SOP = ["Start-of-shift checklist", "Operations", ["agent", "supervisor"], ["Jreebs"], ["Sign in and check Needs attention.", "Read the notes from the previous shift.", "Reply to anyone waiting in the Inbox.", "Confirm who is on shift with your supervisor."]];
let seeding = false;
async function seedStarter() {
  if (seeding || DEMO) return; seeding = true;
  try {
    const cid = CLIENT.id, added = [];
    if (!S.tpls.length) { S.tpls = await DB.insert("templates", allTemplates().map(([key, name, category, en, ar]) => ({ client_id: cid, key, name, category, en, ar }))); added.push("message templates"); }
    if (!S.links.length) { S.links = await DB.insert("links", DEFAULT_TOOLS.map(([kind, category, name, url]) => ({ client_id: cid, kind, category, name, url }))); added.push("tools"); }
    if (!S.sops.length) { const list = [...(STARTER_SOPS[CLIENT.workspace_type] || STARTER_SOPS.general), SHIFT_SOP]; S.sops = await DB.insert("sops", list.map(([title, category, roles, tools, steps]) => ({ client_id: cid, title, category, roles, tools, steps, owner_name: nameOf(ME.email) }))); added.push("starter SOPs"); }
    const missing = S.team.filter(m => !S.people.some(p => p.auth_user_id === m.auth_user_id));
    if (missing.length) { const rows = await DB.insert("people", missing.map(m => ({ client_id: cid, name: nameOf(m.email), email: m.email, dept: DEPT_OF_ROLE[m.role] || "Operations", job: ROLES[m.role]?.label || "", auth_user_id: m.auth_user_id }))); S.people.push(...rows); added.push(`${rows.length} people from your logins`); }
    if (added.length) await logAct("Starter content added: " + added.join(", "), "setup");
  } catch (e) { console.warn("starter", e); }
  seeding = false;
}

/* ---------- UI plumbing ---------- */
let toastT;
function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3800); }
const errMsg = e => (e && (e.message || e.error_description)) || "Something went wrong. Try again.";
function openModal(html, wide) { const m = $("#modal"); m.innerHTML = html; m.classList.toggle("wide", !!wide); m.hidden = false; $("#mscrim").hidden = false; const f = m.querySelector("input:not([type=hidden]), select, textarea"); if (f) f.focus(); }
function closeModal() { $("#modal").hidden = true; $("#mscrim").hidden = true; $("#modal").classList.remove("palm"); if (typeof PAL !== "undefined") PAL = null; }
const mHead = t => `<div class="m-h"><h3 class="grow">${t}</h3><button class="ib" type="button" data-act="mclose" aria-label="Close">${ic("x")}</button></div>`;
function openDrawer(html) { $("#drawer").innerHTML = html; $("#drawer").hidden = false; $("#scrim").hidden = false; }
function closeDrawer() { $("#drawer").hidden = true; $("#scrim").hidden = true; DRAWER = null; }
let DRAWER = null; // {type, id} so live updates can refresh an open drawer
const dHead = (t, sub = "") => `<div class="d-h"><div class="grow"><h3>${t}</h3>${sub ? `<div class="flags" style="margin-top:6px">${sub}</div>` : ""}</div><button class="ib" type="button" data-act="close" aria-label="Close">${ic("x")}</button></div>`;
function download(name, text, type = "text/csv") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type + ";charset=utf-8" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function toCSV(rows) { if (!rows.length) return ""; const cols = Object.keys(rows[0]); const q = v => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; return "﻿" + [cols.join(","), ...rows.map(r => cols.map(c => q(r[c])).join(","))].join("\n"); }
function parseCSV(text) { const lines = String(text).replace(/^﻿/, "").trim().split(/\r?\n/).filter(Boolean); const split = l => { const out = []; let cur = "", q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === "," || ch === ";" || ch === "\t") { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); }; return { headers: split(lines[0] || ""), rows: lines.slice(1).map(split) }; }
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast("Copied."); } catch (e) { toast(t); } }
