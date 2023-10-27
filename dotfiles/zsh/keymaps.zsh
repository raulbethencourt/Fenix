#!/bin/zsh

# open one off my projects
function _nvp() {
    zle push-input
    BUFFER="nvp"
    zle accept-line
}
zle -N _nvp
bindkey '^u' _nvp

# cd with fzf
function _cdf() {
    zle push-input
    BUFFER="cdf"
    zle accept-line
}
zle -N _cdf
bindkey '^y' _cdf

# lunarvim specific file with fzf
function _nvf() {
    zle push-input
    BUFFER="nvf"
    zle accept-line
}
zle -N _nvf
bindkey '^o' _nvf

# lunarvim specific file with fzf
function _tmuwxw() {
    zle push-input
    BUFFER="tmux list-windows| fzf | cut -d ':' -f 1 | xargs -I % tmux select-window -t %"
    zle accept-line
}
zle -N _tmuwxw
bindkey '^p' _tmuwxw
