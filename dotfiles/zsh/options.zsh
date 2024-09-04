# active menue key to <>
xmodmap -e "keycode 135 shift = less greater"

# Basic auto/tab complete:
autoload -U compinit
zstyle ':completion:*' menu select
zmodload zsh/complist
compinit
_comp_options+=(globdots) # Include hidden files.

setopt autolist globdots extendedglob
unsetopt automenu autoremoveslash listambiguous menucomplete

