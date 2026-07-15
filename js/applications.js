/* ==========================================================
   Admin Panel – JS Module: applications.js
   Handles Applications tab: list, approve, reject, edit.
   ========================================================== */

const AppsView = (() => {
  let state = { page: 1, limit: 10, search: "", status: "", loading: false };

  /* ── Render ── */
  async function render() {
    document.getElementById("pageTitle").textContent = "Certificate Applications";
    const content = document.getElementById("pageContent");
    content.innerHTML = `
      <div class="stats-row" id="appStats"></div>
      <div class="panel page-view">
        <div class="panel-head">
          <span class="panel-head-title">📋 All Applications</span>
          <div class="panel-head-filters">
            <select class="filter-select" id="appStatusFilter">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table" id="appTable">
            <thead>
              <tr>
                <th>App ID</th>
                <th>Full Name</th>
                <th>Course</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="appTbody"><tr>${loadingRow(8)}</tr></tbody>
          </table>
        </div>
        <div class="pagination" id="appPagination"></div>
      </div>
    `;
    bindFilters();
    await loadStats();
    await loadApplications();
  }

  function bindFilters() {
    const filter = document.getElementById("appStatusFilter");
    filter?.addEventListener("change", () => {
      state.status = filter.value;
      state.page = 1;
      loadApplications();
    });
  }

  async function loadStats() {
    try {
      const [pending, approved, rejected] = await Promise.all([
        API.Applications.list({ status: "pending", limit: 1 }),
        API.Applications.list({ status: "approved", limit: 1 }),
        API.Applications.list({ status: "rejected", limit: 1 }),
      ]);
      const el = document.getElementById("appStats");
      if (!el) return;
      el.innerHTML = `
        ${statCard("⏳", "gold",  "Pending",  pending.pagination?.total  || 0)}
        ${statCard("✅", "green", "Approved", approved.pagination?.total || 0)}
        ${statCard("❌", "red",   "Rejected", rejected.pagination?.total || 0)}
      `;
    } catch (e) { /* non-critical */ }
  }

  function statCard(icon, color, label, value) {
    return `<div class="stat-card">
      <div class="stat-icon ${color}">${icon}</div>
      <div class="stat-info">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    </div>`;
  }

  async function loadApplications() {
    if (state.loading) return;
    state.loading = true;
    const tbody = document.getElementById("appTbody");
    if (tbody) tbody.innerHTML = loadingRow(8);

    try {
      const res = await API.Applications.list({
        page: state.page, limit: state.limit,
        search: state.search, status: state.status,
      });

      const rows = res.data?.map(app => appRow(app)).join("") || "";
      if (tbody) tbody.innerHTML = rows || emptyRow(8, "No applications yet");

      renderPagination("appPagination", res.pagination, (p) => { state.page = p; loadApplications(); });
    } catch (e) {
      if (tbody) tbody.innerHTML = emptyRow(8, e.message);
      Toast.error("Failed to load applications", e.message);
    } finally { state.loading = false; }
  }

  function appRow(app) {
    const isPending = (app.status || "").toLowerCase() === "pending";
    return `<tr>
      <td><code class="td-mono">${app.applicationId || "—"}</code></td>
      <td class="td-name">${app.fullName || "—"}</td>
      <td>${app.course || "—"}</td>
      <td>${app.email || "—"}</td>
      <td>${app.phoneNumber || "—"}</td>
      <td>${statusBadge(app.status)}</td>
      <td>${relativeTime(app.createdAt)}</td>
      <td>
        <div class="action-group">
          <button class="act-btn act-view" onclick="AppsView.showDetail('${app.applicationId}')">View</button>
          ${isPending ? `
            <button class="act-btn act-approve" onclick="AppsView.approve('${app.applicationId}')">Approve</button>
            <button class="act-btn act-reject"  onclick="AppsView.openReject('${app.applicationId}')">Reject</button>
          ` : ""}
        </div>
      </td>
    </tr>`;
  }

  async function showDetail(appId) {
    Modal.open(`<div class="spinner" style="margin:20px auto"></div>`);
    try {
      const res = await API.Applications.get(appId);
      const a = res.data;
      Modal.open(`
        <h3 class="modal-title">📄 Application Detail</h3>
        <div class="info-grid">
          ${tile("Application ID",  a.applicationId)}
          ${tile("Full Name",       a.fullName)}
          ${tile("Email",           a.email)}
          ${tile("Phone",           a.phoneNumber)}
          ${tile("Course",          a.course)}
          ${tile("Duration",        a.duration)}
          ${tile("Date of Birth",   fmtDate(a.dateOfBirth))}
          ${tile("Status",          statusBadge(a.status))}
          ${tile("Certificate No.", a.certificateNumber || "—")}
          ${tile("Issue Date",      fmtDate(a.issueDate))}
        </div>
        ${a.rejectionReason ? `<p style="color:var(--red);font-size:.85rem;">❌ Rejection Reason: ${a.rejectionReason}</p>` : ""}
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="Modal.close()">Close</button>
        </div>
      `);
    } catch (e) {
      Toast.error("Failed to load application", e.message);
      Modal.close();
    }
  }

  async function approve(appId) {
    if (!confirm(`Approve application ${appId}? A certificate number will be generated.`)) return;
    try {
      await API.Applications.approve(appId);
      Toast.success("Application Approved", "Certificate number assigned and record created.");
      await loadApplications();
      await loadStats();
    } catch (e) {
      Toast.error("Approval failed", e.message);
    }
  }

  function openReject(appId) {
    Modal.open(`
      <h3 class="modal-title">❌ Reject Application</h3>
      <p style="color:var(--text-muted);font-size:.88rem;margin-bottom:16px;">
        Application: <code>${appId}</code>
      </p>
      <div class="form-group">
        <label>Rejection Reason <span style="color:var(--red)">*</span></label>
        <input id="rejectReason" type="text" placeholder="e.g. Incomplete documents" style="width:100%"/>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-danger" onclick="AppsView.submitReject('${appId}')">Reject</button>
      </div>
    `);
  }

  async function submitReject(appId) {
    const reason = document.getElementById("rejectReason")?.value?.trim();
    if (!reason) { Toast.warn("Reason required", "Please provide a rejection reason."); return; }
    try {
      await API.Applications.reject(appId, reason);
      Toast.success("Application Rejected", reason);
      Modal.close();
      await loadApplications();
      await loadStats();
    } catch (e) {
      Toast.error("Rejection failed", e.message);
    }
  }

  function tile(label, value) {
    return `<div class="info-tile">
      <div class="info-tile-label">${label}</div>
      <div class="info-tile-value">${value ?? "—"}</div>
    </div>`;
  }

  /* ── Public search hook from topbar ── */
  function setSearch(q) {
    state.search = q;
    state.page   = 1;
    loadApplications();
  }

  return { render, approve, openReject, submitReject, showDetail, setSearch };
})();

window.AppsView = AppsView;
