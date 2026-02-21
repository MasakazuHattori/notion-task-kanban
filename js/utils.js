export function formatDateWithDay(dateStr) {
  if (!dateStr) return '';
  // 日時形式（ISO 8601）の場合は日付部分だけ取り出す
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