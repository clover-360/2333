/* AI Chat 前端交互逻辑（接入星火大模型 /spark/chat/stream 流式接口） */

// ============ DOM 元素 ============
const $ = (id) => document.getElementById(id);

const sidebar = $('sidebar');
const conversationList = $('conversationList');
const messagesContainer = $('messagesContainer');
const promptInput = $('promptInput');
const sendBtn = $('sendBtn');
const loadingIndicator = $('loadingIndicator');
const newChatBtn = $('newChatBtn');
const newChatBtnTop = $('newChatBtnTop');
const clearBtn = $('clearBtn');

// ============ 状态 ============
let currentSessionId = null;
let sessions = {};
let isGenerating = false;

// ============ 接口配置 ============
// 后端服务地址（Flask 监听 0.0.0.0:6008）
const API_BASE = 'http://localhost:6008';

// ============ 工具函数 ============
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============ 会话管理 ============
function createSession() {
  const id = 'session-' + Date.now();
  sessions[id] = { title: '新对话', messages: [], time: '刚刚' };
  return id;
}

function renderConversations() {
  conversationList.innerHTML = '';
  const ids = Object.keys(sessions);
  if (ids.length === 0) {
    conversationList.innerHTML = '<div class="empty-sessions">暂无历史会话</div>';
    return;
  }
  ids.reverse().forEach((id) => {
    const session = sessions[id];
    const item = document.createElement('div');
    item.className = 'conversation' + (id === currentSessionId ? ' active' : '');
    item.dataset.id = id;
    item.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '<span class="conv-title"></span>' +
      '<span class="conv-time"></span>';
    item.querySelector('.conv-title').textContent = session.title;
    item.querySelector('.conv-time').textContent = session.time;
    item.addEventListener('click', () => switchSession(id));
    conversationList.appendChild(item);
  });
}

function switchSession(id) {
  currentSessionId = id;
  renderMessages(id);
  renderConversations();
  if (window.innerWidth <= 768) sidebar.classList.remove('open');
}

function newChat() {
  const id = createSession();
  currentSessionId = id;
  renderMessages(id);
  renderConversations();
  promptInput.focus();
}

// ============ 消息渲染 ============
function renderMessages(sessionId) {
  messagesContainer.innerHTML = '';
  const session = sessions[sessionId];

  if (!session.messages.length) {
    messagesContainer.innerHTML =
      '<div class="welcome">' +
      '<div class="welcome-logo">🤖</div>' +
      '<h2>今天有什么可以帮您？</h2>' +
      '<p class="welcome-sub">我可以协助您撰写内容、回答问题、编写代码等</p>' +
      '<div class="suggestion-grid">' +
      '<button class="suggestion-card" data-prompt="帮我制定一个学习计划"><span class="s-card-icon">📚</span><span>制定学习计划</span></button>' +
      '<button class="suggestion-card" data-prompt="用通俗的语言解释什么是量子计算"><span class="s-card-icon">🔬</span><span>解释复杂概念</span></button>' +
      '<button class="suggestion-card" data-prompt="帮我写一段JavaScript代码实现防抖函数"><span class="s-card-icon">💻</span><span>编写代码</span></button>' +
      '<button class="suggestion-card" data-prompt="给我一些生活建议和灵感"><span class="s-card-icon">💡</span><span>创意灵感</span></button>' +
      '</div></div>';
    messagesContainer.querySelectorAll('.suggestion-card').forEach((card) => {
      card.addEventListener('click', () => sendMessage(card.dataset.prompt));
    });
    return;
  }

  session.messages.forEach((msg) => {
    messagesContainer.appendChild(createMessageEl(msg));
  });
  scrollToBottom();
}

