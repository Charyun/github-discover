# OpenHub 部署文档（EdgeOne Pages + TencentDB PostgreSQL）

## 前置条件

- 腾讯云账号（需要 EdgeOne Pages + TencentDB for PostgreSQL 权限）
- 腾讯云账号下的 **API Token**（在 EdgeOne 控制台 → API Tokens 生成，权限选 Pages Deploy）
- Node.js 22+，npm 已安装
- EdgeOne CLI：项目本地 `node_modules/.bin/edgeone`（`npm install` 自动装）
- **Gitee** 账号 + 仓库（用 Gitee Go 做 CI/CD）
- 腾讯云 PostgreSQL 实例（公网可达，IP 白名单已开）
- EdgeOne Pages 项目（已创建并绑定 Gitee 仓库）

---

## 一、TencentDB for PostgreSQL 准备

### 1. 创建 PostgreSQL 实例

在 [腾讯云控制台](https://console.cloud.tencent.com/postgres) → **新建实例**：

- 计费模式：按量计费（个人项目用完后可释放）
- 规格：1核 1GB 入门款即可
- 地域：建议选离 EdgeOne 边缘节点近的（广州/上海/北京）
- 网络：VPC + **开通公网访问**（需 EdgeOne 跨网访问）
- 数据库版本：PostgreSQL 16
- 认证：设置 root 密码

### 2. 创建数据库

实例详情 → **Databases** → 新建库：

```
Database name: openhub
Owner: postgres
```

### 3. 配置白名单

实例详情 → **Security Group / 白名单** → 添加 EdgeOne Pages 出口 IP 段，或临时开 `0.0.0.0/0`（生产收紧）。

### 4. 初始化 schema 和基础数据

本地用 `psql` 连接：

```bash
export DATABASE_URL='postgresql://user:pass@host:5432/openhub'
psql "$DATABASE_URL" -f scripts/schema.sql
psql "$DATABASE_URL" -f scripts/seed.sql
```

`seed.sql` 写入 8 个行业 + 25 个场景分类。

---

## 二、本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example`（如有）→ `.env.local`：

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/openhub_dev
ADMIN_PASSWORD=dev-password
ADMIN_SECRET=dev-secret-32chars-min-length-please
WEBHOOK_SECRET=dev-webhook-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

EdgeOne CLI 会自动加载 `.env.local` 到 dev 运行时。

### 3. 启动

```bash
npm run dev
# → http://localhost:3000
```

---

## 三、EdgeOne Pages 项目配置

### 1. 创建项目

在 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone) → **Pages** → **Create Project**：

- 接入方式：**Connect to Gitee**（推荐）
- 选择仓库：`<your-gitee-username>/openhub`
- 框架：Next.js（自动识别）
- 构建命令：`npm run build`（默认）
- 输出目录：`.next`（默认）
- Node.js 版本：22

### 2. 设置环境变量

EdgeOne 控制台 → 项目 → **Environment Variables** → Production：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | TencentDB 连接串 |
| `ADMIN_PASSWORD` | 强密码 | Admin 登录密码 |
| `ADMIN_SECRET` | 32+ 随机字符串 | Cookie session 值 |
| `WEBHOOK_SECRET` | 随机字符串 | HMAC 签名密钥 |
| `NEXT_PUBLIC_BASE_URL` | `https://你的域名.edgeone.app` | 生产域名 |

生成随机字符串：

```bash
openssl rand -hex 16
```

---

## 四、部署

### 方式一：Gitee Go 自动部署（推荐）

每次 push 到 Gitee 仓库的 `main` 分支，`.gitee-ci/build.yml` 流水线自动触发：

1. **Gitee 仓库设置 → Webhooks**：添加 Gitee Go 的 webhook URL（首次启用流水线时显示）
2. **Gitee 仓库 → Settings → Secrets**：添加 `EDGEONE_API_TOKEN`
3. **启用流水线**：Gitee 仓库 → **Pipelines** → **Gitee Go** → 启用并选择 `.gitee-ci/build.yml`

之后 `git push origin main` → 流水线跑通 → EdgeOne Pages 自动部署。

