local utils = require 'raBeta.utils.utils'
local keymap = utils.keymap

-- stop space normal
keymap({ 'n', 'v' }, '<Space>', '<Nop>')

-- Toggles
keymap('n', '<leader>ts', function()
    vim.o.spell = not vim.o.spell
end, 'toggle [S]pell')
keymap('n', '<leader>tr', function()
    vim.o.relativenumber = not vim.o.relativenumber
end, 'toggle [R]elativenumber')
keymap('n', '<leader>tj', function()
    vim.o.cmdheight = vim.o.cmdheight == 0 and 1 or 0
    vim.o.ls = vim.o.ls == 0 and 2 or 0
end, 'toggle command [H]eight and show line')

-- Lazy
keymap('n', '<leader>ps', '<cmd>Lazy sync<cr>', 'Lazy [S]ync')
keymap('n', '<leader>pi', '<cmd>Lazy install<cr>', 'Lazy [I]nstall')
keymap('n', '<leader>pu', '<cmd>Lazy update<cr>', 'Lazy [U]update')
keymap('n', '<leader>pc', '<cmd>Lazy clean<cr>', 'Lazy [C]lean')

-- General
keymap('n', '<leader>zn', ':nohlsearch<cr>', '[N]o highlights')
keymap('n', '<leader>zp', ':lua print(unpack(vim.api.nvim_win_get_cursor(0)))<cr>', 'Cursor [P]osition')
keymap('v', '<leader>zs', [[:'<,'>!awk '{s+=$1} END {print s}'<cr>]], 'Visual [S]um')
keymap('v', '<leader>zm', [[:'<,'>!awk '{s*=$1} END {print s}'<cr>]], 'Visual [M]ultiplication')

keymap('v', '<', '<gv')
keymap('v', '>', '>gv')
keymap('v', 'p', '"_dP')
keymap('x', '<leader>p', [["_dP]])
keymap('n', '<C-d>', '<C-d>zz')
keymap('n', '<C-u>', '<C-u>zz')
keymap('n', 'n', 'nzzzv')
keymap('n', 'N', 'Nzzzv')
