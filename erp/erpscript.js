// ================================================================
//  ADD YOUR JSON FILES HERE
// ================================================================
const FILES = [
  {
    label: "JavaScript",
    url: "https://raw.githubusercontent.com/Hamza123455/masterfile/main/erp_assistant_code/invoice_posting.json"
  },
  /*{
    label: "Python",
    url: "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/python.json"
  },*/
];
// ================================================================

const fileList     = document.getElementById("fileList");
const welcome      = document.getElementById("welcome");
const snippetPanel = document.getElementById("snippetPanel");
const panelTitle   = document.getElementById("panelTitle");
const countLabel   = document.getElementById("countLabel");
const grid         = document.getElementById("grid");
const searchInput  = document.getElementById("searchInput");
const sidebar      = document.getElementById("sidebar");
const overlay      = document.getElementById("overlay");
const themeCheck   = document.getElementById("themeCheck");

let currentSnippets = [];

// ── Theme ──
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeCheck.checked = (theme === "light");
  localStorage.setItem("theme", theme);
}

// Load saved theme or default dark
applyTheme(localStorage.getItem("theme") || "dark");

themeCheck.addEventListener("change", () => {
  applyTheme(themeCheck.checked ? "light" : "dark");
});

// ── Sidebar ──
FILES.forEach((f, i) => {
  const item = document.createElement("div");
  item.className = "file-item";
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");
  item.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
    <span>${esc(f.label)}</span>`;
  item.addEventListener("click", () => loadFile(i));
  item.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " ") loadFile(i); });
  fileList.appendChild(item);
});

// ── Load file ──
async function loadFile(i) {
  fileList.querySelectorAll(".file-item").forEach((el, j) =>
    el.classList.toggle("active", j === i));

  if (window.innerWidth <= 640) closeSidebar();

  welcome.style.display = "none";
  snippetPanel.style.display = "block";
  panelTitle.textContent = FILES[i].label;
  countLabel.textContent = "";
  searchInput.value = "";
  grid.innerHTML = `<div class="state"><div class="spin"></div>Loading snippets…</div>`;

  try {
    const res = await fetch(FILES[i].url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    currentSnippets = Array.isArray(data) ? data : (data.snippets ?? []);
    render();
  } catch (err) {
    grid.innerHTML = `<div class="state">
      <p style="font-size:.9rem;margin-bottom:.3rem;color:var(--text)">⚠ Failed to load</p>
      <p style="font-size:.75rem">${err.message}</p>
    </div>`;
  }
}

// ── Render cards ──
function render() {
  const q = searchInput.value.trim().toLowerCase();
  const list = currentSnippets.filter(s =>
    !q || [s.title, s.description, s.code]
      .filter(Boolean).some(v => v.toLowerCase().includes(q))
  );

  countLabel.textContent = list.length + (list.length !== 1 ? " snippets" : " snippet");

  if (!list.length) {
    grid.innerHTML = `<div class="state">No snippets match your search.</div>`;
    return;
  }

  grid.innerHTML = list.map(s => {
    const code  = s.code || "";
    const lines = code.split("\n").length;
    return `
    <article class="card">
      <div class="card-accent-bar"></div>
      <div class="card-top">
        <div class="card-title">${esc(s.title || "Untitled")}</div>
        ${s.description ? `<div class="card-desc">${esc(s.description)}</div>` : ""}
      </div>
      <div class="code-area">
        <div class="code-bar">
          <span>${lines} line${lines !== 1 ? "s" : ""}</span>
          <button class="copy-btn" data-code="${encodeURIComponent(code)}">
            ${iCopy()} Copy
          </button>
        </div>
        <pre><code>${esc(code)}</code></pre>
      </div>
    </article>`;
  }).join("");

  grid.querySelectorAll(".copy-btn").forEach(btn =>
    btn.addEventListener("click", async () => {
      const text = decodeURIComponent(btn.dataset.code);
      try { await navigator.clipboard.writeText(text); } catch { fbCopy(text); }
      btn.classList.add("ok");
      btn.innerHTML = iCheck() + " Copied!";
      setTimeout(() => { btn.classList.remove("ok"); btn.innerHTML = iCopy() + " Copy"; }, 2000);
    })
  );
}

searchInput.addEventListener("input", render);

// ── Toggle sidebar ──
document.getElementById("toggleBtn").addEventListener("click", () => {
  sidebar.classList.toggle("closed");
  overlay.classList.toggle("show");
});
overlay.addEventListener("click", closeSidebar);
function closeSidebar() {
  sidebar.classList.add("closed");
  overlay.classList.remove("show");
}

// ── Helpers ──
function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function fbCopy(t) {
  const ta = Object.assign(document.createElement("textarea"), {value:t, style:"position:fixed;opacity:0"});
  document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
}
function iCopy() {
  return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
}
function iCheck() {
  return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
}