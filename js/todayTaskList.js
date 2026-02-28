import { stopTask, startTask, postponeTask, updateTask } from './api.js';
import { getCategoryColor, getCategoryById } from './filters.js';
import {
  formatDateWithDay, escapeHtml, hexToRgba,
  isTodayOrBefore, isRunningTask
} from './utils.js';
import { buildStartParams } from './kanban.js';
import { openAddModal } from './modal.js';
import {
  ASSIGNEE_COLORS, DATA_CHANGE_PHASES, INQUIRY_PHASES, REVIEW_PHASES,
  state, renderRegistry, findRunningTask, nextSeq, snapshotTask, restoreTask
} from './todayState.js';
import { loadDailyLog } from './todayDailyLog.js';

export function renderTodayTaskList() {
  var body = document.getElementById('today-task-body');
  var countEl = document.getElementById('today-task-count');

  var filtered = state.allTasks.filter(function(t) {
    return isTodayOrBefore(t.scheduledDate) &&
      (t.status === '未着手' || t.status === '進行中') &&
      !isRunningTask(t);
  }).sort(function(a, b) {
    var assigneeOrder = { '主担当': 0, 'レビュー': 1 };
    var ao = assigneeOrder[a.assignee] !== undefined ? assigneeOrder[a.assignee] : 2;
    var bo = assigneeOrder[b.assignee] !== undefined ? assigneeOrder[b.assignee] : 2;
    if (ao !== bo) return ao - bo;
    var aCat = (getCategoryById(a.categoryRelation)?.name || '');
    var bCat = (getCategoryById(b.categoryRelation)?.name || '');
    if (aCat !== bCat) return aCat.localeCompare(bCat, 'ja');
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

  // ＋追加ボタン
  var addBtn = document.getElementById('btn-add-today');
  if (addBtn) {
    addBtn.onclick = function() {
      var today = new Date();
      var yyyy = today.getFullYear();
      var mm = String(today.getMonth() + 1).padStart(2, '0');
      var dd = String(today.getDate()).padStart(2, '0');
      openAddModal({ scheduledDate: yyyy + '-' + mm + '-' + dd });
    };
  }

  if (filtered.length === 0) {
    body.innerHTML =
      '<div class="today-task-empty">' +
        '<span class="empty-icon">🎉</span>' +
        '<span class="empty-text">本日のタスクはすべて完了！</span>' +
        '<span class="empty-hint">お疲れさまでした</span>' +
      '</div>';
    return;
  }

  var rows = filtered.map(function(task) {
    var color = getCategoryColor(task.categoryRelation);
    var category = getCategoryById(task.categoryRelation);
    var catName = category?.name || '';
    var assigneeColor = ASSIGNEE_COLORS[task.assignee] || '#6b7280';

    var catCell = catName
      ? '<span class="label" style="background:' + hexToRgba(color, 0.2) + ';color:' + color + '">' + escapeHtml(catName) + '</span>'
      : '';
    var dueCell = task.dueDate ? formatDateWithDay(task.dueDate) : '';
    var statusCell = task.status
      ? '<span class="label label-status label-status-' + (task.status === '未着手' ? 'todo' : 'progress') + '">' + escapeHtml(task.status) + '</span>'
      : '';
    var assigneeCell = task.assignee
      ? '<span class="label" style="background:' + hexToRgba(assigneeColor, 0.2) + ';color:' + assigneeColor + '">' + escapeHtml(task.assignee) + '</span>'
      : '';

    // フェーズ判定
    var phaseProp = '';
    var phaseOptions = [];
    var phaseCurrent = '';
    if (task.assignee === 'レビュー') {
      phaseProp = 'phaseReview'; phaseOptions = REVIEW_PHASES; phaseCurrent = task.phaseReview || '';
    } else if (catName.includes('データ変更')) {
      phaseProp = 'phaseDataChange'; phaseOptions = DATA_CHANGE_PHASES; phaseCurrent = task.phaseDataChange || '';
    } else if (catName.includes('問合せ')) {
      phaseProp = 'phaseInquiry'; phaseOptions = INQUIRY_PHASES; phaseCurrent = task.phaseInquiry || '';
    }
    var phaseCell = '';
    if (phaseProp) {
      var phaseOpts = phaseOptions.map(function(p) {
        return '<option value="' + p + '"' + (p === phaseCurrent ? ' selected' : '') + '>' + p + '</option>';
      }).join('');
      phaseCell = '<select class="tt-phase-select" data-task-id="' + task.id + '" data-prop="' + phaseProp + '"><option value="">未設定</option>' + phaseOpts + '</select>';
    }

    // ツールチップ
    var memo = task.memo || '';
    var phase = phaseCurrent;
    var tooltipLines = [
      memo ? '📝 ' + escapeHtml(memo) : '',
      phase ? '📌 ' + escapeHtml(phase) : '',
      task.scheduledDate ? '📅 ' + formatDateWithDay(task.scheduledDate) : ''
    ].filter(Boolean);
    var tooltipHtml = tooltipLines.length > 0
      ? '<div class="today-task-tooltip">' + tooltipLines.join('<br>') + '</div>'
      : '';

    return '<tr class="today-task-row" data-task-id="' + task.id + '">' +
      '<td class="tt-cell-title" style="border-left:3px solid ' + color + '">' + escapeHtml(task.title) + tooltipHtml + '</td>' +
      '<td class="tt-cell-cat">' + catCell + '</td>' +
      '<td class="tt-cell-due">' + dueCell + '</td>' +
      '<td class="tt-cell-status">' + statusCell + '</td>' +
      '<td class="tt-cell-assignee">' + assigneeCell + '</td>' +
      '<td class="tt-cell-phase">' + phaseCell + '</td>' +
      '<td class="tt-cell-actions">' +
        '<button class="btn-start" data-action="start" title="開始">▶</button>' +
        '<button class="btn-postpone" data-action="postpone" title="延期">⏭</button>' +
        '<button class="btn-action-icon" data-action="copy-url" title="URLコピー">🔗</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  body.innerHTML =
    '<table class="today-task-table">' +
      '<thead><tr>' +
        '<th class="tt-th-title">タスク名</th>' +
        '<th class="tt-th-cat">カテゴリ</th>' +
        '<th class="tt-th-due">期限</th>' +
        '<th class="tt-th-status">ステータス</th>' +
        '<th class="tt-th-assignee">担当</th>' +
        '<th class="tt-th-phase">フェーズ</th>' +
        '<th class="tt-th-actions"></th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';

  // イベント委譲
  body.querySelectorAll('tr.today-task-row').forEach(function(row) {
    var taskId = row.dataset.taskId;
    var task = filtered.find(function(t) { return t.id === taskId; });
    if (!task) return;

    // タスク名クリック → Notionページをポップアップで開く
    row.querySelector('.tt-cell-title').addEventListener('click', function(e) {
      e.stopPropagation();
      var base = 'https:/' + '/www.notion.so/';
      var pageId = task.id.replace(/-/g, '');
      window.open(base + pageId, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
    });

    row.querySelector('[data-action="start"]').addEventListener('click', async function(e) {
      e.stopPropagation();
      var mySeq = nextSeq();
      var currentRunning = findRunningTask();
      var savedRunning = currentRunning ? snapshotTask(currentRunning) : null;
      var savedTask = snapshotTask(task);
      if (currentRunning) {
        currentRunning.executionDate = null;
        currentRunning.executionDateEnd = null;
      }
      task.executionDate = new Date().toISOString();
      task.executionDateEnd = null;
      renderRegistry.renderRunningTask();
      renderTodayTaskList();
      try {
        if (currentRunning) {
          await stopTask(currentRunning.id, currentRunning.title);
        }
        var params = buildStartParams(task);
        var result = await startTask(task.id, params.statusUpdate, params.phaseUpdate);
        if (result.startedAt) {
          task.executionDate = result.startedAt;
          renderRegistry.renderRunningTask();
        }
      } catch (err) {
        if (mySeq === state.operationSeq) {
          if (savedRunning && currentRunning) restoreTask(currentRunning, savedRunning);
          restoreTask(task, savedTask);
          renderRegistry.renderRunningTask();
          renderTodayTaskList();
        }
        alert('開始に失敗しました: ' + err.message);
        return;
      }
      loadDailyLog();
      if (mySeq === state.operationSeq && state.refreshFn) state.refreshFn();
    });

    row.querySelector('[data-action="postpone"]').addEventListener('click', async function(e) {
      e.stopPropagation();
      var mySeq = nextSeq();
      var savedDate = task.scheduledDate;
      var tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      task.scheduledDate = tomorrow.toISOString().split('T')[0];
      renderTodayTaskList();
      try {
        await postponeTask(task.id);
      } catch (err) {
        if (mySeq === state.operationSeq) {
          task.scheduledDate = savedDate;
          renderTodayTaskList();
        }
        alert('延期に失敗しました: ' + err.message);
        return;
      }
      if (mySeq === state.operationSeq && state.refreshFn) state.refreshFn();
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

    // フェーズ変更
    var phaseSelect = row.querySelector('.tt-phase-select');
    if (phaseSelect) {
      phaseSelect.addEventListener('click', function(e) { e.stopPropagation(); });
      phaseSelect.addEventListener('change', async function(e) {
        var prop = phaseSelect.dataset.prop;
        try {
          await updateTask(task.id, { [prop]: e.target.value });
          task[prop] = e.target.value;
        } catch (err) {
          alert('フェーズ更新に失敗しました: ' + err.message);
        }
      });
    }
  });
}