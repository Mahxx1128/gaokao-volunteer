# 高考志愿填报助手 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建纯前端高考志愿填报单页工具，中国地图交互 + 位次-线差混合预测

**Architecture:** 单页 HTML + 3个独立 JS 模块（数据/预测/UI）+ 1个 CSS。ECharts CDN 渲染地图，所有预测在前端完成，数据与代码分离便于后续更新。

**Tech Stack:** HTML5 + CSS3 + Vanilla JS (ES6) + ECharts 5.x CDN

**文件结构:**
```
gaokao-volunteer/
├── index.html          # 主页面骨架
├── css/
│   └── style.css       # 全部样式
└── js/
    ├── data.js         # 院校数据 + 一分一段表
    ├── predict.js      # 混合预测引擎
    └── app.js          # UI交互 + 地图渲染 + 事件处理
```

---

### Task 1: 项目骨架 — index.html

**Files:**
- Create: `gaokao-volunteer/index.html`

- [ ] **Step 1: 创建 HTML 骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>高考志愿填报助手 - 山东503分</title>
  <link rel="stylesheet" href="css/style.css">
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
</head>
<body>
  <!-- 顶部控制栏 -->
  <header id="header">
    <h1>🎓 高考志愿填报助手</h1>
    <div id="controls">
      <div class="control-group">
        <label>省份</label>
        <select id="user-province">
          <option value="山东" selected>山东</option>
        </select>
      </div>
      <div class="control-group">
        <label>分数</label>
        <input type="number" id="user-score" value="503" min="100" max="750">
      </div>
      <div class="control-group">
        <label>科类</label>
        <select id="user-category">
          <option value="综合改革" selected>综合改革</option>
          <option value="理科">理科</option>
          <option value="文科">文科</option>
        </select>
      </div>
      <div class="control-group">
        <label>批次</label>
        <select id="user-batch">
          <option value="本科一批" selected>本科一批</option>
          <option value="本科二批">本科二批</option>
        </select>
      </div>
      <button id="analyze-btn">🔍 分析</button>
    </div>
  </header>

  <!-- 主体区域 -->
  <main id="main">
    <!-- 左侧地图 -->
    <section id="map-panel">
      <div id="china-map"></div>
      <div id="map-legend">
        <span class="legend-item"><span class="dot green"></span> 保底 (>70%)</span>
        <span class="legend-item"><span class="dot yellow"></span> 稳妥 (40-70%)</span>
        <span class="legend-item"><span class="dot red"></span> 冲刺 (<40%)</span>
      </div>
    </section>

    <!-- 右侧结果面板 -->
    <aside id="result-panel">
      <div id="result-empty">
        <p class="placeholder-text">👈 点击地图上的省份查看详情</p>
        <p class="placeholder-hint">或点击「分析」按钮开始</p>
      </div>
      <div id="result-content" style="display:none;">
        <div id="result-header">
          <h2 id="result-province-name"></h2>
          <div class="filter-bar">
            <button class="filter-btn active" data-level="all">全部</button>
            <button class="filter-btn" data-level="保底">🟢 保底</button>
            <button class="filter-btn" data-level="稳妥">🟡 稳妥</button>
            <button class="filter-btn" data-level="冲刺">🔴 冲刺</button>
          </div>
        </div>
        <div id="school-list"></div>
      </div>
    </aside>
  </main>

  <!-- 脚本：顺序加载 data → predict → app -->
  <script src="js/data.js"></script>
  <script src="js/predict.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 在浏览器中打开 index.html 验证骨架显示正常**

---

### Task 2: 样式系统 — style.css

**Files:**
- Create: `gaokao-volunteer/css/style.css`

- [ ] **Step 1: 写入完整样式**

