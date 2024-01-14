M = {}

vim.g.mapleader = ' '
vim.g.maplocalleader = ' '

local keymap = function(mode, keys, func, desc)
  if desc then
    desc = desc
  end

  vim.keymap.set(mode, keys, func, { noremap = true, silent = true, desc = desc })
end

-- stop space normal
keymap({ 'n', 'v' }, '<Space>', '<Nop>')

-- toogle lualine
local hidden_all = 0
function Toggle_Hidden_All()
  if hidden_all == 0 then
    hidden_all = 1
    vim.cmd 'set ls=0'
  else
    hidden_all = 0
    vim.cmd 'set ls=2'
  end
end

keymap('n', '<F11>', '<cmd>lua Toggle_Hidden_All()<CR>', '[T]oggle [H]idde [S]tatusline')

-- TAB in general mode will move to text buffer
keymap('n', '<TAB>', '<cmd>bnext<CR>', '[B]next')
keymap('n', '<S-TAB>', '<cmd>bprev<CR>', '[B]prev')

-- Truble
keymap("n", "<leader>xx", function() require("trouble").toggle() end, '[T]rouble')
keymap("n", "<leader>xw", function() require("trouble").toggle("workspace_diagnostics") end, '[W]orkspace [D]iagnostics')
keymap("n", "<leader>xd", function() require("trouble").toggle("document_diagnostics") end, '[D]ocument [D]iagnostics')
keymap("n", "<leader>xq", function() require("trouble").toggle("quickfix") end, '[Q]uickfix')
keymap("n", "<leader>xl", function() require("trouble").toggle("loclist") end, '[L]oclist')
keymap("n", "gR", function() require("trouble").toggle("lsp_references") end, '[L]sp [R]eferences')

-- GenNvim
keymap('v', '<leader>g', ':Gen<CR>')
keymap('n', '<leader>g', ':Gen<CR>')

-- UndoTree
keymap('n', '<leader>u', '<cmd>UndotreeToggle<CR>', '[T]oggle [U]ndoTree')

-- Gnereral
keymap('v', '<leader>/', '<Plug>(comment_toggle_linewise_visual)', '[C]omments')
keymap('n', '<leader>/', '<Plug>(comment_toggle_linewise_current)', '[C]omments')
keymap('n', '<leader>e', '<cmd>Explore<CR>', '[E]xplore')
keymap('n', '<leader>c', '<cmd>bdelete<CR>', '[C]lose [B]uffer')
keymap('n', '<leader>v', '<cmd>vsplit<CR>', '[V]split')
keymap('n', '<leader>h', '<cmd>split<CR>', '[S]plit')
keymap('n', '<leader>w', '<cmd>w<CR>', '[S]ave')
keymap('n', '<leader>q', '<cmd>q<CR>', '[Q]uit')
keymap('n', '<leader>i', '<C-w>|', '[M]aximize')
keymap('n', '<leader>o', '<C-w>=', '[E]quilify')

-- Lazy
keymap('n', '<leader>ps', '<cmd>Lazy sync<CR>')
keymap('n', '<leader>pi', '<cmd>Lazy install<CR>')
keymap('n', '<leader>pu', '<cmd>Lazy update<CR>')
keymap('n', '<leader>pc', '<cmd>Lazy clean<CR>')

-- Rest
keymap('n', '<leader>rh', '<Plug>RestNvim<CR>', '[R]est [N]vim')
keymap('n', '<leader>rp', '<Plug>RestNvimPreview<CR>', '[R]est [N]vim [P]review')
keymap('n', '<leader>rl', '<Plug>RestNvimLast<CR>', '[R]est [N]vim [L]ast')

-- Dbui
keymap('n', '<leader>zt', '<cmd>DBUIToggle<CR>')
keymap('n', '<leader>zc', '<cmd>DBUIClose<CR>')
keymap('n', '<leader>zh', '<cmd>DBUILastQueryInfo<CR>')

keymap('n', '<C-Up>', ':resize +2<CR>')
keymap('n', '<C-Down>', ':resize -2<CR>')
keymap('n', '<C-Left>', ':vertical resize +2<CR>')
keymap('n', '<C-Right>', ':vertical resize -2<CR>')

keymap('v', '<', '<gv')
keymap('v', '>', '>gv')
keymap('i', '<A-j>', '<Esc>:m .+1<CR>==gi')
keymap('i', '<A-k>', '<Esc>:m .-2<CR>==gi')
keymap('v', '<A-j>', ":m '>+1<CR>gv-gv")
keymap('v', '<A-k>', ":m '<-2<CR>gv-gv")
keymap('v', 'p', '"_dP')
keymap('x', '<leader>p', [["_dP]])
keymap('n', '<C-d>', '<C-d>zz')
keymap('n', '<C-u>', '<C-u>zz')
keymap('n', 'n', 'nzzzv')
keymap('n', 'N', 'Nzzzv')

-- Documentations
M.show_documentation = function()
  local filetype = vim.bo.filetype
  if vim.tbl_contains({ 'vim', 'help' }, filetype) then
    vim.cmd('h ' .. vim.fn.expand '<cword>')
  elseif vim.tbl_contains({ 'man' }, filetype) then
    vim.cmd('Man ' .. vim.fn.expand '<cword>')
  elseif vim.fn.expand '%:t' == 'Cargo.toml' then
    require('crates').show_popup()
  else
    vim.lsp.buf.hover()
  end
end
keymap('n', 'K', ":lua require('raBeta.keymaps').show_documentation()<CR>")

return M
