import { fetchTasks } from './api.js';
import { initFilters, setFilterChangeHandler } from './filters.js';
import { renderKanban, setTasks, setRefreshFn } from './kanban.js';
import { openAddModal, setRefreshCallback } from './modal.js';

async function loadAndRender() {
  const board = document.getElementById('kanban-board');
  try {
    board.classList.add('loading');
    const { tasks } = await fetchTasks();
    setTasks(tasks);
    renderKanban();
  } catch (err) {
    console.error('Failed to load tasks:', err);
    board.innerHTML = `<div class="error">タスクの読み込みに失敗しました: ${err.message}</div>`;
  } finally {
    board.classList.remove('loading');
  }
}

async function init() {
  await initFilters();
  setFilterChangeHandler(() => renderKanban());
  setRefreshCallback(loadAndRender);
  setRefreshFn(loadAndRender);
  document.getElementById('btn-add').addEventListener('click', openAddModal);
  await loadAndRender();
}

document.addEventListener('DOMContentLoaded', init);