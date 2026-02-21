import { startTask, updateTask } from './api.js';
import { getCategoryColor, getCategoryById } from './filters.js';
import { formatDateWithDay, escapeHtml, hexToRgba } from './utils.js';
import { openEditModal } from './modal.js';

const DATA_CHANGE_PHASES = [
  'SQL作成', 'レビュー依頼（SQL）', 'SQLレビューOK', 'レビュー依頼（本番反映）', 'お客様へ回答'
];
const INQUIRY_PHASES = ['調査中', 'レビュー依頼', '回答可能', '回答済'];
const REVIEW_PHASES = ['レビュー依頼待ち', 'レビュー可能', 'レビュー中'];

// 担当ラベルの色定義
const ASSIGNEE_COLORS = {
  '主担当': '#2383e2',
  'レビュー': '#9065b0'
};
const DEFAULT_ASSIGNEE_COLOR = '#6b7280';

export function createTaskCard(task, onRefresh) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.setAttribute('draggable', 'true');
  card.dataset.taskId = task.id;

  const color = getCategoryColor(task.categoryRelation);
  card.style.borderLeft = `4px solid ${color}`;
  card.style.background = hexToRgba(color, 0.05);

  const category = getCategoryById(task.categoryRelation);
  const catName = category?.name || '';

  // フェーズ判定：進行中のみ表示
  let phaseHtml = '';
  if (task.status === '進行中') {
    if (task.assignee === 'レビュー') {
      phaseHtml = buildPhaseSelect('phaseReview', REVIEW_PHASES, task.phaseReview, task.id);
    } else if (catName.includes('データ変更')) {
      phaseHtml = buildPhaseSelect('phaseDataChange', DATA_CHANGE_PHASES, task.phaseDataChange, task.id);
    } else if (catName.includes('問合せ')) {
      phaseHtml = buildPhaseSelect('phaseInquiry', INQUIRY_PHASES, task.phaseInquiry, task.id);
    }
  }

  // カテゴリラベル
  const catLabel = catName
    ? `<span class="label label-category" style="background:${hexToRgba(color, 0.20)};color:${color}">${escapeHtml(catName)}</span>`
    : '';

  // 担当ラベル
  const assigneeColor = ASSIGNEE_COLORS[task.assignee] || DEFAULT_ASSIGNEE_COLOR;
  const assigneeLabel = task.assignee
    ? `<span class="label label-assignee" style="background:${hexToRgba(assigneeColor, 0.20)};color:${assigneeColor}">${escapeHtml(task.assignee)}</span>`
    : '';

  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">${escapeHtml(task.title)}</span>
    </div>
    <div class="card-body">
      <div class="card-row card-row-due">
        <span class="card-label">期限</span>
        <span class="card-value">${formatDateWithDay(task.dueDate) || '未設定'}</span>
        <button class="btn-start" title="開始">▶</button>
      </div>
      <div class="card-labels">
        ${catLabel}${assigneeLabel}
      </div>
      ${phaseHtml ? `<div class="card-row card-row-phase">${phaseHtml}</div>` : ''}
    </div>
    <div class="card-footer">
      <span class="card-footer-btns">
        <button class="btn-copy-url" title="URLコピー">🔗</button>
        <button class="btn-copy-title" title="タスク名コピー">📋</button>
      </span>
      <span class="card-footer-right">
        <button class="btn-open-notion" title="Notionで開く">📄</button>
        ${task.priority ? `<span class="priority priority-${task.priority.length}">${escapeHtml(task.priority)}</span>` : ''}
      </span>
    </div>
  `;

  // 開始ボタン
  card.querySelector('.btn-start').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('タスクを開始しますか？')) return;
    const btn = e.currentTarget;
    btn.textContent = '⏳';
    btn.disabled = true;
    try {
      await startTask(task.id);
      onRefresh?.();
    } catch (err) {
      btn.textContent = '▶';
      btn.disabled = false;
      alert('開始に失敗しました: ' + err.message);
    }
  });

  // カードクリック → 編集モーダル
  card.addEventListener('click', (e) => {
    if (e.target.closest('button, select')) return;
    openEditModal(task, onRefresh);
  });
  // Notionで開くボタン
  card.querySelector('.btn-open-notion').addEventListener('click', (e) => {
    e.stopPropagation();
    const base = 'https:/' + '/www.notion.so/';
    const pageId = task.id.replace(/-/g, '');
    window.open(base + pageId, '_blank');
  });
  // URLコピーボタン
  card.querySelector('.btn-copy-url').addEventListener('click', (e) => {
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
  // タスク名コピーボタン
  card.querySelector('.btn-copy-title').addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(task.title).then(() => {
      const btn = e.currentTarget;
      btn.textContent = '✅';
      setTimeout(() => { btn.textContent = '📋'; }, 1500);
    }).catch(() => alert('コピーに失敗しました'));
  });

  // フェーズ変更
  const phaseSelect = card.querySelector('.phase-select');
  if (phaseSelect) {
    phaseSelect.addEventListener('change', async (e) => {
      e.stopPropagation();
      const prop = phaseSelect.dataset.prop;
      try {
        await updateTask(task.id, { [prop]: e.target.value });
      } catch (err) {
        alert('フェーズ更新に失敗しました: ' + err.message);
      }
    });
  }

  // ドラッグイベント
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.setData('application/json', JSON.stringify(task));
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));

  return card;
}

function buildPhaseSelect(prop, phases, current, taskId) {
  const options = phases
    .map(p => `<option value="${p}"${p === current ? ' selected' : ''}>${p}</option>`)
    .join('');
  return `<select class="phase-select" data-prop="${prop}" data-task-id="${taskId}">
    <option value="">フェーズ未設定</option>
    ${options}
  </select>`;
}