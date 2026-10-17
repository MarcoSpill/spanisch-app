"use strict";
// ---------- Hilfsfunktionen ----------
const app = document.getElementById("app");
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  kids.flat().forEach(c => { if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(c)); });
  return e;
}
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rnd = a => a[Math.floor(Math.random() * a.length)];
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
function similarity(a, b) {
  a = norm(a); b = norm(b);
  const m = a.length, n = b.length;
  if (!m && !n) return 1;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}
const dayStr = ms => new Date(ms).toLocaleDateString("sv-SE");

// ---------- Daten ----------
const ITEMS = [];
TOPICS.forEach(t => {
  t.w.forEach((x, i) => ITEMS.push({ id: `${t.id}:w${i}`, topic: t.id, kind: "w", es: x[0], de: x[1] }));
  t.s.forEach((x, i) => {
    const gap = x[0].match(/\[(.+?)\]/)[1];
    ITEMS.push({ id: `${t.id}:s${i}`, topic: t.id, kind: "s", raw: x[0], es: x[0].replace(/[\[\]]/g, ""), de: x[1], gap });
  });
});

// ---------- Speicher & Wiederholungsplan ----------
const KEY = "spanisch-app-v1";
const DEFAULTS = () => ({ cards: {}, xp: 0, streak: 0, last: null, days: {} });
let S;
try { S = Object.assign(DEFAULTS(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { S = DEFAULTS(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { } };
const INTERVALS = [0, 1, 2, 4, 8, 16, 32]; // Tage je Box
function rate(item, ok) {
  const c = S.cards[item.id] || { box: 0, due: 0 };
  c.box = ok ? Math.min(c.box + 1, 6) : 0;
  c.due = Date.now() + (ok ? INTERVALS[c.box] * 864e5 : 10 * 60e3);
  S.cards[item.id] = c;
}
const dueItems = () => ITEMS.filter(i => S.cards[i.id] && S.cards[i.id].due <= Date.now());
const currentStreak = () => (S.last === dayStr(Date.now()) || S.last === dayStr(Date.now() - 864e5)) ? S.streak : 0;
function pick(list, n) { return shuffle(list).sort((a, b) => (S.cards[a.id]?.due || 0) - (S.cards[b.id]?.due || 0)).slice(0, n); }

// ---------- Sprache ----------
let voice = null;
function loadVoice() {
  if (!("speechSynthesis" in window)) return;
  const v = speechSynthesis.getVoices();
  voice = v.find(x => x.lang.replace("_", "-") === "es-ES") || v.find(x => x.lang.startsWith("es")) || null;
}
if ("speechSynthesis" in window) { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }
function say(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES"; u.rate = 0.9;
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const sndBtn = text => h("button", { class: "snd", "aria-label": "Vorlesen", onclick: () => say(text) }, "🔊");

// ---------- Übungen ----------
function distract(item, key, n = 3) {
  const seen = new Set([norm(item[key])]);
  const out = [];
  for (const i of shuffle(ITEMS.filter(x => x.kind === item.kind && x.id !== item.id))) {
    const v = i[key];
    if (!seen.has(norm(v))) { seen.add(norm(v)); out.push(v); }
    if (out.length === n) break;
  }
  return out;
}
function options(body, correct, wrongs, onPick) {
  const btns = shuffle([correct, ...wrongs]).map(o => {
    const b = h("button", { class: "opt" }, o);
    b.onclick = () => {
      btns.forEach(x => { x.disabled = true; if (x.textContent === correct) x.classList.add("right"); });
      const ok = o === correct;
      if (!ok) b.classList.add("wrong");
      onPick(ok, correct);
    };
    return b;
  });
  body.append(h("div", { class: "opts" }, btns));
}

const RENDER = {
  intro(ex, body, answer) {
    const i = ex.item;
    body.append(h("div", { class: "tag" }, "Neues Wort"), h("div", { class: "big" }, i.es), h("div", { class: "sub" }, i.de), sndBtn(i.es));
    answer(null);
    say(i.es);
  },
  mc(ex, body, answer) {
    const i = ex.item;
    body.append(h("div", { class: "tag" }, "Was bedeutet das?"), h("div", { class: "big" }, i.es), sndBtn(i.es));
    options(body, i.de, distract(i, "de"), answer);
  },
  mcrev(ex, body, answer) {
    const i = ex.item;
    body.append(h("div", { class: "tag" }, "Wie sagt man auf Spanisch?"), h("div", { class: "big" }, i.de));
    options(body, i.es, distract(i, "es"), answer);
  },
  listen(ex, body, answer) {
    const i = ex.item;
    body.append(h("div", { class: "tag" }, "Hör zu und wähle die Bedeutung"), h("button", { class: "snd huge", onclick: () => say(i.es) }, "🔊"));
    options(body, i.de, distract(i, "de"), answer);
    setTimeout(() => say(i.es), 250);
  },
  gap(ex, body, answer) {
    const i = ex.item;
    const parts = i.raw.split(/\[.+?\]/);
    body.append(h("div", { class: "tag" }, "Ergänze den Satz"), h("div", { class: "sub" }, i.de),
      h("div", { class: "big sent" }, parts[0], h("span", { class: "blank" }, "_____"), parts[1] || ""));
    const wrongs = [];
    const seen = new Set([norm(i.gap)]);
    for (const s of shuffle(ITEMS.filter(x => x.kind === "s" && x.id !== i.id))) {
      if (!seen.has(norm(s.gap))) { seen.add(norm(s.gap)); wrongs.push(s.gap); }
      if (wrongs.length === 3) break;
    }
    options(body, i.gap, wrongs, answer);
  },
  translate(ex, body, answer) {
    const i = ex.item;
    const target = i.es.split(" ");
    const extra = shuffle(ITEMS.filter(x => x.kind === "s" && x.id !== i.id).flatMap(x => x.es.split(" ")).filter(t => !target.includes(t))).slice(0, 2);
    const bank = shuffle([...target, ...extra]).map((t, k) => ({ t, k }));
    let chosen = [];
    const line = h("div", { class: "line" }), pool = h("div", { class: "chips" });
    const check = h("button", { class: "primary", disabled: "" }, "Prüfen");
    let locked = false;
    function draw() {
      line.replaceChildren(...chosen.map(c => h("button", { class: "chip", onclick: () => { if (!locked) { chosen = chosen.filter(x => x !== c); draw(); } } }, c.t)));
      pool.replaceChildren(...bank.map(c => h("button", { class: "chip" + (chosen.includes(c) ? " used" : ""), onclick: () => { if (!locked && !chosen.includes(c)) { chosen.push(c); draw(); } } }, c.t)));
      check.disabled = !chosen.length;
    }
    check.onclick = () => {
      locked = true; check.remove();
      const ok = norm(chosen.map(c => c.t).join(" ")) === norm(i.es);
      answer(ok, i.es);
    };
    body.append(h("div", { class: "tag" }, "Übersetze ins Spanische"), h("div", { class: "big" }, i.de), line, pool, check);
    draw();
  },
  speak(ex, body, answer) {
    const i = ex.item;
    const status = h("div", { class: "sub" }, "Tippe auf das Mikrofon und sprich den Satz.");
    const mic = h("button", { class: "snd huge" }, "🎤");
    const skip = h("button", { class: "ghost", onclick: () => answer(null) }, "Überspringen");
    mic.onclick = () => {
      mic.disabled = true; skip.disabled = true; status.textContent = "Ich höre zu …";
      let done = false;
      const r = new SR();
      r.lang = "es-ES"; r.maxAlternatives = 3; r.interimResults = false;
      r.onresult = e => {
        done = true;
        const alts = [...e.results[0]].map(a => a.transcript);
        const best = Math.max(...alts.map(a => similarity(a, i.es)));
        answer(best >= 0.75, i.es + `  (verstanden: „${alts[0]}“)`);
      };
      r.onerror = r.onend = () => { if (!done) { done = true; mic.disabled = false; skip.disabled = false; status.textContent = "Nichts verstanden – nochmal versuchen oder überspringen."; } };
      try { r.start(); } catch { mic.disabled = false; skip.disabled = false; }
    };
    body.append(h("div", { class: "tag" }, "Sprich nach"), h("div", { class: "big" }, i.es), h("div", { class: "sub" }, i.de),
      h("div", { class: "row" }, sndBtn(i.es), mic), status, skip);
  },
  conj(ex, body, answer) {
    const [inf, de, forms] = ex.verb;
    const input = h("input", { class: "txt", autocapitalize: "none", autocomplete: "off", spellcheck: "false", placeholder: "Antwort" });
    const go = h("button", { class: "primary" }, "Prüfen");
    const submit = () => {
      if (!input.value.trim()) return;
      input.disabled = true; go.remove();
      const given = input.value.trim().toLowerCase(), want = forms[ex.p];
      if (given === want) answer(true, want);
      else if (norm(given) === norm(want)) answer(true, `${want}  (Achte auf den Akzent!)`);
      else answer(false, want);
    };
    go.onclick = submit;
    input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
    body.append(h("div", { class: "tag" }, `Präsens: ${inf} (${de})`), h("div", { class: "big" }, PERSONS[ex.p]), input, go);
    setTimeout(() => input.focus(), 100);
  }
};

// ---------- Ablauf einer Lektion ----------
function runSession(title, list) {
  const queue = [...list];
  let n = 0, good = 0, gained = 0;
  const rated = new Set();

  function next() {
    if (!queue.length) return finish();
    const ex = queue.shift();
    const fill = h("i"); fill.style.width = Math.round(n / (n + queue.length + 1) * 100) + "%";
    const body = h("div", { class: "exbody" });
    const fb = h("div", { class: "fb hidden" });
    let answered = false;
    function answer(ok, info) {
      if (answered) return;
      answered = true;
      if (ok === true) { good++; gained += 10; S.xp += 10; }
      if (ex.item && ok !== null && !ex.noSRS && !rated.has(ex.item.id)) { rated.add(ex.item.id); rate(ex.item, ok); }
      if (ok === false && !ex.noSRS && !ex.retry && ex.type !== "intro") queue.push({ ...ex, retry: true });
      if (ok !== null) n++;
      save();
      if (ex.item && ok !== null && ex.type !== "speak" && ex.type !== "listen") say(ex.item.es);
      fb.className = "fb " + (ok === true ? "ok" : ok === false ? "bad" : "neutral");
      fb.replaceChildren(...[
        ok === null ? null : h("div", { class: "fbtitle" }, ok ? "¡Correcto! +10" : "Richtig wäre:"),
        ok === false ? h("div", { class: "fbinfo" }, info) : ok && info && info !== (ex.item && ex.item.es) ? h("div", { class: "fbinfo" }, info) : null,
        h("button", { class: "primary", id: "nextBtn", onclick: next }, "Weiter")].filter(Boolean));
      document.getElementById("nextBtn").focus();
    }
    app.replaceChildren(
      h("header", { class: "top" }, h("button", { class: "x", "aria-label": "Beenden", onclick: home }, "✕"), h("div", { class: "bar" }, fill)),
      h("main", { class: "ex" }, body), fb);
    RENDER[ex.type](ex, body, answer);
  }

  function finish() {
    const t = dayStr(Date.now());
    if (S.last !== t) { S.streak = S.last === dayStr(Date.now() - 864e5) ? S.streak + 1 : 1; S.last = t; }
    S.days[t] = (S.days[t] || 0) + 1;
    save();
    app.replaceChildren(h("main", { class: "done" },
      h("div", { class: "trophy" }, "🎉"), h("h1", {}, "¡Muy bien!"), h("p", {}, title),
      h("div", { class: "stats" }, h("div", {}, h("b", {}, "+" + gained), "XP"), h("div", {}, h("b", {}, String(good)), "richtig"), h("div", {}, h("b", {}, "🔥 " + currentStreak()), "Tage in Folge")),
      h("button", { class: "primary", onclick: home }, "Fertig")));
  }
  next();
}

function exerciseFor(item) {
  if (item.kind === "w") return { type: rnd(["mc", "mcrev", "listen"]), item };
  return { type: rnd(SR ? ["gap", "translate", "speak"] : ["gap", "translate"]), item, noSRS: false };
}
function startTopic(t) {
  const items = ITEMS.filter(i => i.topic === t.id);
  const words = pick(items.filter(i => i.kind === "w"), 5), sents = pick(items.filter(i => i.kind === "s"), 4);
  const intros = words.filter(w => !S.cards[w.id]).map(item => ({ type: "intro", item }));
  const list = [...intros, ...words.map(exerciseFor), ...sents.map(exerciseFor)].map(e => e.type === "speak" ? { ...e, noSRS: true } : e);
  runSession(t.title, list);
}
function startReview() {
  const due = pick(dueItems(), 10);
  if (!due.length) return;
  runSession("Wiederholung", shuffle(due.map(exerciseFor)).map(e => e.type === "speak" ? { ...e, noSRS: true } : e));
}
function startConj() {
  const list = [];
  for (let k = 0; k < 10; k++) list.push({ type: "conj", verb: rnd(VERBS), p: Math.floor(Math.random() * 6), noSRS: true });
  runSession("Verben im Präsens", list);
}

function startSpeak() {
  const sents = pick(ITEMS.filter(i => i.kind === "s"), 8);
  runSession("Aussprache", sents.map(item => ({ type: "speak", item, noSRS: true })));
}

// ---------- Startseite ----------
function home() {
  const due = dueItems().length;
  const total = ITEMS.length, seen = Object.keys(S.cards).length, mastered = Object.values(S.cards).filter(c => c.box >= 3).length;
  const today = S.days[dayStr(Date.now())] || 0;
  app.replaceChildren(
    h("header", { class: "head" }, h("h1", {}, "¡Vamos!"), h("div", { class: "chips2" }, h("span", {}, "🔥 " + currentStreak()), h("span", {}, "⭐ " + S.xp))),
    h("main", { class: "home" },
      h("button", { class: "review" + (due ? "" : " off"), disabled: due ? null : "", onclick: startReview },
        h("b", {}, "Wiederholen"), h("span", {}, due ? `${due} Karten fällig` : "Aktuell nichts fällig")),
      h("h2", {}, "Themen"),
      TOPICS.map(t => {
        const its = ITEMS.filter(i => i.topic === t.id);
        const s = its.filter(i => S.cards[i.id]).length;
        const fill = h("i"); fill.style.width = Math.round(s / its.length * 100) + "%";
        return h("button", { class: "card", onclick: () => startTopic(t) },
          h("span", { class: "ic" }, t.icon), h("span", { class: "tx" }, h("b", {}, t.title), h("span", { class: "mini" }, h("span", { class: "bar" }, fill), `${s}/${its.length}`)));
      }),
      h("h2", {}, "Training"),
      h("button", { class: "card", onclick: startConj }, h("span", { class: "ic" }, "🔤"), h("span", { class: "tx" }, h("b", {}, "Verben konjugieren"), h("span", { class: "sub2" }, "ser, estar, tener, ir … im Präsens"))),
      h("button", { class: "card", onclick: SR ? startSpeak : () => alert("Spracherkennung wird in diesem Browser nicht unterstützt. Bitte Chrome verwenden.") },
        h("span", { class: "ic" }, "🎤"), h("span", { class: "tx" }, h("b", {}, "Aussprache üben"), h("span", { class: "sub2" }, SR ? "Sätze laut nachsprechen" : "Nur in Chrome verfügbar"))),
      h("div", { class: "statbox" },
        h("div", {}, h("b", {}, String(today)), "Lektionen heute"), h("div", {}, h("b", {}, `${seen}/${total}`), "Karten gelernt"), h("div", {}, h("b", {}, String(mastered)), "gefestigt")),
      h("button", { class: "ghost small", onclick: () => { if (confirm("Gesamten Fortschritt löschen?")) { S = DEFAULTS(); save(); home(); } } }, "Fortschritt zurücksetzen")));
}

home();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { });
