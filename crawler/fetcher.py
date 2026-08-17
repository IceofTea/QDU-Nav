# -*- coding: utf-8 -*-
"""通用抓取：文本/二进制，带超时与重试。"""
import time
import urllib.request
import urllib.error

from . import config


def _request(url, timeout=config.TIMEOUT):
    req = urllib.request.Request(url, headers={'User-Agent': config.UA})
    return urllib.request.urlopen(req, timeout=timeout)


def fetch_text(url):
    """抓取网页文本，失败自动重试。"""
    last = None
    for attempt in range(config.MAX_RETRY + 1):
        try:
            with _request(url) as resp:
                return resp.read().decode('utf-8', errors='replace')
        except Exception as exc:  # noqa: BLE001 网络层异常统一重试
            last = exc
            if attempt < config.MAX_RETRY:
                time.sleep(0.8 * (attempt + 1))
    raise last


def fetch_bytes(url, referer=None):
    """抓取二进制（如课程总表 xlsx 附件）。"""
    last = None
    for attempt in range(config.MAX_RETRY + 1):
        try:
            headers = {'User-Agent': config.UA}
            if referer:
                headers['Referer'] = referer
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt < config.MAX_RETRY:
                time.sleep(0.8 * (attempt + 1))
    raise last