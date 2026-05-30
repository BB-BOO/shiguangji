# 食光记 · 开发者速查卡

AI 饮食行为分析系统（MVP）。Next.js 15 + React 19 + TypeScript + Tailwind CSS 4。
数据存 localStorage，AI 通过 Next.js API Routes 调用 DeepSeek API（`deepseek-chat`，Tool Calling 模式）。

## 架构

```
浏览器 (React) ──fetch──> Next.js API Routes ──fetch──> DeepSeek API
    │
    └── read/write ──> localStorage
```

无后端数据库、无 Dify、无第三方 UI 库。图表用内联 SVG。

## 文件地图

### `lib/` — 核心库

| 文件 | 作用 |
|------|------|
| `lib/types.ts` | 所有 TS 类型：UserProfile、MealRecord、DailyTargetRange、API 请求/响应 |
| `lib/aiClient.ts` | `callDeepSeekWithTool<T>(params, tool)` — DeepSeek 调用封装，Tool Calling 强制结构化输出 |
| `lib/prompts.ts` | 四个系统提示词：INFO_CHECK / MEAL_ANALYSIS / DAILY_SUMMARY / WEEKLY_ANALYSIS。**改 AI 行为改这里** |
| `lib/storage.ts` | localStorage CRUD，含每日总结指纹缓存（避免菜单变时重复调用 AI） |
| `lib/goals.ts` | Mifflin-St Jeor 公式计算 BMR + 初始目标范围 |
| `lib/difyService.ts` | 前端 fetch 封装（名存实亡：调用 Next.js API Routes，非 Dify） |
| `lib/ratingStyles.ts` | 营养状态枚举 → Tailwind 颜色类的映射 |

### `app/api/` — API 路由（后端代理）

| 路由 | Tool 名称 | 功能 |
|------|-----------|------|
| `POST /api/meal-chat` | `info_check` | 信息完整性判断 → `{ isEnough, assistantMessage }` |
| `POST /api/meal-chat/analyze` | `meal_analysis` | 单餐营养分析 → 5 营养素 + summary + feedback |
| `POST /api/daily-summary` | `daily_summary` | 每日整体分析（vs 目标范围） |
| `POST /api/weekly-analysis` | `weekly_analysis` | 每周趋势 + 下周目标调整 |

每个 Route 定义自己的 JSON Schema tool，调用 `callDeepSeekWithTool<T>()`，Tool Calling 模式下模型被迫调用指定函数，参数天然符合 schema。

### 页面与组件

| 路由 | 页面 | 主要组件 |
|------|------|---------|
| `/login` | 登录 | AuthProvider（全局认证 Context） |
| `/register` | 注册 | 同上 |
| `/` | 首页（每日总结） | DailyNutritionCard、DailyResultCard、HomeOverviewStats、FabAdd |
| `/meal` | 单餐分析（聊天界面） | MealNutritionCard、MealResultCard |
| `/history` | 历史记录 | 按日期分组、多选删除 |
| `/weekly` | 每周分析 | SVG 趋势图、下周目标应用按钮 |
| `/profile` | 个人资料 | 目标模式、身体数据、目标范围预览 |

UI 原子组件：Card、NutrientRow、RangeBar、RatingBadge、CalorieGauge、Icons

## 关键约定

### Tool Calling 强制输出

所有 AI 调用走 `callDeepSeekWithTool<T>({ systemPrompt, userMessage, tool })`：
- `tool_choice: { type: "function", function: { name: tool.name } }` 强制调用
- 输出从 `tool_calls[0].function.arguments` 解析
- 有降级：若模型未调用 tool，尝试从 `content` 解析 JSON

### localStorage 键名

| 键 | 值 |
|------|------|
| `shiguangji-auth` | `"true"` / `"false"` |
| `shiguangji-profile` | UserProfile JSON |
| `shiguangji-targets` | DailyTargetRange JSON |
| `shiguangji-meals` | MealRecord[] JSON |
| `shiguangji-daily-summary` | `{ date, fingerprint, summary }` |

### 每日总结缓存

指纹 = 当日所有 meal ID 排序后拼接。指纹变化 + 三餐齐全 → 触发新的 AI 调用；否则复用缓存。`loadDailySummaryCache(date)` / `saveDailySummaryCache(date, fingerprint, summary)`。

### 改 prompt 必须同步改 Schema

修改 `lib/prompts.ts` 中的提示词后，必须同步更新对应 API Route 中的 `tool.parameters` JSON Schema，否则 Tool Calling 输出字段可能漂移。

## 运行

```bash
npm install
npm run dev     # http://localhost:3000
```

需要 `.env.local` 中配置 `DEEPSEEK_API_KEY`。
