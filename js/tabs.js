let currentTab = 'today';
let onTabChange = null;

export function getCurrentTab() {
  return currentTab;
}

export function setTabChangeHandler(handler) {
  onTabChange = handler;
}

/**
 * プログラム的にタブを切り替える
 * @param {string} tabName - 'kanban' | 'today'
 */
export function switchTab(tabName) {
  if (tabName === currentTab) return;
  const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (btn) btn.click();
}

export function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.view-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === currentTab) return;

      currentTab = tab;

      // ボタンのアクティブ状態
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // パネル表示切替
      panels.forEach(p => p.classList.remove('active'));
      const targetId = tab === 'kanban' ? 'view-kanban' : 'view-today';
      document.getElementById(targetId).classList.add('active');

      onTabChange?.(tab);
    });
  });
}