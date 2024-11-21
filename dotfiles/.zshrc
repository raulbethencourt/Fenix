# ZAP !!!
[ -f "$HOME/.local/share/zap/zap.zsh" ] && source "$HOME/.local/share/zap/zap.zsh"

# History
HISTFILE=~/.zsh_history

autoload -Uz compinit
compinit

# Zap plugins
plug "zap-zsh/supercharge"
export VI_MODE_ESC_INSERT="jk" && plug "rabeta/vim"
plug "zsh-users/zsh-syntax-highlighting"
plug "zap-zsh/exa"
plug "zsh-users/zsh-autosuggestions"

# Aliases
source ~/zsh/exports.zsh
source ~/zsh/keymaps.zsh
source ~/zsh/options.zsh
source ~/zsh/alias/general.zsh
source ~/zsh/alias/git.zsh
source ~/zsh/alias/ubuntu.zsh
source ~/zsh/alias/docker.zsh
