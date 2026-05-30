# 食光记

基于 Next.js + Tailwind CSS + TypeScript 的健康饮食记录应用。

## 页面

| 路由 | 说明 |
|------|------|
| `/` | 首页 — 今日营养汇总、饮食评价、添加按钮 |
| `/meal` | 单餐分析 — 输入饮食、查看本餐营养与建议 |

## 开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 说明

- 营养数据基于内置食物库本地估算，仅供参考
- 今日数据保存在浏览器 localStorage，无登录
