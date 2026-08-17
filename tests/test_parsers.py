# -*- coding: utf-8 -*-
"""解析器单元测试：通知列表 / 首页动态 / 多页合并去重 / 教室与学期提取。"""
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from crawler import parsers
from crawler.build_snapshot import _SEMESTER, norm_room

HOME = '''
<div class="notice_box"><span>2026-08-17</span><a href="/jwtz.htm" title="甲">甲</a></div>
<div class="notice_box"><span>2026-08-16</span><a href="info/1000/1.htm" title="乙">乙</a></div>
<a href="jwtz/89.htm">89</a><a href="jwtz/3.htm">3</a><a href="jwtz/2.htm">2</a>
'''
PAGE_89 = '''
<div class="notice_box"><span>2026-08-01</span><a href="/jwtz.htm" title="甲">甲</a></div>
<div class="notice_box"><span>2026-07-30</span><a href="info/1000/88.htm" title="丙">丙</a></div>
<div class="notice_box"><span>2026-07-29</span><a href="info/1000/87.htm" title="丁">丁</a></div>
'''


class TestParseList(unittest.TestCase):
    def test_notice_box(self):
        items = parsers.parse_list(HOME, 'https://jwc.qdu.edu.cn/jwtz.htm')
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]['date'], '2026-08-17')
        self.assertEqual(items[0]['title'], '甲')
        self.assertEqual(items[0]['url'], 'https://jwc.qdu.edu.cn/jwtz.htm')

    def test_relative_url_join(self):
        items = parsers.parse_list(HOME, 'https://jwc.qdu.edu.cn/jwtz.htm')
        self.assertEqual(items[1]['url'], 'https://jwc.qdu.edu.cn/info/1000/1.htm')


class TestParseNews(unittest.TestCase):
    def test_extract(self):
        html = ('<a href="info/1005/6515.htm" title="2026-2027学年校历发布">'
                '<img src="/images/x.jpg"></a>'
                '<a href="info/1005/6500.htm" title="教学动态">文案</a>')
        items = parsers.parse_news(html)
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]['title'], '2026-2027学年校历发布')
        self.assertEqual(items[0]['img'], 'https://jwc.qdu.edu.cn/images/x.jpg')
        self.assertEqual(items[1]['title'], '教学动态')
        self.assertIsNone(items[1]['img'])


class TestFetchNoticePages(unittest.TestCase):
    @mock.patch('crawler.parsers.fetch_text')
    def test_merge_dedup(self, fetch):
        fetch.side_effect = lambda url: HOME if url.endswith('/jwtz.htm') else PAGE_89
        items = parsers.fetch_notice_pages(page_count=2)
        self.assertEqual(len(items), 4)  # 首页2 + 分页3 - 重复1
        urls = [it['url'] for it in items]
        self.assertEqual(len(set(urls)), len(urls), '结果应无重复 URL')

    @mock.patch('crawler.parsers.fetch_text')
    def test_respects_page_count(self, fetch):
        fetch.side_effect = lambda url: HOME if url.endswith('/jwtz.htm') else PAGE_89
        items = parsers.fetch_notice_pages(page_count=1)
        self.assertEqual(len(items), 2, 'page_count=1 时应只抓首页')


class TestExtractors(unittest.TestCase):
    def test_semester(self):
        m = _SEMESTER.search('青岛大学2026年春季学期课程总表')
        self.assertEqual(m.group(1), '2026年春季学期')
        m = _SEMESTER.search('青岛大学2025年春夏学期课程总表')
        self.assertEqual(m.group(1), '2025年春夏学期')
        m = _SEMESTER.search('青岛大学本科生课程总表')
        self.assertEqual(m.group(1), '本科生')

    def test_norm_room(self):
        self.assertEqual(norm_room('博学楼101（智慧）'), '博学楼101')
        self.assertEqual(norm_room('(智慧)东校区教学楼'), '东校区教学楼')
        self.assertEqual(norm_room(''), '')


if __name__ == '__main__':
    unittest.main()