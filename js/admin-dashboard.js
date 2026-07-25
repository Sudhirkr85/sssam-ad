window.APP_BASE_URL = "https://api.sssamacademy.com";

// Override native confirm and prompt with beautiful, centered custom modals
let dialogResolver = null;

window.confirm = function(message) {
  return new Promise((resolve) => {
    document.getElementById("customDialogTitle").textContent = "Confirm Action";
    document.getElementById("customDialogBody").textContent = message;
    document.getElementById("customDialogPromptContainer").style.display = "none";
    document.getElementById("customDialogCancelBtn").style.display = "block";
    document.getElementById("customDialogConfirmBtn").textContent = "Confirm";
    
    const modal = document.getElementById("customDialogModal");
    modal.style.display = "flex";
    
    dialogResolver = (value) => {
      modal.style.display = "none";
      resolve(!!value);
    };
  });
};

window.alert = function(message) {
  return new Promise((resolve) => {
    document.getElementById("customDialogTitle").textContent = "Notification";
    document.getElementById("customDialogBody").textContent = message;
    document.getElementById("customDialogPromptContainer").style.display = "none";
    document.getElementById("customDialogCancelBtn").style.display = "none";
    document.getElementById("customDialogConfirmBtn").textContent = "OK";
    
    const modal = document.getElementById("customDialogModal");
    modal.style.display = "flex";
    
    dialogResolver = (value) => {
      modal.style.display = "none";
      resolve(true);
    };
  });
};

window.prompt = function(message, defaultValue = "") {
  return new Promise((resolve) => {
    document.getElementById("customDialogTitle").textContent = "Enter Details";
    document.getElementById("customDialogBody").textContent = message;
    document.getElementById("customDialogPromptContainer").style.display = "block";
    
    const input = document.getElementById("customDialogInput");
    input.value = defaultValue;
    
    document.getElementById("customDialogCancelBtn").style.display = "block";
    document.getElementById("customDialogConfirmBtn").textContent = "Submit";
    
    const modal = document.getElementById("customDialogModal");
    modal.style.display = "flex";
    input.focus();
    
    dialogResolver = (value) => {
      modal.style.display = "none";
      if (value === null || value === false) {
        resolve(null);
      } else {
        resolve(input.value);
      }
    };
  });
};

