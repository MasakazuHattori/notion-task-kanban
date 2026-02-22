export function formatDateWithDay(dateStr) {
  if (!dateStr) return '';
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const date = new Date(dateOnly + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = days[date.getDay()];
  return `${y}/${m}/${d}(${day})`;
}

export function isToday(dateStr) {
  if (!dateStr) return false;
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const date = new Date(dateOnly + 'T00:00:00');
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function isTodayOrBefore(dateStr) {
  if (!dateStr) return false;
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const date = new Date(dateOnly + 'T00:00:00');
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
}

export function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hexToRgba(hex, alpha = 1) {
  if (!hex || hex.length < 7) return `rgba(107, 114, 128, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * 実行中タスクか判定（executionDateのstartがあり、endがない）
 */
export function isRunningTask(task) {
  return !!(task.executionDate && !task.executionDateEnd);
}

/**
 * 経過時間を HH:MM:SS 形式で返す
 */
export function formatElapsedTime(startIso) {
  if (!startIso) return '00:00:00';
  const start = new Date(startIso);
  const now = new Date();
  let diff = Math.floor((now - start) / 1000);
  if (diff < 0) diff = 0;
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}