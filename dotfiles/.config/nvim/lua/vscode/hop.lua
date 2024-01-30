-- NOTE: These mappings are used by the Hop plugin in vscode
require'hop'.setup()

vim.api.nvim_set_keymap("n", "s", "<cmd>HopChar2<cr>", { silent = true })
vim.api.nvim_set_keymap("n", "S", "<cmd>HopWord<cr>", { silent = true })
vim.api.nvim_set_keymap("v", "s", "<cmd>HopChar2<cr>", { silent = true })
vim.api.nvim_set_keymap("v", "S", "<cmd>HopWord<cr>", { silent = true })
