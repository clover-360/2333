// ============ 接口配置 ============
const API_BASE = '/api';

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
  if (toastTimer) clearTimeout(toastTimer);
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

function isValidUsername(username) {
  if (username.length < 3 || username.length > 64) return false;
  return /^[\u4e00-\u9fa5A-Za-z0-9_-]+$/.test(username);
}

function isPasswordValid(password) {
  if (password.length < 6 || password.length > 32) return false;
  const hasEnglish = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasEnglish && hasNumber;
}

// ============ 表单整体校验 ============
function validateForm() {
  let isValid = true;
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const usernameError = document.getElementById('usernameError');
  const passwordError = document.getElementById('passwordError');

  if (!username) {
    setError(usernameInput, usernameError, '请输入用户名');
    isValid = false;
  } else if (!isValidUsername(username)) {
    setError(usernameInput, usernameError, '用户名需 3~64 位，仅含中文、字母、数字、下划线、横线');
    isValid = false;
  } else {
    clearError(usernameInput, usernameError);
  }

  if (!password) {
    setError(passwordInput, passwordError, '请输入密码');
    isValid = false;
  } else if (!isPasswordValid(password)) {
    setError(passwordInput, passwordError, '密码需 6~32 位且同时包含字母和数字');
    isValid = false;
  } else {
    clearError(passwordInput, passwordError);
  }

  return isValid;
}

// ============ 实时清除错误提示 ============
usernameInput.addEventListener('input', () => {
  const usernameError = document.getElementById('usernameError');
  if (usernameInput.classList.contains('error')) clearError(usernameInput, usernameError);
});

passwordInput.addEventListener('input', () => {
  const passwordError = document.getElementById('passwordError');
  if (passwordInput.classList.contains('error')) clearError(passwordInput, passwordError);
});

// ============ 带 token 的请求工具 ============
function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = Object.assign({}, options.headers || {});
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  return fetch(API_BASE + url, Object.assign({}, options, { headers }));
}

// ============ 表单提交处理 ============
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!validateForm()) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  submitBtn.disabled = true;
  submitBtn.textContent = '登录中...';

  try {
    const resp = await fetch(API_BASE + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await resp.json();

    if (result.code === 0 && result.data && result.data.token) {
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user_info', JSON.stringify({
        user_id: result.data.user_id,
        username: result.data.username,
      }));
      showToast('登录成功！欢迎回来 🌟', 'success');
      setTimeout(() => { window.location.href = '/dialog/chat-stream.html'; }, 800);
    } else {
      showToast(result.msg || '登录失败，请重试');
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (err) {
    showToast('网络异常，请检查后端服务是否启动');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '登 录';
  }
});