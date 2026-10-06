import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

const CATS = {
  capcut_buddy_win: { label: "CAPCUT BUDDY WIN", color: "var(--c1)", amount: true },
  buddy_not_win:    { label: "BUDDY NOT WIN",    color: "var(--c2)", amount: true },
  partner_account:  { label: "PARTNER ACCOUNT",  color: "var(--c3)", amount: true },
  apply_need:       { label: "APPLY NEED",       color: "var(--c4)", amount: false }
};
const KEYS = Object.keys(CATS);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const usd = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); };

let app, auth, db, user = null, records = [], unsub = null, view = "home", query = "", signup = false;

if (firebaseConfig.apiKey.startsWith("PASTE")) {
  document.body.innerHTML = '<div class="auth"><h1>Setup needed</h1><p>Open <b>firebase-config.js</b> and paste your own Firebase web app config, then reload.</p></div>';
} else {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  onAuthStateChanged(auth, u => {
    user = u;
    if (unsub) { unsub(); unsub = null; }
    records = [];
    if (u) {
      unsub = onSnapshot(collection(db, "users", u.uid, "accounts"), snap => {
        records = snap.docs.map(d => d.data());
        render();
      }, e => toast("Sync error: " + e.code));
    }
    render();
  });
}

const col = () => collection(db, "users", user.uid, "accounts");
const sorted = list => [...list].sort((a, b) => b.updatedAt - a.updatedAt);

function render() {
  const el = $("#app");
  if (!user) return renderAuth(el);
  if (view === "home") return renderHome(el);
  if (view === "settings") return renderSettings(el);
  renderList(el);
}

function renderAuth(el) {
  el.innerHTML = `<div class="auth"><h1>N M Creator Account</h1><p>${signup ? "Create your app login" : "Log in to your app account"}</p>
  <label>App email</label><input id="em" type="email" autocomplete="email">
  <label>App password (min 6 characters)</label><input id="pw" type="password" autocomplete="${signup ? "new-password" : "current-password"}">
  <div class="err" id="err"></div>
  <button class="btn" id="go">${signup ? "Sign Up" : "Login"}</button>
  <button class="link" id="sw">${signup ? "Already have an account? Login" : "New here? Sign Up"}</button>
  <p style="font-size:.8rem;margin-top:14px">This login is only for this app. Never enter passwords of the Gmail accounts you track.</p></div>`;
  $("#sw").onclick = () => { signup = !signup; renderAuth(el); };
  $("#go").onclick = async () => {
    const e = $("#em").value.trim(), p = $("#pw").value;
    $("#err").textContent = "";
    try { signup ? await createUserWithEmailAndPassword(auth, e, p) : await signInWithEmailAndPassword(auth, e, p); }
    catch (x) { $("#err").textContent = ({ "auth/invalid-credential": "Wrong email or password.", "auth/email-already-in-use": "That email already has an account. Use Login.", "auth/weak-password": "Password must be at least 6 characters.", "auth/invalid-email": "Enter a valid email.", "auth/network-request-failed": "No internet connection." })[x.code] || x.message; }
  };
}

function renderHome(el) {
  const total = records.filter(r => CATS[r.category]?.amount).reduce((s, r) => s + (Number(r.dollarAmount) || 0), 0);
  const cnt = k => records.filter(r => r.category === k).length;
  el.innerHTML = `<div class="wrap"><div class="top"><h1>N M Creator Account</h1><button class="icon-btn" id="st" aria-label="Settings">⚙</button></div>
  <div class="total"><small>Total dollar amount</small><div class="big">${usd(total)}</div><div class="n">${records.length} total accounts</div></div>
  <div class="grid">${KEYS.map((k, i) => `<button class="cat" style="--cc:${CATS[k].color}" data-k="${k}"><b>${CATS[k].label}</b><span class="cnt">${cnt(k)}</span></button>`).join("")}
  <button class="cat wide" style="--cc:var(--c5)" data-k="all"><b>ALL CREATOR ACCOUNT CENTRE</b><span class="sub">${records.length} accounts · search and manage everything</span></button></div></div>`;
  $("#st").onclick = () => { view = "settings"; render(); };
  el.querySelectorAll(".cat").forEach(b => b.onclick = () => { view = b.dataset.k; query = ""; render(); });
}

