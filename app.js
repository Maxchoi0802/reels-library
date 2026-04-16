// === Storage Helpers ===
function loadData(key, fallback) {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch { return fallback; }
}
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// === State ===
let reels = loadData('reels', []);
let categories = loadData('categories', [
  { id: 'motivation', name: 'Motivation', color: '#f59e0b' },
  { id: 'tutorial', name: 'Tutorial', color: '#10b981' },
  { id: 'funny', name: 'Funny', color: '#ec4899' },
  { id: 'tech', name: 'Tech', color: '#6366f1' },
]);
let activeCategory = 'all';
let searchQuery = '';

// === DOM Refs ===
const $ = (sel) => document.querySelector(sel);
const reelsGrid = $('#reelsGrid');
const emptyState = $('#emptyState');
const reelCountEl = $('#reelCount');
const categoryTabsEl = $('#categoryTabs');
const searchInput = $('#searchInput');

// Reel modal
const reelModal = $('#reelModal');
const reelForm = $('#reelForm');
const reelIdInput = $('#reelId');
const reelUrlInput = $('#reelUrl');
const reelTitleInput = $('#reelTitle');
const reelCategorySelect = $('#reelCategory');
const previewArea = $('#previewArea');
const modalTitle = $('#modalTitle');
const fetchPreviewBtn = $('#fetchPreviewBtn');

// Category modal
const categoryModal = $('#categoryModal');
const categoryListEl = $('#categoryList');
const newCategoryNameInput = $('#newCategoryName');
const newCategoryColorInput = $('#newCategoryColor');

// Detail modal
const detailModal = $('#detailModal');
const detailTitle = $('#detailTitle');
const detailBody = $('#detailBody');
const detailOpenLink = $('#detailOpenLink');

// === Utility ===
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function extractReelShortcode(url) {
  // Matches /reel/XXXXX or /reels/XXXXX or /p/XXXXX
  const match = url.match(/instagram\.com\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

function getEmbedUrl(url) {
  const shortcode = extractReelShortcode(url);
  if (shortcode) {
    return `https://www.instagram.com/reel/${shortcode}/embed/`;
  }
  return null;
}

function createEmbedIframe(url, width, height) {
  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) return null;
  return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" scrolling="no" allowtransparency="true" loading="lazy" style="border:none;overflow:hidden;border-radius:8px;"></iframe>`;
}

function getCategoryById(id) {
  return categories.find(c => c.id === id);
}

// === Render Functions ===
function renderCategoryTabs() {
  categoryTabsEl.innerHTML = `<button class="tab ${activeCategory === 'all' ? 'active' : ''}" data-category="all">All</button>`;
  categories.forEach(cat => {
    const count = reels.filter(r => r.categoryId === cat.id).length;
    categoryTabsEl.innerHTML += `<button class="tab ${activeCategory === cat.id ? 'active' : ''}" data-category="${cat.id}" style="${activeCategory === cat.id ? `background:${cat.color};border-color:${cat.color};` : ''}">${cat.name} <span style="opacity:0.7">(${count})</span></button>`;
  });

  // uncategorized count
  const uncatCount = reels.filter(r => !r.categoryId).length;
  if (uncatCount > 0) {
    categoryTabsEl.innerHTML += `<button class="tab ${activeCategory === 'uncategorized' ? 'active' : ''}" data-category="uncategorized">Uncategorized <span style="opacity:0.7">(${uncatCount})</span></button>`;
  }

  // Bind tab clicks
  categoryTabsEl.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeCategory = tab.dataset.category;
      renderCategoryTabs();
      renderReels();
    });
  });
}

function renderCategorySelect() {
  reelCategorySelect.innerHTML = '<option value="">Uncategorized</option>';
  categories.forEach(cat => {
    reelCategorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
  });
}

function getFilteredReels() {
  let filtered = [...reels];

  if (activeCategory === 'uncategorized') {
    filtered = filtered.filter(r => !r.categoryId);
  } else if (activeCategory !== 'all') {
    filtered = filtered.filter(r => r.categoryId === activeCategory);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.authorName && r.authorName.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      r.url.toLowerCase().includes(q)
    );
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return filtered;
}

