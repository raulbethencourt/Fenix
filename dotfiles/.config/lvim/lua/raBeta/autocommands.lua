-- Autocommands (https://neovim.io/doc/user/autocmd.html)
vim.api.nvim_create_autocmd("BufEnter", {
    pattern = { "*", },
    -- hidde lualine
    callback = function()
		vim.cmd("set noshowmode")
		vim.cmd("set noruler")
		vim.cmd("set laststatus=0")
		vim.cmd("set noshowcmd")
    end,
})
vim.api.nvim_create_autocmd("BufEnter", {
    pattern = { "*", },
    -- enable wrap mode for json files only
    command = "set fcs=eob:\\ ",
})
vim.api.nvim_create_autocmd("FileType", {
    pattern = "zsh",
    callback = function()
        -- let treesitter use bash highlight for zsh files as well
        require("nvim-treesitter.highlight").attach(0, "bash")
    end,
})
vim.api.nvim_create_autocmd("BufEnter", {
    pattern = { "*", },
    -- hidde vim tabline
    command = "set showtabline=0 ",
})
