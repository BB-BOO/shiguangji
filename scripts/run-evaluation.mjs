// 食光记 · 离线评估脚本（CSV 驱动版）
//
// 用法：
//   1. 先在一个终端启动 App：npm run dev
//   2. 在另一个终端跑评估：node scripts/run-evaluation.mjs
//
// 输出：
//   终端：实时逐条结果 + 汇总统计
//   scripts/eval-results.json：完整机器可读结果
//   scripts/eval-report.txt：评估报告（含人工核验清单）

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const CSV_PATH = resolve(__dirname, "..", "docs", "评测用例集.csv");

// ========== CSV 解析 ==========

function parseCSV(text) {
  // 去掉 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const lines = text.trim().split(/\r?\n/);
  const headers = parseCSVLine(lines[0]);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;
    const row = {};
    headers.forEach((h, j) => {
      row[h] = (cols[j] || "").trim();
    });
    if (row["场景"]) rows.push(row);
  }
  return { headers, rows };
}

// 解析单行 CSV（RFC 4180：逗号分隔，双引号转义）
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

// ========== 自动校验规则解析 ==========

function parseRules(ruleStr) {
  if (!ruleStr || ruleStr.trim() === "") return [];

  return ruleStr.split(";").map((part) => {
    const s = part.trim();
    if (!s) return null;

    // is_enough=true / is_enough=false
    const boolMatch = s.match(/^is_enough=(true|false)$/);
    if (boolMatch) return { type: "is_enough", value: boolMatch[1] === "true" };

    // calories:500-800 (range)
    const rangeMatch = s.match(/^calories:(\d+)-(\d+)$/);
    if (rangeMatch) return { type: "calories_range", min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };

    // calories_max:3500
    const maxMatch = s.match(/^calories_max:(\d+)$/);
    if (maxMatch) return { type: "calories_max", value: Number(maxMatch[1]) };

    // calories_min:1
    const minMatch = s.match(/^calories_min:(\d+)$/);
    if (minMatch) return { type: "calories_min", value: Number(minMatch[1]) };

    // fat_status:是 / protein_status:较多 / calories_status:是 etc.
    // 注意：规则写 fat_status，但 API 返回 meal_status.fat（不带 _status 后缀）
    const statusMatch = s.match(/^(\w+)_status:(是|否|较多|正常|较少)$/);
    if (statusMatch) return { type: "status_check", field: statusMatch[1], value: statusMatch[2] };

    // feedback_maxlen:20
    const lenMatch = s.match(/^feedback_maxlen:(\d+)$/);
    if (lenMatch) return { type: "feedback_maxlen", value: Number(lenMatch[1]) };

    // feedback_contains:减脂,热量
    const containsMatch = s.match(/^feedback_contains:(.+)$/);
    if (containsMatch) return { type: "feedback_contains", values: containsMatch[1].split(",").map((v) => v.trim()) };

    // feedback_not_contains:鸡胸肉,牛肉
    const notContainsMatch = s.match(/^feedback_not_contains:(.+)$/);
    if (notContainsMatch) return { type: "feedback_not_contains", values: notContainsMatch[1].split(",").map((v) => v.trim()) };

    // format_only
    if (s === "format_only") return { type: "format_only" };

    // not_crash
    if (s === "not_crash") return { type: "not_crash" };

    return { type: "unknown", raw: s };
  }).filter(Boolean);
}

// ========== API 调用 ==========

async function callApi(endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let json;
  try {
    json = await res.json();
  } catch {
    json = { _parseError: true };
  }
  return { status: res.status, body: json };
}

// ========== 基础格式校验 ==========