function renderReels() {
  const filtered = getFilteredReels();

  // Update count
  reelCountEl.textContent = `${filtered.length} reel${filtered.length !== 1 ? 's' : ''}`;

  // Clear grid (keep empty state)
  reelsGrid.querySelectorAll('.reel-card').forEach(c => c.remove());

  if (filtered.length === 0) {
    emptyState.style.display = '';
    return;
  }
  emptyState.style.display = 'none';

  filtered.forEach(reel => {
    const card = document.createElement('div');
    card.className = 'reel-card';
    card.dataset.id = reel.id;

    const cat = getCategoryById(reel.categoryId);
    const catBadge = cat
      ? `<span class="reel-card-category" style="background:${cat.color}22;color:${cat.color}">${cat.name}</span>`
      : '<span class="reel-card-category" style="background:#88888822;color:#888">Uncategorized</span>';

    const embedIframe = createEmbedIframe(reel.url, '100%', '320');
    const thumbnail = embedIframe
      ? `<div class="embed-thumb">${embedIframe}<div class="embed-overlay"></div></div>`
      : `<div class="placeholder-thumb">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>No preview</span>
        </div>`;

    const title = reel.title || reel.authorName || 'Untitled Reel';

    card.innerHTML = `
      <div class="reel-card-thumbnail">${thumbnail}</div>
      <div class="reel-card-info">
        <div class="reel-card-title" title="${title}">${title}</div>
        <div class="reel-card-meta">
          ${catBadge}
          <span class="reel-card-date">${formatDate(reel.createdAt)}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openDetail(reel.id));
    reelsGrid.appendChild(card);
  });
}

// === Preview via Embed ===
function showEmbedPreview(url) {
  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) return false;
  previewArea.innerHTML = `<div class="preview-embed"><iframe src="${embedUrl}" width="100%" height="380" frameborder="0" scrolling="no" allowtransparency="true" style="border:none;overflow:hidden;border-radius:8px;"></iframe></div>`;
  return true;
}

// === Modal Helpers ===
function openModal(el) { el.classList.add('open'); }
function closeModal(el) { el.classList.remove('open'); }

// === Add / Edit Reel ===
function openAddReel() {
  modalTitle.textContent = 'Add Reel';
  reelForm.reset();
  reelIdInput.value = '';
  previewArea.innerHTML = '<div class="preview-placeholder">Paste a reel link and click "Fetch Preview"</div>';
  renderCategorySelect();
  openModal(reelModal);
  reelUrlInput.focus();
}

function openEditReel(id) {
  const reel = reels.find(r => r.id === id);
  if (!reel) return;

  modalTitle.textContent = 'Edit Reel';
  reelIdInput.value = reel.id;
  reelUrlInput.value = reel.url;
  reelTitleInput.value = reel.title || '';
  renderCategorySelect();
  reelCategorySelect.value = reel.categoryId || '';

  if (!showEmbedPreview(reel.url)) {
    previewArea.innerHTML = '<div class="preview-placeholder">No preview available</div>';
  }

  openModal(reelModal);
}


// === Detail Modal ===
function openDetail(id) {
  const reel = reels.find(r => r.id === id);
  if (!reel) return;

  detailTitle.textContent = reel.title || reel.authorName || 'Reel Details';
  detailOpenLink.href = reel.url;

  let html = '';
  const detailEmbed = createEmbedIframe(reel.url, '100%', '480');
  if (detailEmbed) {
    html += `<div class="detail-embed">${detailEmbed}</div>`;
  } else {
    html += `<div class="detail-no-preview">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <span>No preview available</span>
    </div>`;
  }

  if (reel.title) html += `<div class="detail-desc">${reel.title}</div>`;
  html += `<div class="detail-url">${reel.url}</div>`;

  const cat = getCategoryById(reel.categoryId);
  if (cat) {
    html += `<div class="detail-category-badge" style="background:${cat.color}22;color:${cat.color}">${cat.name}</div>`;
  }
  html += `<div class="detail-date">Saved on ${formatDate(reel.createdAt)}</div>`;

  detailBody.innerHTML = html;

  // Wire edit / delete buttons for this reel
  $('#detailEditBtn').onclick = () => {
    closeModal(detailModal);
    openEditReel(reel.id);
  };
  $('#detailDeleteBtn').onclick = () => {
    if (confirm('Delete this reel?')) {
      reels = reels.filter(r => r.id !== reel.id);
      saveData('reels', reels);
      closeModal(detailModal);
      renderReels();
      renderCategoryTabs();
    }
  };

  openModal(detailModal);
}

// === Category Management ===
function renderCategoryList() {
  categoryListEl.innerHTML = '';
  categories.forEach(cat => {
    const count = reels.filter(r => r.categoryId === cat.id).length;
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="cat-info">
        <span class="cat-color-dot" style="background:${cat.color}"></span>
        <span class="cat-name">${cat.name}</span>
        <span class="cat-count">(${count})</span>
      </div>
      <button class="cat-delete-btn" title="Delete category">&times;</button>
    `;
    li.querySelector('.cat-delete-btn').addEventListener('click', () => {
      if (confirm(`Delete "${cat.name}"? Reels in this category will become uncategorized.`)) {
        // Uncategorize reels
        reels.forEach(r => { if (r.categoryId === cat.id) r.categoryId = ''; });
        categories = categories.filter(c => c.id !== cat.id);
        saveData('categories', categories);
        saveData('reels', reels);
        if (activeCategory === cat.id) activeCategory = 'all';
        renderCategoryList();
        renderCategoryTabs();
        renderReels();
      }
    });
    categoryListEl.appendChild(li);
  });
}

