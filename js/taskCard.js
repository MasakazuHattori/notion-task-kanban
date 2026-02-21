import { startTask, updateTask } from './api.js';
import { getCategoryColor, getCategoryById } from './filters.js';
import { formatDateWithDay, escapeHtml } from './utils.js';
import { openMemoModal } from './modal.js';

const DATA_CHANGE_PHASES = [
  'SQL作成', 'レビュー依頼（SQL）', 'SQLレビューOK', 'レビュー依頼（本番反映）', 'お客様へ回答'
];
const INQUIRY_PHASES = ['調査中', 'レビュー依頼', '回答可能', '回答済'];

export function createTaskCard(task, onRefresh) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.setAttribute('draggable', 'true');
  card.dataset.taskId = task.id;

  const color = getCategoryColor(task.categoryRelation);
  card.style.borderLeft = `4px solid ${color}`;

  const category = getCategoryById(task.categoryRelation);
  const catName = category?.name || '';

  // フェーズ判定：カテゴリ名に「データ変更」or「問合せ」を含むか
  let phaseHtml = '';
  if (catName.includes('データ変更')) {
    phaseHtml = buildPhaseSelect('phaseDataChange', DATA_CHANGE_PHASES, task.phaseDataChange, task.id);
  } else if (catName.includes('問合せ')) {
    phaseHtml = buildPhaseSelect('phaseInquiry', INQUIRY_PHASES, task.phaseInquiry, task.id);
  }

  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">${escapeHtml(task.title)}</span>
      <button class="btn-start" title="開始">▶</button>
    </div>
    <div class="card-body">
      <div class="card-row">
        <span class="card-label">期限</span>
        <span class="card-value">${formatDateWithDay(task.dueDate)}</span>
      </div>
      <div class="card-row">
        <span class="card-label">予定</span>
        <span class="card-value">${formatDateWithDay(task.scheduledDate)}</span>
      </div>
      <div class="card-row">
        <span class="card-label">担当</span>
        <span class="card-value">${escapeHtml(task.assignee)}</span>
      </div>
      ${phaseHtml ? `<div class="card-row card-row-phase">${phaseHtml}</div>` : ''}
    </div>
    <div class="card-footer">
      <button class="btn-memo" title="メモ">📝</button>
      ${task.priority ? `<span class="priority priority-${task.priority.length}">${escapeHtml(task.priority)}</span>` : ''}
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

  // メモボタン
  card.querySelector('.btn-memo').addEventListener('click', (e) => {
    e.stopPropagation();
    openMemoModal(task);
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