```css
/* === Reset & Base === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --primary: #1a73e8;
  --green: #34a853;
  --yellow: #f9ab00;
  --red: #ea4335;
  --bg: #f5f7fa;
  --card-bg: #ffffff;
  --text: #202124;
  --text-secondary: #5f6368;
  --border: #e0e0e0;
  --radius: 8px;
  --shadow: 0 2px 8px rgba(0,0,0,0.08);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Microsoft YaHei", "PingFang SC", sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* === Header === */
#header {
  background: linear-gradient(135deg, #1a73e8, #0d47a1);
  color: #fff;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
}

#header h1 { font-size: 1.5rem; font-weight: 600; white-space: nowrap; }

#controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-group label {
  font-size: 0.85rem;
  opacity: 0.9;
  white-space: nowrap;
}

.control-group select,
.control-group input {
  padding: 6px 10px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: var(--radius);
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  min-width: 90px;
}

.control-group select option { color: var(--text); background: #fff; }
.control-group input { width: 80px; text-align: center; }
.control-group select:focus,
.control-group input:focus { border-color: #fff; background: rgba(255,255,255,0.25); }

#analyze-btn {
  padding: 8px 24px;
  background: #fff;
  color: var(--primary);
  border: none;
  border-radius: var(--radius);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

#analyze-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

#analyze-btn:active { transform: translateY(0); }

/* === Main Layout === */
#main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* === Map Panel === */
#map-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

#china-map {
  flex: 1;
  min-height: 450px;
}

#map-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 10px;
  background: #fff;
  border-top: 1px solid var(--border);
  font-size: 0.85rem;
}

.legend-item { display: flex; align-items: center; gap: 6px; }
.dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
.dot.green { background: var(--green); }
.dot.yellow { background: var(--yellow); }
.dot.red { background: var(--red); }

/* === Result Panel === */
#result-panel {
  width: 420px;
  background: #fff;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0,0,0,0.04);
}

#result-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

#result-empty .placeholder-text { font-size: 1.1rem; margin-bottom: 8px; }
#result-empty .placeholder-hint { font-size: 0.85rem; opacity: 0.7; }

#result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#result-header {
  padding: 16px 20px 0;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

#result-header h2 {
  font-size: 1.2rem;
  margin-bottom: 12px;
}

.filter-bar {
  display: flex;
  gap: 8px;
  padding-bottom: 12px;
}

.filter-btn {
  padding: 5px 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: #fff;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.filter-btn:hover { border-color: var(--primary); color: var(--primary); }
.filter-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* === School List === */
#school-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
}

.school-card {
  background: var(--bg);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
  border-left: 4px solid var(--border);
}

.school-card:hover {
  box-shadow: var(--shadow);
  transform: translateX(2px);
}

.school-card.level-保底 { border-left-color: var(--green); }
.school-card.level-稳妥 { border-left-color: var(--yellow); }
.school-card.level-冲刺 { border-left-color: var(--red); }

.school-card .school-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.school-card .school-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.school-card .probability {
  font-size: 1.3rem;
  font-weight: 700;
}

.probability.high { color: var(--green); }
.probability.mid { color: var(--yellow); }
.probability.low { color: var(--red); }

.school-card .school-meta {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
  line-height: 1.5;
}

.school-card .career-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.career-tag {
  padding: 2px 10px;
  background: #e8f0fe;
  color: var(--primary);
  border-radius: 12px;
  font-size: 0.75rem;
}

/* === Expand/Collapse city group === */
.city-group { margin-bottom: 8px; }

.city-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 0;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}

.city-toggle .arrow { transition: transform 0.2s; font-size: 0.7rem; }
.city-toggle.expanded .arrow { transform: rotate(90deg); }

.city-schools { padding: 4px 0 4px 12px; }

/* === Scrollbar === */
#school-list::-webkit-scrollbar { width: 6px; }
#school-list::-webkit-scrollbar-track { background: transparent; }
#school-list::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

/* === Responsive === */
@media (max-width: 900px) {
  #main { flex-direction: column; }
  #map-panel { flex: none; height: 400px; }
  #result-panel { width: 100%; flex: 1; max-height: none; }
  #header { padding: 12px 16px; }
  #header h1 { font-size: 1.2rem; }
}
```

- [ ] **Step 2: 刷新浏览器验证样式生效**

---

### Task 3: 预测引擎 — predict.js

**Files:**
- Create: `gaokao-volunteer/js/predict.js`

- [ ] **Step 1: 实现位次法预测函数**

