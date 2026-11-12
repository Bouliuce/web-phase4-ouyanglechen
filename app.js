// Tab 切换
const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabs.forEach(b => b.classList.toggle('active', b === btn));
    panels.forEach(p => p.classList.toggle('active', p.id === target));
  });
});

// 列表先写死，任务3再改成 fetch 接口
const reports = [
  { id: 1, title: '实验一：C 语言基础', status: '已完成' },
  { id: 2, title: '实验二：命令行项目', status: '进行中' },
  { id: 3, title: '实验三：AI Agent 实操', status: '已完成' }
];

const list = document.getElementById('report-list');

reports.forEach(r => {
  const li = document.createElement('li');
  li.textContent = `${r.title} —— ${r.status}`;
  list.appendChild(li);
});