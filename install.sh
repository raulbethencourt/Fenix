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

# visual codecs
sudo apt-get install ubuntu-restricted-extras -y

set -eu -o pipefail # fail on error and report it, debug all lines


[ "$(sudo -n true)" -eq 0 ] || {
  echo "you should have sudo privilege to run this script"
  exit 1 
}

while read -r p; do sudo apt install -y "$p"; done < <(
  cat <<"EOF"
  alacritty
  ascii-image-converter
  brave-browser
  btop
  ca-certificates 
  calibre
  clang
  cmake 
  copyq
  ffmpeg
  figlet
  flameshot
  fontconfig
  freetype2-doc
  gimp
  gnome-tweaks
  gnupg2 
  golang-go
  gpg
  imagemagick
  jq
  libapache2-mod-php 
  libexif-dev
  libexif-gtk5
  libfontconfig1-dev 
  libfreetype6-dev 
  libgif-dev
  libgraphicsmagick1-dev
  libimlib2-dev
  libmagickwand-dev
  libreoffice
  libxft-dev
  libxml2-utils
  lsb-release 
  luajit
  luarocks
  make
  openbox
  php 
  php-cli 
  php-mysql
  python3-pip
  ruby-full
  software-properties-common 
  tig
  tldr
  ubuntu-keyring
  unzip
  vim
  vlc
  xclip
  xorg 
  zathura
  zoxide
  zsh
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

# starship
curl -sS https://starship.rs/install.sh | sh

while read -r p; do sudo snap install $p; done < <(
  cat <<"EOF"
  postman
  steam
EOF
)
sudo snap install obsidian --classic

# nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Install nix packages
sh <(curl -L https://nixos.org/nix/install) --daemon

echo "Finish first install, reboot your system to persiste changes..."
