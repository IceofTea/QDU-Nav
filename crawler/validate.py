# -*- coding: utf-8 -*-
"""快照质量校验器（质量门禁）

对 `public/data/snapshot.json` 做 schema 与合理性校验：
- 顶层字段 / 各 `{items}` 结构完整
- 数量下限（通知 ≥ 40、动态 ≥ 1、校历 ≥ 10、排课 ≥ 4 万）
- 字段格式（日期、URL 域名、学期、周次/节次范围）
- 一致性（courseTable.count/rooms 与 rows 实际值一致）

用法：
    python crawler/validate.py            # 校验默认快照，有错误时退出码非 0
    python crawler/validate.py <json路径>
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from crawler.build_snapshot import norm_room  # noqa: E402 复用同一教室归一化规则

JWC_HOST = 'jwc.qdu.edu.cn'
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')

MIN_NOTICES = 40
MIN_NEWS = 1
MIN_CALENDAR = 10
MIN_ROWS = 40000
MIN_TABLES = 1
TERM_RE = re.compile(r'^\d{4}年(?:春夏|秋|春|夏季?)')


def _is_items(obj):
    return isinstance(obj, dict) and isinstance(obj.get('items'), list)


def validate_snapshot(snap):
    """返回错误信息列表（空列表表示通过）。"""
    errors = []

    if not isinstance(snap, dict):
        return ['快照不是 JSON 对象']

    for key in ('updatedAt', 'source', 'courses', 'notices', 'news',
                'calendar', 'courseTables', 'courseTable', 'rows'):
        if key not in snap:
            errors.append('缺少顶层字段: %s' % key)
    if errors:
        return errors

    try:
        datetime.fromisoformat(snap['updatedAt'].replace('Z', '+00:00'))
    except ValueError:
        errors.append('updatedAt 不是合法 ISO 时间: %s' % snap['updatedAt'])

    # --- 列表结构 ---
    for key in ('courses', 'notices', 'news', 'calendar'):
        if not _is_items(snap[key]):
            errors.append('%s 应为 {items: [...]} 结构' % key)

    # --- 通知 ---
    notices = snap['notices']['items']
    if len(notices) < MIN_NOTICES:
        errors.append('通知数量过少: %d < %d' % (len(notices), MIN_NOTICES))
    for it in notices:
        if not it.get('title') or not it.get('url'):
            errors.append('通知缺 title/url: %r' % (it.get('title') or '')[:30])
        elif not str(it['url']).startswith('https://' + JWC_HOST):
            errors.append('通知 URL 域名异常: %s' % it['url'])
        if not DATE_RE.match(it.get('date', '')):
            errors.append('通知日期格式异常: %r' % it.get('date'))

    # --- 动态 ---
    news = snap['news']['items']
    if len(news) < MIN_NEWS:
        errors.append('动态数量过少: %d < %d' % (len(news), MIN_NEWS))
    for it in news:
        if not it.get('title') or not str(it.get('url', '')).startswith('https://' + JWC_HOST):
            errors.append('动态字段异常: %r' % (it.get('title') or '')[:30])

    # --- 校历 ---
    calendar = snap['calendar']['items']
    if len(calendar) < MIN_CALENDAR:
        errors.append('校历数量过少: %d < %d' % (len(calendar), MIN_CALENDAR))
    for it in calendar:
        if not it.get('title') or not DATE_RE.match(it.get('date', '')):
            errors.append('校历字段异常: %r' % (it.get('title') or '')[:30])

    # --- 课程总表 ---
    tables = snap['courseTables']
    if len(tables) < MIN_TABLES:
        errors.append('课程总表为空')
    for t in tables:
        if not all(t.get(k) for k in ('semester', 'title', 'count', 'url')):
            errors.append('课程总表字段不完整: %r' % (t.get('title') or '')[:30])
        if t.get('url') and not str(t['url']).startswith('https://' + JWC_HOST):
            errors.append('课程总表 URL 域名异常: %s' % t['url'])

    # --- 排课明细 ---
    rows = snap['rows']
    if len(rows) < MIN_ROWS:
        errors.append('排课数量过少: %d < %d' % (len(rows), MIN_ROWS))
    rooms = set()
    for i, r in enumerate(rows):
        if not all(r.get(k) is not None for k in ('c', 't', 'cls', 'd', 's', 'e', 'w', 'r', 'term')):
            errors.append('rows[%d] 字段不完整: %r' % (i, r))
            continue
        if not 1 <= int(r['d']) <= 7:
            errors.append('rows[%d] 星期越界: %r' % (i, r['d']))
        if not 1 <= int(r['s']) <= int(r['e']) <= 12:
            errors.append('rows[%d] 节次越界: %r' % (i, (r['s'], r['e'])))
        if not r['term']:
            errors.append('rows[%d] 学期为空' % i)
        if r['r']:
            rooms.add(norm_room(r['r']))

    # --- courseTable 与 rows 一致性 ---
    ct = snap['courseTable']
    if ct.get('count') != tables[0].get('count'):
        errors.append('courseTable.count(%s) 与最新学期 count(%s) 不一致'
                      % (ct.get('count'), tables[0].get('count')))
    if ct.get('rooms') != len(rooms):
        errors.append('courseTable.rooms(%s) 与实际去重教室数(%d) 不一致'
                      % (ct.get('rooms'), len(rooms)))
    if not ct.get('semester'):
        errors.append('courseTable.semester 为空')

    return errors


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'public' / 'data' / 'snapshot.json'
    if not path.exists():
        print('[FAIL] 快照不存在: %s' % path)
        sys.exit(1)
    with open(path, 'r', encoding='utf-8') as f:
        snap = json.load(f)
    errors = validate_snapshot(snap)
    if errors:
        print('[FAIL] 快照校验未通过，共 %d 项：' % len(errors))
        for e in errors:
            print('  - ' + e)
        sys.exit(1)
    print('[OK] 快照校验通过：notices %d / news %d / calendar %d / rows %d / rooms %d'
          % (len(snap['notices']['items']), len(snap['news']['items']),
             len(snap['calendar']['items']), len(snap['rows']),
             snap['courseTable'].get('rooms')))


if __name__ == '__main__':
    main()