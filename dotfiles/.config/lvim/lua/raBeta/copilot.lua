local ok, copilot = pcall(require, "copilot")
if not ok then
	return
end

copilot.setup({
	panel = {
        enabled = false,
		keymap = {
			jump_next = "<c-j>",
			jump_prev = "<c-k>",
			accept = "<c-l>",
			refresh = "r",
			open = "<M-CR>",
		},
	},
	suggestion = {
		enabled = false,
		auto_trigger = true,
		keymap = {
			accept = "<c-l>",
			next = "<c-j>",
			prev = "<c-k>",
			dismiss = "<c-h>",
		},
	},
	filetypes = {
		yaml = false,
		markdown = true,
		help = false,
		gitcommit = false,
		gitrebase = false,
		hgcommit = false,
		svn = false,
		cvs = false,
		["."] = false,
	},
})

local opts = { noremap = true, silent = true }
vim.api.nvim_set_keymap("n", "<c-s>", "<cmd>lua require('copilot.suggestion').toggle_auto_trigger()<CR>", opts)
