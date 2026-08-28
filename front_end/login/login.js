// ============ DOM 元素获取 ============
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const toast = document.getElementById('toast');

// ============ Toast 提示工具 ============
let toastTimer = null;

function showToast(message, type = 'error') {
  toast.textContent = message;
  toast.className = 'toast show ' + (type === 'success' ? 'success' : 'error');

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============ 校验工具函数 ============
function setError(input, errorElement, message) {
  input.classList.add('error');
  errorElement.textContent = message;
}

function clearError(input, errorElement) {
  input.classList.remove('error');
  errorElement.textContent = '';
}

/**
 * 用户名必须为中文
 *   - 匹配中文字符（\u4e00-\u9fa5）
 *   - 用户名字符串必须全部由中文组成
 * @returns {boolean} 返回字符串中是否包含中文字符
 */
function isValidChineseUsername(username) {
  // 匹配至少一个中文字符
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(username);
}

/**
 * 密码必须包含英文与数字
 *   - 必须包含至少一个英文字母（a-zA-Z）
 *   - 必须包含至少一个数字（0-9）
 *   - 长度建议至少 6 位
 *   - 可包含其他字符（如符号）
 */
function isPasswordValid(password) {
  const hasEnglish = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasMinLength = password.length >= 6;
  return hasEnglish && hasNumber && hasMinLength;
}

// ============ 表单整体校验 ============
function validateForm() {
  let isValid = true;
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  const usernameError = document.getElementById('usernameError');
  const passwordError = document.getElementById('passwordError');

  // 校验用户名
  if (!username) {
    setError(usernameInput, usernameError, '请输入用户名');
    isValid = false;
  } else if (!isValidChineseUsername(username)) {
    // 用户名必须为中文，否则登录失败
    setError(usernameInput, usernameError, '登录失败，请使用中文');
    isValid = false;
  } else {
    clearError(usernameInput, usernameError);
  }

  // 校验密码
  if (!password) {
    setError(passwordInput, passwordError, '请输入密码');
    isValid = false;
  } else if (!isPasswordValid(password)) {
    setError(
      passwordInput,
      passwordError,
      password.length < 6
        ? '密码长度不能少于6位'
        : '密码必须同时包含英文字母和数字'
    );
    isValid = false;
  } else {
    clearError(passwordInput, passwordError);
  }

  return isValid;
}

// ============ 实时清除错误提示 ============
usernameInput.addEventListener('input', () => {
  const usernameError = document.getElementById('usernameError');
  if (usernameInput.classList.contains('error')) {
    clearError(usernameInput, usernameError);
  }
});

passwordInput.addEventListener('input', () => {
  const passwordError = document.getElementById('passwordError');
  if (passwordInput.classList.contains('error')) {
    clearError(passwordInput, passwordError);
  }
});

// ============ 表单提交处理 ============
loginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  // 执行表单校验
  if (!validateForm()) {
    return;
  }

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // 模拟登录请求（实际项目请替换为真实 API）
  submitBtn.disabled = true;
  submitBtn.textContent = '登录中...';

  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = '登 录';

    // 演示登录成功逻辑，可根据需要调整
    if (username === '管理员' && password === 'abc123') {
      showToast('登录成功！欢迎回来 🌟', 'success');
    } else {
      showToast('用户名或密码错误，请重试');
      passwordInput.value = '';
      passwordInput.focus();
    }
  }, 1500);
});

