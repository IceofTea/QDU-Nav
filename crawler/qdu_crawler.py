"""QDU-Nav 数据爬取适配器（示例框架）

将「QDU 校园导航」的前端数据对接青岛大学官方系统的方案。

警告：
- 本模块仅供学习与技术研究。
- 教务系统为学校内部系统，请低频访问、勿滥用，遵守校规校纪与法律法规。
- 请勿爬取他人隐私数据；学号/成绩等仅用于本人场景。

用法：
    python qdu_crawler.py --mock                          # 演示（无需账号）
    python qdu_crawler.py --username <学号> --password <密码>   # 真实抓取
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import time
from typing import Any, Dict, List, Optional

import requests

try:
    from PIL import Image, ImageFilter, ImageOps
    HAS_PIL = True
except Exception:
    HAS_PIL = False

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

OFFICIAL = {
    "jw_login": "http://jw.qdu.edu.cn/academic/common/security/login.jsp",
    "jw_base": "http://jw.qdu.edu.cn/academic/",
    "xjw": "https://xjw.qdu.edu.cn/",
    "jwc": "https://jwc.qdu.edu.cn/",
    "jwc_calendar_2026": "https://jwc.qdu.edu.cn/info/1005/6515.htm",
    "jwc_calendar_2025": "https://jwc.qdu.edu.cn/info/1005/5861.htm",
    "zs": "https://zs.qdu.edu.cn/",
    "school_code": "11065",
}


class QduSession:
    """带重试与统一头部的会话封装。"""

    def __init__(self, timeout: int = 15, retries: int = 2):
        self.session = requests.Session()
        self.session.headers.update(
            {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) QDU-Nav-Crawler/1.0"}
        )
        self.timeout = timeout
        self.retries = retries

    def request(self, method: str, url: str, **kwargs: Any) -> requests.Response:
        kwargs.setdefault("timeout", self.timeout)
        last_exc: Optional[Exception] = None
        for i in range(self.retries + 1):
            try:
                return self.session.request(method, url, **kwargs)
            except requests.RequestException as exc:
                last_exc = exc
                time.sleep(0.5 * (i + 1))
        if last_exc is not None:
            raise last_exc
        raise RuntimeError("unreachable")


class ZhengFangCrawler:
    """正方教务系统爬虫（模拟登录 + 抓取）。"""

    def __init__(self) -> None:
        self.client = QduSession()

    def download_captcha(self, save_to: str = "captcha.png") -> Optional[str]:
        """获取登录验证码图片。不同版本的验证码地址可能不同，需按实际页面调整。"""
        for url in (
            OFFICIAL["jw_base"] + "getCaptcha.do",
            OFFICIAL["jw_base"] + "verifycode.servlet",
        ):
            try:
                r = self.client.request("GET", url)
                if r.status_code == 200 and len(r.content) > 500:
                    with open(save_to, "wb") as f:
                        f.write(r.content)
                    return save_to
            except requests.RequestException:
                continue
        return None

    @staticmethod
    def preprocess_captcha(path: str) -> None:
        """用 PIL 做简单预处理，便于人工识别/OCR。"""
        if not HAS_PIL:
            return
        img = Image.open(path).convert("L")
        img = ImageOps.autocontrast(img)
        img = img.filter(ImageFilter.MedianFilter(3))
        img.save(path)

    def login(self, username: str, password: str, captcha: str) -> bool:
        """登录正方教务（学号 + 密码 + 验证码）。接口参数需按实际页面调整。"""
        # 先访问登录页获取必要的 Cookie 与隐藏参数
        try:
            self.client.request("GET", OFFICIAL["jw_login"])
        except requests.RequestException:
            pass
        payload = {
            "j_username": username,
            "j_password": password,
            "j_captcha": captcha,
        }
        try:
            r = self.client.request(
                "POST",
                OFFICIAL["jw_login"].replace("login.jsp", "login.do"),
                data=payload,
                allow_redirects=False,
            )
        except requests.RequestException:
            return False
        # 200 且含 index 则登录成功
        if r.status_code in (200, 302) and "index" in (r.text or "").lower():
            return True
        return False

    def fetch_timetable(self, term: str = "2026-2027-1") -> Dict[str, Any]:
        """抓取课表（真实接口路径因学校版本而异，需抓包确认）。"""
        url = OFFICIAL["jw_base"] + "student/courseTableForStd!queryCourseTable.action"
        try:
            r = self.client.request("POST", url, data={"yearTerm": term})
            return {"ok": True, "html": r.text[:2000]}
        except requests.RequestException as exc:
            return {"ok": False, "error": str(exc)}


class PublicCrawler:
    """公开页面抓取：校历图片、教务处公告、招生公告。"""

    def __init__(self) -> None:
        self.client = QduSession()

    def _absolute(self, base: str, path: str) -> str:
        if path.startswith("http"):
            return path
        return requests.compat.urljoin(base, path.lstrip("./"))

    def fetch_calendar_images(self, page: str = "jwc_calendar_2026") -> List[str]:
        """从校历页面提取校历大图 URL（正文区图片）。"""
        url = OFFICIAL[page]
        try:
            html = self.client.request("GET", url).text
        except requests.RequestException:
            return []
        imgs: List[str] = []
        for m in re.finditer(r'<img[^>]+src="([^"]+)"', html):
            src = m.group(1)
            if any(x in src.lower() for x in (".jpg", ".jpeg", ".png", ".gif")):
                imgs.append(self._absolute(url, src))
        return imgs

    def fetch_announcements(self, source: str = "jwc") -> List[Dict[str, str]]:
        """抓取教务处/招生网公告列表。"""
        url = OFFICIAL["zs"] if source == "zs" else OFFICIAL["jwc"]
        try:
            html = self.client.request("GET", url).text
        except requests.RequestException:
            return []
        items: List[Dict[str, str]] = []
        for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>([^<]{4,60})</a>', html):
            href, title = m.group(1), m.group(2).strip()
            if not title:
                continue
            items.append({"title": title, "url": self._absolute(url, href)})
            if len(items) >= 20:
                break
        return items


class StudentIdLookup:
    """新生学号查询（正方系统内，需要验证码）。

    真实场景：模拟提交「考生号 + 姓名 + 证件号后6位 + 验证码」到查询接口，
    接口路径需抓包确认；验证码请人工识别（不建议自动打码）。
    本类仅说明流程，默认返回 None（未实现真实提交）。
    """

    def __init__(self) -> None:
        self.client = QduSession()

    def lookup(self, kaoshenghao: str, name: str, id_last6: str) -> Dict[str, Any]:
        raise NotImplementedError(
            "真实学号查询需按正方系统实际接口实现并处理验证码；"
            "请先确认合规后再对接。演示数据见前端 src/api/mock.js。"
        )


def build_mock_payload() -> Dict[str, Any]:
    """演示模式数据：与前端 src/data/ 保持一致。"""
    classes = [
        {"className": "计科 2301", "college": "计算机科学技术学院"},
        {"className": "软工 2302", "college": "计算机科学技术学院"},
        {"className": "临床 2301", "college": "青岛医学院"},
        {"className": "金融 2301", "college": "经济学院"},
        {"className": "自动化 2301", "college": "自动化学院"},
        {"className": "汉语言 2301", "college": "文学与新闻传播学院"},
        {"className": "商学 2301", "college": "商学院"},
        {"className": "数应 2301", "college": "数学与统计学院"},
    ]
    return {
        "meta": {"updatedAt": "2026-08-16 15:20", "source": "mock", "classCount": len(classes)},
        "classes": classes,
        "campuses": [
            {"name": "浮山校区", "address": "青岛市市南区宁夏路 308 号"},
            {"name": "金家岭校区", "address": "崂山区科大支路 62 号 / 松岭路 93 号"},
            {"name": "松山校区", "address": "市北区登州路 38 号"},
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="QDU 数据爬取适配器")
    parser.add_argument("--mock", action="store_true", help="演示模式（无需账号）")
    parser.add_argument("--username", help="学号")
    parser.add_argument("--password", help="密码")
    parser.add_argument("--captcha", help="验证码（人工输入）")
    parser.add_argument("--out", default=os.path.join(OUT_DIR, "data.json"), help="输出 JSON 路径")
    args = parser.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)

    if args.mock:
        payload = build_mock_payload()
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"\n[demo] 已输出示例数据 -> {args.out}")
        print("[demo] 真实对接：python qdu_crawler.py --username 学号 --password 密码")
        return

    if not (args.username and args.password):
        print("真实模式需要 --username 与 --password；或使用 --mock 演示。")
        return

    crawler = ZhengFangCrawler()
    captcha_file = crawler.download_captcha()
    if captcha_file:
        crawler.preprocess_captcha(captcha_file)
        print(f"验证码已保存：{captcha_file}，请人工查看并输入。")
        captcha = args.captcha or input("请输入验证码：")
        ok = crawler.login(args.username, args.password, captcha)
        print("登录成功" if ok else "登录失败（请核对账号/验证码或接口参数）")
        if ok:
            print(json.dumps(crawler.fetch_timetable(), ensure_ascii=False, indent=2))

    pub = PublicCrawler()
    print("\n[info] 校历图片：", pub.fetch_calendar_images())
    print("[info] 教务处公告：", json.dumps(pub.fetch_announcements("jwc"), ensure_ascii=False)[:500])


if __name__ == "__main__":
    main()