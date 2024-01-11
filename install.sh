#!/usr/bin/bash

# pre packeg install
echo 'deb [trusted=yes] https://apt.fury.io/ascii-image-converter/ /' | sudo tee /etc/apt/sources.list.d/ascii-image-converter.list

# keepass2 package
sudo add-apt-repository ppa:ubuntuhandbook1/keepass2

# github cli
type -p curl >/dev/null || (sudo apt update && sudo apt install curl -y)
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
&& sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \

# alacritty
sudo add-apt-repository ppa:aslatter/ppa -y

set -eu -o pipefail # fail on error and report it, debug all lines

sudo -n true
test $? -eq 0 || exit 1 "you should have sudo privilege to run this script"

sudo apt update -y

echo installing the must-have pre-requisites
while read -r p; do sudo apt install -y $p; done < <(
	cat <<"EOF"
	nala
	alacritty
    curl
	tmux
    wget
    ffmpeg
	gh
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
    gimp
	keepass2
	gnome-tweaks
	tig
EOF
)

echo installing the nice-to-have pre-requisites
echo you have 5 seconds to proceed ...
echo or
echo hit Ctrl+C to quit
echo -e "\n"
sleep 6

# Recover config from Fenix repo
gh repo clone raulbethencourt/Fenix
cp -fr "$HOME"/Fenix/dotfiles/* "$HOME"/
cp -fr "$HOME"/Fenix/dotfiles/.config/* "$HOME"/.config/

# Dragon
gh repo clone mwh/dragon "$HOME"/git_apps/dragon
cd "$HOME"/git_apps/dragon
make install
cd

# sxiv
gh repo clone xyb3rt/sxiv "$HOME"/git_apps/sxiv
cd "$HOME"/git_apps/sxiv
make install
cd

# link fd bin
ln -s "$(which fdfind)" ~/.local/bin/fd

