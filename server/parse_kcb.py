import zipfile, json, sys, re
from xml.etree import ElementTree as ET
sys.stdout.reconfigure(encoding='utf-8')
XLSX = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\13111\AppData\Local\Temp\opencode\qdunav\kcb.xlsx'
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
z = zipfile.ZipFile(XLSX)
ss = []
root = ET.fromstring(z.read('xl/sharedStrings.xml'))
for si in root.iter('{%s}si' % NS):
    ss.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS)))
st = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
DAY = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7}
seg_re = re.compile(r'周([一二三四五六日])第(\d+)[、,，\-](\d+)节\{第([^}]+)周\}')
rows = []
for row in st.findall('{%s}sheetData/{%s}row' % (NS, NS)):
    r = row.get('r')
    if not r or int(r) < 4:
        continue
    cells = {}
    for c in row.iter('{%s}c' % NS):
        ref = c.get('r') or ''
        v = c.find('{%s}v' % NS)
        if v is None:
            continue
        val = ss[int(v.text)] if c.get('t') == 's' else v.text
        cells[''.join(ch for ch in ref if ch.isalpha())] = val
    course = cells.get('H') or ''
    college = cells.get('C') or ''
    teacher = cells.get('E') or ''
    classes = cells.get('L') or ''
    time_str = cells.get('AB') or ''
    room_str = cells.get('AC') or ''
    if not course or not time_str:
        continue
    segs = seg_re.findall(time_str)
    rooms = [x.strip() for x in room_str.split(',')] if room_str else []
    for idx, (dw, s, e, wk) in enumerate(segs):
        day = DAY.get(dw, 0)
        room = rooms[idx].strip() if idx < len(rooms) else (rooms[0].strip() if rooms else '')
        if day:
            rows.append({'c': course, 'col': college, 't': teacher, 'cls': classes, 'd': day, 's': int(s), 'e': int(e), 'w': wk, 'r': room})
print(json.dumps({'count': len(rows), 'rows': rows}, ensure_ascii=False))