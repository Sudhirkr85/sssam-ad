/* ==========================================================
   Admin Panel – JS Module: ui.js
   Toast, modal helpers, and shared rendering utilities.
   ========================================================== */

/* ── Toast System ── */
const Toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  function show(type, title, message, duration = 3800) {
    const icons = { success: "✅", error: "❌", warn: "⚠️" };
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || "ℹ️"}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ""}
      </div>
    `;
    getContainer().appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  return {
    success: (title, msg) => show("success", title, msg),
    error:   (title, msg) => show("error", title, msg),
    warn:    (title, msg) => show("warn", title, msg),
  };
})();

/* ── Modal System ── */
const Modal = (() => {
  const backdrop = document.getElementById("modalBackdrop");
  const modalBox = document.getElementById("modalBox");

  function open(html) {
    modalBox.innerHTML = html;
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
    modalBox.innerHTML = "";
  }

  backdrop?.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  return { open, close };
})();

/* ── Badge Helper ── */
function statusBadge(status) {
  if (!status) return '<span class="badge badge-pending">Unknown</span>';
  const s = String(status).toLowerCase();
  const map = {
    pending:   "badge-pending",
    approved:  "badge-approved",
    rejected:  "badge-rejected",
    verified:  "badge-verified",
    legacy:    "badge-legacy",
    new:       "badge-new",
    contacted: "badge-contacted",
    follow_up: "badge-pending",
    converted: "badge-converted",
  };
  const cls = map[s] || "badge-pending";
  return `<span class="badge ${cls}">${status}</span>`;
}

/* ── Dot Status ── */
function statusDot(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    pending:  "dot-amber",
    approved: "dot-green",
    rejected: "dot-red",
    new:      "dot-blue",
    contacted:"dot-blue",
    converted:"dot-green",
    verified: "dot-blue",
  };
  return `<span class="dot ${map[s] || "dot-amber"}"></span>`;
}

/* ── Relative Time ── */
function relativeTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Format Date ── */
function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/* ── Pagination Renderer ── */
function renderPagination(containerId, pagination, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const { page, totalPages, total } = pagination;
  const from = ((page - 1) * 10) + 1;
  const to = Math.min(page * 10, total);

  el.innerHTML = `
    <span class="pagination-info">Showing <strong>${total ? from : 0}–${to}</strong> of <strong>${total}</strong></span>
    <div class="page-btns">
      <button class="page-btn" id="prevPage" ${page <= 1 ? "disabled" : ""}>← Prev</button>
      <button class="page-btn active">${page} / ${totalPages}</button>
      <button class="page-btn" id="nextPage" ${page >= totalPages ? "disabled" : ""}>Next →</button>
    </div>
  `;

  el.querySelector("#prevPage")?.addEventListener("click", () => onPageChange(page - 1));
  el.querySelector("#nextPage")?.addEventListener("click", () => onPageChange(page + 1));
}

/* ── Loading Spinner Row ── */
function loadingRow(colSpan = 6) {
  return `<tr><td colspan="${colSpan}" style="text-align:center;padding:40px">
    <div class="spinner" style="margin:0 auto"></div>
  </td></tr>`;
}

/* ── Empty Row ── */
function emptyRow(colSpan = 6, msg = "No records found") {
  return `<tr class="empty-row"><td colspan="${colSpan}">📭 ${msg}</td></tr>`;
}

/* ── Expose ── */
window.Toast = Toast;
window.Modal = Modal;
window.statusBadge = statusBadge;
window.statusDot = statusDot;
window.relativeTime = relativeTime;
window.fmtDate = fmtDate;
window.renderPagination = renderPagination;
window.loadingRow = loadingRow;
window.emptyRow = emptyRow;
