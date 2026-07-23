$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$iconPath = Join-Path $PSScriptRoot "assets\logo.ico"
$spec = Join-Path $PSScriptRoot "WallpaperApp.spec"
$workerCount = [Math]::Max(2, [Environment]::ProcessorCount)

& $venvPython -m compileall -q -f -j $workerCount $PSScriptRoot

@"
# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

block_cipher = None
root = Path(r"$PSScriptRoot")

a = Analysis(
    [str(root / "main.py")],
    pathex=[str(root)],
    binaries=[],
datas=[
        (str(root / "assets" / "logo.ico"), "assets"),
        (str(root / "config"), "config"),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="WallpaperApp",
    icon=r"$iconPath",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
)
"@ | Set-Content -Encoding UTF8 $spec

Remove-Item -Recurse -Force (Join-Path $root "build") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $root "dist") -ErrorAction SilentlyContinue

& $venvPython -m PyInstaller $spec --noconfirm

$distDir = Join-Path $root "dist\WallpaperApp"
if (-not (Test-Path $distDir)) {
    $distFile = Join-Path $root "dist\WallpaperApp.exe"
    if (Test-Path $distFile) {
        Write-Host "Build completed: $distFile"
        exit 0
    }
    throw "Build output not found: $distDir"
}

Write-Host "Build completed: $distDir"
