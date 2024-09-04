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

# nvim specific file with fzf
function _nvf() {
    zle push-input
    BUFFER="nvf"
    zle accept-line
}
zle -N _nvf
bindkey '^o' _nvf

# nvim specific file with fzf
function _pwd() {
    zle push-input
    BUFFER="pwd"
    zle accept-line
}
zle -N _pwd
bindkey '^p' _pwd

# TODO: stty sane OR reset