```js
/**
 * 混合预测引擎 — 位次法(0.6) + 线差法(0.4)
 * 依赖: window.GAOKAO_DATA (在 data.js 中定义)
 */

const PredictEngine = {
  // 权重配置
  RANK_WEIGHT: 0.6,
  LINE_DIFF_WEIGHT: 0.4,

  // 概率阈值
  THRESHOLD_SAFE: 70,    // >70% 保底
  THRESHOLD_STABLE: 40,  // 40-70% 稳妥

  /**
   * 获取用户在当前年份的位次
   * @param {number} score - 用户分数
   * @param {string} year - 年份如 "2026"
   * @param {string} category - 科类
   * @returns {number} 位次
   */
  getUserRank(score, year, category) {
    const table = GAOKAO_DATA.scoreRankTable;
    const yearData = table[year];
    if (!yearData) return null;

    const catData = yearData[category] || yearData["综合改革"];
    if (!catData || catData.length === 0) return null;

    // 一分一段表格式: [[score, cumulativeRank], ...] 按分数降序排列
    for (let i = 0; i < catData.length; i++) {
      if (catData[i][0] <= score) {
        return catData[i][1];
      }
    }
    // 分数低于表中最末，返回最后一位
    return catData[catData.length - 1][1];
  },

  /**
   * 位次法预测：历年同位次对应的分数
   * @returns {Object} { year: predictedScore }
   */
  rankMethodPredict(schoolRecord) {
    const userRank = GAOKAO_DATA.userContext.userRank;
    const table = GAOKAO_DATA.scoreRankTable;
    const category = GAOKAO_DATA.userContext.category;
    const predictions = {};

    // 对每年，在同位次附近查找对应分数
    for (const year of Object.keys(schoolRecord.scores)) {
      const yearTable = table[year];
      if (!yearTable) continue;
      const catData = yearTable[category] || yearTable["综合改革"];
      if (!catData) continue;

      // 历年同位次对应的分数
      let predictedScore = null;
      for (let i = catData.length - 1; i >= 0; i--) {
        if (catData[i][1] <= userRank) {
          predictedScore = catData[i][0];
          break;
        }
      }
      if (predictedScore === null) predictedScore = catData[catData.length - 1][0];
      predictions[year] = predictedScore;
    }
    return predictions;
  },

  /**
   * 线差法预测
   * @returns {Object} { year: predictedScore }
   */
  lineDiffMethodPredict(schoolRecord) {
    const ctx = GAOKAO_DATA.userContext;
    const userLineDiff = ctx.score - ctx.batchLine;
    const predictions = {};

    for (const year of Object.keys(schoolRecord.scores)) {
      const histBatchLine = schoolRecord.scores[year].batchLine;
      if (histBatchLine) {
        predictions[year] = histBatchLine + userLineDiff;
      }
    }
    return predictions;
  },

  /**
   * 混合预测：对一所学校计算录取概率
   * @param {Object} schoolRecord - data.js 中的学校记录
   * @returns {Object} 预测结果
   */
  predict(schoolRecord) {
    const rankPreds = this.rankMethodPredict(schoolRecord);
    const linePreds = this.lineDiffMethodPredict(schoolRecord);
    const ctx = GAOKAO_DATA.userContext;

    // 统计有数据的年份
    let rankSum = 0, rankCount = 0;
    let lineSum = 0, lineCount = 0;

    for (const year of Object.keys(schoolRecord.scores)) {
      if (rankPreds[year] !== undefined) {
        rankSum += rankPreds[year];
        rankCount++;
      }
      if (linePreds[year] !== undefined) {
        lineSum += linePreds[year];
        lineCount++;
      }
    }

    const rankAvg = rankCount > 0 ? rankSum / rankCount : 0;
    const lineAvg = lineCount > 0 ? lineSum / lineCount : 0;

    // 混合预测分
    const predictedScore = rankCount > 0 && lineCount > 0
      ? rankAvg * this.RANK_WEIGHT + lineAvg * this.LINE_DIFF_WEIGHT
      : (rankCount > 0 ? rankAvg : lineAvg);

    if (predictedScore === 0) {
      return { predictedScore: 0, probability: 0, level: "未知", detail: {} };
    }

    // 录取概率计算 — sigmoid 风格
    const diff = ctx.score - predictedScore;
    // 往年标准差估计
    const sigma = this.estimateSigma(schoolRecord);
    const z = diff / sigma;
    const probability = Math.round(this.sigmoid(z) * 100);

    const level = probability >= this.THRESHOLD_SAFE ? "保底"
      : probability >= this.THRESHOLD_STABLE ? "稳妥"
      : "冲刺";

    return {
      predictedScore: Math.round(predictedScore),
      probability,
      level,
      detail: {
        rankMethod: { avgScore: Math.round(rankAvg), weight: this.RANK_WEIGHT, count: rankCount },
        lineDiffMethod: { avgScore: Math.round(lineAvg), weight: this.LINE_DIFF_WEIGHT, count: lineCount },
      }
    };
  },

  /**
   * 估算历年录取分的标准差
   */
  estimateSigma(schoolRecord) {
    const scores = Object.values(schoolRecord.scores).map(s => s.score);
    if (scores.length < 2) return 15; // 默认标准差

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
    return Math.sqrt(variance) || 15;
  },

  /**
   * Sigmoid: z<0 时 P>0.5, z>0 时 P<0.5
   */
  sigmoid(z) {
    return 1 / (1 + Math.exp(z * 0.8));
  },

  /**
   * 批量预测：对所有学校运行预测
   * @returns {Array} 排序后的预测结果
   */
  predictAll() {
    const results = [];
    for (const school of GAOKAO_DATA.schools) {
      const pred = this.predict(school);
      results.push({ ...school, prediction: pred });
    }
    // 按概率降序排列
    results.sort((a, b) => b.prediction.probability - a.prediction.probability);
    return results;
  }
};
```

