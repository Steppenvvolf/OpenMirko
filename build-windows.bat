@echo off
cd /d "C:\Users\Kaizen\OneDrive\Desktop\OpenMirko\src-tauri"
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
C:\Users\Kaizen\.cargo\bin\cargo.exe build --release
echo [BUILD_EXIT] %errorlevel%
