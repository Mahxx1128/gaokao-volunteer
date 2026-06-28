/**
 * 高考志愿填报助手 — UI v6
 * 理科定制版 · 两层交互
 * 依赖: ECharts, CONFIG, SCORE_RANK, BATCH_LINES, SCHOOLS, PredictEngine
 */
var App = {
  chart: null,
  allMajorResults: [],
  schoolStats: {},
  currentProvince: null,
  currentSchoolId: null,
  currentFilter: 'all',
  currentLayer: 1,  // 1=学校列表, 2=专业详情

  /** 初始化 */
  init: function() {
    PredictEngine.init(CONFIG);
    this.bindEvents();
    this.runAnalysis();
  },

  /** 绑定事件 */
  bindEvents: function() {
    var self = this;

    // 分析按钮
    document.getElementById('analyze-btn').addEventListener('click', function() {
      self.runAnalysis();
    });

    // 筛选按钮（事件委托）
    var filterBar = document.querySelector('.filter-bar');
    if (filterBar) {
      filterBar.addEventListener('click', function(e) {
        if (e.target.classList.contains('filter-btn')) {
          var btns = document.querySelectorAll('.filter-btn');
          for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
          e.target.classList.add('active');
          self.currentFilter = e.target.dataset.level;
          self.currentLayer = 1;
          self.currentSchoolId = null;
          self.renderSchoolList();
        }
      });
    }

    // 省份选择器
    var provinceEl = document.getElementById('user-province');
    if (provinceEl) {
      provinceEl.addEventListener('change', function() {
        CONFIG.province = this.value;
        PredictEngine.config.province = this.value;
        self.runAnalysis();
      });
    }
  },

  /** 运行分析 */
  runAnalysis: function() {
    var scoreEl = document.getElementById('user-score');
    var score = parseInt(scoreEl.value) || CONFIG.score;
    CONFIG.score = score;
    PredictEngine.config.score = score;

    var userRank = PredictEngine.getUserRank(score, '2025', CONFIG.province, CONFIG.category);
    if (userRank === null) {
      userRank = Math.round(680000 * (1 - (score - 150) / (750 - 150)));
    }

    var result = PredictEngine.processAll();
    this.allMajorResults = result.majorResults;
    this.schoolStats = result.schoolStats;
    this.currentLayer = 1;
    this.currentSchoolId = null;

    this.renderMap();
    this.renderOverview();

    // 更新统计
    var stats = this.getStats();
    document.getElementById('stat-total').textContent = stats.totalMajors;
    document.getElementById('stat-schools').textContent = stats.totalSchools;
    document.getElementById('stat-provinces').textContent = stats.totalProvinces;
  },

  /** 获取统计 */
  getStats: function() {
    var provinces = {};
    var schoolIds = {};
    for (var i = 0; i < this.allMajorResults.length; i++) {
      var r = this.allMajorResults[i];
      provinces[r.province] = true;
      schoolIds[r.schoolId] = true;
    }
    var provCount = 0, schCount = 0;
    for (var p in provinces) { if (provinces.hasOwnProperty(p)) provCount++; }
    for (var s in schoolIds) { if (schoolIds.hasOwnProperty(s)) schCount++; }
    return {
      totalMajors: this.allMajorResults.length,
      totalSchools: schCount,
      totalProvinces: provCount
    };
  },

  // ======================== 地图渲染 ========================

  renderMap: function() {
    var self = this;
    var dom = document.getElementById('china-map');
    if (!dom) return;

    if (!this.chart) {
      this.chart = echarts.init(dom);
      window.addEventListener('resize', function() { self.chart.resize(); });
    }

    // 按省份聚合
    var provinceStats = {};
    for (var i = 0; i < this.allMajorResults.length; i++) {
      var r = this.allMajorResults[i];
      if (!provinceStats[r.province]) {
        provinceStats[r.province] = { sum: 0, count: 0, max: 0, schoolSet: {} };
      }
      provinceStats[r.province].sum += r.prediction.probability;
      provinceStats[r.province].count++;
      provinceStats[r.province].schoolSet[r.schoolId] = true;
      if (r.prediction.probability > provinceStats[r.province].max) {
        provinceStats[r.province].max = r.prediction.probability;
      }
    }

    var mapData = [];
    for (var prov in provinceStats) {
      if (!provinceStats.hasOwnProperty(prov)) continue;
      var stats = provinceStats[prov];
      var schoolCount = 0;
      for (var sid in stats.schoolSet) { if (stats.schoolSet.hasOwnProperty(sid)) schoolCount++; }
      mapData.push({
        name: prov + '省',
        value: Math.round(stats.sum / stats.count),
        avgProb: (stats.sum / stats.count).toFixed(1),
        schoolCount: schoolCount,
        majorCount: stats.count,
        maxProb: Math.round(stats.max)
      });
    }

    var option = {
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          if (!params.data || typeof params.data.schoolCount === 'undefined') {
            return '<b>' + params.name + '</b><br/>暂无数据';
          }
          return '<b>' + params.name + '</b><br/>'
            + '可报学校: ' + params.data.schoolCount + ' 所<br/>'
            + '可选专业: ' + params.data.majorCount + ' 个<br/>'
            + '平均录取概率: ' + params.data.avgProb + '%<br/>'
            + '最高概率: ' + params.data.maxProb + '%';
        }
      },
      visualMap: {
        min: 0, max: 100,
        left: 'left', bottom: 'bottom',
        inRange: { color: ['#ee6666', '#fac858', '#91cc75'] },
        text: ['高概率', '低概率'],
        calculable: true
      },
      series: [{
        type: 'map', map: 'china',
        roam: true,
        scaleLimit: { min: 1, max: 5 },
        label: { show: true, fontSize: 10, color: '#333' },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
          itemStyle: { areaColor: '#ffd700' }
        },
        data: mapData,
        itemStyle: {
          borderColor: '#fff', borderWidth: 1,
          areaColor: '#e0e0e0'
        }
      }]
    };

    this.chart.setOption(option);
    this.chart.off('click');
    this.chart.on('click', function(params) {
      // 去掉"省"字
      var shortName = params.name.replace('省', '').replace('市', '');
      if (params.name && provinceStats[shortName]) {
        self.selectProvince(shortName);
      }
    });
  },

  // ======================== 省份选择 → 第一层 ========================

  selectProvince: function(provinceName) {
    this.currentProvince = provinceName;
    this.currentSchoolId = null;
    this.currentLayer = 1;
    this.currentFilter = 'all';

    // 重置筛选按钮
    var btns = document.querySelectorAll('.filter-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.remove('active');
      if (btns[i].dataset.level === 'all') btns[i].classList.add('active');
    }

    // 显示右侧面板
    document.getElementById('result-empty').style.display = 'none';
    document.getElementById('result-content').style.display = 'flex';

    // 更新面包屑
    document.getElementById('breadcrumb-province').textContent = '📍 ' + provinceName;
    document.getElementById('breadcrumb-school').style.display = 'none';

    // 显示第一层标题
    document.getElementById('layer-title-1').style.display = 'block';
    document.getElementById('layer-title-2').style.display = 'none';

    this.renderSchoolList();
    document.getElementById('school-list').scrollTop = 0;
  },

  /** 初始加载：显示用户所在省份 */
  renderOverview: function() {
    var userProvince = CONFIG.province;
    if (userProvince && this.schoolStats) {
      // 检查是否有该省数据
      var hasData = false;
      for (var id in this.schoolStats) {
        if (this.schoolStats.hasOwnProperty(id) && this.schoolStats[id].province === userProvince) {
          hasData = true;
          break;
        }
      }
      if (hasData) this.selectProvince(userProvince);
    }
  },

  // ======================== 第一层：学校列表 ========================

  renderSchoolList: function() {
    var container = document.getElementById('school-list');
    if (!container) return;

    // 收集该省份所有学校
    var schools = [];
    for (var id in this.schoolStats) {
      if (this.schoolStats.hasOwnProperty(id) && this.schoolStats[id].province === this.currentProvince) {
        schools.push(this.schoolStats[id]);
      }
    }

    // 按筛选条件过滤
    if (this.currentFilter !== 'all') {
      var filtered = [];
      for (var i = 0; i < schools.length; i++) {
        if (schools[i].bestPrediction && schools[i].bestPrediction.level === this.currentFilter) {
          filtered.push(schools[i]);
        }
      }
      schools = filtered;
    }

    // 按城市分组
    var byCity = {};
    for (var j = 0; j < schools.length; j++) {
      var s = schools[j];
      if (!byCity[s.city]) byCity[s.city] = [];
      byCity[s.city].push(s);
    }

    var cities = Object.keys(byCity).sort();
    var html = '';

    if (cities.length === 0) {
      html = '<div class="empty-state"><p>暂无符合条件的学校</p></div>';
    } else {
      for (var ci = 0; ci < cities.length; ci++) {
        var city = cities[ci];
        var citySchools = byCity[city];
        // 按最优概率降序
        citySchools.sort(function(a, b) {
          return b.bestPrediction.probability - a.bestPrediction.probability;
        });

        html += '<div class="city-group">';
        html += '<div class="city-toggle expanded" data-city="' + city + '">'
          + '<span class="arrow">▼</span> ' + city + ' (' + citySchools.length + '所)'
          + '</div>';
        html += '<div class="city-schools" style="display:block;">';

        for (var m = 0; m < citySchools.length; m++) {
          var s = citySchools[m];
          var bp = s.bestPrediction;
          var dormHtml = this.renderDormBadge(s.dorm);
          var probClass = bp.probability >= 70 ? 'high' : (bp.probability >= 40 ? 'mid' : 'low');
          var levelIcon = bp.level === '保底' ? '🟢' : (bp.level === '稳妥' ? '🟡' : '🔴');

          html += '<div class="school-card level-' + bp.level + '" data-school-id="' + s.id + '">';
          html += '<div class="school-header">';
          html += '<span class="school-name">' + levelIcon + ' ' + s.name + '</span>';
          html += '<span class="probability ' + probClass + '">' + bp.probability + '%</span>';
          html += '</div>';
          html += '<div class="school-meta">';
          html += '📊 最高概率专业: <b>' + bp.probability + '%</b> | 平均: <b>' + s.avgProbability + '%</b>';
          html += ' | 📋 ' + s.majorCount + '个专业可选';
          html += '</div>';
          if (dormHtml) {
            html += '<div class="dorm-badge">' + dormHtml + '</div>';
          }
          html += '</div>';
        }

        html += '</div></div>';
      }
    }

    container.innerHTML = html;

    // 城市折叠事件
    var toggles = container.querySelectorAll('.city-toggle');
    for (var t = 0; t < toggles.length; t++) {
      toggles[t].addEventListener('click', function() {
        this.classList.toggle('expanded');
        var arrow = this.querySelector('.arrow');
        var schoolsDiv = this.nextElementSibling;
        if (this.classList.contains('expanded')) {
          if (arrow) arrow.textContent = '▼';
          if (schoolsDiv) schoolsDiv.style.display = 'block';
        } else {
          if (arrow) arrow.textContent = '▶';
          if (schoolsDiv) schoolsDiv.style.display = 'none';
        }
      });
    }

    // 学校点击 → 进入第二层
    var self = this;
    var cards = container.querySelectorAll('.school-card');
    for (var c = 0; c < cards.length; c++) {
      cards[c].addEventListener('click', function() {
        var schoolId = this.dataset.schoolId;
        self.selectSchool(schoolId);
      });
    }
  },

  // ======================== 寝室缩略信息 ========================

  renderDormBadge: function(dorm) {
    if (!dorm) return '';
    var parts = [];
    if (dorm.capacity) parts.push(dorm.capacity + '人间');
    if (dorm.bedType) parts.push(dorm.bedType);
    if (dorm.hasAC) parts.push('空调');
    if (dorm.hasPrivateBath) parts.push('独卫');
    return '🛏️ ' + (parts.length > 0 ? parts.join(' · ') : '');
  },

  // ======================== 寝室详细信息卡片 ========================

  renderDormCard: function(dorm) {
    if (!dorm) return '';

    var html = '<div class="dorm-card">';
    html += '<div class="dorm-title">🛏️ 寝室条件</div>';
    html += '<div class="dorm-details">';

    if (dorm.capacity) {
      html += '<div class="dorm-item"><span class="dorm-label">人数</span><span class="dorm-value">' + dorm.capacity + '人间</span></div>';
    }
    if (dorm.bedType) {
      html += '<div class="dorm-item"><span class="dorm-label">床型</span><span class="dorm-value">' + dorm.bedType + '</span></div>';
    }
    if (dorm.hasAC !== undefined) {
      html += '<div class="dorm-item"><span class="dorm-label">空调</span><span class="dorm-value ' + (dorm.hasAC ? 'dorm-good' : 'dorm-bad') + '">' + (dorm.hasAC ? '✅ 有' : '❌ 无') + '</span></div>';
    }
    if (dorm.hasPrivateBath !== undefined) {
      html += '<div class="dorm-item"><span class="dorm-label">独卫</span><span class="dorm-value ' + (dorm.hasPrivateBath ? 'dorm-good' : 'dorm-bad') + '">' + (dorm.hasPrivateBath ? '✅ 有' : '❌ 无') + '</span></div>';
    }
    if (dorm.hasShower !== undefined) {
      html += '<div class="dorm-item"><span class="dorm-label">淋浴</span><span class="dorm-value ' + (dorm.hasShower ? 'dorm-good' : 'dorm-bad') + '">' + (dorm.hasShower ? '✅ 独立淋浴' : '❌ 公共淋浴') + '</span></div>';
    }
    if (dorm.hasPowerCurfew !== undefined) {
      html += '<div class="dorm-item"><span class="dorm-label">断电</span><span class="dorm-value ' + (dorm.hasPowerCurfew ? 'dorm-warn' : 'dorm-good') + '">' + (dorm.hasPowerCurfew ? '⚠️ 会断电' : '✅ 不断电') + '</span></div>';
    }
    if (dorm.powerCurfewNote) {
      html += '<div class="dorm-item"><span class="dorm-label">断电说明</span><span class="dorm-value dorm-note">' + dorm.powerCurfewNote + '</span></div>';
    }
    if (dorm.hasCurfew !== undefined) {
      html += '<div class="dorm-item"><span class="dorm-label">门禁</span><span class="dorm-value ' + (dorm.hasCurfew ? 'dorm-warn' : 'dorm-good') + '">' + (dorm.hasCurfew ? '⚠️ 有门禁' : '✅ 无门禁') + '</span></div>';
    }
    if (dorm.curfewNote) {
      html += '<div class="dorm-item"><span class="dorm-label">门禁说明</span><span class="dorm-value dorm-note">' + dorm.curfewNote + '</span></div>';
    }
    if (dorm.note) {
      html += '<div class="dorm-item"><span class="dorm-label">备注</span><span class="dorm-value dorm-note">' + dorm.note + '</span></div>';
    }

    html += '</div></div>';
    return html;
  },

  // ======================== 第二层：专业详情 ========================

  selectSchool: function(schoolId) {
    var school = this.schoolStats[schoolId];
    if (!school) return;

    this.currentSchoolId = schoolId;
    this.currentLayer = 2;

    // 更新面包屑
    document.getElementById('breadcrumb-province').textContent = '📍 ' + this.currentProvince;
    document.getElementById('breadcrumb-school').style.display = 'inline';
    document.getElementById('breadcrumb-school').textContent = ' > ' + school.name;

    // 显示第二层标题
    document.getElementById('layer-title-1').style.display = 'none';
    document.getElementById('layer-title-2').style.display = 'block';

    this.renderMajorList(school);
    document.getElementById('school-list').scrollTop = 0;
  },

  /** 返回第一层 */
  backToSchoolList: function() {
    this.currentLayer = 1;
    this.currentSchoolId = null;

    document.getElementById('breadcrumb-school').style.display = 'none';
    document.getElementById('layer-title-1').style.display = 'block';
    document.getElementById('layer-title-2').style.display = 'none';

    this.renderSchoolList();
    document.getElementById('school-list').scrollTop = 0;
  },

  /** 渲染专业列表 */
  renderMajorList: function(school) {
    var container = document.getElementById('school-list');
    if (!container) return;

    var html = '';

    // 返回按钮
    html += '<div class="back-row"><button class="back-btn" id="back-btn">← 返回学校列表</button></div>';

    // 寝室信息卡片
    html += this.renderDormCard(school.dorm);

    // 学校标题
    html += '<div class="school-detail-header">';
    html += '<h3>🏫 ' + school.name + '</h3>';
    html += '<span class="school-city">📍 ' + school.province + ' · ' + school.city + '</span>';
    html += '</div>';

    // 专业列表
    html += '<div class="major-count-info">📋 可选专业: ' + school.majors.length + ' 个（490-550分段）</div>';

    // 按概率降序
    var majors = school.majors.slice();
    majors.sort(function(a, b) {
      return b.prediction.probability - a.prediction.probability;
    });

    for (var i = 0; i < majors.length; i++) {
      var m = majors[i];
      var p = m.prediction;
      var probClass = p.probability >= 70 ? 'high' : (p.probability >= 40 ? 'mid' : 'low');
      var gapText = p.gap >= 0 ? '+' + p.gap : '' + p.gap;
      var gapColor = p.gap >= 5 ? 'var(--green)' : (p.gap >= -5 ? 'var(--yellow)' : 'var(--red)');
      var levelIcon = p.level === '保底' ? '🟢' : (p.level === '稳妥' ? '🟡' : '🔴');

      var careerTags = '';
      if (m.career && m.career.length > 0) {
        for (var n = 0; n < m.career.length; n++) {
          careerTags += '<span class="career-tag">' + m.career[n] + '</span>';
        }
      }

      html += '<div class="major-card level-' + p.level + '">';
      html += '<div class="major-header">';
      html += '<span class="major-name">' + levelIcon + ' ' + m.major + '</span>';
      html += '<span class="probability ' + probClass + '">' + p.probability + '%</span>';
      html += '</div>';
      html += '<div class="major-meta">';
      html += '🏛️ ' + (m.college || '') + ' | 📚 ' + (m.batch || '本科') + '<br>';
      html += '📈 近5年均分: <b>' + p.avgScore + '</b> 分 | 差距: <b style="color:' + gapColor + '">' + gapText + '</b>分<br>';
      html += '📊 历年: ' + this.getScoreRange(m.scores);
      html += '</div>';
      if (careerTags) {
        html += '<div class="career-tags">' + careerTags + '</div>';
      }
      html += '</div>';
    }

    container.innerHTML = html;

    // 返回按钮事件
    var self = this;
    var backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        self.backToSchoolList();
      });
    }
  },

  /** 历年分数范围 */
  getScoreRange: function(scores) {
    if (!scores) return '暂无';
    var arr = [];
    for (var year in scores) {
      if (scores.hasOwnProperty(year)) arr.push(scores[year].score);
    }
    if (arr.length === 0) return '暂无';
    var min = arr[0], max = arr[0];
    for (var i = 1; i < arr.length; i++) {
      if (arr[i] < min) min = arr[i];
      if (arr[i] > max) max = arr[i];
    }
    return min + '~' + max;
  }
};

// 启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { App.init(); });
} else {
  App.init();
}
