# -*- coding: utf-8 -*-
"""QDU 校园导航 · 青岛大学吧舆情分析（Python 版）

尽力抓取百度贴吧「青岛大学吧」公开列表页，解析帖子标题 / 作者 / 回复数 / 日期，
做热帖榜、关键词、话题分布、发帖趋势等轻量舆情分析，输出
`public/data/tieba_stats.json`。

贴吧反爬较严（常见 403 / 验证码）：本脚本为「尽力而为」，任何失败都不会
覆盖上一次的成功数据（保留旧文件），并输出非零退出码供 CI 判断。

用法：
    python crawler/tieba.py                # 抓取并分析，写入 public/data/
    python crawler/tieba.py --pages 3      # 抓取前 3 页（默认 4 页）
"""
import html
import json
import os
import random
import re
import string
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent

BAR_NAME = '青岛大学'
BAR_URL = 'https://tieba.baidu.com/f?kw=' + urllib.parse.quote(BAR_NAME)
OUT_FILE = ROOT / 'public' / 'data' / 'tieba_stats.json'
PAGES = int(next((a.split('=')[1] for a in sys.argv if a.startswith('--pages=')), '4'))
PAGE_SIZE = 50
RETRIES = 2

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0 Safari/537.36')
BAIDUID = ''.join(random.choices(string.hexdigits, k=32))
HEADERS = {
    'User-Agent': UA,
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cookie': 'BAIDUID=%s' % BAIDUID,
}


def fetch_list_html(page_index: int) -> str:
    """抓取一页贴吧列表 HTML（带 UA / cookie / 重试）。"""
    url = '%s&ie=utf-8&pn=%d' % (BAR_URL, page_index * PAGE_SIZE)
    last_err = None
    for _ in range(RETRIES):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read().decode('utf-8', 'replace')
            if len(data) < 5000 or 'j_thread_list' not in data:
                raise RuntimeError('页面无帖子列表（疑似被反爬拦截）')
            return data
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(1)
    raise RuntimeError('贴吧抓取失败: %s' % last_err)


