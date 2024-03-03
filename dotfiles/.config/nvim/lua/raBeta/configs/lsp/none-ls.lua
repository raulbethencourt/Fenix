local nls = require 'null-ls'

nls.setup {
  debounce = 150,
  save_after_format = false,
  sources = {
    -- NOTE: Formatting
    nls.builtins.formatting.stylua,
    nls.builtins.formatting.shfmt.with {
      filetypes = { 'sh', 'zsh', 'bash' },
      extra_args = { '-i', '2' },
    },
    nls.builtins.formatting.isort,
    nls.builtins.formatting.markdownlint,
    nls.builtins.formatting.pretty_php,
    nls.builtins.formatting.prettier.with {
      extra_args = { '--print-with=100', '--tab-width=4' },
      filetypes = {
        'typescript',
        'typescriptreact',
        'scss',
        'css',
        'html',
        'twig',
        'javascript',
        'json',
        'yaml',
        'php',
      },
    },
    -- NOTE: Lintings
    nls.builtins.diagnostics.markdownlint,
    nls.builtins.diagnostics.phpstan,
    nls.builtins.diagnostics.codespell,
  },
  root_dir = require('null-ls.utils').root_pattern('.null-ls-root', '.neoconf.json', '.git'),
}
