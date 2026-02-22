import { stopTask, finishTask, postponeTask, startTask, updateTask } from './api.js';
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

const DATA_CHANGE_PHASES = ['SQL作成', 'レビュー依頼（SQL）', 'SQLレビューOK', 'レビュー依頼（本番反映）', 'お客様へ回答'];
const INQUIRY_PHASES = ['調査中', 'レビュー依頼', '回答可能', '回答済'];
const REVIEW_PHASES = ['レビュー依頼待ち', 'レビュー可能', 'レビュー中'];

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

export function findRunningTask() {
  return allTasks.find(t => isRunningTask(t)) || null;
}

export function renderRunningTask() {
  const section = document.getElementById('running-task');
  const running = findRunningTask();

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (!running) {
    section.innerHTML =
      '<div class="running-task-empty">' +
        '<span class="empty-icon">☕</span>' +
        '<span class="empty-text">タスクを開始しましょう</span>' +
        '<span class="empty-hint">当日タスク一覧の ▶ ボタンから開始できます</span>' +
      '</div>';
    return;
  }

  const color = getCategoryColor(running.categoryRelation);
  const category = getCategoryById(running.categoryRelation);
  const catName = category?.name || '';
  const assigneeColor = ASSIGNEE_COLORS[running.assignee] || '#6b7280';

  // フェーズ表示（セレクトボックスで直接変更可能）
  let phaseHtml = '';
  let phaseProp = '';
  let phaseOptions = [];
  let phaseCurrent = '';
  if (running.status === '進行中') {
    if (running.assignee === 'レビュー') {
      phaseProp = 'phaseReview';
      phaseOptions = REVIEW_PHASES;
      phaseCurrent = running.phaseReview || '';
    } else if (catName.includes('データ変更')) {
      phaseProp = 'phaseDataChange';
      phaseOptions = DATA_CHANGE_PHASES;
      phaseCurrent = running.phaseDataChange || '';
    } else if (catName.includes('問合せ')) {
      phaseProp = 'phaseInquiry';
      phaseOptions = INQUIRY_PHASES;
      phaseCurrent = running.phaseInquiry || '';
    }
    if (phaseProp) {
      const opts = phaseOptions.map(function(p) {
        return '<option value="' + p + '"' + (p === phaseCurrent ? ' selected' : '') + '>' + p + '</option>';
      }).join('');
      phaseHtml = '<select class="running-phase-select" id="running-phase-select" data-prop="' + phaseProp + '"><option value="">フェーズ未設定</option>' + opts + '</select>';
    }
  }

  const catSpan = catName
    ? '<span class="label" style="background:' + hexToRgba(color, 0.2) + ';color:' + color + '">' + escapeHtml(catName) + '</span>'
    : '';
  const assigneeSpan = running.assignee
    ? '<span class="label" style="background:' + hexToRgba(assigneeColor, 0.2) + ';color:' + assigneeColor + '">' + escapeHtml(running.assignee) + '</span>'
    : '';

  section.innerHTML =
    '<div class="running-task-card" style="border-left:4px solid ' + color + ';background:' + hexToRgba(color, 0.05) + '">' +
      '<span class="running-task-title">' + escapeHtml(running.title) + '</span>' +
      '<span class="running-task-timer" id="running-timer">' + formatElapsedTime(running.executionDate) + '</span>' +
      '<div class="running-progress-bar"><div class="running-progress-fill" id="running-progress"></div></div>' +
      '<div class="running-task-meta">' + catSpan + assigneeSpan + phaseHtml + '</div>' +
      '<div class="running-task-actions">' +
        '<button class="btn-stop" id="btn-stop-task">⏸ 中断</button>' +
        '<button class="btn-finish" id="btn-finish-task">✓ 終了</button>' +
        '<button class="btn-action-icon" id="btn-running-copy" title="URLコピー">🔗</button>' +
      '</div>' +
    '</div>';

  // タイマー＆プログレスバー更新（毎秒）
  var updateTimerAndProgress = function() {
    var timerEl = document.getElementById('running-timer');
    var progressEl = document.getElementById('running-progress');
    if (timerEl) timerEl.textContent = formatElapsedTime(running.executionDate);
    if (progressEl && running.executionDate) {
      var elapsed = Date.now() - new Date(running.executionDate).getTime();
      var pct = Math.min((elapsed / 3600000) * 100, 100);
      progressEl.style.width = pct + '%';
    }
  };
  updateTimerAndProgress();
  timerInterval = setInterval(updateTimerAndProgress, 1000);

  // 中断ボタン
  document.getElementById('btn-stop-task').addEventListener('click', async function() {
    var taskRef = running;
    var mySeq = ++operationSeq;
    taskRef.executionDate = null;
    taskRef.executionDateEnd = null;
    renderRunningTask();
    renderTodayTaskList();
    try {
      await stopTask(taskRef.id, taskRef.title);
    } catch (err) {
      alert('中断に失敗しました: ' + err.message);
    }
    if (mySeq === operationSeq) refreshFn?.();
  });

  // 終了ボタン
  document.getElementById('btn-finish-task').addEventListener('click', async function() {
    var taskRef = running;
    var mySeq = ++operationSeq;
    taskRef.executionDate = null;
    taskRef.executionDateEnd = null;
    taskRef.status = '完了';
    renderRunningTask();
    renderTodayTaskList();
    try {
      await finishTask(taskRef.id, taskRef.title);
    } catch (err) {
      alert('終了に失敗しました: ' + err.message);
    }
    if (mySeq === operationSeq) refreshFn?.();
  });

  // URLコピーボタン
  document.getElementById('btn-running-copy').addEventListener('click', function() {
    if (running.url) {
      navigator.clipboard.writeText(running.url).then(function() {
        var btn = document.getElementById('btn-running-copy');
        btn.textContent = '✅';
        setTimeout(function() { btn.textContent = '🔗'; }, 1500);
      }).catch(function() { alert('コピーに失敗しました'); });
    } else {
      alert('URLが設定されていません');
    }
  });

  // フェーズ変更
  var phaseSelectEl = document.getElementById('running-phase-select');
  if (phaseSelectEl) {
    phaseSelectEl.addEventListener('change', async function(e) {
      var prop = phaseSelectEl.dataset.prop;
      try {
        await updateTask(running.id, { [prop]: e.target.value });
        running[prop] = e.target.value;
      } catch (err) {
        alert('フェーズ更新に失敗しました: ' + err.message);
      }
    });
  }
}

