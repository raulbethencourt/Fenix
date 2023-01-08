M = {}
-- keymappings [view all the defaults by pressing <leader>Lk]
lvim.leader = "space"

-- Toogle neovide fullscreen
function Neovide_fullscreen()
    if vim.g.neovide_fullscreen == true then
        vim.g.neovide_fullscreen = false
    else
        vim.g.neovide_fullscreen = true
    end
end
lvim.keys.normal_mode["<F11>"] = "<cmd>lua Neovide_fullscreen()<CR>"

local opts = { noremap = true, silent = true }
local keymap = vim.keymap.set

-- TAB in general mode will move to text buffer
lvim.keys.normal_mode["<TAB>"] = "<cmd>bnext<CR>"
-- SHIFT-TAB will go back
lvim.keys.normal_mode["<S-TAB>"] = "<cmd>bprev<CR>"
lvim.keys.normal_mode["<S-TAB>"] = "<cmd>bprev<CR>"

-- Normal --
-- Better window navigation
keymap("n", "<m-h>", "<C-w>h", opts)
keymap("n", "<m-j>", "<C-w>j", opts)
keymap("n", "<m-k>", "<C-w>k", opts)
keymap("n", "<m-l>", "<C-w>l", opts)

function _G.set_terminal_keymaps()
    vim.api.nvim_buf_set_keymap(0, "t", "<m-h>", [[<C-\><C-n><C-W>h]], opts)
    vim.api.nvim_buf_set_keymap(0, "t", "<m-j>", [[<C-\><C-n><C-W>j]], opts)
    vim.api.nvim_buf_set_keymap(0, "t", "<m-k>", [[<C-\><C-n><C-W>k]], opts)
    vim.api.nvim_buf_set_keymap(0, "t", "<m-l>", [[<C-\><C-n><C-W>l]], opts)
end

vim.cmd "autocmd! TermOpen term://* lua set_terminal_keymaps()"

keymap("n", "<C-d>", "<C-d>zz")
keymap("n", "<C-u>", "<C-u>zz")
keymap("n", "n", "nzzzv")
keymap("n", "N", "Nzzzv")

keymap("n", "<c-j>", "<c-d>", opts)
keymap("n", "<c-k>", "<c-u>", opts)
keymap("n", "<c-m>", "<s-m>", opts)

M.show_documentation = function()
    local filetype = vim.bo.filetype
    if vim.tbl_contains({ "vim", "help" }, filetype) then
        vim.cmd("h " .. vim.fn.expand "<cword>")
    elseif vim.tbl_contains({ "man" }, filetype) then
        vim.cmd("Man " .. vim.fn.expand "<cword>")
    elseif vim.fn.expand "%:t" == "Cargo.toml" then
        require("crates").show_popup()
    else
        vim.lsp.buf.hover()
    end
end
vim.api.nvim_set_keymap("n", "K", ":lua require('user.keymaps').show_documentation()<CR>", opts)

return M
