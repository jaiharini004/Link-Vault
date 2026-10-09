/**
 * LinkVault Client State & UI Design Tokens
 * Note: Strictly no emojis in variable names, string output, or console logs.
 */

const UI_TOKENS = {
  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif",
  colors: {
    primary: "#1E3A8A",
    secondary: "#2563EB",
    bgMain: "#F8FAFC",
    bgCard: "#FFFFFF",
    bgAccent: "#F0F4FF",
    border: "#CBD5E1",
    textDark: "#1E293B",
    textBody: "#334155",
    textMuted: "#64748B"
  },
  health: {
    Healthy: { text: "#15803D", bg: "#DCFCE7", dot: "#15803D", label: "Healthy" },
    Broken: { text: "#B91C1C", bg: "#FEE2E2", dot: "#B91C1C", label: "Broken" },
    Restricted: { text: "#B45309", bg: "#FEF3C7", dot: "#B45309", label: "Restricted" },
    Unreachable: { text: "#64748B", bg: "#F1F5F9", dot: "#64748B", label: "Timeout/Unreachable" },
    Unchecked: { text: "#64748B", bg: "#F1F5F9", dot: "#64748B", label: "Unchecked" }
  }
};

const appState = {
  links: [],
  categories: [],
  activeCategory: null,
  activeSource: null,
  activeHealth: null,
  searchQuery: "",
  sortOrder: "recent",
  view: "all", // "all", "inbox", "favorites"
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  }
};

/**
 * Centralized Fetch API Wrapper
 * @param {string} endpoint - Target REST API path
 * @param {object} options - Request configuration (method, headers, body)
 * @returns {Promise<object>} Parsed JSON response payload
 */
