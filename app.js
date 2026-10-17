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
  kids.flat(Infinity).forEach(c => { if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(c)); });
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
  t.w.forEach((x, i) => ITEMS.push({ id: `${t.id}:w${i}`, topic: t.id, lvl: t.lvl, kind: "w", es: x[0], de: x[1] }));
  t.s.forEach((x, i) => {
    const gap = x[0].match(/\[(.+?)\]/)[1];
    ITEMS.push({ id: `${t.id}:s${i}`, topic: t.id, lvl: t.lvl, kind: "s", raw: x[0], es: x[0].replace(/[\[\]]/g, ""), de: x[1], gap });
  });
});

// ---------- Speicher & Wiederholungsplan ----------
const KEY = "spanisch-app-v1";
const DEFAULTS = () => ({ cards: {}, xp: 0, streak: 0, last: null, days: {}, dlg: {}, stats: {}, startLevel: null });
let S;
try { S = Object.assign(DEFAULTS(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { S = DEFAULTS(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { } };
const INTERVALS = [0, 1, 2, 4, 8, 16, 32]; // Tage je Box
function rate(item, ok) {
  const c = S.cards[item.id] || { box: 0, due: 0 };
  c.box = ok ? Math.min(c.box + 1, 6) : 0;
  if (!ok) c.miss = (c.miss || 0) + 1;
  c.due = Date.now() + (ok ? INTERVALS[c.box] * 864e5 : 10 * 60e3);
  S.cards[item.id] = c;
}
const dueItems = () => ITEMS.filter(i => S.cards[i.id] && S.cards[i.id].due <= Date.now());
const currentStreak = () => (S.last === dayStr(Date.now()) || S.last === dayStr(Date.now() - 864e5)) ? S.streak : 0;
// Niveaus: Level ist frei, wenn es unter dem Startniveau liegt oder das vorige zu 80 % gefestigt ist
const LEVELS = ["A2", "B1", "B2"];
const UNLOCK_AT = 0.8;
function levelStats(l) {
  const its = ITEMS.filter(i => i.lvl === l);
  const mastered = its.filter(i => (S.cards[i.id]?.box || 0) >= 3).length;
  return { total: its.length, mastered, pct: its.length ? mastered / its.length : 0 };
}
function unlocked(l) {
  const k = LEVELS.indexOf(l);
  if (k <= LEVELS.indexOf(S.startLevel || "A2")) return true;
  return levelStats(LEVELS[k - 1]).pct >= UNLOCK_AT;
}
// Statistik nach Übungsart
const GROUP = { mc: "Wortschatz", mcrev: "Wortschatz", typeit: "Wortschatz", listen: "Hörverstehen", gap: "Sätze", translate: "Sätze", typesent: "Sätze", speak: "Aussprache", conj: "Verben", dlg: "Dialoge" };
function track(type, ok) {
  const g = GROUP[type];
  if (!g) return;
  const s = S.stats[g] || (S.stats[g] = { n: 0, ok: 0 });
  s.n++; if (ok) s.ok++;
}
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
  type(ex, body, answer) {
    const i = ex.item, isWord = i.kind === "w";
    const clean = s => s.toLowerCase().replace(/[¿?¡!.,;:]/g, "").replace(/\s+/g, " ").trim();
    const targets = isWord ? [i.es, i.es.replace(/^(el|la|los|las|un|una)\s+/i, "")] : [i.es];
    const input = h("input", { class: "txt", autocapitalize: "none", autocomplete: "off", spellcheck: "false", placeholder: "Auf Spanisch tippen" });
    const go = h("button", { class: "primary" }, "Prüfen");
    const submit = () => {
      const g = input.value.trim();
      if (!g) return;
      input.disabled = true; go.remove();
      if (targets.some(t => clean(t) === clean(g))) answer(true, i.es);
      else if (targets.some(t => norm(t) === norm(g))) answer(true, `${i.es}  (Achte auf die Akzente!)`);
      else answer(false, i.es);
    };
    go.onclick = submit;
    input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
    body.append(h("div", { class: "tag" }, isWord ? "Wie heißt das auf Spanisch?" : "Schreibe den Satz auf Spanisch"), h("div", { class: "big" }, i.de), input, go);
    setTimeout(() => input.focus(), 100);
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
    body.append(h("div", { class: "tag" }, `${ex.tense}: ${inf} (${de})`), h("div", { class: "big" }, PERSONS[ex.p]), input, go);
    setTimeout(() => input.focus(), 100);
  }
};

RENDER.typeit = RENDER.typesent = RENDER.type;

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
      if (ok !== null && ex.type !== "intro") track(ex.type, ok);
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

  const finish = () => doneScreen(title, good, gained);
  next();
}

function doneScreen(title, good, gained) {
  const t = dayStr(Date.now());
  if (S.last !== t) { S.streak = S.last === dayStr(Date.now() - 864e5) ? S.streak + 1 : 1; S.last = t; }
  S.days[t] = (S.days[t] || 0) + 1;
  save();
  app.replaceChildren(h("main", { class: "done" },
    h("div", { class: "trophy" }, "🎉"), h("h1", {}, "¡Muy bien!"), h("p", {}, title),
    h("div", { class: "stats" }, h("div", {}, h("b", {}, "+" + gained), "XP"), h("div", {}, h("b", {}, String(good)), "richtig"), h("div", {}, h("b", {}, "🔥 " + currentStreak()), "Tage in Folge")),
    h("button", { class: "primary", onclick: home }, "Fertig")));
}

// ---------- Dialoge ----------
function runDialog(d) {
  let i = 0, good = 0, gained = 0;
  const chat = h("div", { class: "chat" }), optsBox = h("div", { class: "opts" }), fb = h("div", { class: "fb hidden" }), fill = h("i");
  const bubble = (who, es, de) => {
    const b = h("div", { class: "bub " + who, onclick: () => say(es) }, h("div", {}, es), h("div", { class: "bde" }, de));
    chat.append(b);
    b.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  function step() {
    fill.style.width = Math.round(i / d.steps.length * 100) + "%";
    if (i >= d.steps.length) { S.dlg[d.id] = (S.dlg[d.id] || 0) + 1; return doneScreen(d.title, good, gained); }
    const s = d.steps[i];
    bubble("npc", s.npc, s.npcDe);
    say(s.npc);
    fb.className = "fb hidden";
    const opts = [{ es: s.right[0], ok: true }, ...s.wrong.map(es => ({ es, ok: false }))];
    const btns = shuffle(opts).map(o => {
      const b = h("button", { class: "opt" }, o.es);
      b.onclick = () => choose(s, o, b, btns);
      return b;
    });
    optsBox.replaceChildren(...btns);
  }
  function choose(s, o, btn, btns) {
    btns.forEach(x => { x.disabled = true; if (x.textContent === s.right[0]) x.classList.add("right"); });
    if (o.ok) { good++; gained += 10; S.xp += 10; } else btn.classList.add("wrong");
    track("dlg", o.ok);
    save();
    optsBox.replaceChildren();
    bubble("me", s.right[0], s.right[1]);
    say(s.right[0]);
    const heard = h("div", { class: "fbinfo" });
    const mic = SR ? h("button", { class: "ghost", onclick: () => {
      mic.disabled = true; heard.textContent = "Ich höre zu …";
      const r = new SR(); r.lang = "es-ES"; r.maxAlternatives = 3;
      let got = false;
      r.onresult = e => { got = true; const alts = [...e.results[0]].map(a => a.transcript); const best = Math.max(...alts.map(a => similarity(a, s.right[0]))); heard.textContent = (best >= 0.75 ? "✓ " : "✗ ") + `verstanden: „${alts[0]}“`; mic.disabled = false; };
      r.onerror = r.onend = () => { if (!got) { got = true; heard.textContent = "Nichts verstanden."; mic.disabled = false; } };
      try { r.start(); } catch { mic.disabled = false; }
    } }, "🎤 Nachsprechen") : null;
    fb.className = "fb " + (o.ok ? "ok" : "bad");
    fb.replaceChildren(...[
      h("div", { class: "fbtitle" }, o.ok ? "¡Correcto! +10" : "Besser wäre gewesen:"),
      mic, heard,
      h("button", { class: "primary", id: "nextBtn", onclick: () => { i++; step(); } }, "Weiter")].filter(Boolean));
    document.getElementById("nextBtn").focus();
    fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  app.replaceChildren(
    h("header", { class: "top" }, h("button", { class: "x", "aria-label": "Beenden", onclick: home }, "✕"), h("div", { class: "bar" }, fill)),
    h("main", { class: "dlg" }, h("div", { class: "tag center" }, d.title), chat, optsBox), fb);
  step();
}

// Schwierigkeit richtet sich nach der Box der Karte: neu/wacklig = leicht, sicher = Tippen und Sprechen
function exerciseFor(item) {
  const box = S.cards[item.id]?.box || 0;
  let pool;
  if (item.kind === "w") {
    const typable = !/[\/(…]/.test(item.es);
    pool = box <= 1 ? ["mc", "mc", "listen"] : box <= 3 ? ["mcrev", "mcrev", "listen"] : typable ? ["typeit", "typeit", "mcrev"] : ["mcrev"];
  } else {
    pool = box <= 1 ? ["gap", "gap", "translate"] : box <= 3 ? ["translate", "gap", "translate"] : ["typesent", "translate"];
    if (SR && box >= 2) pool.push("speak");
  }
  const type = rnd(pool);
  return { type, item, noSRS: type === "speak" };
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
function startConj(tenseId) {
  const list = [];
  for (let k = 0; k < 10; k++) {
    const t = tenseId === "mix" ? rnd(TENSES) : TENSES.find(x => x.id === tenseId);
    list.push({ type: "conj", tense: t.name, verb: rnd(t.verbs), p: Math.floor(Math.random() * 6), noSRS: true });
  }
  runSession(tenseId === "mix" ? "Verben gemischt" : "Verben: " + TENSES.find(x => x.id === tenseId).name, list);
}
function conjMenu() {
  app.replaceChildren(
    h("header", { class: "top" }, h("button", { class: "x", "aria-label": "Zurück", onclick: home }, "←"), h("b", {}, "Zeitform wählen")),
    h("main", { class: "home" },
      TENSES.map(t => h("button", { class: "card", onclick: () => startConj(t.id) }, h("span", { class: "ic" }, "🔤"), h("span", { class: "tx" }, h("b", {}, t.name), h("span", { class: "sub2" }, t.sub)))),
      h("button", { class: "card", onclick: () => startConj("mix") }, h("span", { class: "ic" }, "🎲"), h("span", { class: "tx" }, h("b", {}, "Alle gemischt"), h("span", { class: "sub2" }, "Gegenwart, Vergangenheit, Zukunft")))));
}

function startSpeak() {
  const sents = pick(ITEMS.filter(i => i.kind === "s"), 8);
  runSession("Aussprache", sents.map(item => ({ type: "speak", item, noSRS: true })));
}

// ---------- Startseite ----------
const LEVEL_NAMES = { A2: "A2 · Grundlagen", B1: "B1 · Alltag sicher", B2: "B2 · Fortgeschritten" };

function openTopic(t) {
  if (unlocked(t.lvl)) return startTopic(t);
  const prev = LEVELS[LEVELS.indexOf(t.lvl) - 1];
  const p = Math.round(levelStats(prev).pct * 100);
  if (confirm(`Noch gesperrt: Für ${t.lvl} sollten ${Math.round(UNLOCK_AT * 100)} % von ${prev} gefestigt sein (aktuell ${p} %).\nTrotzdem starten?`)) startTopic(t);
}

function levelPick(done) {
  const set = l => { S.startLevel = l; save(); done(); };
  app.replaceChildren(h("main", { class: "home" },
    h("h1", { class: "pad" }, "¡Hola!"),
    h("p", { class: "sub" }, "Auf welchem Niveau möchtest du starten? Alle Stufen darunter sind dann sofort frei, die höheren schalten sich frei, sobald du die Stufe davor zu 80 % gefestigt hast."),
    h("button", { class: "card", onclick: () => set("A2") }, h("span", { class: "ic" }, "🌱"), h("span", { class: "tx" }, h("b", {}, "A2"), h("span", { class: "sub2" }, "Grundlagen sicher machen"))),
    h("button", { class: "card", onclick: () => set("B1") }, h("span", { class: "ic" }, "🌿"), h("span", { class: "tx" }, h("b", {}, "B1"), h("span", { class: "sub2" }, "Alltag und Gespräche"))),
    h("button", { class: "card", onclick: () => set("B2") }, h("span", { class: "ic" }, "🌳"), h("span", { class: "tx" }, h("b", {}, "B2"), h("span", { class: "sub2" }, "Alles frei, auch anspruchsvolle Themen"))),
    S.startLevel ? h("button", { class: "ghost", onclick: done }, "Abbrechen") : null));
}

function statsScreen() {
  const bars = (label, pct, extra) => {
    const fill = h("i"); fill.style.width = Math.round(pct * 100) + "%";
    return h("div", { class: "srow" }, h("span", { class: "lab" }, label), h("span", { class: "bar" }, fill), h("span", { class: "pct" }, extra || Math.round(pct * 100) + " %"));
  };
  const types = Object.entries(S.stats).filter(([, s]) => s.n > 0).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n);
  const weak = ITEMS.filter(i => S.cards[i.id]?.miss).sort((a, b) => S.cards[b.id].miss - S.cards[a.id].miss).slice(0, 8);
  const topics = TOPICS.map(t => {
    const its = ITEMS.filter(i => i.topic === t.id);
    return { t, pct: its.filter(i => (S.cards[i.id]?.box || 0) >= 3).length / its.length };
  });
  app.replaceChildren(
    h("header", { class: "top" }, h("button", { class: "x", "aria-label": "Zurück", onclick: home }, "←"), h("b", {}, "Statistik")),
    h("main", { class: "home" },
      h("h2", {}, "Niveau (gefestigt)"),
      LEVELS.map(l => { const s = levelStats(l); return bars(l + (unlocked(l) ? "" : " 🔒"), s.pct, `${s.mastered}/${s.total}`); }),
      h("h2", {}, "Trefferquote nach Übungsart"),
      types.length ? types.map(([g, s]) => bars(g, s.ok / s.n, `${Math.round(s.ok / s.n * 100)} % (${s.n})`)) : h("p", { class: "sub" }, "Noch keine Daten – mach eine Lektion."),
      types.length > 1 ? h("p", { class: "sub" }, `Am meisten Übung brauchst du bei: ${types[0][0]}.`) : null,
      h("h2", {}, "Gefestigt nach Thema"),
      topics.map(x => bars(x.t.icon + " " + x.t.title.split(" ")[0], x.pct)),
      h("h2", {}, "Schwierigste Karten"),
      weak.length ? weak.map(i => h("div", { class: "weak" }, h("b", {}, i.es), h("span", { class: "sub" }, i.de), h("span", { class: "pct" }, S.cards[i.id].miss + "× falsch"))) : h("p", { class: "sub" }, "Bisher keine Fehler."),
      h("h2", {}, "Einstellungen"),
      h("p", { class: "sub" }, "Startniveau: " + (S.startLevel || "–")),
      h("button", { class: "card", onclick: () => levelPick(statsScreen) }, h("span", { class: "tx" }, h("b", {}, "Startniveau ändern"))),
      h("button", { class: "ghost small", onclick: () => { if (confirm("Gesamten Fortschritt löschen?")) { S = DEFAULTS(); save(); home(); } } }, "Fortschritt zurücksetzen")));
}

function topicCard(t) {
  const its = ITEMS.filter(i => i.topic === t.id);
  const s = its.filter(i => S.cards[i.id]).length;
  const fill = h("i"); fill.style.width = Math.round(s / its.length * 100) + "%";
  return h("button", { class: "card" + (unlocked(t.lvl) ? "" : " locked"), onclick: () => openTopic(t) },
    h("span", { class: "ic" }, unlocked(t.lvl) ? t.icon : "🔒"), h("span", { class: "tx" }, h("b", {}, t.title), h("span", { class: "mini" }, h("span", { class: "bar" }, fill), `${s}/${its.length}`)));
}

function home() {
  if (!S.startLevel) return levelPick(home);
  const due = dueItems().length;
  const total = ITEMS.length, seen = Object.keys(S.cards).length, mastered = Object.values(S.cards).filter(c => c.box >= 3).length;
  const today = S.days[dayStr(Date.now())] || 0;
  app.replaceChildren(
    h("header", { class: "head" }, h("h1", {}, "¡Vamos!"), h("div", { class: "chips2" }, h("span", {}, "🔥 " + currentStreak()), h("span", {}, "⭐ " + S.xp), h("button", { class: "stat", "aria-label": "Statistik", onclick: statsScreen }, "📊"))),
    h("main", { class: "home" },
      h("button", { class: "review" + (due ? "" : " off"), disabled: due ? null : "", onclick: startReview },
        h("b", {}, "Wiederholen"), h("span", {}, due ? `${due} Karten fällig` : "Aktuell nichts fällig")),
      h("div", { class: "levels" }, LEVELS.map(l => {
        const s = levelStats(l), ok = unlocked(l);
        return h("div", { class: ok ? "on" : "off" }, h("b", {}, l + (ok ? "" : " 🔒")), Math.round(s.pct * 100) + " % gefestigt");
      })),
      LEVELS.map(l => [
        h("h2", {}, LEVEL_NAMES[l]),
        TOPICS.filter(t => t.lvl === l).map(topicCard)
      ]),
      h("h2", {}, "Dialoge"),
      DIALOGS.map(d => h("button", { class: "card", onclick: () => runDialog(d) },
        h("span", { class: "ic" }, d.icon), h("span", { class: "tx" }, h("b", {}, d.title), h("span", { class: "sub2" }, `${d.steps.length} Antworten` + (S.dlg[d.id] ? ` · ${S.dlg[d.id]}× geschafft` : ""))))),
      h("h2", {}, "Training"),
      h("button", { class: "card", onclick: conjMenu }, h("span", { class: "ic" }, "🔤"), h("span", { class: "tx" }, h("b", {}, "Verben konjugieren"), h("span", { class: "sub2" }, "Präsens, Perfekt, Indefinido, Futuro"))),
      h("button", { class: "card", onclick: SR ? startSpeak : () => alert("Spracherkennung wird in diesem Browser nicht unterstützt. Bitte Chrome verwenden.") },
        h("span", { class: "ic" }, "🎤"), h("span", { class: "tx" }, h("b", {}, "Aussprache üben"), h("span", { class: "sub2" }, SR ? "Sätze laut nachsprechen" : "Nur in Chrome verfügbar"))),
      h("div", { class: "statbox" },
        h("div", {}, h("b", {}, String(today)), "Lektionen heute"), h("div", {}, h("b", {}, `${seen}/${total}`), "Karten gelernt"), h("div", {}, h("b", {}, String(mastered)), "gefestigt"))));
}

home();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { });
