// ===== Entry Point =====
// Split modules:
//   todayState.js     - shared state, constants, helpers
//   todayDailyLog.js  - daily log rendering & fetch
//   todayRunning.js   - running task card rendering & actions
//   todayTaskList.js  - task list table rendering & actions

import { state, renderRegistry, setTodayTasks, setTodayRefreshFn, findRunningTask } from './todayState.js';
import { renderRunningTask } from './todayRunning.js';
import { renderTodayTaskList } from './todayTaskList.js';
import { loadDailyLog } from './todayDailyLog.js';

// Register renderers to break circular dependency
renderRegistry.renderRunningTask = renderRunningTask;
renderRegistry.renderTodayTaskList = renderTodayTaskList;

export { setTodayTasks, setTodayRefreshFn, findRunningTask };
export { renderRunningTask };
export { renderTodayTaskList };

export function renderTodayView() {
  renderRunningTask();
  renderTodayTaskList();
  loadDailyLog();
}

export function cleanupTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}