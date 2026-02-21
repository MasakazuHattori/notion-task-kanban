import { fetchCategories } from './api.js';

let allCategories = [];
let currentFilters = { assignee: '', parentCategory: '', includeToday: false };
let onFilterChange = null;

export function getFilters() {
  return { ...currentFilters };
}

export function setFilterChangeHandler(handler) {
  onFilterChange = handler;
}

export async function initFilters() {
  const { categories } = await fetchCategories();
  allCategories = categories;

  // 親カテゴリのセレクトボックスを構築
  const parentCats = [...new Set(categories.map(c => c.parentCategory).filter(Boolean))];
  const catSelect = document.getElementById('filter-category');
  catSelect.innerHTML = '<option value="">カテゴリ：すべて</option>';
  parentCats.sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catSelect.appendChild(opt);
  });

  // イベントリスナー
  document.getElementById('filter-assignee').addEventListener('change', e => {
    currentFilters.assignee = e.target.value;
    onFilterChange?.();
  });

  catSelect.addEventListener('change', e => {
    currentFilters.parentCategory = e.target.value;
    onFilterChange?.();
  });

  document.getElementById('filter-today').addEventListener('change', e => {
    currentFilters.includeToday = e.target.checked;
    onFilterChange?.();
  });

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