window.resolveCustomDialog = function(val) {
  if (dialogResolver) {
    dialogResolver(val);
    dialogResolver = null;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("adminToken") || sessionStorage.getItem("sssam_admin_token");
  if (token) {
    showDashboard();
  }

  // Login Handler
  const loginForm = document.getElementById("adminLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      try {
        const res = await fetch(`${window.APP_BASE_URL}/api/admin/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Login failed");

        localStorage.setItem("adminToken", data.data.token);
        showToast("Success", "Login successful!", false);
        showDashboard();
      } catch (err) {
        showToast("Error", err.message, true);
      }
    });
  }

  // Logout
  document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("adminToken");
    location.reload();
  });

  // Tab switches
  const navBtns = document.querySelectorAll(".admin-nav-btn");
  const panels = document.querySelectorAll(".admin-panel-content");
  const panelTitle = document.getElementById("panelTitle");

  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      navBtns.forEach(b => b.classList.remove("active"));
      panels.forEach(p => p.style.display = "none");

      btn.classList.add("active");
      const panelId = `panel-${btn.getAttribute("data-tab") || btn.getAttribute("data-panel")}`;
      document.getElementById(panelId).style.display = "block";
      panelTitle.textContent = btn.textContent;

      // Load panel data
      if (panelId === "panel-applications") loadApplications();
      if (panelId === "panel-certificates") loadCertificates();
      if (panelId === "panel-enquiries") loadEnquiries();
      if (panelId === "panel-seminars") loadSeminars();
      if (panelId === "panel-hiring-requests") loadHiringRequests();
      if (panelId === "panel-placements" && typeof loadPlacements === "function") loadPlacements();
      if (panelId === "panel-blogs" && typeof loadBlogs === "function") loadBlogs();
      if (panelId === "panel-hiring" && typeof loadHiring === "function") loadHiring();
      if (panelId === "panel-notes" && typeof loadNotes === "function") loadNotes();
      if (panelId === "panel-gallery" && typeof loadGallery === "function") loadGallery();
      if (panelId === "panel-settings") loadSettings();

      // Auto close sidebar on mobile tap
      if (typeof closeSidebar === "function") {
        closeSidebar();
      }
    });
  });
});

function showDashboard() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("dashboardScreen").style.display = "flex";
  loadApplications();
  updateDashboardStats();
}

async function adminFetch(url, options = {}) {
  const token = localStorage.getItem("adminToken") || sessionStorage.getItem("sssam_admin_token");
  const headers = Object.assign({
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  }, options.headers);

  const res = await fetch(`${window.APP_BASE_URL}${url}`, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    localStorage.removeItem("adminToken");
    location.reload();
  }
  return res;
}

async function updateDashboardStats() {
  try {
    const [appRes, enqRes] = await Promise.all([
      adminFetch("/api/admin/applications?limit=1000"),
      adminFetch("/api/admin/enquiries?limit=1000")
    ]);
    
    const appData = await appRes.json();
    const enqData = await enqRes.json();
    
    const apps = appData.data || appData || [];
    const enquiries = enqData.data || enqData || [];
    
    const totalApps = apps.length;
    const pendingApps = apps.filter(a => a.status === "Pending").length;
    const approvedApps = apps.filter(a => a.status === "Approved").length;
    const totalEnquiries = enquiries.length;
    
    document.getElementById("stat-total").textContent = totalApps;
    document.getElementById("stat-pending").textContent = pendingApps;
    document.getElementById("stat-approved").textContent = approvedApps;
    document.getElementById("stat-enquiries").textContent = totalEnquiries;
  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }
}
let currentAppPage = 1;
let currentCertPage = 1;
let currentEnqPage = 1;
const PAGE_LIMIT = 10;

window.changeAppPage = function(delta) {
  currentAppPage += delta;
  loadApplications();
};

window.changeCertPage = function(delta) {
  currentCertPage += delta;
  loadCertificates();
};

window.changeEnqPage = function(delta) {
  currentEnqPage += delta;
  loadEnquiries();
};

let searchTimeout;
function debounce(func, delay = 300) {
  return function(...args) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => func.apply(this, args), delay);
  };
}

window.filterApplications = debounce(() => { currentAppPage = 1; loadApplications(); });
window.filterCertificates = debounce(() => { currentCertPage = 1; loadCertificates(); });
window.filterEnquiries = debounce(() => { currentEnqPage = 1; loadEnquiries(); });

async function loadApplications() {
  const tbody = document.getElementById("applicationsTableBody");
  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888;">Loading applications...</td></tr>`;

  const search = document.getElementById("appSearchInput")?.value || "";
  const status = document.getElementById("appStatusFilter")?.value || "";
  const query = new URLSearchParams({ search, status, page: currentAppPage, limit: PAGE_LIMIT }).toString();

  try {
    const res = await adminFetch(`/api/admin/applications?${query}`);
    const result = await res.json();
    const list = result.data || result;
    const pagination = result.pagination || { page: 1, totalPages: 1, total: list.length };

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888;">No applications found.</td></tr>`;
      document.getElementById("appPaginationInfo").textContent = "Showing page 1 of 1";
      document.getElementById("appPrevBtn").disabled = true;
      document.getElementById("appNextBtn").disabled = true;
      return;
    }

    tbody.innerHTML = list.map(app => {
      const displayCourse = app.course && app.course.length > 25 ? app.course.substring(0, 25) + "..." : (app.course || "");
      let displayAppId = app.applicationId || "";
      if (displayAppId.startsWith("SSSAM/APP/")) {
        displayAppId = ".../" + displayAppId.substring("SSSAM/APP/".length);
      } else if (displayAppId.startsWith("SSSAM-APP-")) {
        displayAppId = "..." + displayAppId.substring("SSSAM-APP".length);
      }
      return `
        <tr>
          <td data-label="ID & Name" title="${app.applicationId}">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="color: #e0a730;">${displayAppId}</strong>
              <span style="font-weight: 600;">${app.fullName}</span>
            </div>
          </td>
          <td data-label="Course" title="${app.course || ''}">${displayCourse}</td>
          <td data-label="Type">${app.certificateType}</td>
          <td data-label="Phone">${app.phoneNumber}</td>
          <td data-label="Status"><span style="color: ${app.status === 'Approved' ? '#10b981' : (app.status === 'Rejected' ? '#ef4448' : '#e0a730')}">${app.status}</span></td>
          <td data-label="Actions">
            <span class="action-badge badge-edit" onclick="openEditModal('${encodeURIComponent(JSON.stringify(app))}')">Edit</span>
            ${app.status === "Pending" ? `
              <span class="action-badge badge-approve" onclick="approveApp('${app.applicationId}')">Approve</span>
              <span class="action-badge badge-reject" onclick="rejectApp('${app.applicationId}')">Reject</span>
            ` : ``}
          </td>
        </tr>
      `;
    }).join("");
    
    // Update pagination controls
    currentAppPage = pagination.page;
    document.getElementById("appPaginationInfo").textContent = `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)`;
    document.getElementById("appPrevBtn").disabled = pagination.page <= 1;
    document.getElementById("appNextBtn").disabled = pagination.page >= pagination.totalPages;

    updateDashboardStats();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef5350;">Failed to load applications: ${err.message}</td></tr>`;
  }
}

async function approveApp(appId) {
  if (!await confirm(`Are you sure you want to approve application ${appId}? This generates a certificate number.`)) return;
  try {
    const res = await adminFetch(`/api/admin/applications/${appId}/approve`, { method: "PATCH" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Approve failed");
    showToast("Success", `Approved! Cert Number: ${data.data.certificateNumber}`, false);
    loadApplications();
    updateDashboardStats();
  } catch (err) {
    showToast("Error", err.message, true);
  }
}

async function rejectApp(appId) {
  const reason = await prompt("Enter rejection reason:");
  if (reason === null) return;
  try {
    const res = await adminFetch(`/api/admin/applications/${appId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ remarks: reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Rejection failed");
    showToast("Success", "Application rejected successfully.", false);
    loadApplications();
    updateDashboardStats();
  } catch (err) {
    showToast("Error", err.message, true);
  }
}

async function loadCertificates() {
  const tbody = document.getElementById("certificatesTableBody");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">Loading certificates...</td></tr>`;

  const search = document.getElementById("certSearchInput")?.value || "";
  const query = new URLSearchParams({ search, page: currentCertPage, limit: PAGE_LIMIT }).toString();

  try {
    const res = await adminFetch(`/api/admin/certificates?${query}`);
    const result = await res.json();
    const list = result.data || result;
    const pagination = result.pagination || { page: 1, totalPages: 1, total: list.length };

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">No certificates found.</td></tr>`;
      document.getElementById("certPaginationInfo").textContent = "Showing page 1 of 1";
      document.getElementById("certPrevBtn").disabled = true;
      document.getElementById("certNextBtn").disabled = true;
      return;
    }

    tbody.innerHTML = list.map(cert => {
      const app = cert.application || {};
      const appPayload = {
        applicationId: app.applicationId || cert.applicationId,
        fullName: cert.fullName,
        email: app.email || "",
        phoneNumber: app.phoneNumber || "",
        dateOfBirth: cert.dateOfBirth,
        course: cert.course,
        certificateType: cert.certificateType,
        duration: cert.duration,
        durationDates: app.durationDates || "",
        qualification: cert.qualification || app.qualification || "",
        organization: app.organization || ""
      };
      let displayCertNo = cert.certificateNumber || "";
      if (displayCertNo.startsWith("SSSAM/CERT/")) {
        displayCertNo = ".../" + displayCertNo.substring("SSSAM/CERT/".length);
      }
      const displayCourse = cert.course && cert.course.length > 25 ? cert.course.substring(0, 25) + "..." : (cert.course || "");
      return `
        <tr>
          <td data-label="Cert No & Name" title="${cert.certificateNumber}">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="color: #e0a730;">${displayCertNo}</strong>
              <span style="font-weight: 600;">${cert.fullName}</span>
            </div>
          </td>
          <td data-label="Course" title="${cert.course || ''}">${displayCourse}</td>
          <td data-label="Issue Date">${new Date(cert.issueDate).toLocaleDateString()}</td>
          <td data-label="Status"><span style="color: #10b981;">${cert.status || 'Active'}</span></td>
          <td data-label="Actions">
            <span class="action-badge badge-edit" onclick="openEditModal('${encodeURIComponent(JSON.stringify(appPayload))}')">Edit</span>
          </td>
        </tr>
      `;
    }).join("");

    // Update pagination controls
    currentCertPage = pagination.page;
    document.getElementById("certPaginationInfo").textContent = `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)`;
    document.getElementById("certPrevBtn").disabled = pagination.page <= 1;
    document.getElementById("certNextBtn").disabled = pagination.page >= pagination.totalPages;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef5350;">Failed to load certificates: ${err.message}</td></tr>`;
  }
}

async function loadEnquiries() {
  const tbody = document.getElementById("enquiriesTableBody");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">Loading enquiries...</td></tr>`;

  const search = document.getElementById("enqSearchInput")?.value || "";
  const status = document.getElementById("enqStatusFilter")?.value || "";
  const query = new URLSearchParams({ search, status, page: currentEnqPage, limit: PAGE_LIMIT }).toString();

  try {
    const res = await adminFetch(`/api/admin/enquiries?${query}`);
    const result = await res.json();
    const list = result.data || result;
    const pagination = result.pagination || { page: 1, totalPages: 1, total: list.length };

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">No enquiries found.</td></tr>`;
      document.getElementById("enqPaginationInfo").textContent = "Showing page 1 of 1";
      document.getElementById("enqPrevBtn").disabled = true;
      document.getElementById("enqNextBtn").disabled = true;
      return;
    }

    tbody.innerHTML = list.map(e => {
      const courseText = e.course === 'Others' ? (e.customCourseName ? `Others (${e.customCourseName})` : 'Others') : (e.course || e.message || 'General Enquiry');
      const dateText = e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
      
      return `
        <tr>
          <td data-label="Name"><strong>${e.fullName || e.name || 'N/A'}</strong></td>
          <td data-label="Course"><span style="color: #e0a730; font-weight: 600;">${courseText}</span></td>
          <td data-label="Phone">${e.phoneNumber || e.phone || 'N/A'}</td>
          <td data-label="Email">${e.email || '-'}</td>
          <td data-label="Date"><small style="color: #aaa;">${dateText}</small></td>
          <td data-label="Actions">
            <span class="action-badge badge-reject" style="cursor: pointer; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-right: 5px;" onclick="deleteEnquiry('${e._id || e.id || e.enquiryId}')">Delete</span>
          </td>
        </tr>
      `;
    }).join("");

    // Update pagination controls
    currentEnqPage = pagination.page;
    document.getElementById("enqPaginationInfo").textContent = `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)`;
    document.getElementById("enqPrevBtn").disabled = pagination.page <= 1;
    document.getElementById("enqNextBtn").disabled = pagination.page >= pagination.totalPages;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef5350;">Failed to load enquiries: ${err.message}</td></tr>`;
  }
}

window.deleteEnquiry = async function(id) {
  if (!await confirm("Are you sure you want to delete this enquiry?")) return;
  try {
    const res = await adminFetch(`/api/admin/enquiries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Delete failed");
    }
    showToast("Success", "Enquiry deleted successfully.", false);
    loadEnquiries();
    updateDashboardStats();
  } catch (err) {
    showToast("Error", err.message, true);
  }
};

// ----------------------------------------------------
// EDIT MODAL CONTROLLER
// ----------------------------------------------------
let currentEditingApp = null;

window.openEditModal = function(appJsonStr) {
  try {
    const app = JSON.parse(decodeURIComponent(appJsonStr));
    currentEditingApp = app;

    document.getElementById("editAppId").value = app.applicationId;
    document.getElementById("editFullName").value = app.fullName || "";
    document.getElementById("editEmail").value = app.email || "";
    document.getElementById("editPhone").value = app.phoneNumber || "";

    if (app.dateOfBirth) {
      const dob = new Date(app.dateOfBirth);
      const yyyy = dob.getFullYear();
      const mm = String(dob.getMonth() + 1).padStart(2, '0');
      const dd = String(dob.getDate()).padStart(2, '0');
      document.getElementById("editDob").value = `${yyyy}-${mm}-${dd}`;
    } else {
      document.getElementById("editDob").value = "";
    }

    if (app.issueDate) {
      const issueDate = new Date(app.issueDate);
      const yyyy = issueDate.getFullYear();
      const mm = String(issueDate.getMonth() + 1).padStart(2, '0');
      const dd = String(issueDate.getDate()).padStart(2, '0');
      document.getElementById("editIssueDate").value = `${yyyy}-${mm}-${dd}`;
    } else {
      document.getElementById("editIssueDate").value = "";
    }

    let cleanCourse = app.course || "";
    let organization = app.organization || "";
    const firstParenOpen = cleanCourse.indexOf('(');
    if (firstParenOpen > -1) {
      let rawOrg = cleanCourse.substring(firstParenOpen + 1);
      if (rawOrg.endsWith(')')) {
        rawOrg = rawOrg.slice(0, -1);
      }
      if (!organization) {
        organization = rawOrg.trim();
      }
      cleanCourse = cleanCourse.substring(0, firstParenOpen).trim();
    }

    let cleanDuration = app.duration || "";
    let durationDates = app.durationDates || "";
    if (cleanDuration.includes(" | Duration: ")) {
      const parts = cleanDuration.split(" | Duration: ");
      cleanDuration = parts[0].trim();
      if (!durationDates) {
        durationDates = parts[1].trim();
      }
    }

    document.getElementById("editCourse").value = cleanCourse;
    document.getElementById("editCertificateType").value = app.certificateType || "Training";

    const durationSelect = document.getElementById("editDuration");
    // Clear any dynamic/custom options we added previously
    const customOpt = durationSelect.querySelector('option[data-custom="true"]');
    if (customOpt) customOpt.remove();

    durationSelect.value = cleanDuration;

    // If the value was not set (i.e. not in the options), add it dynamically
    if (cleanDuration && durationSelect.value !== cleanDuration) {
      const opt = document.createElement("option");
      opt.value = cleanDuration;
      opt.textContent = cleanDuration;
      opt.selected = true;
      opt.setAttribute("data-custom", "true");
      durationSelect.appendChild(opt);
    }

    let startDateFmt = "";
    let endDateFmt = "";
    if (durationDates && durationDates.includes(" - ")) {
      const dateParts = durationDates.split(" - ");
      const parseDate = (dStr) => {
        try {
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return "";
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        } catch {
          return "";
        }
      };
      startDateFmt = parseDate(dateParts[0].trim());
      endDateFmt = parseDate(dateParts[1].trim());
    }

    document.getElementById("editStartDate").value = startDateFmt;
    document.getElementById("editEndDate").value = endDateFmt;
    document.getElementById("editQualification").value = app.qualification || "";
    document.getElementById("editOrganization").value = organization;

    document.getElementById("editModal").style.display = "flex";
  } catch (err) {
    showToast("Error", "Failed to open edit modal: " + err.message, true);
  }
};

window.closeEditModal = function() {
  document.getElementById("editModal").style.display = "none";
  currentEditingApp = null;
};

document.addEventListener("DOMContentLoaded", () => {
  const durationSelect = document.getElementById("editDuration");
  if (durationSelect) {
    durationSelect.addEventListener("change", function() {
      if (this.value === "Other") {
        const promptVal = window.prompt("Enter custom duration:");
        if (promptVal && promptVal.trim()) {
          const opt = document.createElement("option");
          opt.value = promptVal.trim();
          opt.textContent = promptVal.trim();
          opt.selected = true;
          opt.setAttribute("data-custom", "true");
          durationSelect.appendChild(opt);
        } else {
          durationSelect.selectedIndex = 0;
        }
      }
    });
  }

  const editForm = document.getElementById("editApplicationForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentEditingApp) return;

      const appId = document.getElementById("editAppId").value;
      const startVal = document.getElementById("editStartDate").value;
      const endVal = document.getElementById("editEndDate").value;
      let durationDates = "";
      if (startVal && endVal) {
        const formatFriendly = (dStr) => {
          const options = { month: "short", day: "numeric", year: "numeric" };
          return new Date(dStr).toLocaleDateString("en-US", options);
        };
        durationDates = `${formatFriendly(startVal)} - ${formatFriendly(endVal)}`;
      }

      const payload = {
        fullName: document.getElementById("editFullName").value.trim(),
        email: document.getElementById("editEmail").value.trim(),
        phoneNumber: document.getElementById("editPhone").value.trim(),
        dateOfBirth: document.getElementById("editDob").value,
        course: document.getElementById("editCourse").value.trim(),
        certificateType: document.getElementById("editCertificateType").value,
        duration: document.getElementById("editDuration").value.trim(),
        durationDates: durationDates,
        qualification: document.getElementById("editQualification").value.trim(),
        organization: document.getElementById("editOrganization").value.trim(),
        issueDate: document.getElementById("editIssueDate").value
      };

      try {
        const res = await adminFetch(`/api/admin/applications/${appId}/update`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to save edits");

        showToast("Success", "Application updated successfully", false);
        closeEditModal();
        loadApplications();
        loadCertificates();
        updateDashboardStats();
      } catch (err) {
        showToast("Error", err.message, true);
      }
    });
  }

  // Settings Form Submission
  const settingsForm = document.getElementById("settingsForm");
  if (settingsForm) {
    settingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = document.getElementById("setGuideVideoUrl").value.trim();
      try {
        const res = await adminFetch("/api/admin/settings", {
          method: "POST",
          body: JSON.stringify({ key: "apply_guide_video_url", value: val })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to save settings");
        showToast("Success", "General settings saved successfully", false);
      } catch (err) {
        showToast("Error", err.message, true);
      }
    });
  }
});

// Load Settings from Backend API
window.loadSettings = async function() {
  try {
    const res = await fetch(`${window.APP_BASE_URL}/api/settings/apply_guide_video_url`);
    if (res.ok) {
      const data = await res.json();
      document.getElementById("setGuideVideoUrl").value = data.value || "";
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
};

function showToast(title, message, isError) {
  if (typeof window.Toastify === "function") {
    window.Toastify({
      text: `${title}: ${message}`,
      duration: 3500,
      gravity: "top",
      position: "right",
      style: {
        borderRadius: "8px",
        background: isError ? "linear-gradient(135deg, #e94c4c, #b83434)" : "linear-gradient(135deg, #1f9d53, #15753d)"
      }
    }).showToast();
  }
}

// Responsive Sidebar Toggle Controllers
window.openSidebar = function() {
  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar && overlay) {
    sidebar.classList.remove("-translate-x-full");
    sidebar.classList.add("translate-x-0");
    overlay.classList.remove("hidden");
  }
};

window.closeSidebar = function() {
  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar && overlay) {
    sidebar.classList.add("-translate-x-full");
    sidebar.classList.remove("translate-x-0");
    overlay.classList.add("hidden");
  }
};

/* ── Seminar Bookings Management ── */
let currentSemPage = 1;

window.loadSeminars = async function() {
  const tbody = document.getElementById("seminarsTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888;">Loading seminar bookings...</td></tr>`;

  const search = document.getElementById("semSearchInput")?.value || "";
  const status = document.getElementById("semStatusFilter")?.value || "";
  const query = new URLSearchParams({ search, status, page: currentSemPage, limit: PAGE_LIMIT }).toString();

  try {
    const res = await adminFetch(`/api/admin/seminars?${query}`);
    const result = await res.json();
    const list = result.data || [];
    const pagination = result.pagination || { page: 1, totalPages: 1, total: list.length };

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888;">No seminar bookings found.</td></tr>`;
      document.getElementById("semPaginationInfo").textContent = "Showing page 1 of 1";
      document.getElementById("semPrevBtn").disabled = true;
      document.getElementById("semNextBtn").disabled = true;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr>
        <td data-label="ID & College">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <strong style="color: #e0a730;">${item.bookingId}</strong>
            <span style="font-weight: 600;">${item.collegeName}</span>
          </div>
        </td>
        <td data-label="Coordinator">${item.coordinatorName}</td>
        <td data-label="Mobile"><a href="tel:${item.mobileNumber}" style="color: #10b981;">${item.mobileNumber}</a></td>
        <td data-label="Topic">${item.topic}</td>
        <td data-label="Status"><span style="color: ${item.adminStatus === 'scheduled' ? '#10b981' : (item.adminStatus === 'cancelled' ? '#ef4448' : '#e0a730')}">${item.adminStatus || 'new'}</span></td>
        <td data-label="Actions">
          <span class="action-badge badge-approve" onclick="updateSemStatus('${item.bookingId}', 'scheduled')">Schedule</span>
          <span class="action-badge badge-reject" onclick="updateSemStatus('${item.bookingId}', 'cancelled')">Cancel</span>
          <span class="action-badge badge-reject" onclick="deleteSemBooking('${item.bookingId}')">Delete</span>
        </td>
      </tr>
    `).join("");

    currentSemPage = pagination.page;
    document.getElementById("semPaginationInfo").textContent = `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)`;
    document.getElementById("semPrevBtn").disabled = pagination.page <= 1;
    document.getElementById("semNextBtn").disabled = pagination.page >= pagination.totalPages;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef5350;">Failed to load seminar bookings: ${err.message}</td></tr>`;
  }
};

window.filterSeminars = function() { currentSemPage = 1; loadSeminars(); };
window.changeSemPage = function(delta) { currentSemPage += delta; loadSeminars(); };

window.updateSemStatus = async function(bookingId, status) {
  if (!await confirm(`Update status of booking ${bookingId} to ${status}?`)) return;
  try {
    const res = await adminFetch(`/api/admin/seminars/${bookingId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update status");
    showToast("Success", "Status updated successfully", false);
    loadSeminars();
  } catch (err) {
    showToast("Error", err.message, true);
  }
};

window.deleteSemBooking = async function(bookingId) {
  if (!await confirm(`Are you sure you want to delete seminar booking ${bookingId}?`)) return;
  try {
    const res = await adminFetch(`/api/admin/seminars/${bookingId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to delete");
    showToast("Success", "Seminar booking deleted", false);
    loadSeminars();
  } catch (err) {
    showToast("Error", err.message, true);
  }
};

/* ── Hiring Requests Management ── */
let currentHireReqPage = 1;

window.loadHiringRequests = async function() {
  const tbody = document.getElementById("hiringRequestsTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #888;">Loading hiring requests...</td></tr>`;

  const search = document.getElementById("hireReqSearchInput")?.value || "";
  const status = document.getElementById("hireReqStatusFilter")?.value || "";
  const query = new URLSearchParams({ search, status, page: currentHireReqPage, limit: PAGE_LIMIT }).toString();

  try {
    const res = await adminFetch(`/api/admin/hiring-requests?${query}`);
    const result = await res.json();
    const list = result.data || [];
    const pagination = result.pagination || { page: 1, totalPages: 1, total: list.length };

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #888;">No hiring requests found.</td></tr>`;
      document.getElementById("hireReqPaginationInfo").textContent = "Showing page 1 of 1";
      document.getElementById("hireReqPrevBtn").disabled = true;
      document.getElementById("hireReqNextBtn").disabled = true;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr>
        <td data-label="ID & Company">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <strong style="color: #e0a730;">${item.requestId}</strong>
            <span style="font-weight: 600;">${item.companyName}</span>
          </div>
        </td>
        <td data-label="HR Name">${item.hrName}</td>
        <td data-label="Mobile"><a href="tel:${item.mobileNumber}" style="color: #10b981;">${item.mobileNumber}</a></td>
        <td data-label="Email">${item.email}</td>
        <td data-label="Domain">${item.techDomain}</td>
        <td data-label="Status"><span style="color: ${item.adminStatus === 'hired' ? '#10b981' : (item.adminStatus === 'cancelled' ? '#ef4448' : '#e0a730')}">${item.adminStatus || 'new'}</span></td>
        <td data-label="Actions">
          <span class="action-badge badge-approve" onclick="updateHireReqStatus('${item.requestId}', 'hired')">Hired</span>
          <span class="action-badge badge-reject" onclick="updateHireReqStatus('${item.requestId}', 'cancelled')">Cancel</span>
          <span class="action-badge badge-reject" onclick="deleteHireReq('${item.requestId}')">Delete</span>
        </td>
      </tr>
    `).join("");

    currentHireReqPage = pagination.page;
    document.getElementById("hireReqPaginationInfo").textContent = `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)`;
    document.getElementById("hireReqPrevBtn").disabled = pagination.page <= 1;
    document.getElementById("hireReqNextBtn").disabled = pagination.page >= pagination.totalPages;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef5350;">Failed to load hiring requests: ${err.message}</td></tr>`;
  }
};

window.filterHiringRequests = function() { currentHireReqPage = 1; loadHiringRequests(); };
window.changeHireReqPage = function(delta) { currentHireReqPage += delta; loadHiringRequests(); };

window.updateHireReqStatus = async function(requestId, status) {
  if (!await confirm(`Update status of request ${requestId} to ${status}?`)) return;
  try {
    const res = await adminFetch(`/api/admin/hiring-requests/${requestId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update status");
    showToast("Success", "Status updated successfully", false);
    loadHiringRequests();
  } catch (err) {
    showToast("Error", err.message, true);
  }
};

window.deleteHireReq = async function(requestId) {
  if (!await confirm(`Are you sure you want to delete hiring request ${requestId}?`)) return;
  try {
    const res = await adminFetch(`/api/admin/hiring-requests/${requestId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to delete");
    showToast("Success", "Hiring request deleted", false);
    loadHiringRequests();
  } catch (err) {
    showToast("Error", err.message, true);
  }
};

// Accordion Expand/Collapse Toggle on Mobile
document.addEventListener("click", function(e) {
  if (window.innerWidth < 768) {
    const tr = e.target.closest(".responsive-table tr");
    if (tr) {
      if (e.target.closest("input, select, button, a, .action-badge, .switch-container")) return;
      tr.classList.toggle("expanded");
    }
  }
});

