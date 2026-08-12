# AGENTS.md

This file is for AI coding agents (Claude Code, opencode, etc.) working on
the `xiaoshuo-mk1` codebase. Read it before making non-trivial changes.

## What this project is

A single-user, local-first AI-assisted Chinese novel writing tool.

- **Backend** (FastAPI + SQLAlchemy 2 + SQLite): manages works, volumes,
  chapters, characters, protagonists, events, character states,
  foreshadowing, app settings (KV); exposes an OpenAI-compatible AI client.
- **Frontend** (React 18 + Vite + TypeScript + Ant Design 5 + Tiptap): a
  single-page app for the above, with a rich-text editor and AI drawers.
- **AI**: configured at runtime via `app_settings` table (UI: `/settings`).
  No AI calls happen without a configured API key; the UI shows clear prompts.

Implemented end-to-end (P0–P7). Tests cover everything that has a public
API. See `README.md` for the user-facing overview.

## Quick orientation

```
xiaoshuo-mk1/
├── backend/                       FastAPI app lives here
│   ├── app/
│   │   ├── main.py                FastAPI entry — DO NOT run uvicorn as `main:app`
│   │   ├── config.py              env config (pydantic-settings)
│   │   ├── database.py            engine + SQLite FK pragma listener
│   │   ├── models/                SQLAlchemy ORM (one file per table)
│   │   ├── schemas/               Pydantic in/out models
│   │   ├── services/              business logic (currently just settings.py)
│   │   ├── api/v1/                FastAPI routers, aggregated in api/router.py
│   │   └── ai/                    OpenAI client + prompts + context builder
│   ├── alembic/                   migrations + env.py
│   ├── tests/                     pytest (uses TestClient + tmp sqlite)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/                   axios + react-query hooks (one file per resource)
│   │   ├── components/            layout / editor (Tiptap) / outline
│   │   ├── pages/                 route-level screens
│   │   ├── store/                 zustand stores (theme, ui)
│   │   ├── hooks/                 useShortcuts
│   │   ├── types/                 shared types + mapping tables (LABEL/COLOR)
│   │   ├── test/setup.ts          vitest jsdom setup
│   │   └── router.tsx             createBrowserRouter
│   └── vite.config.ts             proxies /api → 127.0.0.1:8000
├── scripts/
│   ├── install.bat / .sh          first-time setup
│   ├── start-backend.ps1 / .sh    runs uvicorn
│   ├── start-frontend.ps1 / .sh   runs vite
│   └── test-all.ps1 / .sh         backend pytest + frontend lint+test+build
└── README.md                      user-facing docs
```

## Running it

```bash
# Backend (auto: venv + alembic already done; just start)
powershell -File scripts/start-backend.ps1     # 127.0.0.1:8000

# Frontend
powershell -File scripts/start-frontend.ps1    # 127.0.0.1:5173

# All tests
powershell -File scripts/test-all.ps1
```

The frontend `/api/*` is proxied to the backend by Vite. **Do not run them on
the same machine with different proxy targets** — keep vite.config.ts as is.

## Conventions

### Backend

- **Entry point is `app.main:app`** (because `main.py` lives in `app/`).
  `uvicorn main:app` will fail with `Could not import module "main"` — never
  change this and never suggest `main:app` to the user.
- Use SQLAlchemy 2 typed style: `Mapped[X] = mapped_column(...)`.
- Every new table MUST have a migration in `alembic/versions/000N_*.py`
  and MUST be added to `app/models/__init__.py` so `target_metadata` picks
  it up via `app.models import *`.
- Cascading rules:
  - `work_id` → always `ON DELETE CASCADE`
  - `chapter_id` → `ON DELETE SET NULL` for references that should
    survive chapter deletion (e.g. `character_states`, `events.chapter_id`),
    `ON DELETE CASCADE` when the relationship is owned (e.g. `foreshadowing.chapter_id`)
- The `SQLite FK pragma=ON` listener is wired in `app/database.py` AND in
  `tests/conftest.py`. **Do not remove the conftest copy** — pytest creates
  its own engine.
- Subsecond precision: timestamps use
  `server_default=text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")` in models
  AND in migrations. Plain `CURRENT_TIMESTAMP` is only second-resolution and
  breaks ordering tests.
- Schemas are in `app/schemas/<resource>.py`. `Create` and `Update` are
  separate; `Update` uses `Optional[...]` so `exclude_unset=True` works.
- API routes are mounted in `app/api/router.py` with prefix `/api/v1`.
  Every resource router uses `prefix="/works/{work_id}/<resource>"` to keep
  resources scoped under their work.
- Test client pattern: override `get_db` with a session bound to a tmp
  engine created in `conftest.py`. Tests that need a work_id create one via
  the public API rather than fabricating rows.
- AI client lives in `app/ai/client.py`. It reads from `app_settings`
  table first, then env defaults. A missing API key raises
  `AIServiceError(code="not_configured")` which the route surfaces as
  HTTP 503.

### Frontend

