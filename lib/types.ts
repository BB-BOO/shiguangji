// ========== 用户饮食资料 ==========

export type GoalMode = "减脂" | "增肌" | "保持";

export interface UserProfile {
  goal_mode: GoalMode;
  height_cm: number;
  weight_kg: number;
  age: number;
}

// ========== 每日目标范围 ==========

export interface NumericRange {
  min: number;
  max: number;
}

export interface DailyTargetRange {
  protein_g: NumericRange;
  carbs_g: NumericRange;
  vegetables_g: NumericRange;
  fat_g: NumericRange;
  calories_kcal: NumericRange;
}

// ========== 单餐记录 ==========

export type MealType = "早餐" | "午餐" | "晚餐" | "加餐";

export interface NutritionEstimate {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  vegetables_g: number;
  calories_kcal: number;
}

export interface MealRecord {
  id: string;
  date: string; // YYYY-MM-DD
  meal_type: MealType;
  meal_record_text: string;
  nutrition_estimate: NutritionEstimate;
  meal_status: MealStatus;
  conversation_id?: string;
  rating?: boolean;
  created_at: string; // ISO timestamp
}

// ========== 单餐定性评价（PRD Tool 2: meal_analysis） ==========

export interface MealStatus {
  calories: "是" | "否";
  protein: "较多" | "正常" | "较少";
  carbs: "较多" | "正常" | "较少";
  vegetables: "较多" | "正常" | "较少";
  fat: "是" | "否";
}

// ========== Tool 1: info_check ==========

export interface InfoCheckResponse {
  is_enough: boolean;
  assistant_message: string;
}

// ========== Tool 2: meal_analysis ==========

export interface MealAnalysisResponse {
  meal_record: string;
  meal_status: MealStatus;
  nutrition_estimate: NutritionEstimate;
  feedback: string;      // ≤20字
  analysis_text: string; // 100-300字
}

// ========== Tool 3: daily_summary ==========

export type ProteinVegStatus = "充足" | "达标" | "不足";
export type MacroStatus = "超标" | "均衡" | "不足";

export interface DailyStatus {
  calories: MacroStatus;
  protein: ProteinVegStatus;
  carbs: MacroStatus;
  vegetables: ProteinVegStatus;
  fat: MacroStatus;
}

export interface DailySummaryResponse {
  daily_status: DailyStatus;
  feedback: string;      // ≤30字
  analysis_text: string;
}

// ========== Tool 4: weekly_analysis ==========

export type GoalMatch = "完美符合" | "基本符合" | "偏离目标";

export type OverallBalance = "较均衡" | "一般" | "失衡";

export interface WeeklyStatus {
  calories: MacroStatus;
  protein: ProteinVegStatus;
  carbs: MacroStatus;
  vegetables: ProteinVegStatus;
  fat: MacroStatus;
  overall_balance: OverallBalance;
}

export interface NextWeekTarget {
  calories_min: number;
  calories_max: number;
  protein_min: number;
  protein_max: number;
  carbs_min: number;
  carbs_max: number;
  vegetables_min: number;
  vegetables_max: number;
  fat_min: number;
  fat_max: number;
}

export interface WeeklyAnalysisResponse {
  weekly_status: WeeklyStatus;
  goal_match: GoalMatch;
  feedback: string;      // ≤40字
  analysis_text: string;
  next_week_target: NextWeekTarget;
}

// ========== API 请求输入（前端→后端） ==========

export interface MealChatInputs {
  goal_mode: string;
  meal_type: string;
  weight_kg?: number;
  height_cm?: number;
  age?: number;
}

export interface DailySummaryInputs {
  goal_mode: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  protein_target_min: number;
  protein_target_max: number;
  carbs_target_min: number;
  carbs_target_max: number;
  vegetables_target_min: number;
  vegetables_target_max: number;
  fat_target_min: number;
  fat_target_max: number;
  calories_target_min: number;
  calories_target_max: number;
  protein_g: number;
  carbs_g: number;
  vegetables_g: number;
  fat_g: number;
  calories_kcal: number;
  meal_records: string;
}

export interface WeeklyAnalysisInputs {
  goal_mode: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  protein_target_min: number;
  protein_target_max: number;
  carbs_target_min: number;
  carbs_target_max: number;
  vegetables_target_min: number;
  vegetables_target_max: number;
  fat_target_min: number;
  fat_target_max: number;
  calories_target_min: number;
  calories_target_max: number;
  weekly_avg_protein_g: number;
  weekly_avg_carbs_g: number;
  weekly_avg_vegetables_g: number;
  weekly_avg_fat_g: number;
  weekly_avg_calories_kcal: number;
  weekly_meal_records: string;
}

// ========== 长期记忆 ==========

export interface MemoryEntry {
  field: string;
  value: string;
  source: string;
  extracted_at: string;
}

export type MemoryDimension = "身体数据" | "目标" | "饮食偏好" | "生活习惯" | "饮食模式";

export interface MemoryStatus {
  dimension: MemoryDimension;
  status: "已了解" | "待发现";
  entries: MemoryEntry[];
}

// ========== AI 助手设置 ==========

export interface ProactiveConfig {
  daily_limit: number;
  quiet_start: string;
  quiet_end: string;
  master_switch: boolean;
}

// ========== 主动触达记录 ==========

export interface ProactiveLog {
  id: string;
  event_type: "漏餐关怀" | "营养素提醒" | "建议跟进" | "里程碑鼓励" | "偏好收集" | "日常问候" | "首次招呼";
  message: string;
  pushed_at: string;
  dismissed: boolean;
}

// ========== AI 助手对话 ==========

export interface Conversation {
  id: string;
  date: string;
  message_preview: string;
  messages: AssistantMessage[];
}

export interface AssistantMessage {
  role: "user" | "ai";
  content: string;
  timestamp: string;
}
