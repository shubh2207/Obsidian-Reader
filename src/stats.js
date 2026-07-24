import { __ertr } from "./i18n.js";

export function readerTodayKey() {
  try {
    return window.moment ? window.moment().format("YYYY-MM-DD") : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  } catch (e) {
    return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
}
export function fmtReadTime(sec) {
  const total = Math.max(0, Math.floor(sec || 0));
  if (total < 60) return total > 0 ? __ertr("\u043C\u0435\u043D\u044C\u0448\u0435 \u043C\u0438\u043D\u0443\u0442\u044B") : "\u2014";
  const mins = Math.floor(total / 60);
  if (mins < 60) return __ertr("{0} \u043C\u0438\u043D", mins);
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h < 24) return m ? __ertr("{0} \u0447 {1} \u043C\u0438\u043D", h, m) : __ertr("{0} \u0447", h);
  const d = Math.floor(h / 24), rh = h % 24;
  return rh ? __ertr("{0} \u0434 {1} \u0447", d, rh) : __ertr("{0} \u0434", d);
}
export function shiftDayKey(key, delta) {
  const d = /* @__PURE__ */ new Date(key + "T12:00:00Z");
  if (isNaN(d.getTime())) return key;
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
export function readingStreak(log, todayKey) {
  if (!log) return 0;
  const hit = (k) => (log[k] || 0) > 0;
  let cur = todayKey;
  if (!hit(cur)) {
    cur = shiftDayKey(cur, -1);
    if (!hit(cur)) return 0;
  }
  let n = 0;
  while (hit(cur) && n < 4e3) {
    n++;
    cur = shiftDayKey(cur, -1);
  }
  return n;
}
export function readingStats(log, lifetimeSeconds, todayKey) {
  const l = log || {};
  const keys = Object.keys(l);
  const logSum = keys.reduce((a, k) => a + (l[k] || 0), 0);
  const daysRead = keys.filter((k) => (l[k] || 0) > 0).length;
  let best = 0, bestDay = "";
  for (const k of keys) if ((l[k] || 0) > best) {
    best = l[k];
    bestDay = k;
  }
  const total = Math.max(lifetimeSeconds || 0, logSum);
  const recent = [];
  for (let i = 13; i >= 0; i--) {
    const k = shiftDayKey(todayKey, -i);
    recent.push({ key: k, sec: l[k] || 0 });
  }
  return {
    total,
    today: l[todayKey] || 0,
    streak: readingStreak(l, todayKey),
    daysRead,
    best,
    bestDay,
    avgPerDay: daysRead ? Math.round(logSum / daysRead) : 0,
    recent
  };
}
export function startTimerSession(view) {
  if (view._timer) return;
  if (!view.plugin.settings.timerEnabled) return;
  view._running = true;
  view._flushAcc = 0;
  view._timer = window.setInterval(() => {
    if (!view.plugin.settings.timerEnabled) {
      pauseTimerSession(view);
      return;
    }
    view.plugin.bumpReadingTime(1);
    view._sessionSec = (view._sessionSec || 0) + 1;
    view._flushAcc = (view._flushAcc || 0) + 1;
    if (view._flushAcc >= 15) {
      view._flushAcc = 0;
      view.plugin.flushReadingTime();
    }
    updateTimerBtn(view);
    updateGoalBar(view);
    if (!view._goalNotified && view.plugin.getTodaySeconds() >= view.plugin.getGoalSeconds()) {
      view._goalNotified = true;
      view.plugin.flushReadingTime();
      new Notice(__ertr("\u0426\u0435\u043B\u044C \u0447\u0442\u0435\u043D\u0438\u044F \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0434\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442\u0430 \u{1F389}"));
    }
  }, 1e3);
  updateTimerBtn(view);
}
export function pauseTimerSession(view) {
  if (view._timer) {
    window.clearInterval(view._timer);
    view._timer = null;
  }
  view._running = false;
  if (view.plugin) view.plugin.flushReadingTime();
  updateTimerBtn(view);
}
export function toggleTimerSession(view) {
  if (!view.plugin.settings.timerEnabled) {
    new Notice(__ertr("\u0422\u0430\u0439\u043C\u0435\u0440 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D \u2014 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0435\u0433\u043E \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0447\u0442\u0435\u043D\u0438\u044F"));
    return;
  }
  view._running ? pauseTimerSession(view) : startTimerSession(view);
}
export function stopReadingTimer(view) {
  pauseTimerSession(view);
}
export function resetTimerSession(view) {
  if (!view.plugin.settings.timerEnabled) return;
  pauseTimerSession(view);
  view.plugin.resetTodaySeconds();
  view.plugin.flushReadingTime();
  view._goalNotified = false;
  updateTimerBtn(view);
  updateGoalBar(view);
  new Notice(__ertr("\u0422\u0430\u0439\u043C\u0435\u0440 \u0441\u0431\u0440\u043E\u0448\u0435\u043D"));
}
export function updateTimerBtn(view) {
  if (!view.timerBtnEl) return;
  const s = view.plugin.settings;
  if (!s.timerEnabled) {
    view.timerBtnEl.style.display = "none";
    return;
  }
  view.timerBtnEl.style.display = "";
  const remain = Math.max(0, view.plugin.getGoalSeconds() - view.plugin.getTodaySeconds());
  const done = remain <= 0;
  const mm = Math.floor(remain / 60), ss = remain % 60;
  view.timerBtnEl.classList.toggle("er-timer-run", !!view._running && !done);
  view.timerBtnEl.classList.toggle("er-timer-done", done);
  if (view.timerIconEl) view.timerIconEl.innerHTML = icon(done ? "check" : view._running ? "pause" : "play");
  if (view.timerLabelEl) view.timerLabelEl.setText(`${mm}:${String(ss).padStart(2, "0")}`);
}
export function updateGoalBar(view) {
  if (!view.goalWrapEl) return;
  const s = view.plugin.settings;
  if (!s.timerEnabled) {
    view.goalWrapEl.style.display = "none";
    return;
  }
  view.goalWrapEl.style.display = "";
  const done = view.plugin.getTodaySeconds();
  const goal = view.plugin.getGoalSeconds();
  const pct = Math.min(100, Math.round(done / goal * 100));
  const mins = Math.floor(done / 60);
  view.goalFillEl.style.width = pct + "%";
  const reached = done >= goal;
  view.goalWrapEl.classList.toggle("er-goal-done", reached);
  view.goalTxtEl.setText(reached ? __ertr("\u2713 \u0426\u0435\u043B\u044C \u0434\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442\u0430 \u2014 {0} \u043C\u0438\u043D \u0441\u0435\u0433\u043E\u0434\u043D\u044F", mins) : __ertr("\u23F1 {0} \u0438\u0437 {1} \u043C\u0438\u043D \xB7 {2}%", mins, s.dailyGoalMin || 15, pct));
}