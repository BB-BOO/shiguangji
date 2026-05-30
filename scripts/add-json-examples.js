const fs = require('fs');
const path = 'D:/my file/claude-demo/my test/docs/食光记-PRD-最终版.md';
let content = fs.readFileSync(path, 'utf-8');

// First, clean the Tool 5 example inserted by the first run
const dupMarker = '"message": "今天的晚饭有记得吃吗？"';
const dupIdx = content.indexOf(dupMarker);
if (dupIdx > 0) {
    // Find the start of the JSON example block (### Tool 5 heading area)
    // Go backward to find "**JSON 示例：**"
    const before = content.lastIndexOf('**JSON 示例：**', dupIdx);
    // Go forward to find the closing ``` then ### B.1
    const afterClose = content.indexOf('```', dupIdx);
    const afterB1 = content.indexOf('### B.1', afterClose);
    if (before > 0 && afterB1 > 0) {
        content = content.substring(0, before) + content.substring(afterB1);
        console.log('Cleaned duplicate Tool 5 example');
    }
}

function insertBefore(marker, insertion) {
    const idx = content.indexOf(marker);
    if (idx === -1) {
        console.log('NOT FOUND: ' + marker.substring(0, 60));
        return false;
    }
    content = content.substring(0, idx) + '\n' + insertion + '\n\n' + content.substring(idx);
    console.log('Inserted before: ' + marker.substring(0, 50));
    return true;
}

// Tool 1: insert before "### Tool 2"
insertBefore('### Tool 2：meal',
'**JSON 示例：**\n\n信息足够时：\n```json\n{\n  "is_enough": true,\n  "assistant_message": ""\n}\n```\n\n信息不足时（追问）：\n```json\n{\n  "is_enough": false,\n  "assistant_message": "这顿饭大概吃了多少？一份还是一碗？"\n}\n```'
);

// Tool 2: insert before "### Tool 3"
insertBefore('### Tool 3：daily',
'**JSON 示例：**\n\n```json\n{\n  "meal_record": "西红柿炒蛋1份、鸡腿1个、炒青菜1份、米饭1碗",\n  "meal_status": {\n    "calories": "否",\n    "protein": "正常",\n    "carbs": "正常",\n    "vegetables": "正常",\n    "fat": "否"\n  },\n  "nutrition_estimate": {\n    "calories_kcal": 650,\n    "protein_g": 32,\n    "carbs_g": 58,\n    "vegetables_g": 180,\n    "fat_g": 22\n  },\n  "feedback": "蛋白质刚好，蔬菜达标，下午上课消耗大，米饭可以再加半碗",\n  "analysis_text": "这顿饭搭配比较均衡。蛋白质来自鸡腿和鸡蛋，约32g，对于一餐来说刚好。蔬菜180g达标，西红柿和青菜提供了不错的膳食纤维。碳水58g主要来自米饭，考虑到下午还有课消耗较大，米饭可以再加半碗。油脂22g在正常范围。"\n}\n```'
);

// Tool 3: insert before "### Tool 4"
insertBefore('### Tool 4：weekly',
'**JSON 示例：**\n\n```json\n{\n  "daily_status": {\n    "calories": "均衡",\n    "protein": "达标",\n    "carbs": "超标",\n    "vegetables": "不足",\n    "fat": "均衡"\n  },\n  "feedback": "今天蛋白质刚好达标，蔬菜还差一点，明天午饭多加份青菜就完美了",\n  "analysis_text": "今天三餐整体热量在目标范围内，表现不错。蛋白质全天累计68g，刚好达标。碳水略超，主要是晚餐米饭份量偏多。蔬菜全天仅180g，距离250g目标还有差距，明天可以在午餐或晚餐加一份青菜。油脂控制得当。整体来看今天饮食质量中等偏上，补充蔬菜就更好了。"\n}\n```'
);

// Tool 4: insert before "### Tool 5"
insertBefore('### Tool 5：proactive',
'**JSON 示例：**\n\n```json\n{\n  "weekly_status": {\n    "calories": "均衡",\n    "protein": "不足",\n    "carbs": "超标",\n    "vegetables": "达标",\n    "fat": "均衡"\n  },\n  "goal_match": "基本符合",\n  "feedback": "本周蔬菜进步明显，蛋白质还需加强，下周试试每餐多加一个鸡蛋或一份豆腐",\n  "analysis_text": "本周7天数据整体趋势向好。热量控制平稳，日均1850kcal在目标范围内。蔬菜本周日均280g首次达标，比上周提升了40g，进步明显。但蛋白质日均仅58g，低于目标下限65g，其中周三、周五两天蛋白质尤其偏低。碳水日均超出目标上限约15g，主要集中在晚餐。下周建议：每餐固定加一个鸡蛋或一份豆腐作为蛋白质来源，晚餐米饭减至半碗。",\n  "next_week_target": {\n    "calories_min": 1800,\n    "calories_max": 2100,\n    "protein_min": 65,\n    "protein_max": 85,\n    "carbs_min": 200,\n    "carbs_max": 250,\n    "vegetables_min": 280,\n    "vegetables_max": 400,\n    "fat_min": 40,\n    "fat_max": 60\n  }\n}\n```'
);

// Tool 5: insert before "### B.1"
insertBefore('### B.1 数值校验范围',
'**JSON 示例：**\n\n```json\n{\n  "message": "今天的晚饭有记得吃吗？"\n}\n```'
);

fs.writeFileSync(path, content, 'utf-8');
console.log('Done');
