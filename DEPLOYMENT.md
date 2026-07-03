# 线上部署说明

这个聊天室不是纯静态网站，它需要 Node.js 常驻服务来维持 WebSocket 连接。推荐部署到支持长期运行进程和 WebSocket 的平台，例如 Render、Railway、Fly.io、Zeabur、阿里云 ECS、火山引擎 ECS。

不推荐直接部署到 Vercel Serverless，因为 Serverless Function 通常不适合长期 WebSocket 连接。

## 方案一：Render Web Service

1. 将项目推送到 GitHub/GitLab。
2. 在 Render 创建 `Web Service`，选择该仓库。
3. 配置：
   - Runtime: `Node`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
   - Node Version: `20` 或更高
4. 环境变量：
   - `NODE_ENV=production`
   - `PORT` 由 Render 自动注入，不需要手动设置
5. 部署完成后访问 Render 分配的 HTTPS 域名。

## 方案二：Railway

1. 将项目推送到 GitHub/GitLab。
2. 在 Railway 新建项目并导入仓库。
3. 配置：
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
4. 环境变量：
   - `NODE_ENV=production`
5. Railway 会自动提供公网域名，WebSocket 会走同域名的 `/ws`。

## 方案三：Docker 部署到云服务器

服务器需要安装 Docker，并开放公网端口。

```bash
docker build -t realtime-chat .
docker run -d --name realtime-chat -p 3001:3001 -e NODE_ENV=production realtime-chat
```

访问：

```text
http://服务器公网IP:3001
```

如果要绑定域名，建议在服务器前面加 Nginx，并启用 HTTPS。Nginx 需要转发 WebSocket：

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## 本项目的生产命令

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

生产环境下，Express 会在同一个端口提供：

- 前端页面：`/`
- 聊天室页面：`/chat`
- 健康检查：`/api/health`
- WebSocket：`/ws`

## 后续接入真实字节/阿里登录

当前线上部署后仍然是昵称模式。真实字节/阿里登录需要先申请对应平台的 OAuth/OIDC/SSO 应用，拿到回调地址、客户端 ID、客户端密钥和用户信息接口后，再接入认证层。
