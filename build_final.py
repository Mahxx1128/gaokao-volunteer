"""Build standalone gaokao-volunteer.html — GeoJSON as JS literal, NOT string"""
import json

with open('css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

with open('js/data.js', 'r', encoding='utf-8') as f:
    data_js = f.read()

with open('js/predict.js', 'r', encoding='utf-8') as f:
    predict_js = f.read()

with open('china_geo.json', 'r', encoding='utf-8') as f:
    geo_data = json.load(f)
for feat in geo_data['features']:
    feat['properties'] = {'name': feat['properties'].get('name', '')}
geo_json_str = json.dumps(geo_data, ensure_ascii=False, separators=(',', ':'))

# GeoJSON embedded as JS object literal (NOT a string)
geo_block = '<script>\nvar _chinaGeo = ' + geo_json_str + ';\necharts.registerMap("china", _chinaGeo);\n</script>'

app_js = r"""console.log('[高考志愿助手] v8 单机版');

var App = {
  chart: null,
  allResults: [],
  currentProvince: null,
  currentFilter: 'all',

  init: function() {
    this.bindEvents();
    this.runAnalysis();
  },

  bindEvents: function() {
    var self = this;
    document.getElementById('analyze-btn').addEventListener('click', function() {
      self.runAnalysis();
    });
    var filterBar = document.querySelector('.filter-bar');
    if (filterBar) {
      filterBar.addEventListener('click', function(e) {
        if (e.target.classList.contains('filter-btn')) {
          var buttons = document.querySelectorAll('.filter-btn');
          for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('active');
          e.target.classList.add('active');
          self.currentFilter = e.target.dataset.level;
          self.renderSchoolList();
        }
      });
    }
  },

  runAnalysis: function() {
    var score = parseInt(document.getElementById('user-score').value) || 503;
    var category = document.getElementById('user-category').value;
    var batch = document.getElementById('user-batch').value;
    var provinceEl = document.getElementById('user-province');
    var province = provinceEl ? provinceEl.value : '山东';

    GAOKAO_DATA.userContext.score = score;
    GAOKAO_DATA.userContext.category = category;
    GAOKAO_DATA.userContext.batch = batch;
    GAOKAO_DATA.userContext.province = province;

    var userRank = PredictEngine.getUserRank(score, '2025', category);
    if (userRank === null) {
      userRank = Math.round(680000 * (1 - (score - 150) / (750 - 150)));
    }
    GAOKAO_DATA.userContext.userRank = userRank;

    this.allResults = PredictEngine.predictAll();
    this.renderMap();
    this.renderOverview();
  },

  renderMap: function() {
    var self = this;
    var dom = document.getElementById('china-map');
    if (!dom) return;

    if (!this.chart) {
      this.chart = echarts.init(dom);
      window.addEventListener('resize', function() { self.chart.resize(); });
    }

    var provinceStats = {};
    for (var i = 0; i < this.allResults.length; i++) {
      var r = this.allResults[i];
      if (!provinceStats[r.province]) provinceStats[r.province] = { sum: 0, count: 0, max: 0 };
      provinceStats[r.province].sum += r.prediction.probability;
      provinceStats[r.province].count++;
      if (r.prediction.probability > provinceStats[r.province].max) provinceStats[r.province].max = r.prediction.probability;
    }

    var mapData = [];
    for (var prov in provinceStats) {
      if (!provinceStats.hasOwnProperty(prov)) continue;
      var stats = provinceStats[prov];
      var avgProb = stats.sum / stats.count;
      mapData.push({
        name: (GAOKAO_DATA.provinceMap && GAOKAO_DATA.provinceMap[prov]) || prov,
        value: Math.round(avgProb),
        avgProb: avgProb,
        schoolCount: stats.count,
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
            + '平均录取概率: ' + params.data.avgProb.toFixed(1) + '%<br/>'
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
      var shortName = (GAOKAO_DATA.provinceReverseMap && GAOKAO_DATA.provinceReverseMap[params.name]) || params.name;
      if (params.name && provinceStats[shortName]) {
        self.selectProvince(shortName);
      }
    });
  },

  selectProvince: function(provinceName) {
    this.currentProvince = provinceName;
    document.getElementById('result-empty').style.display = 'none';
    document.getElementById('result-content').style.display = 'flex';
    document.getElementById('result-province-name').textContent = '\u{1F4CD} ' + provinceName;
    this.renderSchoolList();
    document.getElementById('school-list').scrollTop = 0;
  },

  renderOverview: function() {
    var userProvince = GAOKAO_DATA.userContext.province;
    if (userProvince) this.selectProvince(userProvince);
  },

  renderSchoolList: function() {
    var container = document.getElementById('school-list');
    if (!container) return;

    var schools = [];
    for (var i = 0; i < this.allResults.length; i++) {
      if (this.allResults[i].province === this.currentProvince) schools.push(this.allResults[i]);
    }

    if (this.currentFilter !== 'all') {
      var filtered = [];
      for (var j = 0; j < schools.length; j++) {
        if (schools[j].prediction.level === this.currentFilter) filtered.push(schools[j]);
      }
      schools = filtered;
    }

    if (schools.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:40px;color:#999;">暂无符合条件的学校</p>';
      return;
    }

    var byCity = {};
    for (var k = 0; k < schools.length; k++) {
      var s = schools[k];
      if (!byCity[s.city]) byCity[s.city] = [];
      byCity[s.city].push(s);
    }

    var cities = Object.keys(byCity).sort();
    var html = '';

    for (var ci = 0; ci < cities.length; ci++) {
      var city = cities[ci];
      var citySchools = byCity[city];
      citySchools.sort(function(a, b) { return b.prediction.probability - a.prediction.probability; });

      html += '<div class="city-group">';
      html += '<div class="city-toggle" data-city="' + city + '"><span class="arrow">▶</span> ' + city + ' (' + citySchools.length + '所)</div>';
      html += '<div class="city-schools">';

      for (var m = 0; m < citySchools.length; m++) {
        var s = citySchools[m];
        var p = s.prediction;
        var probClass = p.probability >= 70 ? 'high' : (p.probability >= 40 ? 'mid' : 'low');
        var careerTags = '';
        var careers = s.career || [];
        for (var n = 0; n < careers.length; n++) careerTags += '<span class="career-tag">' + careers[n] + '</span>';
        if (!careerTags) careerTags = '<span class="career-tag">数据收集中</span>';

        var gapText = p.gap >= 0 ? '+' + p.gap : '' + p.gap;
        var gapColor = p.gap >= 5 ? 'var(--green)' : (p.gap >= -5 ? 'var(--yellow)' : 'var(--red)');
        var scoreRange = this.getScoreRange(s);

        html += '<div class="school-card level-' + p.level + '">';
        html += '<div class="school-header"><span class="school-name">' + s.name + '</span><span class="probability ' + probClass + '">' + p.probability + '%</span></div>';
        html += '<div class="school-meta">';
        html += '\u{1F3EB} ' + (s.college || '') + ' | \u{1F4DA} ' + (s.major || '') + '<br>';
        html += '\u{1F4CA} 近5年均分: <b>' + p.avgScore + '</b> 分 | 差距: <b style="color:' + gapColor + '">' + gapText + '</b><br>';
        html += '\u{1F4C8} 历年: ' + scoreRange + ' | \u{1F4CB} ' + (s.batch || '本科');
        html += '</div>';
        html += '<div class="career-tags">' + careerTags + '</div>';
        html += '</div>';
      }
      html += '</div></div>';
    }

    container.innerHTML = html;

    var toggles = container.querySelectorAll('.city-toggle');
    for (var t = 0; t < toggles.length; t++) {
      toggles[t].addEventListener('click', function() {
        this.classList.toggle('expanded');
        var schoolsDiv = this.nextElementSibling;
        if (schoolsDiv) schoolsDiv.style.display = this.classList.contains('expanded') ? 'block' : 'none';
      });
      toggles[t].classList.add('expanded');
    }
    var citySchoolDivs = container.querySelectorAll('.city-schools');
    for (var d = 0; d < citySchoolDivs.length; d++) citySchoolDivs[d].style.display = 'block';
  },

  getScoreRange: function(school) {
    if (!school.scores) return '暂无';
    var scores = [];
    for (var year in school.scores) {
      if (school.scores.hasOwnProperty(year)) scores.push(school.scores[year].score);
    }
    if (scores.length === 0) return '暂无';
    var min = scores[0], max = scores[0];
    for (var i = 1; i < scores.length; i++) {
      if (scores[i] < min) min = scores[i];
      if (scores[i] > max) max = scores[i];
    }
    return min + '~' + max;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { App.init(); });
} else {
  App.init();
}
"""

html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n'
html += '<meta charset="UTF-8">\n'
html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
html += '<title>高考志愿填报助手 · 山东文科503分</title>\n'
html += '<script src="https://cdn.bootcdn.net/ajax/libs/echarts/5.5.0/echarts.min.js"></script>\n'
html += '<style>\n' + css + '\n</style>\n</head>\n<body>\n'

html += '<header id="header">\n  <h1>🎓 高考志愿填报助手</h1>\n  <div id="controls">\n'
html += '    <div class="control-group"><label>省份</label><select id="user-province"><option value="山东" selected>山东</option></select></div>\n'
html += '    <div class="control-group"><label>分数</label><input type="number" id="user-score" value="503" min="100" max="750"></div>\n'
html += '    <div class="control-group"><label>科类</label><select id="user-category"><option value="综合改革" selected>综合改革(文科)</option><option value="文科">文科</option></select></div>\n'
html += '    <div class="control-group"><label>批次</label><select id="user-batch"><option value="本科一段" selected>本科一段</option><option value="本科二段">本科二段</option></select></div>\n'
html += '    <button id="analyze-btn">🔍 分析</button>\n  </div>\n</header>\n'

html += '<main id="main">\n  <section id="map-panel">\n    <div id="china-map"></div>\n'
html += '    <div id="map-legend">\n'
html += '      <span class="legend-item"><span class="dot green"></span> 保底 (均分 ≤498)</span>\n'
html += '      <span class="legend-item"><span class="dot yellow"></span> 稳妥 (均分 499-508)</span>\n'
html += '      <span class="legend-item"><span class="dot red"></span> 冲刺 (均分 509-530)</span>\n'
html += '    </div>\n  </section>\n'

html += '  <aside id="result-panel">\n'
html += '    <div id="result-empty">\n      <p class="placeholder-text">👈 点击地图上的省份查看详情</p>\n      <p class="placeholder-hint">或点击「分析」按钮开始</p>\n    </div>\n'
html += '    <div id="result-content" style="display:none;">\n'
html += '      <div id="result-header">\n        <h2 id="result-province-name"></h2>\n'
html += '        <div class="filter-bar">\n'
html += '          <button class="filter-btn active" data-level="all">全部</button>\n'
html += '          <button class="filter-btn" data-level="保底">🟢 保底</button>\n'
html += '          <button class="filter-btn" data-level="稳妥">🟡 稳妥</button>\n'
html += '          <button class="filter-btn" data-level="冲刺">🔴 冲刺</button>\n'
html += '        </div>\n      </div>\n      <div id="school-list"></div>\n    </div>\n  </aside>\n</main>\n'

# GeoJSON block (JS literal, not string)
html += geo_block + '\n'

# Data block
html += '<script>\n' + data_js + '\n</script>\n'

# Predict block
html += '<script>\n' + predict_js + '\n</script>\n'

# App block
html += '<script>\n' + app_js + '\n</script>\n'

html += '</body>\n</html>'

with open('gaokao-volunteer.html', 'w', encoding='utf-8') as f:
    f.write(html)

size_kb = len(html.encode('utf-8')) / 1024
lines = html.count('\n') + 1
print(f'Created gaokao-volunteer.html: {size_kb:.0f} KB, {lines} lines')

# Verify GeoJSON is embedded as object literal
if 'var _chinaGeo = {"type":"FeatureCollection"' in html:
    print('GeoJSON: embedded as JS object literal ✓')
elif "var _chinaGeo = '{" in html:
    print('GeoJSON: WARNING - still embedded as string!')
else:
    print('GeoJSON: format unknown - check manually')
