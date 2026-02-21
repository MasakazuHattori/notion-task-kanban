import { fetchCategories } from './api.js';

const CACHE_KEY = 'kanban_categories';
const CACHE_TTL = 30 * 60 * 1000; // 30分

let allCategories = [];
let currentFilters = { assignee: '', parentCategory: '', includeToday: false };
let onFilterChange = null;
let listenersAttached = false;

export function getFilters() {
  return { ...currentFilters };
}

export function setFilterChangeHandler(handler) {
  onFilterChange = handler;
}

// --- localStorage キャッシュ ---
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCache(categories) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: categories }));
  } catch { /* quota error等は無視 */ }
}

// --- セレクトボックス構築 ---
function buildCategorySelect() {
  const parentCats = [...new Set(allCategories.map(c => c.parentCategory).filter(Boolean))];
  const catSelect = document.getElementById('filter-category');
  const current = catSelect.value;
  catSelect.innerHTML = '<option value="">カテゴリ：すべて</option>';
  parentCats.sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catSelect.appendChild(opt);
  });
  if (current) catSelect.value = current;
}

export async function initFilters() {
  // キャッシュから即時ロード
  const cached = loadCache();
  if (cached) {
    allCategories = cached;
    buildCategorySelect();
  }

  // APIから最新データを取得
  try {
    const { categories } = await fetchCategories();
    allCategories = categories;
    saveCache(categories);
    buildCategorySelect();
  } catch (err) {
    if (!cached) throw err;
    console.warn('API error, using cached categories:', err.message);
  }

  // イベントリスナー（1回のみ）
  if (!listenersAttached) {
    document.getElementById('filter-assignee').addEventListener('change', e => {
      currentFilters.assignee = e.target.value;
      onFilterChange?.();
    });

    document.getElementById('filter-category').addEventListener('change', e => {
      currentFilters.parentCategory = e.target.value;
      onFilterChange?.();
    });

    document.getElementById('filter-today').addEventListener('change', e => {
      currentFilters.includeToday = e.target.checked;
      onFilterChange?.();
    });

    listenersAttached = true;
  }

  return allCategories;
}

export function getCategories() {
  return allCategories;
}

export function getCategoryById(id) {
  return allCategories.find(c => c.id === id) || null;
}

export function getCategoryColor(categoryId) {
  const cat = getCategoryById(categoryId);
  return cat?.colorCode || '#6b7280';
}

export function getParentCategory(categoryId) {
  const cat = getCategoryById(categoryId);
  return cat?.parentCategory || '';
}