function validateFormat(result, endpoint) {
  const issues = [];
  const b = result.body;

  if (result.status !== 200) { issues.push(`HTTP ${result.status}`); return { pass: false, issues }; }
  if (b.error) { issues.push(`API error: ${b.error}`); return { pass: false, issues }; }
  if (b._parseError) { issues.push("响应不是有效 JSON"); return { pass: false, issues }; }

  // 按端点检查 required 字段
  if (endpoint === "info_check") {
    if (typeof b.is_enough !== "boolean") issues.push("is_enough 缺失或非 boolean");
    if (typeof b.assistant_message !== "string") issues.push("assistant_message 缺失");
  }

  if (endpoint === "meal_analysis") {
    if (!b.meal_record || typeof b.meal_record !== "string") issues.push("meal_record 缺失");
    if (!b.feedback || typeof b.feedback !== "string") issues.push("feedback 缺失");
    if (!b.analysis_text || typeof b.analysis_text !== "string") issues.push("analysis_text 缺失");
    if (!b.meal_status) {
      issues.push("meal_status 缺失");
    } else {
      const ms = b.meal_status;
      if (!["是", "否"].includes(ms.calories)) issues.push(`meal_status.calories 非法: ${ms.calories}`);
      if (!["较多", "正常", "较少"].includes(ms.protein)) issues.push(`meal_status.protein 非法: ${ms.protein}`);
      if (!["较多", "正常", "较少"].includes(ms.carbs)) issues.push(`meal_status.carbs 非法: ${ms.carbs}`);
      if (!["较多", "正常", "较少"].includes(ms.vegetables)) issues.push(`meal_status.vegetables 非法: ${ms.vegetables}`);
      if (!["是", "否"].includes(ms.fat)) issues.push(`meal_status.fat 非法: ${ms.fat}`);
    }
    if (!b.nutrition_estimate) {
      issues.push("nutrition_estimate 缺失");
    } else {
      const ne = b.nutrition_estimate;
      ["protein_g", "carbs_g", "fat_g", "vegetables_g", "calories_kcal"].forEach((k) => {
        if (typeof ne[k] !== "number") issues.push(`nutrition_estimate.${k} 非数字`);
      });
    }
  }

  if (endpoint === "daily_summary") {
    if (!b.daily_status) issues.push("daily_status 缺失");
    if (typeof b.feedback !== "string") issues.push("feedback 缺失");
    if (typeof b.analysis_text !== "string") issues.push("analysis_text 缺失");
  }

  if (endpoint === "weekly_analysis") {
    if (!b.weekly_status) issues.push("weekly_status 缺失");
    if (!b.goal_match) issues.push("goal_match 缺失");
    if (typeof b.feedback !== "string") issues.push("feedback 缺失");
    if (typeof b.analysis_text !== "string") issues.push("analysis_text 缺失");
    if (!b.next_week_target) issues.push("next_week_target 缺失");
  }

  return { pass: issues.length === 0, issues };
}

// ========== 规则校验 ==========

function validateRules(body, rules, endpoint) {
  const results = [];

  for (const rule of rules) {
    // format_only / not_crash: skip content checks
    if (rule.type === "format_only" || rule.type === "not_crash") continue;

    // is_enough
    if (rule.type === "is_enough") {
      if (endpoint !== "info_check") continue;
      const pass = body.is_enough === rule.value;
      results.push({ rule: `is_enough=${rule.value}`, pass, detail: `实际: ${body.is_enough}` });
    }

    // calories range / max / min
    if (rule.type === "calories_range" || rule.type === "calories_max" || rule.type === "calories_min") {
      if (endpoint !== "meal_analysis") continue;
      const cal = body.nutrition_estimate?.calories_kcal;
      if (cal === undefined || cal === null) {
        results.push({ rule: rule.type, pass: false, detail: "calories_kcal 字段缺失" });
        continue;
      }
      if (rule.type === "calories_range") {
        const pass = cal >= rule.min && cal <= rule.max;
        results.push({ rule: `calories:${rule.min}-${rule.max}`, pass, detail: `实际: ${cal}kcal` });
      } else if (rule.type === "calories_max") {
        const pass = cal <= rule.value;
        results.push({ rule: `calories_max:${rule.value}`, pass, detail: `实际: ${cal}kcal` });
      } else if (rule.type === "calories_min") {
        const pass = cal >= rule.value;
        results.push({ rule: `calories_min:${rule.value}`, pass, detail: `实际: ${cal}kcal` });
      }
    }

    // status checks: fat_status:是 etc.
    if (rule.type === "status_check") {
      if (endpoint !== "meal_analysis") continue;
      const actual = body.meal_status?.[rule.field];
      const pass = actual === rule.value;
      results.push({ rule: `${rule.field}:${rule.value}`, pass, detail: `实际: ${actual}` });
    }

    // feedback_maxlen
    if (rule.type === "feedback_maxlen") {
      const fb = body.feedback || "";
      const pass = fb.length <= rule.value;
      results.push({ rule: `feedback字数≤${rule.value}`, pass, detail: `实际: ${fb.length}字` });
    }

    // feedback_contains (any of)
    if (rule.type === "feedback_contains") {
      const fb = body.feedback || "";
      const found = rule.values.filter((v) => fb.includes(v));
      const pass = found.length > 0;
      results.push({ rule: `feedback含[${rule.values.join(",")}]`, pass, detail: found.length > 0 ? `找到: ${found.join(",")}` : `未找到任何关键词` });
    }

    // feedback_not_contains
    if (rule.type === "feedback_not_contains") {
      const fb = body.feedback || "";
      const violations = rule.values.filter((v) => fb.includes(v));
      const pass = violations.length === 0;
      results.push({ rule: `feedback不含[${rule.values.join(",")}]`, pass, detail: violations.length > 0 ? `违规: ${violations.join(",")}` : "通过" });
    }

    if (rule.type === "unknown") {
      results.push({ rule: `未知规则: ${rule.raw}`, pass: null, detail: "脚本无法解析此规则，需人工判断" });
    }
  }

  return results;
}

