import { createTask, updateTask } from './api.js';
import { getCategories } from './filters.js';
import { renderKanban } from './kanban.js';
import { escapeHtml } from './utils.js';

let refreshCallback = null;

export function setRefreshCallback(cb) {
  refreshCallback = cb;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// カテゴリ選択肢を生成
function buildCatOptions(categories, selectedId) {
  return categories
    .map(c => `<option value="${c.id}"${c.id === selectedId ? ' selected' : ''}>${escapeHtml(c.name)}</option>`)
    .join('');
}

// 共通フォームフィールドを生成
function buildFormFields(task = {}) {
  const categories = getCategories();
  const catOptions = buildCatOptions(categories, task.categoryRelation || '');

  return `
    <label>タスク名<input type="text" name="title" value="${escapeHtml(task.title || '')}" required></label>
    <label>担当
      <select name="assignee">
        <option value="">なし</option>
        <option value="主担当"${task.assignee === '主担当' ? ' selected' : ''}>主担当</option>
        <option value="レビュー"${task.assignee === 'レビュー' ? ' selected' : ''}>レビュー</option>
      </select>
    </label>
    <label>カテゴリ
      <select name="categoryId">
        <option value="">なし</option>
        ${catOptions}
      </select>
    </label>
    <label>期限<input type="date" name="dueDate" value="${task.dueDate || ''}"></label>
    <label>実施予定<input type="date" name="scheduledDate" value="${task.scheduledDate || ''}"></label>
    <label>重要度
      <select name="priority">
        <option value="">なし</option>
        <option value="!"${task.priority === '!' ? ' selected' : ''}>!</option>
        <option value="!!"${task.priority === '!!' ? ' selected' : ''}>!!</option>
        <option value="!!!"${task.priority === '!!!' ? ' selected' : ''}>!!!</option>
      </select>
    </label>
    <label>URL<input type="url" name="url" value="${escapeHtml(task.url || '')}" placeholder="https://..."></label>
    <label>備考<textarea name="memo" rows="3">${escapeHtml(task.memo || '')}</textarea></label>
  `;
}

// ローカルタスクに更新を適用
function applyUpdatesToTask(task, updates) {
  if (updates.title !== undefined) task.title = updates.title;
  if (updates.assignee !== undefined) task.assignee = updates.assignee;
  if (updates.categoryId !== undefined) task.categoryRelation = updates.categoryId;
  if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
  if (updates.scheduledDate !== undefined) task.scheduledDate = updates.scheduledDate;
  if (updates.priority !== undefined) task.priority = updates.priority;
  if (updates.url !== undefined) task.url = updates.url;
  if (updates.memo !== undefined) task.memo = updates.memo;
}

export function openAddModal() {
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <h3>タスク追加</h3>
    <form id="add-task-form">
      ${buildFormFields()}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="btn-cancel-add">キャンセル</button>
        <button type="submit" class="btn-primary">追加</button>
      </div>
    </form>
  `;

  document.getElementById('btn-cancel-add').addEventListener('click', closeModal);

  document.getElementById('add-task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {};
    if (fd.get('title')) data.title = fd.get('title');
    if (fd.get('assignee')) data.assignee = fd.get('assignee');
    if (fd.get('categoryId')) data.categoryId = fd.get('categoryId');
    if (fd.get('dueDate')) data.dueDate = fd.get('dueDate');
    if (fd.get('scheduledDate')) data.scheduledDate = fd.get('scheduledDate');
    if (fd.get('priority')) data.priority = fd.get('priority');
    if (fd.get('url')) data.url = fd.get('url');
    if (fd.get('memo')) data.memo = fd.get('memo');
    try {
      await createTask(data);
      closeModal();
      refreshCallback?.();
    } catch (err) {
      alert('タスク作成に失敗しました: ' + err.message);
    }
  });

  modal.classList.remove('hidden');
}

export function openEditModal(task, onRefresh) {
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  // 日付の日付部分のみ取り出す（datetime対応）
  const dueDate = task.dueDate?.includes('T') ? task.dueDate.split('T')[0] : (task.dueDate || '');
  const scheduledDate = task.scheduledDate?.includes('T') ? task.scheduledDate.split('T')[0] : (task.scheduledDate || '');

  const taskForForm = { ...task, dueDate, scheduledDate };

  content.innerHTML = `
    <h3>タスク編集</h3>
    <form id="edit-task-form">
      ${buildFormFields(taskForForm)}
      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="btn-cancel-edit">キャンセル</button>
        <button type="submit" class="btn-primary">保存</button>
      </div>
    </form>
  `;

  document.getElementById('btn-cancel-edit').addEventListener('click', closeModal);

  document.getElementById('edit-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updates = {};

    const newTitle = fd.get('title') || '';
    const newAssignee = fd.get('assignee') || '';
    const newCategoryId = fd.get('categoryId') || '';
    const newDueDate = fd.get('dueDate') || '';
    const newScheduledDate = fd.get('scheduledDate') || '';
    const newPriority = fd.get('priority') || '';
    const newUrl = fd.get('url') || '';
    const newMemo = fd.get('memo') || '';

    if (newTitle !== (task.title || '')) updates.title = newTitle;
    if (newAssignee !== (task.assignee || '')) updates.assignee = newAssignee;
    if (newCategoryId !== (task.categoryRelation || '')) updates.categoryId = newCategoryId;
    if (newDueDate !== dueDate) updates.dueDate = newDueDate;
    if (newScheduledDate !== scheduledDate) updates.scheduledDate = newScheduledDate;
    if (newPriority !== (task.priority || '')) updates.priority = newPriority;
    if (newUrl !== (task.url || '')) updates.url = newUrl;
    if (newMemo !== (task.memo || '')) updates.memo = newMemo;

    if (Object.keys(updates).length === 0) {
      closeModal();
      return;
    }

    // ロールバック用に旧値を保存
    const snapshot = {
      title: task.title,
      assignee: task.assignee,
      categoryRelation: task.categoryRelation,
      dueDate: task.dueDate,
      scheduledDate: task.scheduledDate,
      priority: task.priority,
      url: task.url,
      memo: task.memo
    };

    // 楽観的更新：ローカルデータを即反映
    applyUpdatesToTask(task, updates);
    closeModal();
    renderKanban();

    // バックグラウンドでAPI送信
    updateTask(task.id, updates).catch((err) => {
      // 失敗時：ロールバック
      console.error('Update failed, rolling back:', err);
      Object.assign(task, snapshot);
      renderKanban();
      alert('タスク更新に失敗しました（元に戻しました）: ' + err.message);
    });
  });

  modal.classList.remove('hidden');
}

export function openMemoModal(task) {
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <h3>メモ - ${escapeHtml(task.title)}</h3>
    <form id="memo-form">
      <textarea name="memo" rows="8">${escapeHtml(task.memo)}</textarea>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="btn-cancel-memo">キャンセル</button>
        <button type="submit" class="btn-primary">保存</button>
      </div>
    </form>
  `;

  document.getElementById('btn-cancel-memo').addEventListener('click', closeModal);

  document.getElementById('memo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memo = new FormData(e.target).get('memo');
    try {
      await updateTask(task.id, { memo });
      task.memo = memo;
      closeModal();
    } catch (err) {
      alert('メモ更新に失敗しました: ' + err.message);
    }
  });

  modal.classList.remove('hidden');
}
export function openAnswerMemoModal(task, onConfirm) {
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <h3>回答済 - 備考更新</h3>
    <form id="answer-memo-form">
      <label class="answer-task-label">${escapeHtml(task.title)}</label>
      <textarea name="memo" rows="6">${escapeHtml(task.memo || '')}</textarea>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="btn-cancel-answer">キャンセル</button>
        <button type="submit" class="btn-primary">更新</button>
      </div>
    </form>
  `;
  document.getElementById('btn-cancel-answer').addEventListener('click', closeModal);
  document.getElementById('answer-memo-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const memo = new FormData(e.target).get('memo');
    closeModal();
    if (onConfirm) onConfirm(memo);
  });
  modal.classList.remove('hidden');
}