export function renderTodayTaskList() {
  var body = document.getElementById('today-task-body');
  var countEl = document.getElementById('today-task-count');

  var filtered = allTasks.filter(function(t) {
    return isTodayOrBefore(t.scheduledDate) &&
      (t.status === '未着手' || t.status === '進行中') &&
      !isRunningTask(t);
  }).sort(function(a, b) {
    // 担当順（主担当→レビュー→その他）
    var assigneeOrder = { '主担当': 0, 'レビュー': 1 };
    var ao = assigneeOrder[a.assignee] !== undefined ? assigneeOrder[a.assignee] : 2;
    var bo = assigneeOrder[b.assignee] !== undefined ? assigneeOrder[b.assignee] : 2;
    if (ao !== bo) return ao - bo;
    // カテゴリ名昇順
    var aCat = (getCategoryById(a.categoryRelation)?.name || '');
    var bCat = (getCategoryById(b.categoryRelation)?.name || '');
    if (aCat !== bCat) return aCat.localeCompare(bCat, 'ja');
    // タスク名昇順
    return (a.title || '').localeCompare(b.title || '', 'ja');
  });

  countEl.textContent = filtered.length;

  // サマリーバッジ
  var badgesEl = document.getElementById('today-summary-badges');
  if (!badgesEl) {
    badgesEl = document.createElement('span');
    badgesEl.id = 'today-summary-badges';
    badgesEl.className = 'summary-badges';
    countEl.parentElement.appendChild(badgesEl);
  }
  var todoCount = filtered.filter(function(t) { return t.status === '未着手'; }).length;
  var inProgressCount = filtered.filter(function(t) { return t.status === '進行中'; }).length;
  badgesEl.innerHTML = filtered.length > 0
    ? '<span class="summary-badge badge-todo">未着手 ' + todoCount + '</span><span class="summary-badge badge-progress">進行中 ' + inProgressCount + '</span>'
    : '';

  if (filtered.length === 0) {
    body.innerHTML =
      '<div class="today-task-empty">' +
        '<span class="empty-icon">🎉</span>' +
        '<span class="empty-text">本日のタスクはすべて完了！</span>' +
        '<span class="empty-hint">お疲れさまでした</span>' +
      '</div>';
    return;
  }

  body.innerHTML = filtered.map(function(task) {
    var color = getCategoryColor(task.categoryRelation);
    var category = getCategoryById(task.categoryRelation);
    var catName = category?.name || '';
    var assigneeColor = ASSIGNEE_COLORS[task.assignee] || '#6b7280';

    var catLabel = catName
      ? '<span class="label" style="background:' + hexToRgba(color, 0.2) + ';color:' + color + '">' + escapeHtml(catName) + '</span>'
      : '';
    var assigneeLabel = task.assignee
      ? '<span class="label" style="background:' + hexToRgba(assigneeColor, 0.2) + ';color:' + assigneeColor + '">' + escapeHtml(task.assignee) + '</span>'
      : '';

    // ツールチップ用情報
    var memo = task.memo || '';
    var phase = '';
    if (task.assignee === 'レビュー' && task.phaseReview) phase = task.phaseReview;
    else if (catName.includes('データ変更') && task.phaseDataChange) phase = task.phaseDataChange;
    else if (catName.includes('問合せ') && task.phaseInquiry) phase = task.phaseInquiry;

    var tooltipLines = [
      memo ? '📝 ' + escapeHtml(memo) : '',
      phase ? '📌 ' + escapeHtml(phase) : '',
      task.scheduledDate ? '📅 ' + formatDateWithDay(task.scheduledDate) : ''
    ].filter(Boolean);
    var tooltipHtml = tooltipLines.length > 0
      ? '<div class="today-task-tooltip">' + tooltipLines.join('<br>') + '</div>'
      : '';

    var statusLabel = task.status
      ? '<span class="label label-status label-status-' + (task.status === '未着手' ? 'todo' : 'progress') + '">' + escapeHtml(task.status) + '</span>'
      : '';
    var dueLabel = task.dueDate
      ? '<span class="today-task-due">' + formatDateWithDay(task.dueDate) + '</span>'
      : '';
    return '<div class="today-task-row" data-task-id="' + task.id + '" style="border-left:3px solid ' + color + '">' +
      '<span class="today-task-title">' + escapeHtml(task.title) + '</span>' +
      '<span class="today-task-labels">' + catLabel + statusLabel + assigneeLabel + dueLabel + '</span>' +
      '<span class="today-task-actions">' +
        '<button class="btn-start" data-action="start" title="開始">▶</button>' +
        '<button class="btn-postpone" data-action="postpone" title="延期">⏭</button>' +
        '<button class="btn-action-icon" data-action="copy-url" title="URLコピー">🔗</button>' +
      '</span>' +
      tooltipHtml +
    '</div>';
  }).join('');

  // イベント委譲
  body.querySelectorAll('.today-task-row').forEach(function(row) {
    var taskId = row.dataset.taskId;
    var task = filtered.find(function(t) { return t.id === taskId; });
    if (!task) return;

    // 開始ボタン
    row.querySelector('[data-action="start"]').addEventListener('click', async function(e) {
      e.stopPropagation();
      var mySeq = ++operationSeq;
      var currentRunning = findRunningTask();
      if (currentRunning) {
        currentRunning.executionDate = null;
        currentRunning.executionDateEnd = null;
      }
      task.executionDate = new Date().toISOString();
      task.executionDateEnd = null;
      renderRunningTask();
      renderTodayTaskList();
      try {
        if (currentRunning) {
          await stopTask(currentRunning.id, currentRunning.title);
        }
        var params = buildStartParams(task);
        var result = await startTask(task.id, params.statusUpdate, params.phaseUpdate);
        if (result.startedAt) {
          task.executionDate = result.startedAt;
          renderRunningTask();
        }
      } catch (err) {
        alert('開始に失敗しました: ' + err.message);
      }
      if (mySeq === operationSeq && refreshFn) refreshFn();
    });

    // 延期ボタン
    row.querySelector('[data-action="postpone"]').addEventListener('click', async function(e) {
      e.stopPropagation();
      var mySeq = ++operationSeq;
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      task.scheduledDate = tomorrow.toISOString().split('T')[0];
      renderTodayTaskList();
      try {
        await postponeTask(task.id);
      } catch (err) {
        alert('延期に失敗しました: ' + err.message);
      }
      if (mySeq === operationSeq && refreshFn) refreshFn();
    });

    row.querySelector('[data-action="copy-url"]').addEventListener('click', function(e) {
      e.stopPropagation();
      if (task.url) {
        navigator.clipboard.writeText(task.url).then(function() {
          var btn = e.currentTarget;
          btn.textContent = '✅';
          setTimeout(function() { btn.textContent = '🔗'; }, 1500);
        }).catch(function() { alert('コピーに失敗しました'); });
      } else {
        alert('URLが設定されていません');
      }
    });
  });
}

export function renderTodayView() {
  renderRunningTask();
  renderTodayTaskList();
}

export function cleanupTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}