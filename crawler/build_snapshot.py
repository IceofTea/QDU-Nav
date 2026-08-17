# -*- coding: utf-8 -*-
"""QDU 校园导航 · 快照构建器（Python 版）

从青岛大学公开网站抓取课程总表（xlsx 下载并解析）、教务通知、动态、校历，
生成与 `scripts/snapshot.mjs` 输出格式一致的 `public/data/snapshot.json`。

用法：
    python crawler/build_snapshot.py            # 生成快照到 public/data/
    python crawler/build_snapshot.py --verbose  # 打印每个学期课程条数
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from crawler import config, parsers  # noqa: E402
from crawler.fetcher import fetch_bytes, fetch_text  # noqa: E402

VERBOSE = '--verbose' in sys.argv

_DL = re.compile(r'href="([^"]*download\.jsp[^"]*)"')
_SEMESTER = re.compile(r'青岛大学(\S*?)课程总表')


def norm_room(room):
    """统一教室名：去掉「智慧」标识。"""
    if not room:
        return ''
    return room.replace('（智慧）', '').replace('(智慧)', '').strip()


def utcnow():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


def parse_kcb_xlsx(data: bytes):
    """调用 server/parse_kcb.py 解析课程总表 xlsx（仅标准库）。"""
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    try:
        proc = subprocess.run(
            [sys.executable, str(config.PARSE_PY), tmp_path],
            capture_output=True, text=True, encoding='utf-8', timeout=120,
        )
        if proc.returncode != 0:
            raise RuntimeError('parse_kcb.py 解析失败: ' + (proc.stderr or '')[:200])
        return json.loads(proc.stdout)
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


def fetch_course_tables():
    """抓取最近若干学期课程总表，逐个下载 xlsx 并解析。"""
    list_html = fetch_text(config.JWC + config.COURSE_LIST)
    items = [it for it in parsers.parse_list(list_html, config.JWC + config.COURSE_LIST)
             if '课程总表' in it['title']][:8]
    if not items:
        raise RuntimeError('未找到课程总表')

    results = []
    for it in items:
        semester = (_SEMESTER.search(it['title']) or [None, it['title']])[1] or it['title']
        try:
            detail = fetch_text(it['url'])
            m = _DL.search(detail)
            if not m:
                print('skip %s: 无附件' % it['title'])
                continue
            dl_url = urljoin(it['url'], m.group(1))
            data = fetch_bytes(dl_url, referer=it['url'])
            parsed = parse_kcb_xlsx(data)
            results.append({
                'semester': semester, 'title': it['title'],
                'count': parsed['count'], 'url': it['url'], 'rows': parsed['rows'],
            })
            if VERBOSE:
                print('  %s: %d 条' % (it['title'], parsed['count']))
        except Exception as exc:  # noqa: BLE001 单个学期失败不影响整体
            print('skip %s: %s' % (it['title'], exc))
    if not results:
        raise RuntimeError('未抓到任何课程总表')
    return results


def build():
    courses = parsers.parse_list(
        fetch_text(config.JWC + config.COURSE_LIST), config.JWC + config.COURSE_LIST)
    notices = parsers.fetch_notice_pages()
    news = parsers.parse_news(fetch_text(config.JWC + config.NEWS_HOME))
    calendar = parsers.parse_list(
        fetch_text(config.JWC + config.CALENDAR_LIST), config.JWC + config.CALENDAR_LIST)
    course_tables = fetch_course_tables()

    latest = course_tables[0]
    merged_rows = []
    for t in course_tables:
        for row in t['rows']:
            merged_rows.append({
                'c': row.get('c', ''), 't': row.get('t', ''), 'cls': row.get('cls', ''),
                'd': row.get('d'), 's': row.get('s'), 'e': row.get('e'),
                'w': row.get('w', ''), 'r': row.get('r', ''), 'term': t['semester'],

            })
    all_rooms = len({norm_room(r['r']) for r in merged_rows if r['r']})

    snap = {
        'updatedAt': utcnow(),
        'source': config.JWC,
        'courses': {'items': courses},
        'notices': {'items': notices},
        'news': {'items': news},
        'calendar': {'items': calendar},
        'courseTables': [{'semester': t['semester'], 'title': t['title'],
                          'count': t['count'], 'url': t['url']} for t in course_tables],
        'courseTable': {
            'semester': latest['semester'], 'count': latest['count'], 'rooms': all_rooms,
            'updatedAt': utcnow(), 'cached': True, 'latestUrl': latest['url'],
        },
        'rows': merged_rows,
    }

    config.OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    config.OUT_FILE.write_text(
        json.dumps(snap, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    size_kb = config.OUT_FILE.stat().st_size / 1024
    print('snapshot written: %s' % config.OUT_FILE)
    print('courseTable: %s / %d 条 / %d 教室（%d 个学期并集）'
          % (snap['courseTable']['semester'], snap['courseTable']['count'],
             snap['courseTable']['rooms'], len(snap['courseTables'])))
    print('courses %d / notices %d / news %d / calendar %d'
          % (len(courses), len(notices), len(news), len(calendar)))
    print('size: %.1f KB' % size_kb)


if __name__ == '__main__':
    build()