function createMessageEl(msg) {
  const isUser = msg.role === 'user';
  const row = document.createElement('div');
  row.className = 'message-row ' + (isUser ? 'user' : 'assistant');

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = isUser ? '我' : '🤖';

  const content = document.createElement('div');
  content.className = 'message-content';

  const text = document.createElement('div');
  text.className = 'message-text';
  text.innerHTML = formatMessage(msg.content);
  content.appendChild(text);

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = '📋 复制';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(msg.content.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''))).then(() => {
      copyBtn.textContent = '✅ 已复制';
      setTimeout(() => (copyBtn.textContent = '📋 复制'), 1500);
    });
  });
  content.appendChild(copyBtn);

  row.appendChild(avatar);
  row.appendChild(content);
  return row;
}

function formatMessage(text) {
  const codeBlockRegex = /```([\s\S]*?)```/g;
  let formatted = text.replace(codeBlockRegex, (match, code) => {
    return '<pre><code>' + escapeHtml(code) + '</code></pre>';
  });
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

// ============ 输入处理 ============
promptInput.addEventListener('input', () => {
  promptInput.style.height = 'auto';
  promptInput.style.height = Math.min(promptInput.scrollHeight, 160) + 'px';
  sendBtn.disabled = !promptInput.value.trim().length || isGenerating;
});

promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

// ============ 发送消息 ============
function sendMessage(text) {
  const message = (text || promptInput.value.trim()).trim();
  if (!message || isGenerating) return;

  if (!currentSessionId || !sessions[currentSessionId]) {
    currentSessionId = createSession();
  }
  const session = sessions[currentSessionId];
  session.messages.push({ role: 'user', content: message });

  if (session.title === '新对话') {
    session.title = message.length > 18 ? message.slice(0, 18) + '…' : message;
  }
  session.time = '刚刚';

  renderMessages(currentSessionId);
  promptInput.value = '';
  promptInput.style.height = 'auto';
  promptInput.focus();

  generateReply(session);
}

// ============ 生成回复（调用 /spark/chat/stream 流式接口）============
async function generateReply(session) {
  isGenerating = true;
  sendBtn.disabled = true;
  loadingIndicator.classList.add('visible');
  scrollToBottom();

  // 构造发给星火的消息列表（当前会话全部消息，保持上下文）
  const messages = session.messages.map((m) => ({ role: m.role, content: m.content }));

  // 预先创建空的助手消息气泡，流式逐 chunk 填充
  const assistantMsg = { role: 'assistant', content: '' };
  session.messages.push(assistantMsg);
  renderMessages(currentSessionId);
  const lastRow = messagesContainer.lastElementChild;
  const textEl = lastRow ? lastRow.querySelector('.message-text') : null;

  try {
    const resp = await fetch(API_BASE + '/spark/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!resp.ok) {
      throw new Error('接口返回错误（HTTP ' + resp.status + '）');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // 按行解析 SSE（每行形如 data: {...}）
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留最后不完整的行
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          // 星火 OpenAI 兼容格式：choices[0].delta.content
          const delta = json.choices && json.choices[0] && json.choices[0].delta;
          if (delta && delta.content) {
            assistantMsg.content += delta.content;
            if (textEl) textEl.innerHTML = formatMessage(assistantMsg.content);
            scrollToBottom();
          }
        } catch (e) {
          // 非 JSON 片段，忽略
        }
      }
    }
  } catch (err) {
    assistantMsg.content = assistantMsg.content || ('（请求失败：' + err.message + '）');
    if (textEl) textEl.innerHTML = formatMessage(assistantMsg.content);
  } finally {
    isGenerating = false;
    loadingIndicator.classList.remove('visible');
    sendBtn.disabled = !promptInput.value.trim().length;
    renderConversations();
  }
}

// ============ 事件绑定 ============
sendBtn.addEventListener('click', () => sendMessage());
newChatBtn.addEventListener('click', newChat);
newChatBtnTop.addEventListener('click', newChat);

clearBtn.addEventListener('click', () => {
  if (!currentSessionId || !sessions[currentSessionId]) return;
  if (!confirm('确定要清空当前对话吗？')) return;
  sessions[currentSessionId].messages = [];
  renderMessages(currentSessionId);
});

// ============ 初始化 ============
(function init() {
  newChat();
})();
