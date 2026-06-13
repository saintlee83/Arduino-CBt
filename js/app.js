/* =========================================================
   전자회로 CBT — application
   ========================================================= */
(function () {
"use strict";

const QUESTIONS = (window.QUESTIONS || []).slice();
const NOTES = (window.NOTES || []).slice().sort((a, b) => a.section - b.section);
const FLASHCARDS = (window.FLASHCARDS || []).slice();
const CHEAT = (window.CHEATSHEET || []).slice();

const TOPICS = {
  pin:{l:"핀 선언", c:"#8b9bff"}, pwm:{l:"PWM", c:"#5b8cff"}, digin:{l:"풀업/풀다운", c:"#22d3ee"},
  debounce:{l:"디바운싱", c:"#34d399"}, rgb:{l:"RGB LED", c:"#f472b6"}, adc:{l:"ADC", c:"#a78bfa"},
  sensor:{l:"센서·전압분배", c:"#fbbf24"}, serial:{l:"시리얼", c:"#60a5fa"}, map:{l:"map/constrain", c:"#4ade80"},
  dcmotor:{l:"DC모터·H브리지", c:"#fb923c"}, power:{l:"전원 설계", c:"#f87171"}, servo:{l:"서보 모터", c:"#c084fc"},
  stepper:{l:"스테핑 모터", c:"#2dd4bf"}, sevenseg:{l:"7세그먼트 ⭐", c:"#fbbf24"}, "종합":{l:"종합 서술형", c:"#94a3b8"},
};
const topicLabel = t => (TOPICS[t] && TOPICS[t].l) || t;
const topicColor = t => (TOPICS[t] && TOPICS[t].c) || "#7c89a8";

const view = document.getElementById("view");
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ---------------- helpers ---------------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
function md(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code class="inl">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function fmtTime(s) { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); const r = s % 60; return m + ":" + String(r).padStart(2, "0"); }
const norm = s => String(s || "").toLowerCase().replace(/[\s.,/()·~\-—:;'"%]/g, "");

let toastT;
function toast(msg) {
  $$(".toast").forEach(t => t.remove());
  const d = document.createElement("div"); d.className = "toast"; d.textContent = msg; document.body.appendChild(d);
  clearTimeout(toastT); toastT = setTimeout(() => d.remove(), 1900);
}
function modal({ title, body, confirm, cancel, onConfirm }) {
  const back = document.createElement("div"); back.className = "modal-back";
  back.innerHTML = `<div class="modal"><h3>${esc(title)}</h3>${body || ""}<div class="modal-foot">
    ${cancel ? `<button class="btn ghost sm" data-x>${esc(cancel)}</button>` : ""}
    <button class="btn sm" data-ok>${esc(confirm || "확인")}</button></div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener("click", e => { if (e.target === back) close(); });
  $("[data-x]", back) && $("[data-x]", back).addEventListener("click", close);
  $("[data-ok]", back).addEventListener("click", () => { const r = onConfirm && onConfirm(back); if (r !== false) close(); });
  const inp = $("input", back); if (inp) { inp.focus(); inp.addEventListener("keydown", e => { if (e.key === "Enter") $("[data-ok]", back).click(); }); }
  return back;
}

/* ---------------- theme / topbar ---------------- */
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  document.querySelector('meta[name=theme-color]').setAttribute("content", t === "dark" ? "#0b0f1a" : "#f4f6fc");
  const btn = $("#themeToggle");
  btn.innerHTML = t === "dark"
    ? '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
    : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></svg>';
}
function refreshDday() {
  const chip = $("#ddayChip .dday-label");
  const d = Store.settings().examDate;
  if (!d) { chip.textContent = "D-?"; return; }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ex = new Date(d + "T00:00:00");
  const diff = Math.round((ex - today) / 864e5);
  chip.textContent = diff > 0 ? "D-" + diff : diff === 0 ? "D-DAY" : "D+" + (-diff);
}
function refreshBadges() {
  const w = Store.wrongIds().length, f = Store.flashDue().length;
  const wb = $("#wrongBadge"), fb = $("#flashBadge");
  wb.hidden = !w; wb.textContent = w; fb.hidden = !f; fb.textContent = f;
}

/* ---------------- router ---------------- */
const ROUTES = { home: viewHome, study: viewStudy, cheat: viewCheat, exam: viewExam, wrong: viewWrong, flash: viewFlash, sevenseg: viewSeg, stats: viewStats };
let examState = null;

function parseHash() {
  const h = (location.hash || "#/home").replace(/^#\//, "");
  const [route, ...rest] = h.split("/");
  return { route: ROUTES[route] ? route : "home", params: rest };
}
function navTo(r) { location.hash = "#/" + r; }
function render() {
  const { route, params } = parseHash();
  $$(".nav-link, .bn").forEach(a => a.classList.toggle("active", a.dataset.route === route));
  closeSidebar();
  if (route !== "exam") examState = null;
  view.scrollTop = 0; window.scrollTo(0, 0);
  ROUTES[route](params);
  refreshBadges();
}

/* =========================================================
   HOME
   ========================================================= */
function aggStats() {
  const s = Store.get();
  let seen = 0, correct = 0, answeredIds = 0;
  const byTopic = {};
  for (const id in s.perQ) {
    const q = s.perQ[id]; if (q.seen > 0) answeredIds++;
    seen += q.seen; correct += q.correct;
  }
  for (const t in TOPICS) byTopic[t] = { seen: 0, correct: 0, total: 0 };
  const idMap = {}; QUESTIONS.forEach(q => idMap[q.id] = q);
  QUESTIONS.forEach(q => { if (byTopic[q.topic]) byTopic[q.topic].total++; });
  for (const id in s.perQ) { const q = idMap[id]; if (!q || !byTopic[q.topic]) continue; byTopic[q.topic].seen += s.perQ[id].seen; byTopic[q.topic].correct += s.perQ[id].correct; }
  return { seen, correct, answeredIds, acc: seen ? Math.round(correct / seen * 100) : 0, byTopic };
}

function viewHome() {
  const st = aggStats();
  const total = QUESTIONS.length, fcDue = Store.flashDue().length, wrong = Store.wrongIds().length;
  const streak = Store.get().streak;
  const exams = Store.get().exams;
  const bestScore = exams.length ? Math.max(...exams.map(e => e.score)) : 0;
  const coverage = total ? Math.round(st.answeredIds / total * 100) : 0;

  const tbars = Object.keys(TOPICS).filter(t => st.byTopic[t].total > 0).map(t => {
    const b = st.byTopic[t]; const pct = b.seen ? Math.round(b.correct / b.seen * 100) : 0;
    return `<div class="tbar"><span class="name" style="color:${topicColor(t)}">${esc(topicLabel(t))}</span>
      <span class="track"><i class="fill" style="width:${b.seen ? pct : 0}%;background:${topicColor(t)}"></i></span>
      <span class="pct">${b.seen ? pct + "%" : "—"}</span></div>`;
  }).join("");

  view.innerHTML = `<div class="wrap">
    <div class="hero">
      <div class="hero-glow"></div>
      <span class="kicker">아두이노 전자회로 · 클로즈드북 대비</span>
      <h1>시험을 부수러 가자 ⚡</h1>
      <p>강의 슬라이드 + 교수님 복습강의 녹취 기반 문제은행으로 실전처럼 풀고, 약점은 오답노트와 플래시카드로 메우세요. ⭐는 교수님 출제 예고 구간입니다.</p>
      <div class="hero-cta">
        <button class="btn lg" data-go="exam">CBT 시험 시작</button>
        <button class="btn ghost lg" data-go="study">공부 모드</button>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><b>${total}</b><span>문제</span></div>
        <div class="hero-stat"><b>${NOTES.length}</b><span>학습 섹션</span></div>
        <div class="hero-stat"><b>${FLASHCARDS.length}</b><span>플래시카드</span></div>
        <div class="hero-stat"><b>${st.acc}%</b><span>내 정답률</span></div>
      </div>
    </div>

    <div class="tiles">
      <div class="tile" data-go="exam"><div class="tile-ico"><svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M9 3h6l1 3H8ZM8 12h8M8 16h5"/></svg></div><h3>실전 모의고사</h3><p>유형·범위·난이도 골라 타이머로 풀기</p></div>
      <div class="tile" data-go="wrong"><div class="tile-ico" style="background:color-mix(in srgb,var(--bad) 16%,transparent);color:var(--bad)"><svg viewBox="0 0 24 24"><path d="M12 3 2 21h20Z"/><path d="M12 10v5M12 18h.01"/></svg></div><h3>오답노트 ${wrong ? `(${wrong})` : ""}</h3><p>틀린 문제만 다시 풀어 약점 제거</p></div>
      <div class="tile" data-go="flash"><div class="tile-ico" style="background:color-mix(in srgb,var(--cyan) 16%,transparent);color:var(--cyan)"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg></div><h3>플래시카드 ${fcDue ? `(${fcDue} 복습)` : ""}</h3><p>간격 반복(Leitner)으로 암기 굳히기</p></div>
      <div class="tile" data-go="sevenseg"><div class="tile-ico" style="background:color-mix(in srgb,var(--star) 16%,transparent);color:var(--star)"><svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 7h6M9 12h6M9 17h6"/></svg></div><h3>7세그 시뮬 ⭐</h3><p>F·2·A 패턴 직접 만들어 보기 (출제 예고!)</p></div>
      <div class="tile" data-go="cheat"><div class="tile-ico" style="background:color-mix(in srgb,var(--accent2) 16%,transparent);color:var(--accent2)"><svg viewBox="0 0 24 24"><path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M8 13h8M8 17h5"/></svg></div><h3>핵심 치트시트</h3><p>시험 직전 30초 컷 · 인쇄/PDF 저장</p></div>
    </div>

    <div class="dash-row">
      <div class="mini">
        <h4>📈 학습 현황</h4>
        <div style="display:flex;gap:26px;align-items:flex-end;flex-wrap:wrap">
          <div><div class="bigstat">${coverage}%</div><div class="muted">문제 커버리지 (${st.answeredIds}/${total})</div></div>
          <div><div class="bigstat" style="font-size:30px">🔥 ${streak.cur}</div><div class="muted">연속 학습일 · 최고 ${streak.best}</div></div>
          <div><div class="bigstat" style="font-size:30px">${exams.length ? bestScore + "점" : "—"}</div><div class="muted">최고 점수 · ${exams.length}회 응시</div></div>
        </div>
      </div>
      <div class="mini">
        <h4>🎯 토픽별 정답률</h4>
        <div class="topic-bars">${tbars || '<p class="muted">아직 푼 문제가 없어요. 시험을 시작하면 여기 약점이 보여요.</p>'}</div>
      </div>
    </div>
  </div>`;
  $$("[data-go]").forEach(b => b.addEventListener("click", () => navTo(b.dataset.go)));
}

/* =========================================================
   STUDY (notes)
   ========================================================= */
function blockHtml(b) {
  switch (b.type) {
    case "subheading": return `<h3>${md(b.text)}</h3>`;
    case "para": return `<p>${md(b.text)}</p>`;
    case "list": {
      const items = (b.items || []).map(it => {
        const bd = it.badge ? " b-" + it.badge : "";
        return `<li class="${bd.trim()}">${md(it.text)}</li>`;
      }).join("");
      return `<ul class="${b.ordered ? "ol" : ""}">${items}</ul>`;
    }
    case "table": {
      const th = (b.headers || []).map(h => `<th>${md(h)}</th>`).join("");
      const tr = (b.rows || []).map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join("")}</tr>`).join("");
      return `<div class="tbl-wrap"><table class="note-tbl">${th ? `<thead><tr>${th}</tr></thead>` : ""}<tbody>${tr}</tbody></table></div>`;
    }
    case "code": return `<pre class="code">${highlight(b.code || "")}</pre>`;
    case "callout": {
      const ic = { star: "⭐", mic: "🎤", warn: "⚠️", info: "💡" }[b.variant] || "💡";
      return `<div class="callout ${b.variant || "info"}"><span class="ci">${ic}</span><div>${md(b.text)}</div></div>`;
    }
    default: return "";
  }
}
function highlight(code) {
  let s = esc(code);
  s = s.replace(/(\/\/[^\n]*)/g, '<span class="cd-cm">$1</span>');
  s = s.replace(/\b(const|int|void|float|long|char|bool|byte|if|else|for|while|return|true|false|HIGH|LOW|OUTPUT|INPUT|INPUT_PULLUP)\b/g, '<span class="cd-kw">$1</span>');
  s = s.replace(/\b(setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|map|constrain|delay|Serial|attach|detach|write|writeMicroseconds)\b/g, '<span class="cd-fn">$1</span>');
  s = s.replace(/\b(\d+)\b/g, '<span class="cd-num">$1</span>');
  return s;
}

function viewStudy() {
  const toc = NOTES.map(n => `<a href="#sec-${n.section}" data-sec="${n.section}" class="${Store.isRead(n.section) ? "read" : ""}">${n.section}. ${esc(n.title)}</a>`).join("");
  const secs = NOTES.map(n => `
    <section class="note-sec" id="sec-${n.section}" data-title="${esc(n.title)}">
      <h2><span class="sec-num">${n.section}</span> ${esc(n.title)} <span class="pages">${esc(n.pages || "")}</span></h2>
      ${(n.notesBlocks || []).map(blockHtml).join("")}
      <div class="sec-readbtn"><button class="btn ghost sm" data-read="${n.section}">${Store.isRead(n.section) ? "✓ 학습 완료됨" : "학습 완료 표시"}</button></div>
    </section>`).join("");

  view.innerHTML = `<div class="wrap">
    <div class="page-head"><h1>공부 모드</h1><p>16개 섹션 전 범위 정리. <b style="color:var(--star)">⭐ 출제 예고</b> · <b style="color:var(--mic)">🎤 교수 구두 강조</b> 표시를 놓치지 마세요.</p></div>
    <div class="study-layout">
      <aside class="toc">
        <input class="toc-search" id="tocSearch" placeholder="🔍 노트 검색…" />
        ${toc}
      </aside>
      <div class="notes-col">${secs || '<p class="empty">노트 데이터를 불러오는 중…</p>'}</div>
    </div>
  </div>`;

  $$("[data-read]").forEach(b => b.addEventListener("click", () => {
    const sec = +b.dataset.read; Store.markRead(sec); b.textContent = "✓ 학습 완료됨";
    const t = $(`.toc a[data-sec="${sec}"]`); t && t.classList.add("read"); toast("학습 완료로 표시했어요 🔥");
  }));
  // smooth scroll + current highlight
  $$(".toc a").forEach(a => a.addEventListener("click", e => {
    e.preventDefault(); const el = $("#" + a.getAttribute("href").slice(1));
    el && el.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  const search = $("#tocSearch");
  search && search.addEventListener("input", () => {
    const q = norm(search.value);
    $$(".note-sec").forEach(sec => {
      const hit = !q || norm(sec.textContent).includes(q);
      sec.style.display = hit ? "" : "none";
      const t = $(`.toc a[data-sec="${sec.id.replace("sec-", "")}"]`); if (t) t.style.display = hit ? "" : "none";
    });
  });
  const io = new IntersectionObserver(es => {
    es.forEach(en => { if (en.isIntersecting) { $$(".toc a").forEach(x => x.classList.remove("cur")); const t = $(`.toc a[data-sec="${en.target.id.replace("sec-", "")}"]`); t && t.classList.add("cur"); } });
  }, { rootMargin: "-20% 0px -70% 0px" });
  $$(".note-sec").forEach(s => io.observe(s));
}

/* =========================================================
   CHEAT SHEET (printable)
   ========================================================= */
function viewCheat() {
  const cards = CHEAT.map(c => `
    <div class="cheat-card" style="--cc:${topicColor(c.k)}">
      <h3><span class="cdot"></span>${esc(c.t)}</h3>
      <ul>${(c.items || []).map(it => `<li>${md(it)}</li>`).join("")}</ul>
    </div>`).join("");
  view.innerHTML = `<div class="wrap cheat-wrap">
    <div class="page-head cheat-head">
      <div><span class="kicker">시험 직전 30초 컷</span><h1>핵심 치트시트</h1>
        <p>강의 슬라이드 + 복습강의 + Notion 총정리에서 시험에 나올 숫자·함정만 추렸습니다. <b style="color:var(--star)">⭐ = 출제 예고</b></p></div>
      <button class="btn ghost sm" id="printBtn" title="인쇄하거나 PDF로 저장">🖨️ 인쇄 / PDF</button>
    </div>
    <div class="cheat-grid">${cards || '<p class="muted">치트시트 데이터를 불러오는 중…</p>'}</div>
  </div>`;
  const pb = $("#printBtn"); if (pb) pb.addEventListener("click", () => { if (window.print) window.print(); });
}

/* =========================================================
   EXAM — setup / run / result
   ========================================================= */
let examCfg = { mode: "practice", count: 20, topics: new Set(), types: new Set(["mc", "ox", "short"]), diff: new Set([1, 2, 3]), starred: false, shuffle: true };

function poolFor(cfg) {
  return QUESTIONS.filter(q =>
    (cfg.topics.size === 0 || cfg.topics.has(q.topic)) &&
    cfg.types.has(q.type) &&
    cfg.diff.has(q.difficulty || 2) &&
    (!cfg.starred || q.starred));
}
function viewExam(params) {
  if (examState) { params[0] === "result" ? renderResult() : renderRun(); return; }
  if (params[0] === "wrong") { startExam({ ...examCfg, mode: "practice", _wrongOnly: true }); return; }
  renderSetup();
}

function renderSetup() {
  const counts = QUESTIONS.reduce((m, q) => (m[q.topic] = (m[q.topic] || 0) + 1, m), {});
  const typeCount = QUESTIONS.reduce((m, q) => (m[q.type] = (m[q.type] || 0) + 1, m), {});
  const avail = poolFor(examCfg).length;
  const topicChips = Object.keys(TOPICS).filter(t => counts[t]).map(t =>
    `<button class="fchip ${examCfg.topics.has(t) ? "on" : ""}" data-topic="${t}"><span class="dot" style="background:${topicColor(t)}"></span>${esc(topicLabel(t))} <span class="cnt">${counts[t]}</span></button>`).join("");
  const typeName = { mc: "객관식", ox: "O/X", short: "단답·서술" };
  const typeChips = ["mc", "ox", "short"].filter(t => typeCount[t]).map(t =>
    `<button class="fchip ${examCfg.types.has(t) ? "on" : ""}" data-type="${t}">${typeName[t]} <span class="cnt">${typeCount[t]}</span></button>`).join("");
  const diffName = { 1: "기본", 2: "이해", 3: "응용" };
  const diffChips = [1, 2, 3].map(d => `<button class="fchip ${examCfg.diff.has(d) ? "on" : ""}" data-diff="${d}">${diffName[d]}</button>`).join("");
  const countOpts = [10, 20, 30, 40, 9999].map(c => `<button data-count="${c}" class="${examCfg.count === c ? "on" : ""}">${c === 9999 ? "전체" : c}</button>`).join("");

  view.innerHTML = `<div class="wrap">
    <div class="page-head"><h1>CBT 시험 설정</h1><p>실전처럼 타이머를 켜거나, 연습 모드로 즉시 해설을 보며 풀 수 있어요.</p></div>
    <div class="setup-grid">
      <div class="opt-group"><label>모드</label>
        <div class="seg" id="modeSeg">
          <button data-mode="practice" class="${examCfg.mode === "practice" ? "on" : ""}">연습 (즉시 채점·해설)</button>
          <button data-mode="real" class="${examCfg.mode === "real" ? "on" : ""}">실전 (타이머·일괄 채점)</button>
        </div>
      </div>
      <div class="opt-group"><label>문항 수</label><div class="seg" id="countSeg">${countOpts}</div></div>
      <div class="opt-group"><label>범위 (토픽) <span class="muted" style="font-weight:400">· 선택 안 하면 전체</span></label><div class="chips-row" id="topicChips">${topicChips}</div></div>
      <div class="opt-group"><label>문제 유형</label><div class="chips-row" id="typeChips">${typeChips}</div></div>
      <div class="opt-group"><label>난이도</label><div class="chips-row" id="diffChips">${diffChips}</div></div>
      <div class="opt-group">
        <div class="switch-row"><div class="lab"><b>⭐ 출제 예고만</b><span>교수님이 사실상 찍어준 문제만</span></div><button class="toggle ${examCfg.starred ? "on" : ""}" id="tgStar"></button></div>
        <div class="switch-row"><div class="lab"><b>문제 섞기</b><span>출제 순서·보기 순서 무작위</span></div><button class="toggle ${examCfg.shuffle ? "on" : ""}" id="tgShuf"></button></div>
      </div>
      <div class="setup-foot">
        <div><b id="availCnt">${avail}</b><span class="muted"> 문제 매칭됨</span></div>
        <button class="btn lg" id="startBtn">시험 시작 →</button>
      </div>
    </div>
  </div>`;

  const upd = () => { $("#availCnt").textContent = poolFor(examCfg).length; };
  $$("#modeSeg button").forEach(b => b.addEventListener("click", () => { examCfg.mode = b.dataset.mode; $$("#modeSeg button").forEach(x => x.classList.toggle("on", x === b)); }));
  $$("#countSeg button").forEach(b => b.addEventListener("click", () => { examCfg.count = +b.dataset.count; $$("#countSeg button").forEach(x => x.classList.toggle("on", x === b)); }));
  $$("#topicChips .fchip").forEach(b => b.addEventListener("click", () => { const t = b.dataset.topic; examCfg.topics.has(t) ? examCfg.topics.delete(t) : examCfg.topics.add(t); b.classList.toggle("on"); upd(); }));
  $$("#typeChips .fchip").forEach(b => b.addEventListener("click", () => { const t = b.dataset.type; if (examCfg.types.has(t)) { if (examCfg.types.size > 1) examCfg.types.delete(t); else return; } else examCfg.types.add(t); b.classList.toggle("on", examCfg.types.has(t)); upd(); }));
  $$("#diffChips .fchip").forEach(b => b.addEventListener("click", () => { const d = +b.dataset.diff; if (examCfg.diff.has(d)) { if (examCfg.diff.size > 1) examCfg.diff.delete(d); else return; } else examCfg.diff.add(d); b.classList.toggle("on", examCfg.diff.has(d)); upd(); }));
  $("#tgStar").addEventListener("click", e => { examCfg.starred = !examCfg.starred; e.target.classList.toggle("on", examCfg.starred); upd(); });
  $("#tgShuf").addEventListener("click", e => { examCfg.shuffle = !examCfg.shuffle; e.target.classList.toggle("on", examCfg.shuffle); });
  $("#startBtn").addEventListener("click", () => startExam(examCfg));
}

function startExam(cfg) {
  let pool;
  if (cfg._wrongOnly) {
    const ids = new Set(Store.wrongIds());
    pool = QUESTIONS.filter(q => ids.has(q.id));
    if (!pool.length) { toast("오답이 없어요! 🎉"); navTo("wrong"); return; }
  } else {
    pool = poolFor(cfg);
    if (!pool.length) { toast("조건에 맞는 문제가 없어요"); return; }
  }
  let list = cfg.shuffle === false ? pool.slice() : shuffle(pool);
  if (!cfg._wrongOnly && cfg.count < 9999) list = list.slice(0, cfg.count);

  examState = {
    cfg, idx: 0, finished: false, startTs: Date.now(), timerInt: null, deadline: null,
    items: list.map(q => {
      let choices = null, correct = null;
      if (q.type === "mc") {
        const order = cfg.shuffle === false ? q.choices.map((_, i) => i) : shuffle(q.choices.map((_, i) => i));
        choices = order.map(i => q.choices[i]); correct = order.indexOf(q.answerIndex);
      } else if (q.type === "ox") { choices = q.choices && q.choices.length === 2 ? q.choices : ["O (맞다)", "X (틀리다)"]; correct = q.answerIndex; }
      return { q, choices, correct, user: null, selfRight: null, flagged: false };
    }),
  };
  if (cfg.mode === "real") {
    const secs = Math.max(60, examState.items.length * 60);
    examState.deadline = Date.now() + secs * 1000;
  }
  navTo("exam");
  renderRun();
}

function renderRun() {
  const es = examState; const it = es.items[es.idx]; const q = it.q; const n = es.items.length;
  const answered = es.items.filter(x => x.user !== null || (x.q.type === "short" && x.userText)).length;
  const showFb = es.cfg.mode === "practice" && it.locked;

  let choicesHtml = "";
  if (q.type === "short") {
    choicesHtml = `<textarea class="short-in" id="shortIn" placeholder="답을 입력하세요…" ${it.locked ? "disabled" : ""}>${esc(it.userText || "")}</textarea>`;
    if (es.cfg.mode === "practice") {
      if (!it.locked) choicesHtml += `<div class="selfgrade"><button class="btn ghost sm" id="revealBtn">정답 확인 →</button></div>`;
      else choicesHtml += `<div class="short-model"><b>모범답안</b><div>${md(q.answerText || "")}</div></div>
        <div class="selfgrade"><button class="btn sm" id="sgOk" style="background:var(--ok)">✓ 맞았어요</button><button class="btn sm danger" id="sgNo">✗ 틀렸어요</button></div>`;
    }
  } else {
    choicesHtml = `<div class="choices">${it.choices.map((c, i) => {
      let cls = "choice";
      if (it.locked) {
        cls += " locked";
        if (i === it.correct) cls += " correct";
        else if (i === it.user) cls += " wrong";
      } else if (i === it.user) cls += " sel";
      return `<button class="${cls}" data-choice="${i}"><span class="key">${String.fromCharCode(65 + i)}</span><span>${md(c)}</span></button>`;
    }).join("")}</div>`;
  }

  const timer = es.cfg.mode === "real"
    ? `<span class="timer" id="timer">--:--</span>` : "";
  const diffDots = `<span class="diff">${[1, 2, 3].map(d => `<i class="${(q.difficulty || 2) >= d ? "on" : ""}"></i>`).join("")}</span>`;

  view.innerHTML = `<div class="wrap">
    <div class="exam-top">
      <span class="qcount">${es.idx + 1} / ${n}</span>
      <span class="exam-progress"><i style="width:${(es.idx + 1) / n * 100}%"></i></span>
      ${timer}
      <button class="icon-btn" id="flagBtn" title="검토 표시 (F)" style="${it.flagged ? "color:var(--warn);border-color:var(--warn)" : ""}"><svg viewBox="0 0 24 24"><path d="M5 21V4h11l-2 4 2 4H5"/></svg></button>
    </div>

    <div class="qcard">
      <div class="qmeta">
        <span class="qtype ${q.type}">${{ mc: "객관식", ox: "O / X", short: "단답·서술" }[q.type]}</span>
        ${q.starred ? '<span class="tag star">⭐ 출제예고</span>' : ""}
        <span class="tag" style="color:${topicColor(q.topic)}"><span class="dot" style="background:${topicColor(q.topic)}"></span>${esc(topicLabel(q.topic))}</span>
        ${diffDots}
        <span class="tag" style="margin-left:auto">${esc(q.source || "")}</span>
      </div>
      <p class="qtext">${md(q.question)}</p>
      ${choicesHtml}
      ${showFb ? `<div class="explain"><div class="ex-h">💡 해설</div><div>${md(q.explanation || "")}</div><span class="src">출처 ${esc(q.source || "")}</span></div>` : ""}
    </div>

    <div class="exam-nav">
      <button class="btn ghost" id="prevBtn" ${es.idx === 0 ? "disabled" : ""}>← 이전</button>
      <div class="spacer"></div>
      <span class="muted">${answered}/${n} 응답</span>
      ${es.idx < n - 1 ? `<button class="btn" id="nextBtn">다음 →</button>` : `<button class="btn" id="submitBtn" style="background:var(--ok)">제출하고 채점 →</button>`}
    </div>

    <div class="palette" id="palette">${es.items.map((x, i) => {
      let cls = "pcell"; if (i === es.idx) cls += " cur";
      if (x.user !== null || x.userText) cls += " answered"; if (x.flagged) cls += " flag";
      return `<button class="${cls}" data-jump="${i}">${i + 1}</button>`;
    }).join("")}</div>
  </div>`;

  // bind
  $$("[data-choice]").forEach(b => b.addEventListener("click", () => selectChoice(+b.dataset.choice)));
  const si = $("#shortIn"); if (si) si.addEventListener("input", () => { it.userText = si.value; });
  $("#revealBtn") && $("#revealBtn").addEventListener("click", () => { it.locked = true; renderRun(); });
  $("#sgOk") && $("#sgOk").addEventListener("click", () => { it.selfRight = true; gotoNext(); });
  $("#sgNo") && $("#sgNo").addEventListener("click", () => { it.selfRight = false; gotoNext(); });
  $("#prevBtn") && $("#prevBtn").addEventListener("click", () => { if (es.idx > 0) { es.idx--; renderRun(); } });
  $("#nextBtn") && $("#nextBtn").addEventListener("click", gotoNext);
  $("#submitBtn") && $("#submitBtn").addEventListener("click", confirmSubmit);
  $("#flagBtn").addEventListener("click", () => { it.flagged = !it.flagged; renderRun(); });
  $$("[data-jump]").forEach(b => b.addEventListener("click", () => { saveShort(); es.idx = +b.dataset.jump; renderRun(); }));
  startTimer();
}
function saveShort() { const es = examState, it = es.items[es.idx]; const si = $("#shortIn"); if (si) it.userText = si.value; }
function selectChoice(i) {
  const es = examState, it = es.items[es.idx];
  if (it.locked) return;
  it.user = i;
  if (es.cfg.mode === "practice") { it.locked = true; renderRun(); }
  else { renderRun(); } // real: just mark, allow change
}
function gotoNext() {
  saveShort(); const es = examState;
  if (es.idx < es.items.length - 1) { es.idx++; renderRun(); }
  else confirmSubmit();
}
function startTimer() {
  const es = examState; if (es.cfg.mode !== "real" || es.finished) return;
  const tEl = $("#timer"); if (!tEl) return;
  clearInterval(es.timerInt);
  const tick = () => {
    const left = Math.round((es.deadline - Date.now()) / 1000);
    const el = $("#timer"); if (!el) { clearInterval(es.timerInt); return; }
    el.textContent = fmtTime(left); el.classList.toggle("warn", left <= 60);
    if (left <= 0) { clearInterval(es.timerInt); toast("시간 종료! 자동 제출됩니다"); doSubmit(); }
  };
  tick(); es.timerInt = setInterval(tick, 1000);
}
function confirmSubmit() {
  saveShort();
  const es = examState; const un = es.items.filter(x => x.user === null && !x.userText).length;
  modal({
    title: "제출할까요?", confirm: "제출", cancel: "더 풀기",
    body: `<p>${un ? `<b style="color:var(--warn)">${un}개 미응답</b>이 있어요. ` : ""}지금 제출하면 채점됩니다.</p>`,
    onConfirm: () => doSubmit(),
  });
}
function doSubmit() {
  const es = examState; if (es.finished) return; es.finished = true; clearInterval(es.timerInt);
  es.durationSec = Math.round((Date.now() - es.startTs) / 1000);
  // grade
  es.items.forEach(it => {
    const q = it.q; let correct;
    if (q.type === "short") {
      if (it.selfRight === null) it.selfRight = matchShort(it.userText, q); // real mode auto-grade
      correct = !!it.selfRight;
    } else correct = it.user !== null && it.user === it.correct;
    it.correctBool = correct;
    Store.recordQ(q.id, correct);
  });
  const correct = es.items.filter(x => x.correctBool).length;
  const score = Math.round(correct / es.items.length * 100);
  const byTopic = {}, byType = {};
  es.items.forEach(it => {
    const t = it.q.topic, ty = it.q.type;
    (byTopic[t] = byTopic[t] || { c: 0, n: 0 }).n++; if (it.correctBool) byTopic[t].c++;
    (byType[ty] = byType[ty] || { c: 0, n: 0 }).n++; if (it.correctBool) byType[ty].c++;
  });
  Store.addExam({ ts: Date.now(), mode: es.cfg.mode, total: es.items.length, correct, score, durationSec: es.durationSec, byTopic, byType });
  es.result = { correct, score, byTopic, byType };
  navTo("exam/result"); renderResult();
}
function matchShort(user, q) {
  const u = norm(user); if (!u || u.length < 1) return false;
  const cands = [q.answerText || "", ...(q.acceptable || [])].map(norm).filter(Boolean);
  return cands.some(c => c.length >= 1 && (u.includes(c) || c.includes(u)));
}

function renderResult() {
  const es = examState; if (!es || !es.result) { navTo("exam"); return; }
  const r = es.result; const n = es.items.length; const pass = r.score >= 60;
  const topicRows = Object.keys(r.byTopic).map(t => { const b = r.byTopic[t]; const p = Math.round(b.c / b.n * 100);
    return `<div class="tbar"><span class="name" style="color:${topicColor(t)}">${esc(topicLabel(t))}</span><span class="track"><i class="fill" style="width:${p}%;background:${topicColor(t)}"></i></span><span class="pct">${b.c}/${b.n}</span></div>`; }).join("");

  const review = es.items.map((it, i) => {
    const q = it.q; const ok = it.correctBool;
    let your = "", ans = "";
    if (q.type === "short") {
      your = it.userText ? esc(it.userText) : "<i>미응답</i>";
      ans = md(q.answerText || "");
    } else {
      your = it.user !== null ? esc(it.choices[it.user]) : "<i>미응답</i>";
      ans = esc(it.choices[it.correct]);
    }
    return `<div class="review-item ${ok ? "ok" : "no"}" data-rev="${i}">
      <div class="ri-q"><span class="tag ${ok ? "" : "star"}" style="${ok ? "color:var(--ok)" : ""}">${ok ? "정답" : "오답"}</span> <b>Q${i + 1}.</b> ${md(q.question)}</div>
      ${q.type !== "short" || it.userText ? `<div class="ri-line"><span class="muted">내 답: </span><span class="${ok ? "ans" : "yours"}">${your}</span></div>` : ""}
      <div class="ri-line"><span class="muted">정답: </span><span class="ans">${ans}</span></div>
      <div class="ri-line muted" style="margin-top:6px">💡 ${md(q.explanation || "")} <span style="opacity:.7">(${esc(q.source || "")})</span></div>
      ${q.type === "short" ? `<div class="selfgrade" style="margin-top:8px">
        <button class="btn ghost sm" data-self="${i}:1">✓ 맞은 걸로</button>
        <button class="btn ghost sm" data-self="${i}:0">✗ 틀린 걸로</button></div>` : ""}
    </div>`;
  }).join("");

  view.innerHTML = `<div class="wrap">
    <div class="result-hero">
      <div class="ring" style="--p:${r.score};${pass ? "" : "background:conic-gradient(var(--bad) calc(var(--p)*1%),var(--surf3) 0)"}"><div class="rv"><b>${r.score}</b><span>점 / 100</span></div></div>
      <div class="pass-badge ${pass ? "pass" : "fail"}">${pass ? "합격선 통과 🎉" : "합격선(60) 미달 — 다시!"}</div>
      <div class="res-stats">
        <div><b style="color:var(--ok)">${r.correct}</b><span>정답</span></div>
        <div><b style="color:var(--bad)">${n - r.correct}</b><span>오답</span></div>
        <div><b>${fmtTime(es.durationSec)}</b><span>소요시간</span></div>
        <div><b>${es.cfg.mode === "real" ? "실전" : "연습"}</b><span>모드</span></div>
      </div>
      <div class="hero-cta" style="justify-content:center;margin-top:22px">
        ${n - r.correct > 0 ? `<button class="btn" id="retryWrong">틀린 ${n - r.correct}문제 다시</button>` : ""}
        <button class="btn ghost" id="again">새 시험</button>
        <button class="btn ghost" id="goWrong">오답노트</button>
      </div>
    </div>
    <div class="mini" style="margin-bottom:18px"><h4>🎯 토픽별 결과</h4><div class="topic-bars">${topicRows}</div></div>
    <div class="page-head" style="margin:24px 0 12px"><h1 style="font-size:20px">문제 리뷰</h1></div>
    ${review}
  </div>`;

  $("#again").addEventListener("click", () => { examState = null; navTo("exam"); });
  $("#goWrong").addEventListener("click", () => { examState = null; navTo("wrong"); });
  $("#retryWrong") && $("#retryWrong").addEventListener("click", () => {
    const wrongQ = es.items.filter(x => !x.correctBool).map(x => x.q);
    examState = null; examCfg = { ...examCfg };
    startFromList(wrongQ, "practice");
  });
  $$("[data-self]").forEach(b => b.addEventListener("click", () => {
    const [i, v] = b.dataset.self.split(":"); const it = es.items[+i]; const good = v === "1";
    if (good) { Store.clearWrong(it.q.id); } else { Store.recordQ(it.q.id, false); }
    const card = $(`[data-rev="${i}"]`); card.classList.toggle("ok", good); card.classList.toggle("no", !good);
    toast(good ? "오답노트에서 제외했어요" : "오답노트에 추가했어요");
  }));
}
function startFromList(qs, mode) {
  if (!qs.length) { toast("문제가 없어요"); return; }
  examState = { cfg: { mode, shuffle: true }, idx: 0, finished: false, startTs: Date.now(), timerInt: null, deadline: null,
    items: shuffle(qs).map(q => {
      let choices = null, correct = null;
      if (q.type === "mc") { const order = shuffle(q.choices.map((_, i) => i)); choices = order.map(i => q.choices[i]); correct = order.indexOf(q.answerIndex); }
      else if (q.type === "ox") { choices = q.choices && q.choices.length === 2 ? q.choices : ["O (맞다)", "X (틀리다)"]; correct = q.answerIndex; }
      return { q, choices, correct, user: null, selfRight: null, flagged: false };
    }) };
  navTo("exam"); renderRun();
}

/* =========================================================
   WRONG NOTES
   ========================================================= */
function viewWrong() {
  const ids = Store.wrongIds(); const map = {}; QUESTIONS.forEach(q => map[q.id] = q);
  const items = ids.map(id => map[id]).filter(Boolean);
  if (!items.length) {
    view.innerHTML = `<div class="wrap"><div class="page-head"><h1>오답노트</h1></div>
      <div class="empty"><div class="ei">🎯</div><p>아직 오답이 없어요.<br>CBT 시험을 풀면 틀린 문제가 여기에 모입니다.</p>
      <button class="btn" style="margin-top:16px" id="goExam">시험 풀러 가기</button></div></div>`;
    $("#goExam").addEventListener("click", () => navTo("exam")); return;
  }
  const byTopic = {}; items.forEach(q => (byTopic[q.topic] = byTopic[q.topic] || []).push(q));
  const groups = Object.keys(byTopic).map(t => `
    <div class="mini" style="margin-bottom:14px">
      <h4 style="color:${topicColor(t)}"><span class="dot" style="background:${topicColor(t)}"></span> ${esc(topicLabel(t))} · ${byTopic[t].length}문제</h4>
      ${byTopic[t].map(q => `<div class="review-item no" style="margin-bottom:8px">
        <div class="ri-q"><b>${q.starred ? "⭐ " : ""}</b>${md(q.question)}</div>
        <div class="ri-line"><span class="muted">정답: </span><span class="ans">${q.type === "short" ? md(q.answerText || "") : esc(q.choices[q.answerIndex])}</span></div>
        <div class="ri-line muted">💡 ${md(q.explanation || "")}</div>
        <div class="selfgrade" style="margin-top:8px"><button class="btn ghost sm" data-clear="${q.id}">✓ 이제 알아요</button></div>
      </div>`).join("")}
    </div>`).join("");

  view.innerHTML = `<div class="wrap">
    <div class="page-head"><h1>오답노트 <span class="tag" style="vertical-align:middle">${items.length}문제</span></h1><p>틀린 문제만 모았어요. 다시 풀어 약점을 없애세요.</p></div>
    <div class="hero-cta" style="margin-bottom:18px"><button class="btn" id="retryAll">오답 전체 다시 풀기 →</button></div>
    ${groups}</div>`;
  $("#retryAll").addEventListener("click", () => startFromList(items, "practice"));
  $$("[data-clear]").forEach(b => b.addEventListener("click", () => { Store.clearWrong(b.dataset.clear); toast("오답노트에서 제외했어요"); render(); }));
}

/* =========================================================
   FLASHCARDS (Leitner)
   ========================================================= */
let flashDeck = null, flashIdx = 0, flashFlip = false;
function viewFlash(params) {
  if (!FLASHCARDS.length) { view.innerHTML = `<div class="wrap"><div class="empty"><div class="ei">🃏</div><p>플래시카드 데이터를 불러오는 중…</p></div></div>`; return; }
  if (!flashDeck) buildDeck("due");
  renderFlash();
}
function buildDeck(which, topic) {
  let cards = FLASHCARDS.slice();
  if (topic) cards = cards.filter(c => c.topic === topic);
  if (which === "due") { const due = Store.flashDue().map(c => c.id); const set = new Set(due); const d = cards.filter(c => set.has(c.id)); cards = d.length ? d : cards; }
  if (which === "star") cards = cards.filter(c => c.starred);
  flashDeck = shuffle(cards); flashIdx = 0; flashFlip = false;
}
function renderFlash() {
  if (!flashDeck.length) { buildDeck("all"); }
  if (flashIdx >= flashDeck.length) return renderFlashDone();
  const c = flashDeck[flashIdx]; const f = Store.flashState(c.id);
  const boxDist = [1, 2, 3, 4, 5].map(b => FLASHCARDS.filter(x => (Store.get().flash[x.id] || { box: 1 }).box === b).length);

  view.innerHTML = `<div class="wrap">
    <div class="page-head"><h1>플래시카드</h1><p>카드를 눌러 뒤집고, <b>알아요/몰라요</b>로 채점하면 간격 반복으로 다시 출제돼요.</p></div>
    <div class="seg" style="margin-bottom:6px" id="deckSeg">
      <button data-deck="due">복습할 카드</button><button data-deck="all">전체</button><button data-deck="star">⭐만</button>
    </div>
    <div class="flash-meta">${flashIdx + 1} / ${flashDeck.length} · <span style="color:${topicColor(c.topic)}">${esc(topicLabel(c.topic))}</span> · 상자 ${f.box}/5</div>
    <div class="flash-stage">
      <div class="fcard ${flashFlip ? "flip" : ""}" id="fcard">
        <div class="fface front"><span class="ftag">${c.starred ? "⭐ " : ""}${esc(topicLabel(c.topic))}</span><div class="fq">${md(c.front)}</div><span class="fhint">눌러서 정답 보기</span></div>
        <div class="fface back"><span class="ftag">정답</span><div class="fa">${md(c.back)}</div><span class="fhint">아래에서 채점하세요</span></div>
      </div>
    </div>
    <div class="flash-controls">
      <button class="btn ghost" id="prevC">← 이전</button>
      <button class="btn danger" id="noC">몰라요</button>
      <button class="btn" id="okC" style="background:var(--ok)">알아요 ✓</button>
    </div>
    <div class="box-pills">${boxDist.map((n, i) => `<span class="box-pill">상자${i + 1}: ${n}</span>`).join("")}</div>
  </div>`;

  $$("#deckSeg button").forEach(b => b.addEventListener("click", () => { buildDeck(b.dataset.deck); renderFlash(); }));
  $("#fcard").addEventListener("click", () => { flashFlip = !flashFlip; $("#fcard").classList.toggle("flip", flashFlip); });
  $("#prevC").addEventListener("click", () => { if (flashIdx > 0) { flashIdx--; flashFlip = false; renderFlash(); } });
  $("#okC").addEventListener("click", () => grade(true));
  $("#noC").addEventListener("click", () => grade(false));
  function grade(known) { Store.gradeFlash(c.id, known); flashIdx++; flashFlip = false; refreshBadges(); renderFlash(); }
}
function renderFlashDone() {
  view.innerHTML = `<div class="wrap"><div class="empty"><div class="ei">🎉</div><p>이 덱을 다 봤어요!<br>다른 덱을 고르거나 다시 섞어 보세요.</p>
    <div class="hero-cta" style="justify-content:center;margin-top:16px">
      <button class="btn" id="d-all">전체 다시</button><button class="btn ghost" id="d-star">⭐만</button><button class="btn ghost" id="d-home">홈으로</button></div></div></div>`;
  $("#d-all").addEventListener("click", () => { buildDeck("all"); renderFlash(); });
  $("#d-star").addEventListener("click", () => { buildDeck("star"); renderFlash(); });
  $("#d-home").addEventListener("click", () => navTo("home"));
}

/* =========================================================
   7-SEGMENT SIMULATOR
   ========================================================= */
let segLit = new Set(), segTarget = null;
function segByte(set) { const o = SEG_ORDER; let b = 0; o.forEach((s, i) => { if (set.has(s)) b |= (1 << (7 - i)); }); return b; }
function binStr(byte) { const s = byte.toString(2).padStart(8, "0"); return s.slice(0, 4) + " " + s.slice(4); }
function hexStr(byte) { return "0x" + byte.toString(16).toUpperCase().padStart(2, "0"); }

function viewSeg() {
  const anode = Store.settings().anode;
  renderSeg(anode);
}
function renderSeg(anode) {
  const byte = segByte(segLit);
  const inv = (~byte) & 0xFF;
  const litList = SEG_ORDER.filter(s => segLit.has(s)).join(", ") || "—";
  let challenge = "";
  if (segTarget) {
    const want = new Set(SEG_BY_CHAR[segTarget].segs.split(""));
    const match = want.size === segLit.size && [...want].every(s => segLit.has(s));
    challenge = `<div class="challenge-status ${match ? "go" : "no"}">${match ? `정답! '${segTarget}' 완성 🎉` : `'${segTarget}' 만드는 중…`}</div>`;
  }
  const targets = SEG_PATTERNS.map(p => `<button class="target-btn ${segTarget === p.ch ? "active" : ""}" data-target="${p.ch}">${p.ch}</button>`).join("");

  view.innerHTML = `<div class="wrap">
    <div class="page-head"><h1>7세그먼트 시뮬레이터 <span class="tag star">⭐ 출제 예고</span></h1>
      <p>세그먼트를 눌러 켜고 끄면서 패턴을 익히세요. 교수님: <i>"커먼 캐소드에서 F·2·A를 만들려면 패턴이 어떻게 되느냐"</i> — 직접 만들어 보세요.</p></div>
    <div class="seg-layout">
      <div class="seg-stage">
        <div class="anode-row">
          <div class="seg" id="anodeSeg">
            <button data-an="0" class="${!anode ? "on" : ""}">공통 음극 (HIGH=켜짐)</button>
            <button data-an="1" class="${anode ? "on" : ""}">공통 양극 (LOW=켜짐)</button>
          </div>
        </div>
        <div class="seg-display" id="segDisplay">
          <div class="seg seg-h seg-a ${segLit.has("a") ? "on" : ""}" data-seg="a"></div>
          <div class="seg seg-v seg-b ${segLit.has("b") ? "on" : ""}" data-seg="b"></div>
          <div class="seg seg-v seg-c ${segLit.has("c") ? "on" : ""}" data-seg="c"></div>
          <div class="seg seg-h seg-d ${segLit.has("d") ? "on" : ""}" data-seg="d"></div>
          <div class="seg seg-v seg-e ${segLit.has("e") ? "on" : ""}" data-seg="e"></div>
          <div class="seg seg-v seg-f ${segLit.has("f") ? "on" : ""}" data-seg="f"></div>
          <div class="seg seg-h seg-g ${segLit.has("g") ? "on" : ""}" data-seg="g"></div>
          <div class="seg seg-dp ${segLit.has("dp") ? "on" : ""}" data-seg="dp"></div>
        </div>
        <div class="seg-readout">
          <div class="ro-row"><span class="l">켜진 세그먼트</span><span class="v">${litList}</span></div>
          <div class="ro-row"><span class="l">2진수 (A B C D E F G · DP)</span><span class="v">${binStr(anode ? inv : byte)}</span></div>
          <div class="ro-row"><span class="l">16진수 (${anode ? "공통 양극" : "공통 음극"} 제어값)</span><span class="v hex">${hexStr(anode ? inv : byte)}</span></div>
        </div>
      </div>
      <div class="seg-side">
        <div class="card"><h4>목표 문자 만들기</h4>
          <div class="target-grid">${targets}</div>
          ${challenge}
          <div class="hero-cta" style="margin-top:12px;gap:8px">
            <button class="btn ghost sm" id="showAns" ${segTarget ? "" : "disabled"}>정답 패턴 보기</button>
            <button class="btn ghost sm" id="clearSeg">전부 끄기</button>
          </div>
        </div>
        <div class="card"><h4>패턴 빠른 참조</h4>
          <div class="tbl-wrap"><table class="note-tbl"><thead><tr><th>문자</th><th>세그먼트</th><th>HEX(CC)</th></tr></thead><tbody>
          ${SEG_PATTERNS.map(p => `<tr><td><b>${p.ch}</b></td><td>${p.segs}</td><td style="color:var(--cyan)">${p.hex}</td></tr>`).join("")}
          </tbody></table></div>
          <p class="muted" style="font-size:12px;margin-top:8px">CC=공통 음극 기준. 공통 양극은 비트를 반전(0↔1)하면 됩니다.</p>
        </div>
      </div>
    </div>
  </div>`;

  $$("[data-seg]").forEach(el => el.addEventListener("click", () => { const s = el.dataset.seg; segLit.has(s) ? segLit.delete(s) : segLit.add(s); renderSeg(Store.settings().anode); }));
  $$("#anodeSeg button").forEach(b => b.addEventListener("click", () => { Store.setSetting("anode", b.dataset.an === "1"); renderSeg(b.dataset.an === "1"); }));
  $$("[data-target]").forEach(b => b.addEventListener("click", () => { segTarget = b.dataset.target; renderSeg(Store.settings().anode); }));
  $("#showAns").addEventListener("click", () => { if (segTarget) { segLit = new Set(SEG_BY_CHAR[segTarget].segs.split("")); renderSeg(Store.settings().anode); } });
  $("#clearSeg").addEventListener("click", () => { segLit = new Set(); renderSeg(Store.settings().anode); });
}

/* =========================================================
   STATS
   ========================================================= */
function viewStats() {
  const s = Store.get(); const st = aggStats();
  const exams = s.exams;
  const avg = exams.length ? Math.round(exams.reduce((a, e) => a + e.score, 0) / exams.length) : 0;
  const best = exams.length ? Math.max(...exams.map(e => e.score)) : 0;
  const fcMastered = FLASHCARDS.filter(c => (s.flash[c.id] || { box: 1 }).box >= 4).length;

  const tbars = Object.keys(TOPICS).filter(t => st.byTopic[t].total > 0).map(t => {
    const b = st.byTopic[t]; const pct = b.seen ? Math.round(b.correct / b.seen * 100) : 0;
    return `<div class="tbar"><span class="name" style="color:${topicColor(t)}">${esc(topicLabel(t))}</span><span class="track"><i class="fill" style="width:${b.seen ? pct : 4}%;background:${b.seen ? topicColor(t) : "var(--surf3)"}"></i></span><span class="pct">${b.seen ? pct + "%" : "—"}</span></div>`;
  }).join("");

  const typeName = { mc: "객관식", ox: "O/X", short: "단답·서술" };
  const byType = { mc: { c: 0, n: 0 }, ox: { c: 0, n: 0 }, short: { c: 0, n: 0 } };
  const idMap = {}; QUESTIONS.forEach(q => idMap[q.id] = q);
  for (const id in s.perQ) { const q = idMap[id]; if (!q) continue; byType[q.type].c += s.perQ[id].correct; byType[q.type].n += s.perQ[id].seen; }

  const hist = exams.slice(0, 14).map(e => {
    const d = new Date(e.ts); const ds = (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    return `<div class="hist-row"><div class="hscore" style="color:${e.score >= 60 ? "var(--ok)" : "var(--bad)"}">${e.score}</div>
      <div class="hmeta">${e.correct}/${e.total} 정답 · ${e.mode === "real" ? "실전" : "연습"} · ${fmtTime(e.durationSec || 0)}</div>
      <div class="hdate">${ds}</div></div>`;
  }).join("");

  view.innerHTML = `<div class="wrap">
    <div class="page-head"><h1>통계</h1><p>약점이 보이면 그 토픽만 골라 다시 풀어 보세요.</p></div>
    <div class="stat-cards">
      <div class="stat-card"><div class="sv">${st.acc}%</div><div class="sl">전체 정답률 (${st.correct}/${st.seen})</div></div>
      <div class="stat-card"><div class="sv">${st.answeredIds}</div><div class="sl">푼 문제 수 / ${QUESTIONS.length}</div></div>
      <div class="stat-card"><div class="sv">${exams.length}</div><div class="sl">시험 응시 · 평균 ${avg}점</div></div>
      <div class="stat-card"><div class="sv">${best}</div><div class="sl">최고 점수</div></div>
      <div class="stat-card"><div class="sv">🔥 ${s.streak.cur}</div><div class="sl">연속 학습일 · 최고 ${s.streak.best}</div></div>
      <div class="stat-card"><div class="sv">${fcMastered}</div><div class="sl">암기 완료 카드 / ${FLASHCARDS.length}</div></div>
    </div>
    <div class="dash-row">
      <div class="mini"><h4>🎯 토픽별 정답률</h4><div class="topic-bars">${tbars || '<p class="muted">데이터 없음</p>'}</div></div>
      <div class="mini"><h4>🧩 유형별 정답률</h4><div class="topic-bars">${["mc", "ox", "short"].map(t => { const b = byType[t]; const p = b.n ? Math.round(b.c / b.n * 100) : 0; return `<div class="tbar"><span class="name">${typeName[t]}</span><span class="track"><i class="fill" style="width:${b.n ? p : 4}%"></i></span><span class="pct">${b.n ? p + "%" : "—"}</span></div>`; }).join("")}</div></div>
    </div>
    <div class="mini" style="margin-top:16px"><h4>📝 최근 시험 기록</h4>${hist || '<p class="muted">아직 본 시험이 없어요.</p>'}</div>
  </div>`;
}

/* =========================================================
   boot
   ========================================================= */
function closeSidebar() { $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("show"); }
function init() {
  applyTheme(Store.settings().theme || "dark");
  refreshDday(); refreshBadges();

  $("#themeToggle").addEventListener("click", () => { const t = Store.settings().theme === "dark" ? "light" : "dark"; Store.setSetting("theme", t); applyTheme(t); });
  $("#menuToggle").addEventListener("click", () => { $("#sidebar").classList.toggle("open"); $("#scrim").classList.toggle("show"); });
  $("#scrim").addEventListener("click", closeSidebar);
  $("#ddayChip").addEventListener("click", () => {
    modal({ title: "시험일 설정", confirm: "저장", cancel: "취소",
      body: `<p>D-day 카운트다운에 쓸 시험 날짜를 골라주세요.</p><input type="date" id="exDate" value="${Store.settings().examDate || ""}" />`,
      onConfirm: (back) => { const v = $("#exDate", back).value; Store.setSetting("examDate", v || null); refreshDday(); toast(v ? "시험일 저장됨 ⏰" : "시험일 해제됨"); } });
  });
  $("#resetBtn").addEventListener("click", () => {
    modal({ title: "데이터 초기화", confirm: "초기화", cancel: "취소",
      body: `<p>학습 기록·오답·통계·플래시카드 진행도가 모두 삭제됩니다. 되돌릴 수 없어요.</p>`,
      onConfirm: () => { Store.reset(); applyTheme("dark"); refreshDday(); refreshBadges(); examState = null; flashDeck = null; navTo("home"); render(); toast("초기화 완료"); } });
  });

  // global keyboard (exam)
  document.addEventListener("keydown", e => {
    if (parseHash().route !== "exam" || !examState || examState.finished) return;
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const it = examState.items[examState.idx];
    if (["1", "2", "3", "4", "5"].includes(e.key) && it && it.choices && !it.locked) { const i = +e.key - 1; if (i < it.choices.length) selectChoice(i); }
    else if (e.key === "ArrowRight") { $("#nextBtn") && $("#nextBtn").click(); }
    else if (e.key === "ArrowLeft") { $("#prevBtn") && $("#prevBtn").click(); }
    else if (e.key.toLowerCase() === "f") { it.flagged = !it.flagged; renderRun(); }
  });

  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#/home";
  render();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
