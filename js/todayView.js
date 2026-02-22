import { stopTask, finishTask, postponeTask, startTask } from './api.js';
import { getCategoryColor, getCategoryById } from './filters.js';
import {
  formatDateWithDay, escapeHtml, hexToRgba,
  isTodayOrBefore, isRunningTask, formatElapsedTime
} from './utils.js';
import { buildStartParams } from './kanban.js';

const ASSIGNEE_COLORS = {
  '主担当': '#2383e2',
  'レビュー': '#9065b0'
};

let allTasks = [];
let refreshFn = null;
let timerInterval = null;
let operationSeq = 0;

export function setTodayTasks(tasks) {
  allTasks = tasks;
}

export function setTodayRefreshFn(fn) {
  refreshFn = fn;
}

/**
 * 実行中タスクを検索して返す（最大1件）
 */
export function findRunningTask() {
  return allTasks.find(t => isRunningTask(t)) || null;
}

/**
 * 実行中タスクセクションを描画
 */
export function renderRunningTask() {
  const section = document.getElementById('running-task');
  const running = findRunningTask();

  // タイマー停止
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (!running) {
    section.innerHTML = `
      <div class="running-task-empty">
        <span class="empty-icon">☕</span>
        <span class="empty-text">タスクを開始しましょう</span>
        <span class="empty-hint">当日タスク一覧の ▶ ボタンから開始できます</span>
      </div>
    `;
    return;
  }

  const color = getCategoryColor(running.categoryRelation);
  const category = getCategoryById(running.categoryRelation);
  const catName = category?.name || '';
  const assigneeColor = ASSIGNEE_COLORS[running.assignee] || '#6b7280';

  // フェーズ表示
  let phaseHtml = '';
  if (running.status === '進行中') {
    if (running.assignee === 'レビュー' && running.phaseReview) {
      phaseHtml = `<span class="label" style="background:${hexToRgba('#9065b0', 0.2)};color:#9065b0">${escapeHtml(running.phaseReview)}</span>`;
    } else if (catName.includes('データ変更') && running.phaseDataChange) {
      phaseHtml = `<span class="label" style="background:${hexToRgba(color, 0.2)};color:${color}">${escapeHtml(running.phaseDataChange)}</span>`;
    } else if (catName.includes('問合せ') && running.phaseInquiry) {
      phaseHtml = `<span class="label" style="background:${hexToRgba(color, 0.2)};color:${color}">${escapeHtml(running.phaseInquiry)}</span>`;
    }
  }

  section.innerHTML = `
    <div class="running-task-card" style="border-left:4px solid ${color};background:${hexToRgba(color, 0.05)}">
      <span class="running-task-title">${escapeHtml(running.title)}</span>
      <span class="running-task-timer" id="running-timer">${formatElapsedTime(running.executionDate)}</span>
      <div class="running-task-meta">
        ${catName ? `<span class="label" style="background:${hexToRgba(color, 0.2)};color:${color}">${escapeHtml(catName)}</span>` : ''}
        ${running.assignee ? `<span class="label" style="background:${hexToRgba(assigneeColor, 0.2)};color:${assigneeColor}">${escapeHtml(running.assignee)}</span>` : ''}
        ${phaseHtml}
      </div>
      <div class="running-task-actions">
        <button class="btn-stop" id="btn-stop-task">⏸ 中断</button>
        <button class="btn-finish" id="btn-finish-task">✓ 終了</button>
        <button class="btn-action-icon" id="btn-running-copy" title="URLコピー">🔗</button>
      </div>
    </div>
  `;

  // タイマー更新（毎秒）
  timerInterval = setInterval(() => {
    const timerEl = document.getElementById('running-timer');
    if (timerEl) {
      timerEl.textContent = formatElapsedTime(running.executionDate);
    }
  }, 1000);

  // 中断ボタン（楽観的UI + 競合防止）
  document.getElementById('btn-stop-task').addEventListener('click', async () => {
    const taskRef = running;
    const mySeq = ++operationSeq;

    // 即座にUI更新：実行中タスクをクリア
    taskRef.executionDate = null;
    taskRef.executionDateEnd = null;
    renderRunningTask();
    renderTodayTaskList();

    // バックグラウンドでAPI実行
    try {
      await stopTask(taskRef.id, taskRef.title);
    } catch (err) {
      alert('中断に失敗しました: ' + err.message);
    }
    if (mySeq === operationSeq) refreshFn?.();
  });

  // 終了ボタン（楽観的UI + 競合防止）
  document.getElementById('btn-finish-task').addEventListener('click', async () => {
    const taskRef = running;
    const mySeq = ++operationSeq;

    // 即座にUI更新：タスクを完了扱い
    taskRef.executionDate = null;
    taskRef.executionDateEnd = null;
    taskRef.status = '完了';
    renderRunningTask();
    renderTodayTaskList();

    // バックグラウンドでAPI実行
    try {
      await finishTask(taskRef.id, taskRef.title);
    } catch (err) {
      alert('終了に失敗しました: ' + err.message);
    }
    if (mySeq === operationSeq) refreshFn?.();
  });

  // URLコピーボタン
  document.getElementById('btn-running-copy').addEventListener('click', () => {
    if (running.url) {
      navigator.clipboard.writeText(running.url).then(() => {
        const btn = document.getElementById('btn-running-copy');
        btn.textContent = '✅';
        setTimeout(() => { btn.textContent = '🔗'; }, 1500);
      }).catch(() => alert('コピーに失敗しました'));
    } else {
      alert('URLが設定されていません');
    }
  });
}

