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
  unrar
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

# Nicest omarchy theme
omarchy-theme-install https://github.com/JaxonWright/omarchy-midnight-theme.git

# Install my nvim config
mv $HOME/.config/nvim{,.bak}
gh repo clone raulbethencourt/nvim $HOME/.config/nvim

# Tools
gh repo clone raulbethencourt/tools $HOME/tools

# Vaults
gh repo clone raulbethencourt/vaults $HOME/vaults

[ ! -d $HOME/Fenix ] && echo "Fenix directory not found it in proper location." && exit 1

# Install rest of my config
cp -rf $HOME/Fenix/dotfiles/zsh $HOME/zsh
cp -f $HOME/Fenix/dotfiles/.zshrc $HOME/.zshrc
cp -f $HOME/Fenix/dotfiles/.tmux.conf $HOME/.tmux.conf
cp -f $HOME/Fenix/dotfiles/lynx.lss $HOME/lynx.lss
cp -f $HOME/Fenix/dotfiles/.lynxrc $HOME/.lynxrc
cp -f $HOME/Fenix/dotfiles/.gitconfig $HOME/.gitconfig
cp -f $HOME/Fenix/dotfiles/.bashrc $HOME/.bashrc
cp -rf $HOME/Fenix/dotfiles/.config/. $HOME/.config/
cp -rf $HOME/Fenix/dotfiles/devilbox $HOME/devilbox
cp -rf $HOME/Fenix/dotfiles/.fonts/* $HOME/.local/share/fonts/

# Omarchy manual development installation
#  php
#  go
#  rust

# Omarchy manual AUR installation
#  ccze
#  clipse
#  teams-for-linux
