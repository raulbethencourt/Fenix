#!/usr/bin/bash

export INSTALL_PREFIX="/tmp/lazy-lvim"
export LUNARVIM_BASE_DIR="$INSTALL_PREFIX/base"
export LUNARVIM_RUNTIME_DIR="$INSTALL_PREFIX/data"
export LUNARVIM_CONFIG_DIR="$INSTALL_PREFIX/conf"
export LUNARVIM_CACHE_DIR="$INSTALL_PREFIX/cache"

installer_url="https://raw.githubusercontent.com/LunarVim/LunarVim/refactor/lazy/utils/installer/install.sh"

export LV_BRANCH="refactor/lazy"
export LV_REMOTE="LunarVim/lunarvim.git"

installer="$(mktemp)"

curl -LSs "$installer_url" -o "$installer" && bash "$installer" --no-install-dependencies
