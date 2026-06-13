/* ============ persistent store (localStorage) ============ */
(function () {
  const KEY = "ec_cbt_v1";
  const DEFAULTS = {
    settings: { theme: "dark", examDate: null, anode: false },
    perQ: {},            // id -> {seen, correct, wrong}
    exams: [],           // history
    wrong: {},           // id -> {count, ts}
    flash: {},           // cardId -> {box, due, seen, correct}
    studyRead: {},       // section# -> ts
    streak: { last: null, cur: 0, best: 0 },
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const d = JSON.parse(raw);
      return Object.assign(structuredClone(DEFAULTS), d, {
        settings: Object.assign({}, DEFAULTS.settings, d.settings),
        streak: Object.assign({}, DEFAULTS.streak, d.streak),
      });
    } catch (e) { return structuredClone(DEFAULTS); }
  }

  const state = load();

  const Store = {
    get: () => state,
    settings: () => state.settings,
    save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} },

    setSetting(k, v) { state.settings[k] = v; this.save(); },

    /* ---- study streak (count any "today" with activity) ---- */
    touchStreak() {
      const t = todayKey();
      const s = state.streak;
      if (s.last === t) return;
      const y = dayShift(t, -1);
      s.cur = (s.last === y) ? s.cur + 1 : 1;
      s.last = t;
      s.best = Math.max(s.best || 0, s.cur);
      this.save();
    },

    /* ---- per-question result ---- */
    recordQ(id, correct) {
      const q = state.perQ[id] || (state.perQ[id] = { seen: 0, correct: 0, wrong: 0 });
      q.seen++;
      if (correct) { q.correct++; delete state.wrong[id]; }
      else { q.wrong++; const w = state.wrong[id] || (state.wrong[id] = { count: 0, ts: 0 }); w.count++; w.ts = Date.now(); }
      this.touchStreak();
      this.save();
    },
    clearWrong(id) { delete state.wrong[id]; this.save(); },
    wrongIds() { return Object.keys(state.wrong); },

    /* ---- exam history ---- */
    addExam(rec) { state.exams.unshift(rec); if (state.exams.length > 60) state.exams.pop(); this.save(); },

    /* ---- flashcards (Leitner) ---- */
    flashState(id) { return state.flash[id] || (state.flash[id] = { box: 1, due: 0, seen: 0, correct: 0 }); },
    gradeFlash(id, known) {
      const f = this.flashState(id);
      f.seen++;
      if (known) { f.correct++; f.box = Math.min(5, f.box + 1); }
      else { f.box = 1; }
      const days = [0, 0, 1, 3, 7, 16][f.box] || 1;
      f.due = Date.now() + days * 864e5;
      this.touchStreak();
      this.save();
    },
    flashDue() {
      const now = Date.now();
      return (window.FLASHCARDS || []).filter(c => { const f = state.flash[c.id]; return !f || f.due <= now; });
    },

    /* ---- study read ---- */
    markRead(sec) { state.studyRead[sec] = Date.now(); this.touchStreak(); this.save(); },
    isRead(sec) { return !!state.studyRead[sec]; },

    reset() { localStorage.removeItem(KEY); Object.assign(state, structuredClone(DEFAULTS)); },
  };

  function todayKey() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function dayShift(key, n) { const p = key.split("-").map(Number); const d = new Date(p[0], p[1] - 1, p[2] + n); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }

  window.Store = Store;
})();
