# OpenHub 部署文档（EdgeOne Pages + Supabase）

## 架构

```
[GitHub]──push──▶[GitHub Actions]──deploy──▶[EdgeOne Pages]
                                          │
[GitHub Actions]──定时──▶collect.py──POST──▶[/api/webhook/collect]
                                          │
                                          ▼
                                    [Supabase PG]
                                  (ap-northeast-1)
```

| 组件 | 作用 |
|------|------|
| **GitHub** | 代码仓库（`Charyun/github-discover`）+ CI/CD 平台 |
| **EdgeOne Pages** | Next.js 托管（国内 CDN 边缘节点） |
| **Supabase** | 托管 PostgreSQL 数据库 |
| **GitHub Actions** | 自动化：push 触发部署 + 每日采集 |

---

## 前置条件

- GitHub 账号（仓库 + Secrets）
- 腾讯云账号（EdgeOne Pages 部署）
- Supabase 账号（免费层即可）
- Node.js 22+（本地开发）

---

## 一、Supabase 数据库准备

### 1. 创建项目

https://supabase.com/dashboard → **New Project**：

| 字段 | 值 |
|------|-----|
| Name | `openhub` |
| Database Password | 生成强密码并保存 |
| Region | **Singapore** 或 **Tokyo**（按就近选） |
| Plan | Free |

### 2. 拿到连接串

Project Settings → **Database** → **Connection string** → **URI**：

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**端口必须用 6543**（Transaction pooler，适合 serverless / EdgeOne Pages）。

### 3. 初始化 schema 和 seed

左侧 → **SQL Editor** → New query。依次执行三条 SQL（用同一个 query 窗口，每次 Run 前清空）：

**第 1 步**：启用扩展
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**第 2 步**：建表（复制 `scripts/schema.sql` 全部内容）

**第 3 步**：插入种子数据（复制 `scripts/seed.sql` 全部内容）

执行完后 Table Editor 应看到：`industries` 8 行、`scenes` 25 行。

---

## 二、本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local`（**已被 `.gitignore` 忽略**）：

```bash
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
ADMIN_PASSWORD=dev-password
ADMIN_SECRET=dev-secret-32chars-min-length-please
WEBHOOK_SECRET=dev-webhook-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. 启动

```bash
npm run dev
# → http://localhost:3000
```

---

## 三、EdgeOne Pages 项目配置

### 1. 创建项目

https://console.cloud.tencent.com/edgeone/pages → **Create Project**：

| 字段 | 值 |
|------|-----|
| 项目名 | `openhub` |
| 接入方式 | **手动部署**（不绑定 GitHub，由 GitHub Actions 调 API 部署） |
| 框架 | Next.js（自动识别） |
| 构建命令 | `npm run build` |
| 输出目录 | `.next` |
| Node.js 版本 | 22 |

### 2. 拿到 API Token

Project Settings → **API Tokens** → **Generate**（权限选 **Pages Deploy**）。

复制 token，备用。

### 3. 设置环境变量

项目 → **Environment Variables** → Production：

| 变量 | 值 |
|------|-----|
| `DATABASE_URL` | Supabase 连接串（同本地 `.env.local`） |
| `ADMIN_PASSWORD` | 强密码 |
| `ADMIN_SECRET` | 32+ 随机字符串 |
| `WEBHOOK_SECRET` | 32+ 随机字符串（**和 GitHub Secret 完全相同**） |
| `NEXT_PUBLIC_BASE_URL` | `https://你的域名.edgeone.app` |

---

## 四、GitHub 仓库配置

### 1. 推代码

```bash
git remote add origin https://github.com/Charyun/github-discover.git
git push -u origin main
```

### 2. Secrets

仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**：

| Secret | 值 | 用于 |
|--------|-----|------|
| `EDGEONE_API_TOKEN` | EdgeOne API Token（步骤三.2） | deploy.yml |
| `GH_TOKEN` | GitHub PAT（`public_repo` 权限） | collect.yml |
| `WEBHOOK_URL` | `https://你的域名.edgeone.app/api/webhook/collect` | collect.yml |
| `WEBHOOK_SECRET` | 同 EdgeOne 环境变量里的值 | collect.yml |

---

## 五、部署

### 自动部署

`git push origin main` 触发 `.github/workflows/deploy.yml`：

1. Checkout 代码
2. `npm ci` 安装依赖
3. `npm run build` 构建（用 dummy `DATABASE_URL`，真实 URL 在 EdgeOne 运行时注入）
4. `npx edgeone deploy` 部署到 EdgeOne Pages

### 手动部署

GitHub → **Actions** → **Deploy to EdgeOne Pages** → **Run workflow**。

### 验证

部署完成后访问 EdgeOne 域名：

- [ ] 首页显示 8 个行业
- [ ] `/sitemap.xml` 有内容
- [ ] `/admin` 跳转到登录页，用 `ADMIN_PASSWORD` 登录成功
- [ ] 待审核列表为空（还没采集）

---

## 六、数据采集（GitHub Actions 定时任务）

`.github/workflows/collect.yml` 每天 **UTC 02:00**（北京时间 10:00）自动跑 `scripts/collect.py`。

### 手动触发

GitHub → **Actions** → **Daily Collect** → **Run workflow**。

### 验证

跑完后去 Supabase → **Table Editor** → `pending_queue` 表看新行。

采集到的新项目不会自动上线，需在 `/admin` 审核。

---

## 七、环境变量汇总

| 变量 | 设置位置 | 说明 |
|------|---------|------|
| `DATABASE_URL` | EdgeOne + `.env.local` | Supabase 连接串（端口 6543） |
| `ADMIN_PASSWORD` | EdgeOne + `.env.local` | Admin 登录密码 |
| `ADMIN_SECRET` | EdgeOne + `.env.local` | HttpOnly cookie 值 |
| `WEBHOOK_SECRET` | EdgeOne + GitHub Secrets + `.env.local` | HMAC 密钥，**三处必须相同** |
| `NEXT_PUBLIC_BASE_URL` | EdgeOne + `.env.local` | 生产域名 |
| `EDGEONE_API_TOKEN` | GitHub Secrets | EdgeOne API 部署用 |
| `GH_TOKEN` | GitHub Secrets | 采集脚本用 GitHub API |
| `WEBHOOK_URL` | GitHub Secrets | 采集脚本推送地址 |

---

## 八、回滚

### 代码回滚

GitHub → 仓库 → **Commits** → 选历史 commit → **Revert** → push → 自动部署。

### 数据库回滚

Supabase → Project Settings → **Database** → **Backups**（免费层保留 7 天）→ 选时间点恢复。

### EdgeOne 部署回滚

EdgeOne 控制台 → 项目 → **Deployments** → 选历史版本 → **Rollback**。

---

## 九、故障排查

| 症状 | 原因 | 解决 |
|------|------|------|
| `npm run dev` 报 `ECONNREFUSED` | `.env.local` 的 `DATABASE_URL` 错 | 检查密码、端口 6543 |
| 首页 500 + `SELF_SIGNED_CERT` | SSL 配置开了 `rejectUnauthorized: true` | 改成 `false`（Supabase AWS RDS CA 自签） |
| 部署成功但首页空白 | EdgeOne 环境变量没设 `DATABASE_URL` | 控制台 → Environment Variables |
| `pending_queue` 一直空 | `WEBHOOK_SECRET` 两边不一致 | 检查 GitHub Secret 和 EdgeOne 环境变量 |
| GitHub Actions 失败 `EDGEONE_API_TOKEN` | Secret 未配置 | 配完手动 Re-run |