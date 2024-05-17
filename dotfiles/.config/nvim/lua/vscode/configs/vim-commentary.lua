vim.keymap.set({ 'n', 'v' }, '<space>/', function()
    if vim.api.nvim_get_mode().mode == 'n' then
        vim.cmd 'execute "Commentary"'
    else
        vim.cmd 'execute "\'<,\'>Commentary"'
    end
end, { silent = true })
