ECHO OFF
SETLOCAL ENABLEEXTENSIONS
SET parent=%~dp0
SET name=dashboard.package

cd source
totaljs --package %parent%%name%
MOVE %name% ../