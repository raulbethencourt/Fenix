# ZAP !!!
[ -f "$HOME/.local/share/zap/zap.zsh" ] && source "$HOME/.local/share/zap/zap.zsh"

# History
HISTFILE=~/.zsh_history

# Zap plugins
plug "zap-zsh/supercharge"
plug "zap-zsh/exa"
plug "zsh-users/zsh-autosuggestions"
plug "zsh-users/zsh-syntax-highlighting"
plug "hlissner/zsh-autopair"
plug "zap-zsh/vim"

# Example theme
plug "zap-zsh/zap-prompt"

# Aliases
source ~/zsh/alias/general.zsh
source ~/zsh/alias/git.zsh
source ~/zsh/alias/ubuntu.zsh
source ~/zsh/exports.zsh
