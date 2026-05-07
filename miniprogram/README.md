# IntelliTutor WeChat Mini Program

原生微信小程序客户端，作为 IntelliTutor 的学生端、教师端和家长端移动入口。

## 目录定位

这个目录是独立的小程序工程，不复用 Next.js 页面。小程序优先通过 CloudBase 云函数 `apiProxy` 调用移动端适配接口；本地 FastAPI 仍作为开发兜底。

- Chat / RAG: 云函数 `/api/v1/mobile/chat/turn`，本地兜底 `/api/v1/ws` WebSocket
- Knowledge Base: `/api/v1/knowledge/*`
- Guide: `/api/v1/guide/*`
- Sessions: `/api/v1/sessions/*`
- Mobile adapter: `/api/v1/mobile/*`

## 本地运行

1. 如需本地 FastAPI 兜底，启动后端：

   ```bash
   cd vendor/DeepTutor
   deeptutor serve --port 3001
   ```

2. 用微信开发者工具导入本目录：

   ```text
   miniprogram/
   ```

3. 云函数测试配置在 `config/env.js`：

   ```js
   cloudEnvId: "cloud1-d0gxrvlbc5c9f8145",
   useCloudFunctions: true,
   apiBaseUrl: "http://127.0.0.1:3001"
   ```

4. 如果关闭 `useCloudFunctions` 走本地 HTTP，本地调试时需要在微信开发者工具里开启“不校验合法域名、web-view、TLS 版本以及 HTTPS 证书”。

## 云函数部署

云函数位于：

```text
cloud/functions/apiProxy
```

部署命令：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env cloud1-d0gxrvlbc5c9f8145 \
  --names apiProxy \
  --remote-npm-install \
  --project "/Users/iguppp/Library/Mobile Documents/com~apple~CloudDocs/代码备份/IntelliTutor/miniprogram" \
  --lang zh
```

当前目标环境 `cloud1-d0gxrvlbc5c9f8145` 的 `apiProxy` 云函数已通过腾讯云 SCF API 更新部署；测试期数据通过 `/api/v1/mobile/setup/seed` 写入，移动端页面默认走云函数优先、演示降级兜底。

## 上线前必须补齐

- 小程序 `appid`
- 已备案 HTTPS API 域名
- WebSocket 合法域名
- 文件上传合法域名
- 微信登录态绑定后端用户
- 内容安全审核
- 支付/订阅能力
- 未成年人隐私与家长授权流程

## 迁移原则

Web 端是教师端/管理端和功能参考；小程序端只迁移移动高频路径：

1. 学生开始学习
2. AI 带读对话
3. 上传/选择学习材料
4. 测评与错题回顾
5. 家长查看进度周报

不要把 Web 的设置页、插件调试台、复杂图谱全量搬进小程序；移动端只提供可执行入口、状态和继续学习动作。

## 移动端适配接口

当前后端已新增移动端薄适配层：

- `POST /api/v1/mobile/auth/wechat/login`
- `GET /api/v1/mobile/overview`
- `POST /api/v1/mobile/knowledge/create-empty`
- `POST /api/v1/mobile/guide/today`
- `GET /api/v1/mobile/parent/report`

其中微信登录目前是开发占位实现。上线前必须替换为服务端 `code2Session`，不能在小程序端保存 AppSecret。
