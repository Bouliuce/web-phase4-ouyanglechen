## 接口文档表

| 方法 | 路径 | 参数 (JSON) | 返回示例 |
| :--- | :--- | :--- | :--- |
| GET | `/api/reports` | 无 | `{ "code": 200, "data": [ { "id": 1, "title": "报告", "status": "已完成" } ], "msg": "success" }` |
| POST | `/api/reports` | `{ "title": "字符串", "status": "字符串" }` | `{ "code": 200, "data": { "id": 1234, "title": "报告", "status": "已完成" }, "msg": "新增成功" }` |
| DELETE | `/api/reports/:id` | URL 传参：`:id` 为数字 | `{ "code": 200, "data": null, "msg": "删除成功" }` |