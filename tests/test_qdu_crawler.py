# -*- coding: utf-8 -*-
"""qdu_crawler 公开抓取测试：公告列表 / 校历图片（mock 抓取）。"""
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from crawler.qdu_crawler import PublicCrawler

JWC_HTML = '''
<html><body>
<a href="/jwtz.htm">教务通知</a>
<a href="http://news.qdu.edu.cn/n2026.html">学校要闻</a>
<a href="/info/1005/6500.htm" title="详细">教学动态详情</a>
<p>无关段落</p>
</body></html>
'''

CAL_HTML = '''
<html><body>
<img src="/images/calendar/2026-1.jpg"><img src="/images/calendar/logo.png">
<img src="http://example.com/banner.webp"><a href="/jwtz.htm">link</a>
</body></html>
'''


class TestPublicCrawler(unittest.TestCase):
    @mock.patch('crawler.qdu_crawler.fetch_text', return_value=JWC_HTML)
    def test_announcements(self, fetch):
        c = PublicCrawler()
        items = c.fetch_announcements('jwc', limit=5)
        self.assertGreaterEqual(len(items), 3)
        self.assertEqual(items[0]['url'], 'https://jwc.qdu.edu.cn/jwtz.htm')
        self.assertTrue(items[1]['url'].startswith('http://news.qdu.edu.cn'))

    @mock.patch('crawler.qdu_crawler.fetch_text', return_value=CAL_HTML)
    def test_calendar_images(self, fetch):
        c = PublicCrawler()
        imgs = c.fetch_calendar_images('calendar_2026')
        self.assertEqual(imgs, [
            'https://jwc.qdu.edu.cn/images/calendar/2026-1.jpg',
            'https://jwc.qdu.edu.cn/images/calendar/logo.png',
        ])


if __name__ == '__main__':
    unittest.main()