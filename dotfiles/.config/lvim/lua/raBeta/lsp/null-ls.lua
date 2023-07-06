local nls = require("null-ls")
nls.setup({
	debounce = 150,
	save_after_format = false,
	sources = {
		-- Formatting
		nls.builtins.formatting.stylua,
		nls.builtins.formatting.fish_indent,
		nls.builtins.formatting.shfmt.with({
			filetypes = { "sh", "zsh", "bash" },
		}),
		nls.builtins.formatting.isort,
		nls.builtins.formatting.rustfmt,
		nls.builtins.formatting.phpcsfixer,
		nls.builtins.formatting.black,
		nls.builtins.formatting.clang_format.with({
			extra_args = { "-style", "{IndentWidth: 4}" },
		}),
		nls.builtins.formatting.prettier.with({
			extra_args = { "--print-with=100", "--tab-width=4" },
			filetypes = { "typescript", "typescriptreact", "scss", "css", "html", "twig", "javascript" },
		}),

		-- Lintings
		nls.builtins.diagnostics.markdownlint,
		nls.builtins.diagnostics.shellcheck.with({
			filetypes = { "sh", "zsh", "bash" },
		}),
		nls.builtins.diagnostics.flake8,
		nls.builtins.diagnostics.phpstan,
		nls.builtins.diagnostics.codespell.with({
			filetypes = { "javascript", "python", "rust", "python", "php" },
		}),
		nls.builtins.diagnostics.cpplint,
	},
	root_dir = require("null-ls.utils").root_pattern(".null-ls-root", ".neoconf.json", ".git"),
})
