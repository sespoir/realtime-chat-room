---
title: Realtime Chat Room
emoji: 📊
colorFrom: yellow
colorTo: indigo
sdk: docker
pinned: false
license: mit
---

# Realtime Chat Room

一个基于 React、Express 和 WebSocket 的实时房间制聊天室。用户输入房间号和昵称后进入指定房间，实时发送和接收消息；同一房间会保留最近消息，重新进入后可以看到之前的聊天内容。聊天输入区内置了初步表情包快捷发送，聊天页右侧提供抛硬币、掷骰子、石头剪刀布和房间同步五子棋工具。

## 本地运行

```bash
npm install
npm run dev
```

## 生产运行

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

## Hugging Face Spaces

本项目使用 Docker Space，服务监听端口为 `7860`。

健康检查路径：`/api/health`
