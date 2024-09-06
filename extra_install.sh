#!/usr/bin/env sh

# nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install stable

# Recover config from Fenix repo
git clone https://github.com/raulbethencourt/Fenix.git
cp -fr "$HOME"/Fenix/dotfiles/* "$HOME"/
cp -fr "$HOME"/Fenix/dotfiles/.config/* "$HOME"/.config/

# MANUAL INSTALLATION
## docker
## devilbox
