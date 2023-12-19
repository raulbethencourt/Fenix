require 'raBeta.settings'
require 'raBeta.autocommands'
require 'raBeta.keymaps'

local lazypath = vim.fn.stdpath 'data' .. '/lazy/lazy.nvim'
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system {
    'git',
    'clone',
    '--filter=blob:none',
    'https://github.com/folke/lazy.nvim.git',
    '--branch=stable', -- latest stable release
    lazypath,
  }
end
vim.opt.rtp:prepend(lazypath)

require('lazy').setup({
  { import = 'raBeta.plugins' },
}, {})

require 'raBeta.configs.lsp'
require 'raBeta.configs.telescope'
require 'raBeta.configs.treesitter'
require 'raBeta.configs.harpoon'
require 'raBeta.configs.inlay-hints'
require 'raBeta.configs.dbui'
