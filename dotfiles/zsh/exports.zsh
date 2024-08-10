#!/bin/zsh

# General
export TERM="xterm-256color"
export GOPATH=$HOME/go
export BROWSER="brave"
export GIT_EDITOR="nvim"
export ATAC_KEY_BINDINGS="$HOME/.config/atac/keybindings.toml"

# FZF color theme
export FZF_DEFAULT_OPTS=" \
  --height 50% --info=inline --margin=1 --padding=1
  --bind=tab:down --bind=btab:up --bind=ctrl-g:first
  --bind 'ctrl-/:toggle-preview'
  --bind 'ctrl-y:execute-silent(echo -n {2..} | pbcopy)+abort'
  --color fg:#ebdbb2,hl:#fabd2f,fg+:#ebdbb2,bg+:#3c3836,hl+:#fabd2f
  --color info:#83a598,prompt:#bdae93,spinner:#fabd2f,pointer:#83a598,marker:#fe8019,header:#665c54"

# FZF CTRL-R
export FZF_CTRL_R_OPTS="
  --border=none -i --bind=tab:up --bind=btab:down --bind=ctrl-g:first
  --preview 'echo {}' --preview-window up:3:hidden:wrap
  --bind 'ctrl-/:toggle-preview'
  --bind 'ctrl-y:execute-silent(echo -n {2..} | pbcopy)+abort'
  --color header:italic
  --header 'Press CTRL-Y to copy command into clipboard'"

# PATHS
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.config/joshuto:$PATH"
export PATH="$HOME/tools/scripts:$PATH"
export PATH="$HOME/tools/scripts/wcss:$PATH"
export PATH="$HOME/.fzf/bin:$PATH"
export PATH="$HOME/apps/liquibase:$PATH"
export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH"
export PATH="$HOME/.config/composer/vendor/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/tools/scripts:$PATH"
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
export PATH="$PATH:$HOME/.composer/vendor/bin"
export PATH="$PATH:$GOROOT/bin:$GOPATH/bin"

# Man with bat
export MANPAGER="sh -c 'col -bx | bat -l man -p'"

# Nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"                   # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" # This loads nvm bash_completion

# Cargo
. "$HOME/.cargo/env"
fpath+=${ZDOTDIR:-~}/.zsh_functions

# Pyenv
if command -v pyenv 1>/dev/null 2>&1; then
  eval "$(pyenv init -)"
fi

# FZF integration
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
source /usr/share/doc/fzf/examples/key-bindings.zsh
source /usr/share/doc/fzf/examples/completion.zsh

LFCD="$GOPATH/src/github.com/gokcehan/lf/etc/lfcd.sh" # source
LFCD="/home/rabeta/.config/lf/lfcd.sh"                #  pre-built binary, make sure to use absolute path
if [ -f "$LFCD" ]; then
  source "$LFCD"
fi

eval "$(zoxide init zsh)"
export _ZO_ECHO='1'

# Icons in terminal
. ~/.local/share/icons-in-terminal/icons_bash.sh

# NOTE: starship prompt
eval "$(starship init zsh)"
