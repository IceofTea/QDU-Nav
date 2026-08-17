# -*- coding: utf-8 -*-
"""课程总表 xlsx 解析器测试：现场构造最小 xlsx 并调用 parse_kcb.py。"""
import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from crawler.config import PARSE_PY

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

SS = ['高等数学', '数学与统计学院', '张三', '计科2301', '周一第1,2节{第1-16周}',
      '博学楼101', '浮山校区', '1-16周', '必修', '通识', '公共基础课',
      '课程名称', '开课学院', '教师姓名', '上课班级', '上课时间', '上课地点',
      '校区', '学分', '起止周', '课程性质', '课程标签', '课程类别']


def make_xlsx(path):
    def si(t):
        return '<si><t>%s</t></si>' % t

    shared = ('<?xml version="1.0" encoding="UTF-8"?>'
              '<sst xmlns="%s">%s</sst>'
              % (NS, ''.join(si(t) for t in SS)))
    sheet = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<worksheet xmlns="%s"><sheetData>'
        '<row r="1">'
        '<c r="A1" t="s"><v>11</v></c><c r="B1" t="s"><v>12</v></c>'
        '<c r="C1" t="s"><v>13</v></c><c r="D1" t="s"><v>14</v></c>'
        '<c r="E1" t="s"><v>15</v></c><c r="F1" t="s"><v>16</v></c>'
        '<c r="G1" t="s"><v>17</v></c><c r="H1" t="s"><v>18</v></c>'
        '<c r="I1" t="s"><v>19</v></c><c r="J1" t="s"><v>20</v></c>'
        '<c r="K1" t="s"><v>21</v></c><c r="L1" t="s"><v>22</v></c></row>'
        '<row r="2">'
        '<c r="A2" t="s"><v>0</v></c><c r="B2" t="s"><v>1</v></c>'
        '<c r="C2" t="s"><v>2</v></c><c r="D2" t="s"><v>3</v></c>'
        '<c r="E2" t="s"><v>4</v></c><c r="F2" t="s"><v>5</v></c>'
        '<c r="G2" t="s"><v>6</v></c><c r="H2"><v>4</v></c>'
        '<c r="I2" t="s"><v>7</v></c><c r="J2" t="s"><v>8</v></c>'
        '<c r="K2" t="s"><v>9</v></c><c r="L2" t="s"><v>10</v></c></row>'
        '</sheetData></worksheet>' % NS)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('xl/sharedStrings.xml', shared)
        z.writestr('xl/worksheets/sheet1.xml', sheet)


class TestParseKcb(unittest.TestCase):
    def test_parse_single_row(self):
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            make_xlsx(tmp.name)
            path = tmp.name
        try:
            proc = subprocess.run(
                [sys.executable, str(PARSE_PY), path],
                capture_output=True, text=True, encoding='utf-8', timeout=30)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            data = json.loads(proc.stdout)
            self.assertEqual(data['count'], 1)
            r = data['rows'][0]
            self.assertEqual(r['c'], '高等数学')
            self.assertEqual(r['t'], '张三')
            self.assertEqual(r['cls'], '计科2301')
            self.assertEqual(r['d'], 1)
            self.assertEqual(r['s'], 1)
            self.assertEqual(r['e'], 2)
            self.assertEqual(r['w'], '1-16')
            self.assertEqual(r['r'], '博学楼101')
            self.assertEqual(r['campus'], '浮山校区')
            self.assertEqual(r['kind'], '必修')
        finally:
            try:
                Path(path).unlink()
            except OSError:
                pass


if __name__ == '__main__':
    unittest.main()