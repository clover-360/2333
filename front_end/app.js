// ============ DOM 元素获取 ============
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
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

// ============ 校验辅助函数 ============
function setError(input, errorElement, message) {
  input.classList.add('error');
  errorElement.textContent = message;
}

function clearError(input, errorElement) {
  input.classList.remove('error');
  errorElement.textContent = '';
}

// 邮箱格式校验
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 用户名校验：2-20 个字符，可直接匹配中文，允许字母、数字、下划线
function isValidUsername(username) {
  const usernameRegex = /^[\u4e00-\u9fa5A-Za-z0-9_]{2,20}$/;
  return usernameRegex.test(username);
}

// ============ 表单整体校验 ============
function validateForm() {
  let isValid = true;
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  const usernameError = document.getElementById('usernameError');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');

  // 校验用户名
  if (!username) {
    setError(usernameInput, usernameError, '请输入用户名');
    isValid = false;
  } else if (!isValidUsername(username)) {
    setError(usernameInput, usernameError, '用户名需为2-20个字符（中文、字母、数字或下划线）');
    isValid = false;
  } else {
    clearError(usernameInput, usernameError);
  }

  // 校验邮箱
  if (!email) {
    setError(emailInput, emailError, '请输入邮箱地址');
    isValid = false;
  } else if (!isValidEmail(email)) {
    setError(emailInput, emailError, '请输入正确的邮箱格式');
    isValid = false;
  } else {
    clearError(emailInput, emailError);
  }

  // 校验密码
  if (!password) {
    setError(passwordInput, passwordError, '请输入密码');
    isValid = false;
  } else if (password.length < 6) {
    setError(passwordInput, passwordError, '密码长度不能少于6位');
    isValid = false;
  } else {
    clearError(passwordInput, passwordError);
  }

  return isValid;
}

// ============ 密码可见性切换 ============
togglePasswordBtn.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePasswordBtn.textContent = isPassword ? '🙈' : '👁';
  togglePasswordBtn.setAttribute('aria-label', isPassword ? '隐藏密码' : '显示密码');
});

// ============ 实时清除错误提示 ============
function attachClearOnInput(input, errorId) {
  const errorElement = document.getElementById(errorId);
  input.addEventListener('input', () => {
    if (input.classList.contains('error')) {
      clearError(input, errorElement);
    }
  });
}

attachClearOnInput(usernameInput, 'usernameError');
attachClearOnInput(emailInput, 'emailError');
attachClearOnInput(passwordInput, 'passwordError');

// ============ 按钮加载状态控制 ============
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle('loading', isLoading);
}

// ============ 登录提交处理 ============
loginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  // 保存"记住我"状态
  if (document.getElementById('remember').checked) {
    localStorage.setItem('rememberUsername', usernameInput.value.trim());
  } else {
    localStorage.removeItem('rememberUsername');
  }

  // 模拟登录请求（实际项目请替换为真实 API）
  setLoading(true);

  setTimeout(() => {
    setLoading(false);
    showToast('登录成功！欢迎回来 🌟', 'success');

    // 模拟登录成功后的跳转
    setTimeout(() => {
      // window.location.href = './dashboard.html';
    }, 1500);
  }, 1500);
});

// ============ "记住我" 初始化 ============
function initRememberMe() {
  const savedUsername = localStorage.getItem('rememberUsername');
  if (savedUsername) {
    usernameInput.value = savedUsername;
    document.getElementById('remember').checked = true;
  }
}

// 暴露给第三方登录按钮的 window.showToast
window.showToast = showToast;

// 页面加载初始化
initRememberMe();

