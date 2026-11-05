/* DROP TABLE — app engine (Grail Room story edition) */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- per-viewer progress (this browser only) ---------- */
  const KEY = "droptable-v2";
  const blank = () => ({ xp: 0, done: {}, hints: {}, code: {}, quiz: {}, labs: {}, cash: WALLET.start, closet: [], mkt: null, log: [], deck: [], pyc: {}, grail: false });
  let S = blank();
  /* Privacy: progress is saved in this browser only, and only after the learner (or their grown-up) says yes.
     CONSENT_V goes up whenever the privacy policy changes in a way that needs a fresh choice (re-accept). */
  const CONSENT_KEY = "droptable-consent", CONSENT_V = 1, POLICY_DATE = "November 5, 2026";
  let CONSENT = null;
  try { CONSENT = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null"); } catch (e) { CONSENT = null; }
  const canStore = () => !!(CONSENT && CONSENT.save);
  if (canStore()) { try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage blocked */ } }
  const save = () => { if (!canStore()) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
  function setConsent(yes) {
    CONSENT = { v: CONSENT_V, save: !!yes, at: new Date().toISOString() };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(CONSENT)); } catch (e) { /* ignore */ }
    if (yes) save(); else { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  }
  function forgetMe() { try { localStorage.removeItem(KEY); localStorage.removeItem(CONSENT_KEY); } catch (e) { /* ignore */ } CONSENT = null; S = blank(); }
  function tierIdx(xp) { let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++; return i; }
  const rank = xp => RANKS[tierIdx(xp)][1];
  const tierShoe = (i, cls) => shoeSVG(RANKS[i].slice(2, 5), cls, i >= 2 ? "high" : "");
  function tierPct(xp) { const i = tierIdx(xp), nx = RANKS[i + 1]; return nx ? (xp - RANKS[i][0]) / (nx[0] - RANKS[i][0]) : 1; }
  function renderMe() {
    const i = tierIdx(S.xp), nx = RANKS[i + 1];
    $("#xp").innerHTML = `<a class="cashchip" href="#flip" aria-label="Wallet: ${money(S.cash)}. Open The Flip.">${money(S.cash)}</a><a class="rankchip" href="#rank" aria-label="${esc(RANKS[i][1])}, ${S.xp} rep. See your rank ladder.">${tierShoe(i, "mini")}<span class="rc-t"><b>${esc(RANKS[i][1])}</b><span class="rbar"><i style="width:${Math.round(tierPct(S.xp) * 100)}%"></i></span><small>${S.xp} rep${nx ? ` · ${nx[0] - S.xp} to ${esc(nx[1])}` : " · max tier"}</small></span></a>`;
  }
  let toastT;
  function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3200); }
  function addXP(n, why) { if (n <= 0) return; const b = tierIdx(S.xp); S.xp += n; save(); renderMe(); const a = tierIdx(S.xp); toast(`+${n} rep · ${why}`); if (a > b) setTimeout(() => levelUp(a), 700); }
  /* ---------- pop-up screens ---------- */
  const POPQ = [];
  function popup(html, onBind) {
    const dl = $("#pop"); if (!dl || typeof dl.showModal !== "function") return;
    if (dl.open) { POPQ.push([html, onBind]); return; }
    if (!dl.dataset.q) { dl.dataset.q = 1; dl.addEventListener("close", () => { const n = POPQ.shift(); if (n) setTimeout(() => popup(n[0], n[1]), 250); }); }
    dl.innerHTML = `<div class="pop-in">${html}</div>`;
    $$("[data-close]", dl).forEach(b => b.addEventListener("click", () => dl.close()));
    onBind && onBind(dl);
    if (!dl.open) dl.showModal();
  }
  /* ---------- Big Face's money: wallet, market, closet, events ---------- */
  const money = n => (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString();
  const shoeById = id => SIM_SHOES.find(r => r[0] === id);
  const shoeName = id => { const r = shoeById(id); return `${r[1]} ${r[2]} “${r[3]}”`; };
  let BASE = null;
  function initMarket() {
    if (BASE || !DB) return;
    BASE = {}; run("SELECT shoe_id, AVG(price_usd) FROM sales GROUP BY shoe_id").values.forEach(([id, a]) => (BASE[id] = a));
    if (!S.mkt) { S.mkt = { day: 1, m: {}, hist: {} }; SIM_SHOES.forEach(r => { S.mkt.m[r[0]] = 1; S.mkt.hist[r[0]] = [Math.round(BASE[r[0]])]; }); save(); }
  }
  const price = id => Math.max(5, Math.round(BASE[id] * S.mkt.m[id]));
  const pairValue = pr => Math.round(price(pr.id) * pr.q);
  function gauss(rnd) { return Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd()); }
  function marketTick() {
    initMarket(); const rnd = mulberry32(S.mkt.day * 7919 + 13);
    SIM_SHOES.forEach(r => { const id = r[0]; let m = S.mkt.m[id]; m = Math.pow(m, 0.92) * Math.exp(gauss(rnd) * (0.03 + r[7] * 0.006)); S.mkt.m[id] = Math.min(3, Math.max(0.35, m)); const h = S.mkt.hist[id]; h.push(price(id)); if (h.length > 30) h.shift(); });
    S.mkt.day++; save();
  }
  const needsCloset = e => { const has = f => f && (f.hit || f.lose || f.sell); return e[0] === "choice" ? !!e[5] : has(e[3]); };
  function drawEvent() {
    if (!S.deck.length) S.deck = shuffle(EVENTS.map((_, i) => i));
    let k = S.deck.findIndex(i => S.closet.length || !needsCloset(EVENTS[i]));
    if (k < 0) k = 0;
    return S.deck.splice(k, 1)[0];
  }
  function applyEff(eff) {
    const lines = [], start = S.cash;
    if (!eff) return lines;
    if (eff.p != null) {
      const ok = Math.random() < eff.p;
      lines.push(`Chance it works: ${Math.round(eff.p * 100)}% · ${ok ? "it worked!" : "it didn't work out."}`);
      return lines.concat(applyEff(ok ? eff.win : eff.lose));
    }
    if (eff.pct) { const amt = Math.round(S.cash * Math.abs(eff.pct)); lines.push(`${Math.round(Math.abs(eff.pct) * 1000) / 10}% of ${money(S.cash)} = ${money(amt)}`); S.cash += eff.pct > 0 ? amt : -amt; }
    if (eff.cash) { if (eff.cash < 0 && S.cash + eff.cash < 0) lines.push(heroize(`Big Face only had ${money(S.cash)}, so that's all he could pay.`)); S.cash += eff.cash; }
    if (eff.brand) { const [b, m] = eff.brand; SIM_SHOES.filter(r => r[1] === b).forEach(r => (S.mkt.m[r[0]] *= m)); lines.push(`${b} prices × ${m} (${m > 1 ? "+" : "−"}${Math.round(Math.abs(m - 1) * 100)}%)`); }
    if (eff.all) { SIM_SHOES.forEach(r => (S.mkt.m[r[0]] *= eff.all)); lines.push(`Every shoe's price × ${eff.all} (${eff.all > 1 ? "+" : "−"}${Math.round(Math.abs(eff.all - 1) * 100)}%)`); }
    const pick = () => S.closet[Math.floor(Math.random() * S.closet.length)];
    if (eff.hit && S.closet.length) { const pr = pick(), before = pairValue(pr); pr.q = Math.round(pr.q * eff.hit * 100) / 100; lines.push(`${shoeName(pr.id)}: worth ${money(before)} → ${money(pairValue(pr))}`); }
    if (eff.lose && S.closet.length) { const pr = pick(); lines.push(`${shoeName(pr.id)} is gone (it was worth ${money(pairValue(pr))}).`); S.closet.splice(S.closet.indexOf(pr), 1); }
    if (eff.sell && S.closet.length) { const pr = pick(), got = Math.round(pairValue(pr) * eff.sell); lines.push(`Sold ${shoeName(pr.id)}: ${Math.round(eff.sell * 100)}% of ${money(pairValue(pr))} = ${money(got)} (you paid ${money(pr.cost)})`); S.cash += got; S.closet.splice(S.closet.indexOf(pr), 1); }
    if (eff.gift) { const cheap = SIM_SHOES.filter(r => r[7] <= 7), r = cheap[Math.floor(Math.random() * cheap.length)]; S.closet.push({ id: r[0], cost: 0, q: 1 }); lines.push(`New in the closet: ${shoeName(r[0])}, worth ${money(price(r[0]))}.`); }
    S.cash = Math.max(0, Math.round(S.cash));
    if (S.cash !== start) lines.push(`Wallet: ${money(start)} → ${money(S.cash)} (${S.cash > start ? "+" : "−"}${money(Math.abs(S.cash - start)).replace("−", "")})`);
    return lines;
  }
  function logEvent(title, kind, lines) { S.log.unshift({ day: S.mkt.day, title: heroize(title), kind, last: lines[lines.length - 1] || "" }); S.log = S.log.slice(0, 15); save(); renderMe(); }
  function eventPopup() {
    initMarket(); const i = drawEvent(), e = EVENTS[i], [kind, title, text, eff, choices] = e; save();
    const head = `<div class="ev-head ev-${kind}"><span class="ev-kind">${kind === "bad" ? "Bad break" : kind === "good" ? "Lucky break" : "Your call"}</span><span class="mono">Market day ${S.mkt.day} · wallet ${money(S.cash)}</span></div><h2>${esc(heroize(title))}</h2><p>${esc(heroize(text))}</p>`;
    const result = (lines, out) => `${out ? `<p class="ev-out">${esc(out)}</p>` : ""}<div class="ev-math">${lines.map(l => `<div>${esc(heroize(l))}</div>`).join("") || "<div>No money changed hands.</div>"}</div><div class="row"><button type="button" class="btn primary" data-close>Back to work</button><a class="btn ghost" href="#flip" data-close>Open The Flip</a></div>`;
    if (kind !== "choice") { const lines = applyEff(eff); logEvent(title, kind, lines); popup(head + result(lines)); return; }
    popup(head + `<div class="ev-choices">${choices.map((c, k) => `<button type="button" class="btn ${k ? "" : "primary"}" data-ch="${k}">${esc(heroize(c[0]))}</button>`).join("")}</div><div class="ev-res"></div>`, dl => {
      $$("[data-ch]", dl).forEach(b => b.addEventListener("click", () => {
        const c = choices[+b.dataset.ch], lines = applyEff(c[1]); logEvent(`${title}: ${c[0]}`, "choice", lines);
        $(".ev-choices", dl).remove(); const res = $(".ev-res", dl); res.innerHTML = result(lines, heroize(c[2]));
        $$("[data-close]", res).forEach(z => z.addEventListener("click", () => dl.close()));
      }));
    });
  }
  function payday(x, extra) {
    const wage = Math.round(x.xp * WALLET.wageRate); S.cash += wage + (extra || 0); save(); renderMe();
    toast(`Day ${x.d} done · +${x.xp} rep · +${money(wage)} wages${extra ? ` · +${money(extra)} tip` : ""}`);
  }

  function levelUp(i) {
    const r = RANKS[i], nx = RANKS[i + 1];
    popup(`<div class="pop-burst city"><img class="pop-bg" src="${ART("skyline")}" alt="">${bigFace("cheer", "hero-pop")}</div><div class="eyebrow">Level up · Tier ${i + 1} of ${RANKS.length}</div>
      <h2>You're a ${esc(r[1])}</h2><p>${esc(r[5])}</p><p class="note">${nx ? `Next: <b>${esc(nx[1])}</b> at ${nx[0]} rep.` : "That's the top tier. The whole store is yours."}</p>
      <div class="row"><button type="button" class="btn primary" data-close>Keep going</button><a class="btn ghost" href="#rank" data-close>See the ladder</a></div>`);
  }
  function welcome() {
    let step = 0;
    const pages = [
      () => `<div class="pop-burst city">${cityMini()}${bigFace("hero", "hero-pop")}</div><div class="eyebrow">Drop Table · Episode 1</div><h2>Meet ${esc(STORE.hero)}</h2>
        <p>His real name is Michael, but everybody calls him <b>Big Face</b>: he's always chasing big face hundreds, the $100 bills with the giant portrait. He's got $${WALLET.start}. Then the <b>${esc(STORE.name)}</b>, the rarest sneaker shop in Atlanta, gives him a weekend job. <b>You play Big Face.</b></p>
        <div class="mikesay">${mikeSVG("talk")}<div class="bubble"><b>${esc(STORE.hero)}</b><p>“I just want one pair that's mine. The Halo Comet Mid ‘Gold Rush’. How hard can it be?”</p></div></div>`,
      () => `<div class="eyebrow">How it works</div><h2>Shifts, not lessons</h2>
        <ol class="steps"><li><div><b>Work a shift.</b> ${esc(STORE.manager)} (manager) or ${esc(STORE.lead)} (data lead) gives you a real job, like "find the priciest drops this week".</div></li>
        <li><div><b>Look at the data first.</b> Every shift shows you the table up front. Tap any column to see what's in it.</div></li>
        <li><div><b>Write real code.</b> SQL, then Python, then machine learning you train yourself. Each day is a little harder.</div></li></ol>`,
      () => `<div class="pop-burst"><img class="pop-shoe" src="${ART("grail")}" alt=""></div><div class="eyebrow">Money + rep</div><h2>Stack cash. Climb the ranks.</h2>
        <p>${esc(STORE.heroShort)} starts with <b>$${WALLET.start}</b> of birthday money. Shifts pay wages, first-try answers earn tips, and in <b>The Flip</b> he can buy and sell pairs. But between shifts, stuff happens: 100 curveballs, good and bad.</p><p>Every shift you finish also earns <b>rep</b>. Rep levels you up through six tiers, and each one unlocks a new shoe for your badge (top right).</p>
        <p class="note">Release dates on the wall are real (${esc(fmtDate(FEED.window_start, { month: "short", day: "numeric" }))} – ${esc(fmtDate(FEED.window_end, { month: "short", day: "numeric", year: "numeric" }))}). The store's sales log is made-up practice data. Progress saves in this browser.</p>`
    ];
    const render = dl => {
      dl.querySelector(".pop-in").innerHTML = pages[step]() + `<div class="pop-nav"><span class="pdots">${pages.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</span>
        ${step ? `<button type="button" class="btn ghost" data-back>Back</button>` : `<button type="button" class="btn ghost" data-skip>Skip</button>`}
        ${step < pages.length - 1 ? `<button type="button" class="btn primary" data-next>Next →</button>` : `<button type="button" class="btn primary" data-start>Clock in for Day 1 →</button>`}</div>`;
      const b = sel => dl.querySelector(sel);
      b("[data-next]") && b("[data-next]").addEventListener("click", () => { step++; render(dl); });
      b("[data-back]") && b("[data-back]").addEventListener("click", () => { step--; render(dl); });
      b("[data-skip]") && b("[data-skip]").addEventListener("click", () => dl.close());
      b("[data-start]") && b("[data-start]").addEventListener("click", () => { dl.close(); go("d1"); });
    };
    S.intro = true; save();
    popup("", render);
  }

  /* ---------- release feed ---------- */
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  const relId = r => r.id || ((r.release_date + "_" + (r.style_code || slug(r.name))).replace(/[^A-Za-z0-9_-]/g, "-"));
  const hashKey = id => "drop-" + id.replace(/[^A-Za-z0-9-]/g, "-");
  const safeUrl = u => (typeof u === "string" && /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : null);
  let FEED = { as_of: FEED_SNAPSHOT.as_of, window_start: FEED_SNAPSHOT.window_start, window_end: FEED_SNAPSHOT.window_end,
    source_name: FEED_SNAPSHOT.source_name, source_url: FEED_SNAPSHOT.source_url, live: false,
    rows: FEED_SNAPSHOT.rows.map(r => ({ release_date: r[0], brand: r[1], name: r[2], colorway: r[3], style_code: r[4], retail_usd: r[5], news_url: safeUrl(r[6]), news_source: r[7] || null })) };
  FEED.rows.forEach(r => (r.id = relId(r)));
  let POSTS = BLOG_SEED.slice();

  const ET = "America/New_York";
  const fmtDate = (iso, o) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", Object.assign({ timeZone: "UTC" }, o));
  const fmtStamp = iso => new Date(iso).toLocaleString("en-US", { timeZone: ET, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) + " ET";
  const todayET = () => new Intl.DateTimeFormat("en-CA", { timeZone: ET, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  const whenLabel = d => (d === 0 ? "Today" : d === 1 ? "Tomorrow" : d < 0 ? `${-d} days ago` : `in ${d} days`);
  const nick = name => { const m = String(name).match(/"([^"]+)"/); return m ? m[1] : null; };
  const photoUrl = r => (r.photo ? "/_blob/" + r.photo : null);

  /* ---------- SQL engine ---------- */
  let SQL = null, DB = null, sqlFailed = false;
  const sqlWaiters = [];
  const whenSQL = fn => (DB ? fn() : sqlWaiters.push(fn));
  const SALES = makeSimSales();
  function buildDB() {
    if (!SQL) return;
    if (DB) DB.close();
    DB = new SQL.Database();
    DB.run("CREATE TABLE releases(id INTEGER PRIMARY KEY, release_date TEXT, brand TEXT, name TEXT, colorway TEXT, style_code TEXT, retail_usd INTEGER)");
    const a = DB.prepare("INSERT INTO releases(release_date,brand,name,colorway,style_code,retail_usd) VALUES (?,?,?,?,?,?)");
    FEED.rows.slice().sort((x, y) => (x.release_date < y.release_date ? -1 : x.release_date > y.release_date ? 1 : 0))
      .forEach(r => a.run([r.release_date, r.brand, r.name, r.colorway ?? null, r.style_code ?? null, r.retail_usd ?? null]));
    a.free();
    DB.run("CREATE TABLE shoes(shoe_id INTEGER PRIMARY KEY, brand TEXT, model TEXT, colorway TEXT, release_date TEXT, retail_usd INTEGER, pairs_made INTEGER, hype INTEGER)");
    const b = DB.prepare("INSERT INTO shoes VALUES (?,?,?,?,?,?,?,?)"); SIM_SHOES.forEach(r => b.run(r)); b.free();
    DB.run("CREATE TABLE sales(sale_id INTEGER PRIMARY KEY, shoe_id INTEGER REFERENCES shoes(shoe_id), sale_date TEXT, size_us REAL, price_usd INTEGER, condition TEXT)");
    const c = DB.prepare("INSERT INTO sales VALUES (?,?,?,?,?,?)"); SALES.forEach(r => c.run(r)); c.free();
  }
  function initSQL() {
    if (typeof window.initSqlJs !== "function") { sqlFailed = true; route(); return; }
    window.initSqlJs().then(s => { SQL = s; buildDB(); sqlWaiters.splice(0).forEach(f => f()); }, () => { sqlFailed = true; route(); });
  }
  function run(sql) {
    if (!DB) throw new Error(sqlFailed ? "The SQL engine couldn't load. Check your connection and reload." : "SQL engine is still loading…");
    const res = DB.exec(sql);
    if (/\bdrop\s+table\b|\bdelete\s+from\b|\bupdate\s+\w+\s+set\b|\balter\s+table\b|\binsert\s+into\b/i.test(sql)) { buildDB(); toast(/\bdrop\s+table\b/i.test(sql) ? "You found the name! DROP TABLE deletes a table. Relax: the tables are back." : "Practice tables reset to normal."); }
    return res.length ? res[res.length - 1] : { columns: [], values: [] };
  }

  /* ---------- results, charts, checking ---------- */
  function tableHTML(r, max = 200) {
    if (!r.columns.length) return `<div class="msg info">The query ran, but it didn't return any rows.</div>`;
    const isNum = v => typeof v === "number", shown = r.values.slice(0, max);
    return `<div class="rescount">${r.values.length} row${r.values.length === 1 ? "" : "s"}${r.values.length > max ? ` (showing first ${max})` : ""}</div>
      <div class="tablewrap"><table class="res"><thead><tr>${r.columns.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${shown.map(row => `<tr>${row.map(v => v === null ? `<td><span class="null">NULL</span></td>` : `<td class="${isNum(v) ? "num" : ""}">${esc(isNum(v) && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function chartable(r) {
    if (!r.columns.length || r.values.length < 2 || r.values.length > 60) return null;
    const numIdx = r.columns.map((c, i) => i).filter(i => r.values.every(row => typeof row[i] === "number" || row[i] === null));
    if (!numIdx.length) return null;
    const vi = numIdx[numIdx.length - 1], li = r.columns.findIndex((c, i) => i !== vi);
    return li < 0 ? null : { li, vi };
  }
  function barSVG(r, ch) {
    const vals = r.values.map(row => Number(row[ch.vi]) || 0), labs = r.values.map(row => String(row[ch.li] ?? "NULL"));
    const max = Math.max(...vals, 0), min = Math.min(...vals, 0);
    const W = Math.max(420, labs.length * 46), H = 260, L = 48, B = 64, T = 14, R = 10;
    const span = (max - min) || 1, y = v => T + (H - T - B) * (1 - (v - min) / span);
    const step = (W - L - R) / labs.length, bw = Math.max(6, step * 0.7);
    const nice = n => { const p = Math.pow(10, Math.floor(Math.log10(Math.abs(n) || 1))); return Math.round(n / p) * p; };
    const ticks = [...new Set([min, min + span / 2, max].map(v => (Math.abs(v) >= 10 ? nice(v) : Math.round(v * 10) / 10)))];
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart of ${esc(r.columns[ch.vi])} by ${esc(r.columns[ch.li])}">
      ${ticks.map(t => `<line class="axis" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke-dasharray="3 4"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("")}
      <line class="axis" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>
      ${vals.map((v, i) => { const x = L + i * step + (step - bw) / 2, h = Math.abs(y(v) - y(0)); return `<rect class="barr" x="${x}" y="${y(Math.max(0, v))}" width="${bw}" height="${Math.max(1, h)}" rx="3"><title>${esc(labs[i])}: ${v}</title></rect>`; }).join("")}
      ${labs.map((l, i) => { const x = L + i * step + step / 2; return `<text x="${x}" y="${H - B + 14}" text-anchor="end" transform="rotate(-40 ${x} ${H - B + 14})">${esc(l.length > 12 ? l.slice(0, 11) + "…" : l)}</text>`; }).join("")}
      <text x="${L}" y="${H - 6}">${esc(r.columns[ch.vi])} by ${esc(r.columns[ch.li])}</text></svg>`;
  }
  /* scatter: pts [{x,y,c}], opts {xl, yl, line:[m,b], centers:[{x,y,c}], xr:[lo,hi], yr:[lo,hi]} */
  function scatterSVG(pts, o = {}) {
    const W = 560, H = 320, L = 52, R = 14, T = 14, B = 44;
    const xs = pts.map(p => p.x).concat(o.centers ? o.centers.map(c => c.x) : []), ys = pts.map(p => p.y).concat(o.centers ? o.centers.map(c => c.y) : []);
    let [x0, x1] = o.xr || [Math.min(...xs), Math.max(...xs)], [y0, y1] = o.yr || [Math.min(...ys), Math.max(...ys)];
    const px = (x1 - x0) * 0.06 || 1, py = (y1 - y0) * 0.08 || 1; x0 -= px; x1 += px; y0 -= py; y1 += py;
    const X = v => L + (W - L - R) * (v - x0) / (x1 - x0), Y = v => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));
    const tk = (a, b) => { const s = (b - a) / 4; return [0, 1, 2, 3, 4].map(i => a + s * i); };
    const fmt = v => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10);
    let line = "";
    if (o.line) { const [m, b] = o.line, ya = m * x0 + b, yb = m * x1 + b; line = `<clipPath id="clipS"><rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/></clipPath><line clip-path="url(#clipS)" class="fit" x1="${X(x0)}" y1="${Y(ya)}" x2="${X(x1)}" y2="${Y(yb)}"/>`; }
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "Scatter plot")}">
      ${tk(y0, y1).map(t => `<line class="axis" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" stroke-dasharray="3 4"/><text x="${L - 6}" y="${Y(t) + 4}" text-anchor="end">${fmt(t)}</text>`).join("")}
      ${tk(x0, x1).map(t => `<text x="${X(t)}" y="${H - B + 16}" text-anchor="middle">${fmt(t)}</text>`).join("")}
      ${pts.map(p => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${o.r || 4}" class="pt c${p.c || 0}"/>`).join("")}
      ${line}
      ${(o.centers || []).map(c => `<g class="ctr c${c.c}"><circle cx="${X(c.x)}" cy="${Y(c.y)}" r="10"/><text x="${X(c.x)}" y="${Y(c.y) + 4}" text-anchor="middle">${c.c + 1}</text></g>`).join("")}
      <text x="${(W + L) / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xl || "")}</text>
      <text x="14" y="${(H - B) / 2}" text-anchor="middle" transform="rotate(-90 14 ${(H - B) / 2})">${esc(o.yl || "")}</text></svg>`;
  }
  function lineSVG(vals, o = {}) {
    const W = 560, H = 200, L = 52, R = 14, T = 12, B = 34, n = vals.length;
    const v = vals.filter(Number.isFinite); if (!v.length) return "";
    const lo = Math.min(0, ...v), hi = Math.max(...v) || 1;
    const X = i => L + (W - L - R) * (n <= 1 ? 0 : i / (n - 1)), Y = x => T + (H - T - B) * (1 - (x - lo) / (hi - lo || 1));
    const d = vals.map((x, i) => (Number.isFinite(x) ? `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(Math.min(x, hi)).toFixed(1)}` : "")).join(" ");
    const fmt = x => (x >= 1000 ? Math.round(x).toLocaleString() : Math.round(x * 10) / 10);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "Line chart")}">
      ${[lo, (lo + hi) / 2, hi].map(t => `<line class="axis" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" stroke-dasharray="3 4"/><text x="${L - 6}" y="${Y(t) + 4}" text-anchor="end">${fmt(t)}</text>`).join("")}
      <path class="lossline" d="${d}"/><text x="${(W + L) / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xl || "")}</text></svg>`;
  }
  const norm = v => (typeof v === "number" ? Math.round(v * 100) / 100 : v === null ? null : String(v).trim());
  function sameResult(u, s, orderIdx) {
    if (u.columns.length !== s.columns.length) return { ok: false, why: `Your answer has ${u.columns.length} column${u.columns.length === 1 ? "" : "s"}; the job needs ${s.columns.length} (${s.columns.join(", ")}).` };
    if (u.values.length !== s.values.length) return { ok: false, why: `Your answer has ${u.values.length} row${u.values.length === 1 ? "" : "s"}; the right answer has ${s.values.length}.` };
    const key = row => JSON.stringify(row.map(norm));
    const a = u.values.map(key).sort(), b = s.values.map(key).sort();
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return { ok: false, why: "Right shape, but some values are different. Check your filter or math." };
    if (orderIdx != null && u.values.map(r => JSON.stringify(norm(r[orderIdx]))).join() !== s.values.map(r => JSON.stringify(norm(r[orderIdx]))).join()) return { ok: false, why: "Right rows, wrong order. Check your ORDER BY (and DESC)." };
    return { ok: true };
  }
  function friendly(m) {
    if (/no such table/i.test(m)) return m + " · Tables here: releases, shoes, sales.";
    if (/no such column/i.test(m)) return m + " · Check the spelling against the table list.";
    if (/syntax error/i.test(m)) return m + " · Look for a missing comma, quote or keyword near there.";
    if (/incomplete input/i.test(m)) return m + " · Something isn't finished: a quote, bracket or keyword.";
    return m;
  }
  function editor(host, opts) {
    host.insertAdjacentHTML("beforeend", `<div class="term">
      <div class="term-h"><span>${esc(opts.title || "SQL")}</span><span class="kbd">Ctrl/⌘ + Enter runs</span></div>
      <label class="sr" for="${opts.id}">SQL editor</label>
      <textarea class="sql" id="${opts.id}" rows="${opts.rows || 5}" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(opts.value || "")}</textarea>
      <div class="term-f"><button type="button" class="btn primary small" data-run>Run ▶</button>${opts.extra || ""}<span class="kbd" data-status>${DB ? "" : sqlFailed ? "SQL engine failed to load" : "loading SQL engine…"}</span></div>
    </div><div class="out"></div>`);
    const out = host.lastElementChild, term = out.previousElementSibling, ta = term.querySelector("textarea");
    const exec = () => {
      out.innerHTML = ""; const q = ta.value.trim(); let r;
      if (!q) { out.innerHTML = `<div class="msg info">Type a query first.</div>`; return; }
      if (/___/.test(q)) { out.innerHTML = `<div class="msg info">Fill in the <code>___</code> blanks first.</div>`; return; }
      try { r = run(q); } catch (e) { out.innerHTML = `<div class="msg err">${esc(friendly(e.message))}</div>`; return; }
      out.innerHTML = tableHTML(r);
      const ch = chartable(r);
      if (ch) { out.insertAdjacentHTML("beforeend", `<div class="row"><button type="button" class="btn small" data-chart>Show as chart</button></div><div class="chart" hidden data-chartbox></div>`);
        out.querySelector("[data-chart]").addEventListener("click", e => { const box = out.querySelector("[data-chartbox]"); box.hidden = !box.hidden; if (!box.hidden) box.innerHTML = barSVG(r, ch); e.target.textContent = box.hidden ? "Show as chart" : "Hide chart"; }); }
      opts.onResult && opts.onResult(r, q, out);
    };
    term.querySelector("[data-run]").addEventListener("click", exec);
    ta.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); exec(); }
      if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end"); }
    });
    if (opts.onInput) ta.addEventListener("input", () => opts.onInput(ta.value));
    whenSQL(() => { const st = term.querySelector("[data-status]"); if (st) st.textContent = ""; });
    return { ta, out, exec, term };
  }

  /* ---------- AI help (Claude, through the viewer's own account) ---------- */
  let SAMPLE;
  (function () { const c = window.claude; if (!c || typeof c.use !== "function") { SAMPLE = null; return; } Promise.resolve(c.use("sample")).then(s => { SAMPLE = s || null; $$(".ai").forEach(a => (a.hidden = !SAMPLE)); }, () => { SAMPLE = null; }); })();
  const AI_CONTEXT = () => `You are a friendly SQL, Python and data science tutor inside "Drop Table", where the learner works shifts at a fictional rare-sneaker shop called the Grail Room. Learners can be as young as 10: use simple words, short sentences, and correct terms.
SQLite database: releases(id, release_date TEXT 'YYYY-MM-DD', brand, name, colorway, style_code, retail_usd INTEGER or NULL) = REAL upcoming releases (${FEED.window_start} to ${FEED.window_end}, from ${FEED.source_name}, checked ${FEED.as_of}). shoes(shoe_id, brand, model, colorway, release_date, retail_usd, pairs_made, hype 1-10) and sales(sale_id, shoe_id, sale_date, size_us, price_usd, condition 'new'|'used') = PRACTICE data, made-up brands, sales ${SIM.period_start} to ${SIM.period_end}.
Never invent real resale prices. Keep answers under 150 words.`;
  function aiBox(host, o) {
    host.insertAdjacentHTML("beforeend", `<div class="ai" ${SAMPLE ? "" : "hidden"}>
      ${o.input ? `<label class="sr" for="${o.id}">${esc(o.input)}</label><input class="ai-in" id="${o.id}" placeholder="${esc(o.input)}">` : ""}
      <div class="row"><button type="button" class="btn small" data-ai>✦ ${esc(o.label)}</button></div><div class="ai-out" hidden></div></div>`);
    const box = host.lastElementChild, out = box.querySelector(".ai-out"), btn = box.querySelector("[data-ai]"), inp = box.querySelector(".ai-in");
    btn.addEventListener("click", async () => {
      if (!SAMPLE) return;
      let p; try { p = o.prompt(inp ? inp.value.trim() : ""); } catch (e) { out.hidden = false; out.textContent = e.message; return; }
      btn.disabled = true; out.hidden = false; out.textContent = "Thinking…";
      try { const r = await SAMPLE(AI_CONTEXT() + "\n\n" + p, { onText: ({ text }) => { out.textContent = text; }, cache: false }); out.textContent = r.text; o.after && o.after(r.text); }
      catch (e) { out.textContent = e && e.code === "rate_limited" ? "Claude is busy. Try again in a minute." : e && e.code === "not_granted" ? "AI help is turned off for this page." : "Couldn't reach Claude. Try again."; }
      finally { btn.disabled = false; }
    });
  }

  /* ---------- generic sneaker art, colored from the real colorway ---------- */
  const COLORS = [["off noir", "#2a2a2c"], ["black", "#1d1d1f"], ["summit white", "#f2f2ee"], ["white", "#f4f4f2"], ["sail", "#efe8d8"], ["cream", "#f1e6cc"], ["bone", "#e8e0cf"], ["smoke", "#6e7178"], ["cement", "#a5a29c"], ["anthracite", "#3c3e43"], ["grey", "#9a9da3"], ["gray", "#9a9da3"],
    ["university red", "#c8102e"], ["gym red", "#b3123a"], ["fire red", "#d62828"], ["crimson", "#d7263d"], ["scarlet", "#c1121f"], ["maroon", "#6d1a2c"], ["red", "#d32f2f"], ["pink", "#f4a6c4"], ["rose", "#e88aa6"], ["melon", "#f7a072"],
    ["orange", "#f57c00"], ["clementine", "#ff8c42"], ["gold", "#d4a017"], ["maize", "#f2c14e"], ["yellow", "#f4d03f"], ["volt", "#d7f205"], ["lime", "#b5e61d"], ["green", "#2e8b57"], ["teal", "#178a8a"], ["jade", "#2fbf9b"], ["aqua", "#7fd8d8"], ["mint", "#a8e6cf"],
    ["royal", "#2246b5"], ["navy", "#1f2a52"], ["cobalt", "#1f4fbf"], ["lapis", "#28409a"], ["blue", "#2f6fdb"], ["purple", "#6b3fa0"], ["violet", "#7d4cc9"], ["orchid", "#a25ac7"], ["concord", "#3d2b7a"], ["iris", "#4b3a8f"],
    ["brown", "#6b4423"], ["russet", "#80461b"], ["tan", "#c8a27c"], ["bamboo", "#c9b27c"], ["flax", "#cfb27a"], ["barley", "#c9ad7a"], ["silver", "#c0c3c8"], ["chrome", "#d9d9d9"], ["camo", "#5b6b3a"], ["multi", "#f57c00"]];
  function paletteOf(cw) {
    if (Array.isArray(cw)) return cw;
    const found = [];
    String(cw || "").toLowerCase().split(/[\/-]/).forEach(part => { const hit = COLORS.find(([k]) => part.includes(k)); if (hit && !found.includes(hit[1])) found.push(hit[1]); });
    while (found.length < 3) found.push(["#9a9da3", "#f4f4f2", "#1d1d1f"][found.length]);
    return found;
  }
  /* silhouette picked from the model name: high-top, mid or low runner (generic, no logos) */
  function shoeSVG(cw, cls = "", name = "") {
    const [a, b, c] = paletteOf(cw);
    const high = /\b(jordan (1|3|4|5|6|11|12|13)|high|hi\b|blazer|dunk high|foamposite)/i.test(name);
    const upper = high
      ? "M14 78 C14 60 26 52 44 50 L80 44 C86 22 100 8 124 6 L146 6 C150 26 162 40 192 48 C214 52 228 60 228 74 L228 82 L14 82 Z"
      : "M14 78 C14 60 26 52 44 50 L86 46 C100 30 118 22 140 22 L150 22 C156 36 170 44 192 48 C214 52 228 60 228 74 L228 82 L14 82 Z";
    return `<svg class="${cls}" viewBox="0 0 240 110" aria-hidden="true">
      <path d="${upper}" fill="${a}" stroke="#00000033" stroke-width="2"/>${high ? `<path d="M124 8 L146 8 C148 18 152 26 158 32 L128 30 Z" fill="${c}" opacity=".85"/>` : ""}
      <path d="M96 48 C116 52 140 54 168 52 L196 50 C186 60 150 68 112 66 Z" fill="${b}"/>
      <path d="M138 24 L150 24 C152 32 156 38 162 42 L140 40 Z" fill="${b}" opacity=".9"/>
      <circle cx="120" cy="44" r="2.6" fill="${c}"/><circle cx="130" cy="40" r="2.6" fill="${c}"/><circle cx="140" cy="37" r="2.6" fill="${c}"/>
      <path d="M10 80 L232 80 C234 88 228 94 218 94 L22 94 C12 94 8 88 10 80 Z" fill="#f4f4f2" stroke="#00000033" stroke-width="2"/>
      <path d="M10 92 L232 92 C232 98 226 100 218 100 L22 100 C14 100 10 98 10 92 Z" fill="${c}"/></svg>`;
  }

  /* ---------- playable characters ---------- */
  const hero = () => CHARS.find(c => c.id === S.hero) || CHARS[0];
  function applyHero() { const c = hero(); STORE.hero = c.name; STORE.heroShort = c.short; }
  function heroize(t) {
    const c = hero(); let out = String(t == null ? "" : t).replace(/\bBig Face\b/g, c.name).replace(/\bBig Face\b/g, c.short);
    if (c.she) out = out.replace(/\b(he|He|his|His|him|himself)\b/g, w => ({ he: "she", He: "She", his: "her", His: "Her", him: "her", himself: "herself" }[w]));
    return out;
  }
  function charSVG(c, cls = "") {
    const tops = {
      cap: `<path d="M18 26c0-9 6-14 14-14s14 5 14 14H18z" fill="${c.topC}"/><path d="M40 25h14c0 3-3 4-6 4h-8z" fill="${c.topC}"/>`,
      puffs: `<circle cx="19" cy="19" r="7" fill="${c.topC}"/><circle cx="45" cy="19" r="7" fill="${c.topC}"/><path d="M19 28c0-10 6-14 13-14s13 4 13 14c-4-4-8-6-13-6s-9 2-13 6z" fill="${c.topC}"/>`,
      bucket: `<path d="M14 26l4-12h28l4 12z" fill="${c.topC}"/><rect x="12" y="24" width="40" height="4" rx="2" fill="${c.topC}"/>`,
      beanie: `<path d="M19 27c0-10 6-15 13-15s13 5 13 15z" fill="${c.topC}"/><rect x="18" y="23" width="28" height="6" rx="3" fill="${c.topC}" opacity=".85"/><circle cx="32" cy="10" r="4" fill="${c.topC}"/>`
    };
    return `<svg class="mike ${cls}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="${c.bg}"/>
      <g class="mk-body"><path d="M14 62c2-12 9-17 18-17s16 5 18 17z" fill="${c.hood}"/><path d="M26 46l6 6 6-6" fill="none" stroke="#17181A" stroke-width="2"/>
      <circle cx="32" cy="31" r="13" fill="${c.skin}"/>${tops[c.top]}
      <g class="mk-eyes"><circle cx="27" cy="32" r="1.8" fill="#17181A"/><circle cx="37" cy="32" r="1.8" fill="#17181A"/></g>
      <path class="mk-mouth" d="M27 37c3 3 7 3 10 0" fill="none" stroke="#17181A" stroke-width="2" stroke-linecap="round"/></g></svg>`;
  }
  const ART = n => "art/" + n + ".webp";
  const FACES = { mike: "face-bf", Rae: "face-rae", Theo: "face-theo" };
  const mikeSVG = cls => `<img class="mike face ${cls || ""}" src="${ART(FACES.mike)}" alt="" width="256" height="256">`;
  const BF_POSE = { talk: "bf-talk", think: "bf-think", cheer: "bf-cheer", hero: "bf-hero" };
  const bigFace = (pose, cls = "") => `<img class="cut ${cls}" src="${ART(BF_POSE[pose] || "bf-talk")}" alt="${esc(STORE.hero)}">`;
  const WEEK_BG = { 1: "store", 2: "storefront", 3: "store", 4: "office", 5: "lab" };
  function pickerHTML() {
    return `<div class="picker">${CHARS.map(c => `<button type="button" class="pick ${c.id === hero().id ? "on" : ""}" data-pick="${c.id}" aria-pressed="${c.id === hero().id}">${charSVG(c, "big")}<b>${esc(c.name)}</b><span>${esc(c.vibe)}</span></button>`).join("")}</div>`;
  }
  function bindPicker(root, after) {
    $$("[data-pick]", root).forEach(b => b.addEventListener("click", () => {
      S.hero = b.dataset.pick; save(); applyHero(); renderMe(); after && after();
    }));
  }

  /* ---------- live data: releases, feed meta, blog posts; photo uploads ---------- */
  let DBX = null, ASSETS = null, CAN_EDIT = false;
  (function live() {
    const c = window.claude; if (!c || typeof c.use !== "function") return;
    Promise.resolve(c.use("user")).then(u => u && u.canEdit().then(v => { CAN_EDIT = !!v; if (ASSETS && CAN_EDIT && ["home"].includes(curRoute())) route(); }), () => {});
    Promise.resolve(c.use("assets")).then(a => { ASSETS = a || null; }, () => {});
    Promise.resolve(c.use("db")).then(db => {
      if (!db) return; DBX = db;
      let meta = null, rows = null;
      const apply = () => {
        if (!meta || !rows || !rows.length) return;
        FEED = { as_of: meta.as_of, window_start: meta.window_start, window_end: meta.window_end, source_name: meta.source_name || FEED.source_name, source_url: safeUrl(meta.source_url) || FEED.source_url, live: true, rows: rows.map(r => ({ ...r, news_url: safeUrl(r.news_url) })) };
        buildDB(); renderFooter();
        const r = curRoute(); if (r === "home" || r === "data" || r === "blog" || r.startsWith("drop-")) route();
      };
      try {
        db.doc("meta/feed").onSnapshot(s => { meta = s && s.exists ? s.data() : null; apply(); }, () => {});
        db.collection("releases").onSnapshot(q => { rows = q.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(r => r.release_date && r.name); apply(); }, () => {});
        db.collection("posts").onSnapshot(q => {
          const list = q.docs.map(d => Object.assign({ slug: d.id }, d.data())).filter(p => p.title && p.body);
          if (list.length) { POSTS = list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); const r = curRoute(); if (r === "home" || r === "blog" || r.startsWith("post-")) route(); }
        }, () => {});
      } catch (e) { /* stay on the saved list */ }
    }, () => {});
  })();
  async function uploadPhoto(r, file) {
    if (!ASSETS || !DBX) return toast("Photo upload isn't available here.");
    if (!/^image\//.test(file.type)) return toast("Choose an image file.");
    try {
      toast("Uploading…");
      const res = await ASSETS.upload(file);
      await DBX.doc("releases/" + r.id).update({ photo: res.id });
      r.photo = res.id; toast("Photo added."); route();
    } catch (e) { toast(e && e.code === "too_large" ? "That image is too big (20 MB max)." : "Upload didn't work. Check you're signed in as an editor."); }
  }

  /* ---------- downloads: book + notebook kit ---------- */
  let DL;
  (function () { const c = window.claude; if (!c || typeof c.use !== "function") { DL = null; return; } Promise.resolve(c.use("downloads")).then(d => { DL = d || null; }, () => { DL = null; }); })();
  async function saveFile(filename, data) {
    if (!DL) { /* outside Claude (e.g. GitHub Pages): a normal browser download */
      try { const blob = data instanceof Blob ? data : new Blob([data]); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); return true; }
      catch (e) { toast("Your browser blocked the download."); return false; } }
    try { await DL.save({ filename, data }); return true; } catch (e) { toast(e && e.code === "declined" ? "Download cancelled." : "Couldn't save the file. Try again."); return false; }
  }
  async function downloadBook(btn) {
    btn && (btn.disabled = true);
    try { const res = await fetch("drop-table-book.pdf"); if (!res.ok) throw new Error(); await saveFile("Drop-Table-Book.pdf", await res.blob()); }
    catch (e) { toast("Couldn't load the book. Try again."); }
    finally { btn && (btn.disabled = false); }
  }
  let zipLib = null;
  const loadZip = () => window.JSZip ? Promise.resolve(window.JSZip) : (zipLib = zipLib || new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload = () => res(window.JSZip); s.onerror = () => { zipLib = null; rej(new Error("zip")); }; document.head.appendChild(s); }));
  function csvOf(table) {
    const r = run(`SELECT * FROM ${table}`);
    const cell = x => (x === null ? "" : /[",\n]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x));
    return [r.columns.join(","), ...r.values.map(row => row.map(cell).join(","))].join("\n") + "\n";
  }
  function notebookJSON(nb) {
    const lines = s => s.split("\n").map((l, i, a) => (i < a.length - 1 ? l + "\n" : l));
    return JSON.stringify({ cells: nb.cells.map(([t, s]) => (t === "md" ? { cell_type: "markdown", metadata: {}, source: lines(s) } : { cell_type: "code", execution_count: null, metadata: {}, outputs: [], source: lines(s) })),
      metadata: { kernelspec: { display_name: "Python 3", language: "python", name: "python3" }, language_info: { name: "python" } }, nbformat: 4, nbformat_minor: 4 }, null, 1);
  }
  async function downloadKit(btn) {
    btn && (btn.disabled = true);
    try {
      await new Promise(r => whenSQL(r));
      const JSZip = await loadZip(), zip = new JSZip(), root = zip.folder("grail-room-notebook-kit");
      root.file("README.txt", `Grail Room notebook kit (Drop Table)\n\n1. Go to https://colab.research.google.com and choose File > Upload notebook. Pick a lesson .ipynb.\n2. In Colab, open the Files panel (folder icon, left) and drag in releases.csv, shoes.csv and sales.csv.\n3. Run cells with Shift+Enter.\n\nreleases.csv = REAL release calendar from ${FEED.source_name}, covering ${FEED.window_start} to ${FEED.window_end}, checked ${FEED.as_of}.\nshoes.csv and sales.csv = PRACTICE data (made-up brands), sales ${SIM.period_start} to ${SIM.period_end}.\n`);
      ["releases", "shoes", "sales"].forEach(t => root.file(t + ".csv", csvOf(t)));
      NOTEBOOKS.forEach(nb => root.file(nb.file, notebookJSON(nb)));
      await saveFile("grail-room-notebook-kit.zip", await zip.generateAsync({ type: "uint8array" }));
    } catch (e) { toast("Couldn't build the kit. Try again."); }
    finally { btn && (btn.disabled = false); }
  }

  /* ---------- router ---------- */
  const VIEWS = { learn: v => viewLearn(v), glossary: v => viewGlossary(v), privacy: viewPrivacy, terms: viewTerms, story: viewStory, home: viewHome, shifts: viewShifts, play: viewPlay, blog: viewBlog, map: viewMap, data: viewData, docs: viewDocs, rank: viewRank, flip: viewFlip };
  const curRoute = () => (location.hash || "#home").slice(1);
  let bannerTimer = null;
  function route() {
    clearInterval(bannerTimer); bannerTimer = null;
    const r = curRoute(), dm = r.match(/^d(\d+)$/);
    const navKey = dm ? "shifts" : r.startsWith("post-") || r.startsWith("drop-") ? "blog" : /^(learn|glossary|docs)/.test(r) ? "learn" : r;
    $$("#nav a").forEach(a => a.setAttribute("aria-current", a.dataset.r === navKey ? "page" : "false"));
    const v = $("#view"); v.innerHTML = "";
    if (dm && DAYS.find(x => x.d === +dm[1])) viewDay(v, +dm[1]);
    else if (r.startsWith("post-")) viewPost(v, r.slice(5));
    else if (r.startsWith("drop-")) viewDrop(v, r);
    else if (/^learn-d\d+$/.test(r)) { viewLearn(v, r); return; }
    else if (r.startsWith("glossary-")) { viewGlossary(v, r); return; }
    else (VIEWS[r] || viewHome)(v);
    window.scrollTo(0, 0);
  }
  const go = r => (curRoute() === r ? route() : (location.hash = r));

  /* ---------- HOME ---------- */
  const upcoming = days => { const t = todayET(); return FEED.rows.filter(r => r.release_date >= t && daysBetween(t, r.release_date) <= days).sort((a, b) => (a.release_date < b.release_date ? -1 : a.release_date > b.release_date ? 1 : (b.retail_usd || 0) - (a.retail_usd || 0))); };
  function featured() {
    const list = upcoming(30), out = [], seenDay = {};
    list.filter(r => r.news_url || r.photo).forEach(r => out.push(r));
    list.forEach(r => { if (out.length >= 8 || out.includes(r)) return; if ((seenDay[r.release_date] || 0) < 2 && nick(r.name)) { out.push(r); seenDay[r.release_date] = (seenDay[r.release_date] || 0) + 1; } });
    return out.sort((a, b) => (a.release_date < b.release_date ? -1 : 1)).slice(0, 8);
  }
  function freshnessHTML() {
    return `<div class="fresh">${FEED.live ? `<span class="live"><i></i>Live list</span>` : `<span>Saved list</span>`}
      <span>Covers <b>${fmtDate(FEED.window_start, { month: "short", day: "numeric", year: "numeric" })} – ${fmtDate(FEED.window_end, { month: "short", day: "numeric", year: "numeric" })}</b></span>
      <span>Checked <b>${fmtStamp(FEED.as_of)}</b></span>
      <span>Source: <a href="${esc(FEED.source_url)}" target="_blank" rel="noopener">${esc(FEED.source_name)} ↗</a></span></div>`;
  }
  function slideHTML(r, i, n) {
    const d = daysBetween(todayET(), r.release_date), nk = nick(r.name), ph = photoUrl(r);
    return `<article class="slide" data-i="${i}" ${i ? 'aria-hidden="true"' : ""} style="--a:${paletteOf(r.colorway || nk)[0]};--b:${paletteOf(r.colorway || nk)[1]}">
      <a class="slide-art" href="${esc(r.news_url || "#" + hashKey(r.id))}" ${r.news_url ? `target="_blank" rel="noopener" aria-label="See real photos of ${esc(r.name)} on ${esc(r.news_source || "the source site")} (opens a new tab)"` : `aria-label="Read the drop file for ${esc(r.name)}"`}>
        ${ph ? `<img src="${esc(ph)}" alt="">` : shoeSVG(r.colorway || nk, "big", r.name)}
        <span class="art-cap">${r.news_url ? `Real photos on ${esc(r.news_source || "source")} ↗` : ph ? "" : "Illustration"}</span></a>
      <div class="slide-copy">
        <div class="slide-stamp"><span>${esc(fmtDate(r.release_date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}</span><span class="when ${d > 0 ? "later" : ""}">${whenLabel(d)}</span></div>
        <div class="slide-brand">${esc(r.brand)} · ${i + 1}/${n}</div>
        <h2 class="slide-nick">${esc(nk || r.name)}</h2>
        <p class="slide-name">${esc(r.name)}</p>
        <p class="slide-cw">${r.colorway ? esc(r.colorway) : "Colorway not listed yet"}${r.style_code ? ` · <span class="mono">${esc(r.style_code)}</span>` : ""}</p>
        <div class="slide-foot"><span class="slide-price">${r.retail_usd == null ? "Price TBA" : "$" + r.retail_usd}</span>
          <a class="btn primary" href="#${hashKey(r.id)}">Read the drop file →</a>
          ${r.news_url ? `<a class="btn" href="${esc(r.news_url)}" target="_blank" rel="noopener">See photos on ${esc(r.news_source || "the source")} ↗</a>` : ""}
          ${ASSETS && CAN_EDIT && DBX ? `<label class="btn ghost small upl">${ph ? "Change photo" : "Add photo"}<input type="file" accept="image/*" data-upl="${esc(r.id)}" class="sr"></label>` : ""}</div>
      </div></article>`;
  }
  function viewHome(v) {
    const t = todayET(), feat = featured(), rail = upcoming(21), nx = nextDay(), dayObj = DAYS.find(x => x.d === nx), wk = WEEKS[dayObj.w - 1];
    const doneN = Object.keys(S.done).length, pct = Math.round(doneN / DAYS.length * 100);
    v.innerHTML = `
      <section class="lhero">
        <div class="lh-copy">
          <span class="chip-k">A free coding course in ${DAYS.length} shifts</span>
          <h1>You just got hired at the <span class="t">Grail Room</span><span class="semi">.</span></h1>
          <p class="lede">Learn SQL, Python, data analytics and AI by working shifts at a rare-sneaker shop in Atlanta. You play <b>${esc(STORE.hero)}</b>, a kid saving for his first grail. Every shift is one short lesson with real data, and each one is a little harder than the last.</p>
          <div class="row"><a class="btn primary big3d" href="#d${nx}">${doneN ? `Continue: Day ${nx}` : "Start Day 1"} →</a><a class="btn big3d ghost3d" href="#how">How it works</a></div>
          <ul class="lh-trust"><li><b>No experience</b> needed</li><li><b>10–20 min</b> per shift</li><li><b>Runs in your browser</b></li></ul>
        </div>
        <div class="lh-art">
          <div class="lh-frame"><img src="${ART("storefront")}" alt="The Grail Room sneaker shop at night in Atlanta"></div>
          ${bigFace("hero", "lh-hero")}
          <div class="float-card fc1"><img src="${ART("face-rae")}" alt=""><div><b>Rae</b><span>“Find the 5 priciest drops.”</span></div></div>
          <div class="float-card fc2"><span class="fc-xp">+$10</span><div><b>First-try tip</b><span>Day 4 · Sort by price</span></div></div>
        </div>
      </section>

      <section class="stats">
        <div><b>${DAYS.length}</b><span>shifts, each one lesson</span></div><div><b>5</b><span>skills: SQL, Python, data, ML, AI</span></div><div><b>3</b><span>real ML models you train</span></div><div><b>${FEED.rows.length}</b><span>real upcoming releases to query</span></div>
      </section>

      <section class="block" id="how"><div class="sec-h"><span class="chip-k">How it works</span><h2>Learn like you're on the job</h2></div>
        <div class="steps4">
          <div><span class="s-n">01</span><img src="${ART("face-rae")}" alt=""><h3>Get a job</h3><p>Rae or Theo hands you a real task, like “what drops under $150 this week?”</p></div>
          <div><span class="s-n">02</span><img src="${ART("face-bf")}" alt=""><h3>See the idea</h3><p>A short story page, the big idea in plain words, and the data you'll use.</p></div>
          <div><span class="s-n">03</span><div class="s-ico">&lt;/&gt;</div><h3>Write real code</h3><p>SQL first, then Python. The page runs it and checks your answer instantly.</p></div>
          <div><span class="s-n">04</span><img src="${ART("grail")}" alt="" class="s-shoe"><h3>Earn and level up</h3><p>Wages, tips and rep. Climb from Fresh Laces to True Sneakerhead.</p></div>
        </div>
      </section>

      <section class="block"><div class="sec-h row-h"><div><span class="chip-k">Your learning path</span><h2>Five weeks, five departments</h2></div><div class="path-prog"><span>${doneN}/${DAYS.length} shifts · ${pct}%</span><div class="prog"><i style="width:${pct}%"></i></div></div></div>
        <div class="units">${WEEKS.map(w => { const days = DAYS.filter(x => x.w === w.n), dn = days.filter(x => S.done[x.d]).length, cur = w.n === wk.n; return `<a class="unit u${w.n} ${cur ? "cur" : ""}" href="#d${(days.find(x => !S.done[x.d]) || days[0]).d}">
          <div class="u-art"><img src="${ART(UNIT_ART[w.n])}" alt=""></div>
          <div class="u-body"><span class="u-k">Week ${w.n} · ${esc(w.tool)}</span><h3>${esc(w.name)}</h3><div class="prog"><i style="width:${Math.round(dn / days.length * 100)}%"></i></div><span class="u-n">${dn}/${days.length} shifts${cur ? " · you're here" : ""}</span></div></a>`; }).join("")}</div>
        <div class="unit-path"><h3 class="sub">Week ${wk.n}: ${esc(wk.name)}</h3>${pathHTML(wk.n)}</div>
      </section>

      <section class="block"><div class="sec-h"><span class="chip-k">Meet the crew</span><h2>The people at the Grail Room</h2></div>
        <div class="crew3">
          <div><img src="${ART("bf-talk")}" alt=""><h3>${esc(STORE.hero)}</h3><p>That's you. Real name Michael. Everybody calls him Big Face because he's always chasing big face hundreds.</p></div>
          <div><img src="${ART("rae")}" alt=""><h3>Rae</h3><p>Store manager. Runs the floor and gives you your SQL jobs in weeks 1 to 3.</p></div>
          <div><img src="${ART("theo")}" alt=""><h3>Theo</h3><p>Data lead. Takes over in weeks 4 and 5 for Python, charts and machine learning.</p></div>
        </div>
      </section>

      <section class="block"><div class="sec-h"><span class="chip-k">Real data</span><h2>This week's drops</h2></div>
      <section class="banner" aria-roledescription="carousel" aria-label="Featured upcoming drops">
        <div class="slides" id="slides">${feat.length ? feat.map((r, i) => slideHTML(r, i, feat.length)).join("") : `<div class="empty">No featured drops in the next 30 days in this list.</div>`}</div>
        ${feat.length > 1 ? `<div class="bctl"><button type="button" class="cnav" id="bPrev" aria-label="Previous drop">←</button><div class="dots" role="tablist">${feat.map((r, i) => `<button type="button" role="tab" class="dot ${i ? "" : "on"}" data-go="${i}" aria-label="Drop ${i + 1}: ${esc(nick(r.name) || r.name)}"></button>`).join("")}</div><button type="button" class="cnav" id="bNext" aria-label="Next drop">→</button><button type="button" class="btn ghost small" id="bPause">Pause</button></div>` : ""}
      </section>
      ${freshnessHTML()}
        <div class="track">${rail.length ? rail.map(boxHTML).join("") : `<div class="empty">Nothing listed in the next 21 days.</div>`}</div>
        <p class="note">You query these real releases in your shifts. Dates and prices come from a public release calendar and can change. Shoe drawings are generic.</p>
      </section>

      ${bookCardHTML("bookBtn")}

      <section class="block"><div class="sec-h row-h"><div><span class="chip-k">Blog</span><h2>Drop reports and data stories</h2></div><a class="more" href="#blog">All posts →</a></div><div class="posts">${POSTS.slice(0, 3).map(postCard).join("")}</div></section>`;
    $("#bookBtn", v).addEventListener("click", e => downloadBook(e.target));
    $$("[data-upl]", v).forEach(inp => inp.addEventListener("change", () => { const r = FEED.rows.find(x => x.id === inp.dataset.upl); if (r && inp.files[0]) uploadPhoto(r, inp.files[0]); }));
    bindShifts(v);
    if (feat.length > 1) {
      let i = 0, paused = reduceMotion();
      const slides = $$(".slide", v), dots = $$(".dot", v);
      const show = k => { i = (k + slides.length) % slides.length; slides.forEach((s, j) => { s.classList.toggle("on", j === i); s.setAttribute("aria-hidden", j === i ? "false" : "true"); }); dots.forEach((d, j) => d.classList.toggle("on", j === i)); };
      show(0);
      $("#bPrev", v).addEventListener("click", () => show(i - 1)); $("#bNext", v).addEventListener("click", () => show(i + 1));
      dots.forEach(d => d.addEventListener("click", () => show(+d.dataset.go)));
      const pb = $("#bPause", v); pb.textContent = paused ? "Play" : "Pause";
      pb.addEventListener("click", () => { paused = !paused; pb.textContent = paused ? "Play" : "Pause"; });
      const ban = $(".banner", v); let hover = false;
      ban.addEventListener("mouseenter", () => (hover = true)); ban.addEventListener("mouseleave", () => (hover = false));
      ban.addEventListener("focusin", () => (hover = true)); ban.addEventListener("focusout", () => (hover = false));
      bannerTimer = setInterval(() => { if (!paused && !hover && document.visibilityState === "visible") show(i + 1); }, 6500);
    } else { const s = $(".slide", v); if (s) s.classList.add("on"); }
  }
  function boxHTML(r) {
    const d = daysBetween(todayET(), r.release_date), ph = photoUrl(r);
    const name = esc(r.name).replace(/&quot;([^&]+)&quot;/, (m, n) => `<span class="hl">“${n}”</span>`);
    return `<a class="box" href="#${hashKey(r.id)}">
      <div class="lab">
        <div class="stamp"><span class="date">${esc(fmtDate(r.release_date, { weekday: "short", month: "short", day: "numeric" }).toUpperCase())}</span><span class="when ${d > 0 ? "later" : ""}">${whenLabel(d)}</span></div>
        <div class="art">${ph ? `<img src="${esc(ph)}" alt="">` : shoeSVG(r.colorway || nick(r.name), "", r.name)}</div>
        <div class="brand">${esc(r.brand)}</div><div class="name">${name}</div>
        <div class="foot"><span class="price ${r.retail_usd == null ? "tba" : ""}">${r.retail_usd == null ? "Price TBA" : "$" + r.retail_usd}</span><span class="code">${r.style_code ? esc(r.style_code) : ""}</span></div>
      </div></a>`;
  }

  /* ---------- shifts (the course map) ---------- */
  const unlocked = d => d === 1 || !!S.done[d - 1] || !!S.done[d];
  const nextDay = () => { const m = DAYS.find(x => !S.done[x.d]); return m ? m.d : DAYS[DAYS.length - 1].d; };
  function shiftsHTML() {
    return `<div class="weeks">${WEEKS.map(w => { const days = DAYS.filter(x => x.w === w.n), done = days.filter(x => S.done[x.d]).length; return `<section class="week">
      <div class="unit-ban u${w.n}" style="--ubg:url(${ART(UNIT_ART[w.n])})"><div><span class="u-k">Week ${w.n} · ${esc(w.tool)}</span><h3>${esc(w.name)}</h3><p>${esc(w.blurb)}</p></div><span class="u-n">${done}/${days.length}</span></div>
      ${pathHTML(w.n)}</section>`; }).join("")}</div>`;
  }
  const UNIT_ART = { 1: "store", 2: "storefront", 3: "store", 4: "office", 5: "lab" };
  function pathHTML(wn) {
    const nx = nextDay();
    return `<div class="path">${DAYS.filter(x => x.w === wn).map(x => { const st = S.done[x.d] ? "done" : x.d === nx ? "next" : unlocked(x.d) ? "open" : "locked"; return `<button type="button" class="node ${st}" data-d="${x.d}" ${st === "locked" ? "disabled" : ""} aria-label="Day ${x.d}: ${esc(x.t)}${st === "locked" ? " (locked)" : ""}">
      <span class="dot">${st === "done" ? "✓" : st === "locked" ? "🔒" : x.type === "lab" ? "ML" : x.type === "quiz" && x.w >= 4 ? "Py" : x.d}</span>${st === "next" ? `<span class="start">START</span>` : ""}<span class="nt">${esc(x.t)}</span><span class="nx">+${x.xp} rep</span></button>`; }).join("")}</div>`;
  }
  function bindShifts(v) { $$("[data-d]", v).forEach(b => b.addEventListener("click", () => go("d" + b.dataset.d))); }
  function viewShifts(v) {
    v.innerHTML = `<div class="mhead"><div class="eyebrow">${STORE.name} · ${Object.keys(S.done).length}/${DAYS.length} shifts done · ${esc(rank(S.xp))}</div><h1>${esc(STORE.heroShort)}'s shifts</h1>
      <p class="lede">Five weeks, five departments. Each shift unlocks the next. Help gets lighter as you go: fill-in-the-blank in week 1, a skeleton in weeks 2–3, a blank editor from week 4 (with a "Head start" button if you need it). Progress saves in this browser.</p></div>${shiftsHTML()}`;
    bindShifts(v);
  }

  /* ---------- one shift ---------- */
  /* ---------- reference docs: tables, columns and the SQL cheat sheet, all clickable ---------- */
  let ACTIVE_TA = null, EX_ED = null;      // where "Insert" and "Try it" go
  const TABLE_INFO = { releases: ["real", () => `${FEED.rows.length} upcoming releases · ${FEED.window_start} → ${FEED.window_end}`], shoes: ["practice", () => `${SIM_SHOES.length} made-up shoes`], sales: ["practice", () => `${SALES.length.toLocaleString()} sales · ${SIM.period_start} → ${SIM.period_end}`] };
  function colDocHTML(t, c) { const [type, what, ex] = COLUMN_DOCS[t][c]; return `<div class="cdoc"><code>${esc(t)}.${esc(c)}</code> <span class="pill">${esc(type)}</span><p>${esc(what)}</p><p class="note">Example value: <code>${esc(ex)}</code></p>${ACTIVE_TA ? `<button type="button" class="btn small" data-ins="${esc(c)}">Insert “${esc(c)}” into my answer</button>` : ""}</div>`; }
  function refHTML(upTo, full) {
    const cheat = CHEAT.filter(cq => full || cq[0] <= upTo);
    return `<div class="card ref" id="ref"><h3>Reference</h3>
      <p class="note">Tap a table to see its columns, tap a column to learn what's in it.</p>
      ${Object.keys(COLUMN_DOCS).map(t => `<details class="rt" ${full ? "open" : ""}><summary><b>${t}</b> <span class="pill ${TABLE_INFO[t][0] === "real" ? "real" : "sim"}">${TABLE_INFO[t][0]}</span><span class="note">${esc(TABLE_INFO[t][1]())}</span></summary>
        <div class="chips">${Object.keys(COLUMN_DOCS[t]).map(c => `<button type="button" class="chip" data-col="${t}.${c}" aria-expanded="false">${c}</button>`).join("")}</div><div class="cdoc-host"></div></details>`).join("")}
      <h3 class="sub2">SQL cheat sheet${full ? "" : ` <span class="note">(${cheat.length} unlocked)</span>`}</h3>
      <div class="cheat">${cheat.map((cq, i) => `<details><summary><code>${esc(cq[1])}</code> <span class="note">Day ${cq[0]}</span></summary><p>${esc(cq[2])}</p><pre class="snip">${esc(cq[3])}</pre><button type="button" class="btn small" data-try="${CHEAT.indexOf(cq)}">Try it ▶</button></details>`).join("") || `<p class="note">Your first keywords unlock on Day 2.</p>`}</div>
      ${full ? "" : `<a class="more" href="#docs">Open the full docs page →</a>`}</div>`;
  }
  function bindRef(root) {
    $$(".chip[data-col]", root).forEach(b => b.addEventListener("click", () => {
      const [t, c] = b.dataset.col.split("."), host = b.closest("details, .peek").querySelector(".cdoc-host"), open = b.getAttribute("aria-expanded") === "true";
      $$(".chip", b.parentElement).forEach(z => z.setAttribute("aria-expanded", "false"));
      host.innerHTML = open ? "" : colDocHTML(t, c); if (!open) b.setAttribute("aria-expanded", "true");
      const ins = host.querySelector("[data-ins]");
      if (ins) ins.addEventListener("click", () => { const ta = ACTIVE_TA; if (!ta) return; ta.focus(); ta.setRangeText(c, ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); toast(`Inserted ${c}`); });
    }));
    $$("[data-try]", root).forEach(b => b.addEventListener("click", () => {
      const q = CHEAT[+b.dataset.try][3];
      if (EX_ED && document.body.contains(EX_ED.ta)) { EX_ED.ta.value = q; EX_ED.exec(); EX_ED.term.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "center" }); }
      else { playSeed = q; S.playMode = "sql"; go("play"); }
    }));
  }
  /* first look: a few real rows of each table today's job uses, before you write anything */
  function tablesFor(x) {
    if (x.type === "lab") return ["shoes", "sales"];
    if (x.type === "free") return ["releases", "shoes", "sales"];
    if (x.type === "quiz" || !x.ch) return [];
    const txt = (x.ch ? x.ch.sol : "") + " " + (x.ex || "");
    return ["releases", "shoes", "sales"].filter(t => new RegExp("\\b" + t + "\\b", "i").test(txt));
  }
  function peek(host, tables) {
    if (!tables.length) return;
    host.insertAdjacentHTML("beforeend", `<div class="card peek"><h3>First look at the data</h3>
      ${tables.length > 1 ? `<div class="seg" role="tablist">${tables.map((t, i) => `<button type="button" role="tab" data-pt="${t}" class="${i ? "" : "on"}" aria-selected="${i ? "false" : "true"}">${t}</button>`).join("")}</div>` : ""}
      <div class="peek-body"></div></div>`);
    const card = host.lastElementChild, body = card.querySelector(".peek-body");
    const show = t => whenSQL(() => {
      const r = run(t === "releases" ? "SELECT * FROM releases ORDER BY release_date LIMIT 5" : `SELECT * FROM ${t} LIMIT 5`);
      body.innerHTML = `<p class="peek-meta"><b>${t}</b> <span class="pill ${TABLE_INFO[t][0] === "real" ? "real" : "sim"}">${TABLE_INFO[t][0]}</span> ${esc(TABLE_INFO[t][1]())} · first 5 rows</p>
        <div class="chips">${r.columns.map(c => `<button type="button" class="chip" data-col="${t}.${c}" aria-expanded="false">${c}</button>`).join("")}</div><div class="cdoc-host"></div>${tableHTML(r)}`;
      bindRef(body);
    });
    $$("[data-pt]", card).forEach(b => b.addEventListener("click", () => { $$("[data-pt]", card).forEach(z => { z.classList.toggle("on", z === b); z.setAttribute("aria-selected", z === b ? "true" : "false"); }); show(b.dataset.pt); }));
    show(tables[0]);
  }
  /* ---------- THE FLIP: wallet, closet, market ---------- */
  function spark(h) {
    if (h.length < 2) return "";
    const lo = Math.min(...h), hi = Math.max(...h), W = 90, H = 26, X = i => (i / (h.length - 1)) * W, Y = v => H - 2 - ((v - lo) / (hi - lo || 1)) * (H - 4);
    return `<svg class="spark ${h[h.length - 1] >= h[0] ? "up" : "down"}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${h.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ")}"/></svg>`;
  }
  function viewFlip(v) {
    v.innerHTML = `<div class="mhead"><div class="eyebrow">The Flip · ${esc(STORE.heroShort)}'s money</div><h1>Wallet, closet and the market</h1><p class="lede">Shifts pay wages (half your rep, in dollars). Nail a SQL job on the first try and Rae tips you $${WALLET.firstTryTip}. Buy practice pairs low, sell high, and watch out: stuff happens between shifts.</p></div><div id="flipBody"><p class="note">Opening the market…</p></div>`;
    whenSQL(() => { initMarket(); drawFlip($("#flipBody", v)); });
  }
  function drawFlip(host) {
    const g = WALLET.grailId, gp = price(g), pct = Math.min(1, S.cash / gp);
    const worth = S.closet.reduce((a, pr) => a + pairValue(pr), 0), paid = S.closet.reduce((a, pr) => a + pr.cost, 0);
    host.innerHTML = `
      <div class="flipgrid">
        <div class="card wallet"><h3>Wallet</h3><div class="bigcash">${money(S.cash)}</div><p class="note">Market day ${S.mkt.day} · closet worth ${money(worth)} · net worth ${money(S.cash + worth)}</p>
          <div class="row"><button type="button" class="btn small" id="sleep">Sleep → next market day</button></div></div>
        <div class="card grail ${S.grail ? "got" : ""}"><h3>Grail jar</h3><div class="grail-row"><div class="grail-art"><img src="${ART("grail")}" alt="The gold grail sneaker"></div>
          <div><b>${esc(shoeName(g))}</b><p class="note">Hype ${shoeById(g)[7]}/10 · only ${shoeById(g)[6].toLocaleString()} pairs made · market ${money(gp)}</p>
          ${S.grail ? `<p class="ev-out">${esc(heroize("Big Face got his grail."))} 🏆</p>` : `<div class="rbar big"><i style="width:${Math.round(pct * 100)}%"></i></div><p class="note">${money(S.cash)} of ${money(gp)} · ${Math.round(pct * 100)}%</p><button type="button" class="btn primary small" id="buyGrail" ${S.cash >= gp ? "" : "disabled"}>Buy the grail</button>`}</div></div></div>
      </div>
      <section class="block"><h2>${esc(STORE.heroShort)}'s closet</h2>${S.closet.length ? `<div class="tablewrap flat"><table class="res"><thead><tr><th>pair</th><th>paid</th><th>worth now</th><th>profit if sold</th><th></th></tr></thead><tbody>
        ${S.closet.map((pr, k) => { const val = pairValue(pr), net = Math.round(val * (1 - WALLET.fee)), pl = net - pr.cost; return `<tr><td>${esc(shoeName(pr.id))}${pr.q !== 1 ? ` <span class="note">(condition ×${pr.q})</span>` : ""}</td><td class="num">${money(pr.cost)}</td><td class="num">${money(val)}</td><td class="num ${pl >= 0 ? "pos" : "neg"}">${pl >= 0 ? "+" : ""}${money(pl)}</td><td><button type="button" class="btn small" data-sell="${k}">Sell</button></td></tr>`; }).join("")}</tbody></table></div><p class="note">Selling costs a ${WALLET.fee * 100}% app fee. Profit = price × 0.9 − what you paid. You paid ${money(paid)} for these.</p>` : `<p class="note">Empty. Buy a pair from the market below.</p>`}</section>
      <section class="block"><h2>The market</h2><p class="note">Practice brands only. Prices start from each shoe's average sale in the store's log, then move every market day. Higher hype = bigger swings.</p>
        <div class="tablewrap flat"><table class="res market"><thead><tr><th>shoe</th><th>hype</th><th>price</th><th>since yesterday</th><th>last ${S.mkt.hist[1].length} days</th><th></th></tr></thead><tbody>
        ${SIM_SHOES.map(r => { const id = r[0], h = S.mkt.hist[id], p0 = h.length > 1 ? h[h.length - 2] : h[0], ch = (price(id) - p0) / p0; return `<tr><td>${esc(shoeName(id))}</td><td class="num">${r[7]}</td><td class="num">${money(price(id))}</td><td class="num ${ch >= 0 ? "pos" : "neg"}">${ch >= 0 ? "▲" : "▼"} ${Math.abs(ch * 100).toFixed(1)}%</td><td>${spark(h)}</td><td><button type="button" class="btn small" data-buy="${id}" ${S.cash >= price(id) ? "" : "disabled"}>Buy</button></td></tr>`; }).join("")}</tbody></table></div></section>
      <section class="block"><h2>What happened</h2>${S.log.length ? `<ul class="evlog">${S.log.map(l => `<li class="ev-${l.kind}"><span class="mono">Day ${l.day}</span> <b>${esc(l.title)}</b> <span class="note">${esc(heroize(l.last))}</span></li>`).join("")}</ul>` : `<p class="note">Nothing yet. Finish a shift or sleep to the next day.</p>`}</section>
      <details class="py" open><summary>This page in Python</summary><pre>${esc(`fee = 0.10
wallet = ${S.cash}
closet = [${S.closet.slice(0, 3).map(pr => `{"shoe": "${shoeById(pr.id)[2]}", "paid": ${pr.cost}, "worth": ${pairValue(pr)}}`).join(", ")}]

def profit(pair):
    return round(pair["worth"] * (1 - fee) - pair["paid"])

for pair in closet:
    print(pair["shoe"], profit(pair))

net_worth = wallet + sum(p["worth"] for p in closet)
print("net worth:", net_worth)`)}</pre><p class="note">The same math the page just did. Run it in the notebook kit to try your own numbers.</p></details>`;
    $("#sleep", host).addEventListener("click", () => { marketTick(); eventPopup(); drawFlip(host); });
    $$("[data-buy]", host).forEach(b => b.addEventListener("click", () => { const id = +b.dataset.buy, p = price(id); if (S.cash < p) return; S.cash -= p; S.closet.push({ id, cost: p, q: 1 }); save(); renderMe(); toast(`Bought ${shoeName(id)} for ${money(p)}`); drawFlip(host); }));
    $$("[data-sell]", host).forEach(b => b.addEventListener("click", () => { const pr = S.closet[+b.dataset.sell], val = pairValue(pr), fee = Math.round(val * WALLET.fee), got = val - fee; S.cash += got; S.closet.splice(+b.dataset.sell, 1); save(); renderMe(); toast(`Sold for ${money(val)} − ${money(fee)} fee = ${money(got)} (${got - pr.cost >= 0 ? "profit" : "loss"} ${money(Math.abs(got - pr.cost))})`); drawFlip(host); }));
    const bg = $("#buyGrail", host); if (bg) bg.addEventListener("click", () => { if (S.cash < gp) return; S.cash -= gp; S.grail = true; save(); renderMe(); drawFlip(host);
      popup(`<div class="pop-burst city"><img class="pop-bg" src="${ART("skyline")}" alt="">${bigFace("hero", "hero-pop")}</div><div class="eyebrow">Grail secured</div><h2>${esc(STORE.heroShort)} got the ${esc(shoeName(g))}</h2><p>Saved, flipped, survived ${S.log.length}+ curveballs, and paid ${money(gp)}. That's what a plan plus data looks like.</p><div class="row"><button type="button" class="btn primary" data-close>Let's go</button></div>`); });
  }

  function viewDocs(v) {
    ACTIVE_TA = null; EX_ED = null;
    v.innerHTML = `<div class="mhead"><div class="eyebrow">Docs</div><h1>Every table, column and keyword</h1><p class="lede">Tap anything to open it. "Try it" runs the example in the playground.</p>${docsTabs("docs")}</div><div class="docs-full">${refHTML(99, true)}</div>`;
    bindRef(v);
  }
  /* ---------- rank ladder ---------- */
  function viewRank(v) {
    const i = tierIdx(S.xp), total = DAYS.reduce((a, x) => a + x.xp, 0);
    v.innerHTML = `<div class="mhead"><div class="eyebrow">Your rep</div><h1>${esc(RANKS[i][1])}</h1>
      <p class="lede"><b>Rep</b> is the points you earn for finishing shifts. Harder shifts pay more rep. Rep moves you up the ladder from Fresh Laces to True Sneakerhead, and each tier unlocks a new shoe for your badge. You have <b>${S.xp}</b> of ${total} possible rep.</p></div>
      <ol class="ladder">${RANKS.map((r, k) => { const got = S.xp >= r[0]; return `<li class="rung ${got ? "got" : ""} ${k === i ? "cur" : ""}">
        <div class="rung-art">${tierShoe(k, "")}</div><div><span class="eyebrow">Tier ${k + 1} · ${r[0]} rep</span><h3>${esc(r[1])}</h3><p>${esc(r[5])}</p>
        ${k === i && RANKS[k + 1] ? `<div class="rbar big"><i style="width:${Math.round(tierPct(S.xp) * 100)}%"></i></div><p class="note">${RANKS[k + 1][0] - S.xp} rep to ${esc(RANKS[k + 1][1])}</p>` : got ? `<p class="note">${k === i ? "You're here." : "Unlocked ✓"}</p>` : `<p class="note">Locked</p>`}</div></li>`; }).join("")}</ol>
      <div class="row"><a class="btn primary" href="#d${nextDay()}">Earn rep: Day ${nextDay()} →</a></div>`;
  }
  function complete(x, tip) {
    if (!S.done[x.d]) {
      S.done[x.d] = true; save();
      const b = tierIdx(S.xp); S.xp += x.xp; save(); payday(x, tip);
      whenSQL(() => { marketTick(); const a = tierIdx(S.xp); if (a > b) setTimeout(() => levelUp(a), 600); setTimeout(eventPopup, a > b ? 900 : 1300); });
    } const nb = $("#nextBtn"); if (nb) { nb.classList.add("primary"); } }
  /* ---------- the animated storybook shift ---------- */
  const staffSVG = (name, cls = "") => cls === "big" ? `<img class="cut" src="${ART(name.toLowerCase())}" alt="${esc(name)}">` : `<img class="mike face ${cls}" src="${ART(FACES[name])}" alt="" width="256" height="256">`;
  function timeOfDay(t) { const m = String(t).match(/(\d+):\d+\s*(AM|PM)/i); if (!m) return "day"; let h = +m[1] % 12 + (/pm/i.test(m[2]) ? 12 : 0); return h < 11 ? "morning" : h < 17 ? "day" : "evening"; }
  /* a city block at street level with the Grail Room in the middle; lights blink, cars and clouds drift (CSS) */
  function citySVG(tod, sign = true) {
    const B = [[0, 150, 70], [64, 90, 60], [118, 200, 80], [190, 120, 54], [600, 170, 66], [660, 100, 70], [724, 210, 76]];
    let win = "", k = 0;
    B.forEach(([x, h, w]) => { for (let yy = 360 - h + 12; yy < 300; yy += 18) for (let xx = x + 8; xx < x + w - 8; xx += 14) win += `<rect class="win w${k++ % 5}" x="${xx}" y="${yy}" width="7" height="9" rx="1"/>`; });
    return `<svg class="city ${tod}" viewBox="0 0 800 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs><linearGradient id="sky-${tod}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sk1"/><stop offset="1" class="sk2"/></linearGradient></defs>
      <rect width="800" height="360" fill="url(#sky-${tod})"/>
      <circle class="sun" cx="660" cy="70" r="30"/>
      <g class="clouds"><ellipse cx="120" cy="60" rx="46" ry="12"/><ellipse cx="150" cy="52" rx="30" ry="12"/><ellipse cx="470" cy="40" rx="40" ry="10"/></g>
      <g class="far">${[[30, 120], [100, 170], [240, 140], [330, 190], [440, 150], [520, 200], [690, 160], [760, 130]].map(([x, h]) => `<rect x="${x}" y="${300 - h}" width="56" height="${h}"/>`).join("")}</g>
      <g class="bld">${B.map(([x, h, w]) => `<rect x="${x}" y="${360 - h - 60}" width="${w}" height="${h}"/>`).join("")}</g>
      <g class="wins">${win}</g>
      <g class="shop"><rect x="250" y="130" width="330" height="170" class="shop-wall"/><rect x="240" y="118" width="350" height="22" class="shop-roof"/>
        ${sign ? `<rect x="320" y="146" width="190" height="34" rx="6" class="sign"/><text x="415" y="170" text-anchor="middle" class="sign-t">GRAIL ROOM</text>` : ""}
        <rect x="270" y="196" width="120" height="104" class="glass"/><rect x="440" y="196" width="120" height="104" class="glass"/><rect x="395" y="200" width="40" height="100" class="door"/>
        ${[0, 1, 2].map(i => `<path class="shelf-shoe" d="M${284 + i * 34} ${246} q8 -10 22 -8 l6 6 h-30z"/>`).join("")}${[0, 1, 2].map(i => `<path class="shelf-shoe s2" d="M${454 + i * 34} ${266} q8 -10 22 -8 l6 6 h-30z"/>`).join("")}</g>
      <rect y="300" width="800" height="60" class="street"/><g class="lane">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${i * 110}" y="328" width="50" height="4"/>`).join("")}</g>
      <g class="car"><rect x="0" y="306" width="70" height="18" rx="6"/><rect x="14" y="296" width="40" height="14" rx="5"/><circle cx="16" cy="326" r="6" class="tire"/><circle cx="54" cy="326" r="6" class="tire"/></g>
    </svg>`;
  }
  const cityMini = () => `<img class="pop-bg" src="${ART("storefront")}" alt="">`;
  /* SQL, explained clause by clause in plain words */
  function splitTop(str, words) {
    const out = []; let depth = 0, q = null, last = 0, cur = null;
    const re = new RegExp("^(" + words.join("|") + ")\\b", "i");
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (q) { if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"') { q = ch; continue; }
      if (ch === "(") depth++; else if (ch === ")") depth--;
      else if (depth === 0 && (i === 0 || /[\s(,]/.test(str[i - 1]))) { const m = str.slice(i).match(re); if (m) { if (cur !== null || i > last) out.push([cur, str.slice(last, i).trim()]); cur = m[1].toUpperCase().replace(/\s+/g, " "); last = i + m[1].length; i += m[1].length - 1; } }
    }
    out.push([cur, str.slice(last).trim()]);
    return out.filter(([k, b]) => k || b);
  }
  const commaSplit = str => { const out = []; let depth = 0, q = null, last = 0; for (let i = 0; i < str.length; i++) { const ch = str[i]; if (q) { if (ch === q) q = null; continue; } if (ch === "'") q = ch; else if (ch === "(") depth++; else if (ch === ")") depth--; else if (ch === "," && !depth) { out.push(str.slice(last, i).trim()); last = i + 1; } } out.push(str.slice(last).trim()); return out.filter(Boolean); };
  const colWord = c => { c = c.trim(); const m = c.match(/^(\w+)\.(\w+)$/); return m ? `${m[2]} (from ${m[1]})` : c; };
  function exprWords(e) {
    e = e.trim(); let m;
    if (e === "*") return "every column";
    if ((m = e.match(/^ROUND\((.+),\s*(\d+)\)$/i))) return `${exprWords(m[1])}, rounded to ${m[2]} decimal place${m[2] === "1" ? "" : "s"}`;
    if ((m = e.match(/^ROUND\((.+)\)$/i))) return `${exprWords(m[1])}, rounded to a whole number`;
    if (/^COUNT\(\*\)$/i.test(e)) return "how many rows";
    if ((m = e.match(/^COUNT\(DISTINCT\s+(.+)\)$/i))) return `how many different ${colWord(m[1])} values`;
    if ((m = e.match(/^COUNT\((.+)\)$/i))) return `how many rows have a ${colWord(m[1])}`;
    if ((m = e.match(/^(AVG|SUM|MIN|MAX)\((.+)\)$/i))) return `the ${{ AVG: "average", SUM: "total", MIN: "smallest", MAX: "biggest" }[m[1].toUpperCase()]} ${exprWords(m[2])}`;
    if ((m = e.match(/^strftime\('([^']+)',\s*(.+)\)$/i))) return `the ${{ "%W": "week number", "%Y-W%W": "year and week", "%m": "month", "%Y": "year", "%Y-%m": "year and month", "%w": "day of the week (0 = Sunday)" }[m[1]] || "date piece " + m[1]} of ${colWord(m[2])}`;
    if (/^CASE\b/i.test(e)) return "a label made with CASE rules (WHEN this THEN that)";
    if (/OVER\s*\(/i.test(e)) return "a rank number (a window function looks across rows)";
    if ((m = e.match(/^date\('now'(?:,\s*'([^']+)')?\)$/i))) return m[1] ? `the date ${m[1].replace(/^\+/, "")} from today` : "today's date";
    if (/^\w+(\.\w+)?$/.test(e)) return colWord(e);
    if (/^'.*'$/.test(e)) return `the text ${e}`;
    if (/^-?\d+(\.\d+)?$/.test(e)) return `the number ${e}`;
    return `the math <code>${esc(e)}</code>`;
  }
  function condWords(c) {
    c = c.trim(); let m;
    const val = v => { v = v.trim(); let k; if ((k = v.match(/^date\('now'(?:,\s*'([^']+)')?\)$/i))) return k[1] ? `${k[1].replace(/^\+/, "")} from today` : "today"; return /^'.*'$/.test(v) ? `“${v.slice(1, -1)}”` : exprWords(v); };
    if ((m = c.match(/^(.+?)\s+BETWEEN\s+(.+?)\s+AND\s+(.+)$/i))) return `${exprWords(m[1])} is between ${val(m[2])} and ${val(m[3])} (both ends count)`;
    if ((m = c.match(/^(.+?)\s+IS\s+NOT\s+NULL$/i))) return `${exprWords(m[1])} is NOT blank`;
    if ((m = c.match(/^(.+?)\s+IS\s+NULL$/i))) return `${exprWords(m[1])} is blank (NULL: nothing written yet)`;
    if ((m = c.match(/^(.+?)\s+NOT\s+LIKE\s+'(.+)'$/i))) return `${exprWords(m[1])} does NOT match the pattern “${m[2]}”`;
    if ((m = c.match(/^(.+?)\s+LIKE\s+'%(.+)%'$/i))) return `${exprWords(m[1])} contains “${m[2]}” somewhere (% = anything)`;
    if ((m = c.match(/^(.+?)\s+LIKE\s+'(.+)%'$/i))) return `${exprWords(m[1])} starts with “${m[2]}”`;
    if ((m = c.match(/^(.+?)\s+LIKE\s+'%(.+)'$/i))) return `${exprWords(m[1])} ends with “${m[2]}”`;
    if ((m = c.match(/^(.+?)\s+IN\s*\((.+)\)$/i))) return `${exprWords(m[1])} is one of: ${m[2]}`;
    if ((m = c.match(/^(.+?)\s*(<=|>=|<>|!=|=|<|>)\s*(.+)$/))) return `${exprWords(m[1])} ${{ "=": "is", "<": "is less than", ">": "is more than", "<=": "is at most", ">=": "is at least", "!=": "is not", "<>": "is not" }[m[2]]} ${val(m[3])}`;
    return `<code>${esc(c)}</code>`;
  }
  function condList(c) { const safe = c.replace(/BETWEEN\s+(.+?)\s+AND\s+/gi, (mm, a) => `BETWEEN ${a} ⋀ `); return splitTop(safe, ["AND", "OR"]).map(([k, b]) => ({ k, t: condWords(b.replace(/⋀/g, "AND")) })); }
  function explainSQL(sql) {
    const clean = sql.split("\n").filter(l => !/^\s*--/.test(l)).join(" ").replace(/;\s*$/, "").replace(/\s+/g, " ").trim();
    const parts = splitTop(clean, ["WITH", "SELECT", "FROM", "LEFT JOIN", "JOIN", "ON", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT"]);
    return parts.map(([k, b]) => {
      let t;
      if (!k) t = "Setup.";
      else if (k === "WITH") { const m = b.match(/^(\w+)\s+AS/i); t = `First, build a temporary table called <b>${esc(m ? m[1] : "it")}</b> from the query in brackets. The rest of the query can use it like a real table.`; }
      else if (k === "SELECT") { const items = commaSplit(b.replace(/^DISTINCT\s+/i, "")); t = `${/^DISTINCT/i.test(b) ? "Show each different value once: " : "Show "}${items.map(it => { const m = it.match(/^(.+?)\s+AS\s+(\w+)$/i); return m ? `${exprWords(m[1])}, labeled <b>${esc(m[2])}</b>` : exprWords(it); }).join(" · ")}.`; }
      else if (k === "FROM") t = commaSplit(b).map(x => { const [tb, al] = x.split(/\s+/); return `Look in the <b>${esc(tb)}</b> table${al ? ` (nickname <b>${esc(al)}</b>, so you can type ${esc(al)}.column)` : ""}${TABLE_INFO[tb] ? `: ${TABLE_INFO[tb][0]} data` : ""}.`; }).join(" ");
      else if (/JOIN/.test(k)) { const [tb, al] = b.split(/\s+/); t = `Glue on the <b>${esc(tb)}</b> table${al ? ` (nickname <b>${esc(al)}</b>)` : ""}. Each row gets matched with its partner row.`; }
      else if (k === "ON") t = `Partners are rows where ${condList(b).map(x => x.t).join(" and ")}.`;
      else if (k === "WHERE") { const cs = condList(b); t = `Keep only the rows where ${cs.map((x, i) => (i ? `<b>${x.k}</b> ` : "") + x.t).join(" ")}. Everything else is skipped.`; }
      else if (k === "GROUP BY") t = `Make one pile for each different ${commaSplit(b).map(colWord).join(" + ")}. The counting and averaging in SELECT runs once per pile, so you get one row per pile.`;
      else if (k === "HAVING") t = `After piling, keep only piles where ${condList(b).map(x => x.t).join(" and ")}. (WHERE filters rows, HAVING filters piles.)`;
      else if (k === "ORDER BY") t = `Sort by ${commaSplit(b).map(it => { const m = it.match(/^(.+?)(?:\s+(ASC|DESC))?$/i); return `${exprWords(m[1])}, ${m[2] && /desc/i.test(m[2]) ? "biggest first (DESC)" : "smallest first"}`; }).join(", then ")}.`;
      else if (k === "LIMIT") t = `Keep only the first <b>${esc(b)}</b> row${b === "1" ? "" : "s"}.`;
      return { k: k || "", code: (k ? k + " " : "") + b, t };
    });
  }
  function breakdownHTML(sql) {
    return `<ol class="breakdown">${explainSQL(sql).map((st, i) => `<li style="--i:${i}"><span class="bd-n">${i + 1}</span><div><code class="bd-code"><span class="kw">${esc(st.k)}</span>${esc(st.code.slice(st.k.length))}</code><p>${st.t}</p></div></li>`).join("")}</ol>`;
  }

  /* animated explainer: run the query the way a database does (FROM → WHERE → GROUP → SELECT → ORDER → LIMIT), one frame per step */
  function explainerFrames(sql) {
    const clean = sql.split("\n").filter(l => !/^\s*--/.test(l)).join(" ").replace(/;\s*$/, "").replace(/\s+/g, " ").trim();
    const parts = splitTop(clean, ["WITH", "SELECT", "FROM", "LEFT JOIN", "JOIN", "ON", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT"]);
    if (parts.some(p => p[0] === "WITH") || !parts.some(p => p[0] === "FROM")) return [{ cap: "The whole query", q: clean }];
    const get = k => parts.filter(p => p[0] === k).map(p => p[0] + " " + p[1]).join(" ");
    const from = parts.filter(p => /FROM|JOIN|^ON$/.test(p[0] || "")).map(p => p[0] + " " + p[1]).join(" ");
    const W = get("WHERE"), G = get("GROUP BY"), H = get("HAVING"), O = get("ORDER BY"), L = get("LIMIT"), Sel = get("SELECT");
    const tables = parts.filter(p => /FROM|JOIN/.test(p[0] || "")).map(p => p[1].split(/[\s,]/)[0]);
    const fr = [{ cap: `Start with every row in ${tables.join(" + ")}${tables.length > 1 ? ", glued together" : ""}.`, q: `SELECT * ${from}` }];
    if (W) fr.push({ cap: "WHERE throws out rows that don't match.", q: `SELECT * ${from} ${W}` });
    if (G) fr.push({ cap: `GROUP BY squashes rows into piles, and SELECT does the math per pile${H ? ". HAVING drops small piles" : ""}.`, q: `${Sel} ${from} ${W} ${G} ${H}` });
    else fr.push({ cap: "SELECT keeps only the columns you asked for.", q: `${Sel} ${from} ${W}` });
    if (O) fr.push({ cap: "ORDER BY sorts what's left.", q: `${Sel} ${from} ${W} ${G} ${H} ${O}` });
    if (L) fr.push({ cap: "LIMIT keeps just the top rows. Done!", q: clean });
    return fr;
  }
  function explainer(host, sql) {
    const frames = explainerFrames(sql).map(f => { try { const r = run(f.q); return Object.assign(f, { r }); } catch (e) { return null; } }).filter(Boolean);
    if (!frames.length) return;
    host.insertAdjacentHTML("beforeend", `<div class="card explainer"><div class="ex-top"><h3>Animated explainer</h3><button type="button" class="btn primary small" data-play>▶ Play</button></div>
      <div class="ex-stage"><div class="ex-count"><b>—</b><span>rows</span></div><div class="ex-body"><p class="ex-cap">Press play to watch the database work through the query, step by step.</p><code class="ex-q"></code><div class="ex-table"></div></div></div>
      <div class="ex-steps">${frames.map((f, i) => `<button type="button" data-f="${i}" aria-label="Step ${i + 1}">${i + 1}</button>`).join("")}</div></div>`);
    const card = host.lastElementChild; let t = null, i = -1;
    const draw = k => {
      i = k; const f = frames[k], r = f.r, shown = { columns: r.columns, values: r.values.slice(0, 6) };
      card.querySelector(".ex-count b").textContent = r.values.length.toLocaleString();
      card.querySelector(".ex-cap").textContent = `Step ${k + 1}: ${f.cap}`;
      card.querySelector(".ex-q").textContent = f.q.replace(/\s+/g, " ").trim();
      const tb = card.querySelector(".ex-table"); tb.classList.remove("in"); void tb.offsetWidth;
      tb.innerHTML = tableHTML(shown).replace(/<div class="rescount">[^<]*<\/div>/, "") + (r.values.length > 6 ? `<p class="note">…and ${r.values.length - 6} more</p>` : ""); tb.classList.add("in");
      card.querySelector(".ex-count").classList.remove("pulse"); void card.offsetWidth; card.querySelector(".ex-count").classList.add("pulse");
      $$("[data-f]", card).forEach((b, j) => b.classList.toggle("on", j === k));
    };
    const stop = () => { clearInterval(t); t = null; card.querySelector("[data-play]").textContent = "▶ Replay"; };
    card.querySelector("[data-play]").addEventListener("click", () => { if (t) return stop(); draw(0); card.querySelector("[data-play]").textContent = "❚❚ Pause"; t = setInterval(() => { if (i >= frames.length - 1 || !document.body.contains(card)) return stop(); draw(i + 1); }, reduceMotion() ? 4000 : 2600); });
    $$("[data-f]", card).forEach(b => b.addEventListener("click", () => { if (t) stop(); draw(+b.dataset.f); }));
  }

  function viewDay(v, d) {
    const x = DAYS.find(y => y.d === d), w = WEEKS[x.w - 1];
    if (!unlocked(d)) { v.innerHTML = `<div class="mhead"><div class="eyebrow">Day ${d}</div><h1>Not your shift yet</h1><p class="lede">Finish Day ${d - 1} first. Every shift builds on the one before.</p><div class="row"><a class="btn primary" href="#d${nextDay()}">Go to Day ${nextDay()}</a></div></div>`; return; }
    const prev = DAYS.find(y => y.d === d - 1), nextD = DAYS.find(y => y.d === d + 1);
    const who = x.w >= 4 ? STORE.lead : STORE.manager, firstOfWeek = DAYS.find(y => y.w === x.w).d === d, tod = timeOfDay(x.time);
    const watchLabel = x.type === "quiz" ? "Quiz time" : x.type === "lab" ? "The lab" : x.type === "free" ? "Your call" : "Watch it work";
    const pages = [["scene", "The scene"], ["idea", "The big idea"], ["watch", watchLabel]].concat(x.type === "sql" || (!x.type && x.ch) ? [["turn", "Your turn"]] : []).concat(PYC[d] ? [["py", "Python corner"]] : []);
    v.innerHTML = `
      <div class="book" data-week="${w.n}">
        <div class="book-top"><a class="btn ghost small" href="#shifts">← Shifts</a><div class="eyebrow">Week ${w.n} · ${esc(w.name)} · Day ${d} of ${DAYS.length}${S.done[d] ? " · ✓ done" : ""}</div></div>
        <nav class="pager" aria-label="Pages">${pages.map(([id, l], i) => `<button type="button" data-pg="${i}"><span>${i + 1}</span>${esc(l)}</button>`).join("")}</nav>
        <div class="pages">
          <section class="page" data-id="scene">
            ${firstOfWeek ? `<div class="chapter" style="--chbg:url(${ART(w.n === 1 ? "skyline" : WEEK_BG[w.n])})"><span class="eyebrow">Chapter ${w.n}</span><h2>${esc(w.name)}</h2><p>${esc(heroize(w.story))}</p></div>` : ""}
            <div class="scene ${tod}">
              <img class="scene-bg" src="${ART(d === 1 ? "storefront" : WEEK_BG[w.n])}" alt="">
              <div class="caption">${esc(x.time)} · ${esc(w.name)}</div>
              <div class="cast"><div class="actor boss-a">${staffSVG(who, "big")}<span>${esc(who)}</span></div><div class="actor mike-a">${bigFace(x.type === "lab" || x.w >= 4 ? "think" : "talk", "hero-pop")}<span>${esc(STORE.heroShort)}</span></div></div>
            </div>
            <div class="talk">
              <div class="say-b boss-b" style="--i:0"><b>${esc(who)}</b><p>${esc(x.boss)}</p></div>
              ${MIKE[d] ? `<div class="say-b mike-b" style="--i:1"><b>${esc(STORE.heroShort)}</b><p>${esc(MIKE[d])}</p></div>` : ""}
            </div>
          </section>
          <section class="page" data-id="idea">
            <img class="idea-pic" src="${ART("bf-think")}" alt="">
            <span class="sticker-tag">The big idea</span>
            <h2 class="bigh">${esc(x.t)}</h2>
            <p class="say-xl">${esc(x.say)}</p>
            <div class="an big"><b>Like you're 10</b>${esc(x.an)}</div>
            ${x.deep ? `<div class="detail"><h3>The detail</h3><p>${esc(x.deep)}</p></div>` : ""}
            <div class="you"><h3>Why this matters to YOU</h3><p>${esc(WEEK_YOU[w.n])}</p></div>
            ${lookupHTML(d)}
          </section>
          <section class="page" data-id="watch"><div id="dbody" class="col-main"></div></section>
          ${pages.some(p => p[0] === "turn") ? `<section class="page" data-id="turn"><div id="tbody" class="col-main"></div></section>` : ""}
          ${PYC[d] ? `<section class="page" data-id="py"><div id="pbody" class="col-main"></div></section>` : ""}
        </div>
        <div class="book-nav"><button type="button" class="btn ghost" id="pgBack">← Back</button><span class="mono" id="pgN"></span><button type="button" class="btn primary big" id="pgNext">Next page →</button></div>
        <div class="row shift-nav"><a class="btn ghost" href="#${prev ? "d" + prev.d : "shifts"}">← ${prev ? "Day " + prev.d : "All shifts"}</a>${nextD ? `<a class="btn" href="#d${nextD.d}" id="nextBtn">Day ${nextD.d} →</a>` : `<a class="btn" href="#shifts" id="nextBtn">All shifts</a>`}
          ${x.kit || x.w >= 4 ? `<button type="button" class="btn ghost" id="kitBtn">Notebook kit (.zip)</button>` : ""}<button type="button" class="btn ghost" id="askBtn">✦ Ask Claude</button></div>
      </div>`;
    const kb = $("#kitBtn", v); if (kb) kb.addEventListener("click", e => downloadKit(e.target));
    $("#askBtn", v).addEventListener("click", () => popup(`<div class="eyebrow">Ask Claude</div><h2>Stuck or curious?</h2><p>Ask anything about today's shift.</p><div id="askHost"></div><div class="row"><button type="button" class="btn ghost" data-close>Close</button></div>`, dl => {
      aiBox($("#askHost", dl), { id: "aiQ" + d, label: "Ask", input: "e.g. why do dates need quotes?", prompt: q => { if (!q) throw new Error("Type a question first."); return `Today's shift: "${x.t}". Idea: ${x.say} ${x.deep || ""}\nLearner asks: ${q}`; } });
      if (!SAMPLE) $("#askHost", dl).insertAdjacentHTML("beforeend", `<p class="note">AI help isn't available in this view.</p>`);
    }));
    ACTIVE_TA = null; EX_ED = null;
    /* pager */
    let pg = 0; const secs = $$(".page", v), tabs = $$("[data-pg]", v);
    const show = (k, focus) => {
      pg = Math.max(0, Math.min(secs.length - 1, k));
      secs.forEach((s2, i) => { s2.hidden = i !== pg; s2.classList.toggle("enter", i === pg); });
      tabs.forEach((t, i) => { t.classList.toggle("on", i === pg); t.classList.toggle("seen", i < pg); t.setAttribute("aria-current", i === pg ? "step" : "false"); });
      $("#pgN", v).textContent = `Page ${pg + 1} of ${secs.length}`;
      $("#pgBack", v).disabled = pg === 0;
      const nb = $("#pgNext", v); nb.textContent = pg < secs.length - 1 ? `Next: ${pages[pg + 1][1]} →` : nextD ? `Day ${nextD.d} →` : "All shifts →";
      if (focus) $(".book", v).scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
      void secs[pg].offsetWidth;
    };
    tabs.forEach(t => t.addEventListener("click", () => show(+t.dataset.pg, true)));
    $("#pgBack", v).addEventListener("click", () => show(pg - 1, true));
    $("#pgNext", v).addEventListener("click", () => { if (pg < secs.length - 1) show(pg + 1, true); else go(nextD ? "d" + nextD.d : "shifts"); });
    v.addEventListener("keydown", e => { if (/TEXTAREA|INPUT/.test(e.target.tagName)) return; if (e.key === "ArrowRight") show(pg + 1, true); if (e.key === "ArrowLeft") show(pg - 1, true); });
    show(0);
    const body = $("#dbody", v);
    peek(body, tablesFor(x));
    if (PYC[d]) whenSQL(() => pyCorner($("#pbody", v), x));
    if (x.type === "quiz") return quizDay(body, x);
    if (x.type === "free") return freeDay(body, x);
    if (x.type === "lab") return labDay(body, x);
    sqlDay(body, $("#tbody", v), x, v);
  }
  function sqlDay(body, tbody, x, v) {
    const d = x.d, c = x.ch;
    body.insertAdjacentHTML("beforeend", `<div class="card watch"><h3>${d === 27 ? "The AI's draft, line by line" : "The example, line by line"}</h3>
      <p class="say-l">${d === 27 ? "Here's what the AI wrote. Read what each line asks for, then run it and check." : "Read it top to bottom. Each line is one instruction to the database."}</p>${breakdownHTML(x.ex)}</div><div id="exAnim"></div>
      <div class="card"><h3>Now run it yourself</h3><p class="note">Press Run. Then change something (a number, a word, DESC) and run it again to see what happens.</p><div id="exHost"></div></div>`);
    whenSQL(() => explainer($("#exAnim", v), x.ex));
    EX_ED = editor($("#exHost", v), { id: "ex" + d, title: d === 27 ? "AI draft · run it" : "example · edit me", value: x.ex, rows: Math.min(8, x.ex.split("\n").length + 1) });
    const mode = x.w === 1 ? "fill" : x.w <= 3 ? "skeleton" : "blank";
    const starter = S.code[d] || (mode === "blank" ? `-- ${c.q}\n` : c.starter[mode]);
    const who = x.w >= 4 ? STORE.lead : STORE.manager;
    tbody.insertAdjacentHTML("beforeend", `<div class="turn-head">${staffSVG(who, "mid")}<div class="say-b boss-b"><b>${esc(who)}</b><p>${esc(c.q)}</p></div></div>
      <div class="card challenge"><h3>Your job</h3><p class="note">${mode === "fill" ? "Replace each ___ with the right word, then press Check." : mode === "skeleton" ? "Fill in the ___ parts, then press Check." : "Write it from scratch. Stuck? Press Head start."} Get it on the first try: +$${WALLET.firstTryTip} tip.</p>
      <div id="chHost"></div><div class="hints" id="hints"></div></div>`);
    let tries = 0;
    const ed = editor($("#chHost", v), { id: "ch" + d, title: "your answer", value: starter, rows: Math.min(14, Math.max(4, starter.split("\n").length + 1)),
      extra: `<button type="button" class="btn small" data-check>Check ✓</button><button type="button" class="btn small" data-hint>Hint</button>${mode === "blank" ? `<button type="button" class="btn small" data-head>Head start</button>` : ""}`,
      onInput: val => { S.code[d] = val; save(); } });
    ACTIVE_TA = ed.ta;
    const showHints = () => { const n = Math.min(S.hints[d] || 0, c.hints.length); $("#hints", v).innerHTML = c.hints.slice(0, n).map((h, i) => `<div class="hint"><b>Hint ${i + 1}:</b> ${esc(h)}</div>`).join(""); };
    showHints();
    ed.term.querySelector("[data-hint]").addEventListener("click", () => {
      const used = S.hints[d] || 0;
      if (used >= c.hints.length) return toast("That's every hint.");
      if (used === c.hints.length - 1 && tries < 2) return toast(`Try ${2 - tries} more time${2 - tries === 1 ? "" : "s"} to unlock the last hint.`);
      S.hints[d] = used + 1; save(); showHints();
    });
    const hs = ed.term.querySelector("[data-head]");
    if (hs) hs.addEventListener("click", () => { ed.ta.value = c.starter.skeleton; S.code[d] = ed.ta.value; save(); toast("Skeleton loaded. Fill in the ___ parts."); });
    ed.term.querySelector("[data-check]").addEventListener("click", () => {
      const q = ed.ta.value.trim(); ed.out.innerHTML = "";
      if (!q || /___/.test(q)) { ed.out.innerHTML = `<div class="msg info">${q ? "Fill in every ___ first." : "Write your answer first."}</div>`; return; }
      let u, s2;
      try { u = run(q); } catch (e) { tries++; ed.out.innerHTML = `<div class="msg err">${esc(friendly(e.message))}</div>`; aiFix(ed.out, q, e.message); return; }
      try { s2 = run(c.sol); } catch (e) { ed.out.innerHTML = `<div class="msg err">The answer key failed to run: ${esc(e.message)}</div>`; return; }
      const verdict = sameResult(u, s2, c.order);
      ed.out.innerHTML = (verdict.ok ? `<div class="msg ok win-burst"><img class="win-pic" src="${ART("bf-cheer")}" alt="">${esc(who)}: "Nailed it." ${S.done[d] ? "(already done)" : `+${x.xp} rep · +${money(Math.round(x.xp * WALLET.wageRate))} wages${tries === 0 ? ` · +${money(WALLET.firstTryTip)} first-try tip` : ""}`}</div><div class="breakdown-wrap"><h4 class="sub">What your query did</h4>${breakdownHTML(q)}</div>` : `<div class="msg err plain">${esc(verdict.why)}</div>`) + tableHTML(u);
      if (verdict.ok) complete(x, tries === 0 ? WALLET.firstTryTip : 0); else { tries++; aiFix(ed.out, q, verdict.why); }
    });
    if (x.py) tbody.insertAdjacentHTML("beforeend", `<details class="py" open><summary>Same job in Python (pandas)</summary><pre>${esc(x.py)}</pre><p class="note">SQL asks the database; pandas does the same thing to a table inside Python. Run it for real in the notebook kit (Google Colab, free).</p></details>`);
  }
  /* ---------- Python: a tiny in-page Python (MiniPy) + the store's tables as Python data ---------- */
  const PY_TIPS = {
    NameError: "Python doesn't know that name yet. Check the spelling (capitals count) and make sure you set it with = on an earlier line. Text needs \"quotes\".",
    SyntaxError: "Python couldn't read this line. Look for a missing colon : after if/for/def/while, a missing bracket, or an unclosed quote.",
    IndentationError: "The spaces at the start of a line don't line up. Lines inside an if/for/def need the same indent (4 spaces).",
    TypeError: "Two things that don't mix, like adding text to a number. Use str(x) to turn a number into text, or an f-string.",
    IndexError: "That position doesn't exist. Lists start at 0, so a list of 3 items has positions 0, 1 and 2.",
    KeyError: "That key isn't in the dict. Check the spelling, or use .get(\"key\", default).",
    ZeroDivisionError: "You can't divide by zero. Check the list isn't empty before dividing by len().",
    ValueError: "The value doesn't fit what the function wanted, like int(\"abc\").",
    AttributeError: "That thing doesn't have that method. Check the spelling, and what type it is (list, str, dict).",
    TimeoutError: "The code ran too long. In a while loop, make sure something changes so the test can become False.",
    ModuleNotFoundError: "This playground has math, statistics, datetime and random. pandas and friends run in the Colab notebook kit."
  };
  let PYDATA = null;
  function pyData() {
    if (PYDATA) return PYDATA;
    const g = {};
    if (DB) for (const t of ["releases", "shoes", "sales"]) { try { const r = run(`SELECT * FROM ${t}`); g[t] = MiniPy.toPy(r.values.map(row => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])))); } catch (e) { g[t] = []; } }
    if (DB) PYDATA = g; return g;
  }
  function pyRun(code, withData) {
    const r = MiniPy.run(code, { globals: withData ? pyData() : {} });
    return r;
  }
  function pyOutHTML(r) {
    const out = r.out ? `<pre class="pyout">${esc(r.out.replace(/\n$/, ""))}</pre>` : "";
    if (r.ok) return out || `<div class="msg info">Ran fine, but nothing printed. Use print() to see a value.</div>`;
    const kind = r.error.split(":")[0];
    return out + `<div class="msg err plain"><b>Line ${r.line}: ${esc(r.error)}</b><br>${esc(PY_TIPS[kind] || "Read the message: it names the problem and the line.")}</div>`;
  }
  function pyEditor(host, opts) {
    host.insertAdjacentHTML("beforeend", `<div class="term py-term">
      <div class="term-h"><span>🐍 ${esc(opts.title || "python")}</span><span class="kbd">Ctrl/⌘ + Enter runs</span></div>
      <label class="sr" for="${opts.id}">Python editor</label>
      <textarea class="sql" id="${opts.id}" rows="${opts.rows || 8}" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(opts.value || "")}</textarea>
      <div class="term-f"><button type="button" class="btn primary small" data-run>Run ▶</button>${opts.extra || ""}<span class="kbd">Tab = 4 spaces</span></div>
    </div><div class="out"></div>`);
    const out = host.lastElementChild, term = out.previousElementSibling, ta = term.querySelector("textarea");
    const exec = () => { const code = ta.value; if (!code.trim()) { out.innerHTML = `<div class="msg info">Type some Python first.</div>`; return; }
      const r = pyRun(code, opts.data); out.innerHTML = pyOutHTML(r); opts.onResult && opts.onResult(r, code); };
    term.querySelector("[data-run]").addEventListener("click", exec);
    ta.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); exec(); }
      if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); ta.setRangeText("    ", ta.selectionStart, ta.selectionEnd, "end"); }
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) { const before = ta.value.slice(0, ta.selectionStart), line = before.slice(before.lastIndexOf("\n") + 1);
        let ind = line.match(/^ */)[0]; if (/:\s*$/.test(line)) ind += "    "; if (ind) { e.preventDefault(); ta.setRangeText("\n" + ind, ta.selectionStart, ta.selectionEnd, "end"); } }
    });
    if (opts.onInput) ta.addEventListener("input", () => opts.onInput(ta.value));
    return { ta, out, exec, term };
  }
  let pySeed = null;
  function openInPy(code) { pySeed = code; S.playMode = "py"; save(); go("play"); }

  /* Learn it first: a real mini-lesson before each Python corner puzzle */
  function pyLessonHTML(d, open) {
    const L = (typeof PYLEARN !== "undefined") && PYLEARN[d]; if (!L) return "";
    const lines = L.ex.split("\n");
    return `<details class="card pylearn" ${open ? "open" : ""}><summary><span class="chip-k">Learn it first</span> <b>${esc(PYC[d].topic)}</b><span class="note">${open ? "" : " · tap to review"}</span></summary>
      ${L.say.map(t => `<p>${esc(t)}</p>`).join("")}
      ${L.words.length ? `<div class="pywords">${L.words.map(w => `<span class="pill">${esc(w)}</span>`).join("")}</div>` : ""}
      <h4 class="sub">Worked example: read each line, then run it</h4>
      <div class="anno" style="--cw:${Math.max(...lines.map(l => l.length))}ch">${lines.map((ln, i) => `<div class="anno-r"><code class="anno-c">${esc(ln) || "&nbsp;"}</code><span class="anno-n">${esc(L.notes[i] || "")}</span></div>`).join("")}</div>
      <div class="row"><button type="button" class="btn small primary" data-pyrun>Run the example ▶</button><button type="button" class="btn small ghost" data-pyplay>Edit it in the Python playground</button></div>
      <div data-pyout></div>
      <p class="pykey"><b>Remember:</b> ${esc(L.key)}</p></details>`;
  }
  function bindPyLesson(el, d) {
    const L = PYLEARN[d]; if (!L || !el) return;
    el.querySelector("[data-pyrun]").addEventListener("click", () => { el.querySelector("[data-pyout]").innerHTML = `<div class="pyout-h">Output</div>` + pyOutHTML(pyRun(L.ex)); });
    el.querySelector("[data-pyplay]").addEventListener("click", () => openInPy(L.ex));
  }
  /* Python corner: lesson first, then one predict-the-output puzzle per shift, +$5 on the first try */
  function pyCorner(body, x) {
    const pc = PYC[x.d]; if (!pc) return;
    const done = S.pyc[x.d], order = shuffle(pc.o.map((t, k) => ({ t, ok: k === 0 })));
    const runnable = !/import pandas/.test(pc.code);
    body.insertAdjacentHTML("beforeend", `<section class="pyblock"><h3 class="sub">Python corner</h3>${pyLessonHTML(x.d, !done)}<div class="card pyc"><h3>Your turn · ${esc(pc.topic)}</h3><p class="note">Use what the lesson just showed you. Read the code line by line, then pick the output.</p><pre class="snip py-code">${esc(pc.code)}</pre><p class="q">${esc(pc.q)}</p>
      <div class="qz"><div class="item ${done ? "right" : ""}"><div class="opts">${order.map(o => `<button type="button" class="opt mono" data-ok="${o.ok ? 1 : 0}" ${done ? "disabled" : ""}>${esc(o.t)}</button>`).join("")}</div><p class="why" ${done ? "" : "hidden"}>${esc(pc.w)}</p></div></div>
      <div class="row" data-after ${done ? "" : "hidden"}>${runnable ? `<button type="button" class="btn small" data-chk>Run it to check ▶</button><button type="button" class="btn small ghost" data-tweak>Tweak it in the playground</button>` : `<span class="note">pandas runs in the Colab notebook kit, not in this page.</span>`}</div><div data-chkout></div>
      <p class="note">${done ? "Solved ✓" : `Get it on the first try: +$5 for ${esc(STORE.heroShort)}'s grail jar.`}</p></div></section>`);
    const sec = body.lastElementChild, card = sec.querySelector(".pyc"); let miss = 0;
    bindPyLesson(sec.querySelector(".pylearn"), x.d);
    const after = card.querySelector("[data-after]");
    if (runnable) { after.querySelector("[data-chk]").addEventListener("click", () => { card.querySelector("[data-chkout]").innerHTML = `<div class="pyout-h">Real output</div>` + pyOutHTML(pyRun(pc.code)); });
      after.querySelector("[data-tweak]").addEventListener("click", () => openInPy(pc.code)); }
    $$(".opt", card).forEach(b => b.addEventListener("click", () => {
      if (b.dataset.ok === "1") { b.classList.add("right"); $$(".opt", card).forEach(o => (o.disabled = true)); card.querySelector(".item").classList.add("right"); card.querySelector(".why").hidden = false; after.hidden = false;
        if (!S.pyc[x.d]) { S.pyc[x.d] = true; if (!miss) { S.cash += 5; toast("Python corner: +$5"); } save(); renderMe(); } }
      else { miss++; b.classList.add("wrong"); b.disabled = true;
        if (miss === 1) { const lz = sec.querySelector(".pylearn"); if (lz && !lz.open) { lz.open = true; } toast("Not quite. Peek back at the lesson above."); } }
    }));
  }
  function aiFix(host, q, why) { aiBox(host, { label: "Explain what went wrong", prompt: () => `The learner's SQL:\n${q}\nProblem: ${why}\nExplain the mistake gently and give ONE hint toward the fix. Don't give the full answer.` }); }
  function quizDay(body, x) {
    S.quiz[x.d] = S.quiz[x.d] || {};
    if (x.kit) body.insertAdjacentHTML("beforeend", `<div class="card"><h3>Step 1 · Open the notebook</h3><ol class="steps"><li><div>Download the kit and unzip it.</div></li><li><div>Go to <a href="https://colab.research.google.com" target="_blank" rel="noopener">colab.research.google.com ↗</a> → File → Upload notebook → <code>03_clean_and_chart.ipynb</code>.</div></li><li><div>Drag the three .csv files into Colab's Files panel, then run each cell (Shift+Enter).</div></li></ol><div class="row"><button type="button" class="btn primary small" id="kit2">Download the kit (.zip)</button></div></div><h3 class="sub">Step 2 · Tell Theo what you learned</h3>`);
    const k2 = $("#kit2", body); if (k2) k2.addEventListener("click", e => downloadKit(e.target));
    body.insertAdjacentHTML("beforeend", `<div class="qz">${x.quiz.map((q, i) => {
      const order = shuffle(q.o.map((t, k) => ({ t, ok: k === 0 })));
      return `<div class="item ${S.quiz[x.d][i] ? "right" : ""}" data-i="${i}"><b>${i + 1}. ${esc(q.q)}</b>${q.code ? `<pre class="snip">${esc(q.code)}</pre>` : ""}<div class="opts">${order.map(o => `<button type="button" class="opt" data-ok="${o.ok ? 1 : 0}">${esc(o.t)}</button>`).join("")}</div><p class="why" ${S.quiz[x.d][i] ? "" : "hidden"}>${esc(q.w)}</p></div>`;
    }).join("")}</div>`);
    $$(".qz .item", body).forEach(item => $$(".opt", item).forEach(b => b.addEventListener("click", () => {
      const i = +item.dataset.i;
      if (b.dataset.ok === "1") { b.classList.add("right"); item.classList.add("right"); $$(".opt", item).forEach(o => (o.disabled = true)); item.querySelector(".why").hidden = false; S.quiz[x.d][i] = true; save(); if (x.quiz.every((_, k) => S.quiz[x.d][k])) complete(x); }
      else { b.classList.add("wrong"); b.disabled = true; }
    })));
  }
  function freeDay(body, x) {
    body.insertAdjacentHTML("beforeend", `<div class="card"><h3>1 · Your query</h3><div id="frHost"></div></div>
      <div class="card"><h3>2 · Your finding</h3><label for="finding" class="sr">Your finding</label>
        <textarea id="finding" rows="4" class="ai-in" placeholder="In one or two sentences: what did you find, using which data, for which dates? Example: In the practice sales log (Aug–Oct 2026), size 13+ pairs sold for about 8% more on average…">${esc(S.code["f" + x.d] || "")}</textarea>
        <div class="row"><button type="button" class="btn primary" id="finish">Hand it to Rae</button></div><div id="frAI"></div></div>`);
    let lastQ = "";
    EX_ED = editor($("#frHost"), { id: "fr" + x.d, title: "capstone", value: S.code[x.d] || x.ex, rows: 9, onInput: val => { S.code[x.d] = val; save(); }, onResult: (r, q) => { lastQ = q; } });
    ACTIVE_TA = EX_ED.ta;
    $("#finding").addEventListener("input", e => { S.code["f" + x.d] = e.target.value; save(); });
    $("#finish").addEventListener("click", () => {
      const f = $("#finding").value.trim();
      if (!lastQ || f.length < 25) return toast("Run your query and write at least a sentence first.");
      if (!/20\d\d|nov|dec|aug|sep|oct|week|month|day/i.test(f)) return toast("Say which time period your finding covers.");
      complete(x); toast("Rae: \"Store Legend. Welcome to the team.\"");
    });
    aiBox($("#frAI"), { label: "Get feedback first", prompt: () => { if (!lastQ) throw new Error("Run your query first."); return `Review this capstone. Query:\n${lastQ}\nFinding: ${$("#finding").value.trim() || "(none yet)"}\nGive one thing done well, one improvement (time period stated? real vs practice data named? correct conclusion?), and one follow-up question.`; } });
  }

  /* ---------- ML labs (the models train right here, in your browser) ---------- */
  function labDay(body, x) {
    S.labs[x.lab] = S.labs[x.lab] || {};
    body.insertAdjacentHTML("beforeend", `<div class="card lab"><h3>Lab · runs in your browser</h3><div id="labHost"><p class="note">Loading the store's data…</p></div></div>
      <div class="card"><h3>Check-in</h3><div id="labCheck"></div></div>`);
    whenSQL(() => ({ gd: labGD, tree: labTree, kmeans: labKMeans })[x.lab]($("#labHost", body), x));
    const cq = x.check, order = shuffle(cq.o.map((t, k) => ({ t, ok: k === 0 }))), host = $("#labCheck", body);
    host.innerHTML = `<div class="qz"><div class="item ${S.labs[x.lab].q ? "right" : ""}"><b>${esc(cq.q)}</b><div class="opts">${order.map(o => `<button type="button" class="opt" data-ok="${o.ok ? 1 : 0}">${esc(o.t)}</button>`).join("")}</div><p class="why" ${S.labs[x.lab].q ? "" : "hidden"}>${esc(cq.w)}</p></div></div><p class="note" id="labNeed"></p>`;
    $$(".opt", host).forEach(b => b.addEventListener("click", () => {
      if (b.dataset.ok === "1") { b.classList.add("right"); host.querySelector(".item").classList.add("right"); $$(".opt", host).forEach(o => (o.disabled = true)); host.querySelector(".why").hidden = false; S.labs[x.lab].q = true; save(); labMaybeDone(x); }
      else { b.classList.add("wrong"); b.disabled = true; }
    }));
    labMaybeDone(x);
  }
  const LAB_NEEDS = { gd: ["ok", "boom"], tree: ["depths"], kmeans: ["ran"] };
  const LAB_TEXT = { ok: "train with 'just right' until the loss settles", boom: "try 'too big' once", depths: "compare at least 3 tree depths", ran: "run k-means to the end at least once" };
  function labMaybeDone(x) {
    const st = S.labs[x.lab], miss = LAB_NEEDS[x.lab].filter(k => !st[k]);
    const need = $("#labNeed"); if (need) need.textContent = miss.length || !st.q ? `To finish: ${[...miss.map(k => LAB_TEXT[k]), ...(st.q ? [] : ["answer the check-in"])].join(", ")}.` : "Lab complete.";
    if (!miss.length && st.q) complete(x);
  }

  /* gradient descent on premium% vs hype (hype centered = feature scaling) */
  function labGD(host, x) {
    const r = run("SELECT sh.hype, 100.0 * (AVG(s.price_usd) - sh.retail_usd) / sh.retail_usd FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id GROUP BY sh.shoe_id");
    const P = r.values.map(v => ({ x: v[0], y: v[1] })), n = P.length, mx = P.reduce((a, p) => a + p.x, 0) / n, my = P.reduce((a, p) => a + p.y, 0) / n;
    const best = P.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / P.reduce((a, p) => a + (p.x - mx) ** 2, 0);
    const RATES = [["slow", 0.005, "Slow"], ["ok", 0.05, "Just right"], ["boom", 0.2, "Too big"]];
    let m = 0, b = 0, rate = "ok", losses = [], steps = 0, anim = null;
    const loss = () => P.reduce((a, p) => a + (b + m * (p.x - mx) - p.y) ** 2, 0) / n;
    host.innerHTML = `<p>Each dot is one shoe from the practice sales log (Aug–Oct 2026): its hype score and how far above retail it sold, on average. The model starts with a flat line and learns.</p>
      <div class="seg" role="group" aria-label="Learning rate">${RATES.map(([k, , l]) => `<button type="button" data-rate="${k}" class="${k === rate ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="row"><button type="button" class="btn primary small" id="g1">Train 1 step</button><button type="button" class="btn small" id="g100">Train 100 steps</button><button type="button" class="btn ghost small" id="g0">Reset</button></div>
      <div class="labgrid"><div class="chart" id="gPlot"></div><div class="chart" id="gLoss"></div></div>
      <div class="stats" id="gStats"></div>`;
    const draw = () => {
      const exploded = !Number.isFinite(loss()) || loss() > 1e7;
      $("#gPlot", host).innerHTML = scatterSVG(P.map(p => ({ x: p.x, y: p.y, c: 0 })), { xl: "hype (1–10)", yl: "premium % over retail", line: exploded ? null : [m, b - m * mx], label: "Shoes and the model's line", yr: [Math.min(...P.map(p => p.y)) - 10, Math.max(...P.map(p => p.y)) + 10] });
      $("#gLoss", host).innerHTML = losses.length ? lineSVG(losses.map(l => Math.min(l, 1e7)), { xl: `loss (how wrong) over ${steps} steps`, label: "Loss curve" }) : `<p class="note">The loss curve appears when you train.</p>`;
      $("#gStats", host).innerHTML = exploded ? `<div class="msg err plain">💥 Exploded! Each step overshot the bottom and the numbers ran away. That's a learning rate that's too big. Press Reset.</div>`
        : `<span>steps <b>${steps}</b></span><span>slope <b>${m.toFixed(2)}</b></span><span>intercept <b>${(b - m * mx).toFixed(1)}</b></span><span>loss <b>${Math.round(loss())}</b></span><span>formula answer (Day 23): slope <b>${best.toFixed(1)}</b></span>`;
      if (!exploded && rate === "ok" && Math.abs(m - best) < 0.1 && !S.labs.gd.ok) { S.labs.gd.ok = true; save(); toast("Converged! The model found the same slope as the formula."); labMaybeDone(x); }
      if (exploded && !S.labs.gd.boom) { S.labs.gd.boom = true; save(); labMaybeDone(x); }
    };
    const step = () => {
      const lr = RATES.find(q => q[0] === rate)[1]; let gm = 0, gb = 0;
      P.forEach(p => { const e = b + m * (p.x - mx) - p.y; gm += 2 * e * (p.x - mx) / n; gb += 2 * e / n; });
      m -= lr * gm; b -= lr * gb; steps++; losses.push(loss());
    };
    const stopAnim = () => { if (anim) { clearInterval(anim); anim = null; } };
    $("#g1", host).addEventListener("click", () => { stopAnim(); step(); draw(); });
    $("#g100", host).addEventListener("click", () => {
      stopAnim(); let k = 0;
      if (reduceMotion()) { for (; k < 100; k++) step(); draw(); return; }
      anim = setInterval(() => { for (let j = 0; j < 4 && k < 100; j++, k++) step(); draw(); if (k >= 100 || !Number.isFinite(loss()) || loss() > 1e7) stopAnim(); }, 30);
    });
    $("#g0", host).addEventListener("click", () => { stopAnim(); m = 0; b = 0; losses = []; steps = 0; draw(); });
    $$("[data-rate]", host).forEach(btn => btn.addEventListener("click", () => { rate = btn.dataset.rate; $$("[data-rate]", host).forEach(z => z.classList.toggle("on", z === btn)); stopAnim(); m = 0; b = 0; losses = []; steps = 0; draw(); }));
    draw();
  }

  /* decision tree (CART, gini) predicting HEAT = sold for 20%+ over retail */
  const FEATS = [["hype", "hype"], ["pairs_made", "pairs made"], ["retail_usd", "retail $"], ["size_us", "size"], ["weeks_out", "weeks since release"], ["used", "used (1) or new (0)"]];
  function heatRows() {
    const r = run("SELECT sh.hype, sh.pairs_made, sh.retail_usd, s.size_us, (julianday(s.sale_date) - julianday(sh.release_date)) / 7.0, CASE WHEN s.condition = 'used' THEN 1 ELSE 0 END, CASE WHEN s.price_usd >= 1.2 * sh.retail_usd THEN 1 ELSE 0 END FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id ORDER BY s.sale_id");
    return r.values.map(v => ({ f: v.slice(0, 6), y: v[6] }));
  }
  function splitRows(rows) { const rnd = mulberry32(7), idx = rows.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } const cut = Math.round(rows.length * 0.8); return { train: idx.slice(0, cut).map(i => rows[i]), test: idx.slice(cut).map(i => rows[i]) }; }
  function gini(rows) { if (!rows.length) return 0; const p = rows.reduce((a, r) => a + r.y, 0) / rows.length; return 2 * p * (1 - p); }
  function buildTree(rows, depth, maxD) {
    const pos = rows.reduce((a, r) => a + r.y, 0), node = { n: rows.length, pos, pred: pos * 2 >= rows.length ? 1 : 0 };
    if (depth >= maxD || rows.length < 10 || pos === 0 || pos === rows.length) return node;
    let bestS = null, bestG = gini(rows) - 1e-9;
    for (let f = 0; f < FEATS.length; f++) {
      const vals = [...new Set(rows.map(r => r.f[f]))].sort((a, b) => a - b);
      let cands = vals.slice(0, -1).map((v, i) => (v + vals[i + 1]) / 2);
      if (cands.length > 24) cands = cands.filter((_, i) => i % Math.ceil(cands.length / 24) === 0);
      for (const t of cands) {
        const L = rows.filter(r => r.f[f] <= t), R = rows.filter(r => r.f[f] > t);
        if (L.length < 5 || R.length < 5) continue;
        const g = (L.length * gini(L) + R.length * gini(R)) / rows.length;
        if (g < bestG) { bestG = g; bestS = { f, t, L, R }; }
      }
    }
    if (!bestS) return node;
    return Object.assign(node, { f: bestS.f, t: bestS.t, left: buildTree(bestS.L, depth + 1, maxD), right: buildTree(bestS.R, depth + 1, maxD) });
  }
  const predict = (node, f) => (node.left ? predict(f[node.f] <= node.t ? node.left : node.right, f) : node.pred);
  const acc = (tree, rows) => rows.reduce((a, r) => a + (predict(tree, r.f) === r.y ? 1 : 0), 0) / rows.length;
  function treeText(node, ind = "") {
    if (!node.left) return `${ind}→ ${node.pred ? "HEAT" : "NOT heat"}  (${node.pos}/${node.n} were heat)\n`;
    const nm = FEATS[node.f][1], t = Math.round(node.t * 100) / 100;
    return `${ind}Is ${nm} ≤ ${t}?\n${ind}  yes: \n${treeText(node.left, ind + "    ")}${ind}  no:\n${treeText(node.right, ind + "    ")}`;
  }
  function labTree(host, x) {
    const rows = heatRows(), { train, test } = splitRows(rows), base = test.filter(r => r.y === 0).length / test.length;
    const results = {}; let depth = 3;
    const get = dd => (results[dd] = results[dd] || (() => { const t = buildTree(train, 0, dd); return { t, tr: acc(t, train), te: acc(t, test) }; })());
    host.innerHTML = `<p><b>${rows.length.toLocaleString()}</b> sales from the practice log. Training set: <b>${train.length}</b> (80%). Test set: <b>${test.length}</b> (20%), hidden from the model. ${Math.round((1 - base) * 100)}% of test sales were HEAT, so always guessing "NOT heat" scores <b>${Math.round(base * 100)}%</b>. Beat that.</p>
      <label class="slider" for="depth">Tree depth (how many questions it can ask): <b id="depthV">${depth}</b></label><input type="range" id="depth" min="1" max="10" value="${depth}">
      <div class="labgrid"><div><div class="stats" id="tStats"></div><div class="chart" id="tChart"></div></div><div><h4 class="sub">What the tree learned</h4><pre class="rules" id="tRules"></pre></div></div>
      <div class="card inner"><h4 class="sub">Try a pair at the counter</h4><div class="form" id="tForm">${FEATS.map(([k, l], i) => `<label>${esc(l)}<input type="number" step="any" id="tf${i}" value="${[7, 15000, 150, 10, 4, 0][i]}"></label>`).join("")}</div><div class="row"><button type="button" class="btn small primary" id="tPred">Predict</button><span id="tOut" class="pred"></span></div></div>`;
    const tried = new Set(S.labs.tree.tried || []);
    const draw = () => {
      const r = get(depth);
      tried.add(depth); S.labs.tree.tried = [...tried]; if (tried.size >= 3) S.labs.tree.depths = true; save(); labMaybeDone(x);
      $("#depthV", host).textContent = depth;
      $("#tStats", host).innerHTML = `<span>training accuracy <b>${(r.tr * 100).toFixed(1)}%</b></span><span>test accuracy <b>${(r.te * 100).toFixed(1)}%</b></span><span>guess-NOT baseline <b>${(base * 100).toFixed(1)}%</b></span>`;
      const ds = [...tried].sort((a, b) => a - b);
      const W = 560, H = 200, L = 46, B = 30, T = 12, R = 10, X = dd => L + (W - L - R) * (dd - 1) / 9, Y = a => T + (H - T - B) * (1 - (a - 0.5) / 0.5);
      const path = k => ds.map((dd, i) => `${i ? "L" : "M"}${X(dd)} ${Y(get(dd)[k])}`).join(" ");
      $("#tChart", host).innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Train and test accuracy by depth">${[0.5, 0.75, 1].map(a => `<line class="axis" x1="${L}" x2="${W - R}" y1="${Y(a)}" y2="${Y(a)}" stroke-dasharray="3 4"/><text x="${L - 6}" y="${Y(a) + 4}" text-anchor="end">${a * 100}%</text>`).join("")}
        <line class="base" x1="${L}" x2="${W - R}" y1="${Y(base)}" y2="${Y(base)}"/>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(dd => `<text x="${X(dd)}" y="${H - 12}" text-anchor="middle">${dd}</text>`).join("")}
        <path class="trainline" d="${path("tr")}"/><path class="testline" d="${path("te")}"/>${ds.map(dd => `<circle cx="${X(dd)}" cy="${Y(get(dd).te)}" r="4" class="testdot"/>`).join("")}</svg>
        <div class="legend"><span class="lg-train">training</span><span class="lg-test">test</span><span class="lg-base">baseline</span> · depth along the bottom</div>`;
      $("#tRules", host).textContent = treeText(r.t);
    };
    $("#depth", host).addEventListener("input", e => { depth = +e.target.value; draw(); });
    $("#tPred", host).addEventListener("click", () => { const f = FEATS.map((_, i) => Number($("#tf" + i, host).value) || 0); const p = predict(get(depth).t, f); $("#tOut", host).innerHTML = p ? `<b class="heat">HEAT</b>: likely sells 20%+ over retail` : `<b>NOT heat</b>: probably near or under retail`; });
    draw();
  }

  /* k-means on (size, price ÷ retail), standardized */
  function labKMeans(host, x) {
    const r = run("SELECT s.size_us, 1.0 * s.price_usd / sh.retail_usd FROM sales s JOIN shoes sh ON s.shoe_id = sh.shoe_id");
    const raw = r.values.map(v => ({ a: v[0], b: v[1] })), mean = k => raw.reduce((s, p) => s + p[k], 0) / raw.length, sd = (k, m) => Math.sqrt(raw.reduce((s, p) => s + (p[k] - m) ** 2, 0) / raw.length);
    const ma = mean("a"), mb = mean("b"), sa = sd("a", ma), sb = sd("b", mb), Z = raw.map(p => ({ x: (p.a - ma) / sa, y: (p.b - mb) / sb, c: 0, a: p.a, b: p.b }));
    let k = 3, C = [], iter = 0, seed = 1, moved = true;
    host.innerHTML = `<p>${raw.length.toLocaleString()} sales from the practice log, plotted by shoe size and price ÷ retail (1.0 = sold at retail, 1.5 = 50% over). No labels: the model finds groups itself.</p>
      <label class="slider" for="kk">Number of groups (k): <b id="kV">${k}</b></label><input type="range" id="kk" min="2" max="6" value="${k}">
      <div class="row"><button type="button" class="btn small" id="kStep">One step</button><button type="button" class="btn primary small" id="kRun">Run to the end</button><button type="button" class="btn ghost small" id="kNew">New random start</button><span class="mono" id="kIt"></span></div>
      <div class="chart" id="kPlot"></div><div class="tablewrap" id="kTable"></div>`;
    const init = () => {
      const rnd = mulberry32(seed * 101 + k); C = [Z[Math.floor(rnd() * Z.length)]].map(p => ({ x: p.x, y: p.y }));
      while (C.length < k) { const d2 = Z.map(p => Math.min(...C.map(c => (p.x - c.x) ** 2 + (p.y - c.y) ** 2))), tot = d2.reduce((a, b) => a + b, 0); let t = rnd() * tot, i = 0; while (t > d2[i] && i < Z.length - 1) { t -= d2[i]; i++; } C.push({ x: Z[i].x, y: Z[i].y }); }
      Z.forEach(p => (p.c = 0)); iter = 0; moved = true; assign();
    };
    const assign = () => { let ch = 0; Z.forEach(p => { let bi = 0, bd = Infinity; C.forEach((c, i) => { const dd = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (dd < bd) { bd = dd; bi = i; } }); if (p.c !== bi) ch++; p.c = bi; }); return ch; };
    const step = () => { C = C.map((c, i) => { const g = Z.filter(p => p.c === i); return g.length ? { x: g.reduce((a, p) => a + p.x, 0) / g.length, y: g.reduce((a, p) => a + p.y, 0) / g.length } : c; }); iter++; moved = assign() > 0; };
    const draw = () => {
      $("#kV", host).textContent = k; $("#kIt", host).textContent = moved ? `step ${iter}` : `finished in ${iter} steps`;
      $("#kPlot", host).innerHTML = scatterSVG(Z.map(p => ({ x: p.a, y: p.b, c: p.c })), { r: 3, xl: "shoe size (US)", yl: "price ÷ retail", centers: C.map((c, i) => ({ x: c.x * sa + ma, y: c.y * sb + mb, c: i })), label: "Sales colored by group" });
      const rowsT = C.map((c, i) => { const g = Z.filter(p => p.c === i); const avgA = g.reduce((s, p) => s + p.a, 0) / (g.length || 1), avgB = g.reduce((s, p) => s + p.b, 0) / (g.length || 1);
        const kind = (avgB >= 1.3 ? "heat buyers" : avgB < 0.95 ? "bargain hunters" : "everyday buyers") + (avgA >= 12 ? ", big sizes" : avgA <= 6.5 ? ", small sizes" : ""); return [i, g.length, avgA, avgB, kind]; });
      $("#kTable", host).innerHTML = `<table class="res"><thead><tr><th>group</th><th>sales</th><th>avg size</th><th>avg price ÷ retail</th><th>a name you might give it</th></tr></thead><tbody>${rowsT.map(([i, n, a, b2, kind]) => `<tr><td><span class="sw c${i}"></span> ${i + 1}</td><td class="num">${n}</td><td class="num">${a.toFixed(1)}</td><td class="num">${b2.toFixed(2)}</td><td>${esc(kind)}</td></tr>`).join("")}</tbody></table>`;
      if (!moved && !S.labs.kmeans.ran) { S.labs.kmeans.ran = true; save(); labMaybeDone(x); }
    };
    $("#kk", host).addEventListener("input", e => { k = +e.target.value; init(); draw(); });
    $("#kStep", host).addEventListener("click", () => { if (moved) step(); draw(); });
    $("#kRun", host).addEventListener("click", () => { let g = 0; while (moved && g++ < 100) step(); draw(); });
    $("#kNew", host).addEventListener("click", () => { seed++; init(); draw(); });
    init(); draw();
  }

  /* ---------- PLAYGROUND ---------- */
  let playSeed = null;
  const PY_EXAMPLES = [
    ["Big Face's wallet", "# Variables, math and an f-string\nwallet = 60\nwage = 15\nshifts = 4\nwallet += wage * shifts\nprint(f\"After {shifts} shifts Big Face has ${wallet}\")\nif wallet >= 120:\n    print(\"Enough for the Glide 1!\")\nelse:\n    print(\"Need\", 120 - wallet, \"more\")"],
    ["Peek at the data", "# Three tables are loaded as lists of dicts\nprint(len(releases), \"releases\")\nprint(len(shoes), \"practice shoes\")\nprint(len(sales), \"practice sales\")\nprint()\nfirst = releases[0]\nfor key, value in first.items():\n    print(key, \"=\", value)"],
    ["Cheapest drops", "# Sort releases by price (skip the ones with no price yet)\npriced = [r for r in releases if r[\"retail_usd\"] is not None]\ncheap = sorted(priced, key=lambda r: r[\"retail_usd\"])\nfor r in cheap[:5]:\n    print(r[\"release_date\"], f\"${r['retail_usd']}\", r[\"name\"])"],
    ["Average sale price", "# Same as SQL's AVG(price_usd)\nprices = [s[\"price_usd\"] for s in sales]\navg = sum(prices) / len(prices)\nprint(\"sales:\", len(prices))\nprint(\"average: $\" + str(round(avg, 2)))\nprint(\"cheapest:\", min(prices), \" priciest:\", max(prices))"],
    ["Count by brand", "# Same as SQL's GROUP BY brand with COUNT(*)\ncounts = {}\nfor r in releases:\n    brand = r[\"brand\"]\n    counts[brand] = counts.get(brand, 0) + 1\nfor brand, n in sorted(counts.items(), key=lambda kv: kv[1], reverse=True):\n    print(f\"{brand:<14}{n}\")"],
    ["Heat detector", "# Label every practice shoe heat or brick\ndef label(shoe):\n    if shoe[\"hype\"] >= 8:\n        return \"heat\"\n    return \"brick\"\n\nfor s in shoes[:8]:\n    print(label(s), \"|\", s[\"brand\"], s[\"model\"], \"| hype\", s[\"hype\"])\nheat = [s for s in shoes if label(s) == \"heat\"]\nprint(len(heat), \"of\", len(shoes), \"are heat\")"],
    ["Days to the drop", "from datetime import date\n# Change these to any dates you like\ntoday = date(2026, 11, 5)\ndrop = date(2026, 11, 27)\nprint((drop - today).days, \"days until the drop\")"]
  ];
  function viewPlay(v) {
    const mode = S.playMode === "py" ? "py" : "sql";
    v.innerHTML = `<div class="mhead"><div class="eyebrow">Playground</div><h1>${mode === "py" ? "Write Python with the store's data" : "Ask the store's data anything"}</h1>
      <div class="seg" role="tablist" aria-label="Playground language"><button type="button" role="tab" aria-selected="${mode === "sql"}" data-mode="sql">SQL</button><button type="button" role="tab" aria-selected="${mode === "py"}" data-mode="py">🐍 Python</button></div>
      <p class="lede">${mode === "py" ? "Real Python syntax, running right in this page. <code>releases</code>, <code>shoes</code> and <code>sales</code> are already loaded as lists of dicts. Nothing here can break anything." : "Write any SELECT query. Nothing here can break anything. Tip: <code>date('now')</code> is today's date (UTC)."}</p></div>
      <div class="mgrid"><div class="col-main" id="pHost"></div><aside class="side" id="pSide"></aside></div>`;
    $$("[data-mode]", v).forEach(b => b.addEventListener("click", () => { if (b.dataset.mode !== mode) { S.playMode = b.dataset.mode; save(); viewPlay(v); } }));
    ACTIVE_TA = null; EX_ED = null;
    if (mode === "py") return playPy(v);
    const seed = playSeed || S.code.play || "-- Everything dropping in the next 14 days, cheapest first\nSELECT release_date, brand, name, retail_usd\nFROM releases\nWHERE release_date BETWEEN date('now') AND date('now', '+14 days')\nORDER BY retail_usd;";
    playSeed = null;
    $("#pSide", v).innerHTML = `${refHTML(99, false)}
        <div class="card" id="pAI"><h3>Turn a question into SQL</h3><p>Describe what you want to know. Claude drafts the query. Check its work!</p></div>
        <div class="card"><h3>Take the data with you</h3><p>Get the notebook kit for Python, or copy a table as CSV.</p><div class="row"><button type="button" class="btn small" id="kitBtn">Notebook kit (.zip)</button>${["releases", "shoes", "sales"].map(t => `<button type="button" class="btn small ghost" data-csv="${t}">copy ${t}.csv</button>`).join("")}</div></div>`;
    const ed = editor($("#pHost", v), { id: "play", title: "playground", value: seed, rows: 10, onInput: val => { S.code.play = val; save(); } });
    aiBox($("#pAI", v), { id: "aiPlay", label: "Draft the SQL", input: "e.g. which brand drops the most in December?", prompt: q => { if (!q) throw new Error("Type a question first."); return `Write ONE SQLite query that answers: "${q}". Put the query first in a \`\`\`sql code block, then explain it in 2-3 short sentences and name the time period it covers.`; },
      after: text => { const mm = text.match(/```sql\s*([\s\S]*?)```/i); if (mm) { ed.ta.value = mm[1].trim(); S.code.play = ed.ta.value; save(); } } });
    ACTIVE_TA = ed.ta; EX_ED = ed; bindRef($(".side", v));
    $("#kitBtn", v).addEventListener("click", e => downloadKit(e.target));
    $$("[data-csv]", v).forEach(b => b.addEventListener("click", () => whenSQL(() => { const csv = csvOf(b.dataset.csv); try { navigator.clipboard.writeText(csv).then(() => toast(`${b.dataset.csv}.csv copied.`), () => toast("Your browser blocked copying here.")); } catch (e) { toast("Your browser blocked copying here."); } })));
    whenSQL(() => ed.exec());
  }
  function playPy(v) {
    const seed = pySeed || S.code.playpy || PY_EXAMPLES[0][1]; pySeed = null;
    const lessons = Object.keys(PYC).map(Number).filter(d => typeof PYLEARN !== "undefined" && PYLEARN[d]);
    $("#pSide", v).innerHTML = `<div class="card"><h3>What's loaded</h3><p class="note">Each table is a list. Each row is a dict. Use <code>row["column"]</code> to read a value.</p>
        <dl class="pyvars"><div><dt><code>releases</code></dt><dd>Real upcoming drops: release_date, brand, name, colorway, style_code, retail_usd (None if not listed)</dd></div>
        <div><dt><code>shoes</code></dt><dd>Practice shoes: shoe_id, brand, model, colorway, release_date, retail_usd, pairs_made, hype (1–10)</dd></div>
        <div><dt><code>sales</code></dt><dd>Practice sales: sale_id, shoe_id, sale_date, size_us, price_usd, condition</dd></div></dl>
        <p class="note">Modules: <code>math</code>, <code>statistics</code>, <code>datetime</code>, <code>random</code>.</p></div>
      <div class="card"><h3>Python lessons</h3><p class="note">Every Python corner starts with one of these. Open any to load its example.</p><div class="pylinks">${lessons.map(d => `<button type="button" class="btn small ghost" data-les="${d}">${esc(PYC[d].topic)}</button>`).join("")}</div></div>
      <div class="card" id="pAI"><h3>Turn a question into Python</h3><p>Describe what you want. Claude drafts beginner Python that runs here. Check its work!</p></div>
      <div class="card"><h3>Need pandas?</h3><p>This page runs core Python. For pandas, charts and the ML notebooks, use the free Colab kit.</p><div class="row"><button type="button" class="btn small" id="kitBtn">Notebook kit (.zip)</button></div></div>`;
    $("#pHost", v).insertAdjacentHTML("beforeend", `<div class="pyex" role="group" aria-label="Examples"><span class="chip-k">Examples</span>${PY_EXAMPLES.map(([t], i) => `<button type="button" class="btn small ghost" data-ex="${i}">${esc(t)}</button>`).join("")}</div>`);
    const ed = pyEditor($("#pHost", v), { id: "playpy", title: "python playground", value: seed, rows: 12, data: true, onInput: val => { S.code.playpy = val; save(); } });
    const load = code => { ed.ta.value = code; S.code.playpy = code; save(); whenSQL(() => ed.exec()); ed.ta.focus(); };
    $$("[data-ex]", v).forEach(b => b.addEventListener("click", () => load(PY_EXAMPLES[+b.dataset.ex][1])));
    $$("[data-les]", v).forEach(b => b.addEventListener("click", () => load(`# Lesson: ${PYC[+b.dataset.les].topic}\n` + PYLEARN[+b.dataset.les].ex)));
    aiBox($("#pAI", v), { id: "aiPlayPy", label: "Draft the Python", input: "e.g. which brand has the most expensive average release?", prompt: q => { if (!q) throw new Error("Type a question first."); return `Write short beginner Python that answers: "${q}". Variables already exist: releases, shoes, sales (lists of dicts with the columns described). Use only core Python (no pandas, no classes, no imports except math, statistics, datetime). Put the code first in a \`\`\`python code block, then explain it in 2-3 short sentences.`; },
      after: text => { const mm = text.match(/```(?:python|py)?\s*([\s\S]*?)```/i); if (mm) { ed.ta.value = mm[1].trim(); S.code.playpy = ed.ta.value; save(); } } });
    $("#kitBtn", v).addEventListener("click", e => downloadKit(e.target));
    whenSQL(() => ed.exec());
  }

  /* ---------- BLOG ---------- */
  function md(s) {
    const inl = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, a, u) => `<a href="${u}" target="_blank" rel="noopener">${a} ↗</a>`);
    const L = String(s).split("\n"); let html = "", i = 0;
    while (i < L.length) {
      const l = L[i];
      if (/^##\s/.test(l)) { html += `<h2>${inl(l.slice(3))}</h2>`; i++; continue; }
      if (/^\s*[-*]\s/.test(l)) { html += "<ul>"; while (i < L.length && /^\s*[-*]\s/.test(L[i])) html += `<li>${inl(L[i++].replace(/^\s*[-*]\s/, ""))}</li>`; html += "</ul>"; continue; }
      if (/^\s*\d+\.\s/.test(l)) { html += "<ol>"; while (i < L.length && /^\s*\d+\.\s/.test(L[i])) html += `<li>${inl(L[i++].replace(/^\s*\d+\.\s/, ""))}</li>`; html += "</ol>"; continue; }
      if (!l.trim()) { i++; continue; }
      const para = []; while (i < L.length && L[i].trim() && !/^(##\s|\s*[-*]\s|\s*\d+\.\s)/.test(L[i])) para.push(L[i++]);
      html += `<p>${inl(para.join(" "))}</p>`;
    }
    return html;
  }
  const bookCardHTML = id => `<section class="block bookcard"><img src="art/book-cover.jpg" alt="Drop Table book cover: Big Face leaps with the gold grail sneaker over the Atlanta skyline" width="177" height="229">
    <div><span class="sticker-tag">The book</span><h2>Take ${esc(STORE.heroShort)}'s story with you</h2><p class="lede">Big Face's story in one storybook workbook: the big ideas, every example with its real results, the Python corner puzzles, a glossary, a cheat sheet and an answer key. 88 pages, free.</p>
    <div class="row"><button type="button" class="btn primary" id="${id}">Download the book (PDF)</button></div></div></section>`;
  const postCard = p => `<a class="post" href="#post-${esc(p.slug)}"><span class="tag">${esc(p.tag || "Post")}</span><b>${esc(p.title)}</b><span class="note">${esc(fmtDate(p.date, { month: "short", day: "numeric", year: "numeric" }))} · ${esc(p.author || STORE.name)}</span><p>${esc(p.summary || "")}</p></a>`;
  function viewBlog(v) {
    const drops = upcoming(14);
    v.innerHTML = `<div class="mhead"><div class="eyebrow">The ${STORE.name} blog</div><h1>Drop reports, data stories, store news</h1>
      <p class="lede">Weekly Drop Reports are written from the live release list every Monday. Every upcoming release also gets its own drop file.</p></div>${bookCardHTML("bookBtn2")}
      <section class="block"><h2>Posts</h2><div class="posts">${POSTS.map(postCard).join("")}</div></section>
      <section class="block"><h2>Drop files: next 14 days</h2><div class="dropfiles">${drops.map(r => `<a class="df" href="#${hashKey(r.id)}"><span class="mono">${esc(fmtDate(r.release_date, { month: "short", day: "numeric" }))}</span><b>${esc(r.name)}</b><span>${r.retail_usd == null ? "Price TBA" : "$" + r.retail_usd}${r.news_url ? " · photos ↗" : ""}</span></a>`).join("") || `<p class="note">Nothing listed in the next 14 days.</p>`}</div></section>`;
    $("#bookBtn2", v).addEventListener("click", e => downloadBook(e.target));
  }
  function viewPost(v, sl) {
    const p = POSTS.find(x => x.slug === sl);
    if (!p) { v.innerHTML = `<div class="mhead"><h1>Post not found</h1><a class="btn" href="#blog">All posts</a></div>`; return; }
    v.innerHTML = `<article class="article"><a class="btn ghost small" href="#blog">← Blog</a><div class="eyebrow">${esc(p.tag || "Post")} · ${esc(fmtDate(p.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }))} · ${esc(p.author || STORE.name)}</div><h1>${esc(p.title)}</h1>
      ${p.period_start ? `<p class="period">Covers ${esc(fmtDate(p.period_start, { month: "short", day: "numeric", year: "numeric" }))} – ${esc(fmtDate(p.period_end, { month: "short", day: "numeric", year: "numeric" }))}</p>` : ""}<div class="prose">${md(p.body)}</div></article>`;
  }
  function viewDrop(v, key) {
    const r = FEED.rows.find(x => hashKey(x.id) === key);
    if (!r) { v.innerHTML = `<div class="mhead"><h1>That drop isn't on the list anymore</h1><p class="lede">Releases leave the list after their date passes, or when the source removes them.</p><a class="btn" href="#blog">See current drop files</a></div>`; return; }
    const t = todayET(), d = daysBetween(t, r.release_date), nk = nick(r.name), ph = photoUrl(r);
    const same = FEED.rows.filter(x => x.release_date === r.release_date && x.id !== r.id);
    const priced = FEED.rows.filter(x => x.retail_usd != null), rankP = r.retail_usd == null ? null : priced.filter(x => x.retail_usd > r.retail_usd).length + 1;
    const q = `SELECT release_date, name, retail_usd\nFROM releases\nWHERE release_date = '${r.release_date}'\nORDER BY retail_usd DESC;`;
    v.innerHTML = `<article class="article drop"><a class="btn ghost small" href="#blog">← Blog</a>
      <div class="eyebrow">Drop file · ${esc(r.brand)}${r.style_code ? " · " + esc(r.style_code) : ""}</div><h1>${esc(nk || r.name)}</h1><p class="lede">${esc(r.name)}</p>
      <div class="dropgrid"><div class="slide-art solo" style="--a:${paletteOf(r.colorway || nk)[0]};--b:${paletteOf(r.colorway || nk)[1]}">${ph ? `<img src="${esc(ph)}" alt="${esc(r.name)}">` : shoeSVG(r.colorway || nk, "big", r.name)}</div>
        <dl class="facts"><div><dt>Release date</dt><dd>${esc(fmtDate(r.release_date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }))} · ${whenLabel(d)}</dd></div>
          <div><dt>Retail price</dt><dd>${r.retail_usd == null ? "Not listed yet" : "$" + r.retail_usd}${rankP ? ` · #${rankP} most expensive of ${priced.length} priced releases on the list` : ""}</dd></div>
          <div><dt>Colorway</dt><dd>${r.colorway ? esc(r.colorway) : "Not listed yet"}</dd></div>
          <div><dt>Style code</dt><dd>${r.style_code ? `<span class="mono">${esc(r.style_code)}</span>` : "Not listed yet"}</dd></div>
          <div><dt>Data</dt><dd>${esc(FEED.source_name)}, checked ${esc(fmtStamp(FEED.as_of))}. Dates can change.</dd></div></dl></div>
      <div class="row">${r.news_url ? `<a class="btn primary" href="${esc(r.news_url)}" target="_blank" rel="noopener">See photos on ${esc(r.news_source || "the source")} ↗</a>` : ""}<a class="btn" href="${esc(FEED.source_url)}" target="_blank" rel="noopener">Release calendar ↗</a><button type="button" class="btn" id="askSql">Explore in the playground</button></div>
      <div class="prose"><h2>Same day</h2>${same.length ? `<p>${same.length} other release${same.length === 1 ? "" : "s"} on ${esc(fmtDate(r.release_date, { month: "long", day: "numeric" }))}:</p><ul>${same.slice(0, 12).map(x => `<li><a href="#${hashKey(x.id)}">${esc(x.name)}</a>${x.retail_usd != null ? " · $" + x.retail_usd : ""}</li>`).join("")}</ul>` : "<p>It's the only release listed that day.</p>"}
        <h2>The query behind this page</h2><pre class="snip">${esc(q)}</pre></div></article>`;
    $("#askSql", v).addEventListener("click", () => { playSeed = q; S.playMode = "sql"; go("play"); });
  }

  /* ---------- LEARNING DOCS: a gradual handbook (day by day), a glossary, and the table/keyword reference.
     Everything cross-links: shifts → docs + glossary, docs → glossary + shifts, glossary → docs + shifts. ---------- */
  const gslug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
  const GL = (typeof GLOSSARY !== "undefined" ? GLOSSARY : []).map(([t, cat, day, def, ex]) => ({ t, cat, day, def, ex, id: gslug(t) }));
  const GL_CATS = ["Data", "SQL", "Python", "Analytics", "ML", "AI"];
  const dayText = x => [x.t, x.boss, x.say, x.deep, x.an, x.ex, x.py, PYC[x.d] && PYC[x.d].code, typeof PYLEARN !== "undefined" && PYLEARN[x.d] && PYLEARN[x.d].say.join(" ")].filter(Boolean).join(" ");
  /* the words to search for each term: "AND / OR" → ["AND","OR"], "Dictionary (dict)" → ["Dictionary","dict"] */
  const termWords = g => g.t.replace(/\(.*?\)/g, m => "|" + m.slice(1, -1)).split(/\s*[|\/]\s*/).map(s => s.replace(/\(\)$/, "").trim()).filter(s => s.length > 1 && /[A-Za-z]/.test(s));
  const termRe = g => { const w = termWords(g).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); if (!w.length) return null; const code = /^[A-Z_]{2,}|\(|\.|_/.test(g.t) || g.cat === "SQL"; return new RegExp(`(^|[^A-Za-z0-9_])(${w.join("|")})(?![A-Za-z0-9_])`, code ? "" : "i"); };
  /* basics that show up in almost every lesson, or everyday words, don't count as "builds on" / "used again" links */
  const GL_COMMON = new Set(["Data", "Data type", "Row", "Column", "Table", "Database", "SQL", "Query", "Python", "print()", "String", "Function", "in", "Variable", "Assignment (=)", "Operator", "Index", "Method", "Source", "Label", "Feature", "Trend", "Range", "Verify", "Prompt", "Model", "Key", "Prediction", "Library", "Boolean", "Integer", "Float", "SELECT", "FROM"]);
  GL.forEach(g => { g.common = GL_COMMON.has(g.t); });
  GL.forEach(g => { g.re = termRe(g); g.uses = g.re && !g.common ? DAYS.filter(x => x.d > g.day && g.re.test(dayText(x))).map(x => x.d) : []; });
  const glChip = g => `<a class="gchip c-${gslug(g.cat)}" href="#glossary-${g.id}" title="${esc(g.def)}">${esc(g.t)}</a>`;
  function lookupHTML(d) {
    const terms = GL.filter(g => g.day === d);
    return `<div class="lookup"><h3>Look it up</h3>${terms.length ? `<p class="note">New words today. Tap one for its meaning.</p><div class="gchips">${terms.map(glChip).join("")}</div>` : ""}
      <div class="row"><a class="btn small" href="#learn-d${d}">Day ${d} in the Learning docs →</a><a class="btn small ghost" href="#glossary">Glossary A–Z</a></div></div>`;
  }
  /* link glossary words inside already-escaped text (first mention of each term only) */
  function linkTerms(html, d, seen) {
    const terms = GL.filter(g => g.re && !g.common && g.day <= d && !seen.has(g.id) && /^[A-Za-z][\w ()'-]*$/.test(g.t.replace(/[\/.]/g, "")));
    for (const g of terms) {
      const m = html.match(g.re); if (!m) continue;
      const i = m.index + m[1].length;
      const before = html.slice(0, i); if ((before.match(/</g) || []).length !== (before.match(/>/g) || []).length) continue;
      html = before + `<a class="gl" href="#glossary-${g.id}" title="${esc(g.def)}">${m[2]}</a>` + html.slice(i + m[2].length); seen.add(g.id);
    }
    return html;
  }
  const docsTabs = cur => `<div class="seg doc-seg" role="tablist" aria-label="Learning docs">${[["learn", "Handbook"], ["glossary", "Glossary"], ["docs", "Tables + keywords"]].map(([r, l]) => `<a role="tab" href="#${r}" aria-selected="${r === cur}">${l}</a>`).join("")}</div>`;
  function viewLearn(v, focus) {
    const weeks = WEEKS.map(w => ({ w, days: DAYS.filter(x => x.w === w.n) }));
    const sec = x => {
      const seen = new Set(), L = typeof PYLEARN !== "undefined" ? PYLEARN[x.d] : null, P = PYC[x.d];
      const kws = CHEAT.filter(c => c[0] === x.d), terms = GL.filter(g => g.day === x.d);
      const prior = GL.filter(g => g.day < x.d && !g.common && g.re && g.re.test(dayText(x))).slice(-8);
      const later = [...new Set(terms.flatMap(g => g.uses))].sort((p, q) => p - q).slice(0, 8);
      const lang = x.type === "lab" ? "ML lab" : x.type === "quiz" ? "Quiz" : x.type === "free" ? "Capstone" : "SQL";
      return `<section class="hsec" id="learn-d${x.d}" data-text="${esc(dayText(x).toLowerCase() + " " + terms.map(g => g.t.toLowerCase()).join(" "))}">
        <div class="hs-head"><span class="eyebrow">Week ${x.w} · Day ${x.d} · ${lang}</span><h2>${esc(x.t)}</h2></div>
        ${prior.length ? `<p class="note builds">Builds on: ${prior.map(g => `<a href="#glossary-${g.id}">${esc(g.t)}</a> <span class="mono">(Day ${g.day})</span>`).join(", ")}</p>` : ""}
        <div class="hs-grid"><div>
          <h3 class="sub">In plain words</h3><p>${linkTerms(esc(x.say), x.d, seen)}</p>
          ${x.deep ? `<h3 class="sub">Going deeper</h3><p>${linkTerms(esc(x.deep), x.d, seen)}</p>` : ""}
          <div class="an"><b>Like you're 10</b>${esc(x.an)}</div></div>
          <aside>${terms.length ? `<h3 class="sub">New words</h3><dl class="hterms">${terms.map(g => `<div><dt><a href="#glossary-${g.id}">${esc(g.t)}</a></dt><dd>${esc(g.def)}</dd></div>`).join("")}</dl>` : ""}</aside></div>
        ${kws.length ? `<h3 class="sub">Keywords</h3><div class="hkw">${kws.map(c => `<div class="kwc"><b class="mono">${esc(c[1])}</b><p>${esc(c[2])}</p><pre class="snip">${esc(c[3])}</pre><button type="button" class="btn small ghost" data-try="${esc(c[3])}">Try it ▶</button></div>`).join("")}</div>` : ""}
        ${x.ex ? `<h3 class="sub">Worked example${lang === "SQL" || lang === "Capstone" ? " (SQL)" : ""}</h3><pre class="snip">${esc(x.ex)}</pre>${/^\s*(--.*\n)*\s*(SELECT|WITH)/i.test(x.ex) ? `<div class="row"><button type="button" class="btn small" data-try="${esc(x.ex)}">Run it in the playground ▶</button></div>` : ""}` : ""}
        ${x.py ? `<h3 class="sub">Same idea in Python (pandas)</h3><pre class="snip">${esc(x.py)}</pre>` : ""}
        ${L && P ? `<div class="hpy"><h3 class="sub">Python lesson · ${esc(P.topic)}</h3>${L.say.map(t => `<p>${linkTerms(esc(t), x.d, seen)}</p>`).join("")}
          <div class="anno" style="--cw:${Math.max(...L.ex.split("\n").map(l => l.length))}ch">${L.ex.split("\n").map((ln, i) => `<div class="anno-r"><code class="anno-c">${esc(ln) || "&nbsp;"}</code><span class="anno-n">${esc(L.notes[i] || "")}</span></div>`).join("")}</div>
          <div class="row"><button type="button" class="btn small primary" data-hrun="${x.d}">Run it ▶</button><button type="button" class="btn small ghost" data-hpy="${x.d}">Open in the Python playground</button></div><div data-hout="${x.d}"></div>
          <p class="pykey"><b>Remember:</b> ${esc(L.key)}</p></div>` : ""}
        <div class="row hs-foot"><a class="btn small primary" href="#d${x.d}">Go to the Day ${x.d} shift →</a>${later.length ? `<span class="note">Comes back in ${later.map(n => `<a href="#learn-d${n}">Day ${n}</a>`).join(", ")}</span>` : ""}</div>
      </section>`;
    };
    v.innerHTML = `<div class="mhead"><div class="eyebrow">Learning docs</div><h1>Everything in Drop Table, in the order you learn it</h1>
      <p class="lede">The handbook walks through every idea one step at a time, from "what is data?" to training models and checking AI. Each section links to its shift, to the words in the glossary, and to where the idea comes back later.</p>${docsTabs("learn")}
      <label class="sr" for="hsearch">Search the docs</label><input id="hsearch" class="ai-in hsearch" type="search" placeholder="Search: JOIN, f-string, outlier, accuracy…" autocomplete="off"></div>
      <div class="hwrap"><nav class="htoc" aria-label="Handbook contents">${weeks.map(({ w, days }) => `<div><b>Week ${w.n} · ${esc(w.tool)}</b>${days.map(x => `<a href="#learn-d${x.d}" data-toc="${x.d}"><span class="mono">${x.d}</span> ${esc(x.t)}</a>`).join("")}</div>`).join("")}</nav>
      <div class="hmain">${weeks.map(({ w, days }) => `<div class="hweek"><h2 class="hw-h"><span class="u-k">Week ${w.n}</span> ${esc(w.name)} <span class="pill">${esc(w.tool)}</span></h2><p class="note">${esc(w.blurb)}</p>${days.map(sec).join("")}</div>`).join("")}<p class="note hnone" hidden>Nothing matches. Try a shorter word, or look in the <a href="#glossary">glossary</a>.</p></div></div>`;
    $$("[data-try]", v).forEach(b => b.addEventListener("click", () => { playSeed = b.dataset.try; S.playMode = "sql"; go("play"); }));
    $$("[data-hrun]", v).forEach(b => b.addEventListener("click", () => { $(`[data-hout="${b.dataset.hrun}"]`, v).innerHTML = `<div class="pyout-h">Output</div>` + pyOutHTML(pyRun(PYLEARN[b.dataset.hrun].ex)); }));
    $$("[data-hpy]", v).forEach(b => b.addEventListener("click", () => openInPy(PYLEARN[b.dataset.hpy].ex)));
    $$(".htoc a, .hs-foot .note a, .builds a, a.gl, .hterms a", v).forEach(a => a.addEventListener("click", e => { const h = a.getAttribute("href"); if (h.startsWith("#learn-d")) { e.preventDefault(); history.replaceState(null, "", h); const t = $(h, v); t && t.scrollIntoView({ behavior: "smooth", block: "start" }); } }));
    const q = $("#hsearch", v);
    q.addEventListener("input", () => { const s = q.value.trim().toLowerCase(); let n = 0;
      $$(".hsec", v).forEach(el => { const hit = !s || el.dataset.text.includes(s); el.hidden = !hit; if (hit) n++; });
      $$(".hweek", v).forEach(w => (w.hidden = !$$(".hsec", w).some(el => !el.hidden))); $(".hnone", v).hidden = n > 0; });
    if (focus) setTimeout(() => { const t = $("#" + focus, v); t && t.scrollIntoView({ block: "start" }); }, 30);
  }
  function viewGlossary(v, focus) {
    const keyOf = g => (/^[A-Za-z]/.test(g.t) ? g.t[0].toUpperCase() : "#");
    const sorted = GL.slice().sort((p, q) => (keyOf(p) === "#") - (keyOf(q) === "#") || p.t.localeCompare(q.t, "en", { sensitivity: "base" })).sort((p, q) => (keyOf(q) === "#") - (keyOf(p) === "#"));
    const letters = [...new Set(sorted.map(keyOf))];
    const catName = { Data: "Data basics", SQL: "SQL", Python: "Python", Analytics: "Analytics", ML: "Machine learning", AI: "AI" };
    v.innerHTML = `<div class="mhead"><div class="eyebrow">Learning docs</div><h1>Glossary</h1><p class="lede">${GL.length} words from the course, in plain language. Each one links to the day it's taught and the handbook section that explains it.</p>${docsTabs("glossary")}
      <div class="gfilters"><label class="sr" for="gsearch">Search the glossary</label><input id="gsearch" class="ai-in hsearch" type="search" placeholder="Search a word…" autocomplete="off">
      <div class="gcats" role="group" aria-label="Filter by subject"><button type="button" class="btn small" aria-pressed="true" data-cat="">All</button>${GL_CATS.map(c => `<button type="button" class="btn small ghost" aria-pressed="false" data-cat="${c}"><span class="dot c-${gslug(c)}"></span>${catName[c]}</button>`).join("")}</div>
      <nav class="az" aria-label="Jump to letter">${letters.map(l => `<a href="#gl-${l === "#" ? "sym" : l}">${l}</a>`).join("")}</nav></div></div>
      <div class="glist">${letters.map(l => `<section class="gletter" id="gl-${l === "#" ? "sym" : l}"><h2>${l === "#" ? "Symbols" : l}</h2>${sorted.filter(g => keyOf(g) === l).map(g => `<article class="gterm" id="glossary-${g.id}" data-cat="${g.cat}" data-text="${esc((g.t + " " + g.def).toLowerCase())}">
        <div class="gt-top"><h3>${esc(g.t)}</h3><span class="pill c-${gslug(g.cat)}">${esc(catName[g.cat])}</span></div><p>${esc(g.def)}</p>${g.ex ? `<pre class="snip">${esc(g.ex)}</pre>` : ""}
        <p class="gt-links"><a href="#learn-d${g.day}">Learn it: Day ${g.day} in the handbook</a> · <a href="#d${g.day}">Day ${g.day} shift</a>${g.uses.length ? ` · Used again in ${g.uses.slice(0, 6).map(n => `<a href="#learn-d${n}">Day ${n}</a>`).join(", ")}${g.uses.length > 6 ? "…" : ""}` : ""}</p></article>`).join("")}</section>`).join("")}<p class="note gnone" hidden>No word matches that.</p></div>`;
    let cat = "";
    const apply = () => { const s = $("#gsearch", v).value.trim().toLowerCase(); let n = 0;
      $$(".gterm", v).forEach(el => { const hit = (!cat || el.dataset.cat === cat) && (!s || el.dataset.text.includes(s)); el.hidden = !hit; if (hit) n++; });
      $$(".gletter", v).forEach(L => (L.hidden = !$$(".gterm", L).some(el => !el.hidden))); $(".gnone", v).hidden = n > 0; };
    $("#gsearch", v).addEventListener("input", apply);
    $$("[data-cat]", v).forEach(b => b.addEventListener("click", () => { cat = b.dataset.cat; $$("[data-cat]", v).forEach(x => { const on = x === b; x.setAttribute("aria-pressed", on); x.classList.toggle("ghost", !on); }); apply(); }));
    $$(".az a", v).forEach(a => a.addEventListener("click", e => { e.preventDefault(); const t = $(a.getAttribute("href"), v); t && t.scrollIntoView({ behavior: "smooth", block: "start" }); }));
    if (focus) setTimeout(() => { const t = $("#" + focus, v); if (t) { t.scrollIntoView({ block: "center" }); t.classList.add("flash"); } }, 30);
  }

  /* ---------- STORY: the story arc + the learning science behind the design ---------- */
  const RESEARCH = [
    { k: "Story", t: "Learning lives inside a story", find: "Cognitive scientist Daniel Willingham reviewed decades of research and concluded that stories are 'psychologically privileged': people understand and remember material told as a story better than the same facts presented another way.",
      here: "Every shift is a story beat. Big Face gets hired, works the counter, the consignment office, the back office and the AI lab, and every query answers a question a character actually asks.", go: [["Day 1", "d1"]],
      cite: "Willingham, D. T. (2004). The privileged status of story. American Educator, 28(2).", url: "https://www.aft.org/periodical/american-educator/summer-2004/ask-cognitive-scientist" },
    { k: "Interests", t: "Problems about things kids care about", find: "When 9th graders' algebra problems were rewritten around their own interests (sports, music, games), they solved them faster and more accurately, struggling students gained the most, and the advantage was still there on later lessons that weren't personalized. Earlier work found that giving lessons a meaningful context and personal touches raised motivation and learning.",
      here: "Instead of 'table A' and 'column B', learners query real upcoming sneaker releases and a store's sales log, and earn, save and spend toward a grail pair.", go: [["The Flip", "flip"]],
      cite: "Walkington, C. A. (2013). Using adaptive learning technologies to personalize instruction to student interests. Journal of Educational Psychology, 105(4), 932–945. · Cordova, D. I., & Lepper, M. R. (1996). Journal of Educational Psychology, 88(4), 715–730.", url: "https://blog.smu.edu/research/?p=8314" },
    { k: "Worked examples", t: "See it solved, then solve it", find: "Beginners who studied worked-out algebra examples learned more than beginners who just solved problems. Later research showed the help should fade as skill grows: examples first, then partly finished problems, then problems on your own.",
      here: "Every shift shows a worked example and its real result before your turn. Help fades by week: fill-in-the-blank in week 1, a skeleton query in weeks 2–3, a blank editor in weeks 4–5.", go: [["Day 4", "d4"]],
      cite: "Sweller, J., & Cooper, G. A. (1985). The use of worked examples as a substitute for problem solving in learning algebra. Cognition and Instruction, 2(1), 59–89. · Renkl, A., on fading worked examples.", url: "https://en.wikipedia.org/wiki/Worked-example_effect" },
    { k: "Predict, then run", t: "Read code before writing it", find: "PRIMM (Predict, Run, Investigate, Modify, Make) has students predict what code will do before running it. In a study of 673 students aged 11–14 across 13 UK schools, classes taught with PRIMM scored higher on a programming test than comparison classes (a small but significant effect).",
      here: "Each Python corner: a 'Learn it first' lesson with a worked example, then predict the output, then run it for real, then tweak it in the Python playground.", go: [["Python playground", "play"]],
      cite: "Sentance, S., Waite, J., & Kallia, M. (2019). Teaching computer programming with PRIMM: a sociocultural perspective. Computer Science Education, 29(2–3).", url: "https://qmro.qmul.ac.uk/xmlui/handle/123456789/57800" },
    { k: "Retrieval", t: "Pulling it out beats reading it again", find: "Students who took practice tests on a passage remembered about 61% of it a week later. Students who spent the same time rereading remembered about 40%, even though they'd read it far more times.",
      here: "Quizzes, predict-the-output puzzles and the challenges ask you to produce the answer, not reread it. First-try tips reward getting it on your own.", go: [["Day 28", "d28"]],
      cite: "Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. Psychological Science, 17(3), 249–255.", url: "https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf" },
    { k: "Spacing + mixing", t: "Come back later, and mix it up", find: "A review of 317 experiments found that spreading practice out beats cramming it together. Separately, students who practiced math problems shuffled together did far better on a test a week later than students who practiced one type at a time.",
      here: "Skills return across weeks (averages in SQL, then in Python, then in the AI lab), and Day 30, Grail Day, is a shuffled review of all five weeks.", go: [["Day 30", "d30"]],
      cite: "Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks. Psychological Bulletin, 132(3), 354–380. · Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning. Instructional Science, 35(6), 481–498.", url: "https://digitalcommons.usf.edu/psy_facpub/1767/" },
    { k: "Feedback", t: "Fast feedback about the task", find: "Across 12 meta-analyses, feedback had one of the largest average effects on learning (about 0.79). Feedback about the task and how to fix it works best. Praise and rewards on their own do the least.",
      here: "Your query is checked against the real answer instantly, with a specific reason when it's off, three levels of hints, and a line-by-line breakdown of what your query did. Python errors name the line and the likely fix.", go: [["Day 5", "d5"]],
      cite: "Hattie, J., & Timperley, H. (2007). The power of feedback. Review of Educational Research, 77(1), 81–112.", url: "https://www.uky.edu/~gmswan3/575/Hattie_Timperly_2007.pdf" },
    { k: "Game + story", t: "Game parts that serve the learning", find: "A meta-analysis of gamified learning found small positive effects on learning, motivation and behavior. The authors singled out narrative and game fiction (a story world, a character who grows) as especially promising.",
      here: "Wages for correct answers, a wallet, the sneaker market, rank tiers and a grail to save for, all inside Big Face's story. The game pays for learning, not for clicking.", go: [["Rank ladder", "rank"]],
      cite: "Sailer, M., & Homner, L. (2020). The gamification of learning: a meta-analysis. Educational Psychology Review, 32(1), 77–112.", url: "https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056" }
  ];
  const LOOP = [["Story", "A character needs something from the data."], ["Big idea", "One concept in plain words, plus a like-you're-10 version."], ["Watch", "A worked example with its real result."], ["Your turn", "A challenge with fading help and hints."], ["Feedback", "Instant check, a reason, and what your code did."], ["Python corner", "Learn it, predict the output, run it."], ["Payday", "Wages, tips and a market event."]];
  function viewStory(v) {
    const chapters = WEEKS.map(w => { const ds = DAYS.filter(x => x.w === w.n); return { n: w.n, img: UNIT_ART[w.n], k: `Week ${w.n} · Days ${ds[0].d}–${ds[ds.length - 1].d}`, t: w.name, tool: w.tool, story: w.story.split(/(?<=\.)\s/).slice(0, 3).join(" ") }; });
    const last = DAYS[DAYS.length - 1];
    v.innerHTML = `<section class="lhero story-hero"><div class="lh-copy"><span class="chip-k">The story</span><h1>One kid, one sneaker shop, five weeks of real skills.</h1>
        <p class="lede">Drop Table teaches SQL, Python, data analysis, machine learning and AI through the story of Big Face, a kid from Atlanta chasing big face hundreds to buy his first grail. Here's the story, and the learning research every part of it is built on.</p>
        <div class="row"><a class="btn primary big3d" href="#d1">Start Day 1 →</a><a class="btn ghost3d big3d" href="#research">See the research</a></div></div>
        <div class="lh-art"><img class="cut lh-hero" src="${ART("bf-hero")}" alt="Big Face holding the gold grail sneaker"></div></section>

      <section class="block"><div class="sec-h"><span class="chip-k">The story arc</span><h2>Every week is a new department</h2><p class="lede">Each week moves Big Face deeper into the store, and each department needs a new skill. ${DAYS.length} shifts, one lesson each.</p></div>
        <ol class="arc">${chapters.map(c => `<li class="arc-c"><div class="arc-img"><img src="${ART(c.img)}" alt="" loading="lazy"></div><div class="arc-b"><span class="u-k">${esc(c.k)}</span><h3>${esc(c.t)}</h3><span class="pill">${esc(c.tool)}</span><p>${esc(c.story)}</p></div></li>`).join("")}
          <li class="arc-c finale"><div class="arc-img"><img class="cut" src="${ART("bf-cheer")}" alt="" loading="lazy"></div><div class="arc-b"><span class="u-k">Day ${last.d} · the finale</span><h3>${esc(last.t)}</h3><span class="pill">Everything, mixed</span><p>The jar is finally full. One mixed review of all five weeks stands between Big Face and the Comet Mid.</p></div></li></ol></section>

      <section class="block"><div class="sec-h"><span class="chip-k">Every shift, same rhythm</span><h2>How one lesson is built</h2></div>
        <ol class="loop">${LOOP.map(([t, d], i) => `<li><span class="loop-n">${i + 1}</span><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("")}</ol>
        <div class="fade"><h3 class="sub">Help fades as skill grows</h3><div class="fade-bars">${[["Week 1", "Fill in the blank", 90], ["Weeks 2–3", "Finish the skeleton", 60], ["Weeks 4–5", "Blank editor", 25]].map(([w, t, h]) => `<div class="fb"><div class="fb-bar"><i style="height:${h}%"></i></div><b>${w}</b><span>${t}</span></div>`).join("")}</div><p class="note">Bar height = how much of the answer is given to you.</p></div></section>

      <section class="block" id="research"><div class="sec-h"><span class="chip-k">Research-based design</span><h2>The learning science behind Drop Table</h2>
        <p class="lede">Each design choice traces back to published research on how people learn. For each one: what the studies found, and where you'll see it here.</p></div>
        <div class="rgrid">${RESEARCH.map((r, i) => `<article class="rcard"><div class="r-top"><span class="r-n">${String(i + 1).padStart(2, "0")}</span><span class="pill">${esc(r.k)}</span></div><h3>${esc(r.t)}</h3>
          <div class="r-sec"><span class="r-l">The research</span><p>${esc(r.find)}</p></div>
          <div class="r-sec here"><span class="r-l">In Drop Table</span><p>${esc(r.here)}</p><div class="row">${r.go.map(([l, h]) => `<a class="btn small ghost" href="#${h}">${esc(l)} →</a>`).join("")}</div></div>
          <p class="r-cite"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.cite)} ↗</a></p></article>`).join("")}</div>
        <div class="honest card"><h3>An honest note</h3><p>These studies tested the techniques, not Drop Table itself. Drop Table hasn't been through its own study yet. The release calendar is real data; the week 3–5 sales log and brands are practice data made up for learning. Progress is saved in your own browser.</p></div></section>

      <section class="block"><div class="sec-h"><span class="chip-k">For parents + teachers</span><h2>What a learner walks away with</h2></div>
        <div class="steps4">${[["SQL", "SELECT, WHERE, GROUP BY, HAVING, JOIN, CASE and RANK() on real data."], ["Python", `${Object.keys(PYC).length} lessons from print() to functions and dicts, plus a Python playground.`], ["Data + ML", "Averages, outliers, charts, and three models trained in the browser: a line, a decision tree, k-means."], ["AI judgment", "Using an AI teammate, then checking its work against the data."]].map(([t, d]) => `<div class="step4"><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join("")}</div></section>`;
  }

  /* ---------- STORE MAP: how SQL, Python, analytics, ML and AI fit ---------- */
  function viewMap(v) {
    v.innerHTML = `<div class="mhead"><div class="eyebrow">How the ${STORE.name} uses data</div><h1>From the release calendar to the AI lab</h1>
      <p class="lede">Every tool in this course has a job in the store. Data flows left to right: collected, stored, cleaned, charted, predicted, and explained.</p></div>
      <ol class="stack">${STACK.map(s => `<li class="stk k-${s.k}"><span class="stk-n">${s.n}</span><div><span class="pill">${esc(s.tool)}</span><h3>${esc(s.t)}</h3><p>${esc(s.what)}</p><div class="row">${s.days.map(dd => `<a class="btn small ghost" href="#d${dd}">Day ${dd}: ${esc(DAYS.find(y => y.d === dd).t)}</a>`).join("")}</div></div></li>`).join("")}</ol>
      <section class="block"><h2>A Saturday at the store</h2><ol class="steps">
        <li><div><b>5:43 AM.</b> The scheduled helper reads the public release calendar and updates the release wall (data collection).</div></li>
        <li><div><b>9:00 AM.</b> A customer asks what drops under $150 this week. One SQL query answers it (SQL).</div></li>
        <li><div><b>11:00 AM.</b> Theo's notebook cleans last week's sales and makes the staffing chart (Python + analytics).</div></li>
        <li><div><b>1:00 PM.</b> A consigner brings a pair. The heat detector predicts if it'll sell 20%+ over retail (machine learning).</div></li>
        <li><div><b>4:00 PM.</b> Rae asks the AI teammate to draft a report query, then checks its row count before trusting it (AI).</div></li>
        <li><div><b>Monday.</b> The blog's Drop Report is written from the live list, with the date range in the title.</div></li></ol></section>`;
  }

  /* ---------- ABOUT THE DATA ---------- */
  function viewData(v) {
    v.innerHTML = `<div class="mhead"><div class="eyebrow">About the data</div><h1>What's real, what's practice, and when</h1><p class="lede">Good data work always says where numbers came from and what dates they cover. Here's exactly that.</p></div>
      <section class="block"><div class="tablewrap flat"><table class="dtable"><thead><tr><th>Table</th><th>Kind</th><th>What's in it</th><th>Dates</th><th>Source</th></tr></thead><tbody>
        ${DATA_ABOUT.map(d => `<tr><td><code>${d.table}</code></td><td><span class="pill ${d.kind === "REAL" ? "real" : "sim"}">${d.kind === "REAL" ? "real" : "practice"}</span></td><td>${esc(d.what)}</td><td>${d.table === "releases" ? `${FEED.window_start} → ${FEED.window_end}` : esc(d.period)}</td><td>${d.table === "releases" ? `<a href="${esc(FEED.source_url)}" target="_blank" rel="noopener">${esc(FEED.source_name)} ↗</a>` : esc(d.source)}</td></tr>`).join("")}
      </tbody></table></div>${freshnessHTML()}</section>
      <section class="block"><h2>How the release list stays fresh</h2><ol class="steps">
        <li><div><b>Every morning a scheduled Claude task reads a public release calendar.</b> It never scrapes StockX, GOAT or Flight Club: their rules don't allow robots.</div></li>
        <li><div><b>It writes each release into this page's database</b> with date, brand, name, colorway, style code and store price, plus when it checked and which dates it covered. It also adds a link to news coverage with photos when it finds one.</div></li>
        <li><div><b>This page reads that database when you open it.</b> If you aren't signed in, you see the saved list from the date shown, never a guess.</div></li>
        <li><div><b>Photos:</b> product photos belong to the sites and brands that made them, so we link to them. Shoe drawings here are generic art colored from the real colorway, or photos the store owner has the right to use.</div></li></ol></section>
      <section class="block"><h2>Why the sales log is practice data</h2><p class="lede">Real resale prices live on marketplaces that don't allow automated collection, and they change by the minute. So weeks 3–5 use a made-up store log: four invented brands, 20 shoes and ${SALES.length.toLocaleString()} sales between ${fmtDate(SIM.period_start, { month: "short", day: "numeric" })} and ${fmtDate(SIM.period_end, { month: "short", day: "numeric", year: "numeric" })}, built from a fixed recipe so everyone gets the same rows and answers.</p></section>`;
  }
  function renderFooter() { $("#foot").innerHTML = `<div class="fgrid"><div><a class="logo" href="#home">DROP <span class="t">TABLE</span><span class="semi">;</span></a><p>Learn SQL, Python, data analytics and AI by working shifts at a fictional rare-sneaker shop in Atlanta.</p></div>
      <div><h4>Learn</h4><a href="#shifts">Shifts</a><a href="#learn">Learning docs</a><a href="#glossary">Glossary</a><a href="#play">Playground</a><a href="#docs">Tables + keywords</a><a href="#story">Story + research</a></div>
      <div><h4>Play</h4><a href="#flip">The Flip</a><a href="#rank">Rank ladder</a><a href="#blog">Blog</a><a href="#map">How it fits</a></div>
      <div><h4>About the data</h4><p>Releases: ${esc(FEED.source_name)}, ${FEED.window_start} to ${FEED.window_end}, checked ${fmtStamp(FEED.as_of)}${FEED.live ? " (live)" : ""}. Sales log and brands in weeks 3–5 are practice data.</p><a href="#data">Data details</a></div></div>
      <p class="fine">The Grail Room, Big Face, Rae and Theo are fictional. Brand names belong to their owners and are used only to describe real releases. Product photos belong to their owners; we link to them. Not affiliated with any brand, store or marketplace.</p>
      <div class="legal"><p class="made">Created by <b>Ofgeneration LLC</b> · © ${new Date().getFullYear()} Ofgeneration LLC. All rights reserved.</p>
        <nav aria-label="Legal"><a href="#privacy">Privacy policy</a><a href="#terms">Terms of use</a><button type="button" class="linkbtn" id="privChoices">Privacy choices</button><a href="mailto:support@grailroom.com">support@grailroom.com</a></nav></div>`;
    $("#privChoices").addEventListener("click", () => consentBanner(true)); }

  /* ---------- privacy choices banner (shown until a choice is made; shown again when the policy version changes) ---------- */
  function consentBanner(force) {
    const stale = CONSENT && CONSENT.v !== CONSENT_V;
    if (!force && CONSENT && !stale) return;
    const old = $("#consent"); if (old) old.remove();
    document.body.insertAdjacentHTML("beforeend", `<section class="consent" id="consent" role="dialog" aria-modal="false" aria-labelledby="cTitle">
      <h2 id="cTitle">${stale ? "We updated our privacy policy" : "Your privacy"}</h2>
      <p>${stale ? `Our privacy policy changed on ${POLICY_DATE}. Please look it over and choose again. ` : ""}Drop Table uses <b>no cookies, no ads and no trackers</b>. If you say yes, your progress (shifts, wallet, code) is saved <b>in this browser only</b>. Nothing is sent to us. Kids: check with a parent or guardian.</p>
      <div class="row"><button type="button" class="btn primary" data-c="yes">Save my progress here</button><button type="button" class="btn ghost" data-c="no">Don't save</button><a class="btn ghost small" href="#privacy">Read the privacy policy</a></div>
      ${CONSENT ? `<p class="note">Current choice: ${CONSENT.save ? "progress is saved on this device" : "progress is not saved"} (since ${esc(new Date(CONSENT.at).toLocaleDateString())}).</p>` : ""}</section>`);
    const box = $("#consent");
    $$("[data-c]", box).forEach(b => b.addEventListener("click", () => { setConsent(b.dataset.c === "yes"); box.remove(); toast(b.dataset.c === "yes" ? "Progress will be saved on this device." : "Got it. Progress won't be saved after you close this tab."); if (curRoute() === "privacy") route(); }));
    $("a", box).addEventListener("click", () => box.remove());
  }

  /* ---------- privacy policy + terms ---------- */
  const legalHead = (eye, h, lede) => `<article class="article legaldoc"><div class="eyebrow">${eye} · Last updated ${POLICY_DATE}</div><h1>${h}</h1><p class="lede">${lede}</p>`;
  function viewPrivacy(v) {
    v.innerHTML = legalHead("Privacy policy", "Privacy policy", "Short version: Drop Table doesn't collect personal information. No accounts, no cookies, no ads, no tracking. Your progress stays on your own device, and only if you say yes.") + `<div class="prose">
      <h2>Who we are</h2><p>Drop Table is a free learning site made by <b>Ofgeneration LLC</b> ("we"). Questions or requests: <a href="mailto:support@grailroom.com">support@grailroom.com</a>.</p>
      <h2>What we collect</h2><p><b>Nothing that identifies you.</b> There are no sign-ups, no forms that send us data, no analytics, no advertising and no tracking cookies. We don't sell or share personal information, because we don't have any.</p>
      <h2>What's saved on your device</h2><p>If you choose <b>Save my progress here</b>, the site saves your progress (finished shifts, rep, the game wallet and closet, your code and quiz answers) in your browser's local storage. It never leaves your device and we can't see it. It also saves your privacy choice itself, so we don't ask every visit. If you choose <b>Don't save</b>, progress lasts only until you close the tab.</p>
      <div class="card"><h3>Your choices</h3><p>Current choice: <b>${CONSENT ? (CONSENT.save ? "progress is saved on this device" : "progress is not saved") : "not chosen yet"}</b>.</p><div class="row"><button type="button" class="btn" id="pChoose">Change my choice</button><button type="button" class="btn ghost" id="pForget">Delete my progress from this device</button></div></div>
      <h2>Kids and families</h2><p>Drop Table is made for learners as young as 10. We don't knowingly collect personal information from anyone, including children under 13, so there's nothing for us to delete or share. Grown-ups can clear a child's saved progress at any time with the button above or by clearing site data in the browser. If you think a child has sent us personal information (for example by email), write to us and we'll delete it.</p>
      <h2>Things the site loads</h2><ul>
        <li><b>Fonts and pictures</b> come from this site itself.</li>
        <li><b>The SQL engine</b> (sql.js) loads from the jsDelivr CDN, checked with an integrity hash. Like any website, jsDelivr receives standard request information such as your IP address. See jsDelivr's privacy policy.</li>
        <li><b>Hosting.</b> The site is hosted on GitHub Pages or inside Claude. Hosts keep standard server logs under their own policies; we don't receive them.</li>
        <li><b>Links out.</b> "See photos" links open other sites (sneaker news and release calendars) in a new tab. Their privacy policies apply there.</li></ul>
      <h2>"Ask Claude" helpers</h2><p>When Drop Table is opened inside Claude, some pages offer AI helpers. What you type there is sent to Claude through <b>your own</b> Claude account and is covered by Anthropic's terms and privacy policy. We don't receive it. On the GitHub Pages version these helpers don't appear.</p>
      <h2>The data you query</h2><p>The release calendar is public information about upcoming sneaker releases, collected from a public release calendar and dated when checked. The sales log and brands in weeks 3–5 are made up for practice. Neither contains information about you or any customer.</p>
      <h2>Changes</h2><p>If this policy changes in a way that matters, the date above changes and the site asks you to choose again.</p>
      <h2>Contact</h2><p>Ofgeneration LLC · <a href="mailto:support@grailroom.com">support@grailroom.com</a></p></div></article>`;
    $("#pChoose", v).addEventListener("click", () => consentBanner(true));
    $("#pForget", v).addEventListener("click", () => { forgetMe(); renderMe(); toast("Progress deleted from this device."); route(); });
  }
  function viewTerms(v) {
    v.innerHTML = legalHead("Terms of use", "Terms of use", "The rules for using Drop Table. Plain words first; they still count.") + `<div class="prose">
      <h2>1. Who runs this</h2><p>Drop Table is provided by <b>Ofgeneration LLC</b>. By using the site you agree to these terms. If you're under 18, use it with a parent's or guardian's OK.</p>
      <h2>2. It's free and for learning</h2><p>You can use the lessons, playground, notebooks and book for personal learning and in classrooms. Please don't resell them or pass them off as your own. The game money (wallet, wages, the sneaker market) is pretend: it isn't real money and can't be cashed out or traded.</p>
      <h2>3. Fiction, practice data and real data</h2><p>The Grail Room, Big Face, Rae, Theo and the practice brands are fictional. The week 3–5 sales log is made up. The release calendar is real public information, checked on the date shown, and release dates and prices can change. Nothing here is financial or buying advice.</p>
      <h2>4. Brands and trademarks</h2><p>Real brand and product names appear only to describe real releases. They belong to their owners. Drop Table isn't affiliated with or endorsed by any brand, store or marketplace. Product photos belong to their owners; we link to them rather than copy them.</p>
      <h2>5. Our content</h2><p>The story, characters, artwork, lessons and code of Drop Table are © Ofgeneration LLC. Fonts are used under the SIL Open Font License. sql.js is used under the MIT License.</p>
      <h2>6. Be kind to the site</h2><p>Don't try to break, overload or misuse the site or the services it uses, and don't use the AI helpers to make harmful content.</p>
      <h2>7. AI helpers</h2><p>AI answers can be wrong. That's a lesson in this course: check them against the data.</p>
      <h2>8. No warranty</h2><p>Drop Table is provided "as is". We work to keep it accurate and available but can't promise it's error-free or always online. To the extent the law allows, Ofgeneration LLC isn't liable for losses from using it.</p>
      <h2>9. Reporting a problem or a takedown request</h2><p>If something on the site is wrong, harmful, or uses your work or brand in a way you object to, email <a href="mailto:support@grailroom.com">support@grailroom.com</a> with the page and what's wrong. We review every report and remove material quickly when it should come down.</p>
      <h2>10. Changes and law</h2><p>We may update these terms; the date above shows the latest version. These terms are governed by the laws of the State of Ohio, USA.</p></div></article>`;
  }

  /* ---------- boot ---------- */
  applyHero(); renderMe(); renderFooter();
  window.addEventListener("hashchange", route);
  document.addEventListener("click", e => { const f = e.target.closest(".docfab"); if (!f) return; e.preventDefault(); const d = (curRoute().match(/^d(\d+)$/) || [])[1]; popup(`${refHTML(d ? +d : 99, false)}<div class="row"><button type="button" class="btn ghost" data-close>Close</button></div>`, dl => bindRef(dl)); });
  route();
  initSQL();
  if (!S.intro && curRoute() === "home") setTimeout(welcome, 400);
  setTimeout(function waitForPopups() { if (document.querySelector("dialog[open]")) return setTimeout(waitForPopups, 700); consentBanner(false); }, 1200);
})();
