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
      if (panel === "hiring") loadHiring();
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
window.loadHiring = loadHiring;
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
    const blogs = (list || []).filter(item => item.type !== "Hiring");

    // Keep a global cache of current listed blogs/hiring for safe editing
    window.currentLoadedBlogs = blogs;

    tbody.innerHTML = blogs.map((item, index) => `
      <tr>
        <td><strong>${item.title}</strong><br/><small style="color: #666;">/${item.slug}</small></td>
        <td>${(item.tags || []).slice(0,3).map(t => `<span class="action-badge" style="background:rgba(59,130,246,0.12);color:#3b82f6;width:auto;padding:2px 8px;margin:2px;">${t}</span>`).join("") || '<span style="color:#555;">—</span>'}</td>
        <td>${item.author}</td>
        <td><span style="color: ${item.status === 'Published' ? '#10b981' : '#e0a730'}; font-weight: 600;">${item.status}</span></td>
        <td>
          <label class="switch-container">
            <input type="checkbox" ${item.active ? 'checked' : ''} onchange="toggleBlogStatus('${item._id}', this.checked)" />
            <span style="font-size: 0.8rem; margin-left: 5px; color: ${item.active ? '#10b981' : '#888'};">${item.active ? 'Visible' : 'Hidden'}</span>
          </label>
        </td>
        <td>
          <span class="action-badge badge-edit" onclick="window.triggerBlogEdit(${index}, 'Blog')">Edit</span>
          <span class="action-badge badge-reject" onclick="deleteBlog('${item._id}')">Delete</span>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef5350;">Failed to load blogs: ${err.message}</td></tr>`;
  }
}

