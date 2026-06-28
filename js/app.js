/**
 * 高考志愿填报助手 — UI 交互逻辑
 * 依赖: ECharts (echarts), GAOKAO_DATA (window.GAOKAO_DATA), PredictEngine
 */
console.log('[App] v5 已加载 — 503分文科 · 460~530分档 · 保底/稳妥/冲刺');

var App = {
  chart: null,
  allResults: [],
  currentProvince: null,
  currentFilter: 'all',

  /** 初始化 */
  init: function() {
    this.bindEvents();
    this.runAnalysis();
  },

  /** 绑定 DOM 事件 */
  bindEvents: function() {
    var self = this;
    document.getElementById('analyze-btn').addEventListener('click', function() {
      self.runAnalysis();
    });

    // 筛选按钮事件委托
    var filterBar = document.querySelector('.filter-bar');
    if (filterBar) {
      filterBar.addEventListener('click', function(e) {
        if (e.target.classList.contains('filter-btn')) {
          var buttons = document.querySelectorAll('.filter-btn');
          for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('active');
          }
          e.target.classList.add('active');
          self.currentFilter = e.target.dataset.level;
          self.renderSchoolList();
        }
      });
    }
  },

  /** 运行分析 */
  runAnalysis: function() {
    var scoreEl = document.getElementById('user-score');
    var score = parseInt(scoreEl.value) || 503;
    var category = document.getElementById('user-category').value;
    var batch = document.getElementById('user-batch').value;
    var provinceEl = document.getElementById('user-province');
    var province = provinceEl ? provinceEl.value : '山东';

    // 更新用户上下文
    GAOKAO_DATA.userContext.score = score;
    GAOKAO_DATA.userContext.category = category;
    GAOKAO_DATA.userContext.batch = batch;
    GAOKAO_DATA.userContext.province = province;

    // 查找批次线 — batchLines 结构: { province: { year: { categoryKey: line } } }
    var yearBatchLines = GAOKAO_DATA.batchLines[province];
    if (yearBatchLines) {
      var years = Object.keys(yearBatchLines).sort();
      var latestYear = years[years.length - 1];
      var catLines = yearBatchLines[latestYear];
      if (catLines) {
        // 批次线中的 category 键是"综合改革"/"特殊类型"，直接用 category 或 fallback
        GAOKAO_DATA.userContext.batchLine = catLines[category] || catLines['综合改革'] || 521;
      }
    }
    if (!GAOKAO_DATA.userContext.batchLine) {
      GAOKAO_DATA.userContext.batchLine = 521;
    }

    // 计算用户位次
    var userRank = PredictEngine.getUserRank(score, '2025', category);
    if (userRank === null) {
      userRank = Math.round(680000 * (1 - (score - 150) / (750 - 150)));
    }
    GAOKAO_DATA.userContext.userRank = userRank;

    // 运行批量预测
    this.allResults = PredictEngine.predictAll();

    // 渲染
    this.renderMap();
    this.renderOverview();
  },

  /** 渲染中国地图 */
  renderMap: function() {
    var self = this;
    var dom = document.getElementById('china-map');
    if (!dom) return;

    if (!this.chart) {
      this.chart = echarts.init(dom);
      window.addEventListener('resize', function() { self.chart.resize(); });
    }

    // 按省份聚合概率
    var provinceStats = {};
    for (var i = 0; i < this.allResults.length; i++) {
      var r = this.allResults[i];
      if (!provinceStats[r.province]) {
        provinceStats[r.province] = { sum: 0, count: 0, max: 0 };
      }
      provinceStats[r.province].sum += r.prediction.probability;
      provinceStats[r.province].count++;
      if (r.prediction.probability > provinceStats[r.province].max) {
        provinceStats[r.province].max = r.prediction.probability;
      }
    }

    // 构建地图数据 — value 用数值以便 visualMap 着色
    var mapData = [];
    for (var prov in provinceStats) {
      if (provinceStats.hasOwnProperty(prov)) {
        var stats = provinceStats[prov];
        var avgProb = stats.sum / stats.count;
        mapData.push({
          name: GAOKAO_DATA.provinceMap[prov] || prov,
          value: Math.round(avgProb),
          avgProb: avgProb,
          schoolCount: stats.count,
          maxProb: Math.round(stats.max)
        });
      }
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
            + '平均录取概率: ' + params.data.avgProb.toFixed(1) + '%<br/>'
            + '最高概率: ' + params.data.maxProb + '%';
        }
      },
      visualMap: {
        min: 0,
        max: 100,
        left: 'left',
        bottom: 'bottom',
        inRange: { color: ['#ee6666', '#fac858', '#91cc75'] },
        text: ['高概率', '低概率'],
        calculable: true
      },
      series: [{
        type: 'map',
        map: 'china',
        roam: true,
        scaleLimit: { min: 1, max: 5 },
        label: { show: true, fontSize: 10, color: '#333' },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
          itemStyle: { areaColor: '#ffd700' }
        },
        data: mapData,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1,
          areaColor: '#e0e0e0'
        }
      }]
    };

    this.chart.setOption(option);

    // 点击省份
    this.chart.off('click');
    this.chart.on('click', function(params) {
      // GeoJSON 全名 → 短名转换
      var shortName = GAOKAO_DATA.provinceReverseMap[params.name] || params.name;
      console.log('[App] 点击省份:', params.name, '→ 短名:', shortName, '→ 有数据:', !!provinceStats[shortName]);
      if (params.name && provinceStats[shortName]) {
        self.selectProvince(shortName);
      }
    });
  },

  /** 选择省份 */
  selectProvince: function(provinceName) {
    this.currentProvince = provinceName;
    document.getElementById('result-empty').style.display = 'none';
    document.getElementById('result-content').style.display = 'flex';
    document.getElementById('result-province-name').textContent = '📍 ' + provinceName;
    this.renderSchoolList();
    document.getElementById('school-list').scrollTop = 0;
  },

  /** 概览 — 默认选中用户所在省份 */
  renderOverview: function() {
    var userProvince = GAOKAO_DATA.userContext.province;
    if (userProvince) {
      this.selectProvince(userProvince);
    }
  },

  /** 渲染学校列表 — 按城市分组、按概率排序、支持筛选 */
  renderSchoolList: function() {
    var container = document.getElementById('school-list');
    if (!container) return;

    // 按省份筛选
    var schools = [];
    for (var i = 0; i < this.allResults.length; i++) {
      if (this.allResults[i].province === this.currentProvince) {
        schools.push(this.allResults[i]);
      }
    }

    // 按等级筛选
    if (this.currentFilter !== 'all') {
      var filtered = [];
      for (var j = 0; j < schools.length; j++) {
        if (schools[j].prediction.level === this.currentFilter) {
          filtered.push(schools[j]);
        }
      }
      schools = filtered;
    }

    if (schools.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:40px;color:#999;">暂无符合条件的学校</p>';
      return;
    }

    // 按城市分组
    var byCity = {};
    for (var k = 0; k < schools.length; k++) {
      var s = schools[k];
      if (!byCity[s.city]) byCity[s.city] = [];
      byCity[s.city].push(s);
    }

    // 城市名排序
    var cities = Object.keys(byCity).sort();

    var html = '';
    for (var ci = 0; ci < cities.length; ci++) {
      var city = cities[ci];
      var citySchools = byCity[city];

      // 组内按概率降序
      citySchools.sort(function(a, b) {
        return b.prediction.probability - a.prediction.probability;
      });

      html += '<div class="city-group">';
      html += '<div class="city-toggle" data-city="' + city + '">';
      html += '<span class="arrow">▶</span> ' + city + ' (' + citySchools.length + '所)';
      html += '</div>';
      html += '<div class="city-schools">';

      for (var m = 0; m < citySchools.length; m++) {
        var s = citySchools[m];
        var p = s.prediction;
        var probClass = p.probability >= 70 ? 'high' : (p.probability >= 40 ? 'mid' : 'low');

        // 就业方向标签
        var careerTags = '';
        var careers = s.career || [];
        for (var n = 0; n < careers.length; n++) {
          careerTags += '<span class="career-tag">' + careers[n] + '</span>';
        }
        if (!careerTags) {
          careerTags = '<span class="career-tag">数据收集中</span>';
        }

        var scoreRange = this.getScoreRange(s);

        html += '<div class="school-card level-' + p.level + '">';
        html += '<div class="school-header">';
        html += '<span class="school-name">' + s.name + '</span>';
        html += '<span class="probability ' + probClass + '">' + p.probability + '%</span>';
        html += '</div>';
        html += '<div class="school-meta">';
        html += '🏫 ' + (s.college || '') + ' | 📚 ' + (s.major || '') + '<br>';
        var gapText = p.gap >= 0 ? '+' + p.gap : '' + p.gap;
        var gapColor = p.gap >= 5 ? 'var(--green)' : (p.gap >= -5 ? 'var(--yellow)' : 'var(--red)');
        html += '📊 近5年均分: <b>' + p.avgScore + '</b> 分';
        html += ' | 差距: <b style="color:' + gapColor + '">' + gapText + '</b>';
        html += '<br>';
        html += '📈 历年: ' + this.getScoreRange(s) + ' | 📋 ' + (s.batch || '本科');
        html += '📈 近5年: ' + scoreRange + '<br>';
        html += '💼 就业方向:';
        html += '</div>';
        html += '<div class="career-tags">' + careerTags + '</div>';
        html += '</div>';
      }

      html += '</div></div>';
    }

    container.innerHTML = html;

    // 绑定城市折叠事件
    var toggles = container.querySelectorAll('.city-toggle');
    for (var t = 0; t < toggles.length; t++) {
      toggles[t].addEventListener('click', function() {
        this.classList.toggle('expanded');
        var schoolsDiv = this.nextElementSibling;
        if (schoolsDiv) {
          schoolsDiv.style.display = this.classList.contains('expanded') ? 'block' : 'none';
        }
      });
      // 默认展开
      toggles[t].classList.add('expanded');
    }

    var citySchoolDivs = container.querySelectorAll('.city-schools');
    for (var d = 0; d < citySchoolDivs.length; d++) {
      citySchoolDivs[d].style.display = 'block';
    }
  },

  /** 获取学校历史分数线范围 */
  getScoreRange: function(school) {
    if (!school.scores) return '暂无';
    var scores = [];
    for (var year in school.scores) {
      if (school.scores.hasOwnProperty(year)) {
        scores.push(school.scores[year].score);
      }
    }
    if (scores.length === 0) return '暂无';
    var min = scores[0];
    var max = scores[0];
    for (var i = 1; i < scores.length; i++) {
      if (scores[i] < min) min = scores[i];
      if (scores[i] > max) max = scores[i];
    }
    return min + '~' + max;
  }
};

// 初始化：等待 DOM 和地图 GeoJSON 都就绪
(function() {
  var _initialized = false;

  function tryInit() {
    if (_initialized) return;
    if (typeof echarts !== 'undefined' && echarts.getMap && echarts.getMap('china')) {
      _initialized = true;
      App.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      tryInit();
      document.addEventListener('map-ready', tryInit);
    });
  } else {
    tryInit();
    document.addEventListener('map-ready', tryInit);
  }
})();
