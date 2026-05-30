const fs = require('fs');
const path = 'D:/my file/claude-demo/my test/docs/食光记-PRD-最终版.md';
let content = fs.readFileSync(path, 'utf-8');

// Scene 2: D → 小雯, E → 大刘
content = content.replace(
    '**典型用户**：D 减脂中，E 增肌中，同吃"米饭+宫保鸡丁+炒菠菜"。',
    '**典型用户**：小雯（目标减脂）和大刘（目标增肌），同吃"米饭+宫保鸡丁+炒菠菜"。'
);

// Scene 4: 替身 → 小林
content = content.replace(
    '**典型用户**：用户发现自己晚自习后总吃零食。',
    '**典型用户**：小林（食堂党大学生），晚自习后总想吃零食。'
);

// Replace table

// Find the table
const oldTableStart = '| 画像 | 姓名 | 身份 | 核心诉求 | 为什么选食光记 |';
const oldTableEnd = '| 自炊素食 | 阿琳 | 26岁UI设计师 | 增肌需蛋白质，不吃肉不知植物蛋白怎么搭 | AI 记住素食偏好，推荐豆腐蛋奶而非鸡胸肉 |';

const startIdx = content.indexOf(oldTableStart);
const endIdx = content.indexOf(oldTableEnd);

if (startIdx !== -1 && endIdx !== -1) {
    const newTable =
        '| 画像 | 姓名 | 身份 | 核心诉求 | 为什么选食光记 |\n' +
        '|------|------|------|---------|--------------|\n' +
        '| 食堂党大学生 | 小林 | 20 岁大二学生，三餐全靠食堂，午休仅 1 小时含排队，晚餐常在晚自习后凑合 | 想减脂但不懂营养，需要有人告诉他食堂现有条件下吃什么、吃多少 | AI 不说克重直接给行动建议，不耽误吃饭 |\n' +
        '| 应酬型销售经理 | 老张 | 32 岁酒水销售，每周 3-4 次饭局应酬，大鱼大肉+饮酒不可避免，非应酬日吃外卖凑合 | 体检脂肪肝+尿酸高，知道应酬伤身体但换不了工作，需要在"不可改变的部分"之外找到还能改善的地方 | AI 不劝"少喝酒"，从非应酬日补蔬菜、应酬日早午餐提前控制等角度给可执行方案 |\n' +
        '| 自炊蛋奶素食者 | 阿琳 | 26 岁 UI 设计师，自己做饭，蛋奶素（不吃肉但吃蛋奶），对食材有较强控制力，偶尔聚餐 | 增肌——健身半年，教练说多吃蛋白质，但不吃肉，不知道植物蛋白怎么搭配才够 | AI 记住她是蛋奶素，推荐豆腐、鸡蛋、牛奶、豆类，不推荐肉，感觉"这个 AI 真的懂我" |\n' +
        '| 减脂上班族 | 小雯 | 25 岁互联网运营，久坐体重上升，靠外卖解决三餐，偶尔奶茶 | 想减脂但不会做饭，外卖选择有限，需要有人告诉她外卖也能吃得健康 | AI 根据外卖场景给出可执行选择，不要求她"自己做饭" |\n' +
        '| 增肌健身族 | 大刘 | 28 岁程序员，每周健身 4 次，食堂+外卖为主 | 想增肌但饮食跟不上训练强度，蛋白质和碳水总是不够，不知道训练日怎么吃 | AI 基于训练日需求给出蛋白质和碳水增量建议，不说克重 |';

    content = content.slice(0, startIdx) + newTable + content.slice(endIdx + oldTableEnd.length);
    fs.writeFileSync(path, content, 'utf-8');
    console.log('Done');
} else {
    console.log('Markers not found. startIdx:', startIdx, 'endIdx:', endIdx);
}