function renderList(el) {
  const all = view === "all";
  const q = query.trim().toLowerCase();
  let list = all ? records : records.filter(r => r.category === view);
  if (q) list = list.filter(r => [r.accountName, r.deviceName, CATS[r.category]?.label].some(v => (v || "").toLowerCase().includes(q)));
  list = sorted(list);
  const title = all ? "ALL CREATOR ACCOUNT CENTRE" : CATS[view].label;
  el.innerHTML = `<div class="wrap"><div class="top"><button class="icon-btn" id="bk" aria-label="Back">←</button><h1>${title}</h1></div>
  ${all ? `<input type="search" id="q" placeholder="Search account, device or category" value="${esc(query)}">` : ""}
  <div id="items">${list.length ? list.map(rowHtml).join("") : `<div class="empty">${q ? "No matches." : "No accounts yet. Tap Add account."}</div>`}</div>
  ${all ? "" : `<button class="fab" id="add">+ Add account</button>`}</div>`;
  $("#bk").onclick = () => { view = "home"; render(); };
  if (all) $("#q").oninput = e => { query = e.target.value; const pos = e.target.selectionStart; render(); const n = $("#q"); n.focus(); n.setSelectionRange(pos, pos); };
  if (!all) $("#add").onclick = () => openForm(null, view);
  el.querySelectorAll("[data-e]").forEach(b => b.onclick = () => openForm(records.find(r => r.id === b.dataset.e)));
  el.querySelectorAll("[data-d]").forEach(b => b.onclick = () => confirmDelete(b.dataset.d));
}

function rowHtml(r) {
  const c = CATS[r.category];
  return `<div class="row" style="--cc:${c.color}"><div class="main"><div class="nm">${esc(r.accountName)}</div>
  <div class="meta">Device: ${esc(r.deviceName)}</div>${view === "all" ? `<span class="tag">${c.label}</span>` : ""}</div>
  ${c.amount ? `<div class="amt">${usd(r.dollarAmount)}</div>` : ""}
  <div class="acts"><button class="sm" data-e="${esc(r.id)}">Edit</button><button class="sm del" data-d="${esc(r.id)}">Delete</button></div></div>`;
}

function openForm(rec, cat) {
  const category = rec ? rec.category : cat;
  const dlg = $("#dlg");
  dlg.innerHTML = `<h2>${rec ? "Edit" : "Add"} account</h2>
  ${rec && view === "all" ? "" : ""}
  <label>Account/Gmail Name</label><input type="text" id="f_n" maxlength="200" value="${esc(rec?.accountName)}">
  ${CATS[category].amount ? `<label>Dollar Amount</label><input type="number" id="f_a" inputmode="decimal" step="0.01" min="0" value="${rec ? esc(rec.dollarAmount) : ""}">` : ""}
  <label>Device Name</label><input type="text" id="f_d" maxlength="100" value="${esc(rec?.deviceName)}">
  <div class="err" id="f_e"></div>
  <div class="btns"><button class="btn ghost" id="f_c">Cancel</button><button class="btn" id="f_s">Save</button></div>`;
  dlg.showModal();
  $("#f_c").onclick = () => dlg.close();
  $("#f_s").onclick = async () => {
    const name = $("#f_n").value.trim(), dev = $("#f_d").value.trim();
    let amt = null;
    if (CATS[category].amount) { amt = parseFloat($("#f_a").value); if (!isFinite(amt) || amt < 0) return $("#f_e").textContent = "Enter a dollar amount (0 or more)."; }
    if (!name || !dev) return $("#f_e").textContent = "Account name and device name are required.";
    const now = Date.now(), id = rec?.id || crypto.randomUUID();
    const data = { id, userId: user.uid, category, accountName: name, dollarAmount: amt, deviceName: dev, createdAt: rec?.createdAt || now, updatedAt: now };
    dlg.close();
    try { await setDoc(doc(col(), id), data); toast(rec ? "Account updated" : "Account added"); }
    catch (e) { toast("Save failed: " + e.code); }
  };
}

function confirmDelete(id) {
  const dlg = $("#dlg");
  dlg.innerHTML = `<h2>Are you sure you want to delete this account?</h2><div class="btns"><button class="btn ghost" id="d_c">Cancel</button><button class="btn danger" id="d_d">Delete</button></div>`;
  dlg.showModal();
  $("#d_c").onclick = () => dlg.close();
  $("#d_d").onclick = async () => { dlg.close(); try { await deleteDoc(doc(col(), id)); toast("Account deleted"); } catch (e) { toast("Delete failed: " + e.code); } };
}

