## 后端改进讲解（25.8.29 记录）

本文记录 FlowMind 从本地开发到云端部署的全过程，按 **“先做了啥 → 遇到啥问题 → 怎么改 → 为什么这样改”** 的脉络，展示 Render / Atlas / MongoDB / Netlify 的联动与配置逻辑。  

---

### 1. 后端（从能跑到规范）
- **先做了啥**：写几段 JS 接口先跑起来  
- **遇到的问题**：结构松散，不好扩展；缺乏安全/限流/错误处理  
- **怎么改**：  
  - 上 Express，拆分路由 `/api/auth`、`/api/users`、`/api/ai`  
  - 中间件：helmet、rate-limit、CORS、cookie-parser、404/错误处理  
  - `.env` 管端口和连接串，固定端口 5050，健康检查 `/health`  
- **为什么这样改**：标准化、可维护，方便后续对接前端与数据库  

---

### 2. 前端本地接入后端
- **先做了啥**：Vite 代理 `/api → http://localhost:5050`  
- **遇到的问题**：缺图标导致白屏；登录空输入也能进  
- **怎么改**：补齐 `LogOut/Mail/Lock` 导出；认证逻辑改用 token 判断  
- **为什么这样改**：保证前端运行稳定，认证和后端逻辑对齐  

---

### 3. 本地接上 MongoDB
- **先做了啥**：本地 MongoDB，连接串 `mongodb://127.0.0.1:27017/flowmind`  
- **遇到的问题**：Express 5 与 `express-mongo-sanitize` 冲突  
- **怎么改**：自定义 sanitize，仅清理 `req.body` / `req.params`  
- **为什么这样改**：既防注入又兼容 Express 5  

---

### 4. 部署前端到 Netlify
- **先做了啥**：前端推到 Netlify  
- **遇到的问题**：子路由刷新 404；接口请求 `localhost:5050` 线上不可用  
- **怎么改**：加 `_redirects`；后端与数据库迁到 Render + Atlas  
- **为什么这样改**：前端在云端必须访问公网后端  

---

### 5. 上云：Render（后端） + Atlas（数据库）
- **Atlas**：建 M0 集群、用户、放行 IP，拿连接串  
- **Render**：建 Web Service，配置环境变量（PORT, MONGODB_URI, JWT_SECRET, FRONTEND_URL）  
- **遇到的问题**：CORS、邮件链接指向 localhost  
- **怎么改**：CORS 放行 Netlify 域名，邮件模板改用 FRONTEND_URL  
- **为什么这样改**：保证跨域安全，验证/重置流程回到线上前端  

---

### 6. 前端切到线上后端
- **先做了啥**：Netlify 构建（Base=frontend, Publish=dist, VITE_API_BASE=Render地址）  
- **遇到的问题**：本地打包报错  
- **怎么改**：统一用 Netlify 云端构建  
- **为什么这样改**：环境一致，避免本地差异  

---

### 7. 最终联动验证
- Render `/health` → OK  
- Netlify 前端 → Render 后端 → Atlas 数据库  
- 刷新不 404（`_redirects`），注册/登录认证闭环  

---

### 核心逻辑图
- **本地**：Vite → localhost 后端 → 本地 MongoDB  
- **生产**：Netlify（前端） → Render（后端） → Atlas（数据库）  
  - 前端：`VITE_API_BASE=Render后端/api`  
  - 后端：`MONGODB_URI=Atlas连接串`，CORS 放行 Netlify 域名  
  - `_redirects` 保证 SPA 路由刷新不 404  
