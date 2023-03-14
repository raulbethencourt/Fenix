#!/bin/bash

cd

FZF_RESULT=$(fd --type d --hidden --exclude .git | fzf --preview "bat --color=always --style=numbers --line-range=:500 {}")

if [[ $FZF_RESULT ]]; then
	cd "$HOME/${FZF_RESULT:2}"
fi
