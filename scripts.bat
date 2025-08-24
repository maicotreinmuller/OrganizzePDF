@echo off
cls
echo ====================================
echo     PDF Editor - Windows Desktop
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js nao encontrado!
    echo Por favor, instale Node.js 16+ em: https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm nao encontrado!
    echo.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo npm version:
npm --version
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Instalando dependencias pela primeira vez...
    echo.
    call npm install
    if errorlevel 1 (
        echo ERROR: Falha na instalacao das dependencias!
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Dependencias instaladas com sucesso!
    echo.
)

echo Iniciando PDF Editor...
echo.
echo Comandos disponiveis:
echo - Ctrl+Shift+I: Abrir DevTools
echo - Ctrl+R: Recarregar aplicacao
echo - Ctrl+Q: Fechar aplicacao
echo.

REM Start the application
call npm start

if errorlevel 1 (
    echo.
    echo ERROR: Falha ao iniciar a aplicacao!
    echo.
    pause
    exit /b 1
)

echo.
echo Aplicacao encerrada.
pause