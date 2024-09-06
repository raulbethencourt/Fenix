#!/usr/bin/env sh

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

## TODO: add nix packages
sh <(curl -L https://nixos.org/nix/install) --daemon
nix-channel --add https://nixos.org/channels/nixpkgs-unstable unstable
###### tmux
nix-env -iA unstable.tmux
###### fzf
nix-env -iA unstable.fzf
###### dbeaver
nix-env -iA unstable.dbeaver-bin

# MANUAL INSTALLATION
## neovim 
## docker
## devilbox
