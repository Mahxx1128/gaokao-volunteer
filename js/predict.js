/**
 * 混合预测引擎 — 位次法(0.6) + 线差法(0.4)
 * 依赖: window.GAOKAO_DATA (在 data.js 中定义)
 */

var PredictEngine = {
  // 权重配置
  RANK_WEIGHT: 0.6,
  LINE_DIFF_WEIGHT: 0.4,

  // 概率阈值
  THRESHOLD_SAFE: 70,    // >70% 保底
  THRESHOLD_STABLE: 40,  // 40-70% 稳妥

  /**
   * 获取用户在当前年份的位次
   * @param {number} score - 用户分数
   * @param {string} year - 年份如 "2025"
   * @param {string} category - 科类
   * @returns {number|null} 位次
   */
  getUserRank: function(score, year, category) {
    var table = GAOKAO_DATA.scoreRankTable;
    var yearData = table[year];
    if (!yearData) return null;

    var catData = yearData[category] || yearData["综合改革"];
    if (!catData || catData.length === 0) return null;

    // 一分一段表格式: [[score, cumulativeRank], ...] 按分数降序排列
    for (var i = 0; i < catData.length; i++) {
      if (catData[i][0] <= score) {
        return catData[i][1];
      }
    }
    // 分数低于表中最末，返回最后一位
    return catData[catData.length - 1][1];
  },

  /**
   * 位次法预测：历年同位次对应的分数
   * @param {Object} schoolRecord - 学校数据记录
   * @returns {Object} { year: predictedScore }
   */
  rankMethodPredict: function(schoolRecord) {
    var userRank = GAOKAO_DATA.userContext.userRank;
    var table = GAOKAO_DATA.scoreRankTable;
    var category = GAOKAO_DATA.userContext.category;
    var predictions = {};

    for (var year in schoolRecord.scores) {
      if (!schoolRecord.scores.hasOwnProperty(year)) continue;
      var yearTable = table[year];
      if (!yearTable) continue;
      var catData = yearTable[category] || yearTable["综合改革"];
      if (!catData) continue;

      // 历年同位次对应的分数
      var predictedScore = null;
      for (var i = catData.length - 1; i >= 0; i--) {
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
   * @param {Object} schoolRecord - 学校数据记录
   * @returns {Object} { year: predictedScore }
   */
  lineDiffMethodPredict: function(schoolRecord) {
    var ctx = GAOKAO_DATA.userContext;
    var userLineDiff = ctx.score - ctx.batchLine;
    var predictions = {};

    for (var year in schoolRecord.scores) {
      if (!schoolRecord.scores.hasOwnProperty(year)) continue;
      var histBatchLine = schoolRecord.scores[year].batchLine;
      if (histBatchLine != null) {
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
  predict: function(schoolRecord) {
    var rankPreds = this.rankMethodPredict(schoolRecord);
    var linePreds = this.lineDiffMethodPredict(schoolRecord);
    var ctx = GAOKAO_DATA.userContext;

    // 统计有数据的年份
    var rankSum = 0, rankCount = 0;
    var lineSum = 0, lineCount = 0;

    for (var year in schoolRecord.scores) {
      if (!schoolRecord.scores.hasOwnProperty(year)) continue;
      if (rankPreds[year] !== undefined) {
        rankSum += rankPreds[year];
        rankCount++;
      }
      if (linePreds[year] !== undefined) {
        lineSum += linePreds[year];
        lineCount++;
      }
    }

    var rankAvg = rankCount > 0 ? rankSum / rankCount : 0;
    var lineAvg = lineCount > 0 ? lineSum / lineCount : 0;

    // 混合预测分
    var predictedScore = rankCount > 0 && lineCount > 0
      ? rankAvg * this.RANK_WEIGHT + lineAvg * this.LINE_DIFF_WEIGHT
      : (rankCount > 0 ? rankAvg : lineAvg);

    if (predictedScore === 0) {
      return { predictedScore: 0, probability: 0, level: "未知", detail: {} };
    }

    // 录取概率计算 — sigmoid 风格
    var diff = ctx.score - predictedScore;
    // 往年标准差估计
    var sigma = this.estimateSigma(schoolRecord);
    var z = diff / sigma;
    var probability = Math.round(this.sigmoid(z) * 100);

    var level = probability >= this.THRESHOLD_SAFE ? "保底"
      : probability >= this.THRESHOLD_STABLE ? "稳妥"
      : "冲刺";

    return {
      predictedScore: Math.round(predictedScore),
      probability: probability,
      level: level,
      detail: {
        rankMethod: { avgScore: Math.round(rankAvg), weight: this.RANK_WEIGHT, count: rankCount },
        lineDiffMethod: { avgScore: Math.round(lineAvg), weight: this.LINE_DIFF_WEIGHT, count: lineCount }
      }
    };
  },

  /**
   * 估算历年录取分的标准差
   * @param {Object} schoolRecord
   * @returns {number}
   */
  estimateSigma: function(schoolRecord) {
    var scores = [];
    for (var year in schoolRecord.scores) {
      if (!schoolRecord.scores.hasOwnProperty(year)) continue;
      scores.push(schoolRecord.scores[year].score);
    }
    if (scores.length < 2) return 15; // 默认标准差

    var sum = 0;
    for (var i = 0; i < scores.length; i++) {
      sum += scores[i];
    }
    var mean = sum / scores.length;

    var varianceSum = 0;
    for (var j = 0; j < scores.length; j++) {
      varianceSum += (scores[j] - mean) * (scores[j] - mean);
    }
    var variance = varianceSum / scores.length;
    return Math.sqrt(variance) || 15;
  },

  /**
   * Sigmoid: z<0 时 P>0.5 (用户分高于预测分), z>0 时 P<0.5
   * @param {number} z
   * @returns {number}
   */
  sigmoid: function(z) {
    return 1 / (1 + Math.exp(z * 0.8));
  },

  /**
   * 批量预测：对所有学校运行预测
   * @returns {Array} 排序后的预测结果
   */
  predictAll: function() {
    var results = [];
    var schools = GAOKAO_DATA.schools;
    for (var i = 0; i < schools.length; i++) {
      var pred = this.predict(schools[i]);
      // 合并原始学校数据和预测结果
      var result = {};
      for (var key in schools[i]) {
        if (schools[i].hasOwnProperty(key)) {
          result[key] = schools[i][key];
        }
      }
      result.prediction = pred;
      results.push(result);
    }
    // 按概率降序排列
    results.sort(function(a, b) {
      return b.prediction.probability - a.prediction.probability;
    });
    return results;
  }
};
