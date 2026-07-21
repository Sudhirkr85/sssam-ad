/* ==========================================================
   Admin Panel – JS Module: api.js
   Central HTTP client — all requests go through here.
   ========================================================== */

const BASE_URL = "https://sssam-be.onrender.com";
// const BASE_URL = "http://localhost:5000";

/**
 * Returns the stored JWT or null.
 */
function getToken() {
  return sessionStorage.getItem("sssam_admin_token");
}

/**
 * Saves auth token to session storage.
 * @param {string} token
 */
function saveToken(token) {
  sessionStorage.setItem("sssam_admin_token", token);
}

/**
 * Clears auth state.
 */
function clearToken() {
  sessionStorage.removeItem("sssam_admin_token");
}

/**
 * Core request wrapper.
 * @param {string} path – API path, e.g. "/api/admin/applications"
 * @param {object} opts – Fetch options
 * @returns {Promise<any>} Parsed JSON body on success
 */
async function request(path, opts = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers });

  let body;
  try { body = await res.json(); } catch { body = {}; }

  if (!res.ok) {
    const err = new Error(body?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = body;
    throw err;
  }

  return body;
}

/* ── Auth ── */
const Auth = {
  async login(username, password) {
    const data = await request("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    saveToken(data.data.token);
    return data;
  },
  logout() { clearToken(); },
  isLoggedIn() { return Boolean(getToken()); },
};

/* ── Applications ── */
const Applications = {
  async list({ page = 1, limit = 10, search = "", status = "" } = {}) {
    const q = new URLSearchParams({ page, limit, search, status }).toString();
    return request(`/api/admin/applications?${q}`);
  },
  async get(applicationId) {
    return request(`/api/admin/applications/${applicationId}`);
  },
  async approve(applicationId) {
    return request(`/api/admin/applications/${applicationId}/approve`, { method: "PATCH" });
  },
  async reject(applicationId, reason) {
    return request(`/api/admin/applications/${applicationId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  },
  async update(applicationId, payload) {
    return request(`/api/admin/applications/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

/* ── Certificates ── */
const Certificates = {
  async list({ page = 1, limit = 10, search = "", status = "" } = {}) {
    const q = new URLSearchParams({ page, limit, search, status }).toString();
    return request(`/api/admin/certificates?${q}`);
  },
  async update(certificateNumber, payload) {
    return request(`/api/admin/certificates/${certificateNumber}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

/* ── Enquiries ── */
const Enquiries = {
  async list({ page = 1, limit = 10, search = "", status = "" } = {}) {
    const q = new URLSearchParams({ page, limit, search, status }).toString();
    return request(`/api/admin/enquiries?${q}`);
  },
  async get(enquiryId) {
    return request(`/api/admin/enquiries/${enquiryId}`);
  },
  async updateStatus(enquiryId, status) {
    return request(`/api/admin/enquiries/${enquiryId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  async followUp(enquiryId, followUpDate, comment) {
    return request(`/api/admin/enquiries/${enquiryId}/follow-up`, {
      method: "PATCH",
      body: JSON.stringify({ followUpDate, comment }),
    });
  },
  async close(enquiryId, interestStatus, comment) {
    return request(`/api/admin/enquiries/${enquiryId}/close`, {
      method: "PATCH",
      body: JSON.stringify({ interestStatus, comment }),
    });
  },
  async remove(enquiryId) {
    return request(`/api/admin/enquiries/${enquiryId}`, { method: "DELETE" });
  },
};

/* ── Legacy Import ── */
const Legacy = {
  /**
   * Import JSON array of legacy certificates.
   * @param {Array<object>} records
   */
  async importBulk(records) {
    return request("/api/admin/legacy/import", {
      method: "POST",
      body: JSON.stringify({ records }),
    });
  },
};

/* ── Public API refs ── */
const API = { Auth, Applications, Certificates, Enquiries, Legacy, BASE_URL };

// expose globally
window.API = API;
