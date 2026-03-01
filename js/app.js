import { fetchTasks, getTasksCache, setTasksCache, invalidateTasksCache } from './api.js';
import { initFilters, setFilterChangeHandler } from './filters.js';
import { renderKanban, setTasks, setRefreshFn } from './kanban.js';
import { openAddModal, setRefreshCallback } from './modal.js';
import { initTabs, setTabChangeHandler, getCurrentTab } from './tabs.js';
import { setTodayTasks, setTodayRefreshFn, renderTodayView, cleanupTimer, findRunningTask } from './todayView.js';
import { isRunningTask } from './utils.js';

let isFirstLoad = true;

// 取得したタスクに楽観的更新の保護を適用
function applyOptimisticProtection(tasks) {
  if (isFirstLoad) return; // 初回はAPIデータをそのまま信頼

  const prevRunning = findRunningTask();
  if (prevRunning && prevRunning.executionDate) {
    const match = tasks.find(t => t.id === prevRunning.id);
    if (match && isRunningTask(match)) {
      match.executionDate = prevRunning.executionDate;
    }
  } else {
    tasks.forEach(t => {
      if (isRunningTask(t)) {
        t.executionDate = null;
        t.executionDateEnd = null;
      }
    });
  }
}

// タスクをセットして現在のタブを描画
function setAndRender(tasks) {
  setTasks(tasks);
  setTodayTasks(tasks);

  const tab = getCurrentTab();
  if (tab === 'kanban') {
    renderKanban();
  } else {
    renderTodayView();
  }
}

// === #1: SWR対応のloadAndRender ===
async function loadAndRender() {
  const board = document.getElementById('kanban-board');

  // ① メモリキャッシュがあれば即描画
  const cached = getTasksCache();
  if (cached) {
    console.log('⚡ キャッシュから即描画');
    setAndRender(cached);
    // バックグラウンドで最新を再取得
    backgroundRefresh();
    return;
  }

  // ② キャッシュなし → API取得（ローディング表示）
  try {
    board.classList.add('loading');
    const { tasks } = await fetchTasks();
    applyOptimisticProtection(tasks);
    isFirstLoad = false;
    setTasksCache(tasks);
    setAndRender(tasks);
  } catch (err) {
    console.error('Failed to load tasks:', err);
    board.innerHTML = `<div class="error">タスクの読み込みに失敗しました: ${err.message}</div>`;
  } finally {
    board.classList.remove('loading');
  }
}

// バックグラウンド再取得（UIをブロックしない）
function backgroundRefresh() {
  fetchTasks()
    .then(({ tasks }) => {
      applyOptimisticProtection(tasks);
      isFirstLoad = false;
      setTasksCache(tasks);
      setAndRender(tasks);
    })
    .catch(err => {
      console.warn('バックグラウンド再取得失敗（キャッシュを継続表示）:', err.message);
    });
}

async function init() {
  initTabs();
  setTabChangeHandler((tab) => {
    if (tab === 'kanban') {
      cleanupTimer();
      renderKanban();
    } else {
      renderTodayView();
    }
  });

  setRefreshCallback(loadAndRender);
  setRefreshFn(loadAndRender);
  setTodayRefreshFn(loadAndRender);
  document.getElementById('btn-add').addEventListener('click', openAddModal);

  // カテゴリ＋タスクを並列取得（初回ロード高速化）
  const board = document.getElementById('kanban-board');
  try {
    board.classList.add('loading');
    const [_, tasksData] = await Promise.all([
      initFilters(),
      fetchTasks()
    ]);
    setFilterChangeHandler(() => renderKanban());

    const { tasks } = tasksData;
    isFirstLoad = false;
    setTasksCache(tasks);
    setAndRender(tasks);
  } catch (err) {
    console.error('Failed to initialize:', err);
    board.innerHTML = `<div class="error">初期化に失敗しました: ${err.message}</div>`;
  } finally {
    board.classList.remove('loading');
  }
}

document.addEventListener('DOMContentLoaded', init);

// 他PCとの同期用：60秒ごとに最新データを取得
setInterval(() => {
  loadAndRender();
}, 60 * 1000);