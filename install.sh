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

# eza
sudo mkdir -p /etc/apt/keyrings
wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | sudo gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | sudo tee /etc/apt/sources.list.d/gierens.list
sudo chmod 644 /etc/apt/keyrings/gierens.gpg /etc/apt/sources.list.d/gierens.list

# nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# php
LC_ALL=C.UTF-8 sudo add-apt-repository ppa:ondrej/php 

set -eu -o pipefail # fail on error and report it, debug all lines

sudo -n true
[ $? -eq 0 ] || exit 1 "you should have sudo privilege to run this script"

sudo apt install nala

sudo nala update

echo installing the must-have pre-requisites
while read -r p; do sudo nala install -y $p; done < <(
  cat <<"EOF"
	cmake 
	libfreetype6-dev 
	libexif-dev
	libfontconfig1-dev 
	xclip
	wget 
	make
	gnupg2 
	ubuntu-keyring
	alacritty
	zsh
	gpg
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
	python3-pip
	python3.10-venv
	ruby-full
	luarocks
	software-properties-common 
	ca-certificates 
	lsb-release 
	apt-transport-https 
	php 
	php-cli 
	unzip
	libapache2-mod-php 
	php-mysql
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
zsh <(curl -s https:/raw.githubusercontent.com/zap-zsh/zap/master/install.zsh) --branch release-v1

# rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# bat
mkdir -p ~/.local/bin
ln -s /usr/bin/batcat ~/.local/bin/bat

# link fd bin
ln -s "$(which fdfind)" ~/.local/bin/fd

# composer
cd ~
curl -sS https://getcomposer.org/installer -o /tmp/composer-setup.php
HASH=$(curl -sS https://composer.github.io/installer.sig)
php -r "if (hash_file('SHA384', '/tmp/composer-setup.php') === '$HASH') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
sudo php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer

# delta
curl https://github.com/dandavison/delta/releases/download/0.16.5/git-delta-musl_0.16.5_amd64.deb -o delta_amb64.deb -s
sudo dpkg -i delta_amb64.deb

# lazygit
LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
tar xf lazygit.tar.gz lazygit
sudo install lazygit /usr/local/bin

# install configs
cp -r Fenix/dotfiles/* "$HOME"/

echo "Finish first install, reboot your system to persiste changes..."