- TypeScript strict mode. Imports use the `@/` alias for `src/`.
- One file per resource in `api/`, `types/`, `pages/`. Keep them small.
- Status/role enum maps: types export `*_LABEL`, `*_COLOR`, `*_OPTIONS`
  alongside the type union. Components consume the maps; never hardcode
  Chinese strings in JSX.
- API keys, secret values: always go through `useSettings()` — never store
  secrets in component state.
- The `AIDrawer` in `components/outline/AIDrawer.tsx` is the canonical place
  for AI actions. When adding a new AI capability, extend the drawer; don't
  invent a new place.
- Tiptap v3: `BubbleMenu` was removed. Use the toolbar (`components/editor/TiptapEditor.tsx`).
  Custom marks live alongside `StarterKit` in the same `extensions` array.
- Vite manualChunks: `vendor-react`, `vendor-antd`, `vendor-query`. Do
  **not** add `@tiptap/pm` to manualChunks — it has no main entry.
- **Every page must have a back button.** Navigation hierarchy:
  `Home → WorkOverview (/works/:wid) → sub-pages (/works/:wid/*)`.
  WorkOverview uses `返回作品库` → `/`; every other `works/:wid/*` page
  uses `返回作品详情` → `/works/:wid`. Deep pages (CharacterEditor,
  EventEditor, ChapterEditor) already return to their list page — keep
  that pattern. Implementation:
  `<Button icon={<ArrowLeftOutlined />}>返回…</Button>` placed next to
  the `<Typography.Title>` inside a `<Space>` at the top of the page.
  When adding any new page under `works/:wid/*`, include this button in
  the same PR.
- **Settings is a global resource** at `/settings/*`, not scoped under a
  work. It mirrors the `Home → WorkOverview` list/detail pattern:
  `pages/Settings.tsx` is a hard-coded grid of category cards (no
  backend list endpoint); each detail page (e.g. `pages/AISettings.tsx`)
  is its own file with a `返回设置` back button. To add a new setting
  category, append to the `items` array in `Settings.tsx`, create
  `pages/<Key>Settings.tsx`, and register `settings/<key>` in
  `router.tsx`. The sidebar `selectedKey` uses prefix matching so "设置"
  stays highlighted on any sub-route.
- **Prompt templates** at `/prompts/*` is a global read-only reference
  for the AI prompts registered in `backend/app/ai/prompts.py`.
  `pages/Prompts.tsx` lists prompts from `GET /api/v1/ai/prompts`;
  `pages/PromptDetail.tsx` shows the full system + user template from
  `GET /api/v1/ai/prompts/{name}`. Display labels / descriptions /
  icons live in `types/prompt.ts` keyed by backend prompt name — they
  only affect rendering. The page is read-only; the editor is post-P7.
  Adding a prompt on the backend (new `Prompt` instance in
  `PROMPTS`) requires a matching label / description / icon entry in
  `types/prompt.ts` so the UI can render it.

### Tests

- Backend uses `pytest` with `TestClient`. `conftest.py` resets the DB per
  test by dropping/recreating all tables. New test files should follow the
  `tests/test_<resource>.py` naming.
- Frontend uses `vitest` with jsdom. `src/test/setup.ts` mocks `matchMedia`
  and `ResizeObserver` — extend it if a new component needs other globals.
- **AntD button-name gotcha**: AntD's `Button` inserts a literal space inside
  the inner text (likely for icon support). `getByRole({ name: "重试" })`
  fails. Use regex: `name: /重\s?试/`. This pattern shows up in
  `WorkForm.test.tsx`, `Home.test.tsx`, `ChapterEditor`-related tests.
- Use `vi.resetAllMocks()` in `beforeEach` when mocking modules.
- For modules that read state at import time (e.g. `theme.ts`), use
  `vi.resetModules()` + dynamic `await import()` to test fresh state.

## Adding a new feature (typical workflow)

**Backend resource** (e.g. a new "plot twist" table):
1. `app/models/<thing>.py` — SQLAlchemy model with proper FK / cascade
2. `app/schemas/<thing>.py` — `Base / Create / Update / Out`
3. `app/api/v1/<thing>.py` — router with `prefix="/works/{work_id}/<thing>"`
4. Register in `app/api/router.py`
5. Add to `app/models/__init__.py` exports
6. `alembic revision -m "add <thing>"`, edit the generated file, `alembic upgrade head`
7. `tests/test_<thing>.py` — cover CRUD + cross-work 400 + cascade

**Frontend feature**:
1. `types/<thing>.ts` — type + enum maps (`*_LABEL`/`*_COLOR`/`*_OPTIONS`)
2. `api/<thing>.ts` — react-query hooks (`useThing`, `useThingList`, mutations)
3. `pages/<Thing>List.tsx` or extend an existing page
4. Add route in `router.tsx`
5. Add a card/button on `WorkOverview.tsx` if it's a top-level resource
6. Extend `AIDrawer` if the feature has AI capabilities
7. Test: `types/<thing>.test.ts` + `api/<thing>.test.ts`