async function fetchAPI(endpoint, options = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  const config = {
    method: options.method || "GET",
    headers: { ...defaultHeaders, ...options.headers },
    ...options
  };

  if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  // Handle FormData content-type header removal for browser boundary generation
  if (config.body instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  try {
    const response = await fetch(endpoint, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `HTTP Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`[API Error] Request failed for ${endpoint}:`, error.message);
    throw error;
  }
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderLinkCards(linksContainerEl, links = []) {
  if (!linksContainerEl) return;

  try {
    if (links.length === 0) {
      linksContainerEl.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 32px; color: ${UI_TOKENS.colors.textMuted}; font-family: ${UI_TOKENS.fontFamily};">
          <p style="font-size: 14px; margin: 0;">No resources found matching the current criteria.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    links.forEach(link => {
      const originalUrl = link.url || link.original_url;
      const statusValue = link.status || link.health_status;
      const categoryValue = link.category_name || link.category;

      const healthInfo = UI_TOKENS.health[statusValue] || UI_TOKENS.health[link.health_status] || UI_TOKENS.health.Unchecked;
      const encodedSvg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔗</text></svg>');
      const faviconSrc = link.favicon_url || `data:image/svg+xml;utf8,${encodedSvg}`;

      const starFill = link.is_favorite ? "#EAB308" : "none";
      const starStroke = link.is_favorite ? "#EAB308" : "#94A3B8";

      const card = document.createElement("article");
      card.className = "link-card";
      card.dataset.id = link.id;
      card.style.cssText = `background: ${UI_TOKENS.colors.bgCard}; border: 1px solid ${UI_TOKENS.colors.border}; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); font-family: ${UI_TOKENS.fontFamily};`;
      
      card.innerHTML = `
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${faviconSrc}" alt="" style="width: 16px; height: 16px; border-radius: 2px;" onerror="this.style.display='none'" />
            <h3 style="font-size: 14px; font-weight: 600; color: ${UI_TOKENS.colors.primary}; margin: 0;">${escapeHTML(link.title || originalUrl)}</h3>
            <button onclick="toggleFavorite(${link.id}, ${!link.is_favorite})" class="star-btn" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center;" title="Toggle Favorite">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${starFill}" stroke="${starStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
            <button onclick="shortenLink(${link.id})" class="shorten-btn" style="background:#F1F5F9; border:1px solid #E2E8F0; padding:2px 8px; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; margin-left:6px; font-size:11px; font-weight:600; color:#334155; font-family:${UI_TOKENS.fontFamily}; transition:background 0.15s;" title="Create Short URL" onmouseover="this.style.background='#E2E8F0'" onmouseout="this.style.background='#F1F5F9'">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              Shorten
            </button>
          </div>
          <span class="health-badge" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 500; background: ${healthInfo.bg}; color: ${healthInfo.text};">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${healthInfo.dot};"></span>
            ${healthInfo.label}
          </span>
        </div>

        <p class="card-url" style="font-size: 9px; font-family: monospace; color: ${UI_TOKENS.colors.textDark}; margin: 0 0 8px 0; word-break: break-all;">
          ${escapeHTML(originalUrl)}
        </p>

        ${link.context ? `
          <div class="card-context" style="background: ${UI_TOKENS.colors.bgMain}; border-left: 3px solid ${UI_TOKENS.colors.secondary}; padding: 6px 10px; margin-bottom: 12px; font-size: 10px; color:${UI_TOKENS.colors.textBody};">
            <strong>Context:</strong> ${escapeHTML(link.context)}
          </div>
        ` : ''}

        <div class="card-footer" style="display: flex; align-items: center; justify-content: space-between; font-size: 9px; color: ${UI_TOKENS.colors.textMuted}; border-top: 1px solid ${UI_TOKENS.colors.border}; padding-top: 8px;">
          <div style="display: flex; gap: 6px; align-items: center;">
            <span class="badge-source" style="padding: 2px 6px; border-radius: 4px; background: ${UI_TOKENS.colors.bgAccent}; color: ${UI_TOKENS.colors.secondary}; font-weight: 500;">
              ${escapeHTML(link.source || 'Manual')}
            </span>
            ${categoryValue ? `<span class="badge-category" style="padding: 2px 6px; border-radius: 4px; background: ${UI_TOKENS.colors.bgMain}; border: 1px solid ${UI_TOKENS.colors.border};">${escapeHTML(categoryValue)}</span>` : ''}
          </div>
          <div class="card-actions" style="display: flex; gap: 8px;">
            <button onclick="handleCopyLink('${escapeHTML(originalUrl)}', this)" style="background: none; border: none; color: ${UI_TOKENS.colors.secondary}; cursor: pointer; font-size: 10px; font-weight: 600;">Copy</button>
            <button onclick="window.open('${escapeHTML(originalUrl)}', '_blank')" style="background: none; border: none; color: ${UI_TOKENS.colors.secondary}; cursor: pointer; font-size: 10px; font-weight: 600;">Open</button>
            <button onclick="handleEditLink(${link.id})" style="background: none; border: none; color: ${UI_TOKENS.colors.secondary}; cursor: pointer; font-size: 10px;">Edit</button>
            <button onclick="handleCheckSingleHealth(${link.id})" style="background: none; border: none; color: ${UI_TOKENS.colors.textMuted}; cursor: pointer; font-size: 10px;">Check Health</button>
            <button onclick="handleDeleteLink(${link.id})" style="background: none; border: none; color: #B91C1C; cursor: pointer; font-size: 10px;">Delete</button>
          </div>
        </div>
      `;
      fragment.appendChild(card);
    });
    
    linksContainerEl.innerHTML = "";
    linksContainerEl.appendChild(fragment);

  } catch (error) {
    console.error("Error rendering link cards:", error);
    linksContainerEl.innerHTML = `<div style="color: red; padding: 20px;">Failed to render links. Check console for details.</div>`;
  }
}

function handleCopyLink(url, btnEl) {
  navigator.clipboard.writeText(url).then(() => {
    const originalText = btnEl.textContent;
    btnEl.textContent = "Copied!";
    setTimeout(() => {
      btnEl.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error("Failed to copy:", err);
  });
}

function renderCategories(containerEl, categories = []) {
  if (!containerEl) return;

  // We won't include "All Links" here because it's in the Navigation list, not Categories list.
  let html = categories.map(cat => {
    const safeName = escapeHTML(cat.name);
    // Built-in hardcoded paths or dynamic path
    const hardcodedPaths = ["github", "google-drive", "google-meet", "youtube", "linkedin", "others"];
    const normalized = safeName.toLowerCase().replace(/\s+/g, '-');
    const href = hardcodedPaths.includes(normalized) ? `/${normalized}` : `/category/${encodeURIComponent(safeName)}`;

    // Check if this category is the active one
    const isActive = (window.INITIAL_CATEGORY && window.INITIAL_CATEGORY.toLowerCase() === safeName.toLowerCase()) ||
      (appState.activeCategory && appState.activeCategory.toLowerCase() === safeName.toLowerCase());
    const activeClass = isActive ? "nav-link-active" : "";

    return `
      <li class="nav-item" data-category="${safeName}">
        <a href="${href}" class="nav-link ${activeClass}" data-category-id="${safeName}">
          <span class="category-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </span>
          <span class="nav-label">${safeName}</span>
          <span class="nav-badge"></span>
        </a>
      </li>
    `;
  }).join('');

  containerEl.innerHTML = html;
}

function renderDashboardMetrics(metrics = {}) {
  // Total Links
  const totalLinksEl = document.getElementById("stat-total-links");
  if (totalLinksEl) totalLinksEl.textContent = metrics.total_links || 0;

  // Total Categories
  const totalCatEl = document.getElementById("stat-total-categories");
  if (totalCatEl) totalCatEl.textContent = metrics.total_categories || 0;

  // Short URLs count
  const shortUrlsEl = document.getElementById("stat-short-urls");
  if (shortUrlsEl) shortUrlsEl.textContent = metrics.total_short_urls || 0;

  // Platform breakdown summary
  const platformBreakdownEl = document.getElementById("stat-platform-breakdown");
  if (platformBreakdownEl) platformBreakdownEl.textContent = `${metrics.total_links || 0} Active`;

  // Platform breakdown chips
  if (metrics.platform_breakdown) {
    const p = metrics.platform_breakdown;
    const githubEl = document.getElementById("breakdown-count-github");
    if (githubEl) githubEl.textContent = p.github || 0;
    const driveEl = document.getElementById("breakdown-count-drive");
    if (driveEl) driveEl.textContent = p["google-drive"] || p.drive || 0;
    const meetEl = document.getElementById("breakdown-count-meet");
    if (meetEl) meetEl.textContent = p["google-meet"] || p.meet || 0;
    const youtubeEl = document.getElementById("breakdown-count-youtube");
    if (youtubeEl) youtubeEl.textContent = p.youtube || 0;
    const linkedinEl = document.getElementById("breakdown-count-linkedin");
    if (linkedinEl) linkedinEl.textContent = p.linkedin || 0;
    const othersEl = document.getElementById("breakdown-count-others");
    if (othersEl) othersEl.textContent = p.others || 0;

    // Nav Badges
    const bGithub = document.getElementById("badge-cat-github");
    if (bGithub) bGithub.textContent = p.github || 0;
    const bDrive = document.getElementById("badge-cat-drive");
    if (bDrive) bDrive.textContent = p["google-drive"] || p.drive || 0;
    const bMeet = document.getElementById("badge-cat-meet");
    if (bMeet) bMeet.textContent = p["google-meet"] || p.meet || 0;
    const bYoutube = document.getElementById("badge-cat-youtube");
    if (bYoutube) bYoutube.textContent = p.youtube || 0;
    const bLinkedin = document.getElementById("badge-cat-linkedin");
    if (bLinkedin) bLinkedin.textContent = p.linkedin || 0;
    const bOthers = document.getElementById("badge-cat-others");
    if (bOthers) bOthers.textContent = p.others || 0;
  }

  // Top Nav Badges
  const badgeAll = document.getElementById("badge-count-all");
  if (badgeAll) badgeAll.textContent = metrics.total_links || 0;
  
  const badgeFav = document.getElementById("badge-count-favorites");
  if (badgeFav) badgeFav.textContent = metrics.total_favorites || 0;
}

async function fetchDashboardStats() {
  try {
    const res = await fetchAPI("/api/links/stats");
    if (res && res.success) {
      renderDashboardMetrics(res.data);
    }
  } catch (err) {
    console.error("[Stats] Failed to fetch dashboard metrics:", err);
  }
}

/**
 * Utility: Debounce function executor
 */
function debounce(func, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

const cache = new Map();
function clearCache() {
  cache.clear();
}

/**
 * Execute REST Multi-Criteria Search (GET /api/links/search)
 */
async function executeSearch() {
  const queryParams = new URLSearchParams();

  if (appState.searchQuery) queryParams.append("q", appState.searchQuery);
  if (appState.activeCategory) queryParams.append("category", appState.activeCategory);
  if (appState.activeSource) queryParams.append("source", appState.activeSource);
  if (appState.activeHealth) queryParams.append("health", appState.activeHealth);
  if (appState.sortOrder) queryParams.append("sort", appState.sortOrder);
  if (appState.view === "inbox") queryParams.append("inbox", "true");
  if (appState.view === "favorites") queryParams.append("favorites", "true");

  queryParams.append("page", appState.pagination.page);
  queryParams.append("limit", appState.pagination.limit);

  const queryStr = queryParams.toString();
  const cacheKey = `search_${queryStr}`;

  // Serve from cache first if available
  if (cache.has(cacheKey)) {
    const cachedData = cache.get(cacheKey);
    appState.links = cachedData.results || [];
    appState.pagination.total = cachedData.total || 0;
    appState.pagination.pages = cachedData.pages || 1;
    const container = document.getElementById("links-grid-container");
    renderLinkCards(container, appState.links);
  }

  try {
    const data = await fetchAPI(`/api/links/search?${queryStr}`);
    if (data && data.success) {
      cache.set(cacheKey, data);
      
      appState.links = data.results || [];
      appState.pagination.total = data.total || 0;
      appState.pagination.pages = data.pages || 1;

      const container = document.getElementById("links-grid-container");
      renderLinkCards(container, appState.links);

      // Refresh dashboard stats on every search/update
      fetchDashboardStats();
    }
  } catch (err) {
    console.error("[API Error] Failed to execute link search:", err.message);
  }
}

async function fetchCategories() {
  try {
    const data = await fetchAPI("/api/categories");
    if (data && data.success) {
      appState.categories = data.data || [];
      const categoryNav = document.getElementById("category-nav");
      if (categoryNav) {
        renderCategories(categoryNav, appState.categories);
      }

      // Also update the select dropdown in the modals
      const selectElements = document.querySelectorAll("select[name='category_id']");
      selectElements.forEach(select => {
        // Keep the first default option, remove the rest
        while (select.options.length > 1) {
          select.remove(1);
        }
        appState.categories.forEach(cat => {
          const option = document.createElement("option");
          option.value = cat.id;
          option.textContent = cat.name;
          select.appendChild(option);
        });
      });

      renderCategoryManagementList();
    }
  } catch (err) {
    console.error("[API Error] Failed to fetch categories:", err.message);
  }
}

function renderCategoryManagementList() {
  const container = document.getElementById("categories-management-list");
  if (!container) return;

  if (appState.categories.length === 0) {
    container.innerHTML = `<li style="padding: 12px; text-align: center; color: ${UI_TOKENS.colors.textMuted}; font-size: 12px;">No categories available.</li>`;
    return;
  }

  container.innerHTML = appState.categories.map(cat => `
    <li class="category-item" data-category-id="${cat.id}">
      <div class="category-info">
        <strong class="category-item-name">${escapeHTML(cat.name)}</strong>
        <span class="category-item-desc">${escapeHTML(cat.description || '')}</span>
      </div>
      <div class="category-item-actions">
        <button type="button" class="btn btn-sm btn-outline btn-edit-category" data-id="${cat.id}" data-name="${escapeHTML(cat.name)}" data-desc="${escapeHTML(cat.description || '')}" aria-label="Edit category ${escapeHTML(cat.name)}">Edit</button>
        <button type="button" class="btn btn-sm btn-outline btn-danger btn-delete-category" data-id="${cat.id}" aria-label="Delete category ${escapeHTML(cat.name)}">Delete</button>
      </div>
    </li>
  `).join("");
}
/**
 * Initialize Client Event Listeners
 */
function initializeEventListeners() {
  // Search Bar with 200ms debounce
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", debounce((e) => {
      appState.searchQuery = e.target.value.trim();
      appState.pagination.page = 1;
      executeSearch();
    }, 200));
  }

  // Sort Dropdown Change Listener
  const sortSelect = document.getElementById("select-sort-order");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      appState.sortOrder = e.target.value;
      appState.pagination.page = 1;
      executeSearch();
    });
  }

  // Category Filter Clicks
  const categoryNav = document.getElementById("category-nav-list"); 
  if (categoryNav) {
    categoryNav.addEventListener("click", (e) => {
      const link = e.target.closest("a.nav-link");
      if (link) {
        e.preventDefault();
        const categoryId = link.getAttribute("data-category-id");
        appState.activeCategory = categoryId;
        appState.view = "all";
        appState.searchQuery = "";
        appState.pagination.page = 1;
        
        // Update active styling
        document.querySelectorAll(".nav-link").forEach(n => n.classList.remove("nav-link-active"));
        link.classList.add("nav-link-active");

        executeSearch();
      }
    });
  }

  // Views / Filters Clicks (All Links, Favorites, Recents)
  const navViewsList = document.getElementById("nav-views-list");
  if (navViewsList) {
    navViewsList.addEventListener("click", (e) => {
      const link = e.target.closest("a.nav-link");
      if (link) {
        e.preventDefault();
        const filter = link.getAttribute("data-filter");
        
        appState.view = filter === "all" ? "all" : filter;
        appState.activeCategory = null;
        appState.searchQuery = "";
        appState.pagination.page = 1;

        if (filter === "recents") {
          appState.sortOrder = "recent";
          const sortSelect = document.getElementById("select-sort-order");
          if (sortSelect) sortSelect.value = "recent";
        }

        // Update active styling
        document.querySelectorAll(".nav-link").forEach(n => n.classList.remove("nav-link-active"));
        link.classList.add("nav-link-active");

        executeSearch();
      }
    });
  }

  // Modal Open Buttons
  const btnAddLink = document.getElementById("btn-open-add-link");
  if (btnAddLink) {
    btnAddLink.addEventListener("click", () => openModal("modal-add-link"));
  }

  // Auto-detect and Duplicate check on URL input
  const addLinkUrl = document.getElementById("add-link-url");
  if (addLinkUrl) {
    const handleUrlInput = debounce(async (e) => {
      const url = e.target.value.trim();
      if (!url) return;
      
      // Auto-detect category
      const categorySelect = document.getElementById("add-link-category");
      if (categorySelect && !categorySelect.value) {
        let detected = "";
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes("github")) detected = "github";
        else if (lowerUrl.includes("drive.google.com")) detected = "google-drive";
        else if (lowerUrl.includes("meet.google.com")) detected = "google-meet";
        else if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) detected = "youtube";
        else if (lowerUrl.includes("linkedin")) detected = "linkedin";
        
        if (detected && appState.categories) {
          const match = appState.categories.find(c => c.name.toLowerCase().replace(/\s+/g, '-') === detected);
          if (match) {
            categorySelect.value = match.id.toString();
          }
        }
      }

      // Check duplicate
      try {
        const dupCheck = await fetchAPI("/api/links/check-duplicate", {
          method: "POST",
          body: { url: url }
        });
        
        const hintEl = document.getElementById("add-link-url-hint");
        if (dupCheck && dupCheck.is_duplicate) {
          if (hintEl) {
            hintEl.innerHTML = `<span style="color: #B91C1C; font-weight: bold;">Warning: This link already exists in your vault.</span>`;
          }
        } else {
          if (hintEl) {
            hintEl.textContent = "Auto-detection will inspect domain (GitHub, Meet, Drive, etc.)";
          }
        }
      } catch (err) {
        // Ignore API errors on typing
      }
    }, 400);

    addLinkUrl.addEventListener("input", handleUrlInput);
  }

  const btnManageCategories = document.getElementById("btn-open-category-manager");
  if (btnManageCategories) {
    btnManageCategories.addEventListener("click", () => openModal("modal-category-manager"));
  }

  const btnExportWhatsApp = document.getElementById("btn-export-whatsapp");
  if (btnExportWhatsApp) {
    btnExportWhatsApp.addEventListener("click", () => {
      if (appState.links.length === 0) {
        alert("No links to export.");
        return;
      }
      
      const categoryName = appState.activeCategory || "All Links";
      let formattedText = `*LinkVault - ${categoryName}*\n\n`;
      
      appState.links.forEach(link => {
        const url = link.original_url || link.url;
        const title = link.title || url;
        formattedText += `*${title}*: ${url}\n\n`;
      });
      
      const waUrl = `https://wa.me/?text=${encodeURIComponent(formattedText)}`;
      window.open(waUrl, '_blank');
    });
  }

  // Auth Forms
  const signinForm = document.getElementById("form-signin");
  if (signinForm) {
    signinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("signin-email").value;
      const pass = document.getElementById("signin-password").value;
      try {
        const res = await fetchAPI("/api/auth/signin", { method: "POST", body: { email, password: pass } });
        if (res && res.success) {
          localStorage.setItem("lv_token", res.token);
          closeModal("modal-signin");
          updateAuthUI();
        }
      } catch(err) {
        alert("Sign in failed: " + err.message);
      }
    });
  }

  const signupForm = document.getElementById("form-signup");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("signup-email").value;
      const pass = document.getElementById("signup-password").value;
      try {
        const res = await fetchAPI("/api/auth/signup", { method: "POST", body: { email, password: pass } });
        if (res && res.success) {
          localStorage.setItem("lv_token", res.token);
          closeModal("modal-signup");
          updateAuthUI();
          alert("Account created successfully!");
        }
      } catch(err) {
        alert("Sign up failed: " + err.message);
      }
    });
  }

  updateAuthUI();

  const catManagementList = document.getElementById("categories-management-list");
  if (catManagementList) {
    catManagementList.addEventListener("click", async (e) => {
      const editBtn = e.target.closest(".btn-edit-category");
      if (editBtn) {
        const id = editBtn.dataset.id;
        const newName = prompt("Enter new category name:", editBtn.dataset.name);
        if (newName && newName.trim()) {
          try {
            const response = await fetchAPI(`/api/categories/${id}`, {
              method: "PUT",
              body: { name: newName.trim(), description: editBtn.dataset.desc }
            });
            if (response && response.success) {
              fetchCategories();
              executeSearch();
            }
          } catch (err) {
            alert(`Failed to update category: ${err.message}`);
          }
        }
      }

      const delBtn = e.target.closest(".btn-delete-category");
      if (delBtn) {
        if (confirm("Are you sure you want to delete this category?")) {
          const id = delBtn.dataset.id;
          try {
            const response = await fetchAPI(`/api/categories/${id}`, {
              method: "DELETE"
            });
            if (response && response.success) {
              fetchCategories();
              executeSearch();
            }
          } catch (err) {
            alert(`Failed to delete category: ${err.message}`);
          }
        }
      }
    });
  }
}

