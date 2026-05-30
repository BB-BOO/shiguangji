// ========== 食光记 · 均衡饮食7天模拟数据 ==========
// 场景：28岁男性，178cm，75kg，目标维持/增肌，饮食较均衡
// 特点：每餐营养素分布合理，有高低波动，模拟真实饮食

export function seedBalancedWeek() {
  // 7天×3餐，每餐真实描述 + 合理营养估算
  const WEEK_MEALS = [
    // ===== Day -6 =====
    { dateOffset: 6, type: "早餐", text: "全麦面包2片 + 水煮蛋1个 + 牛奶250ml", protein: 22, carbs: 48, fat: 14, veg: 0, kcal: 410 },
    { dateOffset: 6, type: "午餐", text: "米饭1碗 + 红烧鸡块1份 + 蒜蓉西兰花1份 + 紫菜汤1碗", protein: 30, carbs: 72, fat: 18, veg: 130, kcal: 620 },
    { dateOffset: 6, type: "晚餐", text: "红薯1个 + 清蒸鲈鱼1块 + 凉拌菠菜1份", protein: 32, carbs: 42, fat: 8, veg: 140, kcal: 410 },

    // ===== Day -5 =====
    { dateOffset: 5, type: "早餐", text: "燕麦粥1碗 + 煎蛋1个 + 苹果1个", protein: 14, carbs: 55, fat: 10, veg: 0, kcal: 370 },
    { dateOffset: 5, type: "午餐", text: "牛肉面1碗（加肉） + 凉拌黄瓜1份 + 卤蛋1个", protein: 32, carbs: 68, fat: 20, veg: 90, kcal: 630 },
    { dateOffset: 5, type: "晚餐", text: "米饭半碗 + 白灼虾10只 + 炒空心菜1份 + 蒸蛋1个", protein: 34, carbs: 40, fat: 10, veg: 150, kcal: 430 },

    // ===== Day -4 =====
    { dateOffset: 4, type: "早餐", text: "豆浆300ml + 肉包2个 + 茶叶蛋1个", protein: 22, carbs: 52, fat: 16, veg: 0, kcal: 460 },
    { dateOffset: 4, type: "午餐", text: "米饭1碗 + 宫保鸡丁1份 + 炒豆芽1份 + 番茄蛋汤1碗", protein: 28, carbs: 70, fat: 22, veg: 120, kcal: 650 },
    { dateOffset: 4, type: "晚餐", text: "杂粮饭1碗 + 煎鸡胸肉150g + 炒芦笋1份", protein: 38, carbs: 48, fat: 10, veg: 140, kcal: 490 },

    // ===== Day -3 =====
    { dateOffset: 3, type: "早餐", text: "玉米1根 + 酸奶200ml + 水煮蛋1个 + 核桃3颗", protein: 18, carbs: 50, fat: 16, veg: 0, kcal: 420 },
    { dateOffset: 3, type: "午餐", text: "麻辣烫1份（豆腐+肉片+蔬菜多） + 米饭半碗", protein: 26, carbs: 58, fat: 20, veg: 180, kcal: 570 },
    { dateOffset: 3, type: "晚餐", text: "全麦意面1份 + 鸡肉丸6个 + 西兰花1份", protein: 30, carbs: 55, fat: 12, veg: 150, kcal: 500 },

    // ===== Day -2 =====
    { dateOffset: 2, type: "早餐", text: "小米粥1碗 + 酱牛肉80g + 凉拌海带丝1份", protein: 24, carbs: 42, fat: 8, veg: 40, kcal: 360 },
    { dateOffset: 2, type: "午餐", text: "米饭1碗 + 红烧排骨1份 + 炒青菜1份 + 豆腐汤1碗", protein: 28, carbs: 68, fat: 24, veg: 140, kcal: 640 },
    { dateOffset: 2, type: "晚餐", text: "米饭半碗 + 蒸鱼1块 + 炒西葫芦1份 + 凉拌木耳1份", protein: 30, carbs: 38, fat: 8, veg: 160, kcal: 390 },

    // ===== Day -1 (昨天) =====
    { dateOffset: 1, type: "早餐", text: "馒头1个 + 牛奶250ml + 煎蛋1个 + 香蕉1根", protein: 20, carbs: 58, fat: 14, veg: 0, kcal: 440 },
    { dateOffset: 1, type: "午餐", text: "饺子15个（猪肉白菜） + 凉拌三丝1份 + 紫菜蛋花汤1碗", protein: 24, carbs: 62, fat: 22, veg: 80, kcal: 590 },
    { dateOffset: 1, type: "晚餐", text: "藜麦饭1碗 + 烤鸡腿1个 + 炒蘑菇1份 + 蔬菜沙拉1份", protein: 36, carbs: 46, fat: 14, veg: 160, kcal: 510 },

    // ===== Day 0 (今天) =====
    { dateOffset: 0, type: "早餐", text: "全麦吐司2片 + 牛油果半个 + 鸡蛋白2个 + 牛奶200ml", protein: 24, carbs: 42, fat: 18, veg: 20, kcal: 430 },
    { dateOffset: 0, type: "午餐", text: "米饭1碗 + 清蒸鱼1条 + 炒菠菜1份 + 番茄炒蛋1份", protein: 34, carbs: 68, fat: 14, veg: 170, kcal: 580 },
    { dateOffset: 0, type: "晚餐", text: "红薯1个 + 白灼虾12只 + 炒豆苗1份 + 蒸蛋1个", protein: 36, carbs: 40, fat: 8, veg: 150, kcal: 420 },
  ];

  function getDate(daysAgo: number) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function createId() {
    return "seed-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  function vary(v: number) {
    return Math.round(v * (0.88 + Math.random() * 0.24));
  }

  const meals = WEEK_MEALS.map((m) => {
    const p = vary(m.protein);
    const c = vary(m.carbs);
    const f = vary(m.fat);
    const v = vary(m.veg);
    const cal = vary(m.kcal);

    return {
      id: createId(),
      date: getDate(m.dateOffset),
      meal_type: m.type,
      meal_record_text: m.text,
      nutrition_estimate: {
        protein_g: p,
        carbs_g: c,
        fat_g: f,
        vegetables_g: v,
        calories_kcal: cal,
      },
      meal_status: {
        calories: cal > 600 ? "是" : "否",
        protein: p >= 28 ? "较多" : p < 16 ? "较少" : "正常",
        carbs: c >= 68 ? "较多" : c < 40 ? "较少" : "正常",
        vegetables: v >= 130 ? "较多" : v < 40 ? "较少" : "正常",
        fat: f >= 20 ? "是" : "否",
      },
      created_at: new Date(`${getDate(m.dateOffset)}T${String(6 + ["早餐","午餐","晚餐"].indexOf(m.type) * 5).padStart(2, "0")}:00:00`).toISOString(),
    };
  });

  // 清除旧的每日总结缓存
  for (let i = 0; i < 7; i++) {
    const date = getDate(i);
    for (const key of Object.keys(localStorage)) {
      if (key.includes("shiguangji-daily-summary") && key.includes(date)) {
        localStorage.removeItem(key);
      }
    }
  }

  localStorage.setItem("shiguangji-meals", JSON.stringify(meals));

  // 每日汇总
  const byDate: Record<string, { p: number; c: number; f: number; v: number; cal: number }> = {};
  for (const m of meals) {
    if (!byDate[m.date]) byDate[m.date] = { p: 0, c: 0, f: 0, v: 0, cal: 0 };
    byDate[m.date].p += m.nutrition_estimate.protein_g;
    byDate[m.date].c += m.nutrition_estimate.carbs_g;
    byDate[m.date].f += m.nutrition_estimate.fat_g;
    byDate[m.date].v += m.nutrition_estimate.vegetables_g;
    byDate[m.date].cal += m.nutrition_estimate.calories_kcal;
  }

  console.log(`✅ 已灌入 ${meals.length} 条均衡饮食记录（${Object.keys(byDate).length} 天）`);
  console.log("📊 每日营养汇总：");
  for (const [date, t] of Object.entries(byDate)) {
    console.log(`  ${date} | 蛋白质 ${t.p}g | 碳水 ${t.c}g | 蔬菜 ${t.v}g | 脂肪 ${t.f}g | 热量 ${t.cal}kcal`);
  }
  console.log("📋 刷新页面查看周报");

  return { meals, byDate };
}
