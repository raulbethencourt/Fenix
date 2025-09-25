# ZAP !!!
# shellcheck disable=SC1094
[ -f "$HOME/.local/share/zap/zap.zsh" ] && source "$HOME/.local/share/zap/zap.zsh"

# History
HISTFILE=~/.zsh_history

autoload -Uz compinit
compinit

# Zap plugins
plug "zap-zsh/supercharge"
export VI_MODE_ESC_INSERT="jk" && plug "raul-bns/vim"
plug "zsh-users/zsh-syntax-highlighting"
plug "zap-zsh/exa"
plug "zsh-users/zsh-autosuggestions"

# Aliases
source /home/rabeta/zsh/exports.zsh
source /home/rabeta/zsh/keymaps.zsh
source /home/rabeta/zsh/options.zsh
source /home/rabeta/zsh/alias/general.zsh
# shellcheck disable=SC1094
source /home/rabeta/zsh/alias/git.zsh
source /home/rabeta/zsh/alias/ubuntu.zsh
source /home/rabeta/zsh/alias/docker.zsh
# shellcheck disable=SC1091
[ -f /home/rabeta/zsh/extras.zsh ] && source /home/rabeta/zsh/extras.zsh