需要 1 个 Gitee Secret：`EDGEONE_API_TOKEN`（在 EdgeOne 控制台 → API Tokens 生成，权限选 Pages Deploy）。

### 方式二：手动部署

```bash
npx edgeone deploy
# 或预览：
npx edgeone deploy --preview
```

需要本地设 2 个环境变量：

```bash
export EDGEONE_API_TOKEN=<从 EdgeOne 控制台拿>
export EDGEONE_PROJECT_NAME=openhub
```

---

## 五、验证

部署完成后访问你的 EdgeOne Pages 域名，逐项确认：

- [ ] 首页正常显示（行业分类、空的推荐区域）
- [ ] `/sitemap.xml` 有内容
- [ ] 访问 `/admin` 自动跳转到 `/admin/login`
- [ ] 用 `ADMIN_PASSWORD` 登录成功，跳转到待审核队列
- [ ] 待审核列表为空（正常，还没采集）

---

## 六、配置 GitHub Actions 数据采集（可选）

> 即使主仓库在 Gitee，采集脚本 `scripts/collect.py` 仍可以用 **GitHub Actions** 跑（任何 GitHub 账号都行），因为它只调 GitHub Search API。

### 在 GitHub 仓库设置 Secrets

仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**：

| Secret 名称 | 值 |
|------------|-----|
| `GH_TOKEN` | GitHub Personal Access Token（`public_repo` 权限） |
| `WEBHOOK_URL` | `https://你的域名.edgeone.app/api/webhook/collect` |
| `WEBHOOK_SECRET` | 与 EdgeOne Pages 项目里的 `WEBHOOK_SECRET` 相同的值 |

### 手动触发第一次采集

仓库 → **Actions** → **Daily Collect** → **Run workflow** → **Run workflow**

采集完成后，去 Admin 后台审核项目。

> 也可以把 `scripts/collect.py` 挪到一台服务器用 cron 跑，不依赖 GitHub Actions。

---

## 七、首批内容上线

1. 访问 `https://你的域名/admin`，登录
2. 查看待审核队列（按 auto_score 降序排列）
3. 点击项目 → 填写中文描述、选择行业/场景、填部署命令
4. 点击 **通过发布**
5. 重复，审核 20-50 个高质量项目后站点即有内容

---

## 八、后续维护

### 日常更新
- 每日凌晨 2 点（UTC）GitHub Actions 自动采集（如启用），新项目进入待审核队列
- 定期登录 Admin 审核即可

### 重新部署
推送代码到 Gitee 仓库的 `main` 分支，EdgeOne Pages 自动触发构建部署：

```bash
git add .
git commit -m "fix: ..."
git push origin main
```

### 回滚
EdgeOne Pages 控制台 → 项目 → **Deployments** → 选历史版本 → **Rollback**

### 手动触发同步 stars
```bash
curl -X POST https://你的域名/api/webhook/sync-stats \
  -H "x-webhook-signature: <hmac签名>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 九、环境变量汇总

| 变量 | 设置位置 | 说明 |
|------|---------|------|
| `DATABASE_URL` | EdgeOne Pages + `.env.local` | PostgreSQL 连接串（公网可访问） |
| `ADMIN_PASSWORD` | EdgeOne Pages + `.env.local` | Admin 登录密码 |
| `ADMIN_SECRET` | EdgeOne Pages + `.env.local` | HttpOnly cookie 值 |
| `WEBHOOK_SECRET` | EdgeOne Pages + GitHub Actions Secrets | HMAC 密钥，两处必须相同 |
| `NEXT_PUBLIC_BASE_URL` | EdgeOne Pages + `.env.local` | 生产域名 |
| `EDGEONE_API_TOKEN` | Gitee Go Secrets | CI 部署用 |
| `EDGEONE_PROJECT_NAME` | Gitee Go Secrets（值固定为 `openhub`） | EdgeOne 项目名 |
| `GH_TOKEN` | GitHub Secrets | 采集脚本用 GitHub API |
| `WEBHOOK_URL` | GitHub Secrets | 采集脚本推送地址 |