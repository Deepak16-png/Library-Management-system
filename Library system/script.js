/* =========================================================
   ATHENAEUM — Library Management System
   Vanilla JS. No frameworks. All data in Local Storage.
   ========================================================= */

'use strict';

/* ---------------------------------------------------------
   1. STORAGE KEYS & DEFAULT DATA
--------------------------------------------------------- */
const STORAGE_KEYS = {
  BOOKS: 'athenaeum_books',
  CATEGORIES: 'athenaeum_categories',
  THEME: 'athenaeum_theme',
  FAVORITES: 'athenaeum_favorites'
};

const DEFAULT_CATEGORIES = [
  { id: 'cat_programming', name: 'Programming', color: '#2F5233' },
  { id: 'cat_science', name: 'Science', color: '#2E6E67' },
  { id: 'cat_fiction', name: 'Fiction', color: '#A6432B' },
  { id: 'cat_history', name: 'History', color: '#B08D57' },
  { id: 'cat_technology', name: 'Technology', color: '#3E5C9A' },
  { id: 'cat_biography', name: 'Biography', color: '#7A4FA0' },
  { id: 'cat_others', name: 'Others', color: '#78806F' }
];

const SWATCH_COLORS = ['#2F5233', '#2E6E67', '#A6432B', '#B08D57', '#3E5C9A', '#7A4FA0', '#78806F', '#C2554A'];

const PAGE_SIZE = 10;

/* ---------------------------------------------------------
   2. STATE
--------------------------------------------------------- */
let books = [];
let categories = [];
let favorites = [];
let currentPage = 1;
let editingBookId = null;
let editingCategoryId = null;
let deleteContext = null; // { type: 'book'|'category', id }
let coverDataPending = '';

/* ---------------------------------------------------------
   3. STORAGE HELPERS
--------------------------------------------------------- */
function loadFromStorage(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){
    console.error('Failed to parse storage key', key, e);
    return fallback;
  }
}

function saveToStorage(key, value){
  try{
    localStorage.setItem(key, JSON.stringify(value));
  }catch(e){
    console.error('Failed to save storage key', key, e);
    showToast('Could not save data — storage may be full.', 'error');
  }
}

function persistBooks(){ saveToStorage(STORAGE_KEYS.BOOKS, books); }
function persistCategories(){ saveToStorage(STORAGE_KEYS.CATEGORIES, categories); }
function persistFavorites(){ saveToStorage(STORAGE_KEYS.FAVORITES, favorites); }

function initData(){
  books = loadFromStorage(STORAGE_KEYS.BOOKS, []);
  categories = loadFromStorage(STORAGE_KEYS.CATEGORIES, null);
  if(!categories){
    categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    persistCategories();
  }
  favorites = loadFromStorage(STORAGE_KEYS.FAVORITES, []);
}