- [ ] **Step 2: 手动在浏览器 console 测试 PredictEngine 对象存在**

---

### Task 4: 数据层 — data.js（搜集真实数据 + 构建数据结构）

**Files:**
- Create: `gaokao-volunteer/js/data.js`

- [ ] **Step 1: 搜索2021-2025年山东省一分一段表**

使用 WebSearch 搜索关键词:
- "2025年山东高考一分一段表"
- "2024年山东高考一分一段表 综合改革"
- 类似搜索 2021-2023

记录各年份各分数段对应的累计人数，构建分段表。

- [ ] **Step 2: 搜索山东省内高校2021-2025年各专业录取分数线**

搜索目标:
- 山东大学、中国海洋大学、中国石油大学(华东)、山东师范大学、青岛大学、济南大学、山东科技大学、山东财经大学、山东农业大学、曲阜师范大学、烟台大学、鲁东大学、青岛科技大学、青岛理工大学、山东建筑大学等

- [ ] **Step 3: 搜索周边及热门省份高校录取数据**

优先省份: 江苏、北京、天津、河北、河南、辽宁、湖北、陕西、四川、浙江、上海、广东

学校按省份搜集，优先选该省招生规模大的高校。

- [ ] **Step 4: 构建并写入 data.js**

数据结构如下（填充真实搜索到的数据）:

