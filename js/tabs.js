let currentTab = 'today';
let onTabChange = null;

export function getCurrentTab() {
  return currentTab;
}

export function setTabChangeHandler(handler) {
  onTabChange = handler;
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