async function loadHiring() {
  const tbody = document.getElementById("hiringTableBody");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">Loading hiring posts...</td></tr>`;

  try {
    const res = await s3AdminFetch("/api/admin/blogs");
    const list = await res.json();
    const hiring = (list || []).filter(item => item.type === "Hiring");

    if (!hiring || hiring.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">No hiring posts found.</td></tr>`;
      return;
    }

    // Keep a global cache of current listed hiring items for safe editing
    window.currentLoadedHiring = hiring;

    tbody.innerHTML = hiring.map((item, index) => {
      const source = item.hiringDetails?.source || "external";
      const sourceBadge = source === "own"
        ? `<span style="background:rgba(224,167,48,0.15);color:#e0a730;" class="action-badge">Own</span>`
        : `<span style="background:rgba(59,130,246,0.12);color:#3b82f6;" class="action-badge">External</span>`;
      const company = source === "own" ? "SSSAM Academy" : (item.hiringDetails?.company || "—");
      return `
        <tr>
          <td><strong>${item.title}</strong><br/><small style="color:#666;">/${item.slug}</small></td>
          <td>${sourceBadge}</td>
          <td>${company}</td>
          <td><span style="color: ${item.status === 'Published' ? '#10b981' : '#e0a730'}; font-weight: 600;">${item.status}</span></td>
          <td>
            <label class="switch-container">
              <input type="checkbox" ${item.active ? 'checked' : ''} onchange="toggleBlogStatus('${item._id}', this.checked)" />
              <span style="font-size: 0.8rem; margin-left: 5px; color: ${item.active ? '#10b981' : '#888'};">${item.active ? 'Visible' : 'Hidden'}</span>
            </label>
          </td>
          <td>
            <span class="action-badge badge-edit" onclick="window.triggerBlogEdit(${index}, 'Hiring')">Edit</span>
            <span class="action-badge badge-reject" onclick="deleteBlog('${item._id}')">Delete</span>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef5350;">Failed to load hiring posts: ${err.message}</td></tr>`;
  }
}

window.openAddBlogModal = function(type = "Blog") {
  document.getElementById("blogForm").reset();
  document.getElementById("blogId").value = "";
  document.getElementById("blogImageInfo").textContent = "";
  document.getElementById("blogType").value = type;

  const isHiring = type === "Hiring";

  // Modal title
  document.getElementById("blogModalTitle").textContent = isHiring ? "Post a Hiring Job" : "Create Blog Post";

  // Save button text
  const saveBtn = document.querySelector("#blogForm button[type='submit']");
  if (saveBtn) saveBtn.textContent = isHiring ? "Post Job" : "Save Post";

  // AI Section — toggle based on type
  const aiSection = document.getElementById("blogAISection");
  const hiringAISection = document.getElementById("hiringAISection");
  if (aiSection) aiSection.style.display = isHiring ? "none" : "";
  if (hiringAISection) hiringAISection.style.display = isHiring ? "" : "none";

  // Dynamic labels
  document.getElementById("lbl-title").textContent    = isHiring ? "Job Title *"                          : "Title *";
  document.getElementById("lbl-slug").textContent     = isHiring ? "Job URL Slug *"                       : "Slug (SEO URL Part) *";
  document.getElementById("lbl-summary").textContent  = isHiring ? "Job Short Description *"              : "Meta Summary * (Short SEO description)";
  document.getElementById("lbl-content").textContent  = isHiring ? "Full Job Description (HTML allowed) *": "Blog Content (HTML allowed) *";

  // Dynamic placeholders
  document.getElementById("blogTitle").placeholder   = isHiring ? "e.g. React Developer — Internship"    : "e.g. Why Node.js is great for backend";
  document.getElementById("blogSlug").placeholder    = isHiring ? "e.g. react-developer-internship-2026" : "e.g. why-nodejs-is-great";
  document.getElementById("blogSummary").placeholder = isHiring ? "Brief about the role, skills needed…" : "Short SEO description of the blog…";
  document.getElementById("blogContent").placeholder = isHiring
    ? "Eligibility, responsibilities, salary, how to apply…"
    : "Full blog content here (HTML tags allowed)…";

  // Hiring-specific fields
  if (isHiring) {
    document.getElementById("hiringFields").style.display = "grid";
    document.getElementById("hirSource").value = "own";
    toggleHiringSource();
  } else {
    document.getElementById("hiringFields").style.display = "none";
  }

  document.getElementById("blogModal").style.display = "flex";
};

window.openEditBlogModal = function(itemJsonStr) {
  const item = JSON.parse(decodeURIComponent(itemJsonStr));
  document.getElementById("blogForm").reset();
  document.getElementById("blogId").value = item._id;
  
  const isHiring = item.type === "Hiring";
  
  document.getElementById("blogModalTitle").textContent = isHiring ? "Edit Hiring Job Post" : "Edit Blog Post";
  
  const saveBtn = document.querySelector("#blogForm button[type='submit']");
  if (saveBtn) saveBtn.textContent = isHiring ? "Update Job" : "Update Post";

  // AI Section — hide for Edit mode completely to keep it simple
  const aiSection = document.getElementById("blogAISection");
  const hiringAISection = document.getElementById("hiringAISection");
  if (aiSection) aiSection.style.display = "none";
  if (hiringAISection) hiringAISection.style.display = "none";

  // Dynamic labels
  document.getElementById("lbl-title").textContent    = isHiring ? "Job Title *"                          : "Title *";
  document.getElementById("lbl-slug").textContent     = isHiring ? "Job URL Slug *"                       : "Slug (SEO URL Part) *";
  document.getElementById("lbl-summary").textContent  = isHiring ? "Job Short Description *"              : "Meta Summary * (Short SEO description)";
  document.getElementById("lbl-content").textContent  = isHiring ? "Full Job Description (HTML allowed) *": "Blog Content (HTML allowed) *";

  // Dynamic placeholders
  document.getElementById("blogTitle").placeholder   = isHiring ? "e.g. React Developer — Internship"    : "e.g. Why Node.js is great for backend";
  document.getElementById("blogSlug").placeholder    = isHiring ? "e.g. react-developer-internship-2026" : "e.g. why-nodejs-is-great";
  document.getElementById("blogSummary").placeholder = isHiring ? "Brief about the role, skills needed…" : "Short SEO description of the blog…";
  document.getElementById("blogContent").placeholder = isHiring
    ? "Eligibility, responsibilities, salary, how to apply…"
    : "Full blog content here (HTML tags allowed)…";

  document.getElementById("blogTitle").value = item.title;
  document.getElementById("blogSlug").value = item.slug;
  document.getElementById("blogSummary").value = item.summary;
  document.getElementById("blogContent").value = item.content;
  document.getElementById("blogType").value = item.type;
  document.getElementById("blogStatus").value = item.status;
  document.getElementById("blogActive").value = item.active.toString();
  document.getElementById("blogTags").value = (item.tags || []).join(", ");
  
  document.getElementById("blogImageInfo").textContent = "Leave empty to retain existing banner image.";

  if (isHiring) {
    document.getElementById("hiringFields").style.display = "grid";
    if (item.hiringDetails) {
      const source = item.hiringDetails.source || "external";
      document.getElementById("hirSource").value = source;
      toggleHiringSource();
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

window.triggerBlogEdit = function(index, type) {
  try {
    const list = type === 'Hiring' ? window.currentLoadedHiring : window.currentLoadedBlogs;
    if (!list || !list[index]) return;
    const item = list[index];
    // Re-route safely using the serialized JSON in memory
    window.openEditBlogModal(encodeURIComponent(JSON.stringify(item)));
  } catch (e) {
    console.error("Edit routing failed", e);
  }
};

window.toggleHiringFields = function() {
  const type = document.getElementById("blogType").value;
  document.getElementById("hiringFields").style.display = type === "Hiring" ? "grid" : "none";
};

window.toggleHiringSource = function() {
  const source = document.getElementById("hirSource").value;
  const note = document.getElementById("hirSourceNote");
  const companyField = document.getElementById("hirCompanyField");
  if (source === "own") {
    note.textContent = "Posting job for SSSAM Academy itself (trainer, intern, developer, etc.)";
    companyField.style.display = "none";
    document.getElementById("hirCompany").value = "SSSAM Academy";
  } else {
    note.textContent = "Job posted from an external/partner company.";
    companyField.style.display = "";
    document.getElementById("hirCompany").value = "";
  }
};

window.autoGenerateSlug = function() {
  const isEditing = document.getElementById("blogId").value !== "";
  // Only auto-generate if we are creating a new post
  if (isEditing) return;
  
  const title = document.getElementById("blogTitle").value;
  let slug = title.toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
    
  // Append a short random suffix to make it unique by default
  const suffix = Math.floor(100 + Math.random() * 900); // 3-digit random number
  document.getElementById("blogSlug").value = `${slug}-${suffix}`;
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
    
    const raw = await res.text();
    let title = "", summary = "", content = "", tags = [];
    
    try {
      // Safe parsing: scrub raw text from dangerous single backslashes or invalid escaping sequences first
      const scrubbed = raw.replace(/\\(?!["\\\/bfnrtu])/g, "\\\\");
      const data = JSON.parse(scrubbed);
      if (!res.ok) throw new Error(data.message || "Failed to generate content.");
      title = data.title || "";
      summary = data.summary || "";
      content = data.content || "";
      tags = data.tags || [];
    } catch (_) {
      // Fallback: If AI returned text with invalid JSON structure, treat whole text as content
      content = raw;
      title = prompt;
      summary = "AI Generated Technical Blog Post.";
    }

    document.getElementById("blogTitle").value = title;
    document.getElementById("blogSummary").value = summary;
    document.getElementById("blogContent").value = content;
    if (tags && Array.isArray(tags)) {
      document.getElementById("blogTags").value = tags.join(", ");
    }
    
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

window.generateAITags = async function() {
  const title = document.getElementById("blogTitle").value.trim();
  const summary = document.getElementById("blogSummary").value.trim();
  const content = document.getElementById("blogContent").value.trim();

  if (!title && !content) {
    alert("Please write some title or content first before generating tags.");
    return;
  }

  const btn = document.getElementById("btnGenerateTags");
  btn.disabled = true;
  btn.textContent = "Generating...";

  try {
    const prompt = `Generate 5-8 relevant SEO tags for a blog post. Title: "${title}". Summary: "${summary.slice(0, 200)}". Return ONLY a comma-separated list of lowercase tags, no explanation.`;
    const res = await s3AdminFetch("/api/admin/blogs/generate-ai", {
      method: "POST",
      body: JSON.stringify({ prompt, tagsOnly: true })
    });

    // API may return JSON or plain text — handle both safely
    const raw = await res.text();
    let rawTags = "";

    try {
      const data = JSON.parse(raw);
      if (!res.ok) throw new Error(data.message || "Failed to generate tags.");
      rawTags = data.tags || data.content || data.title || data.output || "";
      if (typeof rawTags === 'object') {
        rawTags = Array.isArray(rawTags) ? rawTags.join(", ") : JSON.stringify(rawTags);
      }
    } catch (_) {
      // Response was plain text (AI returned tags directly)
      rawTags = raw;
    }

    const cleanTags = rawTags
      .replace(/[*#`"']/g, "")
      .replace(/\n/g, ",")
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0 && t.length < 40)
      .slice(0, 8)
      .join(", ");

    document.getElementById("blogTags").value = cleanTags;
    showToast("AI Tags", "Tags generated successfully!", false);
  } catch (err) {
    showToast("AI Tags Error", err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "🤖 AI Tags";
  }
};

window.setJobAIPrompt = function(val) {
  document.getElementById("aiJobPrompt").value = val;
};

window.generateAIJobContent = async function() {
  const role = document.getElementById("aiJobPrompt").value.trim();
  if (!role) {
    alert("Please enter a job role to generate description.");
    return;
  }

  const btn = document.getElementById("btnGenerateJobAI");
  btn.disabled = true;
  btn.textContent = "Writing...";

  try {
    const prompt = `Write a professional job posting for the role: "${role}". Include:
1. Job Title
2. Short job summary (2-3 lines)
3. Key Responsibilities (bullet points)
4. Required Skills & Qualifications
5. What we offer
Format it cleanly in HTML using <h3>, <ul>, <li>, <p> tags. Keep it concise and professional.`;

    const res = await s3AdminFetch("/api/admin/blogs/generate-ai", {
      method: "POST",
      body: JSON.stringify({ prompt })
    });

    const raw = await res.text();
    let title = role, summary = "", content = "";

    try {
      const data = JSON.parse(raw);
      if (!res.ok) throw new Error(data.message || "Failed to generate job content.");
      title   = data.title   || role;
      summary = data.summary || "";
      content = data.content || "";
    } catch (_) {
      // Plain text response — use as content directly
      content = raw;
      summary = `We are looking for a skilled ${role} to join our team.`;
    }

    document.getElementById("blogTitle").value   = title;
    document.getElementById("blogSummary").value = summary;
    document.getElementById("blogContent").value = content;
    autoGenerateSlug();

    // Also auto-fill the role field in hiring details if empty
    const hirRole = document.getElementById("hirRole");
    if (hirRole && !hirRole.value) hirRole.value = role;

    showToast("AI Job Writer", "Job description generated successfully!", false);
  } catch (err) {
    showToast("AI Job Error", err.message, true);
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
    // Also refresh hiring if that panel exists
    if (document.getElementById("hiringTableBody")) loadHiring();
  } catch (e) {
    showToast("Error", e.message, true);
  }
}

window.deleteBlog = async function(id) {
  if (!await confirm("Are you sure you want to delete this post?")) return;
  try {
    const res = await s3AdminFetch(`/api/admin/blogs/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    showToast("Success", "Post deleted successfully.", false);
    loadBlogs();
    if (document.getElementById("hiringTableBody")) loadHiring();
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
  
  // Show AI generator for new notes
  const aiSection = document.getElementById("noteAISection");
  if (aiSection) aiSection.style.display = "";

  document.getElementById("noteModal").style.display = "flex";
};

window.openEditNoteModal = function(itemJsonStr) {
  const item = JSON.parse(decodeURIComponent(itemJsonStr));
  document.getElementById("noteForm").reset();
  document.getElementById("noteId").value = item._id;
  document.getElementById("noteModalTitle").textContent = "Edit Study Note";
  
  // Hide AI generator for edit mode
  const aiSection = document.getElementById("noteAISection");
  if (aiSection) aiSection.style.display = "none";

  document.getElementById("noTitle").value = item.title;
  document.getElementById("noCategory").value = item.category;
  document.getElementById("noDescription").value = item.description;
  document.getElementById("noActive").value = item.active.toString();
  
  document.getElementById("noFile").required = false;
  document.getElementById("noFileInfo").textContent = "Leave empty to retain existing PDF.";

  document.getElementById("noteModal").style.display = "flex";
};

window.setNoteAIPrompt = function(val) {
  document.getElementById("aiNotePrompt").value = val;
};

window.generateAINoteContent = async function() {
  const prompt = document.getElementById("aiNotePrompt").value.trim();
  if (!prompt) {
    alert("Please enter a study topic.");
    return;
  }

  const btn = document.getElementById("btnGenerateNoteAI");
  btn.disabled = true;
  btn.textContent = "Writing...";

  try {
    const aiPrompt = `Generate study note description details for the topic: "${prompt}". Respond ONLY with a JSON object containing the fields: "title" (Clear descriptive chapter title), "category" (A single word topic e.g. Python, Excel, SQL, ML, Web3), and "description" (A clear 3-4 sentence summary details of what the student will learn from this study note PDF).`;
    const res = await s3AdminFetch("/api/admin/blogs/generate-ai", {
      method: "POST",
      body: JSON.stringify({ prompt: aiPrompt })
    });

    const raw = await res.text();
    let title = prompt, category = "IT", description = "";

    try {
      const scrubbed = raw.replace(/\\(?!["\\\/bfnrtu])/g, "\\\\");
      const data = JSON.parse(scrubbed);
      if (!res.ok) throw new Error(data.message || "Failed to generate note content.");
      title = data.title || prompt;
      category = data.category || "IT";
      description = data.description || "";
    } catch (_) {
      // Fallback plain text
      description = raw;
    }

    document.getElementById("noTitle").value = title;
    document.getElementById("noCategory").value = category;
    document.getElementById("noDescription").value = description;

    showToast("AI Notes Writer", "Study note description generated successfully!", false);
  } catch (err) {
    showToast("AI Notes Error", err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate";
  }
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
  
  // Clear any existing search query when opening
  const searchInput = document.getElementById("noteLeadSearchInput");
  if (searchInput) searchInput.value = "";

  try {
    const res = await s3AdminFetch("/api/admin/enquiries?limit=200");
    const data = await res.json();
    const list = data.data || data;

    // Filter leads specifically from study notes downloads and sort newest first (createdAt descending)
    const notesLeads = list
      .filter(e => e.message && e.message.includes("STUDY NOTES"))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Cache the leads list globally for dynamic search
    window.currentNotesLeads = notesLeads;

    renderNoteLeads(notesLeads);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef5350;">Failed to load leads: ${err.message}</td></tr>`;
  }
};

function renderNoteLeads(leads) {
  const tbody = document.getElementById("notesLeadsTableBody");
  if (!leads || leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">No matching download leads found.</td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map(e => `
    <tr>
      <td><strong>${e.fullName}</strong></td>
      <td>${e.phoneNumber}</td>
      <td>${e.email || '—'}</td>
      <td><small style="color: #aaa;">${e.message.replace("[LEAD FROM STUDY NOTES] Downloaded file: ", "")}</small></td>
      <td>${new Date(e.createdAt).toLocaleDateString("en-IN", { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
    </tr>
  `).join("");
}

window.filterNoteLeads = function() {
  const query = document.getElementById("noteLeadSearchInput").value.toLowerCase().trim();
  const leads = window.currentNotesLeads || [];
  
  if (!query) {
    renderNoteLeads(leads);
    return;
  }

  const filtered = leads.filter(e => {
    const name = (e.fullName || "").toLowerCase();
    const phone = (e.phoneNumber || "").toLowerCase();
    const email = (e.email || "").toLowerCase();
    const topic = (e.message || "").toLowerCase();
    return name.includes(query) || phone.includes(query) || email.includes(query) || topic.includes(query);
  });

  renderNoteLeads(filtered);
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
      const source = document.getElementById("hirSource").value;
      formData.append("hiringSource", source);
      formData.append("company", source === "own" ? "SSSAM Academy" : document.getElementById("hirCompany").value.trim());
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