/**
 * 当日タスク一覧を描画
 * 条件：実施予定が当日以前 & STS=未着手 or 進行中
 */
export function renderTodayTaskList() {
  const body = document.getElementById('today-task-body');
  const countEl = document.getElementById('today-task-count');

  const filtered = allTasks.filter(t =>
    isTodayOrBefore(t.scheduledDate) &&
    (t.status === '未着手' || t.status === '進行中') &&
    !isRunningTask(t)
  ).sort((a, b) => {
    const da = a.dueDate || '';
    const db = b.dueDate || '';
    if (da && !db) return -1;
    if (!da && db) return 1;
    if (da !== db) return da.localeCompare(db);
    return (a.title || '').localeCompare(b.title || '', 'ja');
  });

  countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    body.innerHTML = `
      <div class="today-task-empty">
        <span class="empty-icon">🎉</span>
        <span class="empty-text">本日のタスクはすべて完了！</span>
        <span class="empty-hint">お疲れさまでした</span>
      </div>
    `;
    return;
  }

  body.innerHTML = filtered.map(task => {
    const color = getCategoryColor(task.categoryRelation);
    const category = getCategoryById(task.categoryRelation);
    const catName = category?.name || '';
    const assigneeColor = ASSIGNEE_COLORS[task.assignee] || '#6b7280';

    const catLabel = catName
      ? `<span class="label" style="background:${hexToRgba(color, 0.2)};color:${color}">${escapeHtml(catName)}</span>`
      : '';
    const assigneeLabel = task.assignee
      ? `<span class="label" style="background:${hexToRgba(assigneeColor, 0.2)};color:${assigneeColor}">${escapeHtml(task.assignee)}</span>`
      : '';

    return `
      <div class="today-task-row" data-task-id="${task.id}" style="border-left:3px solid ${color}">
        <span class="today-task-title">${escapeHtml(task.title)}</span>
        <span class="today-task-due">${formatDateWithDay(task.dueDate) || ''}</span>
        <span class="today-task-labels">${catLabel}${assigneeLabel}</span>
        <span class="today-task-actions">
          <button class="btn-start" data-action="start" title="開始">▶</button>
          <button class="btn-postpone" data-action="postpone" title="延期">⏭</button>
          <button class="btn-action-icon" data-action="copy-url" title="URLコピー">🔗</button>
        </span>
      </div>
    `;
  }).join('');

  // イベント委譲
  body.querySelectorAll('.today-task-row').forEach(row => {
    const taskId = row.dataset.taskId;
    const task = filtered.find(t => t.id === taskId);
    if (!task) return;

    // 開始ボタン（楽観的UI + 競合防止）
    row.querySelector('[data-action="start"]').addEventListener('click', async (e) => {
      e.stopPropagation();
      const mySeq = ++operationSeq;

      // 即座にUI更新：実行中タスクを切替
      const currentRunning = findRunningTask();
      if (currentRunning) {
        currentRunning.executionDate = null;
        currentRunning.executionDateEnd = null;
      }
      task.executionDate = new Date().toISOString();
      task.executionDateEnd = null;
      renderRunningTask();
      renderTodayTaskList();

      // バックグラウンドでAPI実行
      try {
        if (currentRunning) {
          await stopTask(currentRunning.id, currentRunning.title);
        }
        const { statusUpdate, phaseUpdate } = buildStartParams(task);
        const result = await startTask(task.id, statusUpdate, phaseUpdate);
        // APIが返した正確な開始時刻でタイマー起点を補正
        if (result.startedAt) {
          task.executionDate = result.startedAt;
          renderRunningTask();
        }
      } catch (err) {
        alert('開始に失敗しました: ' + err.message);
      }
      if (mySeq === operationSeq) refreshFn?.();
    });

    // 延期ボタン（楽観的UI + 競合防止）
    row.querySelector('[data-action="postpone"]').addEventListener('click', async (e) => {
      e.stopPropagation();
      const mySeq = ++operationSeq;

      // 即座にUI更新：翌日扱いでリストから消す
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      task.scheduledDate = tomorrow.toISOString().split('T')[0];
      renderTodayTaskList();

      // バックグラウンドでAPI実行
      try {
        await postponeTask(task.id);
      } catch (err) {
        alert('延期に失敗しました: ' + err.message);
      }
      if (mySeq === operationSeq) refreshFn?.();
    });

    row.querySelector('[data-action="copy-url"]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (task.url) {
        navigator.clipboard.writeText(task.url).then(() => {
          const btn = e.currentTarget;
          btn.textContent = '✅';
          setTimeout(() => { btn.textContent = '🔗'; }, 1500);
        }).catch(() => alert('コピーに失敗しました'));
      } else {
        alert('URLが設定されていません');
      }
    });
  });
}

/**
 * 当日ビュー全体を描画
 */
export function renderTodayView() {
  renderRunningTask();
  renderTodayTaskList();
}

/**
 * タイマーをクリーンアップ
 */
export function cleanupTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}