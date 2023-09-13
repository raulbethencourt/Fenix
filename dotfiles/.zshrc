# ZAP !!!
[ -f "$HOME/.local/share/zap/zap.zsh" ] && source "$HOME/.local/share/zap/zap.zsh"

# History
HISTFILE=~/.zsh_history

autoload -Uz compinit
compinit

# Zap plugins
plug "Aloxaf/fzf-tab"
plug "zap-zsh/supercharge"
export VI_MODE_ESC_INSERT="jk" && plug "raulbethencourt/vim-zsh"
plug "zsh-users/zsh-syntax-highlighting"
plug "zap-zsh/exa"
plug "hlissner/zsh-autopair"
plug "MichaelAquilina/zsh-you-should-use"
plug "zsh-users/zsh-autosuggestions"
plug "zap-zsh/zap-prompt"

# Aliases
source ~/zsh/exports.zsh
source ~/zsh/alias/general.zsh
source ~/zsh/alias/git.zsh
source ~/zsh/alias/ubuntu.zsh
source ~/zsh/alias/docker.zsh
