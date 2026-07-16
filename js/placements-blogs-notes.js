// Admin Dashboard - Placements, Blogs & Study Notes CRUD Utilities
window.setAIPrompt = function(val) {
  document.getElementById("aiBlogPrompt").value = val;
};

function initPlacementsBlogsNotes() {
  // Navigation hook to trigger data fetch
  const navBtns = document.querySelectorAll(".admin-nav-btn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const panel = btn.getAttribute("data-panel");
      if (panel === "placements") loadPlacements();
      if (panel === "blogs") loadBlogs();
      if (panel === "notes") loadNotes();
    });
  });

  // Modal submissions handlers
  setupFormSubmissions();
}

// Expose CRUD loaders and status toggles globally to allow inline HTML onclick/onchange triggers
window.loadPlacements = loadPlacements;
window.togglePlacementStatus = togglePlacementStatus;
window.loadBlogs = loadBlogs;
window.toggleBlogStatus = toggleBlogStatus;
window.loadNotes = loadNotes;
window.toggleNoteStatus = toggleNoteStatus;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPlacementsBlogsNotes);
} else {
  initPlacementsBlogsNotes();
}

// Helper for JWT Auth API calls
async function s3AdminFetch(url, options = {}) {
  const token = localStorage.getItem("adminToken");
  const headers = Object.assign({
    "Authorization": `Bearer ${token}`
  }, options.headers);

  // If payload is not FormData, set content-type JSON
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${window.APP_BASE_URL || ""}${url}`, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    localStorage.removeItem("adminToken");
    location.reload();
  }
  return res;
}

// -------------------------------------------------------------------------
// 1. PLACEMENTS CONTROL
// -------------------------------------------------------------------------
async function loadPlacements() {
  const tbody = document.getElementById("placementsTableBody");
  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888;">Loading placements...</td></tr>`;

  try {
    const res = await s3AdminFetch("/api/admin/placements");
    const list = await res.json();

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888;">No placements found.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${item.photoUrl}" alt="${item.studentName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.1);" />
            <strong>${item.studentName}</strong>
          </div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${item.companyLogoUrl ? `<img src="${item.companyLogoUrl}" alt="${item.companyName}" style="height: 20px; max-width: 60px; object-fit: contain;" />` : ''}
            <span>${item.companyName}</span>
          </div>
        </td>
        <td>${item.packageLPA} LPA</td>
        <td>${item.designation}</td>
        <td>${item.placedYear}</td>
        <td>
          <label class="switch-container" style="display: inline-block; cursor: pointer;">
            <input type="checkbox" ${item.active ? 'checked' : ''} onchange="togglePlacementStatus('${item._id}', this.checked)" style="cursor: pointer;" />
            <span style="font-size: 0.8rem; margin-left: 5px; color: ${item.active ? '#10b981' : '#888'};">${item.active ? 'Visible' : 'Hidden'}</span>
          </label>
        </td>
        <td>
          <span class="action-badge badge-edit" onclick="openEditPlacementModal('${encodeURIComponent(JSON.stringify(item))}')">Edit</span>
          <span class="action-badge badge-reject" onclick="deletePlacement('${item._id}')">Delete</span>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef5350;">Failed to load placements: ${err.message}</td></tr>`;
  }
}

window.openAddPlacementModal = function() {
  document.getElementById("placementForm").reset();
  document.getElementById("placementId").value = "";
  document.getElementById("placementModalTitle").textContent = "Add Placement Record";
  document.getElementById("plPhoto").required = true;
  document.getElementById("plPhotoInfo").textContent = "";
  document.getElementById("plCompanyLogoInfo").textContent = "";
  document.getElementById("placementModal").style.display = "flex";
};

