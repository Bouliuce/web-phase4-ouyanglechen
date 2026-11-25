require('dotenv').config(); // 必须在最顶部
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const OpenAI = require('openai');

const app = express();
const PORT = 3000;
const DATA_FILE = './data.json';

// 中间件
app.use(cors());
app.use(express.json());

// 初始化 DeepSeek 客户端
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com'
});

// 工具函数：读取和写入数据
function readData() {
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (error) {
    return [];
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ================= 基础增删查接口 =================
app.get('/api/reports', (req, res) => {
  const list = readData();
  res.json({ code: 200, data: list, msg: 'success' });
});

app.post('/api/reports', (req, res) => {
  const { title, status } = req.body || {};
  if (!title || !status) return res.status(400).json({ code: 400, msg: '参数缺失' });
  
  const list = readData();
  const newItem = { id: Date.now(), title, status };
  list.push(newItem);
  writeData(list);
  res.json({ code: 200, data: newItem, msg: '新增成功' });
});

app.delete('/api/reports/:id', (req, res) => {
  const id = Number(req.params.id);
  const list = readData();
  const newList = list.filter(item => item.id !== id);
  writeData(newList);
  res.json({ code: 200, msg: '删除成功' });
});

// 4. PUT 修改接口
app.put('/api/reports/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, status } = req.body || {};

  if (!title || !status) {
    return res.status(400).json({ code: 400, msg: '参数缺失' });
  }

  const list = readData();
  const index = list.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ code: 404, msg: '找不到这条数据' });
  }

  // 更新数据并落盘
  list[index].title = title;
  list[index].status = status;
  writeData(list);

  res.json({ code: 200, msg: '修改成功' });
});

// ================= AI 工具调用与对话接口 =================

// 1. 定义工具
const tools = [
  {
    type: 'function',
    function: {
      name: 'add_report',
      description: '向系统中添加一条新的实验报告记录。当用户说“加一条”、“新增”、“帮我记一下”时必须调用此工具。',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '报告的名称' },
          status: { type: 'string', description: '报告的状态，只能是：未开始、进行中、已完成' }
        },
        required: ['title', 'status']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_reports',
      description: '查询系统中当前所有的实验报告记录。当用户问“有哪些”、“查一下”时必须调用此工具。',
      parameters: { type: 'object', properties: {} }
    }
  }
];

// 2. 对话接口
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const recentMessages = messages.slice(-6); // 限制上下文长度

    const systemPrompt = {
      role: 'system',
      content: '你是一个智能实验报告助手。你可以回答用户问题，并根据用户的指令调用工具来添加或查询报告。回答要简洁友好。'
    };

    // 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const currentMessages = [systemPrompt, ...recentMessages];

    // 第一步：让模型判断是否调用工具 (非流式)
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: currentMessages,
      tools: tools,
      tool_choice: 'auto'
    });

    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      currentMessages.push(responseMessage);

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        let functionArgs = {};
        try {
          functionArgs = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("解析参数失败", e);
        }
        
        let functionResult = '';

        // 把工具调用过程直接推给前端显示
        res.write(`\n\n> ⚙️ 系统日志：AI 触发了工具 [${functionName}]，参数：${JSON.stringify(functionArgs)}\n\n`);

        // 执行真实的数据操作
        if (functionName === 'add_report') {
          const list = readData();
          list.push({ id: Date.now(), title: functionArgs.title || '未命名', status: functionArgs.status || '未开始' });
          writeData(list);
          functionResult = '新增成功！';
        } else if (functionName === 'query_reports') {
          const list = readData();
          functionResult = JSON.stringify(list);
        }

        // 把结果回填给模型
        currentMessages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: functionResult
        });
      }

      // 第二步：模型拿到数据后，流式总结给用户
      const stream = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: currentMessages,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) res.write(content);
      }

    } else {
      // 普通聊天，不需要工具，直接流式输出
      const stream = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: currentMessages,
        stream: true
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) res.write(content);
      }
    }

    res.end();
  } catch (error) {
    console.error('AI 接口报错:', error);
    res.status(500).send('服务器开小差了，请稍后重试');
  }
});

// ================= 全局错误处理与服务启动 =================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ code: 500, data: null, msg: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
});