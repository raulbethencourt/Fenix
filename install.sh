#!/usr/bin/env bash

sudo apt update

# git !!!!
sudo apt install -y git curl wget

## regolith
wget -qO - https://regolith-desktop.org/regolith.key |
  gpg --dearmor | sudo tee /usr/share/keyrings/regolith-archive-keyring.gpg >/dev/null
echo deb "[arch=amd64 signed-by=/usr/share/keyrings/regolith-archive-keyring.gpg] \
https://regolith-desktop.org/release-3_2-ubuntu-noble-amd64 noble main" |
  sudo tee /etc/apt/sources.list.d/regolith.list
sudo apt update
sudo apt install -y regolith-desktop regolith-session-flashback regolith-look-blackhole

# pre packeg install
echo 'deb [trusted=yes] https://apt.fury.io/ascii-image-converter/ /' | sudo tee /etc/apt/sources.list.d/ascii-image-converter.list

# alacritty
sudo add-apt-repository ppa:aslatter/ppa -y

# brave-browser
sudo curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" | sudo tee /etc/apt/sources.list.d/brave-browser-release.list

# vivaldi
wget -O- https://repo.vivaldi.com/archive/linux_signing_key.pub | sudo gpg --dearmor | sudo tee /usr/share/keyrings/vivaldi.gpg
echo deb [arch=amd64 signed-by=/usr/share/keyrings/vivaldi.gpg] https://repo.vivaldi.com/archive/deb/ stable main | sudo tee /etc/apt/sources.list.d/vivaldi.list

# youtube-dl
sudo curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
sudo chmod a+rx /usr/local/bin/youtube-dl

# php
LC_ALL=C.UTF-8 sudo add-apt-repository ppa:ondrej/php -y

# copyq
sudo apt install software-properties-common apt-transport-https -y
sudo add-apt-repository ppa:hluk/copyq -y

set -eu -o pipefail # fail on error and report it, debug all lines

sudo -n true
[ $? -eq 0 ] || exit 1 "you should have sudo privilege to run this script"

echo installing the must-have pre-requisites
while read -r p; do sudo apt install -y $p; done < <(
  cat <<"EOF"
  calibre
	cmake 
  nala
	libfreetype6-dev 
	libexif-dev
	libfontconfig1-dev 
	xclip
  tldr
  jq
	make
	gnupg2 
	flameshot
	ubuntu-keyring
	alacritty
	copyq
	zsh
	gpg
	brave-browser
	vivaldi-stable
	ffmpeg
	vim
	vlc
	filezilla
	zoxide
	zathura
	ascii-image-converter
	gimp
	libimlib2-dev
	libxft-dev
	gnome-tweaks
	tig
	xorg 
	btop
	openbox
	freetype2-doc
	fontconfig
	libgif-dev
	libexif-gtk5
	golang-go
	python3-pip
	ruby-full
	luarocks
	software-properties-common 
	ca-certificates 
	lsb-release 
	php 
	php-cli 
	unzip
	libapache2-mod-php 
	php-mysql
EOF
)

# make zsh shell
chsh -s $(which zsh)

# zap !!!
zsh <(curl -s https:/raw.githubusercontent.com/zap-zsh/zap/master/install.zsh) --branch release-v1

# rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# composer
cd ~
curl -sS https://getcomposer.org/installer -o /tmp/composer-setup.php
HASH=$(curl -sS https://composer.github.io/installer.sig)
php -r "if (hash_file('SHA384', '/tmp/composer-setup.php') === '$HASH') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
sudo php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer

# symfony
wget https://get.symfony.com/cli/installer -O - | bash

# postman
sudo snap install postman

# nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Install nix packages
sh <(curl -L https://nixos.org/nix/install) --daemon

echo "Finish first install, reboot your system to persiste changes..."
