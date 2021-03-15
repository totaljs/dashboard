ECHO OFF
SETLOCAL ENABLEEXTENSIONS
SET parent=%~dp0
SET name=dashboard.package

cd source
total4 --package %parent%%name%
MOVE %name% ../