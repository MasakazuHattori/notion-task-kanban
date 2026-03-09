import { stopTask, finishTask, answerTask, updateTask, registerOptimisticOverride } from './api.js';
import { getCategoryColor, getCategoryById } from './filters.js';
import { escapeHtml, hexToRgba, formatElapsedTime } from './utils.js';
import { openAnswerMemoModal } from './modal.js';
import {
  ASSIGNEE_COLORS, DATA_CHANGE_PHASES, INQUIRY_PHASES, REVIEW_PHASES,
  state, renderRegistry, findRunningTask, nextSeq, snapshotTask, restoreTask
} from './todayState.js';
import { renderDailyLogHtml, loadDailyLog, formatTimeHHMM } from './todayDailyLog.js';

export function renderRunningTask() {
  var section = document.getElementById('running-task-content');
  var running = findRunningTask();

  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
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

  var color = getCategoryColor(running.categoryRelation);
  var category = getCategoryById(running.categoryRelation);
  var catName = category?.name || '';
  var assigneeColor = ASSIGNEE_COLORS[running.assignee] || '#6b7280';

  // フェーズ表示
  var phaseHtml = '';
  var phaseProp = '';
  var phaseOptions = [];
  var phaseCurrent = '';
  if (running.status === '進行中') {
    if (running.assignee === 'レビュー') {
      phaseProp = 'phaseReview'; phaseOptions = REVIEW_PHASES; phaseCurrent = running.phaseReview || '';
    } else if (catName.includes('データ変更')) {
      phaseProp = 'phaseDataChange'; phaseOptions = DATA_CHANGE_PHASES; phaseCurrent = running.phaseDataChange || '';
    } else if (catName.includes('問合せ')) {
      phaseProp = 'phaseInquiry'; phaseOptions = INQUIRY_PHASES; phaseCurrent = running.phaseInquiry || '';
    }
    if (phaseProp) {
      var opts = phaseOptions.map(function(p) {
        return '<option value="' + p + '"' + (p === phaseCurrent ? ' selected' : '') + '>' + p + '</option>';
      }).join('');
      phaseHtml = '<select class="running-phase-select" id="running-phase-select" data-prop="' + phaseProp + '"><option value="">フェーズ未設定</option>' + opts + '</select>';
    }
  }

  var catSpan = catName
    ? '<span class="label" style="background:' + hexToRgba(color, 0.2) + ';color:' + color + '">' + escapeHtml(catName) + '</span>'
    : '';
  var assigneeSpan = running.assignee
    ? '<span class="label" style="background:' + hexToRgba(assigneeColor, 0.2) + ';color:' + assigneeColor + '">' + escapeHtml(running.assignee) + '</span>'
    : '';

  section.innerHTML =
    '<div class="running-columns">' +
      '<div class="running-info-panel">' +
        '<div class="running-memo-section">' +
          '<div class="running-section-label">📝 備考</div>' +
          '<textarea class="running-memo-textarea" id="running-memo-textarea" placeholder="メモを入力...">' + escapeHtml(running.memo || '') + '</textarea>' +
        '</div>' +
      '</div>' +
      '<div class="running-task-card" style="border-left:4px solid ' + color + ';background:' + hexToRgba(color, 0.05) + '">' +
        '<span class="running-task-title">' + escapeHtml(running.title) + '</span>' +
        '<div class="running-task-started">🕐 開始 ' + formatTimeHHMM(running.executionDate) + '</div>' +
        '<span class="running-task-timer" id="running-timer">' + formatElapsedTime(running.executionDate) + '</span>' +
        '<div class="running-progress-bar"><div class="running-progress-fill" id="running-progress"></div></div>' +
        '<div class="running-task-meta">' + catSpan + assigneeSpan + phaseHtml + '</div>' +
        '<div class="running-task-actions">' +
          '<button class="btn-stop" id="btn-stop-task">⏸ 中断</button>' +
          '<button class="btn-answer" id="btn-answer-task">💬 回答済</button>' +
          '<button class="btn-finish" id="btn-finish-task">✓ 終了</button>' +
          '<button class="btn-action-icon" id="btn-running-copy" title="URLコピー">🔗</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  // タイマー＆プログレスバー
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
  state.timerInterval = setInterval(updateTimerAndProgress, 1000);

  // 備考の自動保存（blur時）
  var memoTextarea = document.getElementById('running-memo-textarea');
  if (memoTextarea) {
    memoTextarea.addEventListener('blur', async function() {
      var newMemo = memoTextarea.value;
      if (newMemo !== (running.memo || '')) {
        try {
          await updateTask(running.id, { memo: newMemo });
          running.memo = newMemo;
        } catch (err) {
          console.error('メモ保存失敗:', err);
        }
      }
    });
  }

  // 中断ボタン
  document.getElementById('btn-stop-task').addEventListener('click', async function() {
    var taskRef = running;
    var mySeq = nextSeq();
    var saved = snapshotTask(taskRef);
    taskRef.executionDate = null;
    taskRef.executionDateEnd = null;
    // オーバーライド登録：APIデータで復活しないよう保護
    registerOptimisticOverride(taskRef.id, {
      executionDate: null,
      executionDateEnd: null
    });
    renderRunningTask();
    renderRegistry.renderTodayTaskList();
    try {
      await stopTask(taskRef.id, taskRef.title);
    } catch (err) {
      if (mySeq === state.operationSeq) {
        restoreTask(taskRef, saved);
        renderRunningTask();
        renderRegistry.renderTodayTaskList();
      }
      alert('中断に失敗しました: ' + err.message);
      return;
    }
    loadDailyLog();
    if (mySeq === state.operationSeq && state.refreshFn) state.refreshFn();
  });

  // 終了ボタン
  document.getElementById('btn-finish-task').addEventListener('click', async function() {
    var taskRef = running;
    var mySeq = nextSeq();
    var saved = snapshotTask(taskRef);
    taskRef.executionDate = null;
    taskRef.executionDateEnd = null;
    taskRef.status = '完了';
    // オーバーライド登録：完了状態をAPIデータで上書きしないよう保護
    registerOptimisticOverride(taskRef.id, {
      executionDate: null,
      executionDateEnd: null,
      status: '完了'
    });
    renderRunningTask();
    renderRegistry.renderTodayTaskList();
    try {
      await finishTask(taskRef.id, taskRef.title);
    } catch (err) {
      if (mySeq === state.operationSeq) {
        restoreTask(taskRef, saved);
        renderRunningTask();
        renderRegistry.renderTodayTaskList();
      }
      alert('終了に失敗しました: ' + err.message);
      return;
    }
    loadDailyLog();
    if (mySeq === state.operationSeq && state.refreshFn) state.refreshFn();
  });

  // 回答済ボタン
  document.getElementById('btn-answer-task').addEventListener('click', function() {
    openAnswerMemoModal(running, async function(newMemo) {
      var taskRef = running;
      var mySeq = nextSeq();
      var saved = snapshotTask(taskRef);
      taskRef.executionDate = null;
      taskRef.executionDateEnd = null;
      taskRef.status = '回答済';
      if (newMemo !== undefined) taskRef.memo = newMemo;
      // オーバーライド登録：回答済状態をAPIデータで上書きしないよう保護
      registerOptimisticOverride(taskRef.id, {
        executionDate: null,
        executionDateEnd: null,
        status: '回答済'
      });
      renderRunningTask();
      renderRegistry.renderTodayTaskList();
      try {
        await answerTask(taskRef.id, taskRef.title, newMemo);
      } catch (err) {
        if (mySeq === state.operationSeq) {
          restoreTask(taskRef, saved);
          renderRunningTask();
          renderRegistry.renderTodayTaskList();
        }
        alert('回答済処理に失敗しました: ' + err.message);
        return;
      }
      loadDailyLog();
      if (mySeq === state.operationSeq && state.refreshFn) state.refreshFn();
    });
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