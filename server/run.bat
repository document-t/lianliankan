@echo off
chcp 65001 >nul
echo 正在启动连连看游戏...
echo 正在初始化数据库...

REM 启动服务器
start /B node server.js

REM 等待服务器启动
timeout /t 2 /nobreak >nul

REM 打开浏览
start http://localhost:3000

echo 游戏已启动，浏览器自动打开 http://localhost:3000
echo 按任意键可关闭此窗口（服务器仍运行）
pause >nul