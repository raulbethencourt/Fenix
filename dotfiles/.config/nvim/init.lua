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

-- NOTE: vscode nvim settings
if vim.g.vscode then
  require 'vscode.mappings_vscode'

  local cmd = {
    [[source $HOME/.config/nvim/vscode/vim_settings.vim]],
    [[source $HOME/.config/nvim/vscode/functions.vim]],
    [[source $HOME/.config/nvim/vscode/settings.vim]],
    [[nnoremap z= <Cmd>call VSCodeNotify('keyboard-quickfix.openQuickFix')<CR>]],
  }

  ---@diagnostic disable-next-line: unused-local
  for i, v in ipairs(cmd) do
    vim.cmd(v)
  end

  -- NOTE: load vscode plugins
  require('lazy').setup({
    { import = 'vscode.plugins' },
  }, {})

  require 'vscode.configs'
else
  -- NOTE: load plugins
  require('lazy').setup({
    { import = 'raBeta.plugins' },
  }, {})

  -- NOTE: load configs
  require 'raBeta.configs'
end
