# 食光记 · 开发者速查卡

AI 饮食行为分析系统（MVP）。Next.js 15 + React 19 + TypeScript + Tailwind CSS 4。
数据存 Supabase（PostgreSQL），AI 通过 Next.js API Routes 调用 DeepSeek API（`deepseek-chat`，Tool Calling 模式）。

## 架构

```
浏览器 (React) ──fetch──> Next.js API Routes ──fetch──> DeepSeek API
    │                        │
    └── Supabase ────────────┘ (PostgreSQL)
         (lib/db.ts)
```

localStorage 仅保留 `shiguangji-auth` 和 `shiguangji-user-id`，写入时双写（localStorage 即时响应 + 异步 sync 到 Supabase）。

## 文件地图

### `lib/` — 核心库

| 文件 | 作用 |
|------|------|
| `lib/types.ts` | 所有 TS 类型：UserProfile、MealRecord、NutritionEstimate、MealStatus、DailyTargetRange、MemoryEntry、ProactiveConfig、ProactiveLog、Conversation、各 API 请求/响应 |
| `lib/aiClient.ts` | `callDeepSeekWithTool<T>(params, tool)` — DeepSeek 调用封装，Tool Calling 强制结构化输出，带 JSON 降级解析 |
| `lib/prompts.ts` | 6 个系统提示词：INFO_CHECK / MEAL_ANALYSIS / DAILY_SUMMARY / WEEKLY_ANALYSIS / ASSISTANT_PROMPT / PROACTIVE_PROMPT。**改 AI 行为改这里** |
| `lib/agentTools.ts` | AI 助手 Agent 的 8 个工具定义 + 处理函数：get_user_profile、get_today_meals、get_recent_meals、search_diet_knowledge、search_food_nutrition、check_meal_missed、check_goal_status、extract_memory |
| `lib/proactiveEngine.ts` | 主动触达引擎：频控（日限制/免打扰时段）、7 种事件触发检测（首次问候/漏餐/营养素/建议跟进/里程碑/偏好收集/日常问候） |
| `lib/nutritionStatus.ts` | 系统计算函数：computeDailyStatus、computeWeeklyStatus、computeGoalMatch — 纯算术，不调 LLM |
| `lib/storage.ts` | 业务数据读写封装（读走 Supabase，写双写 localStorage + Supabase），含每日/每周总结指纹缓存 |
| `lib/db.ts` | Supabase CRUD 实现：注册/登录、9 张表的同步与查询、Admin 统计 |
| `lib/supabase.ts` | Supabase 客户端初始化（`@supabase/supabase-js`） |
| `lib/goals.ts` | Mifflin-St Jeor 公式计算 BMR + 初始目标范围 |
| `lib/seedData.ts` | `seedBalancedWeek()` — 7 天 21 餐模拟数据（28 岁男性 178cm 75kg，内置到首页触发） |
| `lib/difyService.ts` | 前端 fetch 封装（名存实亡：调用 Next.js API Routes，不依赖 Dify） |
| `lib/ratingStyles.ts` | 营养状态枚举 → Tailwind 颜色类的映射 |

### `app/api/` — API 路由（6 个端点）

| 路由 | Tool 名称 | 功能 |
|------|-----------|------|
| `POST /api/meal-chat` | `info_check` | 信息完整性判断 → `{ isEnough, assistantMessage }` |
| `POST /api/meal-chat/analyze` | `meal_analysis` | 单餐营养分析 → 5 营养素 + summary + feedback |
| `POST /api/daily-summary` | `daily_summary` | 每日整体分析（系统算状态 + LLM 写 feedback） |
| `POST /api/weekly-analysis` | `weekly_analysis` | 每周趋势 + 下周目标调整建议 |
| `POST /api/assistant/chat` | Agent（7 个工具） | AI 营养助手对话，流式响应，多轮工具调用，并行 memory 提取 |
| `POST /api/proactive` | `proactive_push` | 主动触达引擎，检测触发条件 + 频控 + LLM 生成推送文案 |

Tool Calling 模式：每个 Route 定义 JSON Schema tool，调用 `callDeepSeekWithTool<T>()`，`tool_choice: "function"` 强制调用，输出从 `tool_calls[0].function.arguments` 解析。

