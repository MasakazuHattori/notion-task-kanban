const API_BASE = window.location.origin;

// === #1: タスクデータのメモリキャッシュ（SWR） ===
let tasksCache = null;       // { data, timestamp }
const CACHE_FRESH_MS = 8 * 1000; // 8秒（10秒ポーリングの内側）

export function getTasksCache() {
  if (!tasksCache) return null;
  if (Date.now() - tasksCache.timestamp > CACHE_FRESH_MS) return null;
  return tasksCache.data;
}

export function setTasksCache(tasks) {
  tasksCache = { data: tasks, timestamp: Date.now() };
}

export function invalidateTasksCache() {
  tasksCache = null;
}

// === #2: 楽観的オーバーライドレジストリ ===
// 操作後一定時間、APIデータでローカル変更を上書きしないよう保護する
const optimisticOverrides = new Map(); // taskId -> { fields, expiry }

/**
 * 楽観的更新をレジストリに登録
 * @param {string} taskId
 * @param {object} fields - 保護するフィールドと値 (e.g. { executionDate: null, status: '完了' })
 * @param {number} durationMs - 保護時間（デフォルト15秒）
 */
export function registerOptimisticOverride(taskId, fields, durationMs = 15000) {
  optimisticOverrides.set(taskId, {
    fields,
    expiry: Date.now() + durationMs
  });
}

/**
 * APIから取得したタスク配列に楽観的オーバーライドを適用
 * @param {Array} tasks
 */
export function applyOptimisticOverrides(tasks) {
  const now = Date.now();
  // 期限切れをクリーンアップ
  for (const [id, entry] of optimisticOverrides) {
    if (now > entry.expiry) optimisticOverrides.delete(id);
  }
  // アクティブなオーバーライドを適用
  tasks.forEach(task => {
    const override = optimisticOverrides.get(task.id);
    if (override) {
      Object.assign(task, override.fields);
    }
  });
}

/**
 * 指定タスクIDのオーバーライドを解除（API反映確認後）
 * @param {string} taskId
 */
export function clearOptimisticOverride(taskId) {
  optimisticOverrides.delete(taskId);
}

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API Error: ${res.status}`);
  }
  return res.json();
}

export async function fetchTasks() {
  return request('/api/tasks');
}

export async function fetchCategories() {
  return request('/api/categories');
}

export async function updateTask(pageId, properties) {
  return request('/api/update-task', {
    method: 'POST',
    body: JSON.stringify({ pageId, properties })
  });
}

export async function createTask(data) {
  return request('/api/create-task', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function startTask(pageId, statusUpdate = null, phaseUpdate = null) {
  return request('/api/start-task', {
    method: 'POST',
    body: JSON.stringify({ pageId, statusUpdate, phaseUpdate })
  });
}

export async function stopTask(pageId, taskTitle = '') {
  return request('/api/stop-task', {
    method: 'POST',
    body: JSON.stringify({ pageId, taskTitle })
  });
}

export async function finishTask(pageId, taskTitle = '') {
  return request('/api/finish-task', {
    method: 'POST',
    body: JSON.stringify({ pageId, taskTitle })
  });
}

export async function answerTask(pageId, taskTitle = '', memo = '') {
  return request('/api/answer-task', {
    method: 'POST',
    body: JSON.stringify({ pageId, taskTitle, memo })
  });
}

export async function postponeTask(pageId) {
  return request('/api/postpone-task', {
    method: 'POST',
    body: JSON.stringify({ pageId })
  });
}

export async function fetchWeeklyCompleted() {
  return request('/api/weekly-completed');
}

export async function fetchDailyLog() {
  return request('/api/daily-log');
}