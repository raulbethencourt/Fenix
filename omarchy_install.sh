#!/bin/bash

set -eu -o pipefail # fail on error and report it, debug all lines

while read -r p; do sudo pacman --noconfirm -S "$p"; done < <(
  cat <<"EOF"
  brave-browser
  cmake
  dust
  figlet
  git-delta
  jq
  lynx
  shfmt
  sxiv
  tmux
  vlc
  vlc-plugin-ffmpeg
  vlc-plugin-x264
  vlc-plugin-x265
  vlc-cli
  yt-dlp
  zathura
  zsh
  tree
  transmission-gtk
EOF
)

# make zsh shell
chsh -s $(which zsh)

# zap !!!
zsh <(curl -s https:/raw.githubusercontent.com/zap-zsh/zap/master/install.zsh) --branch release-v1

omarchy-theme-install https://github.com/JaxonWright/omarchy-midnight-theme.git

# Omarchy manual development installation
#  php
#  go
#  rust

# Omarchy manual AUR installation
#  ccze
#  clipse