/* ---------------------------------------------------------
   4. UTILITIES
--------------------------------------------------------- */
function uid(prefix){
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str){
  if(str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatDate(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}

function categoryById(id){
  return categories.find(c => c.id === id);
}

function categoryColor(id){
  const c = categoryById(id);
  return c ? c.color : '#78806F';
}

function debounce(fn, delay){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function animateCounter(el, target){
  const duration = 700;
  const start = performance.now();
  const from = 0;
  function step(now){
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (target - from) * eased);
    if(progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

/* ---------------------------------------------------------
   5. TOASTS
--------------------------------------------------------- */
function showToast(message, type = 'success'){
  const container = document.getElementById('toastContainer');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.success}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

/* ---------------------------------------------------------
   6. CONFIRM DIALOG
--------------------------------------------------------- */
function openConfirm({ title, message, onConfirm }){
  const overlay = document.getElementById('confirmOverlay');
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  overlay.classList.add('open');
  const okBtn = document.getElementById('confirmOkBtn');
  const handler = () => {
    onConfirm();
    closeConfirm();
    okBtn.removeEventListener('click', handler);
  };
  okBtn.addEventListener('click', handler);
}
function closeConfirm(){
  document.getElementById('confirmOverlay').classList.remove('open');
}

/* ---------------------------------------------------------
   7. NAVIGATION
--------------------------------------------------------- */
function goToPage(pageName){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${pageName}`).classList.add('active');
  document.querySelectorAll('.shelf-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageName);
  });
  closeMobileNav();
  if(pageName === 'statistics') renderCharts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openMobileNav(){
  document.getElementById('shelfNav').classList.add('open');
  document.getElementById('navScrim').classList.add('show');
}
function closeMobileNav(){
  document.getElementById('shelfNav').classList.remove('open');
  document.getElementById('navScrim').classList.remove('show');
}

/* ---------------------------------------------------------
   8. THEME
--------------------------------------------------------- */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const icon = theme === 'dark' ? 'fa-sun' : 'fa-moon';
  const label = theme === 'dark' ? 'Light mode' : 'Dark mode';
  document.querySelectorAll('#themeToggle i, #mobileThemeBtn i, #settingsThemeToggle i').forEach(i => {
    i.className = `fa-solid ${icon}`;
  });
  const toggleSpan = document.querySelector('#themeToggle span');
  if(toggleSpan) toggleSpan.textContent = label;
  saveToStorage(STORAGE_KEYS.THEME, theme);
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ---------------------------------------------------------
   9. DASHBOARD RENDERING
--------------------------------------------------------- */
function renderDashboard(){
  const total = books.length;
  const available = books.filter(b => b.status === 'Available').length;
  const borrowed = books.filter(b => b.status === 'Borrowed').length;
  const catCount = categories.length;

  animateCounter(document.getElementById('statTotal'), total);
  animateCounter(document.getElementById('statAvailable'), available);
  animateCounter(document.getElementById('statBorrowed'), borrowed);
  animateCounter(document.getElementById('statCategories'), catCount);

  const recent = [...books].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  renderMiniList(document.getElementById('recentBooksList'), recent, 'No books added yet — add your first title to see it here.');

  const favBooks = books.filter(b => favorites.includes(b.id)).slice(0, 5);
  renderMiniList(document.getElementById('favoriteBooksList'), favBooks, 'Mark books as favorite to pin them here.');
}

function renderMiniList(container, list, emptyMsg){
  if(list.length === 0){
    container.innerHTML = `<p class="muted" style="padding:14px 0;">${escapeHtml(emptyMsg)}</p>`;
    return;
  }
  container.innerHTML = list.map(b => {
    const isFav = favorites.includes(b.id);
    const cover = b.cover
      ? `<img src="${b.cover}" alt="">`
      : `<i class="fa-solid fa-book"></i>`;
    return `
      <div class="mini-book-row">
        <div class="mini-cover" style="border-left-color:${categoryColor(b.category)}">${cover}</div>
        <div class="mini-book-info">
          <div class="mini-book-title">${escapeHtml(b.title)}</div>
          <div class="mini-book-sub">${escapeHtml(b.author)} · ${escapeHtml(b.year || '—')}</div>
        </div>
        <button class="fav-btn" data-fav-id="${b.id}" title="Toggle favorite">
          <i class="fa-solid fa-star" style="opacity:${isFav ? 1 : 0.25}"></i>
        </button>
      </div>`;
  }).join('');

  container.querySelectorAll('[data-fav-id]').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(btn.dataset.favId));
  });
}

function toggleFavorite(bookId){
  const idx = favorites.indexOf(bookId);
  if(idx === -1){ favorites.push(bookId); showToast('Added to favorites', 'success'); }
  else { favorites.splice(idx, 1); showToast('Removed from favorites', 'info'); }
  persistFavorites();
  renderDashboard();
}

/* ---------------------------------------------------------
   10. BOOKS: FILTER / SORT / PAGINATE / RENDER
--------------------------------------------------------- */
function getFilteredBooks(){
  const titleQ = document.getElementById('searchTitle').value.trim().toLowerCase();
  const authorQ = document.getElementById('searchAuthor').value.trim().toLowerCase();
  const catQ = document.getElementById('filterCategory').value;
  const statusQ = document.getElementById('filterStatus').value;
  const sortQ = document.getElementById('sortBy').value;

  let list = books.filter(b => {
    if(titleQ && !b.title.toLowerCase().includes(titleQ)) return false;
    if(authorQ && !b.author.toLowerCase().includes(authorQ)) return false;
    if(catQ && b.category !== catQ) return false;
    if(statusQ && b.status !== statusQ) return false;
    return true;
  });

  if(sortQ){
    const [field, dir] = sortQ.split('-');
    list.sort((a, b) => {
      let av, bv;
      if(field === 'title'){ av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
      else if(field === 'author'){ av = a.author.toLowerCase(); bv = b.author.toLowerCase(); }
      else if(field === 'year'){ av = Number(a.year) || 0; bv = Number(b.year) || 0; }
      if(av < bv) return dir === 'asc' ? -1 : 1;
      if(av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  } else {
    list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return list;
}

function renderBooksPage(){
  const filtered = getFilteredBooks();
  const emptyState = document.getElementById('booksEmptyState');
  const scrollWrap = document.getElementById('booksTableScroll');
  const pagination = document.getElementById('pagination');

  if(books.length === 0){
    emptyState.hidden = false;
    scrollWrap.style.display = 'none';
    pagination.innerHTML = '';
    return;
  }
  emptyState.hidden = true;
  scrollWrap.style.display = '';

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if(currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const tbody = document.getElementById('booksTableBody');

  if(pageItems.length === 0){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">
      <i class="fa-solid fa-magnifying-glass" style="margin-right:8px;"></i>No books match your filters.
    </td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map(rowTemplate).join('');
  }

  renderPagination(totalPages);
  attachRowHandlers();
}

function rowTemplate(b){
  const cat = categoryById(b.category);
  const catColor = cat ? cat.color : '#78806F';
  const catName = cat ? cat.name : 'Uncategorized';
  const coverCell = b.cover
    ? `<img class="table-cover" style="border-left-color:${catColor}" src="${b.cover}" alt="">`
    : `<div class="table-cover-fallback" style="border-left-color:${catColor}; background:${catColor}22; color:${catColor}"><i class="fa-solid fa-book"></i></div>`;
  const statusBadge = b.status === 'Available'
    ? `<span class="badge badge-available">Available</span>`
    : `<span class="badge badge-borrowed">Borrowed</span>`;
  const borrowIcon = b.status === 'Available' ? 'fa-hand-holding' : 'fa-rotate-left';
  const borrowTitle = b.status === 'Available' ? 'Borrow' : 'Return';

  return `
    <tr>
      <td>${coverCell}</td>
      <td>
        <div class="book-title-cell">${escapeHtml(b.title)}</div>
        <div class="book-isbn-cell">${escapeHtml(b.isbn)}</div>
      </td>
      <td>${escapeHtml(b.author)}</td>
      <td><span class="category-chip" style="--chip-color:${catColor}">${escapeHtml(catName)}</span></td>
      <td>${escapeHtml(b.year || '—')}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="row-actions">
          <button class="view-btn" data-id="${b.id}" title="View details"><i class="fa-solid fa-eye"></i></button>
          <button class="borrow-btn" data-id="${b.id}" title="${borrowTitle}"><i class="fa-solid ${borrowIcon}"></i></button>
          <button class="edit-btn" data-id="${b.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="del-btn" data-id="${b.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
}

function renderPagination(totalPages){
  const el = document.getElementById('pagination');
  if(totalPages <= 1){ el.innerHTML = ''; return; }
  let html = `<button ${currentPage === 1 ? 'disabled' : ''} data-page="prev"><i class="fa-solid fa-chevron-left"></i></button>`;
  for(let i = 1; i <= totalPages; i++){
    html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="next"><i class="fa-solid fa-chevron-right"></i></button>`;
  el.innerHTML = html;

  el.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.page;
      if(p === 'prev') currentPage--;
      else if(p === 'next') currentPage++;
      else currentPage = Number(p);
      renderBooksPage();
      document.getElementById('booksTableScroll').scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });
}

function attachRowHandlers(){
  document.querySelectorAll('#booksTableBody .view-btn').forEach(btn => {
    btn.addEventListener('click', () => openViewModal(btn.dataset.id));
  });
  document.querySelectorAll('#booksTableBody .edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openBookModal(btn.dataset.id));
  });
  document.querySelectorAll('#booksTableBody .del-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteBook(btn.dataset.id));
  });
  document.querySelectorAll('#booksTableBody .borrow-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleBorrowStatus(btn.dataset.id));
  });
}

/* ---------------------------------------------------------
   11. BORROW / RETURN
--------------------------------------------------------- */
function toggleBorrowStatus(id){
  const book = books.find(b => b.id === id);
  if(!book) return;
  if(book.status === 'Available'){
    book.status = 'Borrowed';
    book.borrowedDate = new Date().toISOString();
    book.returnedDate = null;
    showToast(`"${book.title}" marked as borrowed`, 'info');
  } else {
    book.status = 'Available';
    book.returnedDate = new Date().toISOString();
    showToast(`"${book.title}" returned — welcome back!`, 'success');
  }
  persistBooks();
  renderAll();
}

/* ---------------------------------------------------------
   12. BOOK MODAL (ADD / EDIT)
--------------------------------------------------------- */
function populateCategorySelects(){
  const filterSel = document.getElementById('filterCategory');
  const formSel = document.getElementById('fCategory');
  const currentFilter = filterSel.value;
  const currentForm = formSel.value;

  filterSel.innerHTML = '<option value="">All categories</option>' +
    categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  formSel.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  if(categories.some(c => c.id === currentFilter)) filterSel.value = currentFilter;
  if(categories.some(c => c.id === currentForm)) formSel.value = currentForm;
}

function openBookModal(id = null){
  editingBookId = id;
  const form = document.getElementById('bookForm');
  form.reset();
  clearFormErrors();
  coverDataPending = '';
  document.getElementById('fCoverPreview').hidden = true;
  document.getElementById('removeCoverBtn').hidden = true;
  populateCategorySelects();

  if(id){
    const b = books.find(x => x.id === id);
    if(!b) return;
    document.getElementById('bookModalTitle').textContent = 'Edit book';
    document.getElementById('fId').value = b.id;
    document.getElementById('fTitle').value = b.title;
    document.getElementById('fAuthor').value = b.author;
    document.getElementById('fCategory').value = b.category;
    document.getElementById('fISBN').value = b.isbn;
    document.getElementById('fPublisher').value = b.publisher || '';
    document.getElementById('fYear').value = b.year || '';
    document.getElementById('fLanguage').value = b.language || '';
    document.getElementById('fPages').value = b.pages || '';
    document.getElementById('fShelf').value = b.shelf || '';
    document.getElementById('fStatus').value = b.status;
    document.getElementById('fDescription').value = b.description || '';
    document.getElementById('fCoverData').value = b.cover || '';
    coverDataPending = b.cover || '';
    if(b.cover){
      const prev = document.getElementById('fCoverPreview');
      prev.src = b.cover; prev.hidden = false;
      document.getElementById('removeCoverBtn').hidden = false;
    }
  } else {
    document.getElementById('bookModalTitle').textContent = 'Add a book';
    document.getElementById('fId').value = '';
    document.getElementById('fStatus').value = 'Available';
    document.getElementById('fCoverData').value = '';
  }
  openModal('bookModalOverlay');
  setTimeout(() => document.getElementById('fTitle').focus(), 120);
}

function closeBookModal(){
  closeModal('bookModalOverlay');
  editingBookId = null;
}

function clearFormErrors(){
  document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
}

function validateBookForm(){
  clearFormErrors();
  let valid = true;
  const title = document.getElementById('fTitle').value.trim();
  const author = document.getElementById('fAuthor').value.trim();
  const category = document.getElementById('fCategory').value;
  const isbn = document.getElementById('fISBN').value.trim();
  const year = document.getElementById('fYear').value;

  if(!title){ setFieldError('fTitle', 'Title is required.'); valid = false; }
  if(!author){ setFieldError('fAuthor', 'Author is required.'); valid = false; }
  if(!category){ setFieldError('fCategory', 'Please choose a category.'); valid = false; }
  if(!isbn){ setFieldError('fISBN', 'ISBN is required.'); valid = false; }
  else if(!/^[0-9Xx\-\s]{5,20}$/.test(isbn)){ setFieldError('fISBN', 'Enter a valid ISBN.'); valid = false; }
  if(!year){ setFieldError('fYear', 'Published year is required.'); valid = false; }
  else if(year < 1000 || year > 2100){ setFieldError('fYear', 'Enter a realistic year.'); valid = false; }

  return valid;
}

function setFieldError(id, msg){
  const el = document.getElementById(`err-${id}`);
  if(el) el.textContent = msg;
}

function handleBookFormSubmit(e){
  e.preventDefault();
  if(!validateBookForm()) return;

  const id = document.getElementById('fId').value;
  const data = {
    title: document.getElementById('fTitle').value.trim(),
    author: document.getElementById('fAuthor').value.trim(),
    category: document.getElementById('fCategory').value,
    isbn: document.getElementById('fISBN').value.trim(),
    publisher: document.getElementById('fPublisher').value.trim(),
    year: document.getElementById('fYear').value,
    language: document.getElementById('fLanguage').value.trim(),
    pages: document.getElementById('fPages').value,
    shelf: document.getElementById('fShelf').value.trim(),
    status: document.getElementById('fStatus').value,
    description: document.getElementById('fDescription').value.trim(),
    cover: document.getElementById('fCoverData').value || ''
  };

  if(id){
    const book = books.find(b => b.id === id);
    const wasAvailable = book.status === 'Available';
    Object.assign(book, data);
    if(data.status === 'Borrowed' && wasAvailable) book.borrowedDate = new Date().toISOString();
    if(data.status === 'Available' && !wasAvailable) book.returnedDate = new Date().toISOString();
    showToast('Book updated successfully', 'success');
  } else {
    const newBook = {
      id: uid('book'),
      ...data,
      createdAt: new Date().toISOString(),
      borrowedDate: data.status === 'Borrowed' ? new Date().toISOString() : null,
      returnedDate: null
    };
    books.push(newBook);
    showToast('Book added successfully', 'success');
  }

  persistBooks();
  closeBookModal();
  renderAll();
}

function handleCoverFile(e){
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 2 * 1024 * 1024){
    showToast('Cover image should be under 2MB.', 'error');
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('fCoverData').value = reader.result;
    const prev = document.getElementById('fCoverPreview');
    prev.src = reader.result; prev.hidden = false;
    document.getElementById('removeCoverBtn').hidden = false;
  };
  reader.readAsDataURL(file);
}

function removeCover(){
  document.getElementById('fCoverData').value = '';
  document.getElementById('fCoverFile').value = '';
  document.getElementById('fCoverPreview').hidden = true;
  document.getElementById('removeCoverBtn').hidden = true;
}

/* ---------------------------------------------------------
   13. VIEW MODAL
--------------------------------------------------------- */
function openViewModal(id){
  const b = books.find(x => x.id === id);
  if(!b) return;
  const cat = categoryById(b.category);
  const catColor = cat ? cat.color : '#78806F';
  const cover = b.cover
    ? `<img class="view-cover" style="border-left-color:${catColor}" src="${b.cover}" alt="">`
    : `<div class="view-cover-fallback" style="border-left-color:${catColor}; background:${catColor}22; color:${catColor}"><i class="fa-solid fa-book"></i></div>`;
  const statusBadge = b.status === 'Available'
    ? `<span class="badge badge-available">Available</span>`
    : `<span class="badge badge-borrowed">Borrowed</span>`;

  document.getElementById('viewModalBody').innerHTML = `
    <div class="view-detail">
      ${cover}
      <div class="view-info">
        <h3>${escapeHtml(b.title)}</h3>
        <div class="view-author">by ${escapeHtml(b.author)}</div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="category-chip" style="--chip-color:${catColor}">${escapeHtml(cat ? cat.name : 'Uncategorized')}</span>
          ${statusBadge}
        </div>
        <div class="view-meta">
          <div><span>ISBN</span>${escapeHtml(b.isbn)}</div>
          <div><span>Publisher</span>${escapeHtml(b.publisher || '—')}</div>
          <div><span>Published year</span>${escapeHtml(b.year || '—')}</div>
          <div><span>Language</span>${escapeHtml(b.language || '—')}</div>
          <div><span>Pages</span>${escapeHtml(b.pages || '—')}</div>
          <div><span>Shelf number</span>${escapeHtml(b.shelf || '—')}</div>
        </div>
        ${b.description ? `<p class="view-desc">${escapeHtml(b.description)}</p>` : ''}
        <div class="view-dates">
          <span><i class="fa-solid fa-arrow-right-from-bracket"></i> Borrowed: ${formatDate(b.borrowedDate)}</span>
          <span><i class="fa-solid fa-arrow-right-to-bracket"></i> Returned: ${formatDate(b.returnedDate)}</span>
        </div>
      </div>
    </div>`;
  openModal('viewModalOverlay');
}

/* ---------------------------------------------------------
   14. DELETE BOOK
--------------------------------------------------------- */
function confirmDeleteBook(id){
  const b = books.find(x => x.id === id);
  if(!b) return;
  openConfirm({
    title: 'Delete this book?',
    message: `"${b.title}" will be permanently removed from the library.`,
    onConfirm: () => {
      books = books.filter(x => x.id !== id);
      favorites = favorites.filter(fid => fid !== id);
      persistBooks();
      persistFavorites();
      showToast('Book deleted', 'success');
      renderAll();
    }
  });
}

/* ---------------------------------------------------------
   15. CATEGORIES
--------------------------------------------------------- */
function renderCategories(){
  const grid = document.getElementById('categoryGrid');
  if(categories.length === 0){
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-illustration"><i class="fa-solid fa-tags"></i></div>
      <h3>No categories yet</h3>
      <p>Create a category to start organizing the shelves.</p>
    </div>`;
    return;
  }
  grid.innerHTML = categories.map(c => {
    const count = books.filter(b => b.category === c.id).length;
    return `
      <div class="category-card" style="--cat-color:${c.color}">
        <div class="category-card-top">
          <span class="category-name">${escapeHtml(c.name)}</span>
          <i class="fa-solid fa-layer-group" style="color:${c.color}"></i>
        </div>
        <span class="category-count">${count} book${count === 1 ? '' : 's'}</span>
        <div class="category-actions">
          <button data-edit-cat="${c.id}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button data-del-cat="${c.id}"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-edit-cat]').forEach(btn => {
    btn.addEventListener('click', () => openCategoryModal(btn.dataset.editCat));
  });
  grid.querySelectorAll('[data-del-cat]').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteCategory(btn.dataset.delCat));
  });
}

function renderSwatches(selectedColor){
  const row = document.getElementById('colorSwatches');
  row.innerHTML = SWATCH_COLORS.map(color => {
    const isSelected = color.toLowerCase() === (selectedColor || '').toLowerCase();
    return `<div class="swatch ${isSelected ? 'selected' : ''}" style="background:${color}" data-color="${color}"></div>`;
  }).join('');
  row.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      row.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      document.getElementById('fCatColor').value = sw.dataset.color;
    });
  });
}

function openCategoryModal(id = null){
  editingCategoryId = id;
  const form = document.getElementById('categoryForm');
  form.reset();
  clearFormErrors();

  if(id){
    const c = categoryById(id);
    document.getElementById('categoryModalTitle').textContent = 'Edit category';
    document.getElementById('fCatId').value = c.id;
    document.getElementById('fCatName').value = c.name;
    document.getElementById('fCatColor').value = c.color;
    renderSwatches(c.color);
  } else {
    document.getElementById('categoryModalTitle').textContent = 'Add category';
    document.getElementById('fCatId').value = '';
    document.getElementById('fCatColor').value = SWATCH_COLORS[0];
    renderSwatches(SWATCH_COLORS[0]);
  }
  openModal('categoryModalOverlay');
  setTimeout(() => document.getElementById('fCatName').focus(), 120);
}

function closeCategoryModal(){
  closeModal('categoryModalOverlay');
  editingCategoryId = null;
}

function handleCategoryFormSubmit(e){
  e.preventDefault();
  clearFormErrors();
  const name = document.getElementById('fCatName').value.trim();
  const color = document.getElementById('fCatColor').value;
  const id = document.getElementById('fCatId').value;

  if(!name){ setFieldError('fCatName', 'Category name is required.'); return; }
  const dup = categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id);
  if(dup){ setFieldError('fCatName', 'A category with this name already exists.'); return; }

  if(id){
    const cat = categoryById(id);
    cat.name = name; cat.color = color;
    showToast('Category updated', 'success');
  } else {
    categories.push({ id: uid('cat'), name, color });
    showToast('Category added', 'success');
  }
  persistCategories();
  closeCategoryModal();
  renderAll();
}

function confirmDeleteCategory(id){
  const c = categoryById(id);
  if(!c) return;
  const count = books.filter(b => b.category === id).length;
  openConfirm({
    title: 'Delete this category?',
    message: count > 0
      ? `${count} book${count === 1 ? '' : 's'} currently use "${c.name}". They will be moved to Uncategorized.`
      : `"${c.name}" will be permanently removed.`,
    onConfirm: () => {
      categories = categories.filter(x => x.id !== id);
      books.forEach(b => { if(b.category === id) b.category = ''; });
      persistCategories();
      persistBooks();
      showToast('Category deleted', 'success');
      renderAll();
    }
  });
}

/* ---------------------------------------------------------
   16. STATISTICS / CHARTS
--------------------------------------------------------- */
let pieChartInstance = null;
let barChartInstance = null;

function renderCharts(){
  renderPieChart();
  renderBarChart();
  renderStatsRecent();
}

function getThemeColors(){
  const styles = getComputedStyle(document.documentElement);
  return {
    ink: styles.getPropertyValue('--ink').trim(),
    border: styles.getPropertyValue('--border').trim(),
    surface: styles.getPropertyValue('--surface').trim()
  };
}

function renderPieChart(){
  const ctx = document.getElementById('categoryPieChart');
  const labels = categories.map(c => c.name);
  const data = categories.map(c => books.filter(b => b.category === c.id).length);
  const colors = categories.map(c => c.color);
  const theme = getThemeColors();

  if(pieChartInstance) pieChartInstance.destroy();
  pieChartInstance = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: theme.surface, borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: theme.ink, font: { family: 'Inter' }, padding: 14 } } }
    }
  });
}

function renderBarChart(){
  const ctx = document.getElementById('statusBarChart');
  const available = books.filter(b => b.status === 'Available').length;
  const borrowed = books.filter(b => b.status === 'Borrowed').length;
  const theme = getThemeColors();

  if(barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Available', 'Borrowed'],
      datasets: [{ data: [available, borrowed], backgroundColor: ['#2F5233', '#A6432B'], borderRadius: 8, maxBarThickness: 70 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: theme.ink, font: { family: 'Inter' } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: theme.ink, precision: 0 }, grid: { color: theme.border } }
      }
    }
  });
}

function renderStatsRecent(){
  const recent = [...books].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  renderMiniList(document.getElementById('statsRecentList'), recent, 'No books added yet.');
}

/* ---------------------------------------------------------
   17. IMPORT / EXPORT / REPORT / PRINT
--------------------------------------------------------- */
function exportData(){
  const payload = { books, categories, exportedAt: new Date().toISOString() };
  downloadFile('athenaeum-library-export.json', JSON.stringify(payload, null, 2), 'application/json');
  showToast('Library data exported', 'success');
}

function downloadFile(filename, content, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function handleImportFile(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if(!Array.isArray(data.books) || !Array.isArray(data.categories)){
        throw new Error('Invalid file structure');
      }
      openConfirm({
        title: 'Import library data?',
        message: `This will add ${data.books.length} book(s) and ${data.categories.length} categor(y/ies) to your current library.`,
        onConfirm: () => {
          const existingCatNames = new Set(categories.map(c => c.name.toLowerCase()));
          const idMap = {};
          data.categories.forEach(c => {
            if(!existingCatNames.has(c.name.toLowerCase())){
              const newId = uid('cat');
              idMap[c.id] = newId;
              categories.push({ id: newId, name: c.name, color: c.color || '#78806F' });
            } else {
              const match = categories.find(cc => cc.name.toLowerCase() === c.name.toLowerCase());
              idMap[c.id] = match.id;
            }
          });
          data.books.forEach(b => {
            books.push({
              ...b,
              id: uid('book'),
              category: idMap[b.category] || '',
              createdAt: b.createdAt || new Date().toISOString()
            });
          });
          persistBooks();
          persistCategories();
          showToast('Library data imported successfully', 'success');
          renderAll();
        }
      });
    }catch(err){
      showToast('Could not import file — please check the format.', 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

function downloadReport(){
  const total = books.length;
  const available = books.filter(b => b.status === 'Available').length;
  const borrowed = total - available;
  const lines = [
    'ATHENAEUM LIBRARY REPORT',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    `Total books: ${total}`,
    `Available: ${available}`,
    `Borrowed: ${borrowed}`,
    `Categories: ${categories.length}`,
    '',
    'BOOKS PER CATEGORY',
    ...categories.map(c => `  ${c.name}: ${books.filter(b => b.category === c.id).length}`),
    '',
    'FULL BOOK LIST',
    ...books.map(b => `  [${b.status}] "${b.title}" by ${b.author} (${b.year || 'n/a'}) — ISBN ${b.isbn}`)
  ];
  downloadFile('athenaeum-library-report.txt', lines.join('\n'), 'text/plain');
  showToast('Report downloaded', 'success');
}

function printBooksList(){
  window.print();
}

/* ---------------------------------------------------------
   18. RESET DATA
--------------------------------------------------------- */
function resetAllData(){
  openConfirm({
    title: 'Reset all library data?',
    message: 'All books and categories stored in this browser will be permanently erased. This cannot be undone.',
    onConfirm: () => {
      localStorage.removeItem(STORAGE_KEYS.BOOKS);
      localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
      localStorage.removeItem(STORAGE_KEYS.FAVORITES);
      initData();
      showToast('All data has been reset', 'success');
      renderAll();
      goToPage('dashboard');
    }
  });
}

/* ---------------------------------------------------------
   19. MODAL HELPERS
--------------------------------------------------------- */
function openModal(id){
  document.getElementById(id).classList.add('open');
}
function closeModal(id){
  document.getElementById(id).classList.remove('open');
}
function closeAllModals(){
  document.querySelectorAll('.modal-overlay').forEach(o => o.classList.remove('open'));
}

/* ---------------------------------------------------------
   20. MASTER RENDER
--------------------------------------------------------- */
function renderAll(){
  populateCategorySelects();
  renderDashboard();
  renderBooksPage();
  renderCategories();
  if(document.getElementById('page-statistics').classList.contains('active')) renderCharts();
}

/* ---------------------------------------------------------
   21. EVENT WIRING
--------------------------------------------------------- */
function wireEvents(){
  // Navigation
  document.querySelectorAll('.shelf-link').forEach(btn => {
    btn.addEventListener('click', () => goToPage(btn.dataset.page));
  });
  document.getElementById('mobileMenuBtn').addEventListener('click', openMobileNav);
  document.getElementById('navScrim').addEventListener('click', closeMobileNav);

  // Theme
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('mobileThemeBtn').addEventListener('click', toggleTheme);
  document.getElementById('settingsThemeToggle').addEventListener('click', toggleTheme);

  // Add book buttons
  ['dashAddBookBtn', 'addBookBtn', 'emptyAddBookBtn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => openBookModal());
  });
  document.getElementById('closeBookModal').addEventListener('click', closeBookModal);
  document.getElementById('cancelBookBtn').addEventListener('click', closeBookModal);
  document.getElementById('bookForm').addEventListener('submit', handleBookFormSubmit);
  document.getElementById('fCoverFile').addEventListener('change', handleCoverFile);
  document.getElementById('removeCoverBtn').addEventListener('click', removeCover);

  // View modal
  document.getElementById('closeViewModal').addEventListener('click', () => closeModal('viewModalOverlay'));

  // Category modal
  document.getElementById('addCategoryBtn').addEventListener('click', () => openCategoryModal());
  document.getElementById('closeCategoryModal').addEventListener('click', closeCategoryModal);
  document.getElementById('cancelCategoryBtn').addEventListener('click', closeCategoryModal);
  document.getElementById('categoryForm').addEventListener('submit', handleCategoryFormSubmit);

  // Confirm dialog
  document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirm);

  // Overlay click to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if(e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Search & filters
  const rerender = debounce(() => { currentPage = 1; renderBooksPage(); }, 200);
  document.getElementById('searchTitle').addEventListener('input', rerender);
  document.getElementById('searchAuthor').addEventListener('input', rerender);
  document.getElementById('filterCategory').addEventListener('change', () => { currentPage = 1; renderBooksPage(); });
  document.getElementById('filterStatus').addEventListener('change', () => { currentPage = 1; renderBooksPage(); });
  document.getElementById('sortBy').addEventListener('change', () => { currentPage = 1; renderBooksPage(); });

  // Import / export / print
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('printBtn').addEventListener('click', printBooksList);
  document.getElementById('importFile').addEventListener('change', handleImportFile);

  // Settings
  document.getElementById('settingsExportBtn').addEventListener('click', exportData);
  document.getElementById('settingsImportBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('settingsReportBtn').addEventListener('click', downloadReport);
  document.getElementById('settingsResetBtn').addEventListener('click', resetAllData);

  // Scroll to top
  const scrollBtn = document.getElementById('scrollTopBtn');
  window.addEventListener('scroll', () => {
    scrollBtn.classList.toggle('show', window.scrollY > 300);
  });
  scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';

    if(e.key === 'Escape'){
      closeAllModals();
      closeConfirm();
      closeMobileNav();
      return;
    }
    if(isTyping) return;

    if(e.key === '/'){
      e.preventDefault();
      goToPage('books');
      document.getElementById('searchTitle').focus();
    } else if(e.key.toLowerCase() === 'n'){
      e.preventDefault();
      openBookModal();
    } else if(e.altKey && e.key.toLowerCase() === 't'){
      e.preventDefault();
      toggleTheme();
    }
  });
}

/* ---------------------------------------------------------
   22. INIT
--------------------------------------------------------- */
function init(){
  initData();
  const savedTheme = loadFromStorage(STORAGE_KEYS.THEME, null) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);
  wireEvents();
  renderAll();

  setTimeout(() => {
    document.getElementById('loadingOverlay').classList.add('hidden');
  }, 400);
}

document.addEventListener('DOMContentLoaded', init);