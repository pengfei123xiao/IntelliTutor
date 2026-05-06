# Web 能力迁移到小程序 / App 的策略

## 结论

移动端不迁移 DeepTutor 的运行时，也不直接复用 Next.js 页面。移动端只做轻量客户端，所有 AI、RAG、知识图谱生成、TTS、测评评分都留在服务端。

## 当前 Web 能力分层

| Web 能力 | 小程序第一版 | iOS App 后续 |
| --- | --- | --- |
| Chat / RAG 对话 | 必做，WebSocket 流式输出 | 必做，体验可更强 |
| Knowledge Base 上传与选择 | 必做，文件从微信聊天/本机选择 | 必做，支持系统文件、拍照扫描 |
| Learning Guide | 必做，展示任务流 | 必做，可做离线提醒和进度缓存 |
| Assessment | 第二步，先接生成题和提交结果 | 必做，适合做完整练习体验 |
| Flashcard | 第二步，做复习卡片 | 必做，可接推送和间隔复习 |
| Parent Report | 第一版保留入口，后端补齐后接入 | 必做，支持推送通知 |
| Knowledge Graph | 不搬完整大图，只做局部路径 | 可做交互更强的图谱浏览 |
| Settings / Plugin Playground | 不迁移 | 不迁移 |
| Teacher / Admin | 留在 Web | 留在 Web 或单独后台 App |

## 推荐端架构

```text
微信小程序 / iOS App
  - 登录
  - 学习入口
  - 对话/测评/复习
  - 家长看板
  - 本地缓存少量会话状态

API Gateway / FastAPI
  - 微信登录换 openid
  - 用户、角色、权限
  - REST + WebSocket
  - 文件上传
  - 内容安全审核

DeepTutor / IntelliTutor Core
  - LLM
  - RAG
  - Capabilities
  - 知识图谱
  - 学习路径
  - 测评与周报
```

## 小程序规范约束

- 使用独立小程序目录：`miniprogram/`
- API 地址集中在 `config/env.js`
- 请求统一通过 `utils/api.js`
- WebSocket 统一通过 `utils/socket.js`
- 页面不直接拼接后端域名
- 不把 API key 放到端侧
- 不在端侧运行 LLM、Embedding 或 RAG
- 上线必须使用 HTTPS / WSS 合法域名
- 用户上传内容必须经过后端鉴权、大小限制、类型限制和内容安全策略

## 后端需要补齐

1. 微信登录接口：`POST /api/v1/auth/wechat/login`
2. 用户角色：student / parent / teacher
3. 学生与家长绑定关系
4. 按用户隔离知识库和会话
5. 内容安全审核队列
6. parent-report capability 的真实接口
7. assessment / flashcard 的移动端 API 契约
8. 移动端错误码和限流策略

已提供的临时移动端适配层位于后端：

- `deeptutor/api/routers/mobile.py`
- 注册前缀：`/api/v1/mobile`

它负责让小程序先跑通开发联调，不等于完整生产用户系统。

## App 端路线

如果后续直接做 iOS App，建议用 SwiftUI，而不是 WebView 壳：

- SwiftUI 负责原生体验、推送、音频、离线缓存
- FastAPI 后端继续复用
- WebSocket 协议继续复用
- 端侧只缓存学习状态，不保存敏感模型密钥

React Native / Expo 也可行，但当前仓库没有共享 UI 组件的现实基础。为了产品质感和长期维护，SwiftUI 更合适。
