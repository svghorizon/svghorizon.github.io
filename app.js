/* ============================================================
   SVG Horizon — app logic

   You should not need to edit this file to add content.
   To add a note:  put the file in notes/ or teacher-notes/,
                   then add one line in data/syllabus.json
   ============================================================ */

let DATA = null;
let SITE = {};
let state = { view: "home" };
const app = document.getElementById("app");
const trail = document.getElementById("trail");

const count = o => Object.keys(o || {}).length;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const chev = `<svg class="chev" width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden="true"><path d="M1.5 1.5L6.5 6.5L1.5 11.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

/* ---------- exam colours ----------
   Each exam card gets a colour by its field. To give a new exam a colour,
   add its ID here (medical, engineering, law or defence). */
const FIELD = {
  neet: { key: "medical",     label: "Medical" },
  jee:  { key: "engineering", label: "Engineering" },
  clat: { key: "law",         label: "Law" },
  nda:  { key: "defence",     label: "Defence" }
};

/* ---------- subject icons (simple line drawings) ----------
   Matched by subject ID in syllabus.json; anything else gets a book. */
const ICON_PATHS = {
  physics:   `<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)"/>`,
  chemistry: `<path d="M9 3h6M10 3v6.2L4.6 18.4A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.6L14 9.2V3"/><path d="M7.2 15h9.6"/>`,
  biology:   `<path d="M5 19C5 10.5 10.5 4.6 20 4c-.6 9.5-6.5 15-15 15z"/><path d="M5 19l8.5-8.5"/>`,
  maths:     `<path d="M18 5H6.5l6 7-6 7H18"/>`,
  legal:     `<path d="M12 3v17M7.5 20.5h9M5 6.5h14"/><path d="M5 6.5L2.3 12.5a2.9 2.9 0 0 0 5.4 0zM19 6.5l-2.7 6a2.9 2.9 0 0 0 5.4 0z"/>`,
  english:   `<path d="M3.5 18L8 6l4.5 12M5.2 13.5h5.6"/><path d="M20.5 18v-5.2a2.6 2.6 0 0 0-5 0M20.5 15.2c-1.8-.6-5.4-.4-5.4 1.4 0 1.9 3.4 2 5.4.2"/>`,
  gk:        `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3.2 3.2 14.8 0 18M12 3c-3.2 3.2-3.2 14.8 0 18"/>`,
  logical:   `<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>`,
  quant:     `<rect x="5" y="3" width="14" height="18" rx="2.2"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>`,
  gat:       `<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/>`,
  book:      `<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"/>`
};
const icon = id => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[id] || ICON_PATHS.book}</svg>`;

// how many topics, and how many have notes ready, under any level
function tally(obj) {
  let topics = 0, ready = 0;
  const walk = o => {
    if (o.topics) Object.values(o.topics).forEach(t => { topics++; if (t.academic) ready++; });
    if (o.chapters) Object.values(o.chapters).forEach(walk);
    if (o.subjects) Object.values(o.subjects).forEach(walk);
  };
  walk(obj);
  return { topics, ready };
}
const meter = (ready, total) => `<div class="meter" role="img" aria-label="${ready} of ${total} notes ready">
  <span style="width:${total ? Math.round(ready / total * 100) : 0}%"></span></div>`;

/* ---------- start up ---------- */
fetch("data/syllabus.json")
  .then(r => r.json())
  .then(json => { DATA = json.exams; SITE = json.site || {}; route(); })
  .catch(() => {
    app.innerHTML = `<div class="empty"><strong>Could not load the syllabus</strong>
      If you opened index.html by double-clicking it, that is the reason. The browser blocks
      file loading from your hard disk. Push the site to GitHub and open it from the live
      address instead.</div>`;
  });

/* ---------- addresses: the part after # in the address bar ----------
   Every screen has its own address, for example
     #/neet                                   NEET (list of subjects)
     #/neet/biology                           Biology (list of units)
     #/neet/biology/unit-05                   one unit (list of topics)
     #/neet/biology/unit-05/ecosystem         one topic (the two buttons)
     #/neet/biology/unit-05/ecosystem/notes   academic notes
     #/neet/biology/unit-05/ecosystem/teacher teacher notes
   The words are the IDs from data/syllabus.json. A click changes the
   address, and the address decides what is shown. That is what makes
   Back, refresh and shared links work.
   RULE: once links are shared, do not rename IDs in syllabus.json. */

const LEVELS = ["exam", "subject", "chapter", "topic"];
const ENDING = { academic: "notes", teacher: "teacher" };
const scrollMemory = {};        // where the page was scrolled, per address
let clicked = false;            // true when a click (not Back) caused the change
let wantScroll = 0;             // scroll position to show once the page is drawn
history.scrollRestoration = "manual";

// build the address for a screen
function addressFor(view, p) {
  const parts = LEVELS.filter(k => p[k]).map(k => encodeURIComponent(p[k]));
  if (ENDING[view]) parts.push(ENDING[view]);
  return "#/" + parts.join("/");
}

// every click in the site calls go(); it only changes the address
function go(view, p = {}) {
  const next = addressFor(view, p);
  clicked = true;
  if (location.hash === next) route();   // already here: just redraw
  else location.hash = next;             // new address: browser records it, then route() runs
}
window.go = go;

// read the address, check it against the syllabus, and show that screen
function route() {
  if (!DATA) return;
  const has = (obj, key) => !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const s = { view: "home" };

  if (parts.length) {
    const [exam, subject, chapter, topic, ending] = parts;
    if (!has(DATA, exam)) return notFound();
    Object.assign(s, { view: "exam", exam });
    if (subject !== undefined) {
      if (!has(DATA[exam].subjects, subject)) return notFound();
      Object.assign(s, { view: "subject", subject });
    }
    if (chapter !== undefined) {
      if (!has(DATA[exam].subjects[subject].chapters, chapter)) return notFound();
      Object.assign(s, { view: "chapter", chapter });
    }
    if (topic !== undefined) {
      if (!has(DATA[exam].subjects[subject].chapters[chapter].topics, topic)) return notFound();
      Object.assign(s, { view: "topic", topic });
    }
    if (ending !== undefined) {
      const view = Object.keys(ENDING).find(v => ENDING[v] === ending);
      if (!view || parts.length > 5) return notFound();
      s.view = view;
    }
  }

  state = s;
  const key = location.hash || "#/";
  wantScroll = clicked ? 0 : (scrollMemory[key] || 0);   // Back/Forward returns to where you were
  clicked = false;
  render();
  drawTrail();
  setTitle();
  window.scrollTo(0, wantScroll);
}

// a shared link that no longer matches anything in the syllabus
function notFound() {
  clicked = false;
  state = { view: "missing" };
  drawTrail();
  document.title = "Page not found · " + (SITE.title || "SVG Horizon");
  app.innerHTML = `<div class="empty" style="margin-top:36px"><strong>This link does not open any page</strong>
    The chapter or topic may have been renamed or removed. Start from the home page to find it.</div>
    <button class="back" onclick="go('home')">Go to the home page</button>`;
  window.scrollTo(0, 0);
}

// the name shown on the browser tab
function setTitle() {
  const s = state, site = SITE.title || "SVG Horizon";
  if (s.view === "home") { document.title = site; return; }
  const ex = DATA[s.exam], sub = s.subject && ex.subjects[s.subject];
  const ch = s.chapter && sub.chapters[s.chapter], tp = s.topic && ch.topics[s.topic];
  document.title = (tp || ch || sub || ex).name + " · " + site;
}

// remember the scroll position of the page being left
window.addEventListener("hashchange", e => {
  scrollMemory[new URL(e.oldURL).hash || "#/"] = window.scrollY;
  route();
});

/* ---------- the "you are here" trail under the header ----------
   Home / NEET / Biology / Human Physiology / Body Fluids... / Notes
   Every part except the last one can be clicked to go back to it. */
function drawTrail() {
  const s = state;
  if (s.view === "home" || s.view === "missing") { trail.innerHTML = ""; trail.hidden = true; return; }
  const ex = DATA[s.exam], sub = s.subject && ex.subjects[s.subject];
  const ch = s.chapter && sub.chapters[s.chapter], tp = s.topic && ch.topics[s.topic];
  const p = { exam: s.exam, subject: s.subject, chapter: s.chapter, topic: s.topic };
  const steps = [{ label: "Home", view: "home", p: {} }, { label: ex.name, view: "exam", p: { exam: p.exam } }];
  if (sub) steps.push({ label: sub.name, view: "subject", p: { exam: p.exam, subject: p.subject } });
  if (ch)  steps.push({ label: ch.name,  view: "chapter", p: { exam: p.exam, subject: p.subject, chapter: p.chapter } });
  if (tp)  steps.push({ label: tp.name,  view: "topic",   p });
  if (s.view === "academic") steps.push({ label: "Academic notes" });
  if (s.view === "teacher")  steps.push({ label: "Teacher notes" });

  trail.hidden = false;
  trail.innerHTML = `<div class="trail-in">` + steps.map((st, i) => {
    const last = i === steps.length - 1;
    // the address goes in href, so a long-press on a phone can copy the link
    return last
      ? `<span class="here" aria-current="page">${esc(st.label)}</span>`
      : `<a href="${addressFor(st.view, st.p)}">${esc(st.label)}</a><span class="sep" aria-hidden="true">/</span>`;
  }).join("") + `</div>`;
  const inner = trail.firstElementChild;
  inner.scrollLeft = inner.scrollWidth;       // on small phones, show the end of a long trail
}

function render() {
  if (!DATA) return;
  const s = state;
  if (s.view === "home") return renderHome();
  const ex = DATA[s.exam];
  if (s.view === "exam") return renderExam(ex);
  const sub = ex.subjects[s.subject];
  if (s.view === "subject") return renderSubject(ex, sub);
  const ch = sub.chapters[s.chapter];
  if (s.view === "chapter") return renderChapter(ex, sub, ch);
  const tp = ch.topics[s.topic];
  if (s.view === "topic") return renderTopic(ex, sub, ch, tp);
  if (s.view === "academic") return renderAcademic(ex, sub, ch, tp);
  if (s.view === "teacher") return renderTeacher(ex, sub, ch, tp);
}

// the title block at the top of every inner page
const pageHead = (title, sub, kicker = "") => `<header class="page-head">
  ${kicker ? `<p class="kicker">${kicker}</p>` : ""}
  <h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</header>`;

/* ---------- home ---------- */
function renderHome() {
  const ready = Object.values(DATA).reduce((n, e) => n + tally(e).ready, 0);
  app.innerHTML = `
  <section class="hero">
    <h1>Every chapter, every subject, in one place.</h1>
    <p>${esc(SITE.tagline || "Free notes for every student")}. Notes written to the exam syllabus, plus notes shared by your own teachers. No sign-in needed.</p>
    <div class="search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input id="q" type="search" placeholder="Search a chapter, e.g. photosynthesis" autocomplete="off" aria-label="Search chapters and topics">
    </div>
    <div id="res"></div>
  </section>
  <a class="exam-cta" href="exams.html">
    <span class="cta-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/><path d="M15.5 16.5l1.5 1.5 3-3"/></svg></span>
    <span class="cta-text"><span class="cta-t">Practice Exams</span><span class="cta-ta" lang="ta">பயிற்சித் தேர்வுகள்</span>
      <span class="cta-d">Free online tests with instant results · See the exam calendar</span></span>
    <span class="cta-go" aria-hidden="true">→</span>
  </a>
  <h2 class="sec-head">Choose your exam <span>${ready} notes ready to read</span></h2>
  <div class="exams">` +
  Object.entries(DATA).map(([id, e]) => {
    const f = FIELD[id] || { key: "other", label: "" };
    const t = tally(e);
    return `<button class="exam f-${f.key}" onclick="go('exam',{exam:'${id}'})">
      <span class="badge">${esc(e.name.slice(0, 2).toUpperCase())}</span>
      <span class="ex-text">
        <span class="ta" lang="ta">${esc(e.tamil || "")}</span>
        <span class="en">${esc(e.name)}</span>
        <span class="desc">${esc(e.desc)}</span>
      </span>
      <span class="ex-foot"><span>${count(e.subjects)} subjects · ${t.topics} topics</span>${f.label ? `<span class="field">${f.label}</span>` : ""}</span>
    </button>`;
  }).join("") + `</div>`;

  const q = document.getElementById("q"), res = document.getElementById("res");
  q.addEventListener("input", () => {
    const v = q.value.trim().toLowerCase();
    if (v.length < 2) { res.innerHTML = ""; return; }
    const hits = [];
    for (const [ei, e] of Object.entries(DATA))
      for (const [si, s] of Object.entries(e.subjects))
        for (const [ci, c] of Object.entries(s.chapters))
          for (const [ti, t] of Object.entries(c.topics))
            if (t.name.toLowerCase().includes(v) && hits.length < 8)
              hits.push({ ei, si, ci, ti, t, path: `${e.name} · ${s.name} · ${c.name}` });
    res.innerHTML = hits.length
      ? `<div class="results">` + hits.map(h =>
          `<button onclick="go('topic',{exam:'${h.ei}',subject:'${h.si}',chapter:'${h.ci}',topic:'${h.ti}'})">
            <span class="rt">${esc(h.t.name)}</span><span class="rp">${esc(h.path)}</span></button>`).join("") + `</div>`
      : `<div class="results"><div class="none"><span class="rt">Nothing found</span>
         <span class="rp">Try a shorter word, like "cell" or "motion"</span></div></div>`;
  });
}

/* ---------- exam: subject cards ---------- */
function renderExam(ex) {
  const f = FIELD[state.exam] || { key: "other" };
  app.innerHTML = pageHead(ex.name, `${esc(ex.desc)}. Pick a subject to see its chapters.`, `<span lang="ta">${esc(ex.tamil || "")}</span>`) +
  `<div class="subjects f-${f.key}">` +
   Object.entries(ex.subjects).map(([id, s]) => {
     const t = tally(s);
     return `<button class="subject" onclick="go('subject',{exam:'${state.exam}',subject:'${id}'})">
       <span class="tile">${icon(id)}</span>
       <span class="s-name">${esc(s.name)}</span>
       <span class="s-meta">${count(s.chapters)} chapters · ${t.topics} topics</span>
       ${meter(t.ready, t.topics)}
       <span class="s-ready">${t.ready ? `${t.ready} of ${t.topics} notes ready` : "Notes being written"}</span>
     </button>`;
   }).join("") + `</div>
   <button class="back" onclick="go('home')">All exams</button>`;
}

/* ---------- subject: chapters in syllabus order ---------- */
function renderSubject(ex, sub) {
  app.innerHTML = pageHead(sub.name, `Chapters follow the ${esc(ex.name)} syllabus order.`) +
  `<div class="list">` +
   Object.entries(sub.chapters).map(([id, c], i) => {
     const t = tally(c);
     return `<button class="row" onclick="go('chapter',{exam:'${state.exam}',subject:'${state.subject}',chapter:'${id}'})">
       <span class="num">${i + 1}</span>
       <span class="body"><span class="t">${esc(c.name)}</span>
       <span class="m">${t.topics} topics${t.ready ? ` · <b>${t.ready === t.topics ? "all notes ready" : t.ready + " notes ready"}</b>` : ""}</span></span>${chev}</button>`;
   }).join("") + `</div>
   <button class="back" onclick="go('exam',{exam:'${state.exam}'})">Back to ${esc(ex.name)}</button>`;
}

/* ---------- chapter: its topics ---------- */
function renderChapter(ex, sub, ch) {
  app.innerHTML = pageHead(ch.name, "Choose a topic to open its notes.") +
  `<div class="list">` +
   Object.entries(ch.topics).map(([id, t]) =>
     `<button class="row" onclick="go('topic',{exam:'${state.exam}',subject:'${state.subject}',chapter:'${state.chapter}',topic:'${id}'})">
       <span class="body"><span class="t">${esc(t.name)}</span></span>
       ${t.academic ? `<span class="pill">Notes ready</span>` : `<span class="pill soon">Being written</span>`}${chev}</button>`
   ).join("") + `</div>
   <button class="back" onclick="go('subject',{exam:'${state.exam}',subject:'${state.subject}'})">Back to ${esc(sub.name)}</button>`;
}

/* ---------- topic: the two buttons ---------- */
function renderTopic(ex, sub, ch, tp) {
  const teachers = tp.teacher || [];
  const base = `{exam:'${state.exam}',subject:'${state.subject}',chapter:'${state.chapter}',topic:'${state.topic}'}`;
  app.innerHTML = pageHead(tp.name, "Two ways to study this topic.") +
  `<div class="gate">
     <button class="academic" onclick="go('academic',${base})">
       <span class="ic">${icon("book")}</span>
       <span class="g-body"><span class="gt">Academic notes</span>
       <span class="gd">The full explanation written to the ${esc(ex.name)} syllabus, with previous year questions.</span>
       <span class="tag">${tp.academic ? "Ready to read" : "Being written"}</span></span>
     </button>
     <button class="teacher" onclick="go('teacher',${base})">
       <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></span>
       <span class="g-body"><span class="gt">Teacher notes</span>
       <span class="gd">Notes and worked problems shared by government school teachers of Sivagangai.</span>
       <span class="tag">${teachers.length ? teachers.length + " shared" : "None shared yet"}</span></span>
     </button>
   </div>
   <button class="back" onclick="go('chapter',{exam:'${state.exam}',subject:'${state.subject}',chapter:'${state.chapter}'})">Back to ${esc(ch.name)}</button>`;
}

/* ---------- academic notes: markdown or pdf ---------- */
function renderAcademic(ex, sub, ch, tp) {
  const base = `{exam:'${state.exam}',subject:'${state.subject}',chapter:'${state.chapter}',topic:'${state.topic}'}`;
  const head = pageHead(tp.name, `Academic notes for the ${esc(ex.name)} syllabus.`);
  const backBtn = `<button class="back" onclick="go('topic',${base})">Back to the topic</button>`;

  if (!tp.academic) {
    app.innerHTML = head + `<div class="empty"><strong>These notes are being written</strong>
      Tell the Vidhya Vidhai team which chapters your students need first and we will write those next.</div>` + backBtn;
    return;
  }
  showFile(tp.academic, head, backBtn);
}

/* ---------- teacher notes ---------- */
function renderTeacher(ex, sub, ch, tp) {
  const list = tp.teacher || [];
  const base = `{exam:'${state.exam}',subject:'${state.subject}',chapter:'${state.chapter}',topic:'${state.topic}'}`;
  const head = pageHead(tp.name, "Teacher notes, shared by teachers in the district.");
  const backBtn = `<button class="back" onclick="go('topic',${base})">Back to the topic</button>`;

  if (!list.length) {
    app.innerHTML = head + `<div class="empty"><strong>No teacher has shared notes for this topic yet</strong>
      When a teacher sends a PDF or a scanned notebook page for this topic, it appears here for every student.</div>` + backBtn;
    return;
  }
  const cards = list.map(d => `<div class="doc"><span class="dic">${icon("book")}</span>
     <span><span class="dt">${esc(d.title)}</span>
     <span class="dm">${esc(d.by || "")}${d.date ? " · " + esc(d.date) : ""}</span></span></div>`).join("");
  showFile(list[0].file, head + cards, backBtn);
}

/* ---------- the one function that opens any file ---------- */
function showFile(path, head, backBtn) {
  if (path.toLowerCase().endsWith(".pdf")) {
    app.innerHTML = head +
      `<a class="dl" href="${esc(path)}" download>Download this PDF</a>
       <object class="pdfbox" data="${esc(path)}" type="application/pdf">
         <div class="empty"><strong>Your phone cannot show PDFs inside the page</strong>
         Use the download button above to open it.</div>
       </object>` + backBtn;
    return;
  }
  app.innerHTML = head + `<p class="loading">Opening the notes…</p>` + backBtn;
  fetch(path)
    .then(r => { if (!r.ok) throw new Error(); return r.text(); })
    .then(md => {
      app.innerHTML = head + `<article class="note">${marked.parse(md)}</article>` + backBtn;
      prepareNote(app.querySelector(".note"));
      window.scrollTo(0, wantScroll);    // notes load a moment later, so scroll again
    })
    .catch(() => {
      app.innerHTML = head + `<div class="empty"><strong>That file could not be opened</strong>
        Check that the path in syllabus.json matches the real file name exactly, including capital letters.</div>` + backBtn;
    });
}

/* ---------- inside a note: contents list and jump links ----------
   Each heading gets a label (id) made from its text, for example
   "## 3. Blood Groups" gets "3-blood-groups". Notes with three or more
   main sections get a "Contents" list at the top that jumps to them.
   Wide tables get their own sideways scroll so phones show them fully. */
function slug(text) {
  return text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");
}

function prepareNote(note) {
  const used = {};
  const heads = [...note.querySelectorAll("h2, h3, h4")];
  heads.forEach(h => {
    let id = slug(h.textContent) || "section";
    if (used[id]) id += "-" + used[id]++; else used[id] = 1;
    h.id = id;
  });

  const main = heads.filter(h => h.tagName === "H2");
  if (main.length >= 3) {
    const box = document.createElement("details");
    box.className = "toc";
    box.innerHTML = `<summary>Contents <span>${main.length} sections</span></summary><ul>` +
      main.map(h => `<li><a href="#${h.id}">${esc(h.textContent)}</a></li>`).join("") + `</ul>`;
    note.prepend(box);
  }

  note.querySelectorAll("table").forEach(t => {
    const holder = document.createElement("div");
    holder.className = "table-scroll";
    t.replaceWith(holder);
    holder.appendChild(t);
  });
}

// links like "#3-blood-groups" scroll within the note instead of changing the page
app.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute("href").startsWith("#/")) return;   // "#/..." are page addresses
  e.preventDefault();
  const target = document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)));
  if (!target) return;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
});

/* ---------- theme ---------- */
// the button always names the theme you would switch TO
const tb = document.getElementById("themeBtn");
const isDark = () => document.documentElement.getAttribute("data-theme") === "dark"
  || (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
tb.textContent = isDark() ? "Light" : "Dark";
tb.onclick = () => {
  const dark = isDark();
  document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
  tb.textContent = dark ? "Dark" : "Light";
};
