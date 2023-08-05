reload("raBeta.lsp.languages.rust")
reload("raBeta.lsp.languages.python")
reload("raBeta.lsp.languages.emmet")
reload("raBeta.lsp.languages.html_css")
reload("raBeta.lsp.languages.sh")
reload("raBeta.lsp.languages.php")
reload("raBeta.lsp.languages.c")
reload("raBeta.lsp.null-ls")

-- disabled inline diagnostic
vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(vim.lsp.diagnostic.on_publish_diagnostics, {
	virtual_text = false,
})
lvim.format_on_save = false

lvim.builtin.treesitter.ensure_installed = {
	"bash",
	"javascript",
	"json",
	"lua",
	"python",
	"typescript",
	"css",
	"rust",
	"toml",
	"yaml",
	"vue",
	"html",
	"markdown",
}

lvim.builtin.treesitter.ignore_install = { "haskell" }
lvim.builtin.treesitter.highlight.enable = true

-- disblae inline hints
vim.diagnostic.config({
	virtual_text = false,
})

require("lsp_config").setup({
	servers = {
		-- Ensure mason installs the server
		rust_analyzer = {
			keys = {
				{ "K", "<cmd>RustHoverActions<cr>", desc = "Hover Actions (Rust)" },
				{ "<leader>cR", "<cmd>RustCodeAction<cr>", desc = "Code Action (Rust)" },
				{ "<leader>dr", "<cmd>RustDebuggables<cr>", desc = "Run Debuggables (Rust)" },
			},
			settings = {
				["rust-analyzer"] = {
					cargo = {
						allFeatures = true,
						loadOutDirsFromCheck = true,
						runBuildScripts = true,
					},
					-- Add clippy lints for Rust.
					checkOnSave = {
						allFeatures = true,
						command = "clippy",
						extraArgs = { "--no-deps" },
					},
					procMacro = {
						enable = true,
						ignored = {
							["async-trait"] = { "async_trait" },
							["napi-derive"] = { "napi" },
							["async-recursion"] = { "async_recursion" },
						},
					},
				},
			},
		},
		taplo = {
			keys = {
				{
					"K",
					function()
						if vim.fn.expand("%:t") == "Cargo.toml" and require("crates").popup_available() then
							require("crates").show_popup()
						else
							vim.lsp.buf.hover()
						end
					end,
					desc = "Show Crate Documentation",
				},
			},
		},
	},
	setup = {
		rust_analyzer = function(_, opts)
			local rust_tools_opts = require("lazyvim.util").opts("rust-tools.nvim")
			require("rust-tools").setup(vim.tbl_deep_extend("force", rust_tools_opts or {}, { server = opts }))
			return true
		end,
	},
})
