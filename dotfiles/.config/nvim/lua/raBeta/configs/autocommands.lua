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

--NOTE: let treesitter use bash highlight for zsh files as well
vim.api.nvim_create_autocmd('FileType', {
    pattern = 'zsh',
    callback = function()
        require('nvim-treesitter.highlight').attach(0, 'bash')
    end,
})

--NOTE: let treesitter use javascript highlight for hbs files as well
vim.api.nvim_create_autocmd('FileType', {
    pattern = 'hbs',
    callback = function()
        require('nvim-treesitter.highlight').attach(0, 'javascript')
    end,
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

-- NOTE: enter insert mode when opening terminal
vim.api.nvim_create_autocmd('TermOpen', {
    pattern = '*',
    command = 'startinsert',
})
