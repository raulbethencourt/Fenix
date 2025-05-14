# Basic auto/tab complete:
autoload -U compinit
zstyle ':completion:*' menu select
zmodload zsh/complist
compinit
_comp_options+=(globdots) # Include hidden files.

setopt autolist globdots extendedglob
unsetopt automenu autoremoveslash listambiguous menucomplete

