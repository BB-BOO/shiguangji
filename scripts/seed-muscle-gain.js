// ========== 食光记 · 增肌模式7天模拟数据 ==========
// 用法：浏览器打开 http://localhost:3000，F12 → Console，粘贴运行
// 场景：28岁男性，178cm，75kg，每周健身4次，目标增肌

(function seedMuscleGain() {
  // 增肌模板：高蛋白 + 充足碳水 + 适量蔬菜
  const MEAL_TEMPLATES = {
    "早餐": [
      { text: "全麦面包3片 + 鸡蛋2个 + 牛奶300ml + 香蕉1根", nutrition: { protein_g: 30, carbs_g: 65, fat_g: 16, vegetables_g: 0, calories_kcal: 520 } },
      { text: "燕麦粥1大碗 + 鸡蛋白3个 + 花生酱1勺 + 蓝莓一把", nutrition: { protein_g: 28, carbs_g: 58, fat_g: 18, vegetables_g: 0, calories_kcal: 510 } },
      { text: "馒头2个 + 酱牛肉100g + 豆浆300ml + 水煮蛋1个", nutrition: { protein_g: 32, carbs_g: 62, fat_g: 14, vegetables_g: 0, calories_kcal: 530 } },
      { text: "红薯2个 + 煎蛋2个 + 酸奶200ml + 核桃4颗", nutrition: { protein_g: 26, carbs_g: 60, fat_g: 20, vegetables_g: 0, calories_kcal: 500 } },
      { text: "玉米1根 + 火腿三明治1份 + 牛奶250ml + 鸡蛋1个", nutrition: { protein_g: 28, carbs_g: 55, fat_g: 18, vegetables_g: 30, calories_kcal: 490 } },
      { text: "全麦吐司3片 + 牛油果半个 + 煎蛋2个 + 蛋白粉1勺", nutrition: { protein_g: 35, carbs_g: 50, fat_g: 22, vegetables_g: 0, calories_kcal: 560 } },
      { text: "小米粥1碗 + 鸡胸肉100g + 水煮蛋2个 + 苹果1个", nutrition: { protein_g: 34, carbs_g: 48, fat_g: 10, vegetables_g: 0, calories_kcal: 450 } },
    ],
    "午餐": [
      { text: "米饭2碗 + 红烧鸡腿2个 + 炒西兰花1份 + 紫菜蛋花汤1碗", nutrition: { protein_g: 40, carbs_g: 90, fat_g: 20, vegetables_g: 150, calories_kcal: 750 } },
      { text: "米饭2碗 + 清蒸鲈鱼1条 + 蒜蓉生菜1份 + 炒豆芽1份", nutrition: { protein_g: 38, carbs_g: 85, fat_g: 14, vegetables_g: 200, calories_kcal: 700 } },
      { text: "牛肉面1大碗（加肉） + 卤蛋1个 + 凉拌黄瓜1份", nutrition: { protein_g: 35, carbs_g: 80, fat_g: 22, vegetables_g: 100, calories_kcal: 720 } },
      { text: "米饭2碗 + 宫保鸡丁1份 + 炒菠菜1份 + 番茄炒蛋1份", nutrition: { protein_g: 36, carbs_g: 88, fat_g: 24, vegetables_g: 180, calories_kcal: 780 } },
      { text: "炒饭1大盘（鸡胸+虾仁+蛋+青豆） + 蒜蓉西兰花1份", nutrition: { protein_g: 38, carbs_g: 95, fat_g: 20, vegetables_g: 130, calories_kcal: 760 } },
      { text: "米饭2碗 + 红烧排骨1份 + 炒空心菜1份 + 豆腐汤1碗", nutrition: { protein_g: 34, carbs_g: 82, fat_g: 26, vegetables_g: 140, calories_kcal: 740 } },
      { text: "饺子18个（牛肉馅） + 凉拌三丝1份 + 紫菜汤1碗", nutrition: { protein_g: 32, carbs_g: 78, fat_g: 24, vegetables_g: 100, calories_kcal: 710 } },
    ],
    "晚餐": [
      { text: "米饭1碗半 + 煎鸡胸肉200g + 炒蘑菇1份 + 蔬菜沙拉1份", nutrition: { protein_g: 42, carbs_g: 60, fat_g: 12, vegetables_g: 180, calories_kcal: 600 } },
      { text: "杂粮饭1碗 + 白灼虾15只 + 凉拌菠菜1份 + 蒸蛋1个", nutrition: { protein_g: 38, carbs_g: 50, fat_g: 10, vegetables_g: 150, calories_kcal: 520 } },
      { text: "红薯1个 + 煎三文鱼1块 + 炒芦笋1份 + 牛油果半个", nutrition: { protein_g: 35, carbs_g: 45, fat_g: 18, vegetables_g: 160, calories_kcal: 540 } },
      { text: "米饭1碗半 + 番茄炖牛腩1份 + 炒豆苗1份", nutrition: { protein_g: 36, carbs_g: 58, fat_g: 16, vegetables_g: 130, calories_kcal: 580 } },
      { text: "全麦意面1份 + 鸡肉丸8个 + 西兰花1份 + 番茄酱", nutrition: { protein_g: 34, carbs_g: 62, fat_g: 14, vegetables_g: 150, calories_kcal: 560 } },
      { text: "米饭1碗 + 蒸鱼1块 + 炒青椒肉丝1份 + 凉拌木耳1份", nutrition: { protein_g: 40, carbs_g: 52, fat_g: 16, vegetables_g: 140, calories_kcal: 570 } },
      { text: "藜麦饭1碗 + 烤鸡腿1个 + 炒西葫芦1份 + 水煮蛋1个", nutrition: { protein_g: 38, carbs_g: 48, fat_g: 14, vegetables_g: 160, calories_kcal: 530 } },
    ],
  };

  function createId() {
    return "seed-muscle-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  function getDateOffset(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const meals = [];

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = getDateOffset(dayOffset);
    const mealTypes = ["早餐", "午餐", "晚餐"];

    for (let i = 0; i < mealTypes.length; i++) {
      const templateIndex = (dayOffset + i * 2) % 7;
      const template = MEAL_TEMPLATES[mealTypes[i]][templateIndex];

      const vary = (v) => Math.round(v * (0.88 + Math.random() * 0.24));

      const meal_status = {
        calories: template.nutrition.calories_kcal > 650 ? "是" : "否",
        protein: template.nutrition.protein_g >= 30 ? "较多" : template.nutrition.protein_g < 18 ? "较少" : "正常",
        carbs: template.nutrition.carbs_g >= 75 ? "较多" : template.nutrition.carbs_g < 40 ? "较少" : "正常",
        vegetables: template.nutrition.vegetables_g >= 140 ? "较多" : template.nutrition.vegetables_g < 50 ? "较少" : "正常",
        fat: template.nutrition.fat_g >= 20 ? "是" : "否",
      };

      meals.push({
        id: createId(),
        date,
        meal_type: mealTypes[i],
        meal_record_text: template.text,
        nutrition_estimate: {
          protein_g: vary(template.nutrition.protein_g),
          carbs_g: vary(template.nutrition.carbs_g),
          fat_g: vary(template.nutrition.fat_g),
          vegetables_g: vary(template.nutrition.vegetables_g),
          calories_kcal: vary(template.nutrition.calories_kcal),
        },
        meal_status,
        created_at: new Date(`${date}T${String(6 + i * 5).padStart(2, "0")}:00:00`).toISOString(),
      });
    }
  }

  // 清除旧的每日总结缓存
  for (let i = 0; i < 7; i++) {
    const date = getDateOffset(i);
    for (const key of Object.keys(localStorage)) {
      if (key.includes("shiguangji-daily-summary") && key.includes(date)) {
        localStorage.removeItem(key);
      }
    }
  }

  localStorage.setItem("shiguangji-meals", JSON.stringify(meals));

  // 计算每日汇总
  const byDate = {};
  for (const m of meals) {
    if (!byDate[m.date]) byDate[m.date] = { protein: 0, carbs: 0, fat: 0, veg: 0, kcal: 0 };
    byDate[m.date].protein += m.nutrition_estimate.protein_g;
    byDate[m.date].carbs += m.nutrition_estimate.carbs_g;
    byDate[m.date].fat += m.nutrition_estimate.fat_g;
    byDate[m.date].veg += m.nutrition_estimate.vegetables_g;
    byDate[m.date].kcal += m.nutrition_estimate.calories_kcal;
  }

  console.log("✅ 已灌入增肌模式 " + meals.length + " 条餐记录（" + Object.keys(byDate).length + " 天）");
  console.log("");
  console.log("📊 每日营养汇总：");
  for (const [date, totals] of Object.entries(byDate)) {
    console.log(
      "  " + date + " | 蛋白质 " + totals.protein + "g | 碳水 " + totals.carbs + "g | 蔬菜 " + totals.veg + "g | 脂肪 " + totals.fat + "g | 热量 " + totals.kcal + "kcal"
    );
  }
  console.log("");
  console.log("📋 刷新页面后进入「周报」标签页即可查看");
  console.log("💡 清除数据：localStorage.removeItem('shiguangji-meals'); location.reload()");
})();
