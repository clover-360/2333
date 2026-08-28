/* AI Chat 前端交互逻辑（演示版） */

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

// ============ 演示 AI 回复库 ============
const demoReplies = [
  '这是一个很好的问题！从我的角度来看，可以从以下几个方面来思考：首先，明确目标非常关键，它会帮助我们把复杂的问题拆解成一个个可执行的小步骤。其次，持续迭代和反馈能让我们不断优化方案。最后，保持学习和开放的心态同样重要。',
  '好的，我理解你想了解的内容。简单来说，我们可以把它类比成日常生活中的一个场景。当你掌握了核心逻辑之后，剩下的就是不断练习和验证。如果你有更具体的需求，欢迎继续补充细节，我可以为你提供更针对性的建议。',
  '针对你的问题，我建议先从基础概念入手打好地基，再逐步深入到复杂场景。实际应用中，做好数据整理和边界情况处理会避免很多坑。另外，可以参考一些优秀的开源实践来提升效率。需要我展开讲讲某个具体环节吗？',
  '这是个值得深入探讨的话题。结合你提到的背景，我的建议是分三步走：第一步收集信息，第二步制定方案，第三步执行并复盘。每一步都可以再细化出相应的检查点。如果你告诉我更具体的约束条件，我可以帮你整理成一个可操作的计划清单。',
];

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
  content.innerHTML = formatMessage(msg.content);

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

// ============ 生成回复（演示）============
function generateReply(session) {
  isGenerating = true;
  sendBtn.disabled = true;
  loadingIndicator.classList.add('visible');
  scrollToBottom();

  const delay = 800 + Math.random() * 1200;
  setTimeout(() => {
    const reply = demoReplies[Math.floor(Math.random() * demoReplies.length)];
    session.messages.push({ role: 'assistant', content: reply });
    isGenerating = false;
    loadingIndicator.classList.remove('visible');
    renderMessages(currentSessionId);
    sendBtn.disabled = !promptInput.value.trim().length;
    renderConversations();
  }, delay);
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
