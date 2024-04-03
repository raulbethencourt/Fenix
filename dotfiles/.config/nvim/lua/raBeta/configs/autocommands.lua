vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWinEnter' }, {
    pattern = { '*' },
    -- hidde lualine
    command = 'set ls=0',
})

vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWinEnter' }, {
    pattern = { '*' },
    -- hidde vim tabline
    command = 'set showtabline=0 ',
})

vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWinEnter' }, {
    pattern = { '*' },
    -- enable wrap mode for json files only
    command = 'set fcs=eob:\\ ',
})

vim.api.nvim_create_autocmd('FileType', {
    pattern = 'zsh',
    callback = function()
        -- let treesitter use bash highlight for zsh files as well
        require('nvim-treesitter.highlight').attach(0, 'bash')
    end,
})

vim.api.nvim_create_autocmd('FileType', {
    pattern = 'hbs',
    callback = function()
        -- let treesitter use bash highlight for zsh files as well
        require('nvim-treesitter.highlight').attach(0, 'javascript')
    end,
})

-- Highlight on yank
local highlight_group = vim.api.nvim_create_augroup('YankHighlight', { clear = true })
vim.api.nvim_create_autocmd('TextYankPost', {
    callback = function()
        vim.highlight.on_yank()
    end,
    group = highlight_group,
    pattern = '*',
})