**AI endpoint**:
1. Add a prompt dataclass in `app/ai/prompts.py`
2. Register it in `PROMPTS` dict
3. Add a request schema + handler in `app/api/v1/ai.py`
4. Test with `@patch("app.ai.client.chat", return_value="<json>")`

**AI prompt catalog entry** (a new entry in the read-only `/prompts`
catalog — usually paired with a new AI endpoint above):
1. Add a `Prompt(name=..., system=..., user_template=..., json_mode=...)`
   dataclass in `backend/app/ai/prompts.py` and register it in the
   `PROMPTS` dict.
2. The catalog endpoints `GET /ai/prompts` and `GET /ai/prompts/{name}`
   pick it up automatically — no router changes needed unless the prompt
   also exposes a new request/response shape (see "AI endpoint" above).
3. Add the matching label / description / icon in
   `frontend/src/types/prompt.ts` (extend `PromptName` union,
   `PROMPT_LABELS`, `PROMPT_DESCRIPTIONS`, `PROMPT_ICONS`, and append to
   `PROMPT_LIST`).
4. Test: extend `backend/tests/test_ai.py::TestPromptCatalog` with the
   new name in the existing parametrized coverage
   (`test_get_prompt_known` walks all names).

## Common gotchas

| Symptom | Cause |
|---|---|
| `Could not import module "main"` on `uvicorn` | Always use `app.main:app`, never `main:app` |
| FK `ON DELETE CASCADE` not enforced | SQLite needs `PRAGMA foreign_keys=ON` per connection — set in `database.py` AND `conftest.py` |
| Two records created in the same second have identical `updated_at`, breaking ordering tests | Use `strftime('%Y-%m-%d %H:%M:%f', 'now')` not `CURRENT_TIMESTAMP` |
| Frontend `getByRole({ name: "重试" })` returns empty | AntD button text contains a space — use regex `/重\s?试/` |
| `vite build` fails with `Failed to resolve entry for "@tiptap/pm"` | Don't put `@tiptap/pm` in `manualChunks` (it's a subpath-only package) |
| `MemoryRouter` / `BrowserRouter` test fails with `Cannot read properties of undefined (reading 'matches')` | `matchMedia` not mocked — extend `src/test/setup.ts` |
| Test of store with module-level singleton fails | Use `vi.resetModules()` + dynamic `await import()` |
| AI endpoint returns 503 in tests | Expected when no API key is set; tests should mock `app.ai.client.chat` or assert the 503 |
| React Router warnings about future flags | Harmless; ignore |

## What NOT to do

- Do not change `echo=settings.app_debug` back to `True` in
  `app/database.py` — it floods uvicorn logs on every request.
- Do not put business logic in route handlers beyond input validation +
  calling a service. Add a new file under `app/services/` if it grows.
- Do not delete or rename a migration — Alembic will break. If you need a
  schema change, write a new migration.
- Do not add `console.log` or print statements and leave them in.
- Do not introduce a new top-level route (`/admin`, `/dashboard`, etc.) —
  resources are scoped under `/works/:wid/...`. The deliberate exceptions
  are `/settings/*` (global config) and `/prompts/*` (read-only AI prompt
  catalog) — see the Frontend conventions above.
- Do not commit the test DB (`tests/_tmp/`) or the actual `data/novel.db`
  — both are gitignored.
- Do not call `db.delete(work)` without cascading — Work cascades to
  volumes, chapters, characters, events, states, foreshadowing via
  `ON DELETE CASCADE`. Use `db.delete()` on a child to verify cascade
  behavior in tests.
- Do not assume AI endpoints can be hit live — tests must mock
  `app.ai.client.chat`. Live tests require a real API key, which the
  smoke script doesn't have.
- Do not add `python-dotenv`-style autoloading outside `app/config.py`.

## Where to look when something is wrong

- **DB errors / cascade not working** → `app/database.py` (pragma) and
  `backend/tests/conftest.py` (also sets pragma).
- **Routes 404 / 422** → `app/api/v1/<file>.py` — almost always a missing
  path parameter or `exclude_unset=True` forgotten on a PATCH-style update.
- **AI endpoint returns 502** → JSON parse failure. Check `_parse_json`
  in `app/api/v1/ai.py`; the prompt may need explicit `JSON object` or
  fewer escaping levels.
- **Frontend test "Unable to find button with name 'X'"** → AntD
  Button-text space issue. Use regex.
- **Vite proxy 500s** → Backend not running, or running on a different
  port. Check `vite.config.ts` proxy target.

## Useful one-liners

```bash
# Run only backend tests matching a name
cd backend && .venv\Scripts\python.exe -m pytest -v -k "foreshadow"

# Run only frontend tests in one file with watch
cd frontend && npx vitest src/types/event.test.ts

# Reset DB
cd backend && Remove-Item data/novel.db -Force
.venv\Scripts\alembic.exe upgrade head

# Type-check frontend
cd frontend && npm run lint

# Live smoke against running backend (replace 8014 if busy)
.venv\Scripts\python.exe -c "import httpx; print(httpx.get('http://127.0.0.1:8000/api/v1/works').json())"
```