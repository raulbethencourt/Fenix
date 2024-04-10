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

-- local toggleExplorer = function()
--     if vim.bo.filetype == 'netrw' then
--         vim.cmd ':q!'
--     else
--         vim.cmd 'Ntree'
--     end
-- end

keymap('n', '<F7>', '<cmd>lua Toggle_Hidden_All()<CR>', 'Toggle Hidde Statusline')

-- NOTE: TAB in general mode will move to text buffer
keymap('n', '<TAB>', '<cmd>bnext<CR>', 'Bnext')
keymap('n', '<S-TAB>', '<cmd>bprev<CR>', 'Bprev')

-- NOTE: Codeium
keymap('n', '<leader>c', '<cmd>Codeium Chat<CR>', '[C]odeium Chat')

-- NOTE: Gitsigns
keymap('n', '<leader>gb', '<cmd>Gitsigns blame_line<CR>', '[G]itsigns [B]lame line')
keymap('n', '<leader>gd', '<cmd>Gitsigns diffthis<CR>', '[G]itsigns [D]iff this')

-- NOTE: UndoTree
keymap('n', '<leader>u', '<cmd>UndotreeToggle<CR>', 'Toggle [U]ndoTree')

-- NOTE: Lazy
keymap('n', '<leader>ps', '<cmd>Lazy sync<CR>', 'Lazy [S]ync')
keymap('n', '<leader>pi', '<cmd>Lazy install<CR>', 'Lazy [I]nstall')
keymap('n', '<leader>pu', '<cmd>Lazy update<CR>', 'Lazy [U]update')
keymap('n', '<leader>pc', '<cmd>Lazy clean<CR>', 'Lazy [C]lean')

-- NOTE: Gnereral
keymap('n', '<leader>zb', ':bp<bar>sp<bar>bn<bar>bd<cr>', '[B]uffer delete')
keymap('n', '<leader>zf', ':lua print(vim.api.nvim_buf_get_name(0))<cr>', 'Full path')
keymap('n', '<leader>zp', ':lua print(unpack(vim.api.nvim_win_get_cursor(0)))<cr>', 'Cursor [P]osition')
keymap('n', '<leader>zi', '<C-w>|', 'Maximize')
keymap('n', '<leader>zo', '<C-w>=', 'Equilify')
keymap('n', '<leader>zn', ':nohlsearch<CR>', '[N]o highlights')

keymap('n', '<leader>v', '<cmd>vsplit<CR>', '[V]split')
keymap('n', '<leader>h', '<cmd>split<CR>', 'Split')

keymap('v', '<leader>/', '<Plug>(comment_toggle_linewise_visual)', 'Comments')
keymap('n', '<leader>/', '<Plug>(comment_toggle_linewise_current)', 'Comments')

keymap('n', '<leader>e', function()
    return vim.bo.filetype == 'netrw' and vim.cmd('q!') or vim.cmd('Lexplore %:p:h')
end, '[E]xplore')

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
