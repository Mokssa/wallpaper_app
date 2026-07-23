# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

block_cipher = None
root = Path(r"E:\Mukti\Python\wallpaper_app")

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
    icon=r"E:\Mukti\Python\wallpaper_app\assets\logo.ico",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
)
