import { fetchTasks } from './api.js';
import { initFilters, setFilterChangeHandler } from './filters.js';
import { renderKanban, setTasks, setRefreshFn } from './kanban.js';
import { openAddModal, setRefreshCallback } from './modal.js';
import { initTabs, setTabChangeHandler, getCurrentTab } from './tabs.js';
import { setTodayTasks, setTodayRefreshFn, renderTodayView, cleanupTimer } from './todayView.js';

async function loadAndRender() {
  const board = document.getElementById('kanban-board');
  try {
    board.classList.add('loading');
    const { tasks } = await fetchTasks();

    // カンバン側にデータセット
    setTasks(tasks);

    // 当日ビュー側にもデータセット
    setTodayTasks(tasks);

    // 現在のタブに応じて描画
    const tab = getCurrentTab();
    if (tab === 'kanban') {
      renderKanban();
    } else {
      renderTodayView();
    }
  } catch (err) {
    console.error('Failed to load tasks:', err);
    board.innerHTML = `<div class="error">タスクの読み込みに失敗しました: ${err.message}</div>`;
  } finally {
    board.classList.remove('loading');
  }
}

async function init() {
  // タブ初期化
  initTabs();
  setTabChangeHandler((tab) => {
    if (tab === 'kanban') {
      cleanupTimer();
      renderKanban();
    } else {
      renderTodayView();
    }
  });

  // フィルタ初期化
  await initFilters();
  setFilterChangeHandler(() => renderKanban());

  // コールバック設定
  setRefreshCallback(loadAndRender);
  setRefreshFn(loadAndRender);
  setTodayRefreshFn(loadAndRender);

  // 追加ボタン
  document.getElementById('btn-add').addEventListener('click', openAddModal);

  // 初回読み込み
  await loadAndRender();
}

document.addEventListener('DOMContentLoaded', init);