---@diagnostic disable-next-line: param-type-mismatch
vim.keymap.set('n', 's', function()
    require('flash').jump()
end, { silent = true })
