# General
# export LANG=C # Terminal in english
export GIT_EDITOR="nvim"
export EDITOR="nvim"
export TERM="xterm-256color"
export BROWSER="brave"
export GOPATH=$HOME/go
export GOOS=linux
export GOARCH=amd64
export PYENV_ROOT="$HOME/.pyenv"
export SCRIPTSPATH="$HOME/tools/scripts"

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
source prefix/etc/profile.d/nix.sh # nix paths
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.fzf/bin:$PATH"
export PATH="$HOME/.local/share/nvim:$PATH"
export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH"
export PATH="$HOME/.config/composer/vendor/bin:$PATH"
export PATH="$PYENV_ROOT/bin:$PATH"
export PATH="$PATH:$HOME/.composer/vendor/bin"
export PATH="$PATH:/usr/local/go/bin"
export PATH="$PATH:$GOPATH/bin"
export PATH="$PATH:$HOME/apps/zig-linux-x86_64-0.13.0/zig"
export PATH="$PATH:$SCRIPTSPATH/bin"

# Nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"                   # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" # This loads nvm bash_completion

# Cargo
. "$HOME/.cargo/env"
fpath+=${ZDOTDIR:-~}/.zsh_functions

# Symofony completion
[ -s "$HOME/zsh/symfonyconsole_completion.zsh" ] && source "$HOME/zsh/symfonyconsole_completion.zsh"
[ -s "$HOME/zsh/symfony_completion.zsh" ] && source "$HOME/zsh/symfony_completion.zsh"

# Ghostty integration for zsh
if [[ -n $GHOSTTY_RESOURCES_DIR ]]; then
  source $GHOSTTY_RESOURCES_DIR/shell-integration/zsh/ghostty-integration
fi

# Pyenv
if command -v pyenv 1>/dev/null 2>&1; then
  eval "$(pyenv init -)"
fi

eval "$(zoxide init zsh)"
export _ZO_ECHO='1'

# FZF integration
source <(fzf --zsh)

# Icons in terminal
. ~/.local/share/icons-in-terminal/icons_bash.sh

# Man pager in color
export MANPAGER="sh -c 'col -bx | bat -l man -p'"

# NOTE: starsihp needs to be at the end
eval "$(starship init zsh)"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"                   # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" # This loads nvm bash_completion
