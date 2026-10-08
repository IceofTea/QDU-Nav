@echo off
chcp 936 >nul
title QDU-Nav 智能工具箱 v1.4.0
color 0B
mode con: cols=78 lines=34
:menu
cls
echo.
echo   ============================================================
echo                   QDU-Nav 智能工具箱  v1.4.0
echo   ============================================================
echo.
echo    [1]  网站工坊（可视化换校 - 白痴式打字改站，配色字号实时生效）
echo    [2]  命令行一键换校（交互问答 customize.py）
echo    [3]  TUI / Excel 换校（customize_tui.py）
echo    [4]  打开网站（自动构建 + 社区网关 + 浏览器直达完整站点）
echo    [5]  智能体演示模式（直接进入对话式助手）
echo    [6]  只启动社区网关（评论 / 校园墙 / 实时共享）
echo    [7]  打开管理台（隐秘入口，需口令）
echo    [8]  社区冒烟测试（18 项全链路自检）
echo    [9]  构建站点（npm run build）
echo    [0]  退出
echo.
echo   ============================================================
set /p choice=  请输入数字后回车:
if "%choice%"=="1" goto workshop
if "%choice%"=="2" goto cli
if "%choice%"=="3" goto tui
if "%choice%"=="4" goto site
if "%choice%"=="5" goto agent
if "%choice%"=="6" goto gateway
if "%choice%"=="7" goto admin
if "%choice%"=="8" goto smoke
if "%choice%"=="9" goto build
if "%choice%"=="0" exit
goto menu

:workshop
echo.
echo   [1/3] 启动本地开发服务（新窗口，端口 5173）...
start "dev" cmd /c "npm run dev"
echo   [2/3] 等待服务就绪（约 5 秒）...
ping -n 6 127.0.0.1 >nul
echo   [3/3] 打开浏览器 → 网站工坊（换校向导）
start "" "http://localhost:5173/#/app/rebrand"
echo.
echo   提示：在工坊里直接打字修改学校名 / 配色 / 字号 / 文案，
echo         全部实时生效；改完点「生成 site.js」下载覆盖源文件，
echo         或导出 JSON 交给 customize.py --config 一键落盘。
echo.
pause
goto menu

:cli
echo.
echo   运行命令行换校（输入学校信息即可，支持 --config 导入）...
python customize.py
pause
goto menu

:tui
echo.
echo   运行 TUI / Excel 换校...
python customize_tui.py
pause
goto menu

:site
echo.
if not exist "dist\index.html" (
  echo   未检测到构建产物，先执行构建...
  call npm run build
)
echo   启动社区网关（新窗口，端口 8787，评论与校园墙跨用户共享）...
start "gateway" cmd /c "node server/index.mjs"
ping -n 3 127.0.0.1 >nul
echo   打开浏览器 → 完整网站...
start "" "http://localhost:8787/"
echo.
echo   网站已就绪！管理台暗门：连点首页 Logo 3 次，或访问 /admin
pause
goto menu

:agent
if not exist "dist\index.html" (
  echo   先构建...
  call npm run build
)
start "gateway" cmd /c "node server/index.mjs"
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:8787/#/app/assistant"
echo   智能体已打开。试试：今日简报 / 哪里有空教室 / 看校园墙
pause
goto menu

:gateway
start "gateway" cmd /c "node server/index.mjs"
ping -n 3 127.0.0.1 >nul
echo   网关已启动：http://localhost:8787  （管理台 /admin）
pause
goto menu

:admin
start "" "http://localhost:8787/admin"
echo   若页面无法打开，请先用 [6] 启动社区网关。
pause
goto menu

:smoke
node scripts/smoke-community.mjs
pause
goto menu

:build
call npm run build
pause
goto menu
