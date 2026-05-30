// ========== 食光记 · 7天模拟数据灌入脚本 ==========
// 用法：浏览器打开 http://localhost:3000，F12 → Console，粘贴运行
// 作用：生成过去 7 天的三餐模拟数据，写入 localStorage，然后刷新页面即可测试周报

(function seedWeeklyData() {
  const MEAL_TEMPLATES = {
    "早餐": [
      { text: "全麦面包2片 + 鸡蛋1个 + 牛奶250ml", nutrition: { protein_g: 22, carbs_g: 45, fat_g: 12, vegetables_g: 0, calories_kcal: 380 } },
      { text: "燕麦粥1碗 + 水煮蛋1个 + 苹果1个", nutrition: { protein_g: 15, carbs_g: 55, fat_g: 8, vegetables_g: 0, calories_kcal: 350 } },
      { text: "豆浆300ml + 肉包2个 + 凉拌黄瓜1份", nutrition: { protein_g: 20, carbs_g: 50, fat_g: 14, vegetables_g: 60, calories_kcal: 420 } },
      { text: "小米粥1碗 + 煎蛋1个 + 酱牛肉3片", nutrition: { protein_g: 25, carbs_g: 40, fat_g: 15, vegetables_g: 0, calories_kcal: 400 } },
      { text: "牛奶200ml + 三明治1份（火腿+生菜+蛋）", nutrition: { protein_g: 18, carbs_g: 42, fat_g: 16, vegetables_g: 30, calories_kcal: 390 } },
      { text: "豆花1碗 + 油条1根 + 茶叶蛋1个", nutrition: { protein_g: 16, carbs_g: 48, fat_g: 18, vegetables_g: 0, calories_kcal: 430 } },
      { text: "玉米1根 + 酸奶200ml + 核桃3颗", nutrition: { protein_g: 12, carbs_g: 50, fat_g: 14, vegetables_g: 0, calories_kcal: 370 } },
    ],
    "午餐": [
      { text: "米饭1碗 + 西红柿炒蛋1份 + 炒青菜1份", nutrition: { protein_g: 18, carbs_g: 70, fat_g: 14, vegetables_g: 150, calories_kcal: 520 } },
      { text: "面条1碗 + 卤牛肉4片 + 凉拌黄瓜1份", nutrition: { protein_g: 28, carbs_g: 65, fat_g: 16, vegetables_g: 80, calories_kcal: 560 } },
      { text: "米饭1碗 + 红烧鸡块1份 + 蒜蓉西兰花1份", nutrition: { protein_g: 32, carbs_g: 68, fat_g: 18, vegetables_g: 120, calories_kcal: 600 } },
      { text: "麻辣烫（蔬菜多+豆皮+肉片）1份 + 米饭半碗", nutrition: { protein_g: 24, carbs_g: 55, fat_g: 20, vegetables_g: 180, calories_kcal: 550 } },
      { text: "饺子12个（猪肉白菜） + 紫菜蛋花汤1碗", nutrition: { protein_g: 22, carbs_g: 60, fat_g: 22, vegetables_g: 40, calories_kcal: 580 } },
      { text: "米饭1碗 + 清蒸鱼1份 + 炒豆苗1份", nutrition: { protein_g: 30, carbs_g: 65, fat_g: 10, vegetables_g: 130, calories_kcal: 510 } },
      { text: "炒饭1份（虾仁+蛋+青豆） + 酸辣汤1碗", nutrition: { protein_g: 20, carbs_g: 72, fat_g: 20, vegetables_g: 50, calories_kcal: 590 } },
    ],
    "晚餐": [
      { text: "米饭半碗 + 炒西兰花1份 + 蒸蛋1个", nutrition: { protein_g: 16, carbs_g: 40, fat_g: 10, vegetables_g: 130, calories_kcal: 380 } },
      { text: "红薯1个 + 白灼虾8只 + 凉拌菠菜1份", nutrition: { protein_g: 28, carbs_g: 38, fat_g: 6, vegetables_g: 120, calories_kcal: 360 } },
      { text: "杂粮粥1碗 + 炒豆芽1份 + 卤豆干2块", nutrition: { protein_g: 14, carbs_g: 45, fat_g: 8, vegetables_g: 100, calories_kcal: 340 } },
      { text: "米饭半碗 + 炒鸡胸肉1份 + 炒青菜1份", nutrition: { protein_g: 30, carbs_g: 38, fat_g: 8, vegetables_g: 140, calories_kcal: 400 } },
      { text: "全麦面包1片 + 蔬菜沙拉1份 + 煎三文鱼1块", nutrition: { protein_g: 24, carbs_g: 30, fat_g: 14, vegetables_g: 160, calories_kcal: 370 } },
      { text: "小米粥1碗 + 蒸鱼1块 + 凉拌木耳1份", nutrition: { protein_g: 22, carbs_g: 35, fat_g: 8, vegetables_g: 90, calories_kcal: 330 } },
      { text: "米饭半碗 + 番茄炖牛腩1份 + 炒空心菜1份", nutrition: { protein_g: 26, carbs_g: 40, fat_g: 14, vegetables_g: 110, calories_kcal: 430 } },
    ],
  };

  const MEAL_TYPES = ["早餐", "午餐", "晚餐"];

  function createId() {
    return "seed-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  function getDateOffset(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const meals = [];

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = getDateOffset(dayOffset);
    for (let i = 0; i < MEAL_TYPES.length; i++) {
      const type = MEAL_TYPES[i];
      // Pick template based on day offset to ensure variety
      const templateIndex = (dayOffset + i) % 7;
      const template = MEAL_TEMPLATES[type][templateIndex];

      // Add small random variation to nutrition values
      const vary = (v) => Math.round(v * (0.85 + Math.random() * 0.3));

      meals.push({
        id: createId(),
        date,
        meal_type: type,
        meal_record_text: template.text,
        nutrition_estimate: {
          protein_g: vary(template.nutrition.protein_g),
          carbs_g: vary(template.nutrition.carbs_g),
          fat_g: vary(template.nutrition.fat_g),
          vegetables_g: vary(template.nutrition.vegetables_g),
          calories_kcal: vary(template.nutrition.calories_kcal),
        },
        meal_status: {
          calories: template.nutrition.calories_kcal > 550 ? "是" : "否",
          protein: template.nutrition.protein_g >= 22 ? "较多" : template.nutrition.protein_g < 16 ? "较少" : "正常",
          carbs: template.nutrition.carbs_g >= 65 ? "较多" : template.nutrition.carbs_g < 40 ? "较少" : "正常",
          vegetables: template.nutrition.vegetables_g >= 120 ? "较多" : template.nutrition.vegetables_g < 50 ? "较少" : "正常",
          fat: template.nutrition.fat_g >= 18 ? "是" : "否",
        },
        created_at: new Date().toISOString(),
      });
    }
  }

  // Clear existing summary cache so AI re-generates
  for (let i = 0; i < 7; i++) {
    localStorage.removeItem(`shiguangji-daily-summary-${getDateOffset(i)}`);
  }

  localStorage.setItem("shiguangji-meals", JSON.stringify(meals));

  console.log(`✅ 已灌入 ${meals.length} 条模拟餐记录（${new Set(meals.map(m => m.date)).size} 天）`);
  console.log("📋 刷新页面后进入「周报」标签页即可查看");
  console.log("💡 提示：如需清除模拟数据，执行 localStorage.removeItem('shiguangji-meals'); location.reload()");
})();
