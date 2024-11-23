#!/usr/bin/env bash

# Add unstable channel
nix-channel --add https://nixos.org/channels/nixpkgs-unstable unstable
nix-channel --update

###### tmux
nix-env -iA unstable.tmux
###### fzf
nix-env -iA unstable.fzf
###### dbeaver
nix-env -iA unstable.dbeaver-bin
###### neovim 
nix-env -iA unstable.neovim
###### eza 
nix-env -iA unstable.eza
###### delta 
nix-env -iA unstable.delta
###### bat 
nix-env -iA unstable.bat
###### xdragon 
nix-env -iA unstable.xdragon
###### sxiv 
nix-env -iA unstable.sxiv
###### ccze 
nix-env -iA unstable.ccze
###### ripgrep 
nix-env -iA unstable.ripgrep
###### fd 
nix-env -iA unstable.fd
###### dust 
nix-env -iA unstable.dust

# bat
mkdir -p ~/.local/bin
ln -s /usr/bin/batcat ~/.local/bin/bat

# Recover config from Fenix repo
cp -fr "$HOME"/Fenix/dotfiles/. "$HOME"/
source ~/.zshrc

nvm install stable

# MANUAL INSTALLATION
## docker
## devilbox

## keepass
#sudo add-apt-repository ppa:ubuntuhandbook1/keepass2
#sudo apt update
#sudo apt install keepass2 mono-complete xdotool
# Installer plugin https://github.com/kee-org/keepassrpc/releases into /usr/lib/keepass2/Plugins/

echo "Finish nix packeges install and copying your config, reboot your system to persiste changes..."
