# -*- coding: utf-8 -*-
"""解析教务处公开页面结构。

- `notice_box` 列表项（通知/校历/课程总表通用）
- 教务处首页动态（news）
- 通知列表多页合并去重
"""
import re
from urllib.parse import urljoin

from . import config
from .fetcher import fetch_text

_NOTICE_BOX = re.compile(
    r'<div class="notice_box">\s*'
    r'<span>(\d{4}-\d{2}-\d{2})</span>\s*'
    r'<a[^>]+href="([^"]+)"[^>]*>([^<]*)</a>'
)
_NEWS_LINK = re.compile(
    r'<a href="(info/[^"]+\.htm)" title="([^"]*)">[\s\S]*?(?:<img src="([^"]+)")?'
)
_PAGER = re.compile(r'href="(jwtz/(\d+)\.htm)"')


def parse_list(html, base_url):
    """解析 `notice_box` 列表项 → [{date, title, url}]。"""
    out = []
    for date, href, title in _NOTICE_BOX.findall(html):
        out.append({'date': date, 'title': title.strip(), 'url': urljoin(base_url, href)})
    return out


def parse_news(html):
    """解析教务处首页动态 → [{title, url, img}]。"""
    out = []
    for href, title, img in _NEWS_LINK.findall(html):
        out.append({
            'title': title,
            'url': urljoin(config.JWC, href),
            'img': urljoin(config.JWC, img) if img else None,
        })
    return out


def fetch_notice_pages(page_count=None):
    """抓取通知列表前 N 页（默认 config.NOTICE_PAGES），按 url 去重合并。"""
    page_count = page_count or config.NOTICE_PAGES
    first = fetch_text(config.JWC + config.NOTICE_LIST)
    base = config.JWC + config.NOTICE_LIST
    items = parse_list(first, base)
    seen = {it['url'] for it in items}

    pages = []
    seen_pages = set()
    for href, num in _PAGER.findall(first):
        n = int(num)
        if n > 1 and n not in seen_pages:
            seen_pages.add(n)
            pages.append((n, href))
    pages.sort(key=lambda x: x[0], reverse=True)

    for _n, href in pages[: page_count - 1]:
        html = fetch_text(config.JWC + '/' + href)
        for it in parse_list(html, base):
            if it['url'] not in seen:
                seen.add(it['url'])
                items.append(it)
    return items