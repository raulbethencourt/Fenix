#!/bin/zsh

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

# launch nvim
function _nvim() {
  zle push-input
  BUFFER="nvim ."
  zle accept-line
}
zle -N _nvim
bindkey '^v' _nvim

# recover job
function _fg() {
  zle push-input
  BUFFER="fg"
  zle accept-line
}
zle -N _fg
bindkey '^f' _fg

function edit-command-line-inplace() {
  if [[ $CONTEXT != start ]]; then
    if (( ! ${+widgets[edit-command-line]} )); then
      autoload -Uz edit-command-line
      zle -N edit-command-line
    fi
    zle edit-command-line
    return
  fi
  () {
    emulate -L zsh -o nomultibyte
    local editor=("${(@Q)${(z)${VISUAL:-${EDITOR:-vi}}}}") 
    case $editor in
      (*vim*)
        "${(@)editor}" -c "normal! $(($#LBUFFER + 1))go" -- $1
      ;;
      (*emacs*)
        local lines=("${(@f)LBUFFER}") 
        "${(@)editor}" +${#lines}:$((${#lines[-1]} + 1)) $1
      ;;
      (*)
        "${(@)editor}" $1
      ;;
    esac
    BUFFER=$(<$1)
    CURSOR=$#BUFFER
  } =(<<<"$BUFFER") </dev/tty
}
zle -N edit-command-line-inplace
bindkey '^e' edit-command-line-inplace
