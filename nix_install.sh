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

# bat
mkdir -p ~/.local/bin
ln -s /usr/bin/batcat ~/.local/bin/bat

echo "Finish nix packeges install, reboot your system to persiste changes..."
