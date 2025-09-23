#!/usr/bin/env bash

# Add unstable channel
sudo nix-channel --add https://nixos.org/channels/nixpkgs-unstable unstable
sudo nix-channel --update

while read -r p; do sudo nix-env -iA unstable.$p; done < <(
  cat <<"EOF"
  tmux
  fzf
  eza
  delta
  bat
  xdragon
  sxiv
  ccze
  ripgrep
  fd
  dust
  lynx
  yt-dlp
  autotiling
EOF
)

# bat
mkdir -p ~/.local/bin
ln -s /usr/bin/batcat ~/.local/bin/bat

nvm install --lts

# MANUAL INSTALLATION
## docker
## devilbox

## keepass
#sudo add-apt-repository ppa:ubuntuhandbook1/keepass2
#sudo apt update
#sudo apt install keepass2 mono-complete xdotool
# Installer plugin https://github.com/kee-org/keepassrpc/releases into /usr/lib/keepass2/Plugins/

echo "Finish nix packeges install and copying your config, reboot your system to persiste changes..."
