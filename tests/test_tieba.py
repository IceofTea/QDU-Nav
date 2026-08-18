# -*- coding: utf-8 -*-
"""贴吧舆情解析单测：用贴近真实结构的样例 HTML 验证解析与分析逻辑。"""
import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from crawler.tieba import (  # noqa: E402
    analyze, norm_date, parse_replies, parse_threads,
)

SAMPLE = """<html><body>
<li class="tl_shadow tl_shadow_new " data-tid="7912345678">
  <div class="ti_infos clearfix">
    <div class="ti_author_time">
      <div class="ti_author_icons clearfix"><span class="ti_author"> 吧友甲</span></div>
      <span class="ti_time">07-23</span>
    </div>
  </div>
  <a href="/p/7912345678?lp=5028&amp;mo_device=1" class="j_common ti_item " tid="7912345678">
    <div class="ti_title"><span>【求助】金家岭食堂哪家好吃</span></div>
  </a>
  <div class="ti_zan_reply clearfix">
    <a class="ti_func_btn btn_reply j_ti_reply" href="/p/7912345678">回复 <span class="btn_icon">12000</span></a>
  </div>
</li>
<li class="tl_shadow tl_shadow_new " data-tid="7912345679">
  <div class="ti_infos clearfix">
    <div class="ti_author_time">
      <div class="ti_author_icons clearfix"><span class="ti_author"> 学长乙</span></div>
      <span class="ti_time">今天</span>
    </div>
  </div>
  <a href="/p/7912345679?lp=5028&amp;mo_device=1" class="j_common ti_item " tid="7912345679">
    <div class="ti_title"><span>考研复试经验分享</span></div>
  </a>
  <div class="ti_zan_reply clearfix">
    <a class="ti_func_btn btn_reply j_ti_reply" href="/p/7912345679">回复 <span class="btn_icon">3</span></a>
  </div>
</li>
<li class="tl_shadow tl_shadow_new " data-tid="7912345680">
  <div class="ti_infos clearfix">
    <div class="ti_author_time">
      <div class="ti_author_icons clearfix"><span class="ti_author"> 吧友丙</span></div>
      <span class="ti_time">2026-08-15</span>
    </div>
  </div>
  <a href="/p/7912345680?lp=5028&amp;mo_device=1" class="j_common ti_item " tid="7912345680">
    <div class="ti_title"><span>宿舍空调装好了</span></div>
  </a>
  <div class="ti_zan_reply clearfix">
    <a class="ti_func_btn btn_reply j_ti_reply" href="/p/7912345680">回复 <span class="btn_icon">45</span></a>
  </div>
</li>
<li class="tl_shadow tl_shadow_new " data-tid="7912345681">
  <div class="ti_infos clearfix">
    <div class="ti_author_time">
      <div class="ti_author_icons clearfix"><span class="ti_author"> 吧友丁</span></div>
      <span class="ti_time">昨天</span>
    </div>
  </div>
  <a href="/p/7912345681?lp=5028&amp;mo_device=1" class="j_common ti_item " tid="7912345681">
    <div class="ti_title"><span>暑假校园网断了吗</span></div>
  </a>
  <div class="ti_zan_reply clearfix">
    <a class="ti_func_btn btn_reply j_ti_reply" href="/p/7912345681">回复 <span class="btn_icon">7</span></a>
  </div>
</li>
</body></html>"""


class TestTieba(unittest.TestCase):
    def test_parse_replies(self):
        self.assertEqual(parse_replies('1.2万'), 12000)
        self.assertEqual(parse_replies('45'), 45)
        self.assertEqual(parse_replies(''), 0)
        self.assertEqual(parse_replies('abc'), 0)

    def test_norm_date(self):
        today = date(2026, 8, 17)
        self.assertEqual(norm_date('今天', today), '2026-08-17')
        self.assertEqual(norm_date('昨天', today), '2026-08-16')
        self.assertEqual(norm_date('07-23', today), '2026-07-23')
        self.assertEqual(norm_date('2026-08-15', today), '2026-08-15')
        self.assertEqual(norm_date('', today), '')

    def test_parse_threads(self):
        threads = parse_threads(SAMPLE)
        self.assertEqual(len(threads), 4)
        t0 = threads[0]
        self.assertEqual(t0['title'], '【求助】金家岭食堂哪家好吃')
        self.assertEqual(t0['author'], '吧友甲')
        self.assertEqual(t0['replies'], 12000)
        self.assertEqual(t0['date'], '07-23')
        self.assertEqual(t0['url'], 'https://tieba.baidu.com/p/7912345678')
        self.assertEqual(threads[1]['replies'], 3)
        self.assertEqual(threads[1]['date'], '今天')

    def test_analyze(self):
        threads = parse_threads(SAMPLE)
        out = analyze(threads, today=date(2026, 8, 17))
        # 热帖按回复数排序
        self.assertEqual(out['topThreads'][0]['title'], '【求助】金家岭食堂哪家好吃')
        # 话题归桶
        names = [t['name'] for t in out['topics']]
        self.assertIn('考研升学', names)
        self.assertIn('校园生活', names)
        # 关键词命中
        words = [k['word'] for k in out['keywords']]
        self.assertIn('食堂', words)
        self.assertIn('考研', words)
        # 近 14 天趋势补零
        self.assertEqual(len(out['weekTrend']), 14)
        self.assertEqual(out['weekTrend'][-1]['label'], '08-17')
        self.assertEqual(out['weekTrend'][-2]['label'], '08-16')
        total_posts = sum(d['count'] for d in out['weekTrend'])
        self.assertEqual(total_posts, 3)


if __name__ == '__main__':
    unittest.main()