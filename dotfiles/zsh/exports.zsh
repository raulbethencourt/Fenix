# General
export GIT_EDITOR="nvim"
export EDITOR="nvim"
# export TERM="alacritty"
export TERM="xterm-256color"
export BNS_USER="raul-bns"
export BROWSER="brave"
export BNS_TOOLS="$HOME/dev/bns/tools"
export ATAC_KEY_BINDINGS="$HOME/.config/atac/keybindings.toml"
export ATAC_MAIN_DIR="$HOME/atac"
# export BAT_THEME="gruvbox-dark"

# FZF color theme
export FZF_DEFAULT_OPTS=" \
  --height 50% --info=inline --margin=1 --padding=1
  --bind=tab:up --bind=btab:down --bind=ctrl-g:first
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
export PATH="$HOME/.fzf/bin:$PATH"
export PATH="$HOME/dev/bns/tools/bin:$PATH"
export PATH="$HOME/.local/share/nvim:$PATH"
export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH"
export PATH="$HOME/.config/composer/vendor/bin:$PATH"
export PATH="$HOME/dev/bnstools/tools/scripts:$PATH"
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
export PATH="$PATH:$HOME/.composer/vendor/bin"
export PATH=$PATH:/usr/local/go/bin

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

eval "$(zoxide init zsh)"
export _ZO_ECHO='1'

# FZF integration
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
. /usr/share/doc/fzf/examples/key-bindings.zsh
. /usr/share/doc/fzf/examples/completion.zsh

# Icons in terminal
. ~/.local/share/icons-in-terminal/icons_bash.sh

# Change user name in ssh/config file
export SSH_USER="raul-bns"
cat ~/.ssh/config.tmp | sed -e "s/\${SSH_USER}/${SSH_USER}/g" >~/.ssh/config

# Man pager in color
export MANPAGER="sh -c 'col -bx | batcat -l man -p'"

. ~/dev/bns/tools/bin/.autocompletion

# NOTE: starsihp needs to be at the end
eval "$(starship init zsh)"
