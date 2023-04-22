#!/usr/bin/env zsh
languages=`echo "bash rust php lua nodejs typescript html css javascript" | tr ' ' '\n'`
core_utils=`echo "tmux read xargs find fd mv sed awk rg grep tail df" | tr ' ' '\n'`

selected=`printf "$languages\n$core_utils" | fzf`
read "query?query: " 

if printf $languages | grep -qs $selected; then
    tmux neww zsh -c "curl cht.sh/$selected/`echo $query | tr ' ' '+'` & while [ : ]; do sleep 1; done"
else
    tmux neww zsh -c "curl cht.sh/$selected~$query & while [ : ]; do sleep 1; done"
fi
