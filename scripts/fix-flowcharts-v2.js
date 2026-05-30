const fs = require('fs');
const path = 'D:/my file/claude-demo/my test/docs/食光记-PRD-最终版.md';
let content = fs.readFileSync(path, 'utf-8');

// Find the 4.4.2 section boundaries
const startMarker = '### 4.4.2 Agent 与 workflow 决策流程';
const endMarker = '### 4.4.3 工具清单与定义';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.log('Markers not found!');
    console.log('startIdx:', startIdx, 'endIdx:', endIdx);
    process.exit(1);
}

// We already know the escaping pattern from the existing content.
// Let's extract a sample to determine the backslash pattern.
// From the earlier Bash output, nodes look like: A\\\\\\\[label\]
// which in raw file bytes is: A\\[label] (2 backslashes + [)
// But when read by Node's utf-8, backslashes are literal.

// Actually, let me just check: count backslashes in a node label
const sectionContent = content.substring(startIdx, endIdx);
const sampleMatch = sectionContent.match(/A(\\+)\[用户提问/);
if (sampleMatch) {
    const bsCount = sampleMatch[1].length;
    console.log('Backslash count in node labels:', bsCount);
    // Use this count for all new nodes
    const BS = '\\'.repeat(bsCount);

    const newSection = `### 4.4.2 Agent 与 workflow 决策流程

**Agent流程（AI助手）**

` + '```mermaid\nflowchart TD\n' +
`    A${BS}[用户提问] --> B${BS}[Agent 理解问题]\n` +
`    B --> C{Agent 自主决策}\n` +
`    C -->|需要用户数据| D${BS}[调用：读取用户 profile + 目标]\n` +
`    C -->|需要饮食记录| E${BS}[调用：查询近 N 天饮食数据]\n` +
`    C -->|需要营养知识| F${BS}[调用：检索知识库]\n` +
`    C -->|需要用户偏好| G${BS}[调用：读取用户 memory]\n` +
`    C -->|简单闲聊或已有足够信息| H${BS}[直接生成回答]\n` +
`    D --> I{信息足够?}\n` +
`    E --> I\n` +
`    F --> I\n` +
`    G --> I\n` +
`    I -->|不够| C\n` +
`    I -->|足够| H\n` +
`    H --> J${BS}[输出回答给用户]\n` +
`    J --> K${BS}[系统自动：Memory 提取]\n` +
`    K --> L{提取结果?}\n` +
`    L -->|新信息| M${BS}[写入 memory]\n` +
`    L -->|与已有重复| N${BS}[忽略]\n` +
`    L -->|与已有矛盾| O${BS}[写入并标记待确认]\n` +
`    L -->|无信息| P${BS}[结束]\n` +
`    M --> P\n` +
`    N --> P\n` +
`    O --> P\n` +
'```\n\n' +
`**Workflow 流程（单餐记录）**

` + '```mermaid\nflowchart TD\n' +
`    A${BS}[用户输入饮食描述] --> B${BS}[后端查食物营养库]\n` +
`    B --> C${BS}[后端读用户 memory]\n` +
`    C --> D${BS}[拼装 Prompt：食物描述 + RAG参考值 + memory + profile + 目标]\n` +
`    D --> E${BS}[调用 LLM：info_check]\n` +
`    E --> F{is_enough?}\n` +
`    F -->|false 且未达上限| G${BS}[返回追问消息]\n` +
`    G --> H${BS}[用户补充回答]\n` +
`    H --> D\n` +
`    F -->|false 已达2次上限| I${BS}[强制进入分析]\n` +
`    F -->|true| I\n` +
`    I --> J${BS}[拼装分析 Prompt]\n` +
`    J --> K${BS}[调用 LLM：meal_analysis]\n` +
`    K --> L${BS}[后端校验输出]\n` +
`    L --> M{校验通过?}\n` +
`    M -->|是| N${BS}[返回营养卡片]\n` +
`    M -->|否| O{已重试?}\n` +
`    O -->|未重试过| J\n` +
`    O -->|已重试1次| P${BS}[降级：返回默认营养卡片，标注异常]\n` +
`    N --> Q${BS}[用户确认保存]\n` +
`    P --> Q\n` +
`    Q --> R${BS}[写入数据库，返回首页]\n` +
'```\n\n' +
`**Workflow 流程（每日总结）**

` + '```mermaid\nflowchart TD\n' +
`    A${BS}[用户打开首页或下拉刷新] --> B${BS}[后端检查缓存指纹]\n` +
`    B --> C{指纹变化?}\n` +
`    C -->|否| D${BS}[返回缓存结果]\n` +
`    C -->|是| E{三餐齐全?}\n` +
`    E -->|否| F${BS}[返回等待状态：还差X餐]\n` +
`    E -->|是| G${BS}[后端读用户 memory]\n` +
`    G --> H${BS}[拼装 Prompt：三餐数据 + 目标范围 + memory]\n` +
`    H --> I${BS}[调用 LLM：daily_summary]\n` +
`    I --> J{调用成功?}\n` +
`    J -->|是| K${BS}[后端校验 + 写入缓存]\n` +
`    J -->|否| L${BS}[重试1次]\n` +
`    L --> M{重试成功?}\n` +
`    M -->|是| K\n` +
`    M -->|否| N${BS}[降级：显示总结生成中，下拉重试]\n` +
`    K --> O${BS}[返回每日总结卡片]\n` +
'```\n\n' +
`**Workflow 流程（每周分析）**

` + '```mermaid\nflowchart TD\n' +
`    A${BS}[用户打开周报页面] --> B${BS}[后端检查周报缓存指纹]\n` +
`    B --> C{指纹变化?}\n` +
`    C -->|否| D${BS}[返回缓存结果]\n` +
`    C -->|是| E{数据覆盖?}\n` +
`    E -->|0天| F${BS}[空状态引导]\n` +
`    E -->|1至6天| G${BS}[展示部分分析 + 缺少天数提示]\n` +
`    E -->|满7天| H${BS}[后端读用户 memory]\n` +
`    H --> I${BS}[拼装 Prompt：7天数据 + 目标 + memory]\n` +
`    I --> J${BS}[调用 LLM：weekly_analysis]\n` +
`    J --> K{调用成功?}\n` +
`    K -->|是| L${BS}[后端校验 + 写入缓存]\n` +
`    K -->|否| M${BS}[重试1次]\n` +
`    M --> N{重试成功?}\n` +
`    N -->|是| L\n` +
`    N -->|否| O${BS}[降级：趋势图正常展示，AI卡片显示生成失败]\n` +
`    L --> P${BS}[返回趋势图 + AI 分析卡片]\n` +
`    P --> Q{用户操作}\n` +
`    Q -->|采纳| R${BS}[目标自动更新]\n` +
`    Q -->|忽略| S${BS}[保持当前目标]\n` +
'```\n\n' +
`**Workflow 流程（主动触达文案生成）**

` + '```mermaid\nflowchart TD\n' +
`    A${BS}[系统定时检测] --> B{命中触发条件?}\n` +
`    B -->|否| C${BS}[等待下一轮检测]\n` +
`    B -->|是| D{频控检查}\n` +
`    D -->|开关关闭或达上限或免打扰| E${BS}[跳过]\n` +
`    D -->|通过| F${BS}[后端读用户 memory]\n` +
`    F --> G${BS}[拼装 Prompt：事件类型 + 用户上下文 + memory]\n` +
`    G --> H${BS}[调用 LLM：文案生成]\n` +
`    H --> I{调用成功?}\n` +
`    I -->|是| J${BS}[返回 30字以内文案]\n` +
`    I -->|否| K${BS}[静默跳过，记录日志]\n` +
`    J --> L{用户在线?}\n` +
`    L -->|是| M${BS}[首页气泡展示]\n` +
`    L -->|否| N${BS}[系统推送通知]\n` +
`    N --> O${BS}[用户点击通知打开 App]\n` +
'```\n';

    content = content.substring(0, startIdx) + newSection + content.substring(endIdx);
    fs.writeFileSync(path, content, 'utf-8');
    console.log('Done. Replaced section with bsCount=' + bsCount);
} else {
    console.log('Could not detect backslash pattern');
}
