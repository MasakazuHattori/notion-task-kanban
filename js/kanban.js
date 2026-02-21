import { updateTask } from './api.js';
import { createTaskCard } from './taskCard.js';
import { getFilters, getCategories, getCategoryById } from './filters.js';
import { isToday, getTodayISO } from './utils.js';

const STATUSES = ['劣後', '未着手', '進行中', '回答済', '完了'];

let allTasks = [];
let refreshFn = null;

export function setTasks(tasks) {
  allTasks = tasks;
}

export function setRefreshFn(fn) {
  refreshFn = fn;
}

export function renderKanban() {
  const board = document.getElementById('kanban-board');
  board.innerHTML = '';
  const filters = getFilters();
  const categories = getCategories();

  STATUSES.forEach(status => {
    const column = document.createElement('div');
    column.className = 'kanban-column';
    column.dataset.status = status;

    const header = document.createElement('div');
    header.className = 'column-header';
    header.innerHTML = `<span class="column-title">${status}</span><span class="column-count">0</span>`;
    column.appendChild(header);

    const body = document.createElement('div');
    body.className = 'column-body';

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

    // 当日フィルタ：デフォルト非チェック時、当日予定タスクを非表示（完了列以外）
    if (!filters.includeToday && status !== '完了') {
      filtered = filtered.filter(t => !isToday(t.scheduledDate));
    }

    // 完了列：当日完了のみ表示
    if (status === '完了') {
      filtered = filtered.filter(t => isToday(t.completionDate));
    }

    header.querySelector('.column-count').textContent = filtered.length;

    filtered.forEach(task => {
      body.appendChild(createTaskCard(task, refreshFn));
    });

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
  });

  renderLegend(categories);
}

function renderLegend(categories) {
  const legend = document.getElementById('category-legend');
  if (!legend) return;
  const parentMap = {};
  categories.forEach(c => {
    if (c.parentCategory && !parentMap[c.parentCategory]) {
      parentMap[c.parentCategory] = c.colorCode || '#6b7280';
    }
  });
  legend.innerHTML = Object.entries(parentMap)
    .map(([name, color]) =>
      `<span class="legend-item"><span class="legend-color" style="background:${color}"></span>${name}</span>`
    ).join('');
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