// === Event Listeners ===

// Add reel buttons (desktop header + mobile FAB)
$('#addReelBtn').addEventListener('click', openAddReel);
$('#addReelFab').addEventListener('click', openAddReel);

// Fetch preview
fetchPreviewBtn.addEventListener('click', () => {
  const url = reelUrlInput.value.trim();
  if (!url) return;

  previewArea.innerHTML = '<div class="preview-loading">Loading preview...</div>';
  if (!showEmbedPreview(url)) {
    previewArea.innerHTML = '<div class="preview-error">Invalid Instagram reel URL. Check the link and try again.</div>';
  }
});

// Auto-fetch preview when pasting a URL
reelUrlInput.addEventListener('paste', () => {
  setTimeout(() => {
    const url = reelUrlInput.value.trim();
    if (url && url.includes('instagram.com')) {
      fetchPreviewBtn.click();
    }
  }, 100);
});

// Save reel
reelForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = reelIdInput.value;
  const url = reelUrlInput.value.trim();
  const title = reelTitleInput.value.trim();
  const categoryId = reelCategorySelect.value;
  if (id) {
    // Edit existing
    const reel = reels.find(r => r.id === id);
    if (reel) {
      reel.url = url;
      reel.title = title || reel.title;
      reel.categoryId = categoryId;
    }
  } else {
    // New reel
    reels.push({
      id: generateId(),
      url,
      title: title || '',
      categoryId,
      createdAt: new Date().toISOString(),
    });
  }

  saveData('reels', reels);
  closeModal(reelModal);
  renderReels();
  renderCategoryTabs();
});

// Cancel / close reel modal
$('#cancelReelBtn').addEventListener('click', () => closeModal(reelModal));
$('#closeReelModal').addEventListener('click', () => closeModal(reelModal));

// Manage categories button
$('#manageCategoriesBtn').addEventListener('click', () => {
  renderCategoryList();
  openModal(categoryModal);
  newCategoryNameInput.focus();
});

$('#closeCategoryModal').addEventListener('click', () => closeModal(categoryModal));

// Add category
$('#addCategoryBtn').addEventListener('click', () => {
  const name = newCategoryNameInput.value.trim();
  if (!name) return;

  const color = newCategoryColorInput.value;
  categories.push({
    id: generateId(),
    name,
    color,
  });

  saveData('categories', categories);
  newCategoryNameInput.value = '';
  renderCategoryList();
  renderCategoryTabs();
});

// Allow Enter key to add category
newCategoryNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#addCategoryBtn').click();
  }
});

// Close detail modal
$('#closeDetailModal').addEventListener('click', () => closeModal(detailModal));

// Close modals on overlay click
[reelModal, categoryModal, detailModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    [reelModal, categoryModal, detailModal].forEach(closeModal);
  }
});

// Search
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderReels();
});

// === Share Target Handling ===
// When shared from Instagram or another app, auto-open the add modal with the URL
function handleShareTarget() {
  const params = new URLSearchParams(window.location.search);
  const sharedUrl = params.get('url') || '';
  const sharedText = params.get('text') || '';
  const sharedTitle = params.get('title') || '';

  // Extract Instagram URL from any of the params
  let url = '';
  [sharedUrl, sharedText].forEach(val => {
    if (!url) {
      const match = val.match(/(https?:\/\/(?:www\.)?instagram\.com\/\S+)/i);
      if (match) url = match[1];
    }
  });

  if (url) {
    // Clean up the URL from the address bar
    window.history.replaceState({}, '', window.location.pathname);

    // Open add modal with pre-filled URL
    openAddReel();
    reelUrlInput.value = url;
    if (sharedTitle) reelTitleInput.value = sharedTitle;

    // Auto-trigger preview
    setTimeout(() => fetchPreviewBtn.click(), 300);
  }
}

// === Swipe-to-close modals on mobile ===
function enableSwipeToClose(modalOverlay) {
  const modal = modalOverlay.querySelector('.modal');
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  modal.addEventListener('touchstart', (e) => {
    // Only start drag from the top area (handle/header)
    if (modal.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    isDragging = true;
    modal.style.transition = 'none';
  }, { passive: true });

  modal.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      modal.style.transform = `translateY(${diff}px)`;
    }
  }, { passive: true });

  modal.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    modal.style.transition = '';
    const diff = currentY - startY;
    if (diff > 100) {
      closeModal(modalOverlay);
    }
    modal.style.transform = '';
    startY = 0;
    currentY = 0;
  });
}

// Enable swipe-to-close on all modals (mobile)
if ('ontouchstart' in window) {
  [reelModal, categoryModal, detailModal].forEach(enableSwipeToClose);
}

// === Initial Render ===
renderCategoryTabs();
renderReels();
handleShareTarget();