```js
window.GAOKAO_DATA = {
  // 用户输入上下文（初始化后由 app.js 填充）
  userContext: {
    province: "山东",
    score: 503,
    category: "综合改革",
    batch: "本科一批",
    userRank: null,       // predict.js 计算后填充
    batchLine: null,      // 当前年份批次线
  },

  // 一分一段表: year -> category -> [[score, cumulativeRank], ...]
  scoreRankTable: {
    "2025": {
      "综合改革": [
        [750, 1], [749, 45], /* ... 按100分段简化 */ [503, 125000], /* ... */ [150, 680000]
      ],
    },
    "2024": { /* ... */ },
    "2023": { /* ... */ },
    "2022": { /* ... */ },
    "2021": { /* ... */ },
  },

  // 各省份批次线
  batchLines: {
    "山东": {
      "2025": { "综合改革": 521, "本科二批": 470 },
      "2024": { "综合改革": 520, "本科二批": 469 },
      // ...
    },
    // ... 其他省份
  },

  // 院校数据
  schools: [
    {
      id: "sd-001",
      province: "山东",
      city: "济南",
      name: "山东师范大学",
      college: "信息科学与工程学院",
      major: "计算机科学与技术",
      batch: "本科一批",
      scores: {
        "2025": { score: 545, rank: 85000, batchLine: 521 },
        "2024": { score: 540, rank: 82000, batchLine: 520 },
        "2023": { score: 538, rank: 80000, batchLine: 518 },
        "2022": { score: 535, rank: 78000, batchLine: 515 },
        "2021": { score: 532, rank: 76000, batchLine: 513 },
      },
      career: ["软件开发", "人工智能", "数据分析", "IT运维"],
      tags: ["师范类", "省重点"],
      website: "http://www.sdnu.edu.cn",
    },
    // ... 更多学校
  ],

  // 省份名称到 GeoJSON 名称的映射
  provinceMap: {
    "山东": "山东", "江苏": "江苏", "北京": "北京", "天津": "天津",
    "河北": "河北", "河南": "河南", "辽宁": "辽宁", "湖北": "湖北",
    "陕西": "陕西", "四川": "四川", "浙江": "浙江", "上海": "上海",
    "广东": "广东", "湖南": "湖南", "安徽": "安徽", "福建": "福建",
    "重庆": "重庆", "山西": "山西", "吉林": "吉林", "黑龙江": "黑龙江",
    // ... 更多
  },
};
```

实际数据将在搜索后填入。

---

### Task 5: UI 交互逻辑 — app.js

**Files:**
- Create: `gaokao-volunteer/js/app.js`

- [ ] **Step 1: 实现 app.js — 地图渲染 + 事件处理**

