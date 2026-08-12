# 小説写作助手 xiaoshuo-mk1

AI 辅助小説写作系统,单体本地版。

## 技术栈

- 前端:React 18 + Vite + TypeScript + Ant Design 5 + Zustand + TanStack Query + Tiptap
- 后端:Python 3.11+ + FastAPI + SQLAlchemy 2 + Pydantic v2 + Alembic
- 数据库:SQLite (本地文件 `data/novel.db`)
- AI:OpenAI 兼容协议(任何 OpenAI 兼容的服务)

## 功能总览(P0~P7)

| 阶段 | 功能 |
|---|---|
| **P0** | 工程脚手架 + 作品 CRUD |
| **P1** | 大纲规划(卷/章节) |
| **P2** | 人物设计 + 主角深度设定 |
| **P3** | 事件追踪 + 时间线 + 因果链 |
| **P4** | 人物 KV 状态追踪 + 状态变化历史 |
| **P5** | AI 接入(大纲/章节/人物/事件/续写/扩写/一致性/自由对话) + Settings 页 |
| **P6** | Tiptap 富文本编辑器 + 自动保存 + 伏笔标记 |
| **P7** | 备份/恢复 + 夜间模式 + 全局快捷键 |

## 快速开始(新机器)

### Windows
```bat
scripts\install.bat
```

### Linux/macOS
```bash
bash scripts/install.sh
```

脚本会自动:创建虚拟环境 → 安装依赖 → 跑迁移 → 启动后端。

### 手动启动

启动后端 + 前端(各开一个终端):

```bash
# 终端 1: 后端
powershell -File scripts\start-backend.ps1   # Windows
bash scripts\start-backend.sh                 # Linux/macOS

# 终端 2: 前端
powershell -File scripts\start-frontend.ps1
bash scripts\start-frontend.sh
```

打开 http://127.0.0.1:5173

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
│   │   └── main.py            # FastAPI app
│   ├── alembic/               # 迁移
│   ├── data/                  # SQLite
│   ├── tests/                 # pytest (172 tests)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/               # react-query hooks
│   │   ├── components/
│   │   │   ├── editor/        # Tiptap editor
│   │   │   ├── outline/       # Outline + AI drawer
│   │   │   └── layout/        # MainLayout + theme
│   │   ├── hooks/             # useShortcuts
│   │   ├── pages/             # Home/WorkForm/Outline/CharacterList/...
│   │   ├── store/             # zustand (theme/ui)
│   │   ├── types/             # 类型定义
│   │   └── router.tsx
│   └── package.json
├── scripts/                   # install / start / test
│   ├── install.bat / install.sh
│   ├── start-backend.ps1 / .sh
│   ├── start-frontend.ps1 / .sh
│   └── test-all.ps1 / .sh
└── README.md
```

## AI 配置

1. 启动后端 + 前端
2. 浏览器访问 `/settings`
3. 填写:
   - **API Key**:OpenAI / DeepSeek / 通义千问 / Moonshot 等提供的 key
   - **Base URL**:如 `https://api.openai.com/v1` 或 `https://api.deepseek.com/v1`
   - **模型**:如 `gpt-4o-mini`、`deepseek-chat` 等
   - **温度**:0-2,默认 0.7
4. 保存后在任何 AI 抽屉(卷/章节/事件)即可使用

未配置时 AI 抽屉会显示提示,引导到设置页。

## 数据备份

Settings 页底部提供:
- **下载数据库**:打包 `data/novel.db` 为 `.db` 文件
- **从备份恢复**:上传之前下载的 `.db`,原库会自动备份到 `novel.backup-YYYYMMDD-HHMMSS.db`

## 全局快捷键

| 快捷键 | 作用 |
|---|---|
| `g` | 回作品库 |
| `Ctrl + ,` | 打开设置 |
| `Ctrl + Shift + D` | 切换深浅主题 |

编辑器内自动避开普通字母,只在 `Ctrl/Meta` 快捷键生效时不冲突。

## 测试

### 后端 (pytest)
```bash
cd backend
.venv\Scripts\python.exe -m pytest -v
```
**172 测试,覆盖**:work/volumes/chapters/characters/protagonists/events/states/foreshadowing/settings/ai/backup 全部端点 + schema 校验 + 模型 + cascade FK。

### 前端 (vitest)
```bash
cd frontend
npm test           # run once
npm run test:watch # watch mode
npm run test:coverage
```
**103 测试,覆盖**:types/api/store/hooks/pages + setup mock。

### 一键跑全
```bash
powershell -File scripts\test-all.ps1   # Windows
bash scripts\test-all.sh               # Linux/macOS
```
依次执行:后端 pytest → 前端 lint → 前端 vitest → 前端 build。

## 构建与部署

### 前端生产构建
```bash
cd frontend
npm run build
# 产物在 dist/
```
Vite 已配置 vendor 分包(react/antd/query),main bundle ~530 KB。

### 后端生产模式
```bash
cd backend
.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

## 数据库位置

默认:`backend/data/novel.db`
- 备份:`backend/data/novel.backup-YYYYMMDD-HHMMSS.db`
- 迁移版本:`alembic_version` 表

重置数据库:删除 `novel.db` 后 `alembic upgrade head`。

## 已知限制

- 单用户本地版,无认证
- SQLite 限制:大量并发写入会锁库,单用户场景无影响
- AI 端点依赖外部 LLM,需配置 API Key
- Tiptap v3 移除了 BubbleMenu,本文仅用顶部工具栏(后续可加右键菜单)

## 路线图

后续可选方向(未实现):
- 关系图可视化(react-force-graph)
- 自定义提示词编辑器
- 全文搜索(FTS5)
- 数据导入/导出(Markdown / DocX)
- 多用户 / 云端同步