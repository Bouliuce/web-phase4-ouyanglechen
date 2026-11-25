# 实验报告索引 (Web + AI 智能助手)

## 1. 项目简介
这是一个结合了 Web 全栈与大模型的智能实验报告管理系统。用户不仅可以在网页上手动增删改查报告，还能通过“AI 助手”使用自然语言（如：“帮我加一条明天交实验报告”）让大模型自动调用后端接口，操作数据落盘。

**线上网址**：https://bouliuce.github.io/web-phase4-ouyanglechen/
**仓库地址**：https://github.com/Bouliuce/web-phase4-ouyanglechen

## 2. 技术栈
* **前端**：原生 HTML / CSS / JavaScript（Fetch API、流式读取）
* **后端**：Node.js + Express
* **数据库**：本地 JSON 文件落盘 (`data.json`)
* **大模型**：DeepSeek API (兼容 OpenAI 格式，Function Calling + 流式输出)
* **部署**：前端 GitHub Pages

## 3. 本地运行步骤
1. 克隆仓库并安装依赖：
   ```bash
   npm install