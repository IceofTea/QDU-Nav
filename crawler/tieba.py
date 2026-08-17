# -*- coding: utf-8 -*-
"""QDU 校园导航 · 青岛大学吧舆情分析（Python 版）

尽力抓取百度贴吧「青岛大学吧」公开列表页（手机版 threadlist 接口，
iPhone UA 可直连，规避桌面版 WAF 403），解析帖子标题 / 作者 / 回复数 /
日期，做热帖榜、关键词、话题分布、发帖趋势等轻量舆情分析，输出
`public/data/tieba_stats.json`。

贴吧反爬较严（常见 403 / 验证码）：本脚本为「尽力而为」，任何失败都不会
覆盖上一次的成功数据（保留旧文件），并输出非零退出码供 CI 判断。

用法：
    python crawler/tieba.py                # 抓取并分析，写入 public/data/
    python crawler/tieba.py --pages 3      # 抓取前 3 页（默认 4 页，每页 30 帖）
"""
import html
import json
import os
import random
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent

BAR_NAME = '青岛大学'
BAR_URL = 'https://tieba.baidu.com/f?kw=' + urllib.parse.quote(BAR_NAME)
LIST_URL = 'https://tieba.baidu.com/mo/q/threadlist?kw=%s&pn=%d'
OUT_FILE = ROOT / 'public' / 'data' / 'tieba_stats.json'
PAGES = int(next((a.split('=')[1] for a in sys.argv if a.startswith('--pages=')), '4'))
PAGE_SIZE = 30
RETRIES = 3

# 手机版接口走 iPhone / Android 移动 UA（桌面版 UA 会被 WAF 拦成 403）
UA_POOL = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 '
    '(KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 '
    '(KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
]
BAIDUID = ''.join(random.choices('abcdef0123456789', k=32))


def _headers():
    return {
        'User-Agent': random.choice(UA_POOL),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': BAR_URL,
        'Cookie': 'BAIDUID=%s' % BAIDUID,
    }


def fetch_list_html(page_index: int) -> str:
    """抓取一页贴吧列表 HTML（随机 UA / cookie / 延迟，指数退避重试）。"""
    url = LIST_URL % (urllib.parse.quote(BAR_NAME), page_index * PAGE_SIZE)
    last_err = None
    for attempt in range(RETRIES):
        try:
            time.sleep(random.uniform(0.6, 1.8))
            req = urllib.request.Request(url, headers=_headers())
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read().decode('utf-8', 'replace')
            if len(data) < 5000 or 'j_common ti_item' not in data:
                raise RuntimeError('页面无帖子列表（疑似被反爬拦截）')
            return data
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError('贴吧抓取失败: %s' % last_err)


# 手机版 threadlist 的帖子条目：置顶帖 <li class="tl_top..."> / 普通帖 <li class="tl_shadow...">
THREAD_LI_RE = re.compile(
    r'<li class="(?:tl_shadow[^"]*|tl_top[^"]*)"[^>]*data-tid="(\d+)"[^>]*>([\s\S]*?)</li>'
)


def _span_text(block: str, cls: str) -> str:
    m = re.search(r'class="%s">\s*([^<]{1,200}?)\s*</' % cls, block)
    return m.group(1).strip() if m else ''


def _extract_thread(block: str, tid: str) -> dict:
    """从单个帖子 li 块提取标题 / 作者 / 时间 / 回复数。"""
    title = ''
    tm = re.search(r'class="ti_title"[^>]*>([\s\S]*?)</div>', block)
    if tm:
        spans = re.findall(r'<span(?![^>]*class=)[^>]*>\s*([^<]{1,200}?)\s*</span>', tm.group(1))
        title = ''.join(spans).strip()
    replies = 0
    rm = re.search(r'btn_reply[^>]*>[\s\S]*?<span[^>]*>\s*(\d+)\s*</span>', block)
    if rm:
        replies = int(rm.group(1))
    return {
        'title': title,
        'author': _span_text(block, 'ti_author'),
        'replies': replies,
        'date': _span_text(block, 'ti_time'),
        'url': 'https://tieba.baidu.com/p/' + tid,
    }


def parse_threads(page_html: str):
    """解析一页手机版贴吧 HTML，返回帖子列表。"""
    threads = []
    for m in THREAD_LI_RE.finditer(page_html or ''):
        tid, block = m.group(1), m.group(2)
        t = _extract_thread(block, tid)
        if t['title']:
            threads.append(t)
    return threads


def parse_replies(text: str) -> int:
    """把回复数字符串转成整数，支持「1.2万」。（保留兼容旧数据）"""
    text = html.unescape(text or '').strip().replace(',', '')
    if not text:
        return 0
    m = re.match(r'([\d.]+)\s*万', text)
    if m:
        return int(float(m.group(1)) * 10000)
    m = re.match(r'(\d+)', text)
    return int(m.group(1)) if m else 0


def norm_date(raw: str, today=None):
    """把「HH:MM/今天/昨天/MM-DD/YYYY-MM-DD」归一化为 YYYY-MM-DD。"""
    raw = (raw or '').strip()
    if not raw:
        return ''
    today = today or datetime.now().date()
    if raw in ('今天', '刚刚', '1分钟前') or re.match(r'^\d{1,2}:\d{2}$', raw):
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