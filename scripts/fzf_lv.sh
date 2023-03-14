#!/bin/bash

CWD=$(pwd)

cd

FZF_RESULT=$(fd --type f --hidden --exclude .git | fzf --preview "bat --color=always --style=numbers --line-range=:500 {}")

if [[ $FZF_RESULT ]]; then
	lvim $FZF_RESULT
fi