window.openEditPlacementModal = function(itemJsonStr) {
  const item = JSON.parse(decodeURIComponent(itemJsonStr));
  document.getElementById("placementForm").reset();
  document.getElementById("placementId").value = item._id;
  document.getElementById("placementModalTitle").textContent = "Edit Placement Record";
  
  document.getElementById("plStudentName").value = item.studentName;
  document.getElementById("plCompanyName").value = item.companyName;
  document.getElementById("plPackageLPA").value = item.packageLPA;
  document.getElementById("plDesignation").value = item.designation;
  document.getElementById("plPlacedYear").value = item.placedYear || "";
  document.getElementById("plActive").value = item.active.toString();
  
  document.getElementById("plPhoto").required = false;
  document.getElementById("plPhotoInfo").textContent = "Leave empty to retain existing photo.";
  document.getElementById("plCompanyLogoInfo").textContent = "Leave empty to retain existing company logo.";

  document.getElementById("placementModal").style.display = "flex";
};

window.closePlacementModal = function() {
  document.getElementById("placementModal").style.display = "none";
};

async function togglePlacementStatus(id, checked) {
  try {
    const formData = new FormData();
    formData.append("active", checked);
    const res = await s3AdminFetch(`/api/admin/placements/${id}`, {
      method: "PUT",
      body: formData
    });
    if (!res.ok) throw new Error("Status update failed");
    showToast("Success", "Placement status updated successfully", false);
    loadPlacements();
  } catch (e) {
    showToast("Error", e.message, true);
  }
}

