#!/usr/bin/bash

# pre packeg install
echo 'deb [trusted=yes] https://apt.fury.io/ascii-image-converter/ /' | sudo tee /etc/apt/sources.list.d/ascii-image-converter.list

# keepass2 package
sudo add-apt-repository ppa:ubuntuhandbook1/keepass2

# github cli
type -p curl >/dev/null || (sudo apt update && sudo apt install curl -y)
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg &&
  sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg &&
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null

# alacritty
sudo add-apt-repository ppa:aslatter/ppa -y

# brave-browser
sudo curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" | sudo tee /etc/apt/sources.list.d/brave-browser-release.list

# vivaldi
wget -O- https://repo.vivaldi.com/archive/linux_signing_key.pub | sudo gpg --dearmor | sudo tee /usr/share/keyrings/vivaldi.gpg
echo deb [arch=amd64 signed-by=/usr/share/keyrings/vivaldi.gpg] https://repo.vivaldi.com/archive/deb/ stable main | sudo tee /etc/apt/sources.list.d/vivaldi.list

# neovim
sudo add-apt-repository ppa:neovim-ppa/unstable -y

# keevault
sudo add-apt-repository ppa:dlech/keepass2-plugins

set -eu -o pipefail # fail on error and report it, debug all lines

sudo -n true
[ $? -eq 0 ] || exit 1 "you should have sudo privilege to run this script"

sudo apt install nala

sudo nala update

echo installing the must-have pre-requisites
while read -r p; do sudo nala install -y $p; done < <(
  cat <<"EOF"
	wget 
	make
	gnupg2 
	ubuntu-keyring
	alacritty
	zsh
	curl
	tmux
	brave-browser
	vivaldi-stable
	wget
	ffmpeg
	vim
	neovim
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
	libimlib2-dev
	libxft-dev
	keepass2
	gnome-tweaks
	tig
	xorg 
	btop
	openbox
	freetype2-doc
	fontconfig
	libgif-dev
	libexif-gtk5
	eza
	golang-go
	keepass2-plugin-rpc
EOF
)

echo installing the nice-to-have pre-requisites
echo you have 5 seconds to proceed ...
echo or
echo hit Ctrl+C to quit
echo -e "\n"
sleep 6

# make zsh shell
chsh -s $(which zsh)

# zap !!!
zsh <(curl -s https://raw.githubusercontent.com/zap-zsh/zap/master/install.zsh) --branch release-v1

# rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# link fd bin
ln -s "$(which fdfind)" ~/.local/bin/fd

# bat
mkdir -p ~/.local/bin
ln -s /usr/bin/batcat ~/.local/bin/bat

echo "Finish first install, reboot your system to persiste changes..."
