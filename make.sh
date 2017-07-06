#!/bin/bash

NAME=`basename "$PWD"`.package

cd source
tpm create "$NAME"
mv "$NAME" ../dashboard.package

cd ..
cd maker
tpm create "dashboardmaker.package"
mv "dashboardmaker.package" ../dashboardmaker.package