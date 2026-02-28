import { isRunningTask } from './utils.js';

export const ASSIGNEE_COLORS = {
  '主担当': '#2383e2',
  'レビュー': '#9065b0'
};

export const DATA_CHANGE_PHASES = ['SQL作成', 'レビュー依頼（SQL）', 'SQLレビューOK', 'レビュー依頼（本番反映）', 'お客様へ回答'];
export const INQUIRY_PHASES = ['調査中', 'レビュー依頼', '回答可能', '回答済'];
export const REVIEW_PHASES = ['レビュー依頼待ち', 'レビュー可能', 'レビュー中'];

export var state = {
  allTasks: [],
  refreshFn: null,
  timerInterval: null,
  operationSeq: 0
};

export var renderRegistry = {
  renderRunningTask: null,
  renderTodayTaskList: null
};

export function setTodayTasks(tasks) {
  state.allTasks = tasks;
}

export function setTodayRefreshFn(fn) {
  state.refreshFn = fn;
}

export function findRunningTask() {
  return state.allTasks.find(function(t) { return isRunningTask(t); }) || null;
}

export function nextSeq() {
  return ++state.operationSeq;
}

export function snapshotTask(task) {
  return Object.assign({}, task);
}

export function restoreTask(task, snapshot) {
  Object.keys(snapshot).forEach(function(k) { task[k] = snapshot[k]; });
}