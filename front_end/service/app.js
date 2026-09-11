/* ============ 用户喜好选择交互逻辑 ============ */

// DOM 元素
const hobbyGrid = document.getElementById('hobbyGrid');
const countEl = document.getElementById('count');
const progressFill = document.getElementById('progressFill');
const submitBtn = document.getElementById('submitBtn');
const toast = document.getElementById('toast');

// 参数配置
const MIN_SELECT = 3;
const TOTAL = 9;

const selected = new Set();

// 初始化计数
countEl.textContent = 0;

// ============ 喜好选择（Switch 开关）============
hobbyGrid.addEventListener('change', (event) => {
  const checkbox = event.target;
  if (checkbox.type !== 'checkbox') return;

  if (checkbox.checked) {
    selected.add(checkbox.id);
  } else {
    selected.delete(checkbox.id);
  }

  // 开关状态由 CSS (:checked) 自动呈现，此处仅更新统计
  updateUI();
});

// ============ 更新界面 ============
function updateUI() {
  const count = selected.size;
  countEl.textContent = count;
  progressFill.style.width = (count / TOTAL) * 100 + '%';

  // 提交按钮：至少选择 MIN_SELECT 项
  submitBtn.disabled = count < MIN_SELECT;
  submitBtn.textContent =
    count < MIN_SELECT
      ? `还需选择 ${MIN_SELECT - count} 项`
      : '开始匹配';
}

// ============ 提交 ============
submitBtn.addEventListener('click', () => {
  if (selected.size < MIN_SELECT) {
    showToast(`请至少选择 ${MIN_SELECT} 项喜好`);
    return;
  }

  // 收集选中的喜好名称
  const names = [];
  hobbyGrid.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
    names.push(cb.dataset.name);
  });

  showToast(`已保存：${names.join('、')}`);
  // 真实项目可在此发送请求到后端
  // await fetch('/api/hobbies', {
  //   method: 'POST',
  //   body: JSON.stringify({ hobbies: [...selected] }),
  // });
});

// ============ Toast 提示 ============
let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}
