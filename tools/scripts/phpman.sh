#!/usr/bin/env sh

phpMan=$(
  find "$HOME/Documents/manuals/php-chunked-xhtml/" |
    fzf-tmux -p 80%,60% -i --bind=tab:up --bind=btab:down \
      --bind=ctrl-g:first
)

[ -n "$phpMan" ] && lynx $phpMan || exit 1
