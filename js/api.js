const API_BASE = window.location.origin;

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

export async function startTask(pageId) {
  return request('/api/start-task', {
    method: 'POST',
    body: JSON.stringify({ pageId })
  });
}