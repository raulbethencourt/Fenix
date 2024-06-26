#!/usr/bin/sh

# nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install stable

# Recover config from Fenix repo
git clone https://github.com/raulbethencourt/Fenix.git
cp -fr "$HOME"/Fenix/dotfiles/* "$HOME"/
cp -fr "$HOME"/Fenix/dotfiles/.config/* "$HOME"/.config/

# Dragon
git clone https://github.com/mwh/dragon.git "$HOME"/git_apps/dragon
cd "$HOME"/git_apps/dragon
make install
cd

# sxiv
git clone https://github.com/xyb3rt/sxiv.git "$HOME"/git_apps/sxiv
cd "$HOME"/git_apps/sxiv
make install
cd

# eza
cargo install eza
