# 聊天后端 (Chat Backend)

一个基于 Node.js 的强大实时消息后端，使用 Express 和 Socket.io 构建。旨在与 Windows 兼容且易于设置。

## 功能特性

- **实时消息**：由 Socket.io 驱动。
- **图片支持**：支持通过 base64 字符串发送和接收图片。
- **消息撤回**：用户可以在 2 分钟内撤回已发送的消息。
- **增强型用户资料**：支持设置昵称和自定义头像。
- **CORS 支持**：已配置跨域请求，方便前后端分离开发。
- **房间支持**：用户可以加入特定房间并在其中发送消息。
- **CI/CD 就绪**：包含 GitHub Action 工作流配置。

## 前置条件

- [Node.js](https://nodejs.org/) (建议 v18 或更高版本)
- [npm](https://www.npmjs.com/) (随 Node.js 一起安装)

## 安装指南 (Windows)

1. **克隆或下载**：确保项目文件位于文件夹中（例如 `C:\projects\chat-backend`）。
2. **打开终端**：打开命令提示符 (cmd) 或 PowerShell。
3. **导航至项目目录**：
   ```cmd
   cd path\to\projects\chat-backend
   ```
4. **安装依赖**：
   ```cmd
   npm install
   ```

## 运行服务器

以生产模式启动服务器：
```cmd
npm start
```

服务器默认将在 `3000` 端口启动。您可以通过设置 `PORT` 环境变量来更改端口：
```cmd
set PORT=4000 && npm start
```

## Socket.io 事件

### 客户端到服务器 (Client to Server)
- **set_user_info**: 发送 `{ nickname, avatar }` 来设置用户信息。
- **join_room**: 发送房间名称 (字符串)。
- **send_message**: 发送 `{ room, message, image }`。
- **message_recall**: 发送 `{ msgId }` 来撤回之前发送的消息。

### 服务器到客户端 (Server to Client)
- **receive_message**: 监听并接收 `{ id, room, user, avatar, message, image, timestamp }`。
- **message_recalled**: 监听 `{ msgId }` 以从 UI 中移除已撤回的消息。
- **error**: 监听错误消息。

## 项目结构

- `server.js`: Express 和 Socket.io 服务器的主入口。
- `package.json`: 项目配置和依赖管理。
- `.github/workflows/`: CI/CD 配置。
- `README.md`: 英文文档。
- `README_CN.md`: 中文文档。
