import { fetchDailyLog } from './api.js';
import { escapeHtml } from './utils.js';

var dailyLogs = [];

export function formatTimeHHMM(isoStr) {
  if (!isoStr) return '';
  var d = new Date(isoStr);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function calcDurationMin(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  return Math.max(0, Math.round((new Date(endIso) - new Date(startIso)) / 60000));
}

export function renderDailyLogHtml() {
  if (dailyLogs.length === 0) {
    return '<div class="running-log-empty">本日の作業記録はまだありません</div>';
  }
  var totalMin = 0;
  var rows = dailyLogs.map(function(log) {
    var min = calcDurationMin(log.start, log.end);
    totalMin += min;
    return '<div class="log-entry">' +
      '<span class="log-time">' + formatTimeHHMM(log.start) + '</span>' +
      '<span class="log-title">' + escapeHtml(log.title) + '</span>' +
      '<span class="log-duration">' + min + '分</span>' +
    '</div>';
  }).join('');
  return rows + '<div class="log-total">合計 ' + totalMin + '分</div>';
}

export async function loadDailyLog() {
  try {
    var data = await fetchDailyLog();
    dailyLogs = data.logs || [];
    var el = document.getElementById('running-log-list');
    if (el) el.innerHTML = renderDailyLogHtml();
  } catch (err) {
    console.error('Daily log load error:', err);
  }
}