/**
 * Generic Modal Lifecycle Controller
 * Note: Strictly no emojis in variable names, string output, or console logs.
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.removeAttribute("hidden");
  modal.style.display = "flex";
  modal.classList.add("active");
  document.body.style.overflow = "hidden"; // Prevent background scrolling
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.setAttribute("hidden", "");
  modal.style.display = "none";
  modal.classList.remove("active");
  document.body.style.overflow = "";

  // Reset form inputs if modal contains a form
  const form = modal.querySelector("form");
  if (form) form.reset();
}

function initializeModalListeners() {
  // Global listener for modal close buttons, cancel buttons, and backdrop clicks
  document.addEventListener("click", (e) => {
    if (e.target.matches(".modal-backdrop") || e.target.closest(".modal-btn-close") || e.target.matches("button.btn-secondary:not([type='submit'])") && e.target.textContent.trim() === "Cancel" || e.target.id && e.target.id.startsWith("btn-cancel-modal")) {
      const activeModal = e.target.closest(".modal-backdrop");
      if (activeModal) {
        closeModal(activeModal.id);
        // Also if it's the short URL modal which uses hidden attribute instead of active class in some places
        if (activeModal.id === 'modal-short-url') activeModal.hidden = true;
      }
    }
  });

  // Keyboard ESC dismissal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModals = document.querySelectorAll(".modal-backdrop.active");
      activeModals.forEach(m => closeModal(m.id));
    }
  });

  const addForm = document.getElementById("form-add-link");
  if (addForm) {
    addForm.addEventListener("submit", handleLinkSubmit);
  }

  const editForm = document.getElementById("form-edit-link");
  if (editForm) {
    editForm.addEventListener("submit", handleLinkSubmit);
  }

  const categoryForm = document.getElementById("form-create-category");
  if (categoryForm) {
    categoryForm.addEventListener("submit", handleCategorySubmit);
  }

  // Short URL Modal
  const btnCloseShort = document.getElementById("btn-close-modal-short");
  const btnCancelShort = document.getElementById("btn-cancel-modal-short");
  const modalShort = document.getElementById("modal-short-url");

  if (btnCloseShort) btnCloseShort.addEventListener("click", () => { if (modalShort) modalShort.hidden = true; });
  if (btnCancelShort) btnCancelShort.addEventListener("click", () => { if (modalShort) modalShort.hidden = true; });

  const formShortUrl = document.getElementById("form-short-url");
  if (formShortUrl) {
    formShortUrl.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("short-url-link-id").value;
      const customAlias = document.getElementById("short-url-alias").value.trim();
      const btnSubmit = document.getElementById("btn-submit-short-url");

      btnSubmit.disabled = true;
      btnSubmit.textContent = "Generating...";

      try {
        const res = await fetchAPI(`/api/links/${id}/shorten`, {
          method: "POST",
          body: { custom_alias: customAlias }
        });

        if (res && res.status === "success") {
          document.getElementById("short-url-form-group").style.display = "none";
          document.getElementById("short-url-result-container").style.display = "block";
          document.getElementById("short-url-result").value = res.short_url;
        } else if (res && res.message) {
          alert(`Failed to create short URL: ${res.message}`);
        }
      } catch (err) {
        alert(`Error creating short URL: ${err.message}`);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Generate Link";
      }
    });
  }

  const btnCopyShort = document.getElementById("btn-copy-short-url");
  if (btnCopyShort) {
    btnCopyShort.addEventListener("click", async () => {
      const resultInput = document.getElementById("short-url-result");
      try {
        await navigator.clipboard.writeText(resultInput.value);
        document.getElementById("short-url-copy-success").style.display = "block";
        setTimeout(() => {
          document.getElementById("short-url-copy-success").style.display = "none";
        }, 2000);
      } catch (err) {
        alert("Failed to copy URL");
      }
    });
  }
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetchAPI("/api/categories", {
      method: "POST",
      body: payload
    });
    if (response) {
      form.reset();
      // Assume response returns the new category list or we refetch it
      fetchCategories();
      clearCache();
      executeSearch();
      closeModal("modal-category-manager");
    }
  } catch (err) {
    alert(`Failed to create category: ${err.message}`);
  }
}

async function handleLinkSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  // Backend expects 'url', frontend sends 'original_url'
  if (payload.original_url) {
    payload.url = payload.original_url;
  }
  // Checkboxes
  payload.is_favorite = formData.has('is_favorite') ? true : false;

  function suggestCategoryFromUrl(u) {
    if (!u) return "";
    const lowerUrl = u.toLowerCase();
    let detected = "";
    if (lowerUrl.includes("github.com") || lowerUrl.includes("gitlab.com")) detected = "github";
    else if (lowerUrl.includes("drive.google.com") || lowerUrl.includes("docs.google.com")) detected = "google-drive";
    else if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) detected = "youtube";
    else if (lowerUrl.includes("meet.google.com") || lowerUrl.includes("zoom.us")) detected = "google-meet";
    else if (lowerUrl.includes("linkedin.com")) detected = "linkedin";
    
    if (detected && appState.categories) {
      const match = appState.categories.find(c => c.name.toLowerCase().replace(/\s+/g, '-') === detected);
      if (match) return match.id;
    }
    return "";
  }

  if (!payload.category_id) {
    payload.category_id = suggestCategoryFromUrl(payload.url);
  }

  if (!payload.id) {
    // Parse UTM tags
    try {
      const urlObj = new URL(payload.url);
      const utmSource = urlObj.searchParams.get("utm_source");
      if (utmSource) {
        payload.source = utmSource;
      }
    } catch (e) {
      // Invalid URL or no URL yet
    }

    // Check for duplicate on new link creation
    try {
      const dupCheck = await fetchAPI("/api/links/check-duplicate", {
        method: "POST",
        body: { url: payload.url }
      });

      if (dupCheck.is_duplicate && !form.dataset.forceSave) {
        showDuplicateModal(dupCheck.existing_link, payload);
        return;
      }
    } catch (err) {
      console.error("Duplicate verification failed:", err.message);
    }
  }

  // Persist link via POST or PUT
  const endpoint = payload.id ? `/api/links/${payload.id}` : "/api/links";
  const method = payload.id ? "PUT" : "POST";

  let tempId = null;
  if (!payload.id) {
    tempId = 'temp_' + Date.now();
    const optimisticLink = {
      id: tempId,
      title: payload.title || payload.url,
      original_url: payload.url,
      category_name: payload.category_id,
      is_favorite: payload.is_favorite,
      source: payload.source || 'Manual',
      status: 'Unchecked',
      created_at: new Date().toISOString()
    };
    appState.links.unshift(optimisticLink);
    const container = document.getElementById("links-grid-container");
    renderLinkCards(container, appState.links);
    closeModal("modal-add-link");
  }

  try {
    const response = await fetchAPI(endpoint, { method, body: payload });
    if (response) {
      delete form.dataset.forceSave;
      if (payload.id) closeModal("modal-edit-link");
      if (!tempId) form.reset();

      clearCache();

      const savedLinkCategory = payload.category_id || (response.data && response.data.category_id) || "all";
      const currentCategory = appState.activeCategory || (window.INITIAL_CATEGORY ? window.INITIAL_CATEGORY.toLowerCase() : "all");

      if (!payload.id && currentCategory !== "all" && String(currentCategory) !== String(savedLinkCategory)) {
        alert(`Link saved to ${savedLinkCategory}. Redirecting to All Links.`);
        window.location.href = "/";
        return;
      } else {
        executeSearch();
      }
    }
  } catch (err) {
    if (tempId) {
      appState.links = appState.links.filter(l => l.id !== tempId);
      const container = document.getElementById("links-grid-container");
      renderLinkCards(container, appState.links);
    }
    alert(`Failed to save link: ${err.message}`);
  }
}

async function handleDeleteLink(id) {
  if (confirm("Are you sure you want to delete this link?")) {
    try {
      const res = await fetchAPI(`/api/links/${id}`, { method: "DELETE" });
      if (res && res.success) {
        clearCache();
        executeSearch();
      }
    } catch (err) {
      alert(`Failed to delete link: ${err.message}`);
    }
  }
}
async function toggleFavorite(id, newStatus) {
  // Optimistic UI update
  const card = document.querySelector(`.link-card[data-id="${id}"]`);
  let starBtn, originalFill, originalStroke;
  
  if (card) {
    starBtn = card.querySelector(".star-btn svg");
    if (starBtn) {
      originalFill = starBtn.getAttribute("fill");
      originalStroke = starBtn.getAttribute("stroke");
      starBtn.setAttribute("fill", newStatus ? "#EAB308" : "none");
      starBtn.setAttribute("stroke", newStatus ? "#EAB308" : "#94A3B8");
    }
  }

  try {
    const res = await fetchAPI(`/api/links/${id}`, {
      method: "PUT",
      body: { is_favorite: newStatus }
    });
    if (res && res.success) {
      clearCache();
      const linkIndex = appState.links.findIndex(l => l.id === id);
      if (linkIndex !== -1) {
        appState.links[linkIndex].is_favorite = newStatus;
      }
      executeSearch();
    } else {
      // Revert on failure
      if (starBtn) {
        starBtn.setAttribute("fill", originalFill);
        starBtn.setAttribute("stroke", originalStroke);
      }
    }
  } catch (err) {
    if (starBtn) {
      starBtn.setAttribute("fill", originalFill);
      starBtn.setAttribute("stroke", originalStroke);
    }
    alert(`Failed to update favorite status: ${err.message}`);
  }
}

function shortenLink(id) {
  const modal = document.getElementById("modal-short-url");
  if (!modal) return;

  // Reset modal state
  document.getElementById("short-url-link-id").value = id;
  document.getElementById("short-url-alias").value = "";
  document.getElementById("short-url-result-container").style.display = "none";
  document.getElementById("short-url-copy-success").style.display = "none";
  document.getElementById("short-url-form-group").style.display = "block";

  modal.hidden = false;
}

function handleEditLink(id) {
  const link = appState.links.find(l => l.id === id);
  if (!link) return;

  const editModal = document.getElementById("modal-edit-link");
  if (editModal) {
    const form = document.getElementById("form-edit-link");
    if (form) {
      form.elements["id"].value = link.id;
      form.elements["original_url"].value = link.original_url || '';
      form.elements["title"].value = link.title || '';
      form.elements["category_id"].value = link.category_id || '';
      
      // Map to correct input names found in index.html
      if (form.elements["description"]) {
        form.elements["description"].value = link.description || link.context || '';
      }
      if (form.elements["tags"]) {
        form.elements["tags"].value = (link.tags_list || []).join(', ') || link.tags || '';
      }
      
      form.elements["is_favorite"].checked = link.is_favorite || false;
    }
    openModal("modal-edit-link");
  }
}

function showDuplicateModal(existingLink, newPayload) {
  const dupModal = document.getElementById("duplicate-modal");
  if (!dupModal) return;

  const infoContainer = dupModal.querySelector(".existing-link-info");
  if (infoContainer) {
    infoContainer.innerHTML = `
      <div style="background: ${UI_TOKENS.colors.bgMain}; border: 1px solid ${UI_TOKENS.colors.border}; border-radius: 6px; padding: 12px; margin: 12px 0;">
        <h4 style="margin: 0 0 4px 0; font-size: 11px; color: ${UI_TOKENS.colors.primary};">${escapeHTML(existingLink.title)}</h4>
        <p style="margin: 0; font-size: 9px; font-family: monospace; color: ${UI_TOKENS.colors.textDark};">${escapeHTML(existingLink.original_url)}</p>
        <div style="font-size: 9px; color: ${UI_TOKENS.colors.textMuted}; margin-top: 6px;">
          Source: ${escapeHTML(existingLink.source)} | Saved: ${new Date(existingLink.created_at).toLocaleDateString()}
        </div>
      </div>
    `;
  }

  // Wire action buttons
  const viewBtn = document.getElementById("btn-view-existing");
  if (viewBtn) {
    viewBtn.onclick = () => {
      closeModal("duplicate-modal");
      closeModal("modal-add-link");
      appState.searchQuery = existingLink.original_url;
      executeSearch();
    };
  }

  const saveBtn = document.getElementById("btn-save-anyway");
  if (saveBtn) {
    saveBtn.onclick = () => {
      closeModal("duplicate-modal");
      const linkForm = document.getElementById("form-add-link");
      if (linkForm) {
        linkForm.dataset.forceSave = "true";
        linkForm.requestSubmit();
      }
    };
  }

  openModal("duplicate-modal");
}

function initializeWhatsAppImport() {
  const dropzone = document.getElementById("whatsapp-dropzone");
  const fileInput = document.getElementById("whatsapp-file-input");

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = UI_TOKENS.colors.secondary;
    dropzone.style.background = UI_TOKENS.colors.bgAccent;
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = UI_TOKENS.colors.border;
    dropzone.style.background = "transparent";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = UI_TOKENS.colors.border;
    dropzone.style.background = "transparent";

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith(".txt")) {
      processWhatsAppFile(files[0]);
    } else {
      alert("Please upload a valid WhatsApp chat export plain text (.txt) file.");
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      processWhatsAppFile(e.target.files[0]);
    }
  });
}

function toggleAllImportCheckboxes(sourceCb) {
  const checkboxes = document.querySelectorAll(".import-link-select");
  checkboxes.forEach(cb => {
    cb.checked = sourceCb.checked;
  });
}

async function processWhatsAppFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const data = await fetchAPI("/api/import/whatsapp", {
      method: "POST",
      body: formData
    });

    if (data && data.success) {
      renderWhatsAppStagingTable(data);
      openModal("whatsapp-staging-modal");
    }
  } catch (err) {
    alert(`Failed to parse WhatsApp export: ${err.message}`);
  }
}

function renderWhatsAppStagingTable(importData) {
  const container = document.getElementById("whatsapp-staging-container");
  if (!container) return;

  const stats = importData.platform_stats || {};

  container.innerHTML = `
    <div class="platform-stats-summary" style="display: flex; gap: 8px; margin-bottom: 16px; font-family: ${UI_TOKENS.fontFamily};">
      <span style="background: ${UI_TOKENS.colors.bgAccent}; color: ${UI_TOKENS.colors.secondary}; padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 600;">GitHub: ${stats.GitHub || 0}</span>
      <span style="background: ${UI_TOKENS.colors.bgAccent}; color: ${UI_TOKENS.colors.secondary}; padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 600;">Drive: ${stats.Drive || 0}</span>
      <span style="background: ${UI_TOKENS.colors.bgAccent}; color: ${UI_TOKENS.colors.secondary}; padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 600;">YouTube: ${stats.YouTube || 0}</span>
      <span style="background: ${UI_TOKENS.colors.bgAccent}; color: ${UI_TOKENS.colors.secondary}; padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 600;">Meet: ${stats.Meet || 0}</span>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-family: ${UI_TOKENS.fontFamily};">
      <thead>
        <tr style="background: ${UI_TOKENS.colors.bgAccent}; text-align: left; color: ${UI_TOKENS.colors.primary}; border-bottom: 1px solid ${UI_TOKENS.colors.border};">
          <th style="padding: 8px;"><input type="checkbox" id="select-all-import" checked onclick="toggleAllImportCheckboxes(this)" /></th>
          <th style="padding: 8px;">URL / Suggested Title</th>
          <th style="padding: 8px;">Category</th>
          <th style="padding: 8px;">Chat Rationale Context</th>
        </tr>
      </thead>
      <tbody>
        ${importData.staged_links.map((link, idx) => `
          <tr style="border-bottom: 1px solid ${UI_TOKENS.colors.border};${link.is_duplicate ? 'background: #FEF2F2;' : ''}">
            <td style="padding: 8px;"><input type="checkbox" class="import-link-select" data-index="${idx}" ${link.is_duplicate ? '' : 'checked'} /></td>
            <td style="padding: 8px;">
              <input type="text" class="import-title-input" value="${escapeHTML(link.suggested_title)}" style="width: 100%; font-size: 10px; padding: 4px; border: 1px solid ${UI_TOKENS.colors.border}; border-radius: 4px;" />
              <div style="font-size: 8px; font-family: monospace; color: ${UI_TOKENS.colors.textMuted};">${escapeHTML(link.normalized_url)}</div>${link.is_duplicate ? `<span style="color: #B91C1C; font-size: 8px; font-weight: 600;">Existing Duplicate</span>` : ''}
            </td>
            <td style="padding: 8px;">
              <span style="padding: 2px 6px; border-radius: 4px; background: ${UI_TOKENS.colors.bgMain}; font-size: 9px;">${escapeHTML(link.suggested_category)}</span>
            </td>
            <td style="padding: 8px;">
              <input type="text" class="import-context-input" value="${escapeHTML(link.context)}" style="width: 100%; font-size: 10px; padding: 4px; border: 1px solid ${UI_TOKENS.colors.border}; border-radius: 4px;" />
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  window.currentStagedLinks = importData.staged_links;
}

async function confirmWhatsAppImport() {
  const checkboxes = document.querySelectorAll(".import-link-select");
  const confirmedPayload = [];

  checkboxes.forEach(cb => {
    if (cb.checked) {
      const idx = parseInt(cb.dataset.index, 10);
      const row = cb.closest("tr");
      const title = row.querySelector(".import-title-input").value;
      const context = row.querySelector(".import-context-input").value;

      const item = window.currentStagedLinks[idx];
      confirmedPayload.push({
        title: title,
        original_url: item.original_url,
        normalized_url: item.normalized_url,
        category: item.suggested_category,
        context: context,
        source: "WhatsApp"
      });
    }
  });

  if (confirmedPayload.length === 0) {
    alert("Please select at least one link to import.");
    return;
  }

  try {
    const res = await fetchAPI("/api/import/confirm", {
      method: "POST",
      body: confirmedPayload
    });

    if (res && res.success) {
      closeModal("whatsapp-staging-modal");
      clearCache();
      executeSearch();
    }
  } catch (err) {
    alert(`Failed to confirm import: ${err.message}`);
  }
}

async function handleQuickInboxSubmit(event) {
  event.preventDefault();
  const textarea = document.getElementById("inbox-raw-urls");
  if (!textarea) return;

  const rawText = textarea.value.trim();
  if (!rawText) return;

  const urls = rawText.split("\n").map(u => u.trim()).filter(u => u.length > 0);

  try {
    const res = await fetchAPI("/api/inbox", {
      method: "POST",
      body: { urls: urls }
    });

    if (res) {
      textarea.value = "";
      closeModal("quick-inbox-modal");
      appState.view = "inbox";
      clearCache();
      executeSearch();
    }
  } catch (err) {
    alert(`Failed to stage inbox URLs: ${err.message}`);
  }
}

async function handleBatchOrganizeSubmit(event) {
  event.preventDefault();
  const rows = document.querySelectorAll(".inbox-organize-row");
  const organizePayload = [];

  rows.forEach(row => {
    const linkId = row.dataset.linkId;
    const category = row.querySelector(".organize-category-select").value;
    const title = row.querySelector(".organize-title-input").value;

    if (category) {
      organizePayload.push({
        link_id: parseInt(linkId, 10),
        category: category,
        title: title
      });
    }
  });

  try {
    const res = await fetchAPI("/api/inbox/organize", {
      method: "POST",
      body: { items: organizePayload }
    });

    if (res && res.success) {
      closeModal("inbox-organize-modal");
      clearCache();
      executeSearch();
    }
  } catch (err) {
    alert(`Batch organization failed: ${err.message}`);
  }
}

async function handleCheckSingleHealth(linkId) {
  // Open the modal and show loading state
  openModal("modal-health-check");
  const bodyEl = document.getElementById("health-check-body");
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="text-align: center; padding: 30px;">
        <svg class="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${UI_TOKENS.colors.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
        </svg>
        <p style="margin-top: 15px; color: ${UI_TOKENS.colors.textMuted}; font-family: ${UI_TOKENS.fontFamily};">Analyzing link health in real-time...</p>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
      </div>
    `;
  }

  try {
    const res = await fetchAPI(`/api/links/${linkId}/health`, { method: "POST" });
    if (res && res.success) {
      // Find card in DOM and update health badge
      const card = document.querySelector(`.link-card[data-id="${linkId}"]`);
      const healthInfo = UI_TOKENS.health[res.health_status] || UI_TOKENS.health.Unchecked;

      if (card) {
        const badge = card.querySelector(".health-badge");
        if (badge) {
          badge.style.background = healthInfo.bg;
          badge.style.color = healthInfo.text;
          badge.innerHTML = `
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${healthInfo.dot};"></span>
            ${healthInfo.label}
          `;
        }
      }

      // Render the logic into the modal
      if (bodyEl) {
        bodyEl.innerHTML = `
          <div style="font-family: ${UI_TOKENS.fontFamily}; padding: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 15px; border-radius: 8px; background: ${healthInfo.bg}; border: 1px solid ${healthInfo.border || healthInfo.bg};">
              <strong style="color: ${healthInfo.text}; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${healthInfo.dot}; display: inline-block;"></span>
                ${healthInfo.label}
              </strong>
              <span style="color: ${healthInfo.text}; opacity: 0.8; font-size: 12px; font-weight: 500;">HTTP ${res.http_status_code || 'N/A'}</span>
            </div>
            
            <h4 style="font-size: 13px; color: ${UI_TOKENS.colors.textMuted}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Health Check Details</h4>
            <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: ${UI_TOKENS.colors.text}; display: flex; flex-direction: column; gap: 12px;">
              <li style="display: flex; flex-direction: column; gap: 4px;">
                <span style="color: ${UI_TOKENS.colors.textMuted}; font-size: 12px;">Status Code</span>
                <strong style="font-family: monospace; font-size: 15px; background: ${UI_TOKENS.colors.bgHover}; padding: 4px 8px; border-radius: 4px; display: inline-block; width: fit-content;">${res.http_status_code || 'None'}</strong>
              </li>
              <li style="display: flex; flex-direction: column; gap: 4px;">
                <span style="color: ${UI_TOKENS.colors.textMuted}; font-size: 12px;">Last Checked At</span>
                <span>${res.last_checked_at ? new Date(res.last_checked_at).toLocaleString() : 'Just now'}</span>
              </li>
              <li style="display: flex; flex-direction: column; gap: 4px;">
                <span style="color: ${UI_TOKENS.colors.textMuted}; font-size: 12px;">Behind the Logic</span>
                <span style="background: ${UI_TOKENS.colors.bgAccent}; padding: 10px; border-radius: 6px; font-size: 13px; line-height: 1.5; border: 1px solid ${UI_TOKENS.colors.border};">
                  ${res.http_status_code >= 200 && res.http_status_code < 400 
                    ? "The endpoint responded successfully indicating the link is active and reachable." 
                    : res.http_status_code >= 400 
                    ? "The endpoint returned an error, indicating the link may be broken, restricted, or permanently moved."
                    : "The connection failed or timed out before receiving a valid HTTP response."}
                </span>
              </li>
            </ul>
          </div>
        `;
      }
    }
  } catch (err) {
    if (bodyEl) {
        bodyEl.innerHTML = `
          <div style="padding: 20px; color: ${UI_TOKENS.colors.danger}; font-family: ${UI_TOKENS.fontFamily}; text-align: center;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 12px;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p><strong>Failed to perform health check.</strong></p>
            <p style="font-size: 13px; margin-top: 8px; opacity: 0.8;">${err.message}</p>
          </div>
        `;
    }
    console.error(`Single health check failed for ID ${linkId}:`, err.message);
  }
}

async function handleTriggerBulkHealthCheck() {
  try {
    const res = await fetchAPI("/api/links/health-check-all", { method: "POST" });
    if (res && res.success) {
      alert("Bulk health check job initiated in the background.");
      // Periodically refresh list view after 3 seconds
      setTimeout(() => executeSearch(), 3000);
    }
  } catch (err) {
    alert(`Failed to trigger bulk health check: ${err.message}`);
  }
}

function updateSidebarUI() {
  document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("nav-link-active"));
  document.querySelectorAll(".profile-menu a").forEach(link => link.classList.remove("active-dropdown-item"));
  
  const path = window.location.pathname;
  let activeLink = null;
  
  if (path === '/') {
    activeLink = document.querySelector(`.nav-link[href="/"]`);
  } else if (path === '/profile') {
    activeLink = document.querySelector(`.profile-menu a[href="/profile"]`);
    if (activeLink) {
      activeLink.style.color = "var(--color-primary)";
      activeLink.style.fontWeight = "600";
    }
  } else {
    activeLink = document.querySelector(`.nav-link[href="${path}"]`);
  }
  
  if (activeLink && path !== '/profile') {
    activeLink.classList.add("nav-link-active");
  }
}

// Initial placeholder setup for the page initialization
document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  if (window.INITIAL_CATEGORY) {
    appState.activeCategory = window.INITIAL_CATEGORY;
  }
  if (window.INITIAL_VIEW) {
    appState.view = window.INITIAL_VIEW;
  }
  updateSidebarUI();
  initializeEventListeners();
  initializeModalListeners();
  initializeWhatsAppImport();
  fetchCategories();
  executeSearch();
});

async function handleSignOut() {
  localStorage.removeItem("lv_token");
  try {
    await fetchAPI('/api/auth/signout', { method: 'POST' });
  } catch (e) {
    // Ignore if mock fails
  }
  updateAuthUI();
  // Close dropdown if open
  const dropdown = document.getElementById('profile-dropdown');
  if (dropdown) dropdown.classList.remove('show');
  alert("Signed out successfully.");
}

async function updateAuthUI() {
  const token = localStorage.getItem("lv_token");
  const unauthActions = document.getElementById("unauth-actions");
  const authWidget = document.getElementById("auth-user-widget");
  const userAvatar = document.getElementById("user-avatar");
  const profileName = document.getElementById("profile-name");
  const profileEmail = document.getElementById("profile-email");
  
  if (token) {
    try {
      const authRes = await fetchAPI('/api/auth/me');
      if (authRes.authenticated && authRes.user) {
        if (unauthActions) unauthActions.style.display = "none";
        if (authWidget) authWidget.style.display = "block";
        
        const username = authRes.user.username || "User";
        if (userAvatar) {
          userAvatar.textContent = username.charAt(0).toUpperCase();
        }
        if (profileName) profileName.textContent = username;
        if (profileEmail) profileEmail.textContent = authRes.user.email || "";
      } else {
        throw new Error("Not authenticated");
      }
    } catch (e) {
      // Fallback if /me fails or returns false
      if (unauthActions) unauthActions.style.display = "inline-flex";
      if (authWidget) authWidget.style.display = "none";
    }
  } else {
    if (unauthActions) unauthActions.style.display = "inline-flex";
    if (authWidget) authWidget.style.display = "none";
  }
}

// Profile Dropdown Toggle
function toggleProfileDropdown() {
  const dropdown = document.getElementById('profile-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const authWidget = document.getElementById('auth-user-widget');
  const dropdown = document.getElementById('profile-dropdown');
  if (authWidget && dropdown && !authWidget.contains(e.target)) {
    dropdown.classList.remove('show');
  }
});


// =========================================================================
// APPEARANCE THEME SWITCHER
// =========================================================================
function applyTheme(theme) {
  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = theme === 'dark' || (theme === 'system' && isSystemDark);

  if (shouldBeDark) {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }
  
  // Sync dropdown selector if it exists
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.value = theme;
  }
}

function handleThemeChange(theme) {
  if (theme !== 'dark' && theme !== 'system') {
    theme = 'system';
  }
  localStorage.setItem('linkvault_theme', theme);
  applyTheme(theme);
}

// Listen to system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const savedTheme = localStorage.getItem('linkvault_theme') || 'system';
  if (savedTheme === 'system') {
    applyTheme('system');
  }
});

// Initialize Theme on load
(function initTheme() {
  const savedTheme = localStorage.getItem('linkvault_theme') || 'system';
  applyTheme(savedTheme);
})();

// Form Handlers for Auth
document.addEventListener("DOMContentLoaded", () => {
  const signinForm = document.getElementById("form-signin");
  if (signinForm) {
    signinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("signin-email").value;
      const password = document.getElementById("signin-password").value;
      
      try {
        const res = await fetchAPI('/api/auth/signin', {
          method: 'POST',
          body: { email, password }
        });
        
        if (res.success && res.token) {
          localStorage.setItem("lv_token", res.token);
          closeModal("modal-signin");
          updateAuthUI();
        } else {
          alert(res.message || "Failed to sign in");
        }
      } catch (err) {
        alert("Sign in error: " + err.message);
      }
    });
  }

  const signupForm = document.getElementById("form-signup");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("signup-email").value;
      const password = document.getElementById("signup-password").value;
      
      try {
        const res = await fetchAPI('/api/auth/signup', {
          method: 'POST',
          body: { email, password }
        });
        
        if (res.success && res.token) {
          localStorage.setItem("lv_token", res.token);
          closeModal("modal-signup");
          updateAuthUI();
        } else {
          alert(res.message || "Failed to sign up");
        }
      } catch (err) {
        alert("Sign up error: " + err.message);
      }
    });
  }
});

