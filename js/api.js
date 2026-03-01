const API_BASE = window.location.origin;

// === #1: タスクデータのメモリキャッシュ（SWR） ===
let tasksCache = null;       // { data, timestamp }
const CACHE_FRESH_MS = 30 * 1000; // 30秒（60秒ポーリングの半分）

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