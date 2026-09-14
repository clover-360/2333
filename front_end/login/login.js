// ============ 接口配置 ============
// 后端服务地址（Flask 监听 0.0.0.0:6008）
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
 * 用户名校验（与后端 app.py validate_username 对齐）：
 *   - 长度 3~64
 *   - 仅允许字母、数字、下划线、横线
 */
function isValidUsername(username) {
  if (username.length < 3 || username.length > 64) {
    return false;
  }
  return /^[A-Za-z0-9_-]+$/.test(username);
}

/**
 * 密码校验（与后端 app.py validate_password 对齐，并额外要求含字母和数字）：
 *   - 长度 6~32
 *   - 必须同时包含英文字母和数字
 */
function isPasswordValid(password) {
  if (password.length < 6 || password.length > 32) {
    return false;
  }
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

  // 校验用户名
  if (!username) {
    setError(usernameInput, usernameError, '请输入用户名');
    isValid = false;
  } else if (!isValidUsername(username)) {
    setError(usernameInput, usernameError, '用户名需 3~64 位，仅含字母、数字、下划线、横线');
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
        : password.length > 32
          ? '密码长度不能超过32位'
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

// ============ 带 token 的请求工具（供后续接口使用，自动在 header 带上 token）============
/**
 * 发起带认证的请求：自动从 localStorage 读取 token 并放入 Authorization header
 * @param {string} url - 接口路径（相对 API_BASE，如 '/me'）
 * @param {object} [options] - fetch 配置；若 body 为对象则自动 JSON 序列化
 * @returns {Promise<Response>}
 */
function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = Object.assign({}, options.headers || {});
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  return fetch(API_BASE + url, Object.assign({}, options, { headers }));
}

// ============ 表单提交处理（调用后端 /login 接口）============
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // 执行表单校验
  if (!validateForm()) {
    return;
  }

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

    // 后端统一响应：{ code, msg, data }
    if (result.code === 0 && result.data && result.data.token) {
      // 登录成功：把 token 存入 localStorage，供后续接口在 header 带上
      localStorage.setItem('token', result.data.token);
      // 同时缓存用户基本信息，便于页面展示
      localStorage.setItem('user_info', JSON.stringify({
        user_id: result.data.user_id,
        username: result.data.username,
      }));

      showToast('登录成功！欢迎回来 🌟', 'success');

      // 登录成功后跳转（按需修改目标页地址）
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 800);
    } else {
      // 登录失败：展示后端返回的错误信息
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
