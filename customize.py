#!/usr/bin/env python3
"""
NCSS-Nav 一键换校脚本
======================
通过交互式问答，将校园导航站快速适配到另一所高校。

用法：
  python customize.py                # 交互式输入
  python customize.py --config cfg.json  # 从配置文件导入
"""
import os
import sys
import json
import re
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).parent
SRC_DIR = BASE_DIR / 'src'
CONFIG_FILE = BASE_DIR / 'src' / 'config' / 'site.js'
APPS_FILE = BASE_DIR / 'src' / 'data' / 'apps.js'

# ─── 颜色主题预设 ────────────────────────────────────────────
THEMES = {
    '1': {'name': '闽都红（默认）', 'primary': '#c62828', 'accent': '#ff5722', 'bg': '#fef2f2'},
    '2': {'name': '北大红', 'primary': '#8b0000', 'accent': '#cc0000', 'bg': '#fff5f5'},
    '3': {'name': '清华紫', 'primary': '#6b21a8', 'accent': '#9333ea', 'bg': '#faf5ff'},
    '4': {'name': '复旦蓝', 'primary': '#1e40af', 'accent': '#3b82f6', 'bg': '#eff6ff'},
    '5': {'name': '浙大绿', 'primary': '#166534', 'accent': '#22c55e', 'bg': '#f0fdf4'},
    '6': {'name': '交大橙', 'primary': '#c2410c', 'accent': '#f97316', 'bg': '#fff7ed'},
    '7': {'name': '武大樱', 'primary': '#be185d', 'accent': '#ec4899', 'bg': '#fdf2f8'},
    '8': {'name': '华科灰', 'primary': '#374151', 'accent': '#6b7280', 'bg': '#f9fafb'},
    '9': {'name': '自定义', 'primary': '', 'accent': '', 'bg': ''},
}

def input_with_default(prompt, default=''):
    val = input(f'{prompt} [{default}]: ').strip()
    return val if val else default

def select_theme():
    print('\n🎨 请选择配色主题：')
    for k, v in THEMES.items():
        print(f'  {k}. {v["name"]}')
    choice = input('\n输入编号 (1-9): ').strip()
    if choice not in THEMES:
        choice = '1'
    theme = THEMES[choice]
    if choice == '9':
        theme['primary'] = input_with_default('主色调（十六进制）', '#c62828')
        theme['accent'] = input_with_default('强调色（十六进制）', '#ff5722')
        theme['bg'] = input_with_default('背景色（十六进制）', '#fef2f2')
    return theme

def gather_info():
    print('=' * 60)
    print('  NCSS-Nav 一键换校脚本')
    print('  将校园导航站快速适配到你的高校')
    print('=' * 60)
    
    info = {}
    print('\n📝 基本信息：')
    info['university'] = input_with_default('学校全称', '福建师范大学')
    info['shortName'] = input_with_default('学校简称', '福star')
    info['brand'] = input_with_default('品牌名（英文/缩写）', 'FJNU-Nav')
    info['motto'] = input_with_default('校训', '知明行笃 · 立诚致广')
    
    print('\n🌐 网络信息：')
    info['jwUrl'] = input_with_default('教务处网址', 'https://jwc.fjnu.edu.cn')
    info['tiebaUrl'] = input_with_default('贴吧URL（学校名URL编码）', 'https://tieba.baidu.com/f?kw=%E7%A6%8F%E5%BB%BA%E5%B8%88%E8%8C%83%E5%A4%A7%E5%AD%A6')
    info['github'] = input_with_default('GitHub仓库地址', 'https://github.com/icyteacn/FJNU-Nav')
    info['pagesUrl'] = input_with_default('GitHub Pages地址', 'https://icyteacn.github.io/FJNU-Nav/')
    
    print('\n🏛️ 学校数据：')
    info['campuses'] = input_with_default('校区数量', '2')
    info['colleges'] = input_with_default('学院数量', '28')
    info['majors'] = input_with_default('专业数量', '84')
    
    print('\n🎨 配色：')
    info['theme'] = select_theme()
    
    return info

def update_site_config(info):
    content = CONFIG_FILE.read_text(encoding='utf-8')
    
    replacements = {
        r"brand:\s*'[^']*'": f"brand: '{info['brand']}'",
        r"name:\s*'[^']*'": f"name: '{info['shortName']} 校园导航'",
        r"tagline:\s*'[^']*'": f"tagline: '{info['university']} · 校园服务聚合入口'",
        r"motto:\s*'[^']*'": f"motto: '{info['motto']}'",
        r"copy:\s*'[^']*'": f"copy: '{info['shortName']} 校园导航 · 非官方校园服务聚合演示站，数据仅供学习交流'",
        r"jwUrl:\s*'[^']*'": f"jwUrl: '{info['jwUrl']}'",
    }
    
    for pattern, replacement in replacements.items():
        content = re.sub(pattern, replacement, content, count=1)
    
    CONFIG_FILE.write_text(content, encoding='utf-8')
    print('✅ site.js 已更新')

