import { createTask, updateTask } from './api.js';
import { getCategories } from './filters.js';
import { escapeHtml } from './utils.js';

let refreshCallback = null;

export function setRefreshCallback(cb) {
  refreshCallback = cb;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

export function openAddModal() {
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const categories = getCategories();
  const catOptions = categories
    .map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join('');

  content.innerHTML = `
    <h3>タスク追加</h3>
    <form id="add-task-form">
      <label>タスク名<input type="text" name="title" required></label>
      <label>担当
        <select name="assignee">
          <option value="">なし</option>
          <option value="主担当">主担当</option>
          <option value="レビュー">レビュー</option>
        </select>
      </label>
      <label>カテゴリ
        <select name="categoryId">
          <option value="">なし</option>
          ${catOptions}
        </select>
      </label>
      <label>期限<input type="date" name="dueDate"></label>
      <label>実施予定<input type="date" name="scheduledDate"></label>
      <label>重要度
        <select name="priority">
          <option value="">なし</option>
          <option value="!">!</option>
          <option value="!!">!!</option>
          <option value="!!!">!!!</option>
        </select>
      </label>
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