local harpoon = require 'harpoon'

harpoon:setup {
    settings = {
        save_on_toggle = fals,
        sync_on_ui_close = false,
        key = function()
            return vim.loop.cwd()
        end,
    },
}

vim.keymap.set('n', '<leader>fs', function()
    harpoon:list():append()
end, { desc = 'Add file' })
vim.keymap.set('n', '<leader>fd', function()
    harpoon.ui:toggle_quick_menu(harpoon:list())
end, { desc = 'Menu' })

vim.keymap.set('n', '<leader>fj', function()
    harpoon:list():select(1)
end, { desc = 'File 1' })
vim.keymap.set('n', '<leader>fk', function()
    harpoon:list():select(2)
end, { desc = 'File 2' })
vim.keymap.set('n', '<leader>fl', function()
    harpoon:list():select(3)
end, { desc = 'File 3' })
vim.keymap.set('n', '<leader>fm', function()
    harpoon:list():select(4)
end, { desc = 'File 4' })

vim.keymap.set('n', '<leader>fp', function()
    harpoon:list():prev()
end)
vim.keymap.set('n', '<leader>fn', function()
    harpoon:list():next()
end)
