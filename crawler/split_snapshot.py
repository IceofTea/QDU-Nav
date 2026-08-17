# -*- coding: utf-8 -*-
"""课程表按学期拆分（加速课程表加载）

读 `public/data/snapshot.json`，把排课 rows 按学期拆成轻量小文件：
- `public/data/timetable_meta.json`：学期列表 / 当前学期 / courseTable 元信息（KB 级）
- `public/data/terms/t0.json …`：每个学期一个文件，仅含该学期 rows（约 2MB）

前端课程表默认只加载当前学期文件，切换学期时按需懒加载，避免一次性
fetch + parse 15MB 全量快照导致首屏慢 / 手机卡死。

用法：
    python crawler/split_snapshot.py
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent
SNAP = ROOT / 'public' / 'data' / 'snapshot.json'
META = ROOT / 'public' / 'data' / 'timetable_meta.json'
TERMS = ROOT / 'public' / 'data' / 'terms'


def main():
    snap = json.loads(SNAP.read_text(encoding='utf-8'))
    rows = snap.get('rows', [])
    ct = snap.get('courseTable', {}) or {}
    tables = snap.get('courseTables', []) or []

    groups = {}
    for r in rows:
        groups.setdefault(r.get('term', ''), []).append(r)

    order = [t['semester'] for t in tables if t.get('semester') in groups]
    for sem in groups:
        if sem not in order:
            order.append(sem)

    TERMS.mkdir(parents=True, exist_ok=True)
    semesters = []
    for idx, sem in enumerate(order):
        file_name = 't%d.json' % idx
        (TERMS / file_name).write_text(
            json.dumps(
                {'semester': sem, 'count': len(groups[sem]), 'rows': groups[sem]},
                ensure_ascii=False, separators=(',', ':'),
            ),
            encoding='utf-8',
        )
        semesters.append({'semester': sem, 'file': file_name, 'count': len(groups[sem])})

    meta = {
        'updatedAt': snap.get('updatedAt'),
        'source': snap.get('source'),
        'currentSemester': ct.get('semester', ''),
        'courseTable': ct,
        'courseTables': tables,
        'semesters': semesters,
        'count': len(rows),
    }
    META.write_text(
        json.dumps(meta, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )
    print('timetable split ok: %d 学期 → %s' % (len(semesters), META))
    print('每学期: ' + ' / '.join('%s %d 行' % (s['semester'], s['count']) for s in semesters))
    return 0


if __name__ == '__main__':
    sys.exit(main())