// ========== 构建 API 请求体 ==========

function buildRequestBody(row) {
  const scene = row["场景"];
  const input = row["输入内容"] || "";
  let extra = {};
  if (row["额外参数"]) {
    try { extra = JSON.parse(row["额外参数"]); } catch { /* ignore */ }
  }

  switch (scene) {
    case "info_check":
      return { endpoint: "/api/meal-chat", body: { query: input, messages: extra.messages || [] } };

    case "meal_analysis":
      return {
        endpoint: "/api/meal-chat/analyze",
        body: {
          allFoodText: input,
          goalMode: extra.goal_mode || "维持",
          mealType: extra.meal_type || "午餐",
          weightKg: extra.weight_kg || 65,
          heightCm: extra.height_cm || 170,
          age: extra.age || 28,
          memory: extra.memory || "",
        },
      };

    case "daily_summary":
      return { endpoint: "/api/daily-summary", body: extra };

    case "weekly_analysis":
      return { endpoint: "/api/weekly-analysis", body: extra };

    default:
      return null; // 不调 API
  }
}

// ========== 主流程 ==========

async function main() {
  console.log("=".repeat(60));
  console.log("食光记 · 离线评估（CSV 驱动）");
  console.log("=".repeat(60));

  // 检查服务
  try {
    await fetch(`${BASE}/api/meal-chat`, { method: "HEAD" });
  } catch {
    console.log("\n❌ 无法连接 http://localhost:3000，请先运行 npm run dev\n");
    process.exit(1);
  }

  // 解析 CSV
  let rows;
  try {
    const text = readFileSync(CSV_PATH, "utf-8");
    const parsed = parseCSV(text);
    rows = parsed.rows;
    console.log(`\n📄 从 CSV 读取 ${rows.length} 条用例`);
    console.log(`   文件: docs/评测用例集.csv\n`);
  } catch (e) {
    console.log(`\n❌ 无法读取 CSV: ${e.message}\n`);
    process.exit(1);
  }

  const autoResults = [];
  const manualChecklist = [];

  // 遍历每条用例
  for (const row of rows) {
    const scene = row["场景"];
    const id = row["编号"];
    const type = row["类型"];
    const isAuto = row["核验方式"] === "自动";
    const rules = parseRules(row["自动校验规则"]);

    if (!isAuto) {
      // 人工核验：加入清单，不调 API
      manualChecklist.push({
        id,
        scene,
        type,
        input: row["输入内容"],
        expected: row["期望输出"],
        params: row["额外参数"],
      });
      continue;
    }

    // 自动测试：调 API
    const req = buildRequestBody(row);
    if (!req) {
      manualChecklist.push({
        id,
        scene,
        type,
        input: row["输入内容"],
        expected: row["期望输出"],
        note: "脚本不支持此场景的自动调用，需人工测试",
      });
      continue;
    }

    const result = await callApi(req.endpoint, req.body);
    const fmtResult = validateFormat(result, scene);

    // not_crash 规则：格式通过即通过
    const hasNotCrash = rules.some((r) => r.type === "not_crash");
    const ruleResults = hasNotCrash && !fmtResult.pass
      ? [{ rule: "not_crash", pass: false, detail: fmtResult.issues.join("; ") }]
      : validateRules(result.body, rules, scene);

    // 计算通过状态
    const formatOnly = rules.some((r) => r.type === "format_only");
    const rulePass = ruleResults.filter((r) => r.pass !== null).every((r) => r.pass);
    const overallPass = formatOnly ? fmtResult.pass : (fmtResult.pass && rulePass);

    // 输出
    const icon = overallPass ? "✅" : "⚠️";
    const extraInfo = [];
    if (scene === "info_check") extraInfo.push(`is_enough=${result.body?.is_enough}`);
    if (scene === "meal_analysis") extraInfo.push(`${result.body?.nutrition_estimate?.calories_kcal ?? "?"}kcal`);
    if (scene === "daily_summary") extraInfo.push(`feedback="${(result.body?.feedback || "").substring(0, 30)}"`);
    if (scene === "weekly_analysis") extraInfo.push(`goal_match=${result.body?.goal_match || "?"}`);

    const failDetails = [];
    if (!fmtResult.pass) failDetails.push(...fmtResult.issues);
    ruleResults.filter((r) => r.pass === false).forEach((r) => failDetails.push(`${r.rule}: ${r.detail}`));

    console.log(`  ${icon} ${id} (${type}): ${extraInfo.join(" | ")}${failDetails.length ? " [" + failDetails.join("; ") + "]" : ""}`);

    autoResults.push({
      id,
      scene,
      type,
      input: row["输入内容"],
      expected: row["期望输出"],
      formatPass: fmtResult.pass,
      formatIssues: fmtResult.issues,
      ruleResults,
      overallPass,
      responseSummary: {
        is_enough: result.body?.is_enough,
        assistant_message: result.body?.assistant_message,
        feedback: result.body?.feedback,
        calories: result.body?.nutrition_estimate?.calories_kcal,
        goal_match: result.body?.goal_match,
        daily_status: result.body?.daily_status,
      },
    });
  }

  // ====== 汇总 ======
  const autoTotal = autoResults.length;
  const autoFormatPass = autoResults.filter((r) => r.formatPass).length;
  const autoAllPass = autoResults.filter((r) => r.overallPass).length;

  console.log("\n" + "=".repeat(60));
  console.log("📊 评测汇总");
  console.log("=".repeat(60));
  console.log(`\n  自动测试: ${autoTotal} 条`);
  console.log(`  格式合规: ${autoFormatPass}/${autoTotal} (${autoTotal > 0 ? ((autoFormatPass / autoTotal) * 100).toFixed(1) : 0}%)`);
  console.log(`  全部通过: ${autoAllPass}/${autoTotal} (${autoTotal > 0 ? ((autoAllPass / autoTotal) * 100).toFixed(1) : 0}%)`);
  console.log(`  需人工核验: ${manualChecklist.length} 条`);

  // 按场景统计
  console.log("\n  按场景:");
  const sceneStats = {};
  for (const r of autoResults) {
    if (!sceneStats[r.scene]) sceneStats[r.scene] = { total: 0, pass: 0, format: 0 };
    sceneStats[r.scene].total++;
    if (r.overallPass) sceneStats[r.scene].pass++;
    if (r.formatPass) sceneStats[r.scene].format++;
  }
  for (const [scene, s] of Object.entries(sceneStats)) {
    console.log(`    ${scene}: ${s.pass}/${s.total} 通过, 格式合规率 ${((s.format / s.total) * 100).toFixed(1)}%`);
  }

  // ====== 保存结果 ======
  const report = {
    timestamp: new Date().toISOString(),
    csvFile: "docs/评测用例集.csv",
    summary: {
      autoTotal,
      autoFormatPass,
      autoAllPass,
      autoRate: autoTotal > 0 ? `${((autoAllPass / autoTotal) * 100).toFixed(1)}%` : "N/A",
      manualTotal: manualChecklist.length,
    },
    autoResults,
    manualChecklist,
  };

  const jsonPath = resolve(__dirname, "eval-results.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n📄 详细结果: scripts/eval-results.json`);

  // ====== 生成人工核验清单 TXT ======
  const txtLines = [];
  txtLines.push("=".repeat(60));
  txtLines.push("食光记 · 评估报告");
  txtLines.push(`生成时间: ${new Date().toISOString()}`);
  txtLines.push("=".repeat(60));
  txtLines.push("");
  txtLines.push("一、自动测试结果");
  txtLines.push("-".repeat(40));
  txtLines.push(`总用例: ${autoTotal}  格式合规: ${autoFormatPass}  全部通过: ${autoAllPass}`);
  txtLines.push("");

  const failedAuto = autoResults.filter((r) => !r.overallPass);
  if (failedAuto.length > 0) {
    txtLines.push("⚠️ 未通过的用例:");
    for (const r of failedAuto) {
      const issues = [...r.formatIssues, ...r.ruleResults.filter((rr) => rr.pass === false).map((rr) => `${rr.rule}: ${rr.detail}`)];
      txtLines.push(`  ${r.id}: ${issues.join(" | ")}`);
    }
  } else {
    txtLines.push("✅ 所有自动测试用例通过。");
  }

  txtLines.push("");
  txtLines.push("二、需人工核验的用例");
  txtLines.push("-".repeat(40));
  txtLines.push(`共 ${manualChecklist.length} 条，请逐条在 App 中手动测试，对照"期望输出"判断通过/不通过。`);
  txtLines.push("");

  for (const m of manualChecklist) {
    txtLines.push(`  [${m.id}] ${m.scene} (${m.type})`);
    txtLines.push(`  输入: ${m.input}`);
    txtLines.push(`  期望: ${m.expected}`);
    if (m.params) txtLines.push(`  参数: ${m.params}`);
    if (m.note) txtLines.push(`  备注: ${m.note}`);
    txtLines.push(`  核验结果: [ ] 通过  [ ] 不通过  [ ] 备注: ___________`);
    txtLines.push("");
  }

  const txtPath = resolve(__dirname, "eval-report.txt");
  writeFileSync(txtPath, txtLines.join("\n"), "utf-8");
  console.log(`📄 评估报告: scripts/eval-report.txt`);
  console.log(`\n💡 打开 eval-report.txt 查看人工核验清单，逐条测试后填结果。`);
}

main().catch((e) => {
  console.error("评测中断:", e.message);
  process.exit(1);
});
