#!/usr/bin/bash

# pre packeg install
echo 'deb [trusted=yes] https://apt.fury.io/ascii-image-converter/ /' | sudo tee /etc/apt/sources.list.d/ascii-image-converter.list

# keepass2 package
sudo add-apt-repository ppa:ubuntuhandbook1/keepass2

set -eu -o pipefail # fail on error and report it, debug all lines

sudo -n true
test $? -eq 0 || exit 1 "you should have sudo privilege to run this script"

sudo apt update -y

echo installing the must-have pre-requisites
while read -r p; do sudo apt install -y $p; done < <(
	cat <<"EOF"
    curl
    wget
    ffmpeg
    code
    vlc
    filezilla
    steam
    neofetch
	bat
	duf
	fzf
	zoxide
	ripgrep
    fd-find
    exa 
    zathura
    ascii-image-converter
    gim
	keepass2
	tweaks
EOF
)

echo installing the nice-to-have pre-requisites
echo you have 5 seconds to proceed ...
echo or
echo hit Ctrl+C to quit
echo -e "\n"
sleep 6

sudo apt install -y tig

# link fd bin
ln -s "$(which fdfind)" ~/.local/bin/fd

cp -fr "$HOME"/Fenix/dotfiles/* "$HOME"/
cp -fr "$HOME"/Fenix/dotfiles/.config/* "$HOME"/.config/

