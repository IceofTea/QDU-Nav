# -*- coding: utf-8 -*-
"""课程数据洞察

从 `public/data/snapshot.json`（最近多学期课程总表全量排课）聚合统计，
生成 `public/data/course_stats.json` 供前端「数据洞察」页展示：
热门教室、热门教师、热门课程、学期趋势、周节次分布、课程性质与校区分布。

用法：
    python crawler/analysis.py [--out path] [--top 10]
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from crawler.build_snapshot import norm_room  # noqa: E402
from crawler.util import utcnow  # noqa: E402

SNAPSHOT = ROOT / 'public' / 'data' / 'snapshot.json'
OUT = ROOT / 'public' / 'data' / 'course_stats.json'


def analyze(snap, top=10):
    rows = snap['rows']
    rooms = Counter()
    teachers = Counter()
    courses = Counter()
    days = Counter()
    periods = Counter()
    kinds = Counter()
    campuses = Counter()
    colleges = Counter()

    for r in rows:
        if r.get('r'):
            rooms[norm_room(r['r'])] += 1
        if r.get('t'):
            teachers[r['t']] += 1
        if r.get('c'):
            courses[r['c']] += 1
        if r.get('d'):
            days[r['d']] += 1
        if r.get('s'):
            periods[r['s']] += 1
        kinds[r.get('kind') or '未标注'] += 1
        campuses[r.get('campus') or '未标注'] += 1
        if r.get('col'):
            colleges[r['col']] += 1

    day_names = {1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日'}

    return {
        'generatedAt': utcnow(),
        'source': snap.get('source', ''),
        'periods': len(rows),
        'terms': [{'semester': t['semester'], 'count': t['count']} for t in snap['courseTables']],
        'hotRooms': [{'name': k, 'periods': v} for k, v in rooms.most_common(top)],
        'hotTeachers': [{'name': k, 'periods': v} for k, v in teachers.most_common(8)],
        'topCourses': [{'name': k, 'sections': v} for k, v in courses.most_common(top)],
        'dayDist': [{'day': day_names.get(d, d), 'count': days[d]} for d in sorted(days)],
        'periodDist': [{'start': k, 'count': periods[k]} for k in sorted(periods)],
        'kindDist': [{'name': k, 'count': v} for k, v in kinds.most_common(6)],
        'campusDist': [{'name': k, 'count': v} for k, v in campuses.most_common(6)],
        'colDist': [{'name': k, 'count': v} for k, v in colleges.most_common(12)],
    }


def main():
    parser = argparse.ArgumentParser(description='课程数据洞察')
    parser.add_argument('--out', default=str(OUT))
    parser.add_argument('--top', type=int, default=10)
    args = parser.parse_args()

    snap = json.loads(SNAPSHOT.read_text(encoding='utf-8'))
    stats = analyze(snap, args.top)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding='utf-8')
    print('course stats written: %s' % out)
    print('periods %d / rooms %d / teachers %d / terms %d'
          % (stats['periods'], len(stats['hotRooms']), len(stats['hotTeachers']), len(stats['terms'])))


if __name__ == '__main__':
    main()