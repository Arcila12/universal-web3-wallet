@echo off
echo 正在构建生产版本...

REM 停止所有Node.js进程
taskkill /F /IM node.exe >nul 2>&1

REM 等待一秒钟
timeout /t 1 /nobreak >nul

REM 清理dist目录
if exist dist rmdir /s /q dist

REM 构建生产版本
npm run build

echo.
echo 构建完成！
echo.
echo 请在Chrome中：
echo 1. 访问 chrome://extensions/
echo 2. 开启"开发者模式"
echo 3. 点击"加载已解压的扩展程序"
echo 4. 选择 dist 文件夹
echo.
pause