local nls = require("null-ls")
nls.setup({
	debounce = 150,
	save_after_format = false,
	sources = {
		-- Formatting
		nls.builtins.formatting.stylua,
		nls.builtins.formatting.fish_indent,
		nls.builtins.formatting.shfmt,
		nls.builtins.diagnostics.markdownlint,
		nls.builtins.formatting.prettier.with({
			filetypes = { "markdown", "rust", "html", "css" },
		}),
		nls.builtins.formatting.isort,
		nls.builtins.formatting.rustfmt,
		nls.builtins.formatting.phpcsfixer,
		nls.builtins.formatting.black,

		-- Lintings
		nls.builtins.diagnostics.flake8,
		nls.builtins.diagnostics.phpstan,
	},
	root_dir = require("null-ls.utils").root_pattern(".null-ls-root", ".neoconf.json", ".git"),
})
