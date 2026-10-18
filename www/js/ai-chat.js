// js/ai-chat.js
const chatStore = localforage.createInstance({ name: 'notefull', storeName: 'ai_chats' });
const chatUid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const chatEsc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let currentChat = null;
let isStreaming = false;


const isThinkOn = () => localStorage.getItem('aiThinkMode') === '1';

// ── persistence ──
async function listChats() {
  const all = [];
  await chatStore.iterate(v => { if (v && v.messages) all.push(v); });
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function persistChat(chat = currentChat) {
  if (!chat) return;
  chat.updatedAt = Date.now();
  if (chat.messages.length && chat.title === 'New chat') {
    chat.title = (chat.messages.find(m => m.role === 'user')?.content || 'New chat').slice(0, 40);
  }
  await chatStore.setItem(chat.id, chat);
  renderSidebar();
}

// ── session ──
async function openChat(id) {
  currentChat = id ? await chatStore.getItem(id) : null;
  if (!currentChat) {
    currentChat = { id: chatUid(), title: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
  }
  renderChat();
  renderSidebar();
  return currentChat;
}

async function removeChat(id) {
  await chatStore.removeItem(id);
  if (currentChat && currentChat.id === id) await openChat(null);
  else renderSidebar();
}

// ── rendering ──
function bubbleEl(id) { return document.querySelector(`.msg-bubble[data-mid="${id}"]`); }

function scrollToBottom(force = false) {
  const sec = document.getElementById('scrollSection');
  if (!sec) return;
  const nearBottom = sec.scrollHeight - sec.scrollTop - sec.clientHeight < 120;
  if (force || nearBottom) sec.scrollTop = sec.scrollHeight;
}

function renderMsg(m, live = false) {
  const sec = document.getElementById('scrollSection');
  const welcome = document.getElementById('welcomeMsg');
  if (welcome && !welcome.classList.contains('hidden')) welcome.classList.add('hidden');

  const wrap = document.createElement('div');
  wrap.className = `chat-msg ${m.role === 'user' ? 'user' : 'ai'}`;
  wrap.dataset.mid = m.id;
  wrap.innerHTML = m.role === 'user'
    ? `<div class="msg-bubble">${chatEsc(m.content)}</div>`
    : `<div class="msg-bubble" data-mid="${m.id}">
         <div class="msg-tool hidden"></div>
         <div class="msg-think-wrap hidden">
           <button class="msg-think-head">✦ Thought process</button>
           <div class="msg-think hidden"></div>
         </div>
         <div class="msg-text ${live ? 'typing' : ''}">${chatEsc(m.content)}</div>
       </div>`;
  sec.appendChild(wrap);

  wrap.querySelector('.msg-think-head')?.addEventListener('click', e =>
    e.currentTarget.nextElementSibling.classList.toggle('hidden'));

  if (m.role !== 'user' && m.thinking) updateThinking(m.id, m.thinking);
  scrollToBottom(true);
}

function renderChat() {
  const sec = document.getElementById('scrollSection');
  sec.querySelectorAll('.chat-msg').forEach(n => n.remove());
  currentChat.messages.forEach(m => renderMsg(m));
  document.getElementById('welcomeMsg')?.classList.toggle('hidden', currentChat.messages.length > 0);
}

function updateBubble(id, text) {
  const el = bubbleEl(id)?.querySelector('.msg-text');
  if (!el) return;
  el.innerHTML = chatEsc(text);
  scrollToBottom();
}

function updateThinking(id, text) {
  const b = bubbleEl(id);
  if (!b || !text) return;
  const wrap = b.querySelector('.msg-think-wrap');
  const body = b.querySelector('.msg-think');
  if (!wrap || !body) return;
  wrap.classList.remove('hidden');
  body.innerHTML = chatEsc(text);
}

function updateTool(id, label, status) {
  const el = bubbleEl(id)?.querySelector('.msg-tool');
  if (!el) return;
  el.classList.remove('hidden');
  const icon = status === 'running' ? '⚙' : status === 'done' ? '✓' : '✗';
  el.innerHTML = `${icon} ${chatEsc(label)}${status === 'running' ? '…' : ''}`;
}

async function renderSidebar() {
  const listEl = document.getElementById('recentChatsList');
  if (!listEl) return;
  const chats = await listChats();
  listEl.innerHTML = chats.length
    ? chats.map(c => `<div class="recent-chat ${currentChat && c.id === currentChat.id ? 'active' : ''}"
          onclick="openChat('${c.id}'); toggleAgentDrawer(false)">${chatEsc(c.title)}</div>`).join('')
    : '<div class="noChatsMessage">No recent chats yet</div>';
}

// ── modal / send state ──
function hideModal() {
  document.getElementById('ai-thinking-modal')?.classList.add('hidden');
}

function setSendState(busy, think = false) {
  document.getElementById('agentSendBtn')?.classList.toggle('disabled', busy);
  const t = document.getElementById('ai-thinking-text');
  if (t && busy) t.textContent = think ? 'Thinking…' : 'Processing';
  document.getElementById('ai-thinking-modal')?.classList.toggle('hidden', !busy);
}

// ── send ──
async function sendPrompt(text) {
// top of ai-chat.js, outside any function


// The only function that touches your storage. Connect it to your notes code.

  const input = document.getElementById('agentPromptInput');
  const prompt = (typeof text === 'string' ? text : (input?.value ?? '')).trim();
  if (!prompt || isStreaming) return;
  if (input) { input.value = ''; if (typeof autoResizeAgentInput === 'function') autoResizeAgentInput(input); }

  if (!currentChat) await openChat(null);
  const chat = currentChat;           // pin: switching chats mid-stream can't corrupt data
  const think = isThinkOn();          // read fresh on every send

  const userMsg = { id: chatUid(), role: 'user', content: prompt, ts: Date.now() };
  chat.messages.push(userMsg);
  await persistChat(chat);
  renderMsg(userMsg);

  const aiMsg = { id: chatUid(), role: 'assistant', content: '', thinking: '', ts: Date.now() };
  chat.messages.push(aiMsg);
  renderMsg(aiMsg, true);

  isStreaming = true;
  setSendState(true, think);

  try {
    // No history: each prompt is sent on its own
    const answer = await askAI(prompt, {
      stream: true,
      thinking: think,
      tools: agentTools || null,
      system: window.AI_SYSTEM_PROMPT || '',
      onToken: (_d, full) => { hideModal(); updateBubble(aiMsg.id, full); },
      onThinking: (txt) => { hideModal(); aiMsg.thinking = txt; updateThinking(aiMsg.id, txt); },
      onStep: ({ label, status }) => { hideModal(); updateTool(aiMsg.id, label, status); }
    });

    aiMsg.content = answer || 'No answer was generated. Try again, or turn off Thinking mode.';
    updateBubble(aiMsg.id, aiMsg.content);
    bubbleEl(aiMsg.id)?.querySelector('.msg-text')?.classList.remove('typing');
    await persistChat(chat);
  } catch (e) {
    const idx = chat.messages.indexOf(aiMsg);
    if (idx !== -1) chat.messages.splice(idx, 1);   // drop the failed AI message
    const b = bubbleEl(aiMsg.id);
    const msg = /not initialized/i.test(e?.message || '')
      ? 'The AI model is not ready yet. Please wait for it to finish loading.'
      : (e?.message || 'Something went wrong');
    if (b) b.innerHTML = `<div class="msg-text msg-error">⚠ ${chatEsc(msg)}</div>`;
    await persistChat(chat);
  } finally {
    isStreaming = false;
    setSendState(false);
  }
}

// ── other functions your HTML references ──
function createNewChat() { openChat(null); toggleAgentDrawer(false); }
function newChat() { openChat(null); }
async function deleteChat() {
  if (!currentChat) return;
  await removeChat(currentChat.id);
}

function handleAgentComposerKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(); }
}

document.addEventListener('DOMContentLoaded', () => {
  openChat(null);
  const tb = document.getElementById('thinkToggleBtn');
  if (tb && localStorage.getItem('aiThinkMode') === '1') tb.classList.add('active');
});

// ── think toggle with slow-mode warning ──
function toggleThinkMode(btn) {
  if (btn.classList.contains('active')) {
    btn.classList.remove('active');
    localStorage.removeItem('aiThinkMode');
    return;
  }
 
    btn.classList.add('active');
    localStorage.setItem('aiThinkMode', '1');
  
}