/* ==========================================================
   Admin Panel – JS Module: certificates.js
   Handles Certificates tab: list issued certs, edit records.
   ========================================================== */

const CertsView = (() => {
  let state = { page: 1, limit: 10, search: "", loading: false };

  async function render() {
    document.getElementById("pageTitle").textContent = "Issued Certificates";
    const content = document.getElementById("pageContent");
    content.innerHTML = `
      <div class="panel page-view">
        <div class="panel-head">
          <span class="panel-head-title">🎓 Certificate Records</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Certificate No.</th>
                <th>Full Name</th>
                <th>Course</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="certTbody">${loadingRow(8)}</tbody>
          </table>
        </div>
        <div class="pagination" id="certPagination"></div>
      </div>
    `;
    await loadCertificates();
  }

  async function loadCertificates() {
    if (state.loading) return;
    state.loading = true;
    const tbody = document.getElementById("certTbody");
    if (tbody) tbody.innerHTML = loadingRow(8);

    try {
      const res = await API.Certificates.list({
        page: state.page, limit: state.limit, search: state.search,
      });

      const rows = res.data?.map(c => certRow(c)).join("") || "";
      if (tbody) tbody.innerHTML = rows || emptyRow(8, "No certificates issued yet");

      renderPagination("certPagination", res.pagination, (p) => {
        state.page = p;
        loadCertificates();
      });
    } catch (e) {
      if (tbody) tbody.innerHTML = emptyRow(8, e.message);
      Toast.error("Failed to load certificates", e.message);
    } finally { state.loading = false; }
  }

  function certRow(c) {
    return `<tr>
      <td><span class="td-mono">${c.certificateNumber || "—"}</span></td>
      <td class="td-name">${c.fullName || "—"}</td>
      <td>${c.course || "—"}</td>
      <td>${c.certificateType || "—"}</td>
      <td>${c.duration || "—"}</td>
      <td>${fmtDate(c.issueDate)}</td>
      <td>${statusBadge(c.status || "Verified")}</td>
      <td>
        <div class="action-group">
          <button class="act-btn act-view" onclick="CertsView.openEdit('${c.certificateNumber}')">Edit</button>
        </div>
      </td>
    </tr>`;
  }

  function openEdit(certNumber) {
    Modal.open(`
      <h3 class="modal-title">✏️ Edit Certificate</h3>
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:18px;">
        Certificate: <code>${certNumber}</code>
      </p>
      <div class="form-group">
        <label>Full Name</label>
        <input id="editFullName" type="text" placeholder="Leave blank to keep current" />
      </div>
      <div class="form-group">
        <label>Course</label>
        <input id="editCourse" type="text" placeholder="Leave blank to keep current" />
      </div>
      <div class="form-group">
        <label>Duration</label>
        <input id="editDuration" type="text" placeholder="e.g. 3 months" />
      </div>
      <div class="form-group">
        <label>Certificate Type</label>
        <input id="editType" type="text" placeholder="e.g. Participation" />
      </div>
      <div class="form-group">
        <label>Issue Date</label>
        <input id="editIssueDate" type="date" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="CertsView.submitEdit('${certNumber}')">Save Changes</button>
      </div>
    `);
  }

  async function submitEdit(certNumber) {
    const payload = {};
    const fullName  = document.getElementById("editFullName")?.value?.trim();
    const course    = document.getElementById("editCourse")?.value?.trim();
    const duration  = document.getElementById("editDuration")?.value?.trim();
    const certType  = document.getElementById("editType")?.value?.trim();
    const issueDate = document.getElementById("editIssueDate")?.value;

    if (fullName)  payload.fullName        = fullName;
    if (course)    payload.course          = course;
    if (duration)  payload.duration        = duration;
    if (certType)  payload.certificateType = certType;
    if (issueDate) payload.issueDate       = issueDate;

    if (!Object.keys(payload).length) {
      Toast.warn("No changes", "Fill in at least one field to update.");
      return;
    }

    try {
      await API.Certificates.update(certNumber, payload);
      Toast.success("Certificate Updated", "Record saved successfully.");
      Modal.close();
      await loadCertificates();
    } catch (e) {
      Toast.error("Update failed", e.message);
    }
  }

  function setSearch(q) { state.search = q; state.page = 1; loadCertificates(); }

  return { render, openEdit, submitEdit, setSearch };
})();

window.CertsView = CertsView;
