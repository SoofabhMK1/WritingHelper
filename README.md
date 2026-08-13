# 小说写作助手 xiaoshuo-mk1

AI 辅助小说写作系统，单体本地版。

## 技术栈

- 前端：React 18 + Vite + TypeScript + Ant Design 5 + Zustand + TanStack Query + Tiptap
- 后端：Python 3.11+ + FastAPI + SQLAlchemy 2 + Pydantic v2 + Alembic
- 数据库：SQLite（本地文件 `data/novel.db`）
- AI：OpenAI 兼容协议（任何 OpenAI 兼容的服务）
- 工具：ruff / mypy / ESLint / Prettier / GitHub Actions

## 功能总览（P0~P7）

| 阶段 | 功能 |
|---|---|
| **P0** | 工程脚手架 + 作品 CRUD |
| **P1** | 大纲规划（卷/章节） |
| **P2** | 人物设计 + 主角深度设定 |
| **P3** | 事件追踪 + 时间线 + 因果链 |
| **P4** | 人物 KV 状态追踪 + 状态变化历史 |
| **P5** | AI 接入（大纲 / 章节 / 人物 / 事件 / 续写 / 扩写 / 一致性 / 自由对话）+ Settings 页 |
| **P5+** | 多 API profile + per-prompt 绑定 + 提示词模板管理（自定义组合 + 内置模板克隆） |
| **P5+** | LLM 请求日志审计（每条 system / user / response + status + duration，cap 1000 行） |
| **P6** | Tiptap 富文本编辑器 + 自动保存 + 伏笔标记 |
| **P7** | 备份 / 恢复 + 夜间模式 + 全局快捷键 |

## 快速开始（新机器）

### Windows
```bat
scripts\install.bat
```

### Linux/macOS
```bash
bash scripts/install.sh
```

脚本会自动：创建虚拟环境 → 安装依赖 → 跑迁移 → 启动后端。

### 手动启动

启动后端 + 前端（各开一个终端）：

```bash
# 终端 1：后端
powershell -File scripts\start-backend.ps1   # Windows
bash scripts/start-backend.sh                 # Linux/macOS

# 终端 2：前端
powershell -File scripts\start-frontend.ps1
bash scripts/start-frontend.sh
```

打开 <http://127.0.0.1:5173>

## 目录结构

```
xiaoshuo-mk1/
├── backend/
│   ├── app/
│   │   ├── ai/                # OpenAI 客户端 + 提示词 + context builder
│   │   ├── api/v1/            # FastAPI 路由
│   │   ├── models/            # SQLAlchemy ORM
│   │   ├── schemas/           # Pydantic schema
│   │   ├── services/          # settings / business logic
│   │   ├── config.py          # env config
│   │   ├── database.py        # SQLAlchemy engine + FK pragma
│   │   └── main.py            # FastAPI app + startup legacy migration
│   ├── alembic/               # 迁移
│   ├── data/                  # SQLite
│   ├── tests/                 # pytest (300+ tests)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/               # react-query hooks
│   │   ├── components/
│   │   │   ├── editor/        # Tiptap editor
│   │   │   ├── outline/       # Outline + AI drawer
│   │   │   └── layout/        # MainLayout + ErrorBoundary
│   │   ├── hooks/             # useShortcuts
│   │   ├── pages/             # Home / WorkForm / Outline / CharacterList / ...
│   │   ├── store/             # zustand (theme / aiDrawer)
│   │   ├── types/             # 类型定义
│   │   └── router.tsx
│   └── package.json
├── scripts/                   # install / start / test
│   ├── install.bat / install.sh
│   ├── start-backend.ps1 / .sh
│   ├── start-frontend.ps1 / .sh
│   └── test-all.ps1 / .sh
├── .github/workflows/ci.yml   # 后端 + 前端 lint+test+build matrix
├── .gitignore / .editorconfig / .nvmrc / .python-version
├── pyproject.toml             # ruff + mypy + pytest 配置
├── eslint.config.js / .prettierrc
├── AGENTS.md                  # AI agent 协作约定
└── README.md
```

## AI 配置

1. 启动后端 + 前端
2. 浏览器访问 `/ settings/ai`
3. **新建 API profile**：填写
   - **API Key**：OpenAI / DeepSeek / 通义千问 / Moonshot 等提供的 key
   - **Base URL**：如 `https://api.openai.com/v1` 或 `https://api.deepseek.com/v1`
   - **模型**：如 `gpt-4o-mini`、`deepseek-chat` 等
   - **温度**：0-2，默认 0.7
   - **设为默认**：在多个 profile 间切换