### 页面（9 个路由）

| 路由 | 页面 | 主要组件 |
|------|------|---------|
| `/login` | 登录 | AuthProvider（全局认证 Context） |
| `/register` | 注册 | 同上 |
| `/` | 首页（每日总结） | GreetingBanner、ProactiveCard、DailyNutritionCard、DailyResultCard、HomeOverviewStats、ColdStartGuide、FabAdd、MemoryManager |
| `/meal` | 单餐分析（聊天界面） | MealNutritionCard、MealResultCard |
| `/assistant` | AI 营养助手（食小光） | 流式对话、Markdown 渲染、AI 设置面板 |
| `/history` | 历史记录 | 按日期分组、多选删除 |
| `/weekly` | 每周分析 | SVG 趋势图、下周目标应用 |
| `/profile` | 个人资料 | 身体数据、目标模式、目标范围预览 |
| `/admin` | 后台管理 | 用户统计、餐记录、每日总结、记忆、推送日志 |

### `components/` — UI 组件

| 目录 | 组件 |
|------|------|
| `components/` | AuthProvider |
| `components/home/` | AISettings、ColdStartGuide、DailyNutritionCard、DailyResultCard、FabAdd、GreetingBanner、HomeOverviewStats、MemoryManager、ProactiveCard |
| `components/meal/` | MealNutritionCard、MealResultCard |
| `components/ui/` | CalorieGauge、Card、Icons、MarkdownText、NutrientRow、PullToRefresh、RangeBar、RatingBadge |

### 脚本与评估

| 文件 | 作用 |
|------|------|
| `scripts/run-evaluation.mjs` | 离线评估脚本：读 CSV → 调 API → 校验 → 输出报告 |
| `scripts/seed-muscle-gain.js` | 浏览器控制台脚本：注入 7 天增肌模拟数据 |
| `scripts/seed-weekly-data.js` | 浏览器控制台脚本：注入 7 天通用模拟数据 |
| `docs/评测用例集.csv` | 64 条评测用例（8 场景 × 正常/边界/对抗），WPS 可直接打开 |

## 关键约定

### localStorage 键名（2 个，仅保留认证相关）

| 键 | 值 |
|------|------|
| `shiguangji-auth` | `"true"` / `"false"` |
| `shiguangji-user-id` | Supabase users.id（UUID） |

业务数据全部走 Supabase，写入时双写 localStorage 作为 UI 快速响应缓存（见 `storage.ts` 中的 `sync()` 函数），但读取均从 Supabase 获取。

### 每日总结缓存

指纹 = 当日所有 meal ID 排序后拼接。指纹变化 + 三餐齐全 → 触发新的 AI 调用；否则复用缓存。

### 改 prompt 必须同步改 Schema

修改 `lib/prompts.ts` 后，必须同步更新对应 API Route 的 `tool.parameters` JSON Schema，否则 Tool Calling 输出字段可能漂移。

### Agent 架构

AI 助手（`/api/assistant/chat`）是真正的 Agent：LLM 自主决定何时调用哪个工具，支持多轮工具调用循环。每次对话结束时并行调用 `extract_memory` 工具提取长期记忆。

### 主动触达

`proactiveEngine.ts` 负责检测 7 种事件类型，`/api/proactive` 调用 LLM 生成文案。频控规则：每用户每天上限、免打扰时段（22:00-08:00）禁发、同一天多事件按优先级只发 1 条。

## 运行

```bash
npm install
npm run dev     # http://localhost:3000
```

需要 `.env.local` 中配置 `DEEPSEEK_API_KEY` 和 Supabase 凭据（`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`）。

## 文档

| 文档 | 内容 |
|------|------|
| `docs/食光记-PRD-最终版.md` | 完整 PRD，含附录 E 评测用例规格 + 6.6 节 Bad Case 分析 |
| `docs/食光记-落地补充-面试问答.md` | 12 个面试主题 + 6 道高频追问 |
| `docs/评测用例集.csv` | 64 条评测用例（可 WPS 编辑） |
| `docs/面试准备-补齐数据短板.md` | 补齐"0 用户"短板的三步计划 |
