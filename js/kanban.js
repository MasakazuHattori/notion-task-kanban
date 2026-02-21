import { updateTask } from './api.js';
import { createTaskCard } from './taskCard.js';
import { getFilters, getCategoryById } from './filters.js';
import { isToday, isTodayOrBefore, getTodayISO } from './utils.js';

const STATUSES = ['劣後', '未着手', '進行中', '回答済', '完了'];
const STATUS_DISPLAY = { '劣後': '待機・劣後' };

let allTasks = [];
let refreshFn = null;
let columnsInitialized = false;
const columnBodies = {};
const columnCounts = {};
const cardCache = {}; // taskId -> { sig, element }

export function setTasks(tasks) {
  allTasks = tasks;
}

export function setRefreshFn(fn) {
  refreshFn = fn;
}

// ソート：期限昇順（未設定は末尾）→タスク名昇順
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const da = a.dueDate || '';
    const db = b.dueDate || '';
    if (da && !db) return -1;
    if (!da && db) return 1;
    if (da !== db) return da.localeCompare(db);
    return (a.title || '').localeCompare(b.title || '', 'ja');
  });
}

// 差分検知用シグネチャ
function taskSignature(task) {
  return JSON.stringify([
    task.title, task.status, task.dueDate, task.priority,
    task.assignee, task.categoryRelation,
    task.phaseDataChange, task.phaseInquiry,
    task.scheduledDate, task.completionDate, task.url
  ]);
}

// カンバン列を初期化（1回のみ）
function initColumns() {
  const board = document.getElementById('kanban-board');
  board.innerHTML = '';

  STATUSES.forEach(status => {
    const column = document.createElement('div');
    column.className = 'kanban-column';
    column.dataset.status = status;

    const header = document.createElement('div');
    header.className = 'column-header';
    const displayName = STATUS_DISPLAY[status] || status;
    header.innerHTML = `<span class="column-title">${displayName}</span><span class="column-count">0</span>`;
    column.appendChild(header);

    const body = document.createElement('div');
    body.className = 'column-body';

    // ドロップゾーン
    body.addEventListener('dragover', (e) => {
      e.preventDefault();
      body.classList.add('drag-over');
      const afterEl = getDragAfterElement(body, e.clientY);
      const dragging = document.querySelector('.dragging');
      if (dragging) {
        if (afterEl) {
          body.insertBefore(dragging, afterEl);
        } else {
          body.appendChild(dragging);
        }
      }
    });

    body.addEventListener('dragleave', (e) => {
      if (!body.contains(e.relatedTarget)) body.classList.remove('drag-over');
    });

    body.addEventListener('drop', async (e) => {
      e.preventDefault();
      body.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      let taskData;
      try {
        taskData = JSON.parse(e.dataTransfer.getData('application/json'));
      } catch { return; }
      const newStatus = column.dataset.status;
      const oldStatus = taskData.status;
      if (oldStatus === newStatus) return;

      const updates = { status: newStatus };

      // フェーズ自動設定：未着手→進行中でフェーズ空欄時
      if (oldStatus === '未着手' && newStatus === '進行中') {
        const cat = getCategoryById(taskData.categoryRelation);
        const catName = cat?.name || '';
        if (catName.includes('データ変更') && !taskData.phaseDataChange) {
          updates.phaseDataChange = 'SQL作成';
        } else if (catName.includes('問合せ') && !taskData.phaseInquiry) {
          updates.phaseInquiry = '調査中';
        }
      }

      // 完了移動時に完了日をセット
      if (newStatus === '完了') {
        updates.completionDate = getTodayISO();
      }

      try {
        await updateTask(taskId, updates);
        const task = allTasks.find(t => t.id === taskId);
        if (task) {
          task.status = newStatus;
          if (updates.phaseDataChange) task.phaseDataChange = updates.phaseDataChange;
          if (updates.phaseInquiry) task.phaseInquiry = updates.phaseInquiry;
          if (updates.completionDate) task.completionDate = updates.completionDate;
        }
        renderKanban();
      } catch (err) {
        alert('ステータス更新に失敗しました: ' + err.message);
        renderKanban();
      }
    });

    column.appendChild(body);
    board.appendChild(column);
    columnBodies[status] = body;
    columnCounts[status] = header.querySelector('.column-count');
  });

  columnsInitialized = true;
}

export function renderKanban() {
  if (!columnsInitialized) initColumns();

  const filters = getFilters();
  const activeTaskIds = new Set();

  STATUSES.forEach(status => {
    let filtered = allTasks.filter(t => t.status === status);

    // 担当フィルタ
    if (filters.assignee) {
      filtered = filtered.filter(t => t.assignee === filters.assignee);
    }

    // 親カテゴリフィルタ
    if (filters.parentCategory) {
      filtered = filtered.filter(t => {
        const cat = getCategoryById(t.categoryRelation);
        return cat && cat.parentCategory === filters.parentCategory;
      });
    }

    // 当日フィルタ
    if (!filters.includeToday && status !== '完了') {
      filtered = filtered.filter(t => !isTodayOrBefore(t.scheduledDate));
    }

    // 完了列：当日完了のみ
    if (status === '完了') {
      filtered = filtered.filter(t => isToday(t.completionDate));
    }

    // ソート：期限昇順→タスク名昇順
    filtered = sortTasks(filtered);

    // カウント更新
    columnCounts[status].textContent = filtered.length;

    const body = columnBodies[status];
    const newTaskIds = filtered.map(t => t.id);
    newTaskIds.forEach(id => activeTaskIds.add(id));

    // 差分レンダリング：不要カード削除
    const existingCards = [...body.querySelectorAll('.task-card')];
    existingCards.forEach(el => {
      if (!newTaskIds.includes(el.dataset.taskId)) {
        body.removeChild(el);
      }
    });

    // 差分レンダリング：追加・更新・並び替え
    filtered.forEach((task, i) => {
      const sig = taskSignature(task);
      const cached = cardCache[task.id];
      let cardEl;

      if (cached && cached.sig === sig) {
        // 変更なし：既存カードを再利用
        cardEl = cached.element;
      } else {
        // 新規 or 変更あり：カード再生成
        cardEl = createTaskCard(task, refreshFn);
        cardCache[task.id] = { sig, element: cardEl };
        const oldEl = body.querySelector(`[data-task-id="${task.id}"]`);
        if (oldEl) body.removeChild(oldEl);
      }

      // 正しい順序に配置
      const currentChildren = [...body.children];
      if (currentChildren[i] !== cardEl) {
        if (currentChildren[i]) {
          body.insertBefore(cardEl, currentChildren[i]);
        } else {
          body.appendChild(cardEl);
        }
      }
    });
  });

  // キャッシュクリーンアップ
  Object.keys(cardCache).forEach(id => {
    if (!activeTaskIds.has(id)) delete cardCache[id];
  });
}

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.task-card:not(.dragging)')];
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}