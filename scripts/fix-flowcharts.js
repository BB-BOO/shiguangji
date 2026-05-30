const fs = require('fs');
const path = 'D:/my file/claude-demo/my test/docs/食光记-PRD-最终版.md';
let content = fs.readFileSync(path, 'utf-8');

// ============================================================
// 1. Agent 流程 — Memory 提取扩展为四种结果
// ============================================================
const agentMemoryOld = `    J --> K[系统自动：Memory 提取]
    K --> L{检测到新用户信息?}
    L -->|是| M[写入或更新 memory]
    L -->|否| N[结束]
    M --> N`;
const agentMemoryNew = `    J --> K[系统自动：Memory 提取]
    K --> L{提取结果?}
    L -->|新信息| M[写入 memory]
    L -->|与已有重复| N[忽略]
    L -->|与已有矛盾| O[写入并标记待确认]
    L -->|无信息| P[结束]
    M --> P
    N --> P
    O --> P`;
content = content.replace(agentMemoryOld, agentMemoryNew);

// ============================================================
// 2. 单餐记录 Workflow — 三处修复:
//    a) 追问循环回 D (拼装 Prompt) 而非 B (查食物库)
//    b) I→J 之间插入"拼装分析 Prompt"
//    c) 校验失败分支拆成重试/降级两条
// ============================================================
const mealWorkflowOld = `    A[用户输入饮食描述] --> B[后端查食物营养库]
    B --> C[后端读用户 memory]
    C --> D[拼装 Prompt：食物描述 + RAG参考值 + memory + profile + 目标]
    D --> E[调用 LLM：info_check]
    E --> F{is_enough?}
    F -->|false 且未达上限| G[返回追问消息]
    G --> H[用户补充回答]
    H --> B
    F -->|false 已达2次上限| I[强制进入分析阶段]
    F -->|true| I
    I --> J[调用 LLM：meal_analysis]
    J --> K[后端校验输出]
    K --> L{校验通过?}
    L -->|是| M[返回营养卡片]
    L -->|否| N[重试1次或降级处理]
    N --> J
    M --> O[用户确认保存]
    O --> P[写入数据库，返回首页]`;
const mealWorkflowNew = `    A[用户输入饮食描述] --> B[后端查食物营养库]
    B --> C[后端读用户 memory]
    C --> D[拼装 Prompt：食物描述 + RAG参考值 + memory + profile + 目标]
    D --> E[调用 LLM：info_check]
    E --> F{is_enough?}
    F -->|false 且未达上限| G[返回追问消息]
    G --> H[用户补充回答]
    H --> D
    F -->|false 已达2次上限| I[强制进入分析]
    F -->|true| I
    I --> J[拼装分析 Prompt]
    J --> K[调用 LLM：meal_analysis]
    K --> L[后端校验输出]
    L --> M{校验通过?}
    M -->|是| N[返回营养卡片]
    M -->|否| O{已重试?}
    O -->|未重试过| J
    O -->|已重试1次| P[降级：返回默认营养卡片，标注异常]
    N --> Q[用户确认保存]
    P --> Q
    Q --> R[写入数据库，返回首页]`;
content = content.replace(mealWorkflowOld, mealWorkflowNew);

// ============================================================
// 3. 每日总结 Workflow — 加三餐齐全判断 + 错误处理分支
// ============================================================
const dailyWorkflowOld = `    A[用户打开首页或下拉刷新] --> B[后端检查缓存指纹]
    B --> C{指纹变化?}
    C -->|否| D[返回缓存结果]
    C -->|是| E[后端读用户 memory]
    E --> F[拼装 Prompt：三餐数据 + 目标范围 + memory]
    F --> G[调用 LLM：daily_summary]
    G --> H[后端校验 + 写入缓存]
    H --> I[返回每日总结卡片]`;