function renderSettings(el) {
  el.innerHTML = `<div class="wrap set"><div class="top"><button class="icon-btn" id="bk" aria-label="Back">←</button><h1>Settings</h1></div>
  <p class="sync">Signed in as ${esc(user.email)}. Data syncs live between all phones using this login.</p>
  <button class="btn" id="bu">Backup Data (JSON)</button>
  <button class="btn ghost" id="ej">Export Data (JSON)</button>
  <button class="btn ghost" id="ec">Export Data (CSV)</button>
  <button class="btn ghost" id="rs">Restore Data</button>
  <input type="file" id="file" accept="application/json,.json" hidden>
  <button class="btn danger" id="lo">Logout</button></div>`;
  $("#bk").onclick = () => { view = "home"; render(); };
  $("#bu").onclick = () => download(`nm-backup-${stamp()}.json`, jsonOut(), "application/json");
  $("#ej").onclick = () => download(`nm-export-${stamp()}.json`, jsonOut(), "application/json");
  $("#ec").onclick = () => download(`nm-export-${stamp()}.csv`, csvOut(), "text/csv");
  $("#rs").onclick = () => $("#file").click();
  $("#file").onchange = e => e.target.files[0] && readRestore(e.target.files[0]);
  $("#lo").onclick = async () => { view = "home"; await signOut(auth); };
}

const stamp = () => new Date().toISOString().slice(0, 10);
const clean = r => ({ id: r.id, userId: r.userId, category: r.category, accountName: r.accountName, dollarAmount: r.dollarAmount ?? null, deviceName: r.deviceName, createdAt: r.createdAt, updatedAt: r.updatedAt });
const jsonOut = () => JSON.stringify({ app: "N M Creator Account", version: 1, exportedAt: new Date().toISOString(), records: sorted(records).map(clean) }, null, 2);
const csvCell = v => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
const csvOut = () => ["id,category,accountName,dollarAmount,deviceName,createdAt,updatedAt"].concat(sorted(records).map(r =>
  [r.id, CATS[r.category].label, r.accountName, r.dollarAmount ?? "", r.deviceName, new Date(r.createdAt).toISOString(), new Date(r.updatedAt).toISOString()].map(csvCell).join(","))).join("\n");
function download(name, text, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("File saved to Downloads");
}

async function readRestore(file) {
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.records;
    if (!Array.isArray(list)) throw new Error("bad");
    const valid = [];
    for (const r of list) {
      if (!r || typeof r.id !== "string" || !r.id || r.id.includes("/") || !KEYS.includes(r.category)) continue;
      const name = String(r.accountName || "").trim().slice(0, 200), dev = String(r.deviceName || "").trim().slice(0, 100);
      if (!name || !dev) continue;
      let amt = null;
      if (CATS[r.category].amount) { amt = Number(r.dollarAmount); if (!isFinite(amt) || amt < 0) continue; }
      const now = Date.now();
      valid.push({ id: r.id, userId: user.uid, category: r.category, accountName: name, dollarAmount: amt, deviceName: dev, createdAt: Number(r.createdAt) || now, updatedAt: Number(r.updatedAt) || now });
    }
    const have = new Map(records.map(r => [r.id, r]));
    const toWrite = valid.filter(r => !have.has(r.id) || have.get(r.id).updatedAt < r.updatedAt);
    const added = toWrite.filter(r => !have.has(r.id)).length, updated = toWrite.length - added;
    const dlg = $("#dlg");
    dlg.innerHTML = `<h2>Restore data?</h2><p>${valid.length} valid records found.<br>${added} will be added, ${updated} will be updated (backup is newer), ${valid.length - toWrite.length} skipped.<br><b>Nothing will be deleted.</b></p>
    <div class="btns"><button class="btn ghost" id="r_c">Cancel</button><button class="btn" id="r_o">Restore</button></div>`;
    dlg.showModal();
    $("#r_c").onclick = () => dlg.close();
    $("#r_o").onclick = async () => {
      dlg.close();
      try {
        for (let i = 0; i < toWrite.length; i += 400) {
          const b = writeBatch(db); toWrite.slice(i, i + 400).forEach(r => b.set(doc(col(), r.id), r)); await b.commit();
        }
        toast(`Restored: ${added} added, ${updated} updated`);
      } catch (e) { toast("Restore failed: " + e.code); }
    };
  } catch { toast("That file is not a valid backup."); }
  $("#file").value = "";
}
