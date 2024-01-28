-- NOTE: need to set leader before lazy
vim.g.mapleader = ' '
vim.g.maplocalleader = ' '

-- NOTE: install lazy
local lazypath = vim.fn.stdpath 'data' .. '/lazy/lazy.nvim'
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system {
    'git',
    'clone',
    '--filter=blob:none',
    'https://github.com/folke/lazy.nvim.git',
    '--branch=stable',
    lazypath,
  }
end
vim.opt.rtp:prepend(lazypath)

-- NOTE: load plugins
require('lazy').setup({
  { import = 'raBeta.plugins' },
}, {})

-- NOTE: load configs
require 'raBeta.configs'
