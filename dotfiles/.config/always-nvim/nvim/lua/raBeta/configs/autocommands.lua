-- NOTE: hidde lualine
vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWinEnter' }, {
    pattern = { '*' },
    command = 'set ls=0',
})
--NOTE:  hidde vim tabline
vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWinEnter' }, {
    pattern = { '*' },
    command = 'set showtabline=0 ',
})
-- NOTE: enable wrap mode for json files only
vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWinEnter' }, {
    pattern = { '*' },
    command = 'set fcs=eob:\\ ',
})
-- NOTE: Highlight on yank
local highlight_group = vim.api.nvim_create_augroup('YankHighlight', { clear = true })
vim.api.nvim_create_autocmd('TextYankPost', {
    callback = function()
        vim.highlight.on_yank()
    end,
    group = highlight_group,
    pattern = '*',
})
