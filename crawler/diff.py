# -*- coding: utf-8 -*-
"""快照差异摘要

对比 `git show HEAD:public/data/snapshot.json` 与当前快照，输出数据变更摘要，
供 CI 提交信息使用（通知增减、动态变化、课程表变化、排课量变化）。

用法：
    python crawler/diff.py
"""
import json
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent
CURRENT = ROOT / 'public' / 'data' / 'snapshot.json'


def load_previous():
    """从 git 取上次提交的快照；无历史时返回 None。"""
    try:
        out = subprocess.run(
            ['git', 'show', 'HEAD:public/data/snapshot.json'],
            cwd=str(ROOT), capture_output=True, text=True, encoding='utf-8', timeout=30)
        if out.returncode != 0:
            return None
        return json.loads(out.stdout)
    except (subprocess.SubprocessError, json.JSONDecodeError):
        return None


def diff(old, new):
    """返回变更摘要字符串列表。"""
    lines = []

    def items_of(snap):
        return snap['notices']['items'] if snap else []

    def urls(snap):
        return {it['url'] for it in items_of(snap)}

    if old is None:
        n = len(new['notices']['items'])
        lines.append('首次生成快照：通知 %d 条 / 排课 %d 条' % (n, len(new['rows'])))
        return lines

    added = urls(new) - urls(old)
    removed = urls(old) - urls(new)
    old_titles = {it['url']: it['title'] for it in items_of(old)}
    new_titles = {it['url']: it['title'] for it in items_of(new)}
    renamed = [new_titles[u] for u in urls(new) & urls(old)
               if old_titles.get(u) and new_titles.get(u) and old_titles[u] != new_titles[u]]

    if added:
        lines.append('新增通知 %d 条' % len(added))
    if removed:
        lines.append('移除通知 %d 条' % len(removed))
    if renamed:
        lines.append('通知标题变化 %d 条' % len(renamed))

    old_news = [it['title'] for it in (old['news']['items'] if old else [])]
    new_news = [it['title'] for it in new['news']['items']]
    if old_news != new_news:
        lines.append('教学动态有更新（%d → %d 条）' % (len(old_news), len(new_news)))

    old_cal = len(old['calendar']['items']) if old else 0
    new_cal = len(new['calendar']['items'])
    if old_cal != new_cal:
        lines.append('校历条目 %d → %d' % (old_cal, new_cal))

    old_ct = old['courseTable'] if old else {}
    new_ct = new['courseTable']
    if old_ct.get('semester') != new_ct.get('semester'):
        lines.append('最新课程表学期：%s → %s' % (old_ct.get('semester'), new_ct.get('semester')))
    if len(old['rows']) != len(new['rows']):
        lines.append('排课量 %d → %d' % (len(old['rows']), len(new['rows'])))

    return lines


def main():
    new = json.loads(CURRENT.read_text(encoding='utf-8'))
    lines = diff(load_previous(), new)
    if not lines:
        lines = ['数据无变化']
    print('；'.join(lines))


if __name__ == '__main__':
    main()