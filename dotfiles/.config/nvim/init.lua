--[[=================================================================
=====================================================================
========                                    .-----.          ========
========         .----------------------.   | === |          ========
========         |.-""""""""""""""""""-.|   |-----|          ========
========         ||                    ||   | === |          ========
========         ||      INIT.NVIM     ||   |-----|          ========
========         ||                    ||   | === |          ========
========         ||                    ||   |-----|          ========
========         ||                    ||   |:::::|          ========
========         |'-..................-'|   |____o|          ========
========         `"")----------------(""`   ___________      ========
========        /::::::::::|  |::::::::::\  \ no mouse \     ========
========       /:::========|  |==hjkl==:::\  \ required \    ========
========      '""""""""""""'  '""""""""""""'  '""""""""""'   ========
========                                                     ========
=====================================================================
=================================================================--]]

-- NOTE: need to set leader and termguicolors before lazy
vim.g.mapleader = ' '
vim.g.maplocalleader = ' '
vim.opt.termguicolors = true

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
---@diagnostic disable-next-line: undefined-field
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
end

local env_name = vim.g.vscode and 'vscode' or 'raBeta'

require('lazy').setup({
    { import = env_name .. '.plugins' },
}, {})

require(env_name .. '.configs')