class _ThreadParser(HTMLParser):
    """提取贴吧列表页中的帖子条目（标题/链接/作者/回复数/日期）。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.threads = []
        self._cur = None
        self._buf = []
        self._field = None

    def _clazz(self, attrs):
        return dict(attrs).get('class', '')

    def _is_thread_li(self, cls):
        return 'j_thread_list' in cls or 'threadlist' in cls

    def handle_starttag(self, tag, attrs):
        cls = self._clazz(attrs)
        if tag == 'li' and self._is_thread_li(cls):
            self._cur = {'title': '', 'author': '', 'replies': 0, 'date': '', 'url': ''}
            self._field = None
            return
        if self._cur is None:
            return
        if tag == 'a':
            if 'j_th_tit' in cls:
                self._field = 'title'
                href = dict(attrs).get('href', '')
                m = re.search(r'/p/(\d+)', href)
                if m:
                    self._cur['url'] = 'https://tieba.baidu.com/p/' + m.group(1)
                self._buf = []
            elif 'frs-author-name' in cls:
                self._field = 'author'
                self._buf = []
        elif tag == 'span' and 'threadlist_reply_num' in cls:
            self._field = 'replies'
            self._buf = []
        elif tag == 'div' and 'threadlist_date' in cls:
            self._field = 'date'
            self._buf = []

    def handle_data(self, data):
        if self._cur is not None and self._field and data.strip():
            self._buf.append(data.strip())

    def handle_endtag(self, tag):
        if self._cur is None:
            return
        if tag == 'li':
            if self._cur.get('title'):
                self.threads.append(self._cur)
            self._cur = None
            self._field = None
        elif self._field == 'title' and tag == 'a':
            self._cur['title'] = ''.join(self._buf).strip()
            self._field = None
        elif self._field == 'author' and tag == 'a':
            self._cur['author'] = ''.join(self._buf).strip()
            self._field = None
        elif self._field == 'replies' and tag == 'span':
            self._cur['replies'] = parse_replies(''.join(self._buf))
            self._field = None
        elif self._field == 'date' and tag == 'div':
            self._cur['date'] = ''.join(self._buf).strip()
            self._field = None


def parse_replies(text: str) -> int:
    """把回复数字符串转成整数，支持「1.2万」。"""
    text = html.unescape(text or '').strip().replace(',', '')
    if not text:
        return 0
    m = re.match(r'([\d.]+)\s*万', text)
    if m:
        return int(float(m.group(1)) * 10000)
    m = re.match(r'(\d+)', text)
    return int(m.group(1)) if m else 0


def parse_threads(page_html: str):
    """解析一页贴吧 HTML，返回帖子列表。"""
    parser = _ThreadParser()
    parser.feed(page_html or '')
    return parser.threads


def norm_date(raw: str, today=None):
    """把「今天/昨天/MM-DD/YYYY-MM-DD」归一化为 YYYY-MM-DD。"""
    raw = (raw or '').strip()
    if not raw:
        return ''
    today = today or datetime.now().date()
    if raw in ('今天', '刚刚', '1分钟前'):
        return today.isoformat()
    if raw in ('昨天',):
        return (today - timedelta(days=1)).isoformat()
    m = re.match(r'(\d{4})-(\d{1,2})-(\d{1,2})', raw)
    if m:
        return '%04d-%02d-%02d' % (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    m = re.match(r'(\d{1,2})-(\d{1,2})', raw)
    if m:
        return '%04d-%02d-%02d' % (today.year, int(m.group(1)), int(m.group(2)))
    return ''


# 关键词 → 话题桶
TOPIC_KEYWORDS = {
    '考研升学': ['考研', '复试', '保研', '上岸', '调剂', '初试', '分数线', '研招'],
    '校园生活': ['食堂', '宿舍', '澡堂', '快递', '外卖', '热水', '空调', '电费', '超市', '洗衣'],
    '学习考试': ['期末', '考试', '挂科', '绩点', '选课', '图书馆', '自习', '成绩', '四六级', '教材'],
    '校园事务': ['转专业', '军训', '社团', '迎新', '报到', '评优', '奖学金', '助学金', '退学', '休学'],
    '就业实习': ['实习', '招聘', '秋招', '春招', '就业', 'offer', '考公', '兼职'],
    '吐槽求助': ['吐槽', '求助', '求问', '无语', '离谱', '难受', '崩溃', '郁闷', '踩坑'],
}
# 通用关键词词频词典（标题命中计数）
KEYWORD_DICT = sorted(
    {w for ws in TOPIC_KEYWORDS.values() for w in ws},
    key=len, reverse=True)


def analyze(threads):
    """基于帖子列表做轻量舆情分析。"""
    top = sorted(threads, key=lambda t: -t['replies'])[:10]
    today = datetime.now().date()

    word_count = {}
    for t in threads:
        title = t['title']
        for w in KEYWORD_DICT:
            if w in title:
                word_count[w] = word_count.get(w, 0) + 1
    keywords = sorted(
        [{'word': w, 'count': c} for w, c in word_count.items()],
        key=lambda x: (-x['count'], x['word']))[:15]

    topic_count = {}
    for t in threads:
        for topic, ws in TOPIC_KEYWORDS.items():
            if any(w in t['title'] for w in ws):
                topic_count[topic] = topic_count.get(topic, 0) + 1
    topics = sorted(
        [{'name': n, 'count': c} for n, c in topic_count.items()],
        key=lambda x: -x['count'])

    day_count = {}
    for t in threads:
        d = norm_date(t['date'], today)
        if d:
            day_count[d] = day_count.get(d, 0) + 1
    trend = []
    for i in range(13, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        trend.append({'label': d[5:], 'count': day_count.get(d, 0)})

    return {
        'topThreads': top,
        'keywords': keywords,
        'topics': topics,
        'weekTrend': trend,
    }


def utcnow():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


def main():
    threads = []
    for p in range(PAGES):
        threads.extend(parse_threads(fetch_list_html(p)))
    if not threads:
        raise RuntimeError('未解析到任何帖子')

    result = {
        'updatedAt': utcnow(),
        'status': 'ok',
        'source': 'tieba',
        'barUrl': BAR_URL,
        'total': len(threads),
        'pages': PAGES,
    }
    result.update(analyze(threads))

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(OUT_FILE.parent), suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, separators=(',', ':'))
        os.replace(tmp, str(OUT_FILE))
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    print('tieba ok: %d 帖 / %d 页 → %s' % (len(threads), PAGES, OUT_FILE))
    print('热帖: ' + ' | '.join(t['title'][:18] for t in result['topThreads'][:5]))
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001 尽力而为：失败保留旧数据
        print('tieba crawl failed (non-fatal): %s' % exc, file=sys.stderr)
        sys.exit(1)