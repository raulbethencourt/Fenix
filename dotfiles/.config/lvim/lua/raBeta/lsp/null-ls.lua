local nls = require("null-ls")
nls.setup({
    debounce = 150,
    save_after_format = false,
    sources = {
        nls.builtins.formatting.stylua,
        nls.builtins.formatting.shfmt,
        nls.builtins.diagnostics.markdownlint,
        nls.builtins.formatting.prettierd.with({
            filetypes = { "markdown" }, -- only runs `deno fmt` for markdown
        }),
        nls.builtins.formatting.black,
        nls.builtins.formatting.phpcsfixer,
        nls.builtins.diagnostics.flake8,
    },
    on_attach = options.on_attach,
    root_dir = require("null-ls.utils").root_pattern(".null-ls-root", ".neoconf.json", ".git"),
})