4. **per-prompt 映射**：可以为 8 个 AI 功能（卷大纲 / 章节细化 / 人物 / 事件 / 续写 / 扩写 / 一致性 / 自由对话）各自指派不同的 profile
5. **提示词模板**：在 `/prompts` 管理内置模板的副本（fork 内置 → 自定义）

未配置时 AI 抽屉会显示提示，引导到设置页。

## 数据备份

Settings 页底部提供：
- **下载数据库**：打包 `data/novel.db` 为 `.db` 文件
- **从备份恢复**：上传之前下载的 `.db`，原库会自动备份到 `novel.backup-YYYYMMDD-HHMMSS.db`；上传文件需通过 schema 白名单校验（17 张必现表 + alembic_version）

## 全局快捷键

| 快捷键 | 作用 |
|---|---|
| `g` | 回作品库 |
| `Ctrl + ,` | 打开设置 |
| `Ctrl + Shift + D` | 切换深浅主题 |

编辑器内自动避开普通字母，只在 `Ctrl/Meta` 快捷键生效时不冲突。

## 测试

### 后端（pytest）

```bash
cd backend
.venv\Scripts\python.exe -m pytest -v
```

**约 308 测试，覆盖**：work / volumes / chapters / characters / protagonists / events / states / foreshadowing / settings / ai / backup / prompt_assemblies / prompt_fragments / llm_request_logs 全部端点 + schema 校验 + 模型 + cascade FK + SET NULL + 一键恢复 + LLM 日志 cap。

带覆盖率：
```bash
.venv\Scripts\python.exe -m pytest --cov=app.api.v1 --cov=app.services --cov=app.ai --cov-branch --cov-report=term
```

覆盖率门槛（pyproject.toml）：50%。当前 api.v1 + services + ai 综合 **94%**。

Lint + 类型检查：
```bash
.venv\Scripts\ruff.exe check app
.venv\Scripts\mypy.exe app
```

### 前端（vitest）

```bash
cd frontend
npm test               # 单次运行
npm run test:watch     # 监听模式
npm run test:coverage  # 覆盖率
```

**约 145 测试**，覆盖：types / api hooks / store / hooks / pages / ErrorBoundary / 关键组件 (ChapterEditor autosave / Outline / WorkForm / AILogs 等)。

覆盖率门槛（vite.config.ts）：30%。Tiptap 编辑器本体在 jsdom 中跳过（mock）。

Lint + 类型检查：
```bash
npm run lint        # ESLint flat config + react/hooks/a11y
npm run typecheck    # tsc -b --noEmit
npm run format       # prettier --write
npm run format:check # CI 用
```

### 一键跑全

```bash
powershell -File scripts/test-all.ps1   # Windows
bash scripts/test-all.sh               # Linux/macOS
```

依次执行：后端 pytest → 前端 typecheck → 前端 lint → 前端 vitest → 前端 build。

### CI

`.github/workflows/ci.yml` 在 push / PR 时跑 Windows + Ubuntu 矩阵（后端 pytest + 前端 typecheck / lint / vitest / build）。

## 构建与部署

### 前端生产构建

```bash
cd frontend
npm run build
# 产物在 dist/
```

Vite 已配置 vendor 分包（react / antd / query），main bundle ~570 KB，vendor-antd ~1 MB。

### 后端生产模式

```bash
cd backend
.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

## 数据库位置

默认：`backend/data/novel.db`
- 备份：`backend/data/novel.backup-YYYYMMDD-HHMMSS.db`
- 迁移版本：`alembic_version` 表

重置数据库：删除 `novel.db` 后 `alembic upgrade head`。

## 已知限制

- 单用户本地版，无认证
- SQLite 限制：大量并发写入会锁库，单用户场景无影响
- AI 端点依赖外部 LLM，需配置 API Key
- Tiptap v3 移除了 BubbleMenu，本文仅用顶部工具栏（后续可加右键菜单）
- 浏览器对前端错误采用 ErrorBoundary 兜底，但自动保存仍依赖表单校验

## 路线图

后续可选方向（未实现）：
- 关系图可视化（react-force-graph）
- 全文搜索（FTS5）
- 数据导入 / 导出（Markdown / DocX）
- 多用户 / 云端同步

## 贡献与开发约定

- AI agent / IDE 协作约定见 [AGENTS.md](./AGENTS.md)
- 提交前请跑 `scripts/test-all.ps1` / `scripts/test-all.sh`