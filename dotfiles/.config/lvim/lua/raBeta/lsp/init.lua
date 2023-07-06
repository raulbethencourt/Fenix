reload("raBeta.lsp.languages.rust")
reload("raBeta.lsp.languages.python")
reload("raBeta.lsp.languages.emmet")
reload("raBeta.lsp.languages.html_css")
reload("raBeta.lsp.languages.sh")
reload("raBeta.lsp.languages.php")
reload("raBeta.lsp.languages.c")
reload("raBeta.lsp.null-ls")

-- disabled inline diagnostic
vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(
    vim.lsp.diagnostic.on_publish_diagnostics, {
        virtual_text = false
    }
)
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