const dailyWorkflowNew = `    A[用户打开首页或下拉刷新] --> B[后端检查缓存指纹]
    B --> C{指纹变化?}
    C -->|否| D[返回缓存结果]
    C -->|是| E{三餐齐全?}
    E -->|否| F[返回等待状态：还差X餐]
    E -->|是| G[后端读用户 memory]
    G --> H[拼装 Prompt：三餐数据 + 目标范围 + memory]
    H --> I[调用 LLM：daily_summary]
    I --> J{调用成功?}
    J -->|是| K[后端校验 + 写入缓存]
    J -->|否| L[重试1次]
    L --> M{重试成功?}
    M -->|是| K
    M -->|否| N[降级：显示总结生成中，下拉重试]
    K --> O[返回每日总结卡片]`;
content = content.replace(dailyWorkflowOld, dailyWorkflowNew);

// ============================================================
// 4. 每周分析 Workflow — 加错误处理分支
// ============================================================
const weeklyWorkflowOld = `    A[用户打开周报页面] --> B[后端检查周报缓存指纹]
    B --> C{指纹变化?}
    C -->|否| D[返回缓存结果]
    C -->|是| E{数据覆盖?}
    E -->|0天| F[空状态引导]
    E -->|1至6天| G[展示部分分析 + 缺少天数提示]
    E -->|满7天| H[后端读用户 memory]
    H --> I[拼装 Prompt：7天数据 + 目标 + memory]
    I --> J[调用 LLM：weekly_analysis]
    J --> K[后端校验 + 写入缓存]
    K --> L[返回趋势图 + AI 分析卡片]
    L --> M{用户操作}
    M -->|采纳| N[目标自动更新]
    M -->|忽略| O[保持当前目标]`;
const weeklyWorkflowNew = `    A[用户打开周报页面] --> B[后端检查周报缓存指纹]
    B --> C{指纹变化?}
    C -->|否| D[返回缓存结果]
    C -->|是| E{数据覆盖?}
    E -->|0天| F[空状态引导]
    E -->|1至6天| G[展示部分分析 + 缺少天数提示]
    E -->|满7天| H[后端读用户 memory]
    H --> I[拼装 Prompt：7天数据 + 目标 + memory]
    I --> J[调用 LLM：weekly_analysis]
    J --> K{调用成功?}
    K -->|是| L[后端校验 + 写入缓存]
    K -->|否| M[重试1次]
    M --> N{重试成功?}
    N -->|是| L
    N -->|否| O[降级：趋势图正常展示，AI卡片显示生成失败]
    L --> P[返回趋势图 + AI 分析卡片]
    P --> Q{用户操作}
    Q -->|采纳| R[目标自动更新]
    Q -->|忽略| S[保持当前目标]`;
content = content.replace(weeklyWorkflowOld, weeklyWorkflowNew);

// ============================================================
// 5. 主动触达 Workflow — 加错误处理分支
// ============================================================
const proactiveWorkflowOld = `    A[系统定时检测] --> B{命中触发条件?}
    B -->|否| C[等待下一轮检测]
    B -->|是| D{频控检查}
    D -->|开关关闭或达上限或免打扰| E[跳过]
    D -->|通过| F[后端读用户 memory]
    F --> G[拼装 Prompt：事件类型 + 用户上下文 + memory]
    G --> H[调用 LLM：文案生成]
    H --> I[返回 30字以内文案]
    I --> J{用户在线?}
    J -->|是| K[首页气泡展示]
    J -->|否| L[系统推送通知]
    L --> M[用户点击通知打开 App]`;
const proactiveWorkflowNew = `    A[系统定时检测] --> B{命中触发条件?}
    B -->|否| C[等待下一轮检测]
    B -->|是| D{频控检查}
    D -->|开关关闭或达上限或免打扰| E[跳过]
    D -->|通过| F[后端读用户 memory]
    F --> G[拼装 Prompt：事件类型 + 用户上下文 + memory]
    G --> H[调用 LLM：文案生成]
    H --> I{调用成功?}
    I -->|是| J[返回 30字以内文案]
    I -->|否| K[静默跳过，记录日志]
    J --> L{用户在线?}
    L -->|是| M[首页气泡展示]
    L -->|否| N[系统推送通知]
    N --> O[用户点击通知打开 App]`;
content = content.replace(proactiveWorkflowOld, proactiveWorkflowNew);

fs.writeFileSync(path, content, 'utf-8');
console.log('All 5 flowcharts updated.');
