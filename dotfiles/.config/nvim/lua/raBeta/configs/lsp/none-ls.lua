local nls = require 'null-ls'

nls.setup {
  debounce = 150,
  save_after_format = false,
  sources = {
    -- NOTE: Formatting
    nls.builtins.formatting.stylua,
    nls.builtins.formatting.fish_indent,
    nls.builtins.formatting.shfmt.with {
      filetypes = { 'sh', 'zsh', 'bash' },
      extra_args = { '-i', '2' },
    },
    nls.builtins.formatting.isort,
    nls.builtins.formatting.markdownlint,
    nls.builtins.formatting.rustfmt,
    -- nls.builtins.formatting.phpcsfixer,
    nls.builtins.formatting.pretty_php,
    nls.builtins.formatting.black,
    nls.builtins.formatting.clang_format.with {
      extra_args = { '-style', '{IndentWidth: 4}' },
    },
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
      },
    },

    -- NOTE: Lintings
    nls.builtins.diagnostics.markdownlint,
    nls.builtins.diagnostics.shellcheck.with {
      filetypes = { 'sh', 'zsh', 'bash' },
    },
    nls.builtins.diagnostics.flake8,
    -- nls.builtins.diagnostics.phpcs,
    nls.builtins.diagnostics.phpstan,
    nls.builtins.diagnostics.codespell,
    nls.builtins.diagnostics.cpplint,
  },
  root_dir = require('null-ls.utils').root_pattern('.null-ls-root', '.neoconf.json', '.git'),
}
