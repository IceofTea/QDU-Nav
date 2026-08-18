import zipfile, json, sys, re
from xml.etree import ElementTree as ET
sys.stdout.reconfigure(encoding='utf-8')
XLSX = sys.argv[1] if len(sys.argv) > 1 else ''
if not XLSX:
    print('用法: python parse_kcb.py <课程总表.xlsx>', file=sys.stderr)
    sys.exit(2)
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
z = zipfile.ZipFile(XLSX)
ss = []
root = ET.fromstring(z.read('xl/sharedStrings.xml'))
for si in root.iter('{%s}si' % NS):
    ss.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS)))
st = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
DAY = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7}
seg_re = re.compile(r'周([一二三四五六日])第(\d+)[、,，\-](\d+)节\{第([^}]+)周\}')
ALIAS = {
    'course': ['课程名称'], 'col': ['开课学院', '开课院系'], 'teacher': ['教师姓名'],
    'cls': ['上课班级', '班级'], 'time': ['上课时间'], 'room': ['上课地点'],
    'campus': ['校区'], 'credit': ['学分'], 'weeks': ['起止周'], 'kind': ['课程性质'],
    'label': ['课程标签'], 'cat': ['课程类别']
}
rows_el = st.findall('{%s}sheetData/{%s}row' % (NS, NS))
rows = []
head = {}
for row in rows_el:
    cells = {}
    for c in row.iter('{%s}c' % NS):
        ref = c.get('r') or ''
        v = c.find('{%s}v' % NS)
        if v is None:
            continue
        val = ss[int(v.text)] if c.get('t') == 's' else v.text
        cells[''.join(ch for ch in ref if ch.isalpha())] = val
    text = ' '.join(str(x) for x in cells.values())
    if not head and '上课时间' in text and '课程名称' in text:
        for col, name in cells.items():
            for key, names in ALIAS.items():
                if name in names and key not in head:
                    head[key] = col
        continue
    if not head:
        continue
    def cell(key):
        return cells.get(head.get(key, ''), '')
    course = cell('course') or ''
    time_str = cell('time') or ''
    if not course or not time_str:
        continue
    segs = seg_re.findall(time_str)
    rooms = [x.strip() for x in (cell('room') or '').split(',')] if cell('room') else []
    for idx, (dw, s, e, wk) in enumerate(segs):
        day = DAY.get(dw, 0)
        room = rooms[idx].strip() if idx < len(rooms) else (rooms[0].strip() if rooms else '')
        if day:
            rows.append({
                'c': course, 'col': cell('col') or '', 't': cell('teacher') or '', 'cls': cell('cls') or '',
                'd': day, 's': int(s), 'e': int(e), 'w': wk, 'r': room,
                'campus': cell('campus') or '', 'credit': cell('credit') or '', 'weeks': cell('weeks') or '',
                'kind': cell('kind') or '', 'cat': cell('cat') or ''
            })
print(json.dumps({'count': len(rows), 'rows': rows}, ensure_ascii=False))