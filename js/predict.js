/**
 * 高考志愿填报助手 — 预测引擎 v6
 */
var PredictEngine = {

  init: function(config) {
    this.config = config || CONFIG;
    this.MIN_SCORE = this.config.scoreRange[0];
    this.MAX_SCORE = this.config.scoreRange[1];
    this.SAFE_GAP = this.config.safeGap;
    this.STABLE_GAP = this.config.stableGap;
  },

  getUserRank: function(score, year, province, category) {
    var provinceData = SCORE_RANK[province];
    if (!provinceData) return null;
    var catData = provinceData[category];
    if (!catData) return null;
    var yearData = catData[String(year)];
    if (!yearData || !yearData.length) return null;
    for (var i = 0; i < yearData.length; i++) {
      if (yearData[i][0] <= score) return yearData[i][1];
    }
    return yearData[yearData.length - 1][1];
  },

  getBatchLine: function(province, year, category) {
    var pData = BATCH_LINES[province];
    if (!pData) return null;
    var cData = pData[category];
    if (!cData) return null;
    var yData = cData[String(year)];
    if (!yData) return null;
    return yData["本科批"] || yData["本科一段"] || yData["特殊类型线"] || null;
  },

  avgScore: function(scores) {
    var sum = 0, count = 0;
    for (var year in scores) {
      if (scores.hasOwnProperty(year)) {
        sum += scores[year].score;
        count++;
      }
    }
    return count > 0 ? Math.round(sum / count) : 0;
  },

  predictMajor: function(major, province) {
    var ctx = this.config;
    var avg = this.avgScore(major.scores);
    var gap = ctx.score - avg;
    var level;
    if (gap >= this.SAFE_GAP) level = "保底";
    else if (gap >= this.STABLE_GAP) level = "稳妥";
    else level = "冲刺";
    var probability;
    if (gap >= 15) probability = 90 + Math.min(gap - 15, 9);
    else if (gap >= 5) probability = 70 + (gap - 5) * 2;
    else if (gap >= -5) probability = 40 + (gap + 5) * 3;
    else if (gap >= -20) probability = 10 + (gap + 20) * 2;
    else probability = Math.max(1, 10 + gap * 0.5);
    probability = Math.round(probability);
    probability = Math.max(1, Math.min(99, probability));
    return { avgScore: avg, gap: gap, probability: probability, level: level };
  },

  processAll: function() {
    var majorResults = [];
    var schoolStats = {};
    var schools = SCHOOLS;
    for (var i = 0; i < schools.length; i++) {
      var school = schools[i];
      var schoolMajors = [];
      var schoolBestPred = null;
      for (var j = 0; j < school.majors.length; j++) {
        var major = school.majors[j];
        var avg = this.avgScore(major.scores);
        if (avg < this.MIN_SCORE || avg > this.MAX_SCORE) continue;
        var pred = this.predictMajor(major, school.province);
        var mr = { schoolId: school.id, province: school.province, city: school.city,
          schoolName: school.name, dorm: school.dorm || null, major: major.major,
          college: major.college, batch: major.batch, scores: major.scores,
          career: major.career || [], prediction: pred };
        majorResults.push(mr);
        schoolMajors.push(mr);
        if (!schoolBestPred || pred.probability > schoolBestPred.probability) schoolBestPred = pred;
      }
      if (schoolMajors.length > 0) {
        var totalProb = 0;
        for (var k = 0; k < schoolMajors.length; k++) totalProb += schoolMajors[k].prediction.probability;
        schoolStats[school.id] = { id: school.id, province: school.province, city: school.city,
          name: school.name, dorm: school.dorm || null, majorCount: schoolMajors.length,
          bestPrediction: schoolBestPred, avgProbability: Math.round(totalProb / schoolMajors.length),
          majors: schoolMajors };
      }
    }
    var levelOrder = { "保底": 0, "稳妥": 1, "冲刺": 2 };
    majorResults.sort(function(a, b) {
      var la = levelOrder[a.prediction.level], lb = levelOrder[b.prediction.level];
      if (la !== lb) return la - lb;
      return b.prediction.probability - a.prediction.probability;
    });
    return { majorResults: majorResults, schoolStats: schoolStats };
  }
};
