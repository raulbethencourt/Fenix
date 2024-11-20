#!/usr/bin/env sh

# nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install stable

# Recover config from Fenix repo
cp -fr "$HOME"/Fenix/dotfiles/. "$HOME"/

# MANUAL INSTALLATION
## docker
## devilbox
## keepass
## steam
