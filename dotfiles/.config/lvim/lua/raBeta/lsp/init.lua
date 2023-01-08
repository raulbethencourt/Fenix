reload("raBeta.lsp.languages.rust")
reload("raBeta.lsp.languages.python")
reload("raBeta.lsp.languages.emmet")
reload("raBeta.lsp.null-ls")

lvim.format_on_save = false
lvim.lsp.diagnostics.virtual_text = false
-- vim.lsp.handlers

-- if you don't want all the parsers change this to a table of the ones you want
-- if you don't want all the parsers change this to a table of the ones you want
lvim.builtin.treesitter.ensure_installed = {
    "bash",
    "javascript",
    "json",
    "lua",
    "python",
    "typescript",
    "css",
    "rust",
    "yaml",
    "vue",
    "html",
    "markdown"
}

lvim.builtin.treesitter.ignore_install = { "haskell" }
lvim.builtin.treesitter.highlight.enable = true

local formatters = require("lvim.lsp.null-ls.formatters")
formatters.setup({
    { command = "phpcsfixer", filetypes = { "php" } },
    { command = "stylua", filetypes = { "lua" } },
    {
        -- each formatter accepts a list of options identical to https://github.com/jose-elias-alvarez/null-ls.nvim/blob/main/doc/BUILTINS.md#Configuration
        command = "prettier",
        ---@usage arguments to pass to the formatter
        -- these cannot contain whitespaces, options such as `--line-width 80` become either `{'--line-width', '80'}` or `{'--line-width=80'}`
        extra_args = { "--print-with=100", "--tab-width=4" },
        ---@usage specify which filetypes to enable. By default a providers will attach to all the filetypes it supports.
        filetypes = { "typescript", "typescriptreact", "scss", "css", "html", "twig", "javascript" },
    },
})

-- -- set additional linters
local linters = require("lvim.lsp.null-ls.linters")
linters.setup({
    { command = "phpstan", filetypes = { "php" } },
    {
        command = "codespell",
        filetypes = { "javascript", "python", "rust", "python", "php" },
    },
})
