// 1. 后端地址抽成配置项（任务要求）
const API_BASE_URL = 'http://localhost:3000/api/reports';

// 获取 DOM 元素
const listEl = document.getElementById('report-list');
const stateMsgEl = document.getElementById('state-msg');
const titleInput = document.getElementById('title-input');
const statusInput = document.getElementById('status-input');
const addBtn = document.getElementById('add-btn');

// Tab 切换逻辑（保留之前的）
const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabs.forEach(b => b.classList.toggle('active', b === btn));
    panels.forEach(p => p.classList.toggle('active', p.id === target));
  });
});

// 2. 渲染列表（包含 loading / empty / error 三态）
async function fetchList() {
  // 状态 1：加载中
  stateMsgEl.textContent = '加载中...';
  stateMsgEl.style.color = '#666';
  listEl.innerHTML = '';

  try {
    const res = await fetch(API_BASE_URL);
    const json = await res.json();

    if (json.code === 200) {
      const data = json.data;
      
      // 状态 2：空数据
      if (data.length === 0) {
        stateMsgEl.textContent = '暂无数据，请添加一条吧~';
        return;
      }

      // 有数据：清除提示，渲染列表
      stateMsgEl.textContent = '';
      data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${item.title} —— ${item.status}</span>
          <button onclick="deleteReport(${item.id})" style="margin-left: 10px; color: red; cursor: pointer;">删除</button>
        `;
        listEl.appendChild(li);
      });
    }
  } catch (error) {
    // 状态 3：请求失败
    stateMsgEl.textContent = '请求失败，请检查后端服务是否启动。';
    stateMsgEl.style.color = 'red';
    // 加个重试按钮
    const retryBtn = document.createElement('button');
    retryBtn.textContent = '重试';
    retryBtn.style.marginLeft = '10px';
    retryBtn.onclick = fetchList;
    stateMsgEl.appendChild(retryBtn);
  }
}

// 3. 新增数据
addBtn.addEventListener('click', async () => {
  const title = titleInput.value.trim();
  const status = statusInput.value;

  if (!title) {
    alert('请输入报告名称！');
    return;
  }

  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status })
    });
    const json = await res.json();
    
    if (json.code === 200) {
      titleInput.value = ''; // 清空输入框
      fetchList(); // 新增成功后自动刷新列表
    } else {
      alert(json.msg);
    }
  } catch (error) {
    alert('新增失败，请检查网络');
  }
});

// 4. 删除数据（注意这里挂在 window 上，因为 HTML 里用了 onclick）
window.deleteReport = async function(id) {
  if (!confirm('确定要删除吗？')) return;
  
  try {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (json.code === 200) {
      fetchList(); // 删除成功后自动刷新
    }
  } catch (error) {
    alert('删除失败');
  }
};

// 页面加载完成后，立即拉取一次列表
fetchList();
// --- AI 对话功能逻辑 ---
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');

let chatHistory = []; // 存储对话上下文
let controller = null; // 用于中止请求

// 渲染对话气泡
function appendMessage(role, text) {
  const div = document.createElement('div');
  div.style.marginBottom = '10px';
  div.innerHTML = `<strong>${role === 'user' ? '我' : 'AI'}:</strong> <span>${text}</span>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight; // 自动滚动到底部
  return div.querySelector('span'); // 返回 span 以便后续流式追加文字
}

// 发送消息
sendBtn.addEventListener('click', async () => {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  appendMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  // 准备接收 AI 回复的容器
  const aiSpan = appendMessage('assistant', '');
  
  // 切换按钮状态
  sendBtn.style.display = 'none';
  stopBtn.style.display = 'inline-block';
  controller = new AbortController(); // 创建 AbortController 用于停止

  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory }),
      signal: controller.signal // 绑定中止信号
    });

    if (!res.ok) {
      const errMsg = await res.text();
      aiSpan.textContent = `[错误]: ${errMsg}`;
      aiSpan.style.color = 'red';
      return;
    }

    // 处理流式输出
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullReply = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunkText = decoder.decode(value, { stream: true });
      fullReply += chunkText;
      aiSpan.textContent = fullReply; // 逐字更新页面
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    // 将 AI 的完整回复加入历史记录
    chatHistory.push({ role: 'assistant', content: fullReply });

  } catch (error) {
    if (error.name === 'AbortError') {
      aiSpan.textContent += ' [已停止]';
    } else {
      aiSpan.textContent = '[网络错误] 请检查后端是否启动';
      aiSpan.style.color = 'red';
    }
  } finally {
    sendBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
  }
});

// 停止生成
stopBtn.addEventListener('click', () => {
  if (controller) controller.abort();
});