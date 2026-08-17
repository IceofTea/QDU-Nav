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

SAMPLE = """<html><body><ul class="threadlist_bright j_threadlist">
<li class=" j_thread_list clearfix" data-field='{"author_name":"A"}'>
  <div class="threadlist_title pull_left j_th_tit ">
    <a class="j_th_tit " href="/p/7912345678" title="【求助】金家岭食堂哪家好吃">【求助】金家岭食堂哪家好吃</a>
  </div>
  <div class="threadlist_author pull_left">
    <span class="tb_icon_author no_icon_author"></span>
    <span class="frs-author-name-wrap"><a class="frs-author-name j_click_username" href="#">吧友甲</a></span>
  </div>
  <div class="threadlist_reply pull_left j_replyer">
    <span class="threadlist_reply_num j_reply_num" title="回复">1.2万</span>
    <span class="threadlist_reply_text">回复</span>
  </div>
  <div class="threadlist_date pull_right">07-23</div>
</li>
<li class=" j_thread_list clearfix">
  <div class="threadlist_title pull_left j_th_tit ">
    <a class="j_th_tit " href="/p/7912345679" title="考研复试经验分享">考研复试经验分享</a>
  </div>
  <div class="threadlist_author pull_left">
    <span class="frs-author-name-wrap"><a class="frs-author-name" href="#">学长乙</a></span>
  </div>
  <div class="threadlist_reply pull_left j_replyer">
    <span class="threadlist_reply_num j_reply_num" title="回复">3</span>
  </div>
  <div class="threadlist_date pull_right">今天</div>
</li>
<li class=" j_thread_list clearfix">
  <div class="threadlist_title pull_left j_th_tit ">
    <a class="j_th_tit " href="/p/7912345680" title="宿舍空调装好了">宿舍空调装好了</a>
  </div>
  <div class="threadlist_author pull_left">
    <span class="frs-author-name-wrap"><a class="frs-author-name" href="#">吧友丙</a></span>
  </div>
  <div class="threadlist_reply pull_left j_replyer">
    <span class="threadlist_reply_num j_reply_num" title="回复">45</span>
  </div>
  <div class="threadlist_date pull_right">2026-08-15</div>
</li>
<li class=" j_thread_list clearfix">
  <div class="threadlist_title pull_left j_th_tit ">
    <a class="j_th_tit " href="/p/7912345681" title="暑假校园网断了吗">暑假校园网断了吗</a>
  </div>
  <div class="threadlist_author pull_left">
    <span class="frs-author-name-wrap"><a class="frs-author-name" href="#">吧友丁</a></span>
  </div>
  <div class="threadlist_reply pull_left j_replyer">
    <span class="threadlist_reply_num j_reply_num" title="回复">7</span>
  </div>
  <div class="threadlist_date pull_right">昨天</div>
</li>
</ul></body></html>"""


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
        out = analyze(threads)
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