window.deletePlacement = async function(id) {
  if (!await confirm("Are you sure you want to delete this placement record?")) return;
  try {
    const res = await s3AdminFetch(`/api/admin/placements/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    showToast("Success", "Placement deleted successfully", false);
    loadPlacements();
  } catch (e) {
    showToast("Error", e.message, true);
  }
};

// -------------------------------------------------------------------------
// 2. BLOGS & HIRING CONTROL
// -------------------------------------------------------------------------
async function loadBlogs() {
  const tbody = document.getElementById("blogsTableBody");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">Loading blogs...</td></tr>`;

  try {
    const res = await s3AdminFetch("/api/admin/blogs");
    const list = await res.json();

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">No blog posts found.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr>
        <td><strong>${item.title}</strong><br/><small style="color: #666;">/${item.slug}</small></td>
        <td><span class="action-badge" style="background: rgba(32,120,240,0.15); color: #3b82f6;">${item.type}</span></td>
        <td>${item.author}</td>
        <td><span style="color: ${item.status === 'Published' ? '#10b981' : '#e0a730'}; font-weight: 600;">${item.status}</span></td>
        <td>
          <label class="switch-container">
            <input type="checkbox" ${item.active ? 'checked' : ''} onchange="toggleBlogStatus('${item._id}', this.checked)" />
            <span style="font-size: 0.8rem; margin-left: 5px; color: ${item.active ? '#10b981' : '#888'};">${item.active ? 'Visible' : 'Hidden'}</span>
          </label>
        </td>
        <td>
          <span class="action-badge badge-edit" onclick="openEditBlogModal('${encodeURIComponent(JSON.stringify(item))}')">Edit</span>
          <span class="action-badge badge-reject" onclick="deleteBlog('${item._id}')">Delete</span>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef5350;">Failed to load blogs: ${err.message}</td></tr>`;
  }
}

window.openAddBlogModal = function() {
  document.getElementById("blogForm").reset();
  document.getElementById("blogId").value = "";
  document.getElementById("blogModalTitle").textContent = "Create Blog / Hiring Post";
  document.getElementById("blogImageInfo").textContent = "";
  document.getElementById("hiringFields").style.display = "none";
  document.getElementById("blogModal").style.display = "flex";
};

window.openEditBlogModal = function(itemJsonStr) {
  const item = JSON.parse(decodeURIComponent(itemJsonStr));
  document.getElementById("blogForm").reset();
  document.getElementById("blogId").value = item._id;
  document.getElementById("blogModalTitle").textContent = "Edit Blog / Hiring Post";
  
  document.getElementById("blogTitle").value = item.title;
  document.getElementById("blogSlug").value = item.slug;
  document.getElementById("blogSummary").value = item.summary;
  document.getElementById("blogContent").value = item.content;
  document.getElementById("blogType").value = item.type;
  document.getElementById("blogStatus").value = item.status;
  document.getElementById("blogActive").value = item.active.toString();
  document.getElementById("blogTags").value = (item.tags || []).join(", ");
  
  document.getElementById("blogImageInfo").textContent = "Leave empty to retain existing banner image.";

  if (item.type === "Hiring") {
    document.getElementById("hiringFields").style.display = "grid";
    if (item.hiringDetails) {
      document.getElementById("hirCompany").value = item.hiringDetails.company || "";
      document.getElementById("hirRole").value = item.hiringDetails.role || "";
      document.getElementById("hirLocation").value = item.hiringDetails.location || "";
      document.getElementById("hirApplyLink").value = item.hiringDetails.applyLink || "";
    }
  } else {
    document.getElementById("hiringFields").style.display = "none";
  }

  document.getElementById("blogModal").style.display = "flex";
};

window.closeBlogModal = function() {
  document.getElementById("blogModal").style.display = "none";
};

window.toggleHiringFields = function() {
  const type = document.getElementById("blogType").value;
  document.getElementById("hiringFields").style.display = type === "Hiring" ? "grid" : "none";
};

window.autoGenerateSlug = function() {
  const isEditing = document.getElementById("blogId").value !== "";
  // Only auto-generate if we are creating a new post
  if (isEditing) return;
  
  const title = document.getElementById("blogTitle").value;
  const slug = title.toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  document.getElementById("blogSlug").value = slug;
};

window.generateAIContent = async function() {
  const prompt = document.getElementById("aiBlogPrompt").value.trim();
  if (!prompt) {
    alert("Please enter a topic prompt.");
    return;
  }

  const btn = document.getElementById("btnGenerateBlogAI");
  btn.disabled = true;
  btn.textContent = "Writing...";

  try {
    const res = await s3AdminFetch("/api/admin/blogs/generate-ai", {
      method: "POST",
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to generate content.");

    document.getElementById("blogTitle").value = data.title;
    document.getElementById("blogSummary").value = data.summary;
    document.getElementById("blogContent").value = data.content;
    
    // Auto-generate slug
    autoGenerateSlug();
    
    showToast("AI Writer", "Blog post content generated successfully!", false);
  } catch (err) {
    showToast("AI Writer Error", err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate";
  }
};

async function toggleBlogStatus(id, checked) {
  try {
    const formData = new FormData();
    formData.append("active", checked);
    const res = await s3AdminFetch(`/api/admin/blogs/${id}`, {
      method: "PUT",
      body: formData
    });
    if (!res.ok) throw new Error("Status update failed");
    showToast("Success", "Publication visibility toggled.", false);
    loadBlogs();
  } catch (e) {
    showToast("Error", e.message, true);
  }
}

window.deleteBlog = async function(id) {
  if (!await confirm("Are you sure you want to delete this blog post?")) return;
  try {
    const res = await s3AdminFetch(`/api/admin/blogs/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    showToast("Success", "Blog post deleted successfully.", false);
    loadBlogs();
  } catch (e) {
    showToast("Error", e.message, true);
  }
};

// -------------------------------------------------------------------------
// 3. STUDY NOTES CONTROL
// -------------------------------------------------------------------------
async function loadNotes() {
  const tbody = document.getElementById("notesTableBody");
  tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">Loading study notes...</td></tr>`;

  try {
    const res = await s3AdminFetch("/api/admin/notes");
    const list = await res.json();

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">No study notes found.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr>
        <td><strong>${item.title}</strong><br/><small style="color: #888;"><a href="${item.fileUrl}" target="_blank" style="color: #3b82f6; text-decoration: underline;">Open PDF</a></small></td>
        <td><span class="action-badge" style="background: rgba(16,185,129,0.15); color: #10b981;">${item.category}</span></td>
        <td><strong>${item.downloadCount}</strong> downloads</td>
        <td>
          <label class="switch-container">
            <input type="checkbox" ${item.active ? 'checked' : ''} onchange="toggleNoteStatus('${item._id}', this.checked)" />
            <span style="font-size: 0.8rem; margin-left: 5px; color: ${item.active ? '#10b981' : '#888'};">${item.active ? 'Visible' : 'Hidden'}</span>
          </label>
        </td>
        <td>
          <span class="action-badge badge-edit" onclick="openEditNoteModal('${encodeURIComponent(JSON.stringify(item))}')">Edit</span>
          <span class="action-badge badge-reject" onclick="deleteNote('${item._id}')">Delete</span>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef5350;">Failed to load notes: ${err.message}</td></tr>`;
  }
}

window.openAddNoteModal = function() {
  document.getElementById("noteForm").reset();
  document.getElementById("noteId").value = "";
  document.getElementById("noteModalTitle").textContent = "Add Study Note PDF";
  document.getElementById("noFile").required = true;
  document.getElementById("noFileInfo").textContent = "";
  document.getElementById("noteModal").style.display = "flex";
};

window.openEditNoteModal = function(itemJsonStr) {
  const item = JSON.parse(decodeURIComponent(itemJsonStr));
  document.getElementById("noteForm").reset();
  document.getElementById("noteId").value = item._id;
  document.getElementById("noteModalTitle").textContent = "Edit Study Note";
  
  document.getElementById("noTitle").value = item.title;
  document.getElementById("noCategory").value = item.category;
  document.getElementById("noDescription").value = item.description;
  document.getElementById("noActive").value = item.active.toString();
  
  document.getElementById("noFile").required = false;
  document.getElementById("noFileInfo").textContent = "Leave empty to retain existing PDF.";

  document.getElementById("noteModal").style.display = "flex";
};

window.closeNoteModal = function() {
  document.getElementById("noteModal").style.display = "none";
};

async function toggleNoteStatus(id, checked) {
  try {
    const formData = new FormData();
    formData.append("active", checked);
    const res = await s3AdminFetch(`/api/admin/notes/${id}`, {
      method: "PUT",
      body: formData
    });
    if (!res.ok) throw new Error("Status update failed");
    showToast("Success", "Visibility toggled successfully.", false);
    loadNotes();
  } catch (e) {
    showToast("Error", e.message, true);
  }
}

window.deleteNote = async function(id) {
  if (!await confirm("Are you sure you want to delete this study note record?")) return;
  try {
    const res = await s3AdminFetch(`/api/admin/notes/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    showToast("Success", "Study note deleted successfully.", false);
    loadNotes();
  } catch (e) {
    showToast("Error", e.message, true);
  }
};

window.openNotesLeadsModal = async function() {
  const tbody = document.getElementById("notesLeadsTableBody");
  tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">Loading download leads...</td></tr>`;
  document.getElementById("notesLeadsModal").style.display = "flex";

  try {
    const res = await s3AdminFetch("/api/admin/enquiries?limit=200");
    const data = await res.json();
    const list = data.data || data;

    // Filter leads specifically from study notes downloads
    const notesLeads = list.filter(e => e.message && e.message.includes("STUDY NOTES"));

    if (notesLeads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">No download leads captured yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = notesLeads.map(e => `
      <tr>
        <td><strong>${e.fullName}</strong></td>
        <td>${e.phoneNumber}</td>
        <td>${e.email || '—'}</td>
        <td><small style="color: #aaa;">${e.message.replace("[LEAD FROM STUDY NOTES] Downloaded file: ", "")}</small></td>
        <td>${new Date(e.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef5350;">Failed to load leads: ${err.message}</td></tr>`;
  }
};

window.closeNotesLeadsModal = function() {
  document.getElementById("notesLeadsModal").style.display = "none";
};

// -------------------------------------------------------------------------
// 4. COMMON FORM SUBMISSIONS
// -------------------------------------------------------------------------
function setupFormSubmissions() {
  // Placement Form
  document.getElementById("placementForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("placementId").value;
    const isEdit = id !== "";
    const url = isEdit ? `/api/admin/placements/${id}` : "/api/admin/placements";
    const method = isEdit ? "PUT" : "POST";

    const formData = new FormData();
    formData.append("studentName", document.getElementById("plStudentName").value.trim());
    formData.append("companyName", document.getElementById("plCompanyName").value.trim());
    formData.append("packageLPA", document.getElementById("plPackageLPA").value);
    formData.append("designation", document.getElementById("plDesignation").value.trim());
    
    const year = document.getElementById("plPlacedYear").value;
    if (year) formData.append("placedYear", year);
    
    formData.append("active", document.getElementById("plActive").value);

    const photoInput = document.getElementById("plPhoto");
    if (photoInput.files.length > 0) {
      formData.append("photo", photoInput.files[0]);
    }

    const logoInput = document.getElementById("plCompanyLogo");
    if (logoInput.files.length > 0) {
      formData.append("companyLogo", logoInput.files[0]);
    }

    try {
      const res = await s3AdminFetch(url, { method, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save placement record");
      showToast("Success", isEdit ? "Placement updated successfully" : "Placement created successfully", false);
      closePlacementModal();
      loadPlacements();
    } catch (err) {
      showToast("Error", err.message, true);
    }
  });

  // Blog / Hiring Form
  document.getElementById("blogForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("blogId").value;
    const isEdit = id !== "";
    const url = isEdit ? `/api/admin/blogs/${id}` : "/api/admin/blogs";
    const method = isEdit ? "PUT" : "POST";

    const formData = new FormData();
    formData.append("title", document.getElementById("blogTitle").value.trim());
    formData.append("slug", document.getElementById("blogSlug").value.trim());
    formData.append("summary", document.getElementById("blogSummary").value.trim());
    formData.append("content", document.getElementById("blogContent").value.trim());
    formData.append("type", document.getElementById("blogType").value);
    formData.append("status", document.getElementById("blogStatus").value);
    formData.append("active", document.getElementById("blogActive").value);
    formData.append("tags", document.getElementById("blogTags").value.trim());

    if (document.getElementById("blogType").value === "Hiring") {
      formData.append("company", document.getElementById("hirCompany").value.trim());
      formData.append("role", document.getElementById("hirRole").value.trim());
      formData.append("location", document.getElementById("hirLocation").value.trim());
      formData.append("applyLink", document.getElementById("hirApplyLink").value.trim());
    }

    const imageInput = document.getElementById("blogImage");
    if (imageInput.files.length > 0) {
      formData.append("image", imageInput.files[0]);
    }

    try {
      const res = await s3AdminFetch(url, { method, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save blog post");
      showToast("Success", isEdit ? "Blog updated successfully" : "Blog published successfully", false);
      closeBlogModal();
      loadBlogs();
    } catch (err) {
      showToast("Error", err.message, true);
    }
  });

  // Study Notes Form
  document.getElementById("noteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("noteId").value;
    const isEdit = id !== "";
    const url = isEdit ? `/api/admin/notes/${id}` : "/api/admin/notes";
    const method = isEdit ? "PUT" : "POST";

    const formData = new FormData();
    formData.append("title", document.getElementById("noTitle").value.trim());
    formData.append("category", document.getElementById("noCategory").value.trim());
    formData.append("description", document.getElementById("noDescription").value.trim());
    formData.append("active", document.getElementById("noActive").value);

    const fileInput = document.getElementById("noFile");
    if (fileInput.files.length > 0) {
      formData.append("file", fileInput.files[0]);
    }

    try {
      const res = await s3AdminFetch(url, { method, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save study note");
      showToast("Success", isEdit ? "Study notes updated successfully" : "Study notes uploaded successfully", false);
      closeNoteModal();
      loadNotes();
    } catch (err) {
      showToast("Error", err.message, true);
    }
  });
}
