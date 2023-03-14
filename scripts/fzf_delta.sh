#!/bin/bash

CWD=$(pwd)

cd

FZF_RESULT1=$(fd --type f --hidden --exclude .git | fzf --preview "bat --color=always --style=numbers --line-range=:500 {}")
FZF_RESULT2=$(fd --type f --hidden --exclude .git | fzf --preview "bat --color=always --style=numbers --line-range=:500 {}")

if [[ $FZF_RESULT1 && $FZF_RESULT2 ]]; then
	delta $FZF_RESULT1 $FZF_RESULT2
    cd "$CWD"
fi