```js
/**
 * 高考志愿填报助手 — UI 交互逻辑
 * 依赖: ECharts, GAOKAO_DATA, PredictEngine
 */
const App = {
  chart: null,
  allResults: [],
  currentProvince: null,
  currentFilter: "all",

  /** 初始化 */
  init() {
    this.bindEvents();
    this.runAnalysis();
  },

  /** 绑定 DOM 事件 */
  bindEvents() {
    document.getElementById("analyze-btn").addEventListener("click", () => this.runAnalysis());

    // 筛选按钮事件委托
    document.querySelector(".filter-bar").addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-btn")) {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        this.currentFilter = e.target.dataset.level;
        this.renderSchoolList();
      }
    });
  },

  /** 运行分析 */
  runAnalysis() {
    const score = parseInt(document.getElementById("user-score").value) || 503;
    const category = document.getElementById("user-category").value;
    const batch = document.getElementById("user-batch").value;

    // 更新用户上下文
    GAOKAO_DATA.userContext.score = score;
    GAOKAO_DATA.userContext.category = category;
    GAOKAO_DATA.userContext.batch = batch;

    // 查找批次线
    const province = GAOKAO_DATA.userContext.province;
    const yearBatchLines = GAOKAO_DATA.batchLines[province];
    if (yearBatchLines) {
      const latestYear = Object.keys(yearBatchLines).sort().pop();
      GAOKAO_DATA.userContext.batchLine = yearBatchLines[latestYear][category] || yearBatchLines[latestYear]["综合改革"];
    }

    // 计算用户位次
    const userRank = PredictEngine.getUserRank(score, "2025", category);
    GAOKAO_DATA.userContext.userRank = userRank || this.estimateRank(score);

    // 运行预测
    this.allResults = PredictEngine.predictAll();

    // 渲染
    this.renderMap();
    this.renderOverview();
  },

  /** 估算位次（无精确一分一段表时的fallback） */
  estimateRank(score) {
    // 山东约68万考生，503分约在第12.5万名
    return Math.round(680000 * (1 - (score - 150) / (750 - 150)));
  },

  /** 渲染中国地图 */
  renderMap() {
    const dom = document.getElementById("china-map");
    if (!this.chart) {
      this.chart = echarts.init(dom);
      window.addEventListener("resize", () => this.chart.resize());
    }

    // 按省份聚合概率（取该省所有学校的平均概率）
    const provinceStats = {};
    for (const r of this.allResults) {
      if (!provinceStats[r.province]) {
        provinceStats[r.province] = { sum: 0, count: 0, max: 0 };
      }
      provinceStats[r.province].sum += r.prediction.probability;
      provinceStats[r.province].count++;
      provinceStats[r.province].max = Math.max(provinceStats[r.province].max, r.prediction.probability);
    }

    const mapData = [];
    for (const [prov, stats] of Object.entries(provinceStats)) {
      const avgProb = stats.sum / stats.count;
      mapData.push({
        name: prov,
        value: avgProb,
        schoolCount: stats.count,
        maxProb: stats.max,
      });
    }

    const option = {
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          if (!params.value) return `${params.name}<br/>暂无数据`;
          return `<b>${params.name}</b><br/>
            可报学校: ${params.value.schoolCount} 所<br/>
            平均录取概率: ${params.value.value.toFixed(1)}%<br/>
            最高概率: ${params.value.maxProb.toFixed(1)}%`;
        }
      },
      visualMap: {
        min: 0,
        max: 100,
        splitNumber: 3,
        pieces: [
          { min: 70, max: 100, color: "#34a853", label: "保底" },
          { min: 40, max: 69, color: "#f9ab00", label: "稳妥" },
          { min: 0, max: 39, color: "#ea4335", label: "冲刺" },
        ],
        orient: "horizontal",
        left: "center",
        bottom: 10,
        show: false, // 用自定义图例
      },
      series: [{
        type: "map",
        map: "china",
        roam: true,
        scaleLimit: { min: 1, max: 5 },
        label: { show: true, fontSize: 10, color: "#333" },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
          itemStyle: { areaColor: "#ffd700" },
        },
        data: mapData,
        itemStyle: {
          borderColor: "#fff",
          borderWidth: 1,
          areaColor: "#e0e0e0", // 无数据省份灰色
        },
      }],
    };

    this.chart.setOption(option);

    // 点击省份事件
    this.chart.off("click");
    this.chart.on("click", (params) => {
      if (params.name && provinceStats[params.name]) {
        this.selectProvince(params.name);
      }
    });
  },

  /** 选择省份 */
  selectProvince(provinceName) {
    this.currentProvince = provinceName;
    document.getElementById("result-empty").style.display = "none";
    document.getElementById("result-content").style.display = "flex";
    document.getElementById("result-province-name").textContent = `📍 ${provinceName}`;
    this.renderSchoolList();

    // 滚动到结果区
    document.getElementById("school-list").scrollTop = 0;
  },

  /** 概览染色 */
  renderOverview() {
    // 默认显示用户所在省份
    const userProvince = GAOKAO_DATA.userContext.province;
    this.selectProvince(userProvince);
  },

  /** 渲染学校列表 */
  renderSchoolList() {
    const container = document.getElementById("school-list");
    let schools = this.allResults.filter(r => r.province === this.currentProvince);
    if (this.currentFilter !== "all") {
      schools = schools.filter(r => r.prediction.level === this.currentFilter);
    }

    if (schools.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:40px;color:#999;">暂无符合条件的学校</p>';
      return;
    }

    // 按城市分组
    const byCity = {};
    for (const s of schools) {
      if (!byCity[s.city]) byCity[s.city] = [];
      byCity[s.city].push(s);
    }

    let html = "";
    for (const [city, citySchools] of Object.entries(byCity)) {
      html += `<div class="city-group">`;
      html += `<div class="city-toggle" data-city="${city}">
        <span class="arrow">▶</span> ${city} (${citySchools.length}所)
      </div>`;
      html += `<div class="city-schools">`;
      for (const s of citySchools) {
        const probClass = s.prediction.probability >= 70 ? "high"
          : s.prediction.probability >= 40 ? "mid" : "low";
        const careerTags = (s.career || []).map(c => `<span class="career-tag">${c}</span>`).join("");
        html += `
        <div class="school-card level-${s.prediction.level}">
          <div class="school-header">
            <span class="school-name">${s.name}</span>
            <span class="probability ${probClass}">${s.prediction.probability}%</span>
          </div>
          <div class="school-meta">
            🏫 ${s.college} | 📚 ${s.major}<br>
            📊 预测录取分: <b>${s.prediction.predictedScore}</b> 分
            (位次法 ${s.prediction.detail.rankMethod.avgScore} × ${s.prediction.detail.rankMethod.count}年
            + 线差法 ${s.prediction.detail.lineDiffMethod.avgScore} × ${s.prediction.detail.lineDiffMethod.count}年)<br>
            📈 近5年最低/最高: ${this.getScoreRange(s)}<br>
            💼 就业方向:
          </div>
          <div class="career-tags">${careerTags || '<span class="career-tag">数据收集中</span>'}</div>
        </div>`;
      }
      html += `</div></div>`;
    }

    container.innerHTML = html;

    // 城市折叠事件委托
    container.querySelectorAll(".city-toggle").forEach(toggle => {
      toggle.addEventListener("click", () => {
        toggle.classList.toggle("expanded");
        const schools = toggle.nextElementSibling;
        schools.style.display = toggle.classList.contains("expanded") ? "block" : "none";
      });
    });

    // 默认展开所有城市
    container.querySelectorAll(".city-toggle").forEach(t => t.classList.add("expanded"));
    container.querySelectorAll(".city-schools").forEach(s => s.style.display = "block");
  },

  /** 获取历史分数线范围 */
  getScoreRange(school) {
    const scores = Object.values(school.scores).map(s => s.score);
    if (scores.length === 0) return "暂无";
    return `${Math.min(...scores)}~${Math.max(...scores)}`;
  },
};

// 页面加载完毕后初始化
document.addEventListener("DOMContentLoaded", () => App.init());
```

