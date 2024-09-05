#!/usr/bin/bash

SRC="./sass/cinnamon.scss"
COMPILE="cinnamon.css"

bundle exec sass --watch $SRC:$COMPILE --sourcemap=none --no-cache --style expanded
