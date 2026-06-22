# OpenHub

中文 GitHub 开源项目发现站。8 大行业 × 25 个场景，按需检索 self-hostable 项目。

## 技术栈

- **前端**：Next.js 15（App Router）+ TailwindCSS v4
- **数据库**：Supabase（PostgreSQL，免费层）
- **托管**：EdgeOne Pages（国内 CDN 边缘节点）
- **CI/CD**：GitHub Actions（自动部署 + 每日数据采集）
- **数据采集**：Python `collect.py`，通过 GitHub Search API 抓取 trending 项目

## 本地开发

```bash
npm install
cp .env.example .env.local   # 填入 Supabase 连接串
npm run dev
# → http://localhost:3000
```

## 部署

详见 [`DEPLOY.md`](./DEPLOY.md)。

```
git push origin main  →  GitHub Actions  →  EdgeOne Pages  →  上线
```

## 目录结构

```
app/                 Next.js App Router 页面 + API routes
components/          UI 组件
lib/                 数据库连接、Auth、HMAC 工具
scripts/             SQL schema/seed + Python 采集脚本
types/               TypeScript 类型定义
.github/workflows/   GitHub Actions CI/CD
```

## Admin

- `/admin` 后台登录（密码在 `ADMIN_PASSWORD` 环境变量）
- 每日 GitHub Actions 自动采集新项目到 `pending_queue` 表
- 审核员在 Admin 后台填写中文描述、行业分类后发布到 `/`

## 许可

MIT