def update_apps_stats(info):
    content = APPS_FILE.read_text(encoding='utf-8')
    content = re.sub(
        r"campuses:\s*\d+",
        f"campuses: {info['campuses']}",
        content
    )
    content = re.sub(
        r"colleges:\s*\d+",
        f"colleges: {info['colleges']}",
        content
    )
    content = re.sub(
        r"majors:\s*\d+",
        f"majors: {info['majors']}",
        content
    )
    APPS_FILE.write_text(content, encoding='utf-8')
    print('✅ apps.js 学校数据已更新')

def update_theme(info):
    theme = info['theme']
    css_file = SRC_DIR / 'styles.css'
    if css_file.exists():
        content = css_file.read_text(encoding='utf-8')
        content = re.sub(r'--primary:\s*[^;]+;', f'--primary: {theme["primary"]};', content)
        content = re.sub(r'--accent:\s*[^;]+;', f'--accent: {theme["accent"]};', content)
        css_file.write_text(content, encoding='utf-8')
        print('✅ 样式主题已更新')

def update_tieba_url(info):
    tieba_file = SRC_DIR / 'views' / 'TiebaSentiment.vue'
    if tieba_file.exists():
        content = tieba_file.read_text(encoding='utf-8')
        content = re.sub(
            r"https://tieba\.baidu\.com/f\?kw=[^'\"]+",
            info['tiebaUrl'],
            content
        )
        tieba_file.write_text(content, encoding='utf-8')
        print('✅ TiebaSentiment.vue 贴吧链接已更新')

def update_sentiment_data(info):
    sentiment_file = SRC_DIR / 'data' / 'siteSentiment.js'
    if sentiment_file.exists():
        content = sentiment_file.read_text(encoding='utf-8')
        content = re.sub(
            r"FJNU-Nav",
            info['brand'],
            content
        )
        sentiment_file.write_text(content, encoding='utf-8')
        print('✅ siteSentiment.js 品牌名已更新')

def update_industry_data(info):
    industry_file = SRC_DIR / 'data' / 'industryValue.js'
    if industry_file.exists():
        content = industry_file.read_text(encoding='utf-8')
        content = re.sub(
            r"福建师范大学",
            info['university'],
            content
        )
        industry_file.write_text(content, encoding='utf-8')
        print('✅ industryValue.js 学校名已更新')

def update_agent_profile(info):
    """换校连大脑一起换：同步智能体名称、欢迎语与话术（src/agent/config.js）"""
    agent_file = SRC_DIR / 'agent' / 'config.js'
    if not agent_file.exists():
        return
    content = agent_file.read_text(encoding='utf-8')
    short = info.get('shortName') or info['university']
    content = re.sub(r"agentName: '[^']*'", f"agentName: '{short}智答'", content, count=1)
    content = re.sub(r"schoolShort: '[^']*'", f"schoolShort: '{short}'", content, count=1)
    welcome = (
        f"你好，我是{short}智答。直接说出你的需求，"
        f"比如：“明天有什么课”、“找个空教室自习”、“今天吃什么”。"
    )
    content = re.sub(r"welcome: '[^']*'", f"welcome: '{welcome}'", content, count=1)
    agent_file.write_text(content, encoding='utf-8')
    print('✅ agent/config.js 智能体大脑已切换为「' + short + '智答」')

def update_index_title(info):
    """同步 index.html <title>"""
    idx = BASE_DIR / 'index.html'
    if not idx.exists():
        return
    content = idx.read_text(encoding='utf-8')
    title = f"{info['shortName']} 校园导航 · {info['university']}"
    new = re.sub(r"<title>[^<]*</title>", f"<title>{title}</title>", content, count=1)
    if new != content:
        idx.write_text(new, encoding='utf-8')
        print('✅ index.html 标题已更新')

def apply_config(config_path):
    with open(config_path, 'r', encoding='utf-8-sig') as f:
        info = json.load(f)
    if 'theme' not in info:
        info['theme'] = THEMES['1']
    return info

def main():
    if len(sys.argv) > 2 and sys.argv[1] == '--config':
        info = apply_config(sys.argv[2])
    else:
        info = gather_info()
    
    print('\n🔧 开始适配...')
    update_site_config(info)
    update_apps_stats(info)
    update_theme(info)
    update_tieba_url(info)
    update_sentiment_data(info)
    update_industry_data(info)
    update_agent_profile(info)
    update_index_title(info)
    
    print('\n' + '=' * 60)
    print(f'  ✅ 适配完成！')
    print(f'  学校：{info["university"]}')
    print(f'  品牌：{info["brand"]}')
    print(f'  主色：{info["theme"]["primary"]}')
    print('=' * 60)
    print('\n下一步：')
    print('  1. npm install')
    print('  2. npm run dev')
    print('  3. 打开浏览器查看效果')
    print('  4. 根据需要修改 src/data/ 下的静态数据')

if __name__ == '__main__':
    main()