- [ ] **Step 2: 检查 ECharts 中国地图注册**

ECharts 5.x 需要额外加载中国地图 GeoJSON。在 `index.html` 的 `<head>` 中补充:

```html
<!-- 在 echarts CDN 后面添加 -->
<script>
  // ECharts 5.x 不再内置地图，需通过 registerMap 注册
  // 方案: 从在线 CDN 加载中国地图 GeoJSON
  fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
    .then(res => res.json())
    .then(geoJson => {
      echarts.registerMap('china', geoJson);
      // 地图注册完毕后再初始化 App
      document.dispatchEvent(new Event('map-ready'));
    });
</script>
```

更新 app.js 初始化方式:

```js
// 替换 document.addEventListener("DOMContentLoaded", () => App.init());
// 为:
if (window.echarts && window.echarts.getMap('china')) {
  document.addEventListener("DOMContentLoaded", () => App.init());
} else {
  document.addEventListener("map-ready", () => {
    document.addEventListener("DOMContentLoaded", () => App.init());
  });
}
```

---

### Task 6: 数据搜集与填充

**Files:**
- Modify: `gaokao-volunteer/js/data.js`

- [ ] **Step 1: 搜索山东省一分一段表并填入**

搜索以下URL获取数据:
- 山东省教育招生考试院历年一分一段表
- 百度百科 "2025年山东高考一分一段表" 等

根据搜索结果填充 scoreRankTable。

- [ ] **Step 2: 搜索山东省高校录取数据**

搜索山东20+所高校的历年录取分数线，填充 schools 数组。

- [ ] **Step 3: 搜索省外高校录取数据**

搜索江苏、北京、天津、河北等周边省份的30+所高校数据。

- [ ] **Step 4: 搜索各高校专业就业方向**

为每个专业匹配典型就业方向。

---

### Task 7: 集成测试与验证

- [ ] **Step 1: 双击 index.html，确认页面正常打开**

- [ ] **Step 2: 检查地图渲染（需要联网加载 GeoJSON）**

- [ ] **Step 3: 点击「分析」按钮，确认预测结果展示**

- [ ] **Step 4: 点击不同省份，确认筛选功能**

- [ ] **Step 5: 修改分数（450分、600分），验证预测变化**

- [ ] **Step 6: 切换科类，验证数据切换**
