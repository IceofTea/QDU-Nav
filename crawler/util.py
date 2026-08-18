# -*- coding: utf-8 -*-
"""crawler 公共工具：跨脚本复用的辅助函数（避免各脚本重复实现）。"""
from datetime import datetime, timezone


def utcnow():
    """UTC 时间 ISO 格式（毫秒三位 + Z），供快照 / 统计的 updatedAt 字段使用。"""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'