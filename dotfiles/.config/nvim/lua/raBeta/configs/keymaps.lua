M = {}

local keymap = function(mode, keys, func, desc)
  if desc then
    desc = desc
  end

  vim.keymap.set(mode, keys, func, { noremap = true, silent = true, desc = desc })
end

-- NOTE: stop space normal
keymap({ 'n', 'v' }, '<Space>', '<Nop>')

-- NOTE: toogle lualine
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

-- NOTE: TAB in general mode will move to text buffer
keymap('n', '<TAB>', '<cmd>bnext<CR>', '[B]next')
keymap('n', '<S-TAB>', '<cmd>bprev<CR>', '[B]prev')

-- NOTE: MarkDownPreview
keymap('n', '<leader>m', '<cmd>MarkdownPreviewToggle<CR>', '[M]arkdown [P]review [T]oggle')

-- NOTE: UndoTree
keymap('n', '<leader>u', '<cmd>UndotreeToggle<CR>', '[T]oggle [U]ndoTree')

-- NOTE: Lazy
keymap('n', '<leader>ps', '<cmd>Lazy sync<CR>')
keymap('n', '<leader>pi', '<cmd>Lazy install<CR>')
keymap('n', '<leader>pu', '<cmd>Lazy update<CR>')
keymap('n', '<leader>pc', '<cmd>Lazy clean<CR>')

-- NOTE: Dbui
keymap('n', '<leader>zt', '<cmd>DBUIToggle<CR>')
keymap('n', '<leader>zc', '<cmd>DBUIClose<CR>')
keymap('n', '<leader>zh', '<cmd>DBUILastQueryInfo<CR>')

-- NOTE: Gnereral
keymap('v', '<leader>/', '<Plug>(comment_toggle_linewise_visual)', '[C]omments')
keymap('n', '<leader>/', '<Plug>(comment_toggle_linewise_current)', '[C]omments')
keymap('n', '<leader>e', '<cmd>Explore<CR>', '[E]xplore')
keymap('n', '<leader>c', '<cmd>bdelete<CR>', '[C]lose [B]uffer')
keymap('n', '<leader>v', '<cmd>vsplit<CR>', '[V]split')
keymap('n', '<leader>h', '<cmd>split<CR>', '[S]plit')
keymap('n', '<leader>i', '<C-w>|', '[M]aximize')
keymap('n', '<leader>o', '<C-w>=', '[E]quilify')
keymap('n', '<leader>n', ':nohlsearch<CR>', '[N]o highlights')

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

-- NOTE: Documentations
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
keymap('n', 'K', ":lua require('raBeta.configs.keymaps').show_documentation()<CR>")

return M
