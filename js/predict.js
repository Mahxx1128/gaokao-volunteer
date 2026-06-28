/**
 * 高考志愿填报助手 — 预测引擎 v5
 *
 * 策略: 503分文科生，只看录取分460-530的学校
 * 分类: 根据往年录取均分与503的差距
 *   gap >= 5分  → 🟢 保底
 *   -5 <= gap < 5 → 🟡 稳妥
 *   gap < -5 → 🔴 冲刺
 */

var PredictEngine = {

  // 只看这个分数段的学校
  MIN_SCORE: 440,
  MAX_SCORE: 545,

  // 分类阈值
  SAFE_GAP: 5,       // 用户分比录取分高5+ → 保底
  STABLE_GAP: -5,    // 差距在±5分内 → 稳妥

  /**
   * 计算学校近5年平均录取分
   */
  avgScore: function(school) {
    var sum = 0, count = 0;
    for (var year in school.scores) {
      if (school.scores.hasOwnProperty(year)) {
        sum += school.scores[year].score;
        count++;
      }
    }
    return count > 0 ? Math.round(sum / count) : 0;
  },

  /**
   * 获取用户位次
   */
  getUserRank: function(score, year, category) {
    var table = GAOKAO_DATA.scoreRankTable;
    var yearData = table[year];
    if (!yearData) return null;
    var catData = yearData[category] || yearData["综合改革"];
    if (!catData || catData.length === 0) return null;

    for (var i = 0; i < catData.length; i++) {
      if (catData[i][0] <= score) {
        return catData[i][1];
      }
    }
    return catData[catData.length - 1][1];
  },

  /**
   * 预测单所学校
   */
  predict: function(school) {
    var avg = this.avgScore(school);
    var ctx = GAOKAO_DATA.userContext;
    var gap = ctx.score - avg;
    var level;

    if (gap >= this.SAFE_GAP) {
      level = "保底";
    } else if (gap >= this.STABLE_GAP) {
      level = "稳妥";
    } else {
      level = "冲刺";
    }

    // 简单概率映射
    var probability;
    if (gap >= 15) probability = 90 + Math.min(gap - 15, 10);
    else if (gap >= 5) probability = 70 + (gap - 5) * 2;    // 70-90%
    else if (gap >= -5) probability = 40 + (gap + 5) * 3;   // 40-70%
    else if (gap >= -20) probability = 10 + (gap + 20) * 2; // 10-30%
    else probability = Math.max(1, 10 + gap * 0.5);         // <10%

    probability = Math.round(probability);
    if (probability < 1) probability = 1;
    if (probability > 99) probability = 99;

    return {
      avgScore: avg,
      gap: gap,
      probability: probability,
      level: level
    };
  },

  /**
   * 批量预测: 过滤460-530 → 预测 → 排序
   */
  predictAll: function() {
    var results = [];
    var schools = GAOKAO_DATA.schools;
    var ctx = GAOKAO_DATA.userContext;

    for (var i = 0; i < schools.length; i++) {
      var school = schools[i];
      var avg = this.avgScore(school);

      // 只保留 460-530 分数段
      if (avg < this.MIN_SCORE || avg > this.MAX_SCORE) continue;

      var pred = this.predict(school);

      var result = {};
      for (var key in school) {
        if (school.hasOwnProperty(key)) {
          result[key] = school[key];
        }
      }
      result.prediction = pred;
      results.push(result);
    }

    // 排序: 保底 → 稳妥 → 冲刺, 每组内按分数降序
    var levelOrder = { "保底": 0, "稳妥": 1, "冲刺": 2 };
    results.sort(function(a, b) {
      var la = levelOrder[a.prediction.level];
      var lb = levelOrder[b.prediction.level];
      if (la !== lb) return la - lb;
      return b.prediction.avgScore - a.prediction.avgScore;
    });

    return results;
  }
};
