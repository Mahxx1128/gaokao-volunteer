"""Build standalone gaokao-volunteer.html — 山东文科503 v2"""
import json, os

BASE = os.path.dirname(os.path.abspath(__file__))

def read(path):
    with open(os.path.join(BASE, path), 'r', encoding='utf-8') as f:
        return f.read()

def read_bytes(path):
    with open(os.path.join(BASE, path), 'rb') as f:
        return f.read()

# --- Config ---
config_js = read('config.js')

# --- CSS ---
css = read('css/style.css')

# --- Data ---
score_rank_js = read('data/scoreRank.js')
batch_lines_js = read('data/batchLines.js')
# Schools data is loaded separately (may be in multiple files)

# --- JS ---
predict_js = read('js/predict.js')
app_js = read('js/app.js')

# --- GeoJSON ---
geo_data = json.loads(read('china_geo.json'))
# Strip properties to reduce size
for feat in geo_data['features']:
    feat['properties'] = {'name': feat['properties'].get('name', '')}
geo_json_str = json.dumps(geo_data, ensure_ascii=False, separators=(',', ':'))
geo_block = '<script>\nvar _chinaGeo = ' + geo_json_str + ';\necharts.registerMap("china", _chinaGeo);\n</script>'

# --- ECharts (inline) ---
echarts_js = read('echarts.min.js')

# --- Build schools.js if not exists, try to load ---
schools_js = ""
schools_path = os.path.join(BASE, 'data', 'schools.js')
if os.path.exists(schools_path):
    schools_js = read('data/schools.js')
else:
    print("WARNING: data/schools.js not found — site will have empty school list")

# --- Province selector options (all 31 provinces) ---
provinces = [
    "北京","天津","河北","山西","内蒙古","辽宁","吉林","黑龙江",
    "上海","江苏","浙江","安徽","福建","江西","山东","河南",
    "湖北","湖南","广东","广西","海南","重庆","四川","贵州",
    "云南","陕西","甘肃","青海","宁夏","新疆","西藏"
]
province_options = '\n'.join(
    ['<option value="{}" {}>{}</option>'.format(
        p, 'selected' if p == '山东' else '', p
    ) for p in provinces]
)

# --- Build HTML ---
html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n'
html += '<meta charset="UTF-8">\n'
html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
html += '<title>高考志愿填报助手 · 山东文科503分</title>\n'
html += '</head>\n<body>\n'

# Header
html += '''<header id="header">
  <h1>🎓 高考志愿填报助手 · 文科</h1>
  <div id="controls">
    <div class="control-group"><label>省份</label><select id="user-province">
''' + province_options + '''
    </select></div>
    <div class="control-group"><label>分数</label><input type="number" id="user-score" value="503" min="100" max="750"></div>
    <div class="control-group"><label>科类</label><select id="user-category"><option value="综合改革" selected>综合改革(文科)</option></select></div>
    <button id="analyze-btn">🔍 分析</button>
  </div>
</header>
'''

# Stats bar
html += '''<div id="stats-bar">
  <span class="stat-item">📋 <b id="stat-total">-</b> 个可选专业</span>
  <span class="stat-item">🏫 <b id="stat-schools">-</b> 所学校</span>
  <span class="stat-item">🗺️ <b id="stat-provinces">-</b> 个省份</span>
</div>
'''

# Main layout
html += '''<main id="main">
  <section id="map-panel">
    <div id="china-map"></div>
    <div id="map-legend">
      <span class="legend-item"><span class="dot green"></span> 保底 (高5分+)</span>
      <span class="legend-item"><span class="dot yellow"></span> 稳妥 (±5分)</span>
      <span class="legend-item"><span class="dot red"></span> 冲刺 (低5分+)</span>
    </div>
  </section>

  <aside id="result-panel">
    <div id="result-empty">
      <p class="placeholder-text">👈 点击地图上的省份查看详情</p>
      <p class="placeholder-hint">或点击「分析」按钮开始</p>
    </div>
    <div id="result-content" style="display:none;">
      <div id="result-header">
        <div id="breadcrumb">
          <span id="breadcrumb-province"></span>
          <span id="breadcrumb-school" style="display:none;"></span>
        </div>
        <div id="layer-title-1" class="layer-title">点击学校查看专业详情和寝室条件 →</div>
        <div id="layer-title-2" class="layer-title" style="display:none;">📋 专业列表 · 录取概率</div>
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
'''

# --- Scripts ---
# ECharts
html += '<script>\n' + echarts_js + '\n</script>\n'

# GeoJSON
html += geo_block + '\n'

# Config
html += '<script>\n' + config_js + '\n</script>\n'

# Score Rank
html += '<script>\n' + score_rank_js + '\n</script>\n'

# Batch Lines
html += '<script>\n' + batch_lines_js + '\n</script>\n'

# Schools
html += '<script>\n' + schools_js + '\n</script>\n'

# Predict
html += '<script>\n' + predict_js + '\n</script>\n'

# App
html += '<script>\n' + app_js + '\n</script>\n'

# Stylesheet
html += '<style>\n' + css + '\n</style>\n'

html += '</body>\n</html>'

# --- Write ---
output_path = os.path.join(BASE, 'index.html')
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(html)

size_kb = len(html.encode('utf-8')) / 1024
lines = html.count('\n') + 1
print(f'[OK] Created index.html: {size_kb:.0f} KB, {lines} lines')

# Verify
if 'var _chinaGeo = {"type":"FeatureCollection"' in html:
    print('[OK] GeoJSON: embedded as JS object literal')
else:
    print('[WARN] GeoJSON: format check failed')

if 'var SCHOOLS' in html:
    print('[OK] Schools data: embedded')
else:
    print('[WARN] Schools data: not found in output')

if 'var SCORE_RANK' in html:
    print('[OK] Score rank data: embedded')

if 'var BATCH_LINES' in html:
    print('[OK] Batch lines data: embedded')

print(f'\nReady! Open index.html in browser or deploy to GitHub Pages.')
print(f'   Local: file:///{output_path}')
