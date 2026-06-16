# OpenHub 部署文档

## 前置条件

- Cloudflare 账号（需要 Pages + D1 + R2 权限）
- Node.js 20+，npm 已安装
- Wrangler CLI 已登录：`npx wrangler login`
- GitHub 账号（用于代码托管 + GitHub Actions）

> **Windows 注意**：本地构建 `@cloudflare/next-on-pages` 在 Windows 上有已知兼容问题（路径含括号时 Vercel CLI 失败）。推荐使用 Cloudflare Pages Git 集成，让 Cloudflare 在 Linux CI 上构建。

---

## 一、Cloudflare 资源准备

### 1. 创建 D1 数据库

```bash
npx wrangler d1 create openhub
```

输出示例：
```
✅ Successfully created DB 'openhub' in region APAC
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "openhub"
database_id = "e7c27707-7f65-45ef-866d-d234a9b8feb8"
```

将 `database_id` 填入 `wrangler.toml`：
```toml
[[d1_databases]]
binding = "DB"
database_name = "openhub"
database_id = "e7c27707-7f65-45ef-866d-d234a9b8feb8"
```

### 2. 初始化数据库表结构和基础数据

```bash
npx wrangler d1 execute openhub --remote --file=scripts/schema.sql
npx wrangler d1 execute openhub --remote --file=scripts/seed.sql
```

`seed.sql` 写入 8 个行业 + 25 个场景分类。

### 3. 创建 R2 存储桶（截图/图标用）

```bash
npx wrangler r2 bucket create openhub-assets
```

---

## 二、代码推送到 GitHub

```bash
cd E:\Work\workspace\openhub

# 初始化 Git（如果还没有）
git init
git add .
git commit -m "feat: initial OpenHub implementation"

# 在 GitHub 新建私有仓库，然后推送
git remote add origin https://github.com/<your-username>/openhub.git
git branch -M main
git push -u origin main
```

---

## 三、Cloudflare Pages Git 集成部署

1. 进入 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 选择 GitHub，授权并选择 `openhub` 仓库
3. 配置 Build settings：

| 设置项 | 值 |
|--------|-----|
| Framework preset | `None`（手动配置） |
| Build command | `npx @cloudflare/next-on-pages` |
| Build output directory | `.vercel/output/static` |
| Root directory | `/`（留空） |

4. 展开 **Environment variables**，添加以下 Production 变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `ADMIN_PASSWORD` | 你的管理密码 | Admin 登录密码 |
| `ADMIN_SECRET` | 随机 32 位字符串 | Cookie session 值 |
| `COLLECT_WEBHOOK_SECRET` | 随机字符串 | HMAC 签名密钥 |
| `NODE_VERSION` | `20` | 指定 Node 版本 |

生成随机字符串：
```bash
# Linux/Mac/Git Bash
openssl rand -hex 16

# PowerShell
-join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

5. 点击 **Save and Deploy** — Cloudflare 在 Linux 上自动构建并部署

---

## 四、验证部署

部署完成后访问你的 `*.pages.dev` 域名，逐项确认：

- [ ] 首页正常显示（行业分类、空的推荐区域）
- [ ] `/sitemap.xml` 有内容
- [ ] 访问 `/admin` 自动跳转到 `/admin/login`
- [ ] 用 `ADMIN_PASSWORD` 登录成功，跳转到待审核队列
- [ ] 待审核列表为空（正常，还没采集）

---

## 五、配置 GitHub Actions 数据采集

### 在 GitHub 仓库设置 Secrets

GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**：

| Secret 名称 | 值 |
|------------|-----|
| `GH_TOKEN` | GitHub Personal Access Token（`public_repo` 权限） |
| `COLLECT_WEBHOOK_URL` | `https://你的域名.pages.dev/api/webhook/collect` |
| `COLLECT_WEBHOOK_SECRET` | 与上面 `COLLECT_WEBHOOK_SECRET` 相同的值 |

生成 GitHub PAT：GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → 勾选 `public_repo`

### 手动触发第一次采集

GitHub 仓库 → **Actions** → **Daily Collect** → **Run workflow** → **Run workflow**

采集完成后，去 Admin 后台审核项目。

---

## 六、首批内容上线

1. 访问 `https://你的域名/admin`，登录
2. 查看待审核队列（按 auto_score 降序排列）
3. 点击项目 → 填写中文描述、选择行业/场景、填部署命令
4. 点击 **通过发布**
5. 重复，审核 20-50 个高质量项目后站点即有内容

---

## 七、后续维护

### 日常更新
- 每日凌晨 2 点（UTC）GitHub Actions 自动采集，新项目进入待审核队列
- 定期登录 Admin 审核即可

### 重新部署
推送代码到 `main` 分支，Cloudflare Pages 自动触发构建部署：
```bash
git add .
git commit -m "fix: ..."
git push
```

### 手动触发同步 stars
```bash
# 调用 sync-stats webhook（可选）
curl -X POST https://你的域名/api/webhook/sync-stats \
  -H "x-webhook-signature: <hmac签名>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 八、环境变量汇总

| 变量 | 设置位置 | 说明 |
|------|---------|------|
| `ADMIN_PASSWORD` | Cloudflare Pages | Admin 登录密码 |
| `ADMIN_SECRET` | Cloudflare Pages | HttpOnly cookie 值 |
| `COLLECT_WEBHOOK_SECRET` | Cloudflare Pages + GitHub Secrets | HMAC 密钥，两处必须相同 |
| `NODE_VERSION` | Cloudflare Pages | 设为 `20` |
| `GH_TOKEN` | GitHub Secrets | 采集脚本用 GitHub API |
| `COLLECT_WEBHOOK_URL` | GitHub Secrets | 生产环境 webhook 地址 |
| D1 binding `DB` | wrangler.toml | 通过 Cloudflare 绑定注入，非普通 env var |
| R2 binding `R2` | wrangler.toml | 通过 Cloudflare 绑定注入，非普通 env var |
