# AIcode API 接口说明

## 1. 通用约定

### 1.1 基础地址
```
http://<服务器IP>:6008
```
本地开发默认为 `http://localhost:6008`。

### 1.2 统一响应格式
所有 HTTP 接口返回 JSON，结构如下：

```json
{
  "code": 0,
  "msg": "success",
  "data": {}
}
```
- `code`：0 表示成功，非 0 表示错误（见错误码表）
- `msg`：提示信息
- `data`：业务数据，失败时为 `null`

### 1.3 鉴权方式
需登录的接口在请求头携带 token：
```
Authorization: Bearer <token>
```
token 由 `/login` 接口返回，有效期 24 小时，自包含 user_id。

## 2. 接口清单

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 根路径，确认服务启动 | 否 |
| GET | `/health` | 健康检查 | 否 |
| POST | `/register` | 用户注册 | 否 |
| POST | `/login` | 用户登录 | 否 |
| GET | `/me` | 获取当前用户信息 | 是 |
| POST | `/spark/chat/stream` | 星火对话（SSE 流式） | 否 |
| WebSocket | 事件 `spark_chat` | 星火对话（WebSocket） | 否 |

## 3. 接口详情

### 3.1 GET / 根路径
确认服务是否启动。
- 响应：纯文本 `Hello, World!`

### 3.2 GET /health 健康检查
- 响应：
```json
{ "code": 0, "msg": "服务运行中", "data": null }
```

### 3.3 POST /register 用户注册
**请求体：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名（3~64 位，字母/数字/下划线/横线） |
| password | string | 是 | 密码（6~32 位） |
| confirm_password | string | 否 | 确认密码，传入时需与 password 一致 |
| avatar | string | 否 | 头像路径，≤255 字符 |
| preference | string | 否 | 用户喜好（JSON 字符串），≤512 字符 |

**成功响应：**
```json
{ "code": 0, "msg": "注册成功", "data": { "user_id": 1, "username": "testuser" } }
```
密码以 pbkdf2:sha256 哈希存储，`role_id`、`is_disabled` 使用表默认值 0。

### 3.4 POST /login 用户登录
**请求体：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**校验顺序：** IP 锁定 → 用户名格式 → 密码格式 → 用户存在 → 账号禁用 → 密码正确

**成功响应：**
```json
{
  "code": 0,
  "msg": "登录成功",
  "data": { "token": "xxx", "user_id": 1, "username": "testuser" }
}
```
**防暴力破解：** 同一 IP 连续失败 5 次锁定 300 秒。用户不存在或密码错误均返回「用户名或密码错误」（不暴露具体原因，防撞库）。

### 3.5 GET /me 获取当前用户信息
**请求头：** `Authorization: Bearer <token>`

**成功响应：**
```json
{ "code": 0, "msg": "ok", "data": { "user_id": 1, "username": "testuser", "avatar": null } }
```

### 3.6 POST /spark/chat/stream 星火对话（SSE 流式）
**请求体：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| messages | array | 是 | 对话消息列表，元素含 `role`（user/assistant/system）、`content` |
| model | string | 否 | 模型名，默认 `generalv3.5` |
| temperature | float | 否 | 温度，0~1 |
| max_tokens | int | 否 | 最大输出 token 数 |

**响应：** `Content-Type: text/event-stream`，逐行转发星火返回的 SSE 流，每行形如：
```
data: {"choices":[{"delta":{"content":"片段"}}]}
```
以 `data: [DONE]` 结束。前端用 `fetch` + `ReadableStream` 逐 chunk 读取并拼接 `choices[0].delta.content`。

**请求示例：**
```bash
curl -X POST http://localhost:6008/spark/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你是谁"}]}'
```

### 3.7 WebSocket spark_chat 星火对话（WebSocket）
**连接地址：** `ws://<服务器IP>:6008`（socket.io 协议）

**交互流程：**
1. 前端建立 WebSocket 连接
2. 前端 `emit("spark_chat", { messages, model?, ... })` 发起请求
3. 后端逐 chunk `emit("chat_chunk", line)` 回推（`line` 为星火 SSE 行，形如 `data: {...}`）
4. 结束时后端 `emit("chat_done")`
5. 异常时后端 `emit("chat_error", { msg })`

**前端示例：**
```js
const socket = io('http://localhost:6008', { transports: ['websocket'] });
socket.emit('spark_chat', { messages: [{ role: 'user', content: '你是谁' }] });
socket.on('chat_chunk', line => { /* 解析 data: {...} 取 delta.content 追加显示 */ });
socket.on('chat_done', () => { /* 完成 */ });
socket.on('chat_error', err => { /* 错误 */ });
```

## 4. 错误码表

| code | HTTP | 说明 |
|------|------|------|
| 0 | 200 | 成功 |
| 4001 | 400 | 请求体必须为 JSON 格式 |
| 4002 | 400 | 请求体格式错误 |
| 4003 | 400 | 缺少必填字段 |
| 4101 | 400 | 用户名格式错误 |
| 4102 | 400 | 密码格式错误 |
| 4103 | 400 | 两次密码不一致 |
| 4104 | 400 | 头像路径过长 |
| 4105 | 400 | 喜好字段过长 |
| 4201 | 400 | 用户名已存在 |
| 4301 | 429 | 登录失败次数过多（IP 锁定） |
| 4401 | 400 | 用户名或密码错误 |
| 4402 | 400 | 账号已被禁用 |
| 4501 | 401 | 未提供有效的认证 token |
| 4502 | 401 | token 无效或已过期 |
| 4503 | 404 | 用户不存在 |
| 4601 | 400 | 星火请求参数错误 |
| 5000 | 500 | 服务器内部错误 |
| 5001 | 500 | 注册失败（数据库异常） |
