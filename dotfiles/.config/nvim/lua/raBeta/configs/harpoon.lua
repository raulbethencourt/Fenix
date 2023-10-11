local mark = require("harpoon.mark")
local ui = require("harpoon.ui")

local keymap = vim.keymap.set
keymap('n', '<leader>qs', mark.add_file, { desc = 'Add file' })
keymap('n', '<leader>qd', ui.toggle_quick_menu, { desc = 'Menu' })
keymap(
    'n',
    '<leader>qj',
    function()
        ui.nav_file(1)
    end,
    { desc = 'File 1' }
)
keymap(
    'n',
    '<leader>qk',
    function()
        ui.nav_file(2)
    end,
    { desc = 'File 2' }
)
keymap(
    'n',
    '<leader>ql',
    function()
        ui.nav_file(3)
    end,
    { desc = 'File 3' }
)
keymap(
    'n',
    '<leader>qm',
    function()
        ui.nav_file(4)
    end,
    { desc = 'File 4' }
)
