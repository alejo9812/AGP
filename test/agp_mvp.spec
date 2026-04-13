# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

datas = collect_data_files("streamlit") + collect_data_files("reportlab") + [
    ("src/ui/app.py", "src/ui"),
    ("src/__init__.py", "src"),
    ("src/core/__init__.py", "src/core"),
    ("src/reports/__init__.py", "src/reports"),
    ("src/utils/__init__.py", "src/utils"),
    (".streamlit/config.toml", ".streamlit"),
]
hiddenimports = (
    collect_submodules("streamlit")
    + collect_submodules("reportlab")
    + collect_submodules("pandas")
)

a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    [],
    name="agp_mvp",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    exclude_binaries=True,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="agp_mvp",
)
