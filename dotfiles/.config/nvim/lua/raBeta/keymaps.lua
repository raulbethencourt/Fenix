M = {}

vim.g.mapleader = ' '
vim.g.maplocalleader = ' '

local opts = { noremap = true, silent = true }
local keymap = vim.keymap.set

keymap({ 'n', 'v' }, '<Space>', '<Nop>', { silent = true })

-- toogle lualine
local hidden_all = 0
function Toggle_Hidden_All()
	if hidden_all == 0 then
		hidden_all = 1
		vim.cmd("set ls=0")
	else
		hidden_all = 0
		vim.cmd("set ls=2")
	end
end

keymap("n", "<F11>", "<cmd>lua Toggle_Hidden_All()<CR>", opts)

-- TAB in general mode will move to text buffer
keymap("n", "<TAB>", "<cmd>bnext<CR>", opts)
keymap("n", "<S-TAB>", "<cmd>bprev<CR>", opts)

-- UndoTree
keymap("n", "<leader>u", "<cmd>UndotreeToggle<CR>", opts)

-- Gnereral
keymap("v", "<leader>/", "<Plug>(comment_toggle_linewise_visual)", opts)
keymap("n", "<leader>/", "<Plug>(comment_toggle_linewise_current)", opts)
keymap("n", "<leader>e", "<cmd>Explore<CR>", opts)
keymap("n", "<leader>c", "<cmd>bd!<CR>", opts)
keymap("n", "<leader>v", "<cmd>vsplit<CR>", opts)
keymap("n", "<leader>w", "<cmd>w<CR>", opts)
keymap("n", "<leader>a", ":q!<CR>", opts)

-- Lazy
keymap("n", "<leader>ps", "<cmd>Lazy sync<CR>", opts)
keymap("n", "<leader>pi", "<cmd>Lazy install<CR>", opts)
keymap("n", "<leader>pu", "<cmd>Lazy update<CR>", opts)
keymap("n", "<leader>pc", "<cmd>Lazy clean<CR>", opts)

-- Rest
keymap("n", "<leader>rh", "<Plug>RestNvim<CR>", opts)
keymap("n", "<leader>rp", "<Plug>RestNvimPreview<CR>", opts)
keymap("n", "<leader>rl", "<Plug>RestNvimLast<CR>", opts)

-- Dbui
keymap("n", "<leader>zt", "<cmd>DBUIToggle<CR>", opts)
keymap("n", "<leader>zc", "<cmd>DBUIClose<CR>", opts)
keymap("n", "<leader>zh", "<cmd>DBUILastQueryInfo<CR>", opts)

keymap("n", "<leader>y", [["+y]], opts)
keymap("n", "<leader>Y", [["+Y]], opts)
keymap("n", "<leader>d", [["_d]], opts)
keymap("n", "<C-Up>", ":resize +2<CR>", opts)
keymap("n", "<C-Down>", ":resize -2<CR>", opts)
keymap("n", "<C-Left>", ":vertical resize +2<CR>", opts)
keymap("n", "<C-Right>", ":vertical resize -2<CR>", opts)

vim.api.nvim_set_keymap("n", "<m-d>", "<cmd>RustOpenExternalDocs<Cr>", { noremap = true, silent = true })

keymap("v", "<", "<gv", opts)
keymap("v", ">", ">gv", opts)
keymap("i", "<A-j>", "<Esc>:m .+1<CR>==gi", opts)
keymap("i", "<A-k>", "<Esc>:m .-2<CR>==gi", opts)
keymap("v", "<A-j>", ":m '>+1<CR>gv-gv", opts)
keymap("v", "<A-k>", ":m '<-2<CR>gv-gv", opts)
keymap("v", "p", '"_dP', opts)
keymap("x", "<leader>p", [["_dP]], opts)
keymap("n", "<C-d>", "<C-d>zz")
keymap("n", "<C-u>", "<C-u>zz")
keymap("n", "n", "nzzzv")
keymap("n", "N", "Nzzzv")

-- Normal --
function _G.set_terminal_keymaps()
	vim.api.nvim_buf_set_keymap(0, "t", "<m-h>", [[<C-\><C-n><C-W>h]], opts)
	vim.api.nvim_buf_set_keymap(0, "t", "<m-j>", [[<C-\><C-n><C-W>j]], opts)
	vim.api.nvim_buf_set_keymap(0, "t", "<m-k>", [[<C-\><C-n><C-W>k]], opts)
	vim.api.nvim_buf_set_keymap(0, "t", "<m-l>", [[<C-\><C-n><C-W>l]], opts)
end

vim.cmd("autocmd! TermOpen term://* lua set_terminal_keymaps()")

M.show_documentation = function()
	local filetype = vim.bo.filetype
	if vim.tbl_contains({ "vim", "help" }, filetype) then
		vim.cmd("h " .. vim.fn.expand("<cword>"))
	elseif vim.tbl_contains({ "man" }, filetype) then
		vim.cmd("Man " .. vim.fn.expand("<cword>"))
	elseif vim.fn.expand("%:t") == "Cargo.toml" then
		require("crates").show_popup()
	else
		vim.lsp.buf.hover()
	end
end
vim.api.nvim_set_keymap("n", "K", ":lua require('raBeta.keymaps').show_documentation()<CR>", opts)

return M
