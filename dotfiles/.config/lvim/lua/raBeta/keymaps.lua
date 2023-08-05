M = {}
-- keymappings [view all the defaults by pressing <leader>Lk]
lvim.leader = "space"

-- toogle lualine
local hidden_all = 0
function Toggle_Hidden_All()
	if hidden_all == 0 then
		hidden_all = 1
		vim.cmd("set noshowmode")
		vim.cmd("set noruler")
		vim.cmd("set laststatus=0")
		vim.cmd("set noshowcmd")
	else
		hidden_all = 0
		vim.cmd("set showmode")
		vim.cmd("set ruler")
		vim.cmd("set laststatus=2")
		vim.cmd("set showcmd")
	end
end
lvim.keys.normal_mode["<F11>"] = "<cmd>lua Toggle_Hidden_All()<CR>"

local opts = { noremap = true, silent = true }
local keymap = vim.keymap.set

-- TAB in general mode will move to text buffer
lvim.keys.normal_mode["<TAB>"] = "<cmd>bnext<CR>"
lvim.keys.normal_mode["<S-TAB>"] = "<cmd>bprev<CR>"
lvim.lsp.buffer_mappings.normal_mode['gr'] = nil

-- use telescop for references and definitions
lvim.keys.normal_mode["gr"] = "<cmd>Telescope lsp_references<CR>"
lvim.lsp.buffer_mappings.normal_mode['gd'] = nil
lvim.keys.normal_mode["gd"] = "<cmd>Telescope lsp_definitions<CR>"

lvim.keys.normal_mode["<leader>u"] = "<cmd>UndotreeToggle<CR>"
lvim.keys.normal_mode["<leader>v"] = "<cmd>vsplit<CR>"
lvim.keys.normal_mode["<leader>a"] = ":q!<CR>"

lvim.keys.normal_mode["<leader>y"] = [["+y]]
lvim.keys.normal_mode["<leader>Y"] = [["+Y]]
lvim.keys.normal_mode["<leader>d"] = [["_d]]
lvim.keys.normal_mode["<C-Up>"] = ":resize +2<CR>"
lvim.keys.normal_mode["<C-Down>"] = ":resize -2<CR>"
lvim.keys.normal_mode["<C-Left>"] = ":vertical resize -2<CR>"
lvim.keys.normal_mode["<C-Right>"] = ":vertical resize +2<CR>"

vim.api.nvim_set_keymap("n", "<m-d>", "<cmd>RustOpenExternalDocs<Cr>", { noremap = true, silent = true })

keymap("v", "<", "<gv", opts)
keymap("v", ">", ">gv", opts)
keymap("v", "<A-j>", ":m .+1<CR>==", opts)
keymap("v", "<A-k>", ":m .-2<CR>==", opts)
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
vim.api.nvim_set_keymap("n", "K", ":lua require('user.keymaps').show_documentation()<